<template>
  <div class="videos-page">
    <h2>选择要学习的视频</h2>
    
    <div v-if="loading" class="loading">加载中...</div>
    
    <div v-else-if="videos.length === 0" class="empty">
      暂无视频
    </div>
    
    <div v-else class="video-list">
      <div 
        v-for="video in videos" 
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
      userId: localStorage.getItem('userId')
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
  background: #4CAF50;
  border-radius: 3px;
  transition: width 0.3s;
}

.loading, .empty {
  text-align: center;
  padding: 48px;
  color: #666;
}
</style>
