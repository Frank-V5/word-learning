<template>
  <div class="login-page">
    <div class="login-card">
      <h1>🦀 英语单词学习</h1>
      
      <div v-if="!showNewUser">
        <input 
          v-model="code" 
          type="text" 
          placeholder="输入学习码"
          maxlength="8"
          @keyup.enter="verifyCode"
        />
        <button class="btn btn-primary" @click="verifyCode" :disabled="loading">
          {{ loading ? '验证中...' : '开始学习' }}
        </button>
        <button class="btn btn-secondary" @click="showNewUser = true">
          我是新用户
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
      
      <div v-else>
        <p style="margin-bottom: 20px; color: #666;">创建新的学习账号</p>
        <input 
          v-model="nickname" 
          type="text" 
          placeholder="输入昵称（可选）"
          maxlength="20"
        />
        <button class="btn btn-primary" @click="createUser" :disabled="loading">
          {{ loading ? '创建中...' : '创建账号' }}
        </button>
        <button class="btn btn-secondary" @click="showNewUser = false">
          返回登录
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
      
      <p class="hint">
        💡 学习码用于保存学习进度<br/>换设备也能继续学习
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data() {
    return {
      code: '',
      nickname: '',
      showNewUser: false,
      loading: false,
      error: ''
    }
  },
  mounted() {
    // 检查是否已登录
    const userId = localStorage.getItem('userId')
    if (userId) {
      this.$router.push({ name: 'Videos' })
    }
  },
  methods: {
    async verifyCode() {
      if (!this.code || this.code.length !== 8) {
        this.error = '请输入8位学习码'
        return
      }
      
      this.loading = true
      this.error = ''
      
      try {
        const res = await fetch('/api/user/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: this.code })
        })
        const data = await res.json()
        
        if (data.success) {
          localStorage.setItem('userId', data.data.userId)
          localStorage.setItem('nickname', data.data.nickname || '')
          this.$router.push({ name: 'Videos' })
        } else {
          this.error = data.error || '学习码无效'
        }
      } catch (e) {
        this.error = '网络错误，请重试'
      } finally {
        this.loading = false
      }
    },
    
    async createUser() {
      this.loading = true
      this.error = ''
      
      try {
        const res = await fetch('/api/user/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname: this.nickname || null })
        })
        const data = await res.json()
        
        if (data.success) {
          localStorage.setItem('userId', data.data.userId)
          localStorage.setItem('nickname', data.data.nickname || '')
          alert(`您的学习码是: ${data.data.userId}\n\n请牢记这个学习码！`)
          this.$router.push({ name: 'Videos' })
        } else {
          this.error = data.error || '创建失败，请重试'
        }
      } catch (e) {
        this.error = '网络错误，请重试'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.error {
  color: #F44336;
  margin-top: 12px;
  font-size: 14px;
}
</style>
