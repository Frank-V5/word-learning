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

  // 获取错词数量（轻量计数，避免拉全量列表）
  getWrongCount(userId, videoId = null) {
    const db = getDb();
    if (videoId) {
      const stmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM progress p
        JOIN words w ON p.word_id = w.id
        WHERE p.user_id = ? AND w.video_id = ? AND p.status = 'unknown'
      `);
      return stmt.get(userId, videoId).count;
    }
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM progress p
      WHERE p.user_id = ? AND p.status = 'unknown'
    `);
    return stmt.get(userId).count;
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

// 单词误提取标记 (全局: 行存在=已标记)
export const flagOps = {
  // toggle: 有则删, 无则插。需要词文本/视频用于溯源。
  toggle(wordId, userId, word, videoId) {
    const db = getDb();
    const existing = db.prepare('SELECT word_id FROM word_flags WHERE word_id = ?').get(wordId);
    if (existing) {
      db.prepare('DELETE FROM word_flags WHERE word_id = ?').run(wordId);
      return { flagged: false };
    }
    db.prepare(`INSERT INTO word_flags (word_id, word, video_id, flagged_by) VALUES (?, ?, ?, ?)`)
      .run(wordId, word, videoId, userId);
    return { flagged: true };
  },

  isFlagged(wordId) {
    const db = getDb();
    return !!db.prepare('SELECT 1 FROM word_flags WHERE word_id = ?').get(wordId);
  },

  // 全部标记 (供后台清单; 连接视频标题/分类)
  getAll() {
    const db = getDb();
    return db.prepare(`
      SELECT f.word_id, f.word, f.video_id, f.flagged_by, f.flagged_at,
             v.title as video_title, v.category
      FROM word_flags f LEFT JOIN videos v ON f.video_id = v.id
      ORDER BY f.flagged_at DESC
    `).all();
  },

  remove(wordId) {   // 词被删除时同步清标记
    const db = getDb();
    db.prepare('DELETE FROM word_flags WHERE word_id = ?').run(wordId);
  }
};

// PET 备考子系统 (独立隔离, 不影响现有 小学/初中/高中; canonical_id 全平台统一)
export const petOps = {
  // 两组(covered/uncovered) + 各单元进度统计
  getGroups(userId) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT u.group_unit,
             COUNT(*) AS total,
             SUM(CASE WHEN p.status='known' THEN 1 ELSE 0 END) AS known,
             SUM(CASE WHEN p.status='unknown' THEN 1 ELSE 0 END) AS unknown
      FROM pet_unit_words u
      LEFT JOIN pet_progress p ON p.canonical_id=u.canonical_id AND p.user_id=?
      GROUP BY u.group_unit ORDER BY u.group_unit
    `).all(userId);
    const covered = [], uncovered = [];
    rows.forEach((r, i) => {
      const idx = parseInt(r.group_unit.split('_')[1], 10);
      const start = (idx - 1) * 100 + 1;
      const item = { unit: r.group_unit, idx, range: `${start}-${start + r.total - 1}`,
                     total: r.total, known: r.known || 0, unknown: r.unknown || 0 };
      (r.group_unit.startsWith('covered') ? covered : uncovered).push(item);
    });
    return { covered, uncovered };
  },

  getUnitWords(unit, userId) {
    const db = getDb();
    return db.prepare(`
      SELECT w.id AS canonical_id, w.word, w.phonetic, w.meaning, w.pos, w.is_covered,
             p.status, p.flip_count, u.sort_order
      FROM pet_unit_words u JOIN word_dict w ON w.id=u.canonical_id
      LEFT JOIN pet_progress p ON p.canonical_id=u.canonical_id AND p.user_id=?
      WHERE u.group_unit=? ORDER BY u.sort_order
    `).all(userId, unit);
  },

  // 认识/不会: 写 pet_progress; 不会 -> 联动 pet_troublesome(永久); 认识 -> 易错表不动
  upsertProgress(userId, canonicalId, status) {
    const db = getDb();
    const w = db.prepare('SELECT word,phonetic,meaning,pos FROM word_dict WHERE id=?').get(canonicalId);
    if (!w) return null;
    if (!['known', 'unknown'].includes(status)) return null;
    db.prepare(`INSERT INTO pet_progress (user_id,canonical_id,status,flip_count,last_flipped_at)
                VALUES (?,?,?,1,CURRENT_TIMESTAMP)
                ON CONFLICT(user_id,canonical_id) DO UPDATE SET status=excluded.status,
                  flip_count=pet_progress.flip_count+1, last_flipped_at=CURRENT_TIMESTAMP`)
      .run(userId, canonicalId, status);
    if (status === 'unknown') {
      db.prepare(`INSERT INTO pet_troublesome (user_id,canonical_id,word,phonetic,meaning,pos,wrong_count)
                  VALUES (?,?,?,?,?,?,1)
                  ON CONFLICT(user_id,canonical_id) DO UPDATE SET wrong_count=pet_troublesome.wrong_count+1`)
        .run(userId, canonicalId, w.word, w.phonetic, w.meaning, w.pos);
    }
    return { status };
  },

  // PET 错词本 (动态 = 当前 unknown; 带单元分组)
  getReview(userId) {
    const db = getDb();
    return db.prepare(`
      SELECT w.id AS canonical_id, w.word, w.phonetic, w.meaning, w.pos, w.is_covered,
             p.status, p.flip_count, u.group_unit
      FROM pet_progress p
      JOIN word_dict w ON w.id=p.canonical_id
      LEFT JOIN pet_unit_words u ON u.canonical_id=w.id
      WHERE p.user_id=? AND p.status='unknown' ORDER BY u.group_unit, p.last_flipped_at DESC
    `).all(userId);
  },

  // PET 易错表 (永久累积; 带单元分组)
  getTroublesome(userId) {
    const db = getDb();
    return db.prepare(`
      SELECT t.canonical_id, t.word, t.phonetic, t.meaning, t.pos, t.wrong_count, t.first_wrong_at,
             w.is_covered, u.group_unit
      FROM pet_troublesome t
      LEFT JOIN word_dict w ON w.id=t.canonical_id
      LEFT JOIN pet_unit_words u ON u.canonical_id=t.canonical_id
      WHERE t.user_id=? ORDER BY u.group_unit, t.wrong_count DESC, t.first_wrong_at DESC
    `).all(userId);
  },

  // 覆盖词关联视频 (只读查现有 words 按 norm_key, 不改原表)
  getVideoLink(canonicalId) {
    const db = getDb();
    const w = db.prepare('SELECT norm_key FROM word_dict WHERE id=?').get(canonicalId);
    if (!w) return null;
    const row = db.prepare(`
      SELECT wd.id AS word_id, wd.video_id, wd.start_time, v.title AS video_title, v.category, v.video_url
      FROM words wd JOIN videos v ON wd.video_id=v.id
      WHERE v.category IN ('primary','junior','senior') AND lower(wd.word)=?
      LIMIT 1
    `).get(w.norm_key);
    return row ? { wordId: row.word_id, videoId: row.video_id, startTime: row.start_time,
                   videoTitle: row.video_title, category: row.category, videoUrl: row.video_url } : null;
  }
};
