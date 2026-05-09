<template>
  <div class="login-page">
    <!-- 自动登录中 -->
    <div v-if="autoLogging" class="login-card">
      <div class="loading-spinner"></div>
      <p style="margin-top: 20px; color: #666;">正在登录...</p>
    </div>
    
    <!-- 已登录设备选择 -->
    <div v-else-if="savedDevices.length > 0 && !showCodeInput" class="login-card">
      <h1>🦀 英语单词学习</h1>
      <p style="margin-bottom: 20px; color: #666;">选择账号</p>
      
      <div class="device-list">
        <button 
          v-for="device in savedDevices" 
          :key="device.userId"
          class="device-btn"
          @click="selectDevice(device)"
        >
          <span class="avatar">{{ (device.nickname || '学').charAt(0) }}</span>
          <span class="info">
            <span class="name">{{ device.nickname || '学习者' }}</span>
            <span class="code">学习码: {{ device.userId }}</span>
          </span>
        </button>
      </div>
      
      <button class="btn btn-secondary" @click="showCodeInput = true" style="margin-top: 16px; width: 100%;">
        使用其他账号
      </button>
    </div>
    
    <!-- 输入学习码 -->
    <div v-else class="login-card">
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
        
        <button 
          v-if="savedDevices.length > 0" 
          class="btn-link" 
          @click="showCodeInput = false"
        >
          ← 返回账号选择
        </button>
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
      showCodeInput: false,
      loading: false,
      autoLogging: true,
      error: '',
      savedDevices: []
    }
  },
  mounted() {
    this.checkAutoLogin()
  },
  methods: {
    async checkAutoLogin() {
      // 检查当前登录状态
      const currentUserId = localStorage.getItem('userId')
      if (currentUserId) {
        // 已登录，直接跳转
        this.$router.push({ name: 'Videos' })
        return
      }
      
      // 获取已保存的设备列表
      this.loadSavedDevices()
      
      // 如果只有一个设备，自动登录
      if (this.savedDevices.length === 1) {
        await this.autoLogin(this.savedDevices[0])
      } else {
        this.autoLogging = false
      }
    },
    
    loadSavedDevices() {
      try {
        const devices = localStorage.getItem('savedDevices')
        this.savedDevices = devices ? JSON.parse(devices) : []
      } catch (e) {
        this.savedDevices = []
      }
    },
    
    saveDevice(userId, nickname) {
      // 检查是否已存在
      const existing = this.savedDevices.find(d => d.userId === userId)
      if (!existing) {
        this.savedDevices.push({
          userId,
          nickname: nickname || '',
          lastLogin: new Date().toISOString()
        })
      } else {
        existing.lastLogin = new Date().toISOString()
      }
      localStorage.setItem('savedDevices', JSON.stringify(this.savedDevices))
    },
    
    async autoLogin(device) {
      this.autoLogging = true
      
      try {
        const res = await fetch('/api/user/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: device.userId })
        })
        const data = await res.json()
        
        if (data.success) {
          localStorage.setItem('userId', data.data.userId)
          localStorage.setItem('nickname', data.data.nickname || '')
          this.$router.push({ name: 'Videos' })
        } else {
          // 自动登录失败，显示账号选择
          this.autoLogging = false
          // 移除无效设备
          this.savedDevices = this.savedDevices.filter(d => d.userId !== device.userId)
          localStorage.setItem('savedDevices', JSON.stringify(this.savedDevices))
        }
      } catch (e) {
        this.autoLogging = false
      }
    },
    
    async selectDevice(device) {
      await this.autoLogin(device)
    },
    
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
          // 保存设备信息
          this.saveDevice(data.data.userId, data.data.nickname)
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
          // 保存设备信息
          this.saveDevice(data.data.userId, data.data.nickname)
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

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E0E0E0;
  border-top-color: #4CAF50;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #F5F5F5;
  border: 2px solid #E0E0E0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
}

.device-btn:hover {
  background: #E8F5E9;
  border-color: #4CAF50;
}

.device-btn .avatar {
  width: 48px;
  height: 48px;
  background: #4CAF50;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
}

.device-btn .info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-btn .name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.device-btn .code {
  font-size: 12px;
  color: #999;
}

.btn-link {
  background: none;
  border: none;
  color: #4CAF50;
  cursor: pointer;
  font-size: 14px;
  margin-top: 16px;
}

.btn-link:hover {
  text-decoration: underline;
}
</style>
