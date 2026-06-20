<template>
  <div class="review-page">
    <div class="header">
      <h2>🎯 错词本 <span class="total-count" v-if="!loading && totalCount > 0">(共 {{ totalCount }} 个)</span></h2>
      <p class="subtitle">当前需要复习的单词 (点击🎬可在页面内观看视频)</p>
    </div>
    
    <div v-if="loading" class="loading">加载中...</div>
    
    <div v-else-if="groupedWords.length === 0" class="empty-state">
      <div class="emoji">🎉</div>
      <h3>太棒了！</h3>
      <p>没有需要复习的单词</p>
      <button class="btn btn-primary" @click="goToVideos">去学习新单词</button>
    </div>
    
    <div v-else>
      <!-- 按视频分组展示 -->
      <div v-for="group in groupedWords" :key="group.videoId" class="video-section">
        <div class="video-header" @click="toggleVideo(group.videoId)">
          <span class="arrow" :class="{ expanded: expandedVideos.includes(group.videoId) }">▶</span>
          <span class="video-title">{{ group.videoTitle }}</span>
          <span class="word-count">{{ group.words.length }} 个单词</span>
        </div>
        
        <div v-show="expandedVideos.includes(group.videoId)" class="word-grid">
          <div 
            v-for="word in group.words" 
            :key="word.id"
            class="word-card"
            :class="{ flipped: flippedCards.includes(word.id), playing: isWordPlaying(word) }"
            @click="toggleCard(word)"
          >
            <div class="card-front">
              <button class="flag-btn" :class="{ active: flaggedIds.has(word.id) }" @click.stop="toggleFlag(word)" :title="flaggedIds.has(word.id) ? '取消标记' : '标记为误提取词'">🚩</button>
              <div class="word-text">{{ word.word }}</div>
              <div class="phonetic" v-if="word.phonetic">{{ word.phonetic }}</div>
              <div class="card-actions-front">
                <button class="btn-speak-small" @click.stop="speak(word.word)" title="发音">🔊</button>
                <button class="btn-video-small" @click.stop="openVideoPlayer(group, word)" title="观看视频">🎬</button>
              </div>
            </div>
            <div class="card-back">
              <div class="meaning">
                <span class="pos" v-if="word.pos">{{ word.pos }}</span>
                {{ word.meaning }}
              </div>
              <div class="card-actions">
                <button class="btn-speak" @click.stop="speak(word.word)" title="发音">🔊</button>
                <button class="btn-video" @click.stop="openVideoPlayer(group, word)" title="观看视频">🎬</button>
              </div>
              <div class="status-btns">
                <button class="btn-known" @click.stop="markKnown(word)">✅ 认识</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <button class="btn btn-back" @click="goBack">← 返回</button>
    
    <!-- 视频播放器弹窗 -->
    <VideoPlayerOverlay
      v-if="player.visible"
      :visible="player.visible"
      :currentVideo="player.currentVideo"
      :currentWord="player.currentWord"
      :allWords="player.allWords"
      :currentIndex="player.currentIndex"
      :isPlaying="player.isPlaying"
      @update:playing="player.isPlaying = $event"
      @close="closePlayer"
      @navigate="navigateToWord"
    />
  </div>
</template>

<script>
import VideoPlayerOverlay from '../components/VideoPlayerOverlay.vue'
import { speak as speakWord } from '../utils/audio'
import { fetchFlaggedSet, toggleFlag as toggleFlagApi } from '../utils/flags'

