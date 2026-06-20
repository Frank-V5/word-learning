# PET 词汇「中文释义 + 高质量发音」设计方案

> 设计时间：2026-06-19
> 范围：① PET (B1) 3087 单词 + 133 短语 补充中文释义 + 发音；② 顺带修复现有初高中词库发音不准的问题
> 数据来源：`/root/.openclaw/workspace/downloads/pet-vocab/`（已提取的官方词表）

---

## 0. 现状诊断（为什么现在发音不准）

| 维度 | 现状 | 问题 |
|------|------|------|
| 发音实现 | 前端 `window.speechSynthesis`（浏览器 Web Speech API） | 全站 `find` **0 个**预录音频文件；完全依赖设备本地 TTS |
| 音色控制 | `speak()` 只设 `lang='en-US'`、`rate=0.8`，**未用 `getVoices()` 钉死音色** | 用哪把嗓子由设备决定，中国设备默认英文音色常很差/带口音 |
| 异读词 | TTS 对 `read/wind/tear/bow/live` 这类一词多音无能为力 | **按字形瞎念**，学习者被误导（"不准确"的核心来源之一） |
| 音标数据 | `/ˈʃaʊər/` 与 `[smaɪl]` 混用，英美标混杂 | 格式不统一 |
| 释义数据 | 部分串号污染：`slow` 的释义是 `snail: 蜗牛; snake: 蛇` | 提取/导入时漏的 bug |

**结论**：要"高质量"，必须把发音从「设备运行时合成」改为「服务端预生成静态音频」，并用**真人录音优先**解决异读词问题。

---

## 1. 设计目标

1. **发音准**：异读词按本词的正确义项念（靠真人字典录音，而非 TTS 猜）。
2. **一致性好**：任何设备、任何浏览器听到的是同一把嗓子，同一份音频。
3. **释义对**：中文释义贴合 B1 考纲、POS 正确、短语给地道译法。
4. **音标净**：统一 IPA 记法（`/.../`，标注英美）。
5. **可离线**：音频走静态文件，PWA service worker 可缓存，离线可放。
6. **零运行时成本**：不增加每次播放的 API 调用/延迟；TTS 只在"生成期"用一次。
7. **可复用**：同一套机制同时修复 PET 新词 + 现有初高中词的发音。

---

## 2. 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│  生成期（一次性，离线脚本 enrich.py，idempotent/resumable）  │
│                                                             │
│  词表 ──► 释义生成(LLM)  ──► 中文释义 + 例句 + IPA         │
│       └─► 音频生成(级联) ──► 静态 mp3                       │
│                  ├─ Tier1: Cambridge 真人录音(UK+US)         │
│                  ├─ Tier2: dictionaryapi.dev                │
│                  └─ Tier3: edge-tts 神经合成(兜底+所有短语)  │
└──────────────────────────┬──────────────────────────────────┘
                           │ 产物
        ┌──────────────────┼───────────────────────┐
        ▼                  ▼                       ▼
  /var/www/.../audio/   wordlearning.db        导入JSON
   静态 mp3(分片)        pronunciations 表      (喂 import-words.js)

