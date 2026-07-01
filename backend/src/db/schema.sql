-- 英语单词学习平台数据库初始化脚本

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,              -- 学习码 (8位数字)
    nickname TEXT,                    -- 昵称
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
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- 学习进度表
CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    word_id TEXT NOT NULL,
    status TEXT DEFAULT 'new',        -- new / known / unknown
    flip_count INTEGER DEFAULT 0,
    last_flipped_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
    UNIQUE(user_id, word_id)
);

-- 易错单词表 (静态累积，不做删减)
CREATE TABLE IF NOT EXISTS troublesome_words (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    word TEXT NOT NULL,
    phonetic TEXT,
    meaning TEXT,
    pos TEXT,
    wrong_count INTEGER DEFAULT 1,    -- 累计标记为不会的次数
    first_wrong_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, word)             -- 按用户+单词去重
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_words_video ON words(video_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_progress_word ON progress(word_id);
CREATE INDEX IF NOT EXISTS idx_troublesome_user ON troublesome_words(user_id);
CREATE INDEX IF NOT EXISTS idx_troublesome_word ON troublesome_words(user_id, word);

-- 单词误提取标记 (全局: 行存在=已标记; 用户标记 -> 管理员后台清理)
CREATE TABLE IF NOT EXISTS word_flags (
    word_id     TEXT PRIMARY KEY,
    word        TEXT,
    video_id    TEXT,
    flagged_by  TEXT,
    flagged_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_word_flags_video ON word_flags(video_id);

-- ============ PET 备考子系统 (独立隔离, 不影响现有 小学/初中/高中) ============
-- 规范词字典: 全平台单词身份统一 (id=canonical_id=w_<sha1(norm_key)>, 同词同 id)
CREATE TABLE IF NOT EXISTS word_dict (
    id          TEXT PRIMARY KEY,      -- canonical_id, 全平台共享
    norm_key    TEXT UNIQUE,
    word        TEXT,
    phonetic    TEXT,
    meaning     TEXT,
    pos         TEXT,
    is_pet      INTEGER DEFAULT 0,     -- 是否 PET 词
    is_covered  INTEGER DEFAULT 0,     -- PET 词且有 小学/初中/高中 视频覆盖
    example_en  TEXT,                  -- 例句英文 (GLM 生成, CEFR A2-B1)
    example_cn  TEXT,                  -- 例句中文翻译
    mnemonic    TEXT                   -- 联想记法 (词根优先, GLM 生成)
);
CREATE INDEX IF NOT EXISTS idx_word_dict_pet ON word_dict(is_pet);

-- PET 词分到 covered/uncovered 单元
CREATE TABLE IF NOT EXISTS pet_unit_words (
    group_unit   TEXT,
    canonical_id TEXT,
    sort_order   INTEGER,
    PRIMARY KEY (group_unit, canonical_id)
);

-- PET 学习进度 (PET 错词本 = status='unknown', 动态)
CREATE TABLE IF NOT EXISTS pet_progress (
    user_id         TEXT,
    canonical_id    TEXT,
    status          TEXT DEFAULT 'new',   -- new / known / unknown
    flip_count      INTEGER DEFAULT 0,
    last_flipped_at DATETIME,
    PRIMARY KEY (user_id, canonical_id)
);

-- PET 易错表 (永久累积, 不随进度删减)
CREATE TABLE IF NOT EXISTS pet_troublesome (
    user_id        TEXT,
    canonical_id   TEXT,
    word           TEXT,
    phonetic       TEXT,
    meaning        TEXT,
    pos            TEXT,
    wrong_count    INTEGER DEFAULT 1,
    first_wrong_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, canonical_id)
);

-- ============ 语法训练模块 (完全隔离, 不影响单词/PET 系统) ============
CREATE TABLE IF NOT EXISTS grammar_points (        -- 50 考点知识卡
    id         TEXT PRIMARY KEY,
    category   TEXT,
    name       TEXT,
    rule       TEXT,
    formula    TEXT,
    examples   TEXT,    -- JSON [{en,cn}]
    pitfalls   TEXT,    -- JSON [str]
    sort_order INTEGER
);
CREATE TABLE IF NOT EXISTS grammar_questions (     -- 题库 (Phase 2)
    id          TEXT PRIMARY KEY,
    point_id    TEXT,
    stem        TEXT,
    options     TEXT,   -- JSON [4]
    answer      TEXT,
    why         TEXT,
    point_note  TEXT,
    distractors TEXT,
    sort_order  INTEGER
);
CREATE TABLE IF NOT EXISTS grammar_progress (      -- 考点学习状态 (懂/没懂)
    user_id    TEXT,
    point_id   TEXT,
    status     TEXT DEFAULT 'new',   -- new / known / unknown
    learned_at DATETIME,
    PRIMARY KEY (user_id, point_id)
);
CREATE TABLE IF NOT EXISTS grammar_wrong (         -- 错题本 (动态, Phase 2)
    user_id     TEXT,
    question_id TEXT,
    point_id    TEXT,
    added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, question_id)
);
CREATE TABLE IF NOT EXISTS grammar_troublesome (   -- 语法易错本 (没懂的考点累积)
    user_id        TEXT,
    point_id       TEXT,
    wrong_count    INTEGER DEFAULT 1,
    first_wrong_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, point_id)
);

-- ── 不规则动词变形翻卡 (语法空间 /grammar/verbs) ──
CREATE TABLE IF NOT EXISTS verb_cards (            -- 80 张动词卡 (3 tier 难度)
    id          TEXT PRIMARY KEY,
    base        TEXT,                              -- 原形
    past        TEXT,                              -- 过去式
    participle  TEXT,                              -- 过去分词
    meaning_zh  TEXT,
    tier        INTEGER,                           -- 1=红 高频易错 / 2=黄 / 3=绿
    sort_order  INTEGER
);
CREATE TABLE IF NOT EXISTS verb_troublesome (      -- 动词易错本 (永久累积)
    user_id        TEXT,
    card_id        TEXT,
    wrong_count    INTEGER DEFAULT 1,
    first_wrong_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, card_id)
);

-- ── 固定搭配翻卡 (语法空间 /grammar/phrases) ──
CREATE TABLE IF NOT EXISTS phrase_cards (          -- 102 张搭配卡 (按 grp 分组)
    id          TEXT PRIMARY KEY,
    phrase      TEXT,
    meaning_zh  TEXT,
    note        TEXT,
    grp         TEXT,                              -- 分组
    sort_order  INTEGER
);
CREATE TABLE IF NOT EXISTS phrase_troublesome (    -- 搭配易错本 (永久累积)
    user_id        TEXT,
    card_id        TEXT,
    wrong_count    INTEGER DEFAULT 1,
    first_wrong_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, card_id)
);

-- ============ 暑假任务计划 (完全隔离, 不影响单词/PET/语法) ============
CREATE TABLE IF NOT EXISTS summer_tasks (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    date          TEXT NOT NULL,            -- 'YYYY-MM-DD' (本地日期, 由前端传入)
    category      TEXT,                     -- 学习/运动/家务/阅读
    name          TEXT NOT NULL,            -- 任务名
    standard      TEXT,                     -- 完成标准 (一句话客观标准)
    sort_order    INTEGER DEFAULT 0,
    -- 孩子自评打卡
    child_checked INTEGER DEFAULT 0,        -- 0/1
    child_at      DATETIME,
    -- 家长审核
    parent_status TEXT,                     -- 'approved' / NULL(未确认)
    parent_at     DATETIME
);
CREATE INDEX IF NOT EXISTS idx_summer_user_date ON summer_tasks(user_id, date);

