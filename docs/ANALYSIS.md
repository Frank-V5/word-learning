# 英语单词学习平台 — 深度项目分析

> 分析时间：2026-06-19
> 分析范围：全栈（前端 Vue3 + 后端 Express + SQLite + Nginx + PWA）
> 目的：建立完整心智模型，支撑后续优化与新功能开发

---

## 0. 一句话概括

一个**面向单用户/家庭场景**的英语单词视频学习平台：通过视频学单词 → 翻卡标记"认识/不会" → 错词本复习 → 易错表长期追踪。技术栈 Vue3 + Vite（前端）、Express + better-sqlite3（后端）、Nginx（静态/反代）、PWA（离线/装桌面）。代码量小（后端 ~600 行、前端 ~3000 行），但有**显著的代码陈旧/死代码、schema 漂移、若干明确的 bug**，是典型的"快速迭代、文档落后于实现"的项目。

---

## 1. 技术栈与运行时

| 层 | 技术 | 版本/位置 | 备注 |
|----|------|-----------|------|
| 前端框架 | Vue 3 | ^3.4 | Options API，未用 Pinia/Vuex |
| 构建 | Vite 5 | ^5.0 | `vite build` → `dist/` |
| 路由 | vue-router 4 | history 模式 | 5 条路由 |
| 后端 | Express 4 | ^4.21 | **单体 `index.js`，非 Hono** |
| DB | better-sqlite3 11 | ^11.0 | 同步 API，WAL 模式 |
| 进程管理 | PM2 | — | `word-learning-api` |
| 反代/静态 | Nginx | — | 监听 **80**，root `/var/www/word-learning` |
| PWA | manifest + sw.js | — | network-first API、cache-first 静态 |

**运行现状（2026-06-19 实测）**：
- 后端 API（PM2 pid 1813，端口 3100）：✅ online，75MB
- Nginx：❌ **当前未运行**（无 80/8080 监听）→ 公网站点目前不可访问
- README 写访问端口 8080，但 `nginx.conf` 实际监听 80 → **文档与配置不一致**

---

## 2. 目录与文件真相

```
word-learning/
├── backend/
│   ├── src/
│   │   ├── index.js          ★ 唯一真实入口，所有 Express 路由内联于此（~360行）
│   │   ├── db/
│   │   │   ├── index.js      ★ 全部数据访问层（userOps/videoOps/wordOps/progressOps/troublesomeOps）
│   │   │   └── schema.sql    ⚠️ 已与真实 DB 漂移（见 §6）
│   │   ├── routes/           🗑️ 死代码（user.js/video.js/progress.js，基于 Hono，从未被引用）
│   │   ├── middleware/       🗑️ 空目录
│   │   └── scripts/
│   │       └── import-words.js   样例导入脚本（仅 video_001 用过）
│   └── data/wordlearning.db  ★ 真实数据库（1.6MB，WAL 4MB 未 checkpoint）
├── frontend/
│   ├── src/
│   │   ├── main.js           入口 + 路由 + 登录守卫
│   │   ├── App.vue           顶栏（错词本/易错表徽标 + 退出）
│   │   ├── style.css         ★ 全局设计系统（745 行，含响应式/PWA/安全区）
│   │   ├── views/            Login / Videos / Learn / Review / Troublesome
│   │   ├── components/       VideoPlayerOverlay（视频弹窗播放器）
│   │   ├── api/              🗑️ 空目录（无集中 API 层，fetch 散落各组件）
│   │   ├── utils/            🗑️ 空目录
│   │   └── assets/           🗑️ 空目录
│   ├── public/               manifest.json + sw.js + icons（PWA）
│   └── dist/                 构建产物（部署到 /var/www/word-learning）
├── data/words/               单词 JSON 模板（video_001.json）
├── deploy/                   deploy.sh + ecosystem.config.js + nginx.conf（⚠️ 此 nginx.conf 与线上 /etc/nginx 不同）
├── start.sh / stop.sh        运维脚本
└── docs/                     DESIGN.md / ROADMAP.md / CHANGELOG.md / 本文件
```

**关键认知**：
- 真实路由全在 `backend/src/index.js`，`routes/` 目录是早期 Hono 方案的**残留死代码**（`package.json` 连 hono 都没装）。
- 前端**没有 API 层和 utils**，每个 `.vue` 直接 `fetch()`，逻辑重复（speak/视频播放逻辑在 3 个文件里复制）。
- `.gitignore` 排除了 `backend/data/` 和 `*.db`，所以 **schema.sql 是 schema 的唯一版本控制来源，而它已经漂移**。

