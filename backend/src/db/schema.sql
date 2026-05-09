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
