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
        <button class="btn btn-secondary btn-small" @click="goToTroublesome">
          易错表 <span v-if="troublesomeCount > 0">({{ troublesomeCount }})</span>
        </button>
        <button class="btn btn-secondary btn-small" @click="logout" v-if="userId">退出</button>
      </nav>
    </header>
    <main class="main-content">
      <router-view @updateWrongCount="updateWrongCount" @updateTroublesomeCount="updateTroublesomeCount" />
    </main>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      userId: localStorage.getItem('userId'),
      wrongCount: 0,
      troublesomeCount: 0
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
      this.fetchTroublesomeCount()
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
    goToTroublesome() {
      this.$router.push({ name: 'Troublesome' })
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
    async fetchTroublesomeCount() {
      try {
        const res = await fetch(`/api/troublesome-words/count?userId=${this.userId}`)
        const data = await res.json()
        if (data.success) {
          this.troublesomeCount = data.data.count
        }
      } catch (e) {
        console.error('获取易错单词数量失败', e)
      }
    },
    updateWrongCount(count) {
      this.wrongCount = count
    },
    updateTroublesomeCount(count) {
      this.troublesomeCount = count
    }
  }
}
</script>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

#app > .header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

#app > .main-content {
  flex: 1;
  margin-top: 70px;
}
</style>
