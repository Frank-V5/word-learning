<template>
  <div class="review-page">
    <!-- 有错词时显示复习模式 -->
    <template v-if="wrongWords.length > 0">
      <div class="review-header">
        <h2>🎯 复习模式 - 消灭错词！</h2>
        <div class="review-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <div class="text">剩余：{{ remainingCount }} / {{ totalCount }} 个单词</div>
        </div>
      </div>
      
      <div class="review-card-container">
        <div 
          v-if="currentWord"
          class="review-card"
          :class="{ flipped: currentWord.flipped }"
          @click="flipCurrent"
        >
          <div class="word-card-inner">
            <!-- 正面 -->
            <div class="word-card-front">
              <div class="word-text">{{ currentWord.word }}</div>
              <div class="phonetic">{{ currentWord.phonetic }}</div>
              <div class="hint">点击翻转查看释义</div>
              <div class="card-actions" @click.stop>
                <button class="icon-btn speak" @click="speak(currentWord.word)">🔊</button>
                <button class="icon-btn play" @click="playVideo(currentWord)" v-if="currentWord.videoId">▶️</button>
              </div>
            </div>
            
            <!-- 背面 -->
            <div class="word-card-back">
              <div class="meaning">
                <span class="pos" v-if="currentWord.pos">{{ currentWord.pos }}</span>
                {{ currentWord.meaning }}
              </div>
              <div class="card-actions" @click.stop>
                <button class="icon-btn speak" @click="speak(currentWord.word)">🔊</button>
                <button class="icon-btn play" @click="playVideo(currentWord)" v-if="currentWord.videoId">▶️</button>
              </div>
              <div class="status-btns" @click.stop>
                <button class="btn-known" @click="markKnown(currentWord)">✅ 认识，消灭它！</button>
                <button class="btn-unknown" @click="nextWord()">❓ 还是不会</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <!-- 无错词时显示空状态 -->
    <div v-else class="empty-state">
      <div class="emoji">🎉</div>
      <h3>太棒了！</h3>
      <p>没有需要复习的单词</p>
      <button class="btn btn-primary" @click="goToVideos" style="margin-top: 20px;">
        去学习新单词
      </button>
    </div>
    
    <!-- 视频弹窗 -->
    <div class="video-modal" v-if="showVideoModal" @click="showVideoModal = false">
      <div class="video-content" @click.stop>
        <video 
          ref="reviewVideo"
          :src="currentVideoUrl"
          controls
          autoplay
        ></video>
        <button class="close-btn" @click="showVideoModal = false">✕</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Review',
  data() {
    return {
      wrongWords: [],
      currentIndex: 0,
      loading: true,
      showVideoModal: false,
      currentVideoUrl: '',
      userId: localStorage.getItem('userId')
    }
  },
  computed: {
    currentWord() {
      return this.wrongWords[this.currentIndex] || null
    },
    totalCount() {
      return this.wrongWords.length
    },
    remainingCount() {
      return this.totalCount - this.currentIndex
    },
    progressPercent() {
      if (this.totalCount === 0) return 100
      return Math.round(((this.totalCount - this.remainingCount) / this.totalCount) * 100)
    }
  },
  mounted() {
    this.fetchWrongWords()
  },
  methods: {
    async fetchWrongWords() {
      try {
        const res = await fetch(`/api/wrong-words?userId=${this.userId}`)
        const data = await res.json()
        if (data.success) {
          this.wrongWords = data.data.map(w => ({ ...w, flipped: false }))
          this.currentIndex = 0
        }
      } catch (e) {
        console.error('获取错词失败', e)
      } finally {
        this.loading = false
      }
    },
    
    flipCurrent() {
      if (this.currentWord) {
        this.currentWord.flipped = !this.currentWord.flipped
      }
    },
    
    speak(text) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        utterance.rate = 0.8
        window.speechSynthesis.speak(utterance)
      }
    },
    
    playVideo(word) {
      // 跳转到学习页面播放视频
      if (word.videoId) {
        this.$router.push({ 
          name: 'Learn', 
          params: { videoId: word.videoId },
          query: { time: word.startTime }
        })
      }
    },
    
    async markKnown(word) {
      try {
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: this.userId,
            wordId: word.id,
            status: 'known'
          })
        })
        const data = await res.json()
        if (data.success) {
          // 从列表中移除
          this.wrongWords.splice(this.currentIndex, 1)
          // 通知父组件更新数量
          this.$emit('updateWrongCount', this.wrongWords.length)
          // 如果当前索引超出范围，重置
          if (this.currentIndex >= this.wrongWords.length) {
            this.currentIndex = 0
          }
        }
      } catch (e) {
        console.error('更新状态失败', e)
      }
    },
    
    nextWord() {
      if (this.currentIndex < this.wrongWords.length - 1) {
        this.currentIndex++
        this.wrongWords[this.currentIndex].flipped = false
      } else {
        // 循环回到第一个
        this.currentIndex = 0
        if (this.wrongWords.length > 0) {
          this.wrongWords[0].flipped = false
        }
      }
    },
    
    goToVideos() {
      this.$router.push({ name: 'Videos' })
    }
  }
}
</script>

