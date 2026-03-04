# 🦀 英语单词学习平台

一个为孩子设计的英语单词学习平台，支持视频学习、单词卡片翻转、错词本和复习打怪功能。

## 📍 访问地址

- **学习平台**: http://192.144.228.182:8080/
- **后端 API**: http://192.144.228.182:8080/api/

## 🚀 快速开始

### 1. 创建账号
1. 打开平台首页
2. 点击 **"我是新用户"**
3. 系统会生成一个 **8位数字学习码**
4. **请牢记学习码！** 用于保存学习进度

### 2. 开始学习
1. 选择视频课程
2. 点击卡片翻转查看释义
3. 点击 🔊 按钮播放发音
4. 点击 ▶️ 按钮跳转视频讲解
5. 标记 "认识" 或 "不会"

### 3. 复习错词
1. 点击顶部 "错词本"
2. 复习标记为 "不会" 的单词
3. 认识的单词会从错词本移除

## 🛠️ 服务器管理

### 启动服务
```bash
# 启动后端 API
cd /root/.openclaw/workspace/word-learning/backend
nohup node src/index.js > /tmp/word-learning-api.log 2>&1 &

# 启动 Nginx
/usr/sbin/nginx
```

### 停止服务
```bash
# 停止后端
pkill -f "node.*word-learning"

# 停止 Nginx
/usr/sbin/nginx -s stop
```

### 查看日志
```bash
# 后端日志
tail -f /tmp/word-learning-api.log

# Nginx 日志
tail -f /var/log/nginx/error.log
```

## 📁 目录结构

```
/root/.openclaw/workspace/word-learning/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── index.js           # 入口文件
│   │   ├── db/                # 数据库操作
│   │   └── routes/            # 路由
│   └── data/                  # SQLite 数据库文件
├── frontend/                   # 前端源码
│   └── dist/                  # 构建产物
├── videos/                     # 视频文件
├── data/words/                 # 单词数据 JSON
└── deploy/                     # 部署配置
```

## 📝 添加新视频

### 1. 准备视频文件
```bash
# 将视频复制到 videos 目录
cp your_video.mp4 /root/.openclaw/workspace/word-learning/videos/
```

### 2. 创建单词数据 JSON
```json
{
  "videoId": "video_002",
  "title": "S/T 单词讲解",
  "videoUrl": "/videos/st_words.mp4",
  "description": "S和T开头单词讲解",
  "words": [
    {
      "word": "school",
      "phonetic": "/skuːl/",
      "meaning": "学校",
      "pos": "n.",
      "startTime": 0,
      "endTime": 60
    }
  ]
}
```

### 3. 导入单词数据
```bash
cd /root/.openclaw/workspace/word-learning/backend
node src/scripts/import-words.js ../data/words/video_002.json
```

### 4. 复制视频到 Nginx 目录
```bash
cp /root/.openclaw/workspace/word-learning/videos/*.mp4 /var/www/word-learning/videos/
```

## 🔧 技术栈

- **前端**: Vue 3 + Vite
- **后端**: Express + SQLite
- **发音**: Web Speech API
- **部署**: Nginx

## 📊 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/user/create` | POST | 创建新用户 |
| `/api/user/verify` | POST | 验证学习码 |
| `/api/videos` | GET | 获取视频列表 |
| `/api/videos/:id/words` | GET | 获取视频单词 |
| `/api/progress` | POST | 更新学习状态 |
| `/api/wrong-words` | GET | 获取错词本 |

---

*Made with 🦀 by Claw*
