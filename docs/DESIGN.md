# 英语单词学习平台 - 设计文档

> 版本: 1.0
> 更新时间: 2026-03-04
> 状态: 待实现

---

## 一、项目概述

### 1.1 项目目标

为孩子打造一个英语单词学习平台，通过视频+卡片翻转的方式学习单词，支持进度保存、错词本、复习打怪等功能。

### 1.2 核心功能

| 功能 | 描述 |
|------|------|
| 视频学习 | 顶部视频播放器，支持跳转到指定单词讲解位置 |
| 单词卡片 | 网格布局，大字体护眼，点击翻转显示释义 |
| 发音功能 | 点击播放单词发音 |
| 状态标记 | 认识/不会，卡片颜色变化 |
| 错词本 | 收集不会的单词，支持复习打怪 |
| 进度保存 | 云端保存，换设备不丢失 |

### 1.3 目标用户

- 小学生学习英语单词
- 需要简单易用的界面
- 需要护眼的大字体设计

---

## 二、技术架构

### 2.1 技术选型

| 层级 | 技术 | 理由 |
|------|------|------|
| 前端框架 | Vue 3 + Vite | 组件化开发，便于维护 |
| UI 样式 | 自定义 CSS | 简洁护眼，无框架依赖 |
| 后端框架 | Hono | 轻量高效，API 简洁 |
| 数据库 | SQLite | 文件数据库，部署简单 |
| 发音 | Web Speech API | 免费，浏览器内置 |
| 视频播放 | HTML5 Video | 原生支持 |

### 2.2 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (Vue 3)                            │
│  - 响应式布局，支持手机/平板/电脑                                 │
│  - 卡片翻转动画                                                  │
│  - 视频播放控制                                                  │
│  - Web Speech API 发音                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         后端 API (Hono)                         │
│  - 用户管理                                                      │
│  - 进度同步                                                      │
│  - 单词数据查询                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         数据库 (SQLite)                         │
│  - 用户数据                                                      │
│  - 单词数据                                                      │
│  - 学习进度                                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 部署架构

```
┌─────────────────────────────────────────────────────────────────┐
│                       云服务器                                  │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Nginx     │───▶│   Hono      │───▶│   SQLite    │        │
│  │   静态托管   │    │   :3000     │    │   数据库    │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                                                      │
│         ▼                                                      │
│  ┌─────────────┐                                              │
│  │   /videos   │  视频文件存储                                 │
│  │   *.mp4     │                                              │
│  └─────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、数据库设计

### 3.1 表结构

#### users 表（用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键，学习码（如 12345678） |
| nickname | TEXT | 昵称（可选） |
| created_at | DATETIME | 创建时间 |
| last_active | DATETIME | 最后活跃时间 |

#### videos 表（视频）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 |
| title | TEXT | 视频标题 |
| description | TEXT | 视频描述 |
| video_url | TEXT | 视频文件路径 |
| thumbnail | TEXT | 缩略图路径 |
| word_count | INTEGER | 单词数量 |
| sort_order | INTEGER | 排序 |
| created_at | DATETIME | 创建时间 |

#### words 表（单词）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 |
| video_id | TEXT | 所属视频 ID |
| word | TEXT | 单词 |
| phonetic | TEXT | 音标 |
| meaning | TEXT | 中文释义 |
| pos | TEXT | 词性（n./v./adj.） |
| start_time | INTEGER | 视频开始时间（秒） |
| end_time | INTEGER | 视频结束时间（秒） |
| sort_order | INTEGER | 排序 |

#### progress 表（学习进度）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键（自增） |
| user_id | TEXT | 用户 ID |
| word_id | TEXT | 单词 ID |
| status | TEXT | 状态：new/known/unknown |
| flip_count | INTEGER | 翻转次数 |
| last_flipped_at | DATETIME | 最后翻转时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 3.2 SQL 初始化脚本

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nickname TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 视频表
CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail TEXT,
    word_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 单词表
CREATE TABLE IF NOT EXISTS words (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    word TEXT NOT NULL,
    phonetic TEXT,
    meaning TEXT,
    pos TEXT,
    start_time INTEGER DEFAULT 0,
    end_time INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- 学习进度表
CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    word_id TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    flip_count INTEGER DEFAULT 0,
    last_flipped_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (word_id) REFERENCES words(id),
    UNIQUE(user_id, word_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_words_video ON words(video_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(user_id, status);
```

---

## 四、API 设计

