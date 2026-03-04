#!/bin/bash
# 英语单词学习平台 - 停止脚本

echo "🛑 停止英语单词学习平台..."

# 1. 停止后端 (PM2)
echo "📦 停止后端 API..."
pm2 stop word-learning-api 2>/dev/null || true

# 2. 停止 Nginx
echo "🌐 停止 Nginx..."
/usr/sbin/nginx -s stop 2>/dev/null || true

echo ""
echo "✅ 服务已停止"