---

## 3. 数据模型（真实 DB 实测）

5 张表 + sqlite_sequence。**以下为真实 DB 结构（非 schema.sql）**：

```
users              id(PK,8位学习码) nickname created_at last_active
videos             id(PK) title description video_url thumbnail word_count
                   sort_order created_at  category   ← schema.sql 缺失此列
words              id(PK,形如 {videoId}_w{n}) video_id word phonetic meaning pos
                   start_time end_time sort_order created_at(integer,全为0)  ← created_at 类型漂移
progress           id(自增) user_id word_id status(new/known/unknown) flip_count
                   last_flipped_at created_at updated_at   UNIQUE(user_id,word_id)
troublesome_words  id(PK) user_id word_id word phonetic meaning pos wrong_count
                   first_wrong_at created_at updated_at   UNIQUE(user_id, word_id)  ← schema.sql 写的是 (user_id, word)
```

**数据规模**：
- 视频 **115**（初中 28 / 高中 87）、单词 **3120**、用户 **2**、progress **2967**（known 1972 / unknown 339 / new 656）、易错 **920**
- 本质是**单重度用户**应用（用户 `43789505` 几乎是唯一活跃用户）

**核心关系与数据流**：
```
看视频学单词 → POST /api/progress {status}
                ├─ progress 表 upsert（status + flip_count++）
                └─ if status=='unknown' → troublesome_words upsert（wrong_count++）
错词本 = progress WHERE status='unknown'      （动态：标记 known 即移除）
易错表 = troublesome_words 全量               （静态累积，永不删减）
```

---

## 4. API 清单（实测 `index.js`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/create` | 创建用户，生成 8 位学习码（重试 10 次防重复） |
| POST | `/api/user/verify` | 验证学习码 + 更新 last_active |
| GET | `/api/videos?userId=` | 视频列表，带每个视频的 known/unknown 统计 |
| GET | `/api/videos/:id/words?userId=` | 视频单词 + 每词进度（首次访问自动 `initForVideo` 插 'new'） |
| POST | `/api/progress` | upsert 单词状态；unknown 时同步写易错表 |
| GET | `/api/wrong-words?userId=&grouped=` | 错词本（grouped=true 按视频分组） |
| GET | `/api/stats?userId=&videoId=` | 学习统计 |
| GET | `/api/troublesome-words?userId=&grouped=&limit=&offset=` | 易错表 |
| GET | `/api/troublesome-words/count?userId=` | 易错表计数 |
| GET | `/` `/health` | 健康检查 |

**缺失的 API**：`/api/wrong-words/count`（易错表有 count 接口，错词本没有 → App.vue 只能拉全量列表取 `.length`，低效）。

---

## 5. 功能盘点（已实现 vs 文档）

| 功能 | 状态 | 实现位置 |
|------|------|----------|
| 学习码登录（8位数字） | ✅ | Login.vue + 自动登录/多账号选择（localStorage `savedDevices`） |
| 视频分类（初中/高中） | ✅ | Videos.vue 按 `category` 字段过滤（**DB 已填充**：28/87） |
| 视频列表 + 进度条 | ✅ | Videos.vue |
| 翻卡学习（3D 翻转） | ✅ | Learn.vue + style.css 3D transform |
| Web Speech 发音 | ✅ | 内联 `speechSynthesis`，rate 0.8，en-US |
| 视频跳转到单词时间点 | ✅ | Learn.vue `playFrom(start_time)` |
| 标记 认识/不会 | ✅ | Learn.vue `markStatus` |
| 错词本（按视频分组+弹窗播放） | ✅ | Review.vue + VideoPlayerOverlay |
| 易错单词表（长期累积，跨视频按 word_id 去重） | ✅ | Troublesome.vue |
| 学习统计 | ✅ | `/api/stats` + 顶栏徽标 |
| PWA（manifest+sw+图标+离线） | ✅ | public/，index.html 注册 sw |
| 响应式（手机/iPad/iPad Pro/刘海） | ✅ | style.css 媒体查询完善 |
| 复习打怪 | ⚠️ 部分 | ROADMAP 称"打怪模式"，实际 Review 是翻卡复习，**无游戏化机制** |
| 管理后台 / 导出 / 学习统计图表 | ❌ | ROADMAP P2，未做 |