export default {
  name: 'Review',
  components: {
    VideoPlayerOverlay
  },
  data() {
    return {
      groupedWords: [],
      loading: true,
      expandedVideos: [],
      flippedCards: [],
      flaggedIds: new Set(),
      totalCount: 0,
      userId: localStorage.getItem('userId'),
      // 视频播放器状态
      player: {
        visible: false,
        currentVideo: { url: '', videoTitle: '' },
        currentWord: {},
        allWords: [],
        currentIndex: 0,
        isPlaying: false
      }
    }
  },
  mounted() {
    this.fetchWrongWords()
    this.loadFlags()
  },
  methods: {
    async fetchWrongWords() {
      try {
        const res = await fetch(`/api/wrong-words?userId=${this.userId}&grouped=true`)
        const data = await res.json()
        
        if (data.success) {
          this.groupedWords = data.data
          this.expandedVideos = data.data.map(g => g.videoId)
          this.totalCount = data.data.reduce((sum, g) => sum + g.words.length, 0)
        }
      } catch (e) {
        console.error('获取错词失败', e)
      } finally {
        this.loading = false
      }
    },
    
    toggleVideo(videoId) {
      const index = this.expandedVideos.indexOf(videoId)
      if (index > -1) {
        this.expandedVideos.splice(index, 1)
      } else {
        this.expandedVideos.push(videoId)
      }
    },
    
    toggleCard(word) {
      const index = this.flippedCards.indexOf(word.id)
      if (index > -1) {
        this.flippedCards.splice(index, 1)
      } else {
        this.flippedCards.push(word.id)
      }
    },
    
    speak(text) {
      speakWord(text)
    },

    async loadFlags() {
      this.flaggedIds = await fetchFlaggedSet()
    },

    async toggleFlag(word) {
      const flagged = await toggleFlagApi(word.id, this.userId)
      if (flagged === null) return
      const next = new Set(this.flaggedIds)
      flagged ? next.add(word.id) : next.delete(word.id)
      this.flaggedIds = next
    },
    
    // 打开视频播放器
    openVideoPlayer(group, word) {
      // 构建扁平化的单词列表
      this.player.allWords = []
      for (const g of this.groupedWords) {
        for (const w of g.words) {
          this.player.allWords.push({
            ...w,
            videoId: g.videoId,
            videoTitle: g.videoTitle,
            videoUrl: g.videoUrl
          })
        }
      }
      
      // 找到当前单词的索引
      this.player.currentIndex = this.player.allWords.findIndex(
        w => w.id === word.id
      )
      
      // 设置当前视频和单词
      this.player.currentVideo = {
        url: group.videoUrl,
        videoTitle: group.videoTitle
      }
      this.player.currentWord = word
      this.player.visible = true
      this.player.isPlaying = true
      
      // 等待 DOM 更新后设置视频时间
      this.$nextTick(() => {
        this.setVideoTime(word.startTime)
      })
    },
    
    // 设置视频播放时间
    setVideoTime(startTime) {
      const video = document.querySelector('.video-player-container video')
      if (video) {
        video.currentTime = startTime || 0
        video.play()
      }
    },
    
    // 导航到指定单词
    navigateToWord(index) {
      const word = this.player.allWords[index]
      if (word) {
        this.player.currentIndex = index
        this.player.currentWord = word
        this.player.currentVideo = {
          url: word.videoUrl,
          videoTitle: word.videoTitle
        }
        this.player.isPlaying = true
        
        this.$nextTick(() => {
          this.setVideoTime(word.startTime)
        })
      }
    },
    
    // 关闭播放器
    closePlayer() {
      this.player.visible = false
      this.player.isPlaying = false
    },
    
    // 判断单词是否正在播放
    isWordPlaying(word) {
      return this.player.visible && 
             this.player.currentWord && 
             this.player.currentWord.id === word.id
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
          for (const group of this.groupedWords) {
            const index = group.words.findIndex(w => w.id === word.id)
            if (index > -1) {
              group.words.splice(index, 1)
              break
            }
          }
          this.groupedWords = this.groupedWords.filter(g => g.words.length > 0)
          this.totalCount = this.groupedWords.reduce((sum, g) => sum + g.words.length, 0)
          this.$emit('updateWrongCount', this.totalCount)
        }
      } catch (e) {
        console.error('更新状态失败', e)
      }
    },
    
    goBack() {
      this.$router.push({ name: 'Videos' })
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

.header {
  text-align: center;
  margin-bottom: 24px;
}

.header h2 {
  font-size: 24px;
  margin-bottom: 8px;
}

.total-count {
  font-size: 16px;
  color: #C62828;
  font-weight: normal;
}

.subtitle {
  color: #666;
  font-size: 14px;
}

.video-section {
  margin-bottom: 16px;
}

.video-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.video-header:hover {
  background: #f5f5f5;
}

.video-header .arrow {
  font-size: 12px;
  color: #666;
  transition: transform 0.3s;
}

.video-header .arrow.expanded {
  transform: rotate(90deg);
}

.video-header .video-title {
  font-weight: bold;
  font-size: 16px;
  flex: 1;
}

.video-header .word-count {
  color: #999;
  font-size: 14px;
}

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.word-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  padding-bottom: 70px; /* 为底部按钮留出空间 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s;
  min-height: 160px;
  border: 2px solid #F44336;
  position: relative;
}

.word-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.word-card.flipped {
  border-color: #4CAF50;
}

.word-card.playing {
  border-color: #FF9800;
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.5);
}

.card-front {
  text-align: center;
  position: relative;
}

.word-card.flipped .card-front {
  display: none;
}

.word-text {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}

.phonetic {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
}

.card-actions-front {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

.btn-speak-small, .btn-video-small {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 16px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-speak-small:hover {
  background: #E8F5E9;
  border-color: #4CAF50;
}

.btn-video-small:hover {
  background: #FFF3E0;
  border-color: #FF9800;
}

.card-back {
  text-align: center;
}

.word-card:not(.flipped) .card-back {
  display: none;
}

.meaning {
  font-size: 15px;
  margin-bottom: 8px;
  line-height: 1.4;
  max-height: 70px;
  overflow-y: auto;
  word-break: break-word;
}

.meaning .pos {
  color: #4CAF50;
  margin-right: 8px;
}

.card-actions {
  position: absolute;
  bottom: 45px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 12px;
}

.btn-speak, .btn-video {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 16px;
}

.btn-speak:hover {
  background: #E8F5E9;
  border-color: #4CAF50;
}

.btn-video:hover {
  background: #FFF3E0;
  border-color: #FF9800;
}

.status-btns {
  position: absolute;
  bottom: 10px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
}

.btn-known {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
}

.btn-known:hover {
  background: #43A047;
}

.loading, .empty-state {
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
  margin-bottom: 16px;
}

.btn-back {
  position: fixed;
  bottom: 24px;
  left: 24px;
  padding: 12px 24px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.btn-back:hover {
  background: #43A047;
}
</style>