### 4.1 接口列表

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/user/create` | POST | 创建新用户 |
| `/api/user/verify` | POST | 验证学习码 |
| `/api/user/info` | GET | 获取用户信息 |
| `/api/videos` | GET | 获取视频列表 |
| `/api/videos/:id` | GET | 获取视频详情 |
| `/api/videos/:id/words` | GET | 获取视频单词列表 |
| `/api/progress/:videoId` | GET | 获取视频学习进度 |
| `/api/progress` | POST | 更新单词状态 |
| `/api/wrong-words` | GET | 获取错词本 |
| `/api/stats` | GET | 获取学习统计 |

### 4.2 接口详情

#### POST /api/user/create

创建新用户，返回学习码。

**请求：**
```json
{
  "nickname": "小明"  // 可选
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "userId": "12345678",
    "nickname": "小明",
    "createdAt": "2026-03-04T09:35:00Z"
  }
}
```

#### POST /api/user/verify

验证学习码是否有效。

**请求：**
```json
{
  "userId": "12345678"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "userId": "12345678",
    "nickname": "小明",
    "lastActive": "2026-03-04T09:35:00Z"
  }
}
```

#### GET /api/videos

获取所有视频列表。

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": "video_001",
      "title": "P/R 单词讲解",
      "wordCount": 22,
      "thumbnail": "/images/video_001.jpg",
      "progress": {
        "learned": 8,
        "unknown": 3
      }
    }
  ]
}
```

#### GET /api/videos/:id/words

获取视频的所有单词。

**响应：**
```json
{
  "success": true,
  "data": {
    "video": {
      "id": "video_001",
      "title": "P/R 单词讲解",
      "videoUrl": "/videos/pr_words.mp4"
    },
    "words": [
      {
        "id": "w001",
        "word": "purse",
        "phonetic": "/pɜːrs/",
        "meaning": "钱包；皮包",
        "pos": "n.",
        "startTime": 0,
        "endTime": 52,
        "status": "known"
      }
    ]
  }
}
```

#### POST /api/progress

更新单词学习状态。

**请求：**
```json
{
  "wordId": "w001",
  "status": "known"  // known / unknown
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "wordId": "w001",
    "status": "known",
    "updatedAt": "2026-03-04T09:35:00Z"
  }
}
```

#### GET /api/wrong-words

获取用户的错词本（所有标记为 unknown 的单词）。

