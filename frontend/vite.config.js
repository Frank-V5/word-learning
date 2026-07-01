import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3200,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3100',
        changeOrigin: true
      },
      '/videos': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3100',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    // 确保复制 public 文件夹内容
    copyPublicDir: true
  },
  // PWA 相关配置
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0')
  }
})
