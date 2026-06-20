import express from 'express';
import cors from 'cors';
import { getDb, closeDb, userOps, videoOps, wordOps, progressOps, troublesomeOps, flagOps, petOps, generateUserCode, generateId } from './db/index.js';

const app = express();
const PORT = process.env.PORT || 3100;

// 中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============ 用户接口 ============

// 创建新用户
app.post('/api/user/create', (req, res) => {
  try {
    const { nickname } = req.body || {};
    
    // 生成唯一的学习码
    let attempts = 0;
    let newUser;
    while (attempts < 10) {
      try {
        const db = getDb();
        const id = generateUserCode();
        const stmt = db.prepare('INSERT INTO users (id, nickname) VALUES (?, ?)');
        stmt.run(id, nickname || null);
        newUser = { id, nickname: nickname || null };
        break;
      } catch (e) {
        attempts++;
        if (attempts >= 10) {
          return res.status(500).json({ success: false, error: '生成学习码失败，请重试' });
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        userId: newUser.id,
        nickname: newUser.nickname
      }
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 验证学习码
app.post('/api/user/verify', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: '请输入学习码' });
    }
    
    const user = userOps.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: '学习码无效' });
    }
    
    userOps.updateLastActive(userId);
    
    res.json({
      success: true,
      data: {
        userId: user.id,
        nickname: user.nickname,
        lastActive: user.last_active
      }
    });
  } catch (error) {
    console.error('验证用户失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 视频接口 ============

// 获取所有视频
app.get('/api/videos', (req, res) => {
  try {
    const { userId } = req.query;
    const videos = videoOps.getAll();
    
    const videosWithProgress = videos.map(v => {
      const words = wordOps.getByVideoId(v.id);
      
      if (userId) {
        const stats = progressOps.getStats(userId, v.id);
        return {
          ...v,
          wordCount: words.length,
          progress: {
            total: stats.total || words.length,
            learned: (stats.known || 0) + (stats.unknown || 0),
            known: stats.known || 0,
            unknown: stats.unknown || 0
          }
        };
      }
      
      return {
        ...v,
        wordCount: words.length
      };
    });
    
    res.json({ success: true, data: videosWithProgress });
  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取视频的单词列表
app.get('/api/videos/:id/words', (req, res) => {
  try {
    const { id: videoId } = req.params;
    const { userId } = req.query;
    
    const video = videoOps.getById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, error: '视频不存在' });
    }
    
    const words = wordOps.getByVideoId(videoId);
    
    let progressMap = {};
    if (userId) {
      progressOps.initForVideo(userId, videoId);
      const progressList = progressOps.getByVideoId(userId, videoId);
      progressMap = Object.fromEntries(progressList.map(p => [p.word_id, p]));
    }
    
    const wordsWithProgress = words.map(w => {
      const p = progressMap[w.id];
      return {
        ...w,
        status: p?.status || 'new',
        flipCount: p?.flip_count || 0,
        lastFlippedAt: p?.last_flipped_at || null
      };
    });
    
    res.json({
      success: true,
      data: {
        video: {
          id: video.id,
          title: video.title,
          description: video.description,
          videoUrl: video.video_url,
          thumbnail: video.thumbnail
        },
        words: wordsWithProgress
      }
    });
  } catch (error) {
    console.error('获取视频单词失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 进度接口 ============

// 更新单词状态
app.post('/api/progress', (req, res) => {
  try {
    const { userId, wordId, status } = req.body;
    
    if (!userId || !wordId || !status) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    if (!['known', 'unknown'].includes(status)) {
      return res.status(400).json({ success: false, error: '状态值无效' });
    }
    
    const word = wordOps.getById(wordId);
    if (!word) {
      return res.status(404).json({ success: false, error: '单词不存在' });
    }
    
    const result = progressOps.upsert(userId, wordId, status);
    
    res.json({
      success: true,
      data: {
        wordId: result.word_id,
        status: result.status,
        flipCount: result.flip_count,
        updatedAt: result.updated_at
      }
    });
  } catch (error) {
    console.error('更新进度失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取错词本 (支持分组和普通列表)
app.get('/api/wrong-words', (req, res) => {
  try {
    const { userId, videoId, grouped } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: '缺少 userId' });
    }
    
    if (grouped === 'true') {
      // 按视频分组返回 (网格展示用)
      const data = progressOps.getWrongWordsGrouped(userId);
      res.json({ success: true, data });
    } else {
      // 简单列表形式
      const wrongWords = progressOps.getWrongWords(userId, videoId || null);
      
      const data = wrongWords.map(w => ({
        id: w.word_id,
        word: w.word,
        phonetic: w.phonetic,
        meaning: w.meaning,
        pos: w.pos,
        startTime: w.start_time,
        endTime: w.end_time,
        videoId: w.video_id,
        videoTitle: w.video_title
      }));
      
      res.json({ success: true, data });
    }
  } catch (error) {
    console.error('获取错词本失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取错词数量 (轻量计数，供顶栏徽标使用)
app.get('/api/wrong-words/count', (req, res) => {
  try {
    const { userId, videoId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: '缺少 userId' });
    }

    const count = progressOps.getWrongCount(userId, videoId || null);
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('获取错词数量失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取学习统计
app.get('/api/stats', (req, res) => {
  try {
    const { userId, videoId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: '缺少 userId' });
    }
    
    const stats = progressOps.getStats(userId, videoId || null);
    res.json({ success: true, data: stats || { total: 0, known: 0, unknown: 0, new_count: 0 } });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 易错单词表接口 ============

// 获取易错单词列表 (支持分组和普通列表)
app.get('/api/troublesome-words', (req, res) => {
  try {
    const { userId, limit = 100, offset = 0, grouped } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: '缺少 userId' });
    }
    
    if (grouped === 'true') {
      // 按视频分组返回 (网格展示用)
      const data = troublesomeOps.getGroupedByVideo(userId);
      res.json({ success: true, data });
    } else {
      // 简单列表形式
      const words = troublesomeOps.getAll(userId, parseInt(limit), parseInt(offset));
      
      const data = words.map(w => ({
        word: w.word,
        phonetic: w.phonetic,
        meaning: w.meaning,
        pos: w.pos,
        wrongCount: w.wrong_count,
        firstWrongAt: w.first_wrong_at
      }));
      
      res.json({ success: true, data });
    }
  } catch (error) {
    console.error('获取易错单词表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取易错单词总数
app.get('/api/troublesome-words/count', (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: '缺少 userId' });
    }
    
    const count = troublesomeOps.getCount(userId);
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('获取易错单词数失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 单词误提取标记 ============

// 所有已标记词 (前端建 Set 比对; 后台清单)
app.get('/api/word-flags', (req, res) => {
  try {
    res.json({ success: true, data: flagOps.getAll() });
  } catch (error) {
    console.error('获取单词标记失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// toggle 标记 (有则删, 无则插)
app.post('/api/word-flags/toggle', (req, res) => {
  try {
    const { wordId, userId } = req.body;
    if (!wordId) return res.status(400).json({ success: false, error: '缺少 wordId' });
    const word = wordOps.getById(wordId);
    if (!word) return res.status(404).json({ success: false, error: '单词不存在' });
    const result = flagOps.toggle(wordId, userId, word.word, word.video_id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('切换单词标记失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 后台: 标记清单
app.get('/api/admin/flags', (req, res) => {
  try {
    res.json({ success: true, data: flagOps.getAll() });
  } catch (error) {
    console.error('获取标记清单失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 后台: 删除误提取词 (手动级联清 progress/troublesome/标记, 不依赖 FK pragma)
app.post('/api/admin/flags/delete-word', (req, res) => {
  try {
    const { wordId } = req.body;
    if (!wordId) return res.status(400).json({ success: false, error: '缺少 wordId' });
    const db = getDb();
    const word = wordOps.getById(wordId);
    db.prepare('DELETE FROM progress WHERE word_id = ?').run(wordId);
    db.prepare('DELETE FROM troublesome_words WHERE word_id = ?').run(wordId);
    db.prepare('DELETE FROM words WHERE id = ?').run(wordId);
    flagOps.remove(wordId);
    res.json({ success: true, data: { wordId, word: word?.word } });
  } catch (error) {
    console.error('删除误提取词失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 后台: 取消标记 (保留词, 仅清 word_flags 行) —— 用于误报/合法词只是大写
app.post('/api/admin/flags/unflag', (req, res) => {
  try {
    const { wordId } = req.body;
    if (!wordId) return res.status(400).json({ success: false, error: '缺少 wordId' });
    flagOps.remove(wordId);
    res.json({ success: true, data: { wordId } });
  } catch (error) {
    console.error('取消标记失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ PET 备考子系统 (独立隔离, 不影响现有) ============

// 两组(已覆盖/未覆盖) + 单元进度
app.get('/api/pet/groups', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: '缺少 userId' });
    res.json({ success: true, data: petOps.getGroups(userId) });
  } catch (error) {
    console.error('获取 PET 分组失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 单元词 (带 per-user 进度)
app.get('/api/pet/units/:unit/words', (req, res) => {
  try {
    const { userId } = req.query;
    const { unit } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: '缺少 userId' });
    res.json({ success: true, data: petOps.getUnitWords(unit, userId) });
  } catch (error) {
    console.error('获取 PET 单元词失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 翻卡 认识/不会 (不会 -> 同时进易错表永久)
app.post('/api/pet/progress', (req, res) => {
  try {
    const { userId, canonicalId, status } = req.body;
    if (!userId || !canonicalId || !status)
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    const result = petOps.upsertProgress(userId, canonicalId, status);
    if (!result) return res.status(400).json({ success: false, error: '参数无效或词不存在' });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('PET 进度更新失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PET 错词本 (动态 = 当前 unknown)
app.get('/api/pet/review', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: '缺少 userId' });
    res.json({ success: true, data: petOps.getReview(userId) });
  } catch (error) {
    console.error('获取 PET 错词本失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PET 易错表 (永久)
app.get('/api/pet/troublesome', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: '缺少 userId' });
    res.json({ success: true, data: petOps.getTroublesome(userId) });
  } catch (error) {
    console.error('获取 PET 易错表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 覆盖词关联视频 (跳转用)
app.get('/api/pet/video-link', (req, res) => {
  try {
    const { canonicalId } = req.query;
    if (!canonicalId) return res.status(400).json({ success: false, error: '缺少 canonicalId' });
    res.json({ success: true, data: petOps.getVideoLink(canonicalId) });
  } catch (error) {
    console.error('获取 PET 关联视频失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PET 角标查询 (小学/初中/高中 卡片用: 判断词是否 PET 词) — 返回 is_pet 词的 canonical_id 集合
app.get('/api/pet/pet-words', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT norm_key FROM word_dict WHERE is_pet=1').all();
    res.json({ success: true, data: rows.map(r => r.norm_key) });
  } catch (error) {
    console.error('获取 PET 词集失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 健康检查 ============

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '英语单词学习平台 API',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

// 启动服务器
console.log('🚀 启动英语单词学习平台 API...');
console.log(`📍 端口: ${PORT}`);

app.listen(PORT, () => {
  console.log(`✅ 服务器已启动: http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  closeDb();
  process.exit(0);
});