**参数：**
- `videoId`（可选）：指定视频的错词

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": "w003",
      "word": "queen",
      "phonetic": "/kwiːn/",
      "meaning": "女王；王后",
      "pos": "n.",
      "videoId": "video_001",
      "videoTitle": "P/R 单词讲解",
      "startTime": 330
    }
  ]
}
```

---

## 五、前端设计

### 5.1 页面结构

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 学习码输入/注册 |
| 视频列表 | `/videos` | 选择要学习的视频 |
| 学习页 | `/learn/:videoId` | 视频 + 单词卡片 |
| 复习页 | `/review` | 错词本复习 |

### 5.2 页面布局

#### 首页（学习码输入）

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                    🦀 英语单词学习平台                        │
│                                                             │
│                                                             │
│              请输入您的学习码：                               │
│                                                             │
│         ┌─────────────────────────────────┐                │
│         │                                 │                │
│         │      [      1 2 3 4      ]      │                │
│         │                                 │                │
│         └─────────────────────────────────┘                │
│                                                             │
│               [开始学习]     [我是新用户]                    │
│                                                             │
│                                                             │
│         💡 学习码用于保存进度，换设备也能继续学习              │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 学习页（核心页面）

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🦀 英语单词学习平台                    [← 返回]   [错词本 (3)]          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │                         📹 视频播放器                              │ │
│  │                                                                   │ │
│  │    ┌─────────────────────────────────────────────────────────┐   │ │
│  │    │                                                         │   │ │
│  │    │                    [视频内容区域]                        │   │ │
│  │    │                                                         │   │ │
│  │    └─────────────────────────────────────────────────────────┘   │ │
│  │                                                                   │ │
│  │    ▶️ ⏸️ ⏹️    ───────────●──────────────    🔊  全屏             │ │
│  │              00:45 / 62:00                                        │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  📖 P/R 单词讲解    共 22 个    已学 8 个    🔴 不会 3 个                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  单词卡片（网格布局，3-4列）：                                           │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │             │  │             │  │             │  │             │   │
│  │   p u r s e │  │    p u s h  │  │  q u e e n  │  │   q u i c k │   │
│  │             │  │             │  │             │  │             │   │
│  │   /pɜːrs/   │  │    /pʊʃ/    │  │   /kwiːn/   │  │   /kwɪk/    │   │
│  │             │  │             │  │             │  │             │   │
│  │  🔊    ▶️   │  │  🔊    ▶️   │  │  🔊    ▶️   │  │  🔊    ▶️   │   │
│  │             │  │      ✅     │  │      🔴     │  │             │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │             │  │             │  │             │  │             │   │
│  │   r a b b i │  │   r a i n y │  │    r a i s  │  │    r a p i  │   │
│  │     t       │  │             │  │      e      │  │      d      │   │
│  │  /ˈræbɪt/   │  │   /ˈreɪni/  │  │    /reɪz/   │  │  /ˈræpɪd/   │   │
│  │             │  │             │  │             │  │             │   │
│  │  🔊    ▶️   │  │  🔊    ▶️   │  │  🔊    ▶️   │  │  🔊    ▶️   │   │
│  │      🔴     │  │             │  │      ✅     │  │             │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
│  ... 所有卡片平铺展示 ...                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 复习页（错词本）

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🎯 复习模式 - 消灭错词！                                    [← 退出]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  当前视频：P/R 单词讲解    剩余：2 / 3 个                                │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░ 67%                          │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                     ┌─────────────────────────────┐                     │
│                     │                             │                     │
│                     │         q u e e n           │                     │
│                     │                             │                     │
│                     │          /kwiːn/           │                     │
│                     │                             │                     │
│                     │      🔊        ▶️          │                     │
│                     │                             │                     │
│                     │    [点击卡片翻转查看释义]    │                     │
│                     │                             │                     │
│                     └─────────────────────────────┘                     │
│                                                                         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                              ↓ 翻转后                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                     ┌─────────────────────────────┐                     │
│                     │                             │                     │
│                     │      💼 n. 女王；王后       │                     │
│                     │                             │                     │
│                     │      🔊        ▶️          │                     │
│                     │                             │                     │
│                     │  [✅ 认识，消灭它！]         │                     │
│                     │  [❓ 还是不会，继续练]       │                     │
│                     │                             │                     │
│                     └─────────────────────────────┘                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 卡片设计

#### 卡片尺寸

```css
.card {
    width: 200px;        /* 卡片宽度 */
    min-height: 160px;   /* 卡片最小高度 */
    padding: 20px;       /* 内边距 */
    font-size: 28px;     /* 单词字号，护眼大字 */
}
```

#### 卡片状态样式

| 状态 | 背景色 | 边框 | 角标 |
|------|--------|------|------|
| 默认（未学习） | 白色 #FFFFFF | 灰色 #E0E0E0 | 无 |
| 已翻转（学习中） | 白色 #FFFFFF | 蓝色 #2196F3 | 无 |
| 认识（已掌握） | 白色 #FFFFFF | 绿色 #4CAF50 | ✅ |
| 不会 | 浅红 #FFEBEE | 红色 #F44336 | 🔴 |

#### 卡片翻转动画

```css
.card-container {
    perspective: 1000px;
}

.card {
    transition: transform 0.6s;
    transform-style: preserve-3d;
}

.card.flipped {
    transform: rotateY(180deg);
}

.card-front, .card-back {
    backface-visibility: hidden;
}

.card-back {
    transform: rotateY(180deg);
}
```

### 5.4 组件设计

| 组件 | 说明 |
|------|------|
| `LoginPage` | 学习码输入页面 |
| `VideoListPage` | 视频列表页面 |
| `LearnPage` | 学习页面（视频+卡片） |
| `ReviewPage` | 复习页面 |
| `VideoPlayer` | 视频播放器组件 |
| `WordCard` | 单词卡片组件 |
| `ProgressBar` | 进度条组件 |
| `Header` | 顶部导航组件 |

---

## 六、单词发音方案

### 6.1 实现方案

使用 Web Speech API（浏览器内置 TTS）：

```javascript
// 发音功能
function pronounce(word) {
    // 检查浏览器支持
    if (!('speechSynthesis' in window)) {
        alert('您的浏览器不支持发音功能');
        return;
    }
    
    // 停止当前播放
    window.speechSynthesis.cancel();
    
    // 创建发音
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';    // 美式英语
    utterance.rate = 0.8;        // 稍慢，适合学习
    utterance.pitch = 1.0;       // 正常音调
    
    // 播放
    window.speechSynthesis.speak(utterance);
}
```

### 6.2 备选方案

如果 Web Speech API 效果不理想，可切换到有道词典：

```javascript
// 有道词典发音 URL
function getYoudaoAudioUrl(word) {
    return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
}

