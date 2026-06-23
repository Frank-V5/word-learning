#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================
为 PET 未覆盖单词批量生成英文例句 + 中文翻译, 写入 word_dict 表
================================================================

调用方式
  方案 A (默认, 走智谱官方 Anthropic 兼容网关 —— 推荐, 实测可用):
      python3 gen_examples.py                 # 全量 1704 词
      python3 gen_examples.py --limit 20      # 先跑 20 词试水
      python3 gen_examples.py --dry-run       # 只调用模型不写库
      python3 gen_examples.py --all           # 含已覆盖词一起补

API Key 来源 (按优先级):
  1. 环境变量 ZHIPUAI_API_KEY / ZHIPU_API_KEY
  2. ~/.openclaw/openclaw.json 里 models.providers.glmcode.apiKey

说明: openclaw.json 里的 glmcode 是智谱官方的 "Anthropic 兼容端点"
      (baseUrl = https://open.bigmodel.cn/api/anthropic), 故这里用 requests
      走该端点的 /v1/messages, 复用其 apiKey。原生 zhipuai SDK 默认端点
      的账户余额不足(429), 故不采用 SDK 直连。

特性
  - 每批 25 词一次调用 (省 token), 失败自动重试 3 次 (指数退避)
  - 解析失败/漏词自动降级为逐词补全, 保证不丢词
  - 断点续跑: 已有 example_en 的词自动跳过 (可 --force 覆盖)
  - 每批提交一次 DB, 中断不丢已生成数据
================================================================
"""
import argparse
import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

import requests

# ----------------------------- 配置 -----------------------------
MODEL        = "glm-4.6"
BATCH_SIZE   = 25          # 每批词数 (用户要求 20-30)
MAX_RETRIES  = 3           # 每批最大重试
TEMPERATURE  = 0.7
MAX_TOKENS   = 4096
SLEEP_BETWEEN = 0.3        # 批与批之间间隔 (秒), 避免限流

# 默认数据库路径 (相对本脚本定位)
DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "wordlearning.db"
OPENCLAW_CFG = Path.home() / ".openclaw" / "openclaw.json"

SYSTEM_PROMPT = (
    "You are an English teaching assistant for Chinese primary and secondary "
    "school students. You write simple, natural, child-friendly example sentences. "
    "You ONLY output a JSON array. No explanation, no markdown fences."
)


# ----------------------- 读 API Key / 网关 -----------------------
def load_glm_config():
    """返回 (api_key, base_url)。优先环境变量, 其次 openclaw.json。"""
    key = os.environ.get("ZHIPUAI_API_KEY") or os.environ.get("ZHIPU_API_KEY")
    base = os.environ.get("GLM_BASE_URL") or "https://open.bigmodel.cn/api/anthropic"
    if key:
        return key, base

    if not OPENCLAW_CFG.exists():
        sys.exit(f"❌ 找不到 API Key: 未设环境变量, 也不存在 {OPENCLAW_CFG}")

    with open(OPENCLAW_CFG, encoding="utf-8") as f:
        cfg = json.load(f)
    g = cfg.get("models", {}).get("providers", {}).get("glmcode", {})
    key = g.get("apiKey")
    base = (g.get("baseUrl") or base).rstrip("/")
    if not key:
        sys.exit("❌ openclaw.json 中 models.providers.glmcode.apiKey 为空")
    return key, base


# --------------------------- 调用 GLM ---------------------------
def call_glm(api_key, base_url, user_prompt):
    """走智谱 Anthropic 兼容端点, 返回模型文本。失败抛异常。"""
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "system": SYSTEM_PROMPT,
        "temperature": TEMPERATURE,
        "messages": [{"role": "user", "content": user_prompt}],
    }
    r = requests.post(f"{base_url}/v1/messages", headers=headers, json=payload, timeout=120)
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:300]}")
    data = r.json()
    parts = data.get("content", [])
    text = "".join(p.get("text", "") for p in parts if p.get("type") == "text")
    if not text:
        raise RuntimeError(f"空响应: {json.dumps(data)[:300]}")
    return text


# ---------------------- 构建 Prompt / 解析 ----------------------
def build_prompt(words):
    lines = ["为下列英语单词各造 1 个例句, 要求:",
             "- 难度 CEFR A2-B1, 适合中国中小学生",
             "- 句子自然、生活化, 8-15 个英文单词",
             "- 必须在句中用到该单词 (按其给定词性与含义)",
             "- 给出整句中文翻译",
             "",
             "只输出一个 JSON 数组, 不要任何额外文字或 markdown 代码块标记。格式:",
             '[{"word":"原词","en":"英文例句","cn":"中文翻译"}, ...]',
             "保持与下方输入完全相同的顺序和数量。",
             "",
             "单词列表:"]
    for i, w in enumerate(words, 1):
        pos = (w.get("pos") or "").strip()
        meaning = (w.get("meaning") or "").strip()
        meta = f"({pos}, {meaning})" if pos else f"({meaning})" if meaning else ""
        lines.append(f"{i}. {w['word']} {meta}")
    return "\n".join(lines)


def _norm(t):
    return re.sub(r"\s+", " ", str(t).lower()).strip()


def parse_array(text):
    """从模型输出里稳健地解析出 JSON 数组。"""
    text = text.strip()
    if text.startswith("```"):                       # 去 markdown 代码围栏
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text).strip()
    s, e = text.find("["), text.rfind("]")           # 截取第一个 [ ... 最后 ]
    if s != -1 and e != -1 and e > s:
        text = text[s:e + 1]
    return json.loads(text)


def match_results(arr, words):
    """把模型返回的数组按 word 匹配回输入, 返回 {id: {en,cn}}。"""
    by_norm = {}
    for item in arr:
        if not isinstance(item, dict):
            continue
        w = item.get("word") or item.get("en_word")
        en = (item.get("en") or item.get("english") or "").strip()
        cn = (item.get("cn") or item.get("zh") or item.get("chinese") or "").strip()
        if w and en:
            by_norm[_norm(w)] = {"en": en, "cn": cn}
    out = {}
    for w in words:
        hit = by_norm.get(_norm(w["word"]))
        if hit:
            out[w["id"]] = hit
    return out


# ----------------------- 批量 / 单词生成 ------------------------
def gen_batch(api_key, base_url, words):
    """一批 words 调一次模型; 失败返回 {}。"""
    prompt = build_prompt(words)
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            arr = parse_array(call_glm(api_key, base_url, prompt))
            res = match_results(arr, words)
            if res:
                return res
            raise RuntimeError(f"解析成功但无词匹配 (arr 长度={len(arr)})")
        except Exception as e:
            print(f"     ⚠ 第{attempt}/{MAX_RETRIES}次失败: {e}", flush=True)
            if attempt < MAX_RETRIES:
                time.sleep(1.5 * attempt)
    return {}


def gen_single(api_key, base_url, w):
    """降级: 单词逐个补全, 提高成功率。"""
    prompt = build_prompt([w]) + "\n\n只输出该单词的那一个 JSON 对象即可, 不要数组、不要多余文字。"
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            text = call_glm(api_key, base_url, prompt)
            text = text.strip()
            if text.startswith("```"):
                text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
                text = re.sub(r"\n?```$", "", text).strip()
            # 可能返回 {...} 或 [...]
            if text.startswith("["):
                obj = parse_array(text)[0]
            else:
                s, e = text.find("{"), text.rfind("}")
                obj = json.loads(text[s:e + 1])
            en = (obj.get("en") or "").strip()
            cn = (obj.get("cn") or "").strip()
            if en:
                return {"en": en, "cn": cn}
            raise RuntimeError("返回无 en")
        except Exception as e:
            if attempt == MAX_RETRIES:
                print(f"     ✗ 单词补全失败 [{w['word']}]: {e}", flush=True)
            else:
                time.sleep(1.5 * attempt)
    return None


# ----------------------------- DB ------------------------------
def fetch_words(db_path, include_covered, force):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    if force:
        where = "is_pet=1"
        if not include_covered:
            where += " AND is_covered=0"
    else:
        where = "is_pet=1 AND (example_en IS NULL OR example_en='')"
        if not include_covered:
            where += " AND is_covered=0"
    rows = con.execute(
        f"SELECT id, word, phonetic, meaning, pos FROM word_dict WHERE {where} ORDER BY rowid"
    ).fetchall()
    con.close()
    return [dict(r) for r in rows]


def save_batch(db_path, items):
    """items: list of (example_en, example_cn, id)"""
    con = sqlite3.connect(db_path)
    con.executemany(
        "UPDATE word_dict SET example_en=?, example_cn=? WHERE id=?", items
    )
    con.commit()
    con.close()


# ----------------------------- 主流程 ---------------------------
def main():
    ap = argparse.ArgumentParser(description="为 PET 单词批量生成例句 (GLM-4.6)")
    ap.add_argument("--db", default=str(DEFAULT_DB), help=f"数据库路径 (默认 {DEFAULT_DB})")
    ap.add_argument("--limit", type=int, default=0, help="只处理前 N 个 (0=全部)")
    ap.add_argument("--offset", type=int, default=0, help="跳过前 N 个")
    ap.add_argument("--batch-size", type=int, default=BATCH_SIZE, help="每批词数 (默认 25)")
    ap.add_argument("--all", action="store_true", help="含已覆盖词一起补 (默认只补未覆盖)")
    ap.add_argument("--force", action="store_true", help="覆盖已有例句 (默认跳过已生成)")
    ap.add_argument("--dry-run", action="store_true", help="只调用模型, 不写库")
    args = ap.parse_args()

    if not Path(args.db).exists():
        sys.exit(f"❌ 数据库不存在: {args.db}")

    api_key, base_url = load_glm_config()
    print(f"🔗 网关: {base_url}  模型: {MODEL}")
    print(f"🗄  数据库: {args.db}")

    words = fetch_words(args.db, args.all, args.force)
    if args.offset:
        words = words[args.offset:]
    if args.limit:
        words = words[:args.limit]
    print(f"📋 待处理: {len(words)} 个单词"
          + (" (dry-run, 不写库)" if args.dry_run else "")
          + "\n" + "=" * 60)

    if not words:
        print("✅ 没有需要处理的单词 (可能已全部生成)。"); return

    total = len(words)
    done = fail = 0
    t0 = time.time()

    for i in range(0, total, args.batch_size):
        batch = words[i:i + args.batch_size]
        n = min(i + len(batch), total)
        print(f"\n[{n}/{total}] 批次 {i // args.batch_size + 1}: {len(batch)} 词...", flush=True)

        results = gen_batch(api_key, base_url, batch)   # 批量
        # 降级: 对批量里没拿到结果的词逐词补
        missing = [w for w in batch if w["id"] not in results]
        for w in missing:
            one = gen_single(api_key, base_url, w)
            if one:
                results[w["id"]] = one

        # 写库
        to_save = []
        for w in batch:
            r = results.get(w["id"])
            if r:
                to_save.append((r["en"], r["cn"], w["id"]))
                done += 1
                print(f"   ✓ {w['word']:<14} {r['en']}")
            else:
                fail += 1
                print(f"   ✗ {w['word']:<14} (生成失败)")

        if to_save and not args.dry_run:
            save_batch(args.db, to_save)

        if i + args.batch_size < total:
            time.sleep(SLEEP_BETWEEN)

    dt = time.time() - t0
    print("\n" + "=" * 60)
    print(f"🎉 完成! 成功 {done} / 失败 {fail} / 总 {total}  耗时 {dt:.1f}s")
    if args.dry_run:
        print("ℹ dry-run 模式, 未写库。去掉 --dry-run 即可正式写入。")


if __name__ == "__main__":
    main()
