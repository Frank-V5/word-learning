# PET 语法训练模块 · 完整方案与实现计划（最终版）

> 日期：2026-06-25 | 状态：待 Frank 确认后实施
> 目标：在单词平台之外，新建一个**完全隔离的语法训练空间**，帮孩子高效拿下 PET(B1) 语法。

---

## 一、背景与目标
孩子备考 PET，单词已有平台辅助。语法需另建一套：**懂规则 + 语境感知 + 对标练习 + 错题驱动**。本模块独立于单词系统，互不干扰。

## 二、四大设计原则（Frank 钦定）
1. **完整覆盖** PET 大纲，考点不遗漏。
2. **看 + 选择为主，零输入**（不让孩子打字），适配碎片时间。
3. **知识点学习 + 针对性训练**，每题给**详细解析**。
4. **错题本 + 易错本**，可重做、重复理解。
5. **完全隔离**：不动现有任何单词页面；语法独立顶层入口、独立空间、独立数据。

## 三、完整语法大纲（8 大类，约 50 考点）
| 类 | 考点 |
|----|------|
| **1 时态(13)** | 一般现在·现在进行·现在完成·现在完成进行·一般过去·过去进行·过去完成·will·be going to·现在进行表将来·used to；**辨析：现完vs过去、will vs going to、过完vs过进** |
| **2 被动语态(4)** | 各时态被动(一般/进行/完成/带情态)、主动↔被动转换 |
| **3 条件句(3)** | Type 0/1/2（+ wish/If only） |
| **4 情态动词(5)** | 能力can/could·义务must/have to·建议should·推测may/might·请求would |
| **5 动词(3)** | 不定式vs动名词·使役/感官动词·短语动词(关联单词平台) |
| **6 从句(7)** | 定语(who/which/that/whose/where)·转述语(+时态后移)·时间/原因/让步/目的/结果状语从句 |
| **7 名词/冠词/限定(7)** | 冠词a/an/the/零冠词(Part6高频)·可数不可数·量词·物主/反身/不定代词·所有格 |
| **8 形副/介词/句法(8)** | 比较级最高级·as...as·频度副词·介词时间/地点/方位·动词搭配介词·疑问句与附加疑问·连接词 |

> Part 6(开放填空)主力=第7类(冠词/量词)+介词；Part 5(完形)主力=第8类连接词+搭配。

## 四、架构：完全隔离 + 顶层独立入口
- **顶栏新增「🔤 语法」按钮**（唯一改动点）→ 进入独立空间 `/grammar`。
- 现有 `视频列表/错词本/易错表/🎯PET备考` **一字不改**。
- 语法空间有**自己的内部导航条**（语法专属头部，配色区分）：`🏠语法首页 | 📒错题本 | 📕易错本`。
- 数据全隔离：新表 `grammar_*`，不碰 words/PET/progress 任何现有数据。

## 五、内部布局（6 个页面）

```
顶栏: ... 🎯PET备考  [🔤 语法]  ⚙️ 退出   ← 只加这一个按钮
                    │
          点"🔤语法" ▼
═══════ 🔤 PET 语法训练 ═══════ (语法专属头部)
[🏠语法首页] [📒错题本 N] [📕易错本 N]      ← 语法内部导航(所有语法页都有)

① 首页 /grammar      → 8大类卡片(考点数+进度+错次) + 继续学习/随机练习
② 类详情 /grammar/cat/:cat → 该类下考点列表(状态✅❌⚪+错次)
③ 学习页 /grammar/learn/:point → 规则+公式+例句🔊+易错陷阱 + [懂了/没懂/去训练]
④ 训练页 /grammar/practice/:point → 4选1,一次一题,三段式解析(对错都给)
⑤ 错题本 /grammar/wrong → 当前错题,按考点分组,可重做(4选1)
⑥ 易错本 /grammar/troublesome → 按考点错次降序(最弱浮顶),重练该考点
```

## 六、交互设计（看+选择，零输入）
- **学习页=看**：规则/例句/易错，🔊 点读例句。
- **训练页=选**：句子留空 + ABCD 四选项，**点选项即判分**（无需提交按钮，更快），立即弹解析。
- **错题重做=选**：同样是 4 选 1 点选。
- 全程**不输入任何字符**，单手碎片时间可练。

## 七、每题必出「三段式详细解析」（核心，对错都给）
答完每题（对/错都）固定弹出：
1. **✅ 为什么选它** — 结合句意 + 规则，讲清正确答案为何对。
2. **📚 涉及知识点** — 一句话回顾该考点（规则+公式+标志词），题目锚回知识点，**做一题巩固一遍规则**。
3. **❌ 其他选项为何错** — 简述干扰项陷阱。
答完才能"下一题"，强制读一遍解析。