---

## 6. 发现的问题（按严重度）

### 🔴 P0 — 数据完整性 / 功能正确性

1. **重导单词会清空用户进度（潜在数据丢失）**
   `wordOps.batchCreate` 先 `DELETE FROM words WHERE video_id=?` 再用**新生成的随机 ID** 插入。一旦对某视频重新导入，所有 `progress`/`troublesome_words` 里指向旧 word_id 的记录变成孤儿。
   - 实测已有 **21 条孤儿 progress**。
   - 根因：导入脚本对正式数据用了确定性 ID（`{videoId}_w{n}`），但 `batchCreate` 默认走 `generateId('w_')` 随机 ID，两条路径不一致。
   - 修复方向：导入时以 `(video_id, word, sort_order)` 或稳定 slug 为幂等键做 upsert，而非 delete-all + 随机 ID。

2. **`created_at` 类型混乱导致排序不稳定**
   `videos.created_at`：108 条是整数毫秒时间戳（`1772699805385`），7 条是 DATETIME 字符串（`'2026-03-05 02:16:21'`）。`getAll()` 的 `ORDER BY sort_order, created_at` 在混类型时排序不可靠。`words.created_at` 全为 `0`。
   - 修复方向：统一存整数毫秒或 ISO 字符串，清洗存量。

3. **`VideoPlayerOverlay.vue` `onVideoEnded` 失效**
   ```js
   onVideoEnded() {
     // 播放结束，      this.$emit('update:playing', false)   // ← 被注释吞掉，整行无效
   }
   ```
   视频自然播完时 `isPlaying` 状态不会归位，按钮一直显示"暂停"。

4. **`Troublesome.vue` `markAsForgot` 触发顶栏错词数变 `undefined`**
   ```js
   this.$emit('updateWrongCount')   // 未传参
   ```
   App.vue `updateWrongCount(count){ this.wrongCount = count }` → wrongCount=undefined → 徽标逻辑紊乱。

### 🟠 P1 — 体验 / 正确性

5. **`VideoPlayerOverlay.vue` 遮罩背景 CSS 语法错误**
   ```css
   background: rgba(0, 1,5,0.9);   /* 无效：多了逗号，应为 rgba(0,0,0,0.9) */
   ```
   遮罩背景渲染异常（透明/继承），弹窗遮罩非预期半透明黑。

6. **`Learn.vue` `highlightWord` 滚动定位失效**
   `document.querySelector('.word-card:has(.word-text)')` 永远命中第一张卡，从易错表带 `?word=` 跳进来时无法滚动到目标单词。

7. **`Troublesome.vue` v-for 用 `:key="index"`**（非稳定 id）
   列表增删时可能复用错 DOM；Review.vue 用了 `word.id` 是对的，应统一。

8. **错词本无 count 接口**，App.vue 拉全量列表算长度（339 条 unknown 时多传无用数据）。

### 🟡 P2 — 代码健康 / 可维护性

9. **死代码**：`backend/src/routes/*`（Hono 版，从未引用）、`backend/src/middleware/`（空）、`frontend/src/{api,utils,assets}/`（空）、`npm run init-db` 指向不存在的 `init-db.js`。
10. **schema.sql 漂移**：缺 `videos.category`、`words.created_at`；`troublesome_words` 唯一约束写的是 `(user_id, word)`，真实库已是 `(user_id, word_id)` 并多出 `word_id` 列和 `idx_troublesome_word_id`。
11. **逻辑重复**：`speak()`、视频弹窗 `openVideoPlayer/navigateToWord/setVideoTime` 在 Review.vue 与 Troublesome.vue 几乎逐行复制，应抽到 utils/composable。
12. **PWA 缓存难失效**：`sw.js` 的 `CACHE_NAME='word-learning-v1'` 从未用于版本清理；静态资源 cache-first 且无版本号 → 发新版后老用户可能卡在旧壳（nginx 已对 js/css 设 no-cache 缓解，但 SW 仍可能命中旧 index.html）。
13. **单词数据噪声**：`投屏异常`（中文）出现 4 次、`oper/cept/Ceive`（词根碎片）等非真实单词混入；`video_020` 词数为 0（空视频）。
14. **WAL 4MB 未 checkpoint**（Jun 17 至今）；可定期 `PRAGMA wal_checkpoint(TRUNCATE)`。
15. **部署配置分裂**：`deploy/nginx.conf`（root=frontend/dist，端口 80，带 mp4 模块）vs 线上 `/etc/nginx/conf.d/word-learning.conf`（root=/var/www/word-learning，端口 80）vs `start.sh`（rsync 到 /var/www）→ 三处策略不一致。

