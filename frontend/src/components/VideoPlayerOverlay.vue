<template>
  <div class="video-player-overlay" v-if="visible">
    <div class="video-player-container">
      <!-- 视频播放器 -->
      <div class="video-wrapper">
        <video 
          ref="videoPlayer"
          :src="currentVideo.url"
          controls
          @ended="onVideoEnded"
        ></video>
        <div class="video-info">
          <div class="current-word">
            <span class="word-label">📌 当前单词:</span>
            <span class="word-text">{{ currentWord.word }}</span>
            <span class="phonetic" v-if="currentWord.phonetic">{{ currentWord.phonetic }}</span>
            <span class="meaning">{{ currentWord.meaning }}</span>
          </div>
          <div class="video-source">
            📍 来源: {{ currentVideo.videoTitle }}
          </div>
        </div>
      </div>
      
      <!-- 控制按钮 -->
      <div class="video-controls">
        <button class="ctrl-btn" @click="playPrev" :disabled="!hasPrev">
          ◀ 上一个
        </button>
        <button class="ctrl-btn play-btn" @click="togglePlay">
          {{ isPlaying ? '⏸ 暂停' : '▶ 播放' }}
        </button>
        <button class="ctrl-btn" @click="playNext" :disabled="!hasNext">
          下一个 ▶
        </button>
        <button class="ctrl-btn close-btn" @click="closePlayer">
          ✕ 关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoPlayerOverlay',
  props: {
    visible: Boolean,
    currentVideo: Object,
    currentWord: Object,
    allWords: Array,
    currentIndex: Number,
    isPlaying: Boolean
  },
  computed: {
    hasPrev() {
      return this.currentIndex > 0
    },
    hasNext() {
      return this.currentIndex < this.allWords.length - 1
    }
  },
  methods: {
    togglePlay() {
      const video = this.$refs.videoPlayer
      if (video) {
        if (this.isPlaying) {
        video.pause()
      } else {
        video.play()
      }
      this.$emit('update:playing', !this.isPlaying)
    }
  },
    
    playPrev() {
      if (this.currentIndex > 0) {
        this.$emit('navigate', this.currentIndex - 1)
      }
    },
    
    playNext() {
      if (this.currentIndex < this.allWords.length - 1) {
        this.$emit('navigate', this.currentIndex + 1)
      }
    },
    
    closePlayer() {
      const video = this.$refs.videoPlayer
      if (video) {
        video.pause()
      }
      this.$emit('close')
    },
    
    onVideoEnded() {
      // 播放结束，重置播放状态
      this.$emit('update:playing', false)
    }
  }
}
</script>

<style scoped>
.video-player-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.video-player-container {
  background: #000;
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.video-wrapper {
  position: relative;
  width: 100%;
}

.video-wrapper video {
  width: 100%;
  max-height: 400px;
  background: #000;
  border-radius: 16px 16px 0 0;
}

.video-info {
  padding: 16px;
  background: #1a1a2e;
  color: white;
}

.current-word {
  text-align: center;
  margin-bottom: 12px;
}

.word-label {
  font-size: 12px;
  color: #aaa;
}

.word-text {
  font-size: 28px;
  font-weight: bold;
  color: #fff;
  margin: 8px 0;
}

.phonetic {
  font-size: 16px;
  color: #ccc;
  margin-bottom: 4px;
}

.meaning {
  font-size: 18px;
  color: #fff;
}

.video-source {
  font-size: 14px;
  color: #888;
  text-align: center;
}

.video-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: #1a1a2e;
  border-radius: 0 0 16px 16px;
}

.ctrl-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  cursor: pointer;
  background: #333;
  color: white;
  transition: all 0.2s;
}

.ctrl-btn:hover:not(:disabled) {
  background: #444;
}

.ctrl-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-btn {
  background: #4CAF50;
  min-width: 100px;
}

.play-btn:hover {
  background: #45a049 !important;
}

.close-btn {
  background: #f44336;
}

.close-btn:hover {
  background: #d32f2f !important;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .video-player-container {
    max-width: 100%;
    margin: 0;
    border-radius: 0;
    max-height: 100vh;
  }
  
  .video-wrapper video {
    border-radius: 0;
    max-height: 300px;
  }
  
  .ctrl-btn {
    padding: 10px 16px;
    font-size: 14px;
  }
}
</style>
