const CACHE_NAME = 'smartyai-order-v2';
const ASSETS = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Strictly skip caching for dev scripts, vite HMR, node_modules, API, or chrome extensions
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/@id/') ||
    url.pathname.includes('cookie_check') ||
    url.pathname.includes('chrome-extension') ||
    url.origin !== self.location.origin
  ) {
    return; // Pass through to browser natively
  }
  
  // Network-First Strategy: Always fetch from network first.
  // This prevents stale/broken development code caching in the browser.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If we got a valid response, cache it and return
        if (response && response.status === 200 && response.type === 'basic') {
          const contentType = response.headers.get('content-type');
          // If the response is HTML but the destination was not a document/navigation request, 
          // do NOT cache it (it is a cookie check/auth redirect page masquerading as the resource).
          if (contentType && contentType.includes('text/html') && event.request.destination !== 'document') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // On network failure (offline), return cached version if any
        return caches.match(event.request);
      })
  );
});