<style scoped>
.review-page {
  padding: 24px;
  min-height: calc(100vh - 70px);
}

.review-header {
  text-align: center;
  margin-bottom: 32px;
}

.review-header h2 {
  font-size: 24px;
  margin-bottom: 16px;
}

.review-progress {
  max-width: 400px;
  margin: 0 auto;
}

.review-progress .progress-bar {
  height: 12px;
  background: #E0E0E0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.review-progress .progress-fill {
  height: 100%;
  background: #4CAF50;
  border-radius: 6px;
  transition: width 0.3s;
}

.review-progress .text {
  font-size: 14px;
  color: #666;
}

.review-card-container {
  display: flex;
  justify-content: center;
  padding: 24px;
}

.review-card {
  perspective: 1000px;
  width: 100%;
  max-width: 400px;
  height: 320px;
  cursor: pointer;
}

.review-card .word-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.review-card.flipped .word-card-inner {
  transform: rotateY(180deg);
}

.review-card .word-card-front,
.review-card .word-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.review-card .word-card-front {
  background: white;
  border: 2px solid #F44336;
}

.review-card .word-card-back {
  background: white;
  border: 2px solid #2196F3;
  transform: rotateY(180deg);
}

.review-card .word-text {
  font-size: 48px;
  font-weight: bold;
  letter-spacing: 6px;
  margin-bottom: 12px;
}

.review-card .phonetic {
  font-size: 20px;
  color: #666;
  margin-bottom: 20px;
}

.review-card .hint {
  font-size: 14px;
  color: #999;
}

.review-card .meaning {
  font-size: 24px;
  text-align: center;
  margin-bottom: 24px;
}

.review-card .meaning .pos {
  color: #4CAF50;
  margin-right: 8px;
}

.review-card .card-actions {
  display: flex;
  gap: 16px;
  margin-top: 16px;
}

.review-card .icon-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid #E0E0E0;
  background: white;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.2s;
}

.review-card .icon-btn:hover {
  background: #F5F5F5;
  transform: scale(1.1);
}

.review-card .status-btns {
  display: flex;
  gap: 16px;
  margin-top: 16px;
}

.review-card .status-btns button {
  padding: 12px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.2s;
}

.review-card .btn-known {
  background: #4CAF50;
  color: white;
}

.review-card .btn-known:hover {
  background: #43A047;
}

.review-card .btn-unknown {
  background: #FF9800;
  color: white;
}

.review-card .btn-unknown:hover {
  background: #F57C00;
}

.empty-state {
  text-align: center;
  padding: 64px 24px;
}

.empty-state .emoji {
  font-size: 80px;
  margin-bottom: 24px;
}

.empty-state h3 {
  font-size: 24px;
  margin-bottom: 8px;
}

.empty-state p {
  color: #666;
}

.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.video-content {
  position: relative;
  max-width: 800px;
  width: 90%;
}

.video-content video {
  width: 100%;
  border-radius: 8px;
}

.video-content .close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
}
</style>
