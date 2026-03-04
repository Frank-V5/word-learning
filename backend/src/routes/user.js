import { Hono } from 'hono';
import { userOps } from '../db/index.js';

const user = new Hono();

// 创建新用户
user.post('/create', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const nickname = body.nickname || null;
    
    // 生成唯一的学习码
    let attempts = 0;
    let newUser;
    while (attempts < 10) {
      try {
        newUser = userOps.create(nickname);
        break;
      } catch (e) {
        // 学习码重复，重试
        attempts++;
        if (attempts >= 10) {
          return c.json({ success: false, error: '生成学习码失败，请重试' }, 500);
        }
      }
    }
    
    return c.json({
      success: true,
      data: {
        userId: newUser.id,
        nickname: newUser.nickname,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 验证学习码
user.post('/verify', async (c) => {
  try {
    const body = await c.req.json();
    const userId = body.userId;
    
    if (!userId) {
      return c.json({ success: false, error: '请输入学习码' }, 400);
    }
    
    const user = userOps.getById(userId);
    
    if (!user) {
      return c.json({ success: false, error: '学习码无效' }, 404);
    }
    
    // 更新最后活跃时间
    userOps.updateLastActive(userId);
    
    return c.json({
      success: true,
      data: {
        userId: user.id,
        nickname: user.nickname,
        lastActive: user.last_active
      }
    });
  } catch (error) {
    console.error('验证用户失败:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 获取用户信息
user.get('/info', async (c) => {
  try {
    const userId = c.req.query('userId');
    
    if (!userId) {
      return c.json({ success: false, error: '缺少 userId' }, 400);
    }
    
    const user = userOps.getById(userId);
    
    if (!user) {
      return c.json({ success: false, error: '用户不存在' }, 404);
    }
    
    return c.json({
      success: true,
      data: {
        userId: user.id,
        nickname: user.nickname,
        createdAt: user.created_at,
        lastActive: user.last_active
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default user;