---

## 7. 架构评估

**优点**：
- 技术选型务实、依赖极少（后端 3 个、前端 2 个），部署简单。
- 数据访问层（`db/index.js` 的 `*Ops` 对象）封装清晰，SQL 用 prepared statement，事务用 `db.transaction`。
- 前端样式系统专业，移动端/平板/触摸/刘海适配到位，对孩子用 iPad 场景友好。
- PWA 基础完整，可装桌面/离线。
- "错词本(动态) vs 易错表(静态)"的产品区分清晰，按 `word_id` 精确去重的设计正确。

**短板**：
- 后端单文件 `index.js` 路由全内联，与废弃的 `routes/` 形成误导。
- 前端无状态管理、无 API 层、无组件复用（Review/Troublesome 几乎双胞胎）。
- 无任何测试、无日志落盘、无错误监控。
- 学习算法是简单的"标记式"，**无间隔重复（SRS）/无个性化**——这是最大的产品升级空间。
- 无管理后台，加视频/改数据全靠手动跑脚本 + 改库。

---

## 8. 优化与新增功能建议（可立即动手）

### A. 低风险修复（建议先做，不碰线上数据）
- A1. 修 `onVideoEnded` 注释吞码、`markAsForgot` emit 缺参、`rgba` CSS、`highlightWord` 选择器、Troublesome 的 `:key`。（§6 的 3/4/5/6/7）
- A2. 抽 `frontend/src/utils/speech.js` + `useVideoPlayer` composable，消除 Review/Troublesome 重复。
- A3. 补 `/api/wrong-words/count`，App.vue 改用计数接口。
- A4. 删死代码（routes/、middleware/、空目录、init-db 脚本引用），或把 `index.js` 路由真正拆到 `routes/`（推荐后者，顺手统一）。
- A5. 同步 `schema.sql` 到真实结构（加 category、word_id、修正唯一约束）。

### B. 中等收益增强
- B1. **SRS 间隔重复**：给 progress 加 `next_review_at/ease_factor/interval`，错词本按到期排序，真正实现"复习打怪"。
- B2. **学习统计页**：日/周学习曲线、掌握率、高频错词 Top10（数据都在，只缺可视化）。
- B3. **单词搜索 / 全局词库**：跨视频搜词、按字母/词性筛选。
- B4. **导入流程幂等化**（修 P0-1）：稳定 ID + upsert，杜绝孤儿。
- B5. **数据清洗脚本**：标/删噪声词（中文、词根碎片）、填 video_020 单词。

### C. 产品级新功能
- C1. **管理后台**：CRUD 视频/单词、批量导入、查看全体用户进度。
- C2. **真正的"打怪"游戏化**：复习答对 → 经验/关卡/Boss 血量，配音效（孩子向）。
- C3. **多设备同步与分享**：学习码已有基础，可加家庭组、家长看板。
- C4. **AI 能力**：接入发音评分、例句生成、按词生成随堂小测验。
- C5. **导出/打印**：错词本导出 PDF/Anki 卡片。

---

## 9. 快速上手备忘（给后续开发）

```bash
# 后端开发
cd backend && npm run dev            # node --watch，端口 3100

# 前端开发（vite 3200，已配 /api /videos 代理到 3100）
cd frontend && npm run dev

# 构建部署
cd frontend && npm run build         # 产物在 dist/
bash start.sh                        # rsync dist→/var/www + 起 nginx（注意当前 nginx 未跑）

# 看后端日志
pm2 logs word-learning-api

# 手查 DB（只读）
cd backend && node -e "import('./src/db/index.js').then(m=>{const db=m.getDb();console.log(db.prepare('SELECT COUNT(*) n FROM videos').get())})"
```

**改代码后的生效路径**：前端改 `src/` → `npm run build` → `rsync dist/ → /var/www/word-learning/`（或 `bash start.sh`）→ 强刷浏览器/更新 sw 版本。后端改 `src/` → `pm2 restart word-learning-api`。

**不要做**：对线上 DB 直接 DELETE；用 `rsync --delete` 同步（会删 videos/，start.sh 已特意注释警告）。
