import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 数据库文件路径
const DB_PATH = join(__dirname, '../../data/wordlearning.db');
const SCHEMA_PATH = join(__dirname, 'schema.sql');

// 创建数据库连接
let db = null;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    
    // 初始化表结构
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
    
    console.log('✅ 数据库已连接:', DB_PATH);
  }
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
    console.log('数据库已关闭');
  }
}

// 生成唯一 ID
export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return prefix + timestamp + random;
}

// 生成 8 位数字学习码
export function generateUserCode() {
  // 生成 8 位纯数字
  const code = Math.floor(10000000 + Math.random() * 90000000).toString();
  return code;
}

// 用户相关操作
export const userOps = {
  create(nickname = null) {
    const db = getDb();
    const id = generateUserCode();
    const stmt = db.prepare('INSERT INTO users (id, nickname) VALUES (?, ?)');
    stmt.run(id, nickname);
    return this.getById(id);
  },

  getById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  },

  updateLastActive(id) {
    const db = getDb();
    const stmt = db.prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
  },

  exists(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT 1 FROM users WHERE id = ?');
    return !!stmt.get(id);
  }
};

// 视频相关操作
export const videoOps = {
  getAll() {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM videos ORDER BY sort_order, created_at');
    return stmt.all();
  },

  getById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM videos WHERE id = ?');
    return stmt.get(id);
  },

  create(data) {
    const db = getDb();
    const id = data.id || generateId('video_');
    const stmt = db.prepare(`
      INSERT INTO videos (id, title, description, video_url, thumbnail, word_count, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, data.title, data.description, data.video_url, data.thumbnail, data.word_count || 0, data.sort_order || 0);
    return this.getById(id);
  },

  updateWordCount(id) {
    const db = getDb();
    const stmt = db.prepare('UPDATE videos SET word_count = (SELECT COUNT(*) FROM words WHERE video_id = ?) WHERE id = ?');
    stmt.run(id, id);
  }
};

// 单词相关操作
export const wordOps = {
  getByVideoId(videoId) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM words WHERE video_id = ? ORDER BY sort_order, start_time');
    return stmt.all(videoId);
  },

  getById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM words WHERE id = ?');
    return stmt.get(id);
  },

  create(data) {
    const db = getDb();
    const id = data.id || generateId('w_');
    const stmt = db.prepare(`
      INSERT INTO words (id, video_id, word, phonetic, meaning, pos, start_time, end_time, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, data.video_id, data.word, data.phonetic, data.meaning, data.pos, data.start_time || 0, data.end_time || 0, data.sort_order || 0);
    return this.getById(id);
  },

  batchCreate(words) {
    const db = getDb();
    // 先删除该视频的旧单词
    const deleteOld = db.prepare('DELETE FROM words WHERE video_id = ?');
    const firstVideoId = words[0]?.video_id;
    if (firstVideoId) {
      deleteOld.run(firstVideoId);
    }
    
    const insert = db.prepare(`
      INSERT INTO words (id, video_id, word, phonetic, meaning, pos, start_time, end_time, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((words) => {
      for (const w of words) {
        const id = w.id || generateId('w_');
        insert.run(id, w.video_id, w.word, w.phonetic, w.meaning, w.pos, w.start_time || 0, w.end_time || 0, w.sort_order || 0);
      }
    });
    
    insertMany(words);
  }
};

// 易错单词表相关操作
export const troublesomeOps = {
  // 添加易错单词 (如果已存在则增加计数)
  // wordId: 单词ID，用于精确关联到特定视频
  upsert(userId, wordId, word, phonetic, meaning, pos) {
    const db = getDb();
    
    // 检查是否已存在（按 user_id + word_id 唯一）
    const existing = db.prepare('SELECT * FROM troublesome_words WHERE user_id = ? AND word_id = ?').get(userId, wordId);
    
    if (existing) {
      // 已存在，增加计数
      const stmt = db.prepare(`
        UPDATE troublesome_words 
        SET wrong_count = wrong_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND word_id = ?
      `);
      stmt.run(userId, wordId);
      return db.prepare('SELECT * FROM troublesome_words WHERE user_id = ? AND word_id = ?').get(userId, wordId);
    } else {
      // 不存在，插入新记录（同时存储 word_id 和 word 文本）
      const id = generateId('tw_');
      const stmt = db.prepare(`
        INSERT INTO troublesome_words (id, user_id, word_id, word, phonetic, meaning, pos, first_wrong_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(id, userId, wordId, word, phonetic, meaning, pos);
      return db.prepare('SELECT * FROM troublesome_words WHERE id = ?').get(id);
    }
  },

  // 获取易错单词列表
  getAll(userId, limit = 100, offset = 0) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM troublesome_words 
      WHERE user_id = ? 
      ORDER BY wrong_count DESC, first_wrong_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(userId, limit, offset);
  },

  // 获取易错单词总数
  getCount(userId) {
    const db = getDb();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM troublesome_words WHERE user_id = ?');
    return stmt.get(userId).count;
  },

  // 按视频分组获取易错单词 (用于网格展示)
  getGroupedByVideo(userId) {
    const db = getDb();
    // 使用 word_id 精确关联，避免跨视频重复单词的问题
    const stmt = db.prepare(`
      SELECT 
        v.id as video_id,
        v.title as video_title,
        v.video_url,
        tw.word,
        tw.phonetic,
        tw.meaning,
        tw.pos,
        tw.wrong_count,
        tw.first_wrong_at,
        tw.updated_at,
        w.start_time,
        w.end_time,
        w.id as word_id
      FROM troublesome_words tw
      JOIN words w ON w.id = tw.word_id
      JOIN videos v ON w.video_id = v.id
      WHERE tw.user_id = ?
      ORDER BY tw.updated_at DESC, tw.wrong_count DESC
    `);
    const rows = stmt.all(userId);

    // 按视频分组，保持时间逆序
    const grouped = {};
    const videoOrder = [];
    
    for (const row of rows) {
      if (!grouped[row.video_id]) {
        grouped[row.video_id] = {
          videoId: row.video_id,
          videoTitle: row.video_title,
          videoUrl: row.video_url,
          words: [],
          latestMarkedAt: row.updated_at
        };
        videoOrder.push(row.video_id);
      }
      grouped[row.video_id].words.push({
        wordId: row.word_id,
        word: row.word,
        phonetic: row.phonetic,
        meaning: row.meaning,
        pos: row.pos,
        wrongCount: row.wrong_count,
        firstWrongAt: row.first_wrong_at,
        startTime: row.start_time,
        endTime: row.end_time
      });
    }
    
    return videoOrder.map(vid => grouped[vid]);
  }
};