┌─────────────────────────────────────────────────────────────┐
│  运行期（前端）                                              │
│                                                             │
│  speak(text, accent) ──► 确定性 URL /audio/pron/<hash>.mp3  │
│    └─► new Audio(url).play()   ✅ 命中预录音频               │
│    └─► onerror → speechSynthesis 兜底（仅缺失时）            │
└─────────────────────────────────────────────────────────────┘
```

**核心思想**：音频是预生成静态文件，URL 由"文本+口音"哈希决定 → 播放时零查询、零延迟、可缓存、可离线、跨设备一致。

---

## 3. 发音音频方案（重点）

### 3.1 质量分级与来源

发音质量从高到低：**真人录音 ＞ 付费神经合成 ≈ 免费 edge-tts ＞ 浏览器 TTS（现状）**。

| Tier | 来源 | 质量 | 覆盖 | 成本 | 用途 |
|------|------|------|------|------|------|
| 1 | **Cambridge 字典真人录音** | ⭐⭐⭐⭐⭐ 原声 | 常用词广（与 PET 重合度高） | 免费（爬页面） | **首选**，尤其异读词 |
| 2 | **dictionaryapi.dev** | ⭐⭐⭐⭐ 多为真人 | 中等，Wiktionary 源 | 免费、无需 key | Cambridge 没有的词 |
| 3 | **edge-tts**（Azure 神经音色，免费免 key） | ⭐⭐⭐⭐ 神经合成 | 100% | 免费 | 兜底 + **全部短语** |

> **为什么 Cambridge 首选**：① PET 本就是剑桥考试，英音是"正确口音"；② 字典录音是**按词条义项录的**，异读词 `read(过去式)`、`wind(名词/动词)`、`tear(撕裂/眼泪)` 不会念错——这是 TTS 永远做不到的，也是"不准"的最大来源。Cambridge 同时提供 UK + US 两版录音。

### 3.2 口音策略 【已锁定：默认美音 US】

- **默认美音 (US)**：优先用 Cambridge 的 **US 真人录音**，缺失时 edge-tts `en-US-JennyNeural`（女）/ `en-US-GuyNeural`（男）。
- Cambridge 字典每条词同时提供 UK + US 录音 → "美音默认 + Cambridge 首选"完全兼容，架构不变。
- 可选切换英音 (UK)：Cambridge UK 录音 / edge-tts `en-GB-SoniaNeural`。
- 前端卡片保留 🔊 按钮，长按/切换可选英美（可选增强）。

### 3.3 短语怎么发音

短语动词（`get up`、`look forward to`）和介词短语（`according to`）在任何单本字典里都不是独立词条 → **只能 TTS**。edge-tts 神经合成念整句短语自然度高，是短语唯一合理来源。这也意味着短语的"准"靠的是 TTS 质量（神经合成对常见短语足够好），而非真人录音——这是不可避免的，可接受。

### 3.4 文件存储

```
/var/www/word-learning/audio/pron/
  ab/abc123def...mp3     ← 分片哈希目录（避免单目录 6000+ 文件）
  ab/abc456...us.mp3
  ...
```

- 路径 = `sha1(normalize(text) + accent)` 前 2 位做子目录，全串做文件名。
- 单词音频 ≈ 8–25KB；3087 词 + 133 短语 × 2 口音 ≈ **60–120MB**；连同现有初高中 ~6400 词条 ≈ **≤200MB**。
- 磁盘：**当前可用 48G，完全无压力**。
- 服务方式：Nginx 加一个 `location /audio { alias .../audio; }`（静态、可缓存、零 Node 开销）。

### 3.5 数据模型

新增一张**发音缓存表**（解耦于 `words` 行，去重、可独立重生成）：

```sql
CREATE TABLE IF NOT EXISTS pronunciations (
  text_norm   TEXT NOT NULL,          -- 归一化文本(小写/合并空白)
  accent      TEXT NOT NULL,          -- 'uk' | 'us'
  ipa         TEXT,                   -- 统一 /.../ 记法
  audio_path  TEXT,                   -- 相对 /audio 的路径
  source      TEXT,                   -- 'cambridge' | 'dictapi' | 'edge-tts'
  verified    INTEGER DEFAULT 0,      -- 抽检通过置 1
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (text_norm, accent)
);
```

> 不在 `words` 表加 audio 列的原因：① 同一个 `make` 可能同时出现在初高中和 PET，去重省一份音频；② 修复现有词发音时不必碰它们（已被污染的）释义数据。前端播放只靠**确定性 URL**，不查这张表——表只用于生成期管理与抽检。

### 3.6 成本（已核实 2026 定价）

| 项 | 量 | 费用 |
|----|----|------|
| 文本总量 | ~3220 词条 × ~12 字 ≈ 4 万字符 | — |
| edge-tts | 同上 | **$0**（免费，且远低于 Azure 每月 50 万字符免费额度） |
| Cambridge/dictapi | 爬取 | $0 |
| 付费神经合成（如要用 OpenAI HD） | 4 万字符 | ≈ $1.2（可选，边际提升极小，**不推荐**） |
| 磁盘 | ≤200MB | 免费（48G 可用） |

**音频整体成本 ≈ $0。** 唯一"成本"是 Cambridge 爬取的礼貌延时（每词 ~1–2s，全量约 1–2 小时，可后台跑）。

---

## 4. 中文释义方案

### 4.1 双来源交叉

| 来源 | 提供 | 角色 |
|------|------|------|
| **dictionaryapi.dev** | 英文义项、IPA、音频 | **基准/防幻觉**，提供权威义项清单 |
| **LLM（GLM / Claude）** | 中文释义、例句、短语地道译 | **主力**，按 B1 考纲筛选最常用义项 |

### 4.2 生成规则（喂给 LLM 的约束）

- **POS 钳制**：把 PET 表里的词性（`n`/`v`/`adj`...）一起喂进去，只译对应义项，避免给 12 个生僻义。
- **B1 水平**：释义简洁、考纲优先，最多 2–3 个核心义项，中文用常用词。
- **短语地道**：`give up→放弃`、`look forward to→期待`，按整短语译，禁止逐词硬译。
- **例句**：每词/短语配 1 句中英对照简单例句（B1 难度）。
- **音标**：用 dictionaryapi 的 IPA；缺失时由 LLM 给，再程序校验合法性。
- **结构化输出**：强制 JSON schema（`word, pos, ipa_uk, ipa_us, meaning_zh, example_en, example_zh`），批量 50 词/次调用。

### 4.3 防错/校验

- LLM 译义必须能在 dictionaryapi 的义项里找到对应（防编造）。
- 全量输出 CSV 供你**抽检**后再导入（尤其短语和异读词）。

---

## 5. 生成流水线 `enrich.py`（一次性，幂等可断点续跑）

```
输入: downloads/pet-vocab/pet-b1-vocab.json
  ├─ words[3087] ─ {word, pos[]}
  └─ phrases {phrasal_verbs[93], prepositional_phrases[40]}

