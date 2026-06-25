import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// 路由配置
const routes = [
  { path: '/', name: 'Login', component: () => import('./views/Login.vue') },
  { path: '/videos', name: 'Videos', component: () => import('./views/Videos.vue') },
  { path: '/learn/:videoId', name: 'Learn', component: () => import('./views/Learn.vue') },
  { path: '/review', name: 'Review', component: () => import('./views/Review.vue') },
  { path: '/troublesome', name: 'Troublesome', component: () => import('./views/Troublesome.vue') },
  { path: '/admin', name: 'Admin', component: () => import('./views/Admin.vue') },
  { path: '/pet', name: 'PetUnits', component: () => import('./views/PetUnits.vue') },
  { path: '/pet/learn/:unit', name: 'PetLearn', component: () => import('./views/PetLearn.vue') },
  { path: '/pet/review', name: 'PetReview', component: () => import('./views/PetReview.vue') },
  { path: '/pet/troublesome', name: 'PetTroublesome', component: () => import('./views/PetTroublesome.vue') },
  { path: '/grammar', name: 'GrammarWorkspace', component: () => import('./views/GrammarWorkspace.vue') },
  { path: '/grammar/cat/:cat', name: 'GrammarCat', component: () => import('./views/GrammarCat.vue') },
  { path: '/grammar/learn/:id', name: 'GrammarLearn', component: () => import('./views/GrammarLearn.vue') },
  { path: '/grammar/troublesome', name: 'GrammarTroublesome', component: () => import('./views/GrammarTroublesome.vue') },
  { path: '/grammar/practice/:pointId', name: 'GrammarPractice', component: () => import('./views/GrammarPractice.vue') },
  { path: '/grammar/wrong', name: 'GrammarWrong', component: () => import('./views/GrammarWrong.vue') },
  { path: '/grammar/verbs', name: 'VerbCards', component: () => import('./views/VerbCards.vue') },
  { path: '/grammar/phrases', name: 'PhraseCards', component: () => import('./views/PhraseCards.vue') },
  { path: '/grammar/verb-troublesome', name: 'VerbTroublesome', component: () => import('./views/VerbTroublesome.vue') },
  { path: '/grammar/phrase-troublesome', name: 'PhraseTroublesome', component: () => import('./views/PhraseTroublesome.vue') }
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
