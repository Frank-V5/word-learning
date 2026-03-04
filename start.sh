#!/bin/bash
# 英语单词学习平台 - 启动脚本

PROJECT_DIR="/root/.openclaw/workspace/word-learning"
WWW_DIR="/var/www/word-learning"

echo "🚀 启动英语单词学习平台..."

# 1. 启动后端 API (使用 PM2)
echo "📦 启动后端 API..."
cd $PROJECT_DIR/backend
pm2 start src/index.js --name word-learning-api 2>/dev/null || pm2 restart word-learning-api
sleep 2

# 2. 同步前端文件到 Nginx 目录
echo "📋 同步前端文件..."
rsync -av --delete $PROJECT_DIR/frontend/dist/ $WWW_DIR/ 2>/dev/null
mkdir -p $WWW_DIR/videos
rsync -av $PROJECT_DIR/videos/*.mp4 $WWW_DIR/videos/ 2>/dev/null || true
chmod -R 755 $WWW_DIR

# 3. 启动 Nginx
echo "🌐 启动 Nginx..."
/usr/sbin/nginx 2>/dev/null || /usr/sbin/nginx -s reload 2>/dev/null

# 4. 检查服务状态
echo ""
echo "✅ 服务状态:"
pm2 list

# 获取外网 IP
IP=$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo ""
echo "🎉 启动完成!"
echo ""
echo "📍 访问地址: http://$IP:8080/"
echo "📝 查看日志: pm2 logs word-learning-api"
