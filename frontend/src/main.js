import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// 路由配置
const routes = [
  { path: '/', name: 'Login', component: () => import('./views/Login.vue') },
  { path: '/videos', name: 'Videos', component: () => import('./views/Videos.vue') },
  { path: '/learn/:videoId', name: 'Learn', component: () => import('./views/Learn.vue') },
  { path: '/review', name: 'Review', component: () => import('./views/Review.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 检查登录状态
router.beforeEach((to, from, next) => {
  const userId = localStorage.getItem('userId')
  if (to.name !== 'Login' && !userId) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
