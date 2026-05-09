<template>
  <div class="learn-page">
    <!-- 视频播放区 -->
    <div class="video-section">
      <video 
        ref="videoPlayer"
        :src="video.videoUrl"
        controls
        @loadedmetadata="onVideoLoad"
      ></video>
    </div>
    
    <!-- 单词卡片区 -->
    <div class="words-section">
      <div class="words-header">
        <h2>{{ video.title }}</h2>
        <div class="stats">
          <span>共 {{ words.length }} 个</span>
          <span>| 已学 {{ learnedCount }}</span>
          <span class="unknown" v-if="unknownCount > 0">| 🔴 {{ unknownCount }}</span>
        </div>
      </div>
      
      <div v-if="loading" class="loading">加载中...</div>
      
      <div v-else class="cards-grid">
        <div 
          v-for="word in words" 
          :key="word.id"
          class="word-card"
          :class="getStatusClass(word)"
          @click="flipCard(word)"
        >
          <div class="word-card-inner">
            <!-- 正面 -->
            <div class="word-card-front">
              <span class="status-badge" v-if="word.status === 'known'">✅</span>
              <span class="status-badge" v-if="word.status === 'unknown'">🔴</span>
              <div class="word-text">{{ word.word }}</div>
              <div class="phonetic">{{ word.phonetic }}</div>
              <div class="card-actions" @click.stop>
                <button class="icon-btn speak" @click="speak(word.word)" title="发音">🔊</button>
                <button class="icon-btn play" @click="playFrom(word.start_time)" title="跳转视频">▶️</button>
              </div>
            </div>
            
            <!-- 背面 -->
            <div class="word-card-back">
              <div class="meaning">
                <span class="pos" v-if="word.pos">{{ word.pos }}</span>
                {{ word.meaning }}
              </div>
              <div class="card-actions" @click.stop>
                <button class="icon-btn speak" @click="speak(word.word)" title="发音">🔊</button>
                <button class="icon-btn play" @click="playFrom(word.start_time)" title="跳转视频">▶️</button>
              </div>
              <div class="status-btns" @click.stop>
                <button class="btn-known" @click="markStatus(word, 'known')">✅ 认识</button>
                <button class="btn-unknown" @click="markStatus(word, 'unknown')">❌ 不会</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Learn',
  data() {
    return {
      video: {},
      words: [],
      loading: true,
      flippedCards: new Set(),
      userId: localStorage.getItem('userId')
    }
  },
  computed: {
    learnedCount() {
      return this.words.filter(w => w.status === 'known' || w.status === 'unknown').length
    },
    unknownCount() {
      return this.words.filter(w => w.status === 'unknown').length
    }
  },
  mounted() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      const videoId = this.$route.params.videoId
      try {
        const res = await fetch(`/api/videos/${videoId}/words?userId=${this.userId}`)
        const data = await res.json()
        if (data.success) {
          this.video = data.data.video
          this.words = data.data.words
          
          // 检查是否有从易错表跳转过来的参数
          const startTime = this.$route.query.startTime
          const targetWord = this.$route.query.word
          
          if (startTime) {
            // 延迟执行，等待视频加载
            this.$nextTick(() => {
              setTimeout(() => {
                this.playFrom(parseInt(startTime))
                this.scrollToVideo()
                
                // 高亮目标单词
                if (targetWord) {
                  this.highlightWord(targetWord)
                }
              }, 500)
            })
          }
        }
      } catch (e) {
        console.error('获取数据失败', e)
      } finally {
        this.loading = false
      }
    },
    
    highlightWord(wordText) {
      // 找到目标单词并翻转卡片
      const word = this.words.find(w => w.word.toLowerCase() === wordText.toLowerCase())
      if (word) {
        word.flipped = true
        // 滚动到该单词
        this.$nextTick(() => {
          const card = document.querySelector(`.word-card:has(.word-text)`)
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        })
      }
    },
    
    flipCard(word) {
      word.flipped = !word.flipped
    },
    
    getStatusClass(word) {
      if (word.flipped) return 'flipped'
      if (word.status === 'known') return 'status-known'
      if (word.status === 'unknown') return 'status-unknown'
      return ''
    },
    
    speak(text) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        utterance.rate = 0.8
        window.speechSynthesis.speak(utterance)
      } else {
        alert('您的浏览器不支持发音功能')
      }
    },
    
    playFrom(time) {
      const video = this.$refs.videoPlayer
      if (video && time !== undefined && time !== null) {
        video.currentTime = time
        video.play()
      }
    },
    
    // 滚动到视频区域
    scrollToVideo() {
      const videoSection = document.querySelector('.video-section')
      if (videoSection) {
        videoSection.scrollIntoView({ behavior: 'smooth' })
      }
    },
    
    async markStatus(word, status) {
      try {
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: this.userId,
            wordId: word.id,
            status: status
          })
        })
        const data = await res.json()
        if (data.success) {
          word.status = status
          word.flipped = false
          // 通知父组件更新错词数量
          this.$emit('updateWrongCount', this.unknownCount)
        }
      } catch (e) {
        console.error('更新状态失败', e)
      }
    },
    
    onVideoLoad() {
      console.log('视频加载完成')
    }
  }
}
</script>

<style scoped>
.learn-page {
  min-height: 100vh;
}

.video-section {
  background: #000;
}

.video-section video {
  width: 100%;
  max-height: 400px;
}

.words-section {
  padding: 24px;
}

.words-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #E0E0E0;
}

.words-header h2 {
  font-size: 20px;
}

.words-header .stats {
  font-size: 14px;
  color: #666;
}

.words-header .stats .unknown {
  color: #F44336;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}
</style>
