import { Hono } from 'hono';
import { progressOps, wordOps, videoOps } from '../db/index.js';

const progress = new Hono();

// 获取视频的学习进度
progress.get('/video/:videoId', async (c) => {
  try {
    const videoId = c.req.param('videoId');
    const userId = c.req.query('userId');
    
    if (!userId) {
      return c.json({ success: false, error: '缺少 userId' }, 400);
    }
    
    const stats = progressOps.getStats(userId, videoId);
    
    return c.json({
      success: true,
      data: stats || { total: 0, known: 0, unknown: 0, new_count: 0 }
    });
  } catch (error) {
    console.error('获取进度失败:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 更新单词状态
progress.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, wordId, status } = body;
    
    if (!userId || !wordId || !status) {
      return c.json({ success: false, error: '缺少必要参数' }, 400);
    }
    
    if (!['known', 'unknown'].includes(status)) {
      return c.json({ success: false, error: '状态值无效' }, 400);
    }
    
    // 验证单词存在
    const word = wordOps.getById(wordId);
    if (!word) {
      return c.json({ success: false, error: '单词不存在' }, 404);
    }
    
    const result = progressOps.upsert(userId, wordId, status);
    
    return c.json({
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
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 获取错词本
progress.get('/wrong-words', async (c) => {
  try {
    const userId = c.req.query('userId');
    const videoId = c.req.query('videoId') || null;
    
    if (!userId) {
      return c.json({ success: false, error: '缺少 userId' }, 400);
    }
    
    const wrongWords = progressOps.getWrongWords(userId, videoId);
    
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
    
    return c.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('获取错词本失败:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 获取学习统计
progress.get('/stats', async (c) => {
  try {
    const userId = c.req.query('userId');
    const videoId = c.req.query('videoId') || null;
    
    if (!userId) {
      return c.json({ success: false, error: '缺少 userId' }, 400);
    }
    
    const stats = progressOps.getStats(userId, videoId);
    
    return c.json({
      success: true,
      data: stats || { total: 0, known: 0, unknown: 0, new_count: 0 }
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default progress;
