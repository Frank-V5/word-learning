import { Hono } from 'hono';
import { videoOps, wordOps, progressOps } from '../db/index.js';

const video = new Hono();

// 获取所有视频列表
video.get('/', async (c) => {
  try {
    const userId = c.req.query('userId');
    const videos = videoOps.getAll();
    
    // 如果有 userId，添加进度信息
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
    
    return c.json({
      success: true,
      data: videosWithProgress
    });
  } catch (error) {
    console.error('获取视频列表失败:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 获取单个视频详情
video.get('/:id', async (c) => {
  try {
    const videoId = c.req.param('id');
    const video = videoOps.getById(videoId);
    
    if (!video) {
      return c.json({ success: false, error: '视频不存在' }, 404);
    }
    
    return c.json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('获取视频详情失败:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 获取视频的单词列表（带进度）
video.get('/:id/words', async (c) => {
  try {
    const videoId = c.req.param('id');
    const userId = c.req.query('userId');
    
    const video = videoOps.getById(videoId);
    if (!video) {
      return c.json({ success: false, error: '视频不存在' }, 404);
    }
    
    const words = wordOps.getByVideoId(videoId);
    
    // 获取用户进度
    let progressMap = {};
    if (userId) {
      // 初始化进度记录
      progressOps.initForVideo(userId, videoId);
      
      const progressList = progressOps.getByVideoId(userId, videoId);
      progressMap = Object.fromEntries(progressList.map(p => [p.word_id, p]));
    }
    
    // 合并单词和进度
    const wordsWithProgress = words.map(w => {
      const p = progressMap[w.id];
      return {
        ...w,
        status: p?.status || 'new',
        flipCount: p?.flip_count || 0,
        lastFlippedAt: p?.last_flipped_at || null
      };
    });
    
    return c.json({
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
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default video;
