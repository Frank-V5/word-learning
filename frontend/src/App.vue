<template>
  <div id="app">
    <header class="header" v-if="showHeader">
      <div class="logo" @click="goHome">
        🦀 英语单词学习
      </div>
      <nav class="nav">
        <button class="btn btn-secondary btn-small" @click="goToVideos">视频列表</button>
        <button class="btn btn-secondary btn-small" @click="goToReview">
          错词本 <span v-if="wrongCount > 0">({{ wrongCount }})</span>
        </button>
        <button class="btn btn-secondary btn-small" @click="logout" v-if="userId">退出</button>
      </nav>
    </header>
    <router-view @updateWrongCount="updateWrongCount" />
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      userId: localStorage.getItem('userId'),
      wrongCount: 0
    }
  },
  computed: {
    showHeader() {
      return this.$route.name !== 'Login'
    }
  },
  mounted() {
    if (this.userId) {
      this.fetchWrongCount()
    }
  },
  methods: {
    goHome() {
      this.$router.push({ name: 'Videos' })
    },
    goToVideos() {
      this.$router.push({ name: 'Videos' })
    },
    goToReview() {
      this.$router.push({ name: 'Review' })
    },
    logout() {
      localStorage.removeItem('userId')
      localStorage.removeItem('nickname')
      this.$router.push({ name: 'Login' })
    },
    async fetchWrongCount() {
      try {
        const res = await fetch(`/api/wrong-words?userId=${this.userId}`)
        const data = await res.json()
        if (data.success) {
          this.wrongCount = data.data.length
        }
      } catch (e) {
        console.error('获取错词数量失败', e)
      }
    },
    updateWrongCount(count) {
      this.wrongCount = count
    }
  }
}
</script>
