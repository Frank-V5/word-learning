# 英语单词学习平台设计文档

## 1. 项目概述

英语单词学习平台是一个基于视频的单词学习系统，支持：
- 视频分类（初中/高中）
- 单词卡片翻转学习
- 错词本功能
- 易错单词表功能
- 学习进度跟踪

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (Vue 3)                        │
├─────────────────────────────────────────────────────────┤
│  Videos    │    Learn    │    Review    │  WrongList   │
│  (视频列表)  │  (单词学习)  │   (错词复习)  │  (易错单词表)  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   后端 API (Express)                     │
├─────────────────────────────────────────────────────────┤
│  /api/videos     │  /api/progress  │  /api/wrong-words  │
│  /api/stats      │  /api/troublesome-words              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   SQLite 数据库                          │
└─────────────────────────────────────────────────────────┘
```

## 3. 数据库设计

### 3.1 表结构

#### users 表
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,          -- 用户ID (学习码)
    nickname TEXT,                -- 昵称
    created_at DATETIME,
    last_active DATETIME
);
```

#### videos 表
```sql
CREATE TABLE videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,               -- 视频路径
    thumbnail TEXT,
    category TEXT DEFAULT 'junior', -- 'junior' 或 'senior'
    word_count INTEGER DEFAULT 0,
    created_at DATETIME
);
```

#### words 表
```sql
CREATE TABLE words (
    id TEXT PRIMARY KEY,
    video_id TEXT,
    word TEXT NOT NULL,
    phonetic TEXT,
    meaning TEXT,
    pos TEXT,                     -- 词性
    start_time INTEGER,           -- 视频开始时间 (秒)
    end_time INTEGER,             -- 视频结束时间 (秒)
    sort_order INTEGER,
    FOREIGN KEY (video_id) REFERENCES videos(id)
);
```

#### progress 表
```sql
CREATE TABLE progress (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    word_id TEXT,
    status TEXT,                  -- 'known', 'unknown', 'new'
    flip_count INTEGER DEFAULT 0,
    last_flipped_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (word_id) REFERENCES words(id),
    UNIQUE(user_id, word_id)
);
```

#### troublesome_words 表 (易错单词表)
```sql
CREATE TABLE troublesome_words (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    word TEXT NOT NULL,
    first_wrong_at DATETIME,      -- 首次标记为不会的时间
    wrong_count INTEGER DEFAULT 1, -- 累计标记为不会的次数
    created_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, word)         -- 按用户+单词去重
);
```

### 3.2 视图

```sql
-- 错词视图 (当前状态为 unknown 的单词)
CREATE VIEW wrong_words_view AS
SELECT 
    p.id as progress_id,
    p.user_id,
    w.id as word_id,
    w.word,
    w.phonetic,
    w.meaning,
    w.pos,
    w.start_time,
    w.end_time,
    w.video_id,
    v.title as video_title
FROM progress p
JOIN words w ON p.word_id = w.id
JOIN videos v ON w.video_id = v.id
WHERE p.status = 'unknown';
```

## 4. 功能设计

### 4.1 视频分类

**入口**: 首页顶部标签切换

| 标签 | 筛选条件 | 统计信息 |
|------|---------|---------|
| 初中 | category = 'junior' | 总单词数、已学数、不会数 |
| 高中 | category = 'senior' | 总单词数、已学数、不会数 |

**分类规则**:
- 初中: 标题包含 "初中"、"中学"、"魔卡"、"摩卡"
- 高中: 标题以数字+英文开头 或 包含 "高中"

### 4.2 错词本 (已实现)

**触发条件**: 单词状态为 `unknown`

**功能**:
- 卡片翻转复习
- 标记为"认识"后从错词本移除
- 支持播放视频片段

**API**: `GET /api/wrong-words?userId=xxx`

### 4.3 易错单词表 (新增)

**功能对比**:

| 功能 | 错词本 | 易错单词表 |
|------|--------|-----------|
| 触发条件 | 当前状态 = unknown | 曾经状态 = unknown |
| 动态性 | 动态增删 | 静态累积 |
| 去重 | 按单词+视频 | 按单词 (跨视频去重) |
| 用途 | 当前复习 | 历史记录 |

**业务逻辑**:
1. 用户标记单词为 "unknown" 时
2. 同时写入:
   - 更新 `progress` 表状态为 `unknown`
   - 检查 `troublesome_words` 表是否存在该单词
     - 存在: `wrong_count++`
     - 不存在: 插入新记录

**API 设计**:
```
POST /api/progress
{
    userId: "xxx",
    wordId: "xxx",
    status: "unknown"  // 触发写入易错单词表
}

GET /api/troublesome-words?userId=xxx
返回: [
    { word, phonetic, meaning, wrongCount, firstWrongAt }
]
```

### 4.4 前端布局

```
┌─────────────────────────────────────────────────────────┐
│  🦀 英语单词学习                              [错词本] [易错表] │
├─────────────────────────────────────────────────────────┤
│  [初中]  [高中]                                          │
├─────────────────────────────────────────────────────────┤
│  📊 统计: 总单词 850 | ✅ 已学 320 | 🔴 不会 45           │
└─────────────────────────────────────────────────────────┘
```

## 5. API 接口

### 5.1 视频接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/videos | 获取视频列表 (支持 ?category=junior/senior) |
| GET | /api/videos/:id/words | 获取视频单词 |

### 5.2 进度接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/progress | 更新单词状态 (同时更新易错表) |
| GET | /api/stats | 获取学习统计 |

### 5.3 错词接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/wrong-words | 获取错词本 (当前 unknown) |
| GET | /api/troublesome-words | 获取易错单词表 (历史记录) |

## 6. 文件结构

```
word-learning/
├── frontend/
│   ├── src/
│   │   ├── views/
│   │   │   ├── Videos.vue      # 视频列表
│   │   │   ├── Learn.vue       # 单词学习
│   │   │   ├── Review.vue      # 错词复习
│   │   │   └── Troublesome.vue # 易错单词表 (新增)
│   │   └── router/index.js
│   └── dist/
├── backend/
│   ├── src/
│   │   ├── index.js            # API 入口
│   │   └── db/
│   │       ├── schema.sql      # 数据库结构
│   │       └── index.js        # 数据库操作
│   └── data/
│       └── wordlearning.db
└── docs/
    └── DESIGN.md
```

## 7. 部署

- **前端**: Nginx 静态托管 (`/var/www/word-learning/`)
- **后端**: PM2 管理 (端口 3100)
- **视频**: Nginx 静态托管 (`/var/www/word-learning/videos/`)
- **访问**: http://192.144.228.182/

## 8. 更新记录

- **2026-03-07**: 初始设计文档
- **2026-03-07**: 新增易错单词表功能设计
