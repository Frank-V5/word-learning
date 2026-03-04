#!/usr/bin/env node
/**
 * 单词数据导入脚本
 * 
 * 用法: node src/scripts/import-words.js <json-file>
 * 
 * JSON 格式:
 * {
 *   "videoId": "video_001",
 *   "title": "P/R 单词讲解",
 *   "videoUrl": "/videos/pr_words.mp4",
 *   "description": "P和R开头单词讲解",
 *   "words": [
 *     {
 *       "word": "purse",
 *       "phonetic": "/pɜːrs/",
 *       "meaning": "钱包；皮包",
 *       "pos": "n.",
 *       "startTime": 0,
 *       "endTime": 52
 *     }
 *   ]
 * }
 */

import { readFileSync } from 'fs';
import { videoOps, wordOps, getDb } from '../db/index.js';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('用法: node src/scripts/import-words.js <json-file>');
  console.log('');
  console.log('JSON 文件格式:');
  console.log(JSON.stringify({
    videoId: "video_001",
    title: "P/R 单词讲解",
    videoUrl: "/videos/pr_words.mp4",
    description: "P和R开头单词讲解",
    words: [
      {
        word: "purse",
        phonetic: "/pɜːrs/",
        meaning: "钱包；皮包",
        pos: "n.",
        startTime: 0,
        endTime: 52
      }
    ]
  }, null, 2));
  process.exit(1);
}

const filePath = args[0];

try {
  // 读取 JSON 文件
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  console.log('📦 导入数据:', data.title || data.videoId);
  
  // 创建或更新视频
  let video;
  if (data.videoId) {
    video = videoOps.getById(data.videoId);
    if (!video) {
      video = videoOps.create({
        id: data.videoId,
        title: data.title,
        description: data.description,
        video_url: data.videoUrl,
        thumbnail: data.thumbnail
      });
      console.log('✅ 创建视频:', video.id);
    } else {
      console.log('ℹ️  视频已存在:', video.id);
    }
  } else {
    video = videoOps.create({
      title: data.title,
      description: data.description,
      video_url: data.videoUrl,
      thumbnail: data.thumbnail
    });
    console.log('✅ 创建视频:', video.id);
  }
  
  // 导入单词
  if (data.words && data.words.length > 0) {
    const words = data.words.map((w, index) => ({
      ...w,
      video_id: video.id,
      start_time: w.startTime || w.start_time || 0,
      end_time: w.endTime || w.end_time || 0,
      sort_order: index + 1
    }));
    
    wordOps.batchCreate(words);
    videoOps.updateWordCount(video.id);
    
    console.log(`✅ 导入 ${words.length} 个单词`);
  }
  
  console.log('');
  console.log('🎉 导入完成!');
  console.log('   视频ID:', video.id);
  console.log('   单词数:', data.words?.length || 0);
  
} catch (error) {
  console.error('❌ 导入失败:', error.message);
  process.exit(1);
}
