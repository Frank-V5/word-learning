#!/usr/bin/env python3
"""
为 word_dict 表中 PET 未覆盖单词批量生成英文例句 + 中文翻译。
使用 GLM-4.6 API，每批 25 词，带重试和进度保存。

用法：
  python3 gen_examples.py                    # 生成所有缺失例句的词
  python3 gen_examples.py --limit 50         # 只生成前 50 个
  python3 gen_examples.py --dry-run          # 只打印不写库
"""

import json, sqlite3, time, sys, os
from pathlib import Path

# ── 配置 ──────────────────────────────────────────────
DB_PATH = Path("/root/.openclaw/workspace/word-learning/backend/data/wordlearning.db")
TABLE = "word_dict"
BATCH_SIZE = 25       # 每批处理词数
MAX_RETRIES = 3       # 每批最大重试
SLEEP_ON_FAIL = 15     # 失败后等待秒数
SLEEP_BETWEEN_BATCH = 3  # 批次间隔秒数

# ── GLM API ───────────────────────────────────────────
import httpx

with open(os.path.expanduser("~/.openclaw/openclaw.json")) as f:
    _cfg = json.load(f)
API_KEY = _cfg["models"]["providers"]["glmcode"]["apiKey"]
API_URL = "https://open.bigmodel.cn/api/anthropic/v1/messages"
MODEL = "glm-4.6"  # 通过 Anthropic 兼容接口调用

SYSTEM_PROMPT = """你是一个英语教育专家。我会给你一批英语单词，请为每个单词生成一个适合中国中小学生（CEFR A2-B1水平）的例句。

要求：
1. 句子简短（5-12词），场景贴近学生生活
2. 用该单词的核心含义造句
3. 同时提供中文翻译
4. 严格按 JSON 数组输出，格式：[{"word":"xxx","example_en":"xxx","example_cn":"xxx"}]

只输出 JSON，不要其他内容。"""

def call_glm(words: list[dict]) -> list[dict]:
    """调用 GLM API (Anthropic 兼容接口) 为一批词生成例句"""
    word_list = "\n".join(f"{i+1}. {w['word']} ({w['meaning']})" for i, w in enumerate(words))
    user_msg = f"请为以下{len(words)}个单词生成例句：\n{word_list}"

    headers = {
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }
    payload = {
        "model": MODEL,
        "max_tokens": 2000,
        "system": SYSTEM_PROMPT,
        "messages": [
            {"role": "user", "content": user_msg}
        ]
    }

    resp = httpx.post(API_URL, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    content = data["content"][0]["text"]

    # 提取 JSON（处理可能的 markdown 包裹）
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return json.loads(content)


def main():
    dry_run = "--dry-run" in sys.argv
    limit = None
    if "--limit" in sys.argv:
        idx = sys.argv.index("--limit")
        limit = int(sys.argv[idx + 1])

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    # 查找缺例句的 PET 未覆盖词
    sql = f"""
        SELECT id, word, phonetic, meaning, pos FROM {TABLE}
        WHERE is_pet = 1 AND is_covered = 0
        AND (example_en IS NULL OR example_en = '')
        ORDER BY word
    """
    if limit:
        sql += f" LIMIT {limit}"

    rows = conn.execute(sql).fetchall()
    total = len(rows)
    print(f"📚 共 {total} 个单词需要生成例句")
    if total == 0:
        print("✅ 所有单词已有例句，无需处理")
        return

    done = 0
    failed = 0

    for i in range(0, total, BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"\n--- 批次 {batch_num}/{total_batches} ({len(batch)} 词) ---")

        success = False
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                word_data = [{"word": r["word"], "meaning": r["meaning"]} for r in batch]
                results = call_glm(word_data)

                # 建立映射
                result_map = {r["word"].lower().strip(): r for r in results}

                # 写入数据库
                if not dry_run:
                    for r in batch:
                        key = r["word"].lower().strip()
                        if key in result_map:
                            ex = result_map[key]
                            conn.execute(
                                f"UPDATE {TABLE} SET example_en=?, example_cn=? WHERE id=?",
                                (ex["example_en"], ex["example_cn"], r["id"])
                            )
                    conn.commit()

                done += len(batch)
                print(f"  ✅ 成功: {done}/{total}")

                # 打印示例
                for r in results[:2]:
                    print(f"    {r['word']}: {r['example_en']}")
                    print(f"           {r['example_cn']}")

                success = True
                break

            except Exception as e:
                wait = SLEEP_ON_FAIL * attempt
                print(f"  ⚠️ 尝试 {attempt}/{MAX_RETRIES} 失败: {e} (等待{wait}秒)")
                if attempt < MAX_RETRIES:
                    time.sleep(wait)

        if not success:
            failed += len(batch)
            print(f"  ❌ 批次 {batch_num} 全部失败，跳过")

        # 批次间间隔（避免限流）
        if i + BATCH_SIZE < total:
            time.sleep(SLEEP_BETWEEN_BATCH)

    conn.close()
    print(f"\n{'═' * 40}")
    print(f"✅ 完成: {done}/{total}")
    if failed:
        print(f"❌ 失败: {failed}")
    print(f"{'dry run' if dry_run else '已写入数据库'}")

if __name__ == "__main__":
    main()
