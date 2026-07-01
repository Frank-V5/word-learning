// Service Worker for PWA
const CACHE_NAME = 'word-learning-v1';
// bump 到 v3：发布新前端后，让所有用户清掉含旧 index.html 的 static-v2 缓存，重新拉新版
// (教训：HTML 若走 cache-first，删掉旧资源文件会让老缓存 404 白屏 → 必须 HTML 网络优先)
const STATIC_CACHE = 'static-v3';
const API_CACHE = 'api-v3';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== STATIC_CACHE && name !== API_CACHE)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截 - 网络优先，缓存回退
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 请求：网络优先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 缓存成功的API响应
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 网络失败时使用缓存
          return caches.match(request);
        })
    );
    return;
  }

  // 视频文件：不缓存（太大）
  if (url.pathname.startsWith('/videos/')) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML 导航：网络优先（关键！保证每次拿到最新 index.html，
  // 避免部署后旧缓存引用已删除的资源而白屏；离线时回退缓存）
  if (request.mode === 'navigate' ||
      (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(c => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  // 静态资源（含 /assets/* 内容哈希文件名）：缓存优先（旧哈希永不变，安全）
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) {
          return cached;
        }
        return fetch(request).then(response => {
          if (!response.ok) {
            return response;
          }
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
  );
});

// 后台同步（可选）
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgress());
  }
});

async function syncProgress() {
  // 同步学习进度到服务器
  console.log('Syncing progress...');
}