对每个 entry:
  1. text_norm = normalize(text)
  2. [音频] 级联取 UK/US 音频 + IPA：
       Cambridge(词) → dictapi(词) → edge-tts(词/短语)
     已有音频文件则跳过（幂等）
  3. 写 mp3 到分片路径；写 pronunciations 表
  4. [释义] LLM 批量出中文+例句，dictapi 交叉校验
  5. 汇总成 word-learning 导入 JSON

产物:
  ├─ /var/www/word-learning/audio/pron/**           (静态音频)
  ├─ pet-enriched-import.json                        (喂 import-words.js)
  ├─ pet-meanings-review.csv                         (给你抽检)
  └─ pronunciations 表                               (元数据/溯源)
```

特性：**幂等**（已存在即跳过，可随时中断续跑）、**溯源**（每个音频记 source）、**限速**（Cambridge 礼貌延时）、**抽检**（CSV 人工过一遍）。

---

## 6. 前端改造（最小侵入）

三个 `speak()`（Learn/Review/Troublesome.vue）改成统一工具：

```js
// utils/speak.js
export function speak(text, accent = 'uk') {
  const url = `/audio/pron/${hashPath(text, accent)}.mp3`;
  const a = new Audio(url);
  a.play().catch(() => speechSynthesisFallback(text, accent)); // 缺失才回退浏览器
}
```

- 命中预录音频 → 真人/神经合成，跨设备一致。
- 缺失（404）才回退现有 `speechSynthesis`，保证平滑过渡、永不哑火。
- Service Worker（已有 sw.js）把 `/audio/` 加入 cache-first → **离线可放**。
- 卡片可选：长按 🔙 切换英美音。

---

## 7. 质量保障（QA）

1. **异读词专项**：对 `read/wind/tear/bow/live/lead/wound/close/desert` 等清单人工听一遍，确认 Cambridge 录音取对义项。
2. **来源分层抽检**：每个 Tier（Cambridge/dictapi/edge）各抽 30 条人耳听，重点听 Tier3 edge-tts 的短语。
3. **音标一致性**：脚本校验全部 `/.../`、含合法 IPA 字符、英美标注正确。
4. **音频完整性**：`ffprobe`/文件大小>0，剔除空/损坏 mp3，失败自动降级重生成。
5. **释义抽检**：导 CSV 给 Frank 过一遍再导入。

---

## 8. 实施阶段

| 阶段 | 内容 | 产出 |
|------|------|------|
| **A** | PET 3087 词 + 133 短语 全流程（释义+音频） | PET 词库导入平台，发音修复 |
| **B（推荐）** | 现有初高中词**只重生成音频**（释义数据不碰） | 全站发音一并修复，根治你的抱怨 |
| **C（可选）** | 清理现有词污染释义；抓 KET(A2)/FCE(B2) | CEFR 体系完整 |

---

## 9. 已锁定决策（2026-06-19 Frank 拍板）

| 决策 | 选定 | 说明 |
|------|------|------|
| 默认口音 | **美音 US** | Cambridge US 真人录音优先，缺失 edge-tts en-US 兜底 |
| 音频首选源 | **Cambridge 真人级联** | Cambridge→dictapi→edge-tts；需爬取（ToS 灰色，已授权），全量约 1-2h |
| 释义来源 | **LLM + 字典交叉校验** | 按推荐默认（LLM 主力 + dictapi 防幻觉） |
| 范围 | **PET + 修复现有发音** | Phase A (PET 全流程) + Phase B (初高中词音频重生成)，现有释义污染暂不清理 |

> 后续实现以此为准。
```