// 学习进度相关操作
export const progressOps = {
  getByVideoId(userId, videoId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT p.*, w.word, w.phonetic, w.meaning, w.pos, w.start_time, w.end_time
      FROM progress p
      JOIN words w ON p.word_id = w.id
      WHERE p.user_id = ? AND w.video_id = ?
      ORDER BY w.sort_order, w.start_time
    `);
    return stmt.all(userId, videoId);
  },

  getByWordId(userId, wordId) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM progress WHERE user_id = ? AND word_id = ?');
    return stmt.get(userId, wordId);
  },

  upsert(userId, wordId, status) {
    const db = getDb();
    const existing = this.getByWordId(userId, wordId);
    
    if (existing) {
      const stmt = db.prepare(`
        UPDATE progress 
        SET status = ?, flip_count = flip_count + 1, last_flipped_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND word_id = ?
      `);
      stmt.run(status, userId, wordId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO progress (user_id, word_id, status, flip_count, last_flipped_at)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
      `);
      stmt.run(userId, wordId, status);
    }
    
    // 如果标记为 unknown，同时写入易错单词表
    if (status === 'unknown') {
      const word = wordOps.getById(wordId);
      if (word) {
        troublesomeOps.upsert(userId, wordId, word.word, word.phonetic, word.meaning, word.pos);
      }
    }
    
    return this.getByWordId(userId, wordId);
  },

  getWrongWords(userId, videoId = null) {
    const db = getDb();
    let sql = `
      SELECT p.*, w.word, w.phonetic, w.meaning, w.pos, w.start_time, w.end_time, w.video_id, v.title as video_title
      FROM progress p
      JOIN words w ON p.word_id = w.id
      JOIN videos v ON w.video_id = v.id
      WHERE p.user_id = ? AND p.status = 'unknown'
      ORDER BY p.updated_at DESC
    `;
    const params = [userId];
    
    if (videoId) {
      sql = `
        SELECT p.*, w.word, w.phonetic, w.meaning, w.pos, w.start_time, w.end_time, w.video_id, v.title as video_title
        FROM progress p
        JOIN words w ON p.word_id = w.id
        JOIN videos v ON w.video_id = v.id
        WHERE p.user_id = ? AND w.video_id = ? AND p.status = 'unknown'
        ORDER BY w.sort_order, w.start_time
      `;
      params.push(videoId);
    }
    
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },

  // 获取按视频分组的错词
  getWrongWordsGrouped(userId) {
    const db = getDb();
    const sql = `
      SELECT p.word_id as id, w.word, w.phonetic, w.meaning, w.pos, 
             w.start_time as startTime, w.end_time as endTime, 
             w.video_id as videoId, v.title as videoTitle, v.video_url as videoUrl,
             p.updated_at as markedAt
      FROM progress p
      JOIN words w ON p.word_id = w.id
      JOIN videos v ON w.video_id = v.id
      WHERE p.user_id = ? AND p.status = 'unknown'
      ORDER BY p.updated_at DESC
    `;
    
    const rows = db.prepare(sql).all(userId);
    
    // 按视频分组，保持时间逆序
    const grouped = {};
    const videoOrder = []; // 记录视频出现顺序
    
    for (const row of rows) {
      if (!grouped[row.videoId]) {
        grouped[row.videoId] = {
          videoId: row.videoId,
          videoTitle: row.videoTitle,
          videoUrl: row.videoUrl,
          words: [],
          latestMarkedAt: row.markedAt
        };
        videoOrder.push(row.videoId);
      }
      grouped[row.videoId].words.push({
        id: row.id,
        word: row.word,
        phonetic: row.phonetic,
        meaning: row.meaning,
        pos: row.pos,
        startTime: row.startTime,
        endTime: row.endTime,
        markedAt: row.markedAt
      });
    }
    
    // 按视频最新标记时间排序
    return videoOrder.map(vid => grouped[vid]);
  },

  getStats(userId, videoId = null) {
    const db = getDb();
    
    if (videoId) {
      const stmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN p.status = 'known' THEN 1 ELSE 0 END) as known,
          SUM(CASE WHEN p.status = 'unknown' THEN 1 ELSE 0 END) as unknown,
          SUM(CASE WHEN p.status = 'new' OR p.status IS NULL THEN 1 ELSE 0 END) as new_count
        FROM words w
        LEFT JOIN progress p ON p.word_id = w.id AND p.user_id = ?
        WHERE w.video_id = ?
      `);
      return stmt.get(userId, videoId);
    } else {
      const stmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN p.status = 'known' THEN 1 ELSE 0 END) as known,
          SUM(CASE WHEN p.status = 'unknown' THEN 1 ELSE 0 END) as unknown,
          SUM(CASE WHEN p.status = 'new' OR p.status IS NULL THEN 1 ELSE 0 END) as new_count
        FROM words w
        LEFT JOIN progress p ON p.word_id = w.id AND p.user_id = ?
      `);
      return stmt.get(userId);
    }
  },

  // 初始化视频的进度记录
  initForVideo(userId, videoId) {
    const db = getDb();
    const words = wordOps.getByVideoId(videoId);
    
    const insert = db.prepare(`
      INSERT OR IGNORE INTO progress (user_id, word_id, status)
      VALUES (?, ?, 'new')
    `);
    
    const insertMany = db.transaction((words) => {
      for (const w of words) {
        insert.run(userId, w.id);
      }
    });
    
    insertMany(words);
  }
};
