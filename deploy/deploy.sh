#!/bin/bash
# 英语单词学习平台部署脚本

set -e

PROJECT_DIR="/root/.openclaw/workspace/word-learning"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"

echo "🚀 开始部署英语单词学习平台..."

# 1. 停止旧服务
echo "📦 停止旧服务..."
pkill -f "node.*word-learning" 2>/dev/null || true
sleep 1

# 2. 构建前端
echo "🔨 构建前端..."
cd $FRONTEND_DIR
npm run build

# 3. 启动后端
echo "🔧 启动后端 API..."
cd $BACKEND_DIR
nohup node src/index.js > /tmp/word-learning-api.log 2>&1 &
sleep 2

# 4. 检查服务状态
echo "✅ 检查服务状态..."
if curl -s http://localhost:3100/health > /dev/null; then
    echo "   后端 API: ✅ 运行中"
else
    echo "   后端 API: ❌ 启动失败"
    exit 1
fi

echo ""
echo "🎉 部署完成!"
echo ""
echo "📍 访问地址:"
echo "   前端: http://$(hostname -I | awk '{print $1}')/  (需配置 Nginx)"
echo "   后端: http://localhost:3100/"
echo ""
echo "📝 日志文件:"
echo "   /tmp/word-learning-api.log"