// 播放
function pronounce(word) {
    const audio = new Audio(getYoudaoAudioUrl(word));
    audio.play();
}
```

---

## 七、项目文件结构

```
word-learning/
├── docs/                        # 文档
│   ├── DESIGN.md               # 设计文档（本文件）
│   ├── API.md                  # API 文档
│   └── CHANGELOG.md            # 更新日志
│
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── views/              # 页面
│   │   │   ├── Login.vue       # 登录页
│   │   │   ├── VideoList.vue   # 视频列表
│   │   │   ├── Learn.vue       # 学习页
│   │   │   └── Review.vue      # 复习页
│   │   ├── components/         # 组件
│   │   │   ├── VideoPlayer.vue # 视频播放器
│   │   │   ├── WordCard.vue    # 单词卡片
│   │   │   ├── ProgressBar.vue # 进度条
│   │   │   └── Header.vue      # 顶部导航
│   │   ├── api/                # API 调用
│   │   │   └── index.js
│   │   ├── utils/              # 工具函数
│   │   │   ├── speech.js       # 发音
│   │   │   └── storage.js      # 本地存储
│   │   ├── App.vue             # 根组件
│   │   ├── main.js             # 入口
│   │   └── router.js           # 路由
│   ├── public/                 # 静态资源
│   │   ├── favicon.ico
│   │   └── images/
│   ├── index.html
│   ├── vite.config.js          # Vite 配置
│   └── package.json
│
├── backend/                     # 后端项目
│   ├── src/
│   │   ├── index.js            # 入口
│   │   ├── routes/             # 路由
│   │   │   ├── user.js         # 用户接口
│   │   │   ├── video.js        # 视频接口
│   │   │   └── progress.js     # 进度接口
│   │   ├── db/
│   │   │   ├── init.sql        # 数据库初始化
│   │   │   └── index.js        # 数据库操作
│   │   └── middleware/         # 中间件
│   │       └── auth.js         # 用户认证
│   ├── data/                   # 数据库文件
│   │   └── wordlearning.db
│   ├── scripts/                # 脚本
│   │   └── import-words.js     # 单词导入脚本
│   └── package.json
│
├── videos/                      # 视频文件
│   └── *.mp4
│
├── data/                        # 单词数据（JSON）
│   └── words/
│       ├── video_001.json
│       └── video_002.json
│
└── deploy/                      # 部署配置
    ├── nginx.conf              # Nginx 配置
    ├── ecosystem.config.js     # PM2 配置
    └── deploy.sh               # 部署脚本
```

---

## 八、开发计划

### 8.1 阶段划分

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| **Phase 1** | 项目初始化 + 数据库 + 后端 API | 1 天 |
| **Phase 2** | 前端框架 + 页面结构 | 1 天 |
| **Phase 3** | 卡片组件 + 交互 + 发音 | 0.5 天 |
| **Phase 4** | 视频播放 + 跳转功能 | 0.5 天 |
| **Phase 5** | 错词本 + 复习模式 | 0.5 天 |
| **Phase 6** | 部署 + 测试 + 优化 | 0.5 天 |

### 8.2 里程碑

- [ ] M1: 后端 API 可用
- [ ] M2: 前端页面可访问
- [ ] M3: 学习功能可用
- [ ] M4: 复习功能可用
- [ ] M5: 部署上线

---

## 九、部署方案

### 9.1 服务器要求

- Node.js 18+
- Nginx
- 端口：80（Nginx）、3000（后端 API）

### 9.2 Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /var/www/word-learning/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # 后端 API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # 视频文件
    location /videos {
        root /var/www/word-learning;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 9.3 PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
    apps: [{
        name: 'word-learning-api',
        script: 'backend/src/index.js',
        cwd: '/var/www/word-learning',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '256M',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        }
    }]
};
```

---

## 十、更新日志

### v1.0 (2026-03-04)

- 初始设计文档
- 确定技术架构
- 确定功能需求
- 确定数据结构

---

## 十一、待讨论/待定事项

- [ ] 是否需要管理后台（添加视频/单词）？
- [ ] 是否需要学习统计功能？
- [ ] 是否需要导出错词本（打印）？
- [ ] 视频是否需要加密/防盗链？

---

*文档维护：Claw 🦀*
