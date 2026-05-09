<template>
  <div class="troublesome-page">
    <div class="header">
      <h2>📝 易错单词表 <span class="total-count" v-if="!loading && totalCount > 0">(共 {{ totalCount }} 个)</span></h2>
      <p class="subtitle">曾经出错的单词记录 (点击🎬可在页面内观看视频)</p>
    </div>
    
    <div v-if="loading" class="loading">加载中...</div>
    
    <div v-else-if="groupedWords.length === 0" class="empty">
      <div class="emoji">🎉</div>
      <h3>太棒了！</h3>
      <p>暂无易错单词记录</p>
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
            v-for="(word, index) in group.words" 
            :key="index"
            class="word-card"
            :class="{ flipped: flippedCards.includes(word.word), playing: isWordPlaying(word) }"
            @click="toggleCard(word)"
          >
            <div class="card-front">
              <div class="word-text">{{ word.word }}</div>
              <div class="phonetic" v-if="word.phonetic">{{ word.phonetic }}</div>
              <div class="card-actions-front">
                <button class="btn-speak-small" @click.stop="speak(word.word)" title="发音">🔊</button>
                <button class="btn-video-small" @click.stop="openVideoPlayer(group, word)" title="观看视频">🎬</button>
              </div>
              <div class="wrong-badge" v-if="word.wrongCount > 1">x{{ word.wrongCount }}</div>
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
              <div class="card-actions-bottom">
                <button class="btn-unknown" @click.stop="markAsForgot(word)" title="不会，加入错词本">❌ 不会</button>
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
      @close="closePlayer"
      @navigate="navigateToWord"
    />
  </div>
</template>

<script>
import VideoPlayerOverlay from '../components/VideoPlayerOverlay.vue'

export default {
  name: 'Troublesome',
  components: {
    VideoPlayerOverlay
  },
  data() {
    return {
      groupedWords: [],
      loading: true,
      expandedVideos: [],
      flippedCards: [],
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
    this.fetchWords()
  },
  methods: {
    async fetchWords() {
      try {
        const res = await fetch(`/api/troublesome-words?userId=${this.userId}&grouped=true`)
        const data = await res.json()
        
        if (data.success) {
          this.groupedWords = data.data
          this.expandedVideos = data.data.map(g => g.videoId)
        }
        
        const countRes = await fetch(`/api/troublesome-words/count?userId=${this.userId}`)
        const countData = await countRes.json()
        if (countData.success) {
          this.totalCount = countData.data.count
        }
      } catch (e) {
        console.error('获取易错单词失败', e)
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
      const index = this.flippedCards.indexOf(word.word)
      if (index > -1) {
        this.flippedCards.splice(index, 1)
      } else {
        this.flippedCards.push(word.word)
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
        w => w.word === word.word && w.videoId === group.videoId
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
             this.player.currentWord.word === word.word
    },
    
    goBack() {
      this.$router.push({ name: 'Videos' })
    },
    
    // 标记为"不会"，加入错词本
    async markAsForgot(word) {
      try {
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: this.userId,
            wordId: word.wordId,
            status: 'unknown'
          })
        })
        const data = await res.json()
        if (data.success) {
          // 显示提示
          alert(`"${word.word}" 已加入错词本`)
          // 通知父组件更新错词本数量
          this.$emit('updateWrongCount')
        }
      } catch (e) {
        console.error('标记失败:', e)
      }
    }
  }
}
</script>

<style scoped>
.troublesome-page {
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
  color: #E65100;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s;
  min-width: 180px;
  min-height: 120px;
  position: relative;
  border: 2px solid #FF9800;
}

.word-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.word-card.flipped {
  background: #FFF8E1;
  border-color: #4CAF50;
}

.word-card.playing {
  border-color: #2196F3;
  box-shadow: 0 0 20px rgba(33, 150, 243, 0.5);
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

.wrong-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #F44336;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
}

.card-back {
  display: none;
  text-align: center;
  width: 100%;
}

.word-card.flipped .card-back {
  display: block;
}

.word-card:not(.flipped) .card-back {
  display: none;
}

.meaning {
  font-size: 14px;
  line-height: 1.3;
  max-height: 40px;
  overflow-y: auto;
  word-break: break-word;
  margin-bottom: 8px;
}

.meaning .pos {
  color: #4CAF50;
  margin-right: 8px;
}

.card-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.btn-speak, .btn-video {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 16px;
  cursor: pointer;
  font-size: 14px;
}

.card-actions-bottom {
  display: flex;
  justify-content: center;
}

.btn-unknown {
  padding: 6px 20px;
  background: #F44336;
  color: white;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-size: 13px;
}

.btn-unknown:hover {
  background: #d32f2f;
}

.btn-speak:hover {
  background: #E8F5E9;
  border-color: #4CAF50;
}

.btn-video:hover {
  background: #FFF3E0;
  border-color: #FF9800;
}

.loading, .empty {
  text-align: center;
  padding: 64px 24px;
}

.empty .emoji {
  font-size: 80px;
  margin-bottom: 24px;
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
