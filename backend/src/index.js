import express from 'express';
import cors from 'cors';
import { getDb, closeDb, userOps, videoOps, wordOps, progressOps, generateUserCode, generateId } from './db/index.js';

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

// 获取错词本
app.get('/api/wrong-words', (req, res) => {
  try {
    const { userId, videoId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: '缺少 userId' });
    }
    
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
  } catch (error) {
    console.error('获取错词本失败:', error);
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
