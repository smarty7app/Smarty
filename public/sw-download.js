// Service Worker للتحميل في الخلفية مع الإشعارات
let activeDownloads = new Map();

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

// استقبال طلب التحميل
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  if (type === 'START_DOWNLOAD') {
    startDownload(data);
  } else if (type === 'CANCEL_DOWNLOAD') {
    cancelDownload(data.modelId);
  } else if (type === 'SHOW_NOTIFICATION') {
    showNotification(data.title, data.body, data.tag);
  }
});

// دالة لإظهار الإشعار
async function showNotification(title, body, tag = null) {
  if (Notification.permission === 'granted') {
    const options = {
      body: body,
      icon: '/icon-192.png',
      badge: '/badge.png',
      vibrate: [200, 100, 200],
      silent: false,
      requireInteraction: true,
      actions: [
        { action: 'open', title: 'فتح التطبيق' },
        { action: 'dismiss', title: 'تجاهل' }
      ]
    };
    
    if (tag) {
      options.tag = tag;
    }
    
    await self.registration.showNotification(title, options);
  }
}

async function startDownload({ modelId, downloadUrl, filename }) {
  try {
    // إشعار بدء التحميل
    await showNotification('🚀 بدء التحميل', `جاري تحميل ${filename}`, `download-start-${modelId}`);
    
    // إعلام جميع العملاء ببدء التحميل
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DOWNLOAD_STARTED',
        modelId,
        filename
      });
    });

    const response = await fetch(downloadUrl);
    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10);
    
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    let lastProgressUpdate = 0;
    
    activeDownloads.set(modelId, { reader, chunks, received, total });
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      received += value.length;
      
      // إرسال تقدم التحميل
      const progress = (received / total) * 100;
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'DOWNLOAD_PROGRESS',
          modelId,
          progress,
          received,
          total
        });
      });
      
      // تحديث الإشعار كل 5%
      if (Math.floor(progress / 5) > lastProgressUpdate || progress >= 100) {
        lastProgressUpdate = Math.floor(progress / 5);
        await showNotification('📥 جاري التحميل', `${filename}: ${Math.round(progress)}%`, `download-progress-${modelId}`);
      }
    }
    
    // دمج الملف
    const blob = new Blob(chunks, { type: 'application/octet-stream' });
    
    // تخزين في IndexedDB داخل Service Worker
    const cache = await caches.open('ai-models');
    await cache.put(`model-${modelId}`, new Response(blob));
    
    // إشعار باكتمال التحميل
    await showNotification('✅ اكتمل التحميل!', `تم تحميل ${filename} بنجاح.`, `download-complete-${modelId}`);
    
    // إعلام العملاء باكتمال التحميل
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DOWNLOAD_COMPLETE',
        modelId,
        filename
      });
    });
    
    activeDownloads.delete(modelId);
    
  } catch (error) {
    console.error('Download failed:', error);
    
    await showNotification('❌ فشل التحميل', `${filename}: ${error.message}`, `download-error-${modelId}`);
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DOWNLOAD_ERROR',
        modelId,
        error: error.message
      });
    });
    activeDownloads.delete(modelId);
  }
}

async function cancelDownload(modelId) {
  const download = activeDownloads.get(modelId);
  if (download && download.reader) {
    await download.reader.cancel();
    activeDownloads.delete(modelId);
    
    await showNotification('⏸️ تم إلغاء التحميل', 'تم إلغاء تحميل النموذج.', `download-cancel-${modelId}`);
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DOWNLOAD_CANCELLED',
        modelId
      });
    });
  }
}

// الاستماع لضغط المستخدم على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          for (let client of windowClients) {
            if (client.url.includes('/smart-voice') && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow('/smart-voice');
          }
        })
    );
  }
});