## 八、错题机制（可重做、重复理解）
- **错题本(动态)**：`grammar_wrong`，当前做错的题，重做对即移出。
- **易错本(累积·按考点)**：`grammar_troublesome`，每考点累计错次，错次高的浮顶（告诉你最弱语法），点进去重练该考点全部题。
- 每次重做再看解析 → 重复理解、强化记忆。

## 九、数据模型（新表，隔离）
```sql
grammar_points    (id, category, name, rule, formula, examples JSON, pitfalls JSON, sort_order)        -- 50考点
grammar_questions (id, point_id, stem, options JSON[4], answer, why, point_note, distractors, sort_order)  -- 题库,每点~10题
grammar_progress  (user_id, point_id, status[new/known/unknown], UNIQUE(user_id,point_id))            -- 考点学习状态
grammar_wrong     (user_id, question_id, point_id, UNIQUE(user_id,question_id))                      -- 错题本(动态)
grammar_troublesome (user_id, point_id, wrong_count, UNIQUE(user_id,point_id))                        -- 易错本(累积)
```
> 全新表，与现有 words/progress/pet_* 物理隔离。

## 十、后端（新 `/api/grammar/*`，独立）
- `GET /categories` 8类+进度统计
- `GET /category/:cat/points` 类下考点+状态
- `GET /point/:id` 考点知识(规则/例句/易错)
- `POST /progress` 标记懂/没懂
- `GET /practice/:point` 该考点题(打乱)
- `POST /answer` 提交答案→判分→错则写 wrong+troublesome→返回三段式解析
- `GET /wrong` / `POST /wrong/redo` 错题本+重做
- `GET /troublesome` 易错本

## 十一、内容生成（GLM）
- **50 考点知识**：规则+公式+3例句+2易错陷阱（GLM 按模板，参照剑桥B1大纲）。
- **题库**：每考点 ~10 题，四选一，每题带 `{why, point_note, distractors}` 三段解析。
- 质量：每类抽检（规则准确/例句地道/答案正确/解析清晰）；高频点人工微调。
- 实测样例质量已验证（见末尾附录）。

## 十二、前端文件
- `App.vue`：加「🔤 语法」按钮 + goToGrammar。
- 新视图：`GrammarHome/Cat/Learn/Practice/Wrong/Troublesome.vue`（6个）。
- `main.js`：加 6 条 `/grammar/*` 路由。
- 语法专属头部组件（内部导航条）。

## 十三、实现步骤（分 3 阶段）

### Phase 1 — 骨架 + 知识卡（先做，立竿见影）
1. 后端：建 5 张 grammar_* 表 + `grammarOps` + `/api/grammar/categories|category|point|progress` 路由。
2. 数据：GLM 生成 **50 考点知识**（规则/例句/易错）灌 `grammar_points`。
3. 前端：顶栏「🔤语法」按钮 + `GrammarHome`(8类) + `GrammarCat`(考点列表) + `GrammarLearn`(知识页+懂/没懂→grammar_progress) + 语法易错本(没懂考点)。
4. 交付：孩子能按 8 类学 50 考点，没懂的进易错本反复看。

### Phase 2 — 训练系统 + 三段式解析 + 错题（核心提分）
5. 数据：GLM 生成**题库**（每点~10题 + 三段解析）灌 `grammar_questions`。
6. 后端：`/practice/:point` + `/answer`(判分+写wrong/troublesome+返回解析) + `/wrong` + `/troublesome`。
7. 前端：`GrammarPractice`(4选1+三段解析) + `GrammarWrong`(重做) + `GrammarTroublesome`(按点重练)。
8. 交付：完整做题→解析→错题→重做闭环。

### Phase 3 — 增强（冲刺）
9. 首页"继续学习"(resume) + "随机混合练习"（跨考点）。
10. 弱项诊断（按错次报告最弱考点）+ 可选模拟套题。

## 十四、验证
- 现有单词系统（Videos/Learn/错词本/易错表/PET备考）**全部回归正常、数据不变**。
- 语法空间：8类→50考点可学；训练4选1+三段解析（对错都出）；错题本/易错本按考点、可重做。
- 数据隔离：grammar_* 表与现有表独立；现有 progress/pet_* 行数不变。

## 十五、数据安全
纯新增（新表+新路由+新视图）；除顶栏加一个按钮外，现有页面零改动。现有学习数据（含 PET 错词/易错 3088/685）绝不触碰；部署前备份 DB。

---
## 附录：GLM 实测样例（质量已验证）
**现在完成时 vs 一般过去时**：题 *I don't want to see that film because I __ it twice.* A.saw B.see **C.have seen** D.was seeing → 解析：受之前动作影响+"twice"累计经历→现完 have seen；A需配过去时间，B/D不符。
**冠词 a/an/the**：题 *Look at ___ sky! It is ___ most beautiful sunset.* A.the/a B.a/the **C.the/the** D.a/a → 解析：sky 世上唯一+特指→the；最高级 most beautiful→必加 the。
> 50 考点 + 题库批量生成，质量同上。
