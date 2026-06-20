<template>
  <div class="videos-page">
    <h2>选择要学习的视频</h2>
    
    <!-- 分类标签 -->
    <div class="category-tabs">
      <button 
        :class="{ active: category === 'junior' }" 
        @click="switchCategory('junior')"
      >
        初中
      </button>
      <button
        :class="{ active: category === 'senior' }"
        @click="switchCategory('senior')"
      >
        高中
      </button>
      <button
        :class="{ active: category === 'primary' }"
        @click="switchCategory('primary')"
      >
        小学
      </button>
      <button
        class="pet-tab"
        @click="goToPet"
      >
        🎯 PET 备考
      </button>
    </div>
    
    <!-- 分类统计 -->
    <div class="category-stats">
      <span>📊 总单词: {{ categoryStats.total }}</span>
      <span>✅ 已学: {{ categoryStats.learned }}</span>
      <span>🔴 不会: {{ categoryStats.unknown }}</span>
    </div>
    
    <div v-if="loading" class="loading">加载中...</div>
    
    <div v-else-if="filteredVideos.length === 0" class="empty">
      暂无视频
    </div>
    
    <div v-else class="video-list">
      <div 
        v-for="video in filteredVideos" 
        :key="video.id" 
        class="video-card"
        @click="selectVideo(video.id)"
      >
        <h3>{{ video.title }}</h3>
        <p class="desc">{{ video.description || '英语单词学习' }}</p>
        <div class="stats">
          <span>{{ video.wordCount }} 个单词</span>
          <span v-if="video.progress">
            | 已学 {{ video.progress.learned }}
            <span v-if="video.progress.unknown > 0" class="unknown-count">
              | 🔴 {{ video.progress.unknown }}
            </span>
          </span>
        </div>
        <div class="progress-bar" v-if="video.progress">
          <div 
            class="progress-fill" 
            :style="{ width: getProgress(video) + '%' }"
          ></div>
        </div>
        <button class="btn btn-primary btn-small">
          {{ video.progress?.learned > 0 ? '继续学习' : '开始学习' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Videos',
  data() {
    return {
      videos: [],
      loading: true,
      userId: localStorage.getItem('userId'),
      category: 'junior' // 默认显示初中
    }
  },
  computed: {
    // 根据后端返回的 category 字段过滤视频
    filteredVideos() {
      return this.videos.filter(v => {
        // 使用后端返回的 category 字段，默认为 'junior'
        return (v.category || 'junior') === this.category
      })
    },
    // 分类统计
    categoryStats() {
      let total = 0
      let learned = 0
      let unknown = 0
      
      this.filteredVideos.forEach(v => {
        total += v.wordCount || 0
        if (v.progress) {
          learned += v.progress.learned || 0
          unknown += v.progress.unknown || 0
        }
      })
      
      return { total, learned, unknown }
    }
  },
  mounted() {
    this.fetchVideos()
  },
  methods: {
    async fetchVideos() {
      try {
        const res = await fetch(`/api/videos?userId=${this.userId}`)
        const data = await res.json()
        if (data.success) {
          this.videos = data.data
        }
      } catch (e) {
        console.error('获取视频列表失败', e)
      } finally {
        this.loading = false
      }
    },
    selectVideo(videoId) {
      this.$router.push({ name: 'Learn', params: { videoId } })
    },
    getProgress(video) {
      if (!video.progress || video.progress.total === 0) return 0
      return Math.round((video.progress.learned / video.progress.total) * 100)
    },
    switchCategory(cat) {
      this.category = cat
    },
    goToPet() {
      this.$router.push({ name: 'PetUnits' })
    }
  }
}
</script>

<style scoped>
.videos-page {
  padding: 24px;
}

.videos-page h2 {
  margin-bottom: 24px;
  font-size: 24px;
}

/* 分类标签样式 */
.category-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.category-tabs button {
  padding: 10px 24px;
  border: 2px solid #4CAF50;
  background: white;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  color: #4CAF50;
  transition: all 0.3s;
}

.category-tabs button.active {
  background: #4CAF50;
  color: white;
}

.category-tabs button:hover:not(.active) {
  background: #e8f5e9;
}

/* 分类统计样式 */
.category-stats {
  background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  display: flex;
  gap: 24px;
  font-size: 15px;
}

.category-stats span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #333;
}

/* 视频列表 */
.video-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.video-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.video-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.video-card h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: #333;
}

.video-card .desc {
  color: #666;
  font-size: 14px;
  margin-bottom: 12px;
}

.video-card .stats {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.video-card .unknown-count {
  color: #F44336;
}

.video-card .progress-bar {
  height: 6px;
  background: #E0E0E0;
  border-radius: 3px;
  margin-bottom: 16px;
  overflow: hidden;
}

.video-card .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  border-radius: 3px;
  transition: width 0.3s;
}

.loading, .empty {
  text-align: center;
  padding: 48px;
  color: #666;
}
</style>
