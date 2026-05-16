const CACHE_NAME = 'smarty-ai-v3';
const urlsToCache = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // لا تتدخل في طلبات Firebase و Gemini و Google APIs
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.pathname.startsWith('/api/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // للملفات الثابتة (js, css, الصور) -> Cache First
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return (
          response ||
          fetch(event.request).then((fetchRes) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, fetchRes.clone());
              return fetchRes;
            });
          })
        );
      })
    );
    return;
  }

  // لكل الطلبات الأخرى (HTML, صفحات افتراضية) -> Network First ثم العودة إلى index.html
  event.respondWith(
    fetch(event.request).catch(() => caches.match('/index.html'))
  );
});
