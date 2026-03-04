module.exports = {
  apps: [{
    name: 'word-learning-api',
    script: 'src/index.js',
    cwd: '/root/.openclaw/workspace/word-learning/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      PORT: 3100
    }
  }]
};
