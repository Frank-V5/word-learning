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
