'use client';

import { useEffect } from 'react';

// ✅ Client Component لتسجيل Service Worker
function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          // تسجيل Service Worker للتحميل في الخلفية
          const swRegistration = await navigator.serviceWorker.register('/sw-download.js', {
            scope: '/',
          });
          
          console.log('📦 Download Service Worker registered:', swRegistration);
          
          // طلب إذن الإشعارات إذا كان Service Worker نشطاً
          if (swRegistration.active && 'Notification' in window && Notification.permission === 'default') {
            setTimeout(async () => {
              const permission = await Notification.requestPermission();
              console.log('Notification permission:', permission);
              if (swRegistration.active) {
                swRegistration.active.postMessage({
                  type: 'NOTIFICATION_PERMISSION',
                  permission: permission
                });
              }
            }, 3000);
          }
        } catch (error) {
          console.error('❌ Service Worker registration failed:', error);
        }
      };
      
      registerServiceWorker();
      
      // تحديث Service Worker إذا وجد
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
      });
      
      // الاستماع لرسائل من Service Worker
      const handleMessage = (event: MessageEvent) => {
        const { type, filename, progress, modelId } = event.data;
        
        switch (type) {
          case 'DOWNLOAD_STARTED':
            console.log(`🚀 Download started: ${filename}`);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sw-download-started', { detail: { modelId, filename } }));
            }
            break;
          case 'DOWNLOAD_PROGRESS':
            console.log(`📥 Download progress: ${filename} - ${Math.round(progress)}%`);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sw-download-progress', { detail: { modelId, progress } }));
            }
            break;
          case 'DOWNLOAD_COMPLETE':
            console.log(`✅ Download complete: ${filename}`);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sw-download-complete', { detail: { modelId, filename } }));
            }
            break;
          case 'DOWNLOAD_ERROR':
            console.error(`❌ Download error: ${filename}`);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sw-download-error', { detail: { modelId, error: event.data.error } }));
            }
            break;
          case 'DOWNLOAD_CANCELLED':
            console.log(`⏸️ Download cancelled: ${filename}`);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sw-download-cancelled', { detail: { modelId } }));
            }
            break;
        }
      };
      
      navigator.serviceWorker.addEventListener('message', handleMessage);
      
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);
  
  return null;
}

// ✅ Client Component لطلب إذن الإشعارات
function NotificationPermissionHandler() {
  useEffect(() => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }
    
    if (Notification.permission === 'granted') {
      console.log('✅ Notifications already granted');
    } else if (Notification.permission === 'denied') {
      console.log('❌ Notifications denied by user');
    } else {
      // طلب الإذن عند أول تفاعل للمستخدم
      const requestPermissionOnInteraction = () => {
        document.removeEventListener('click', requestPermissionOnInteraction);
        document.removeEventListener('touchstart', requestPermissionOnInteraction);
        
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('✅ Notifications granted by user');
            new Notification('مرحباً بك في Smarty!', {
              body: 'سنخبرك عند اكتمال تحميل النماذج في الخلفية',
              icon: '/icon-192.png',
              badge: '/badge.png',
              silent: false,
              vibrate: [200, 100, 200]
            });
          }
        });
      };
      
      document.addEventListener('click', requestPermissionOnInteraction);
      document.addEventListener('touchstart', requestPermissionOnInteraction);
      
      return () => {
        document.removeEventListener('click', requestPermissionOnInteraction);
        document.removeEventListener('touchstart', requestPermissionOnInteraction);
      };
    }
  }, []);
  
  return null;
}

// ✅ Client Component لاستعادة التحميلات المعلقة
function PendingDownloadsHandler() {
  useEffect(() => {
    const checkPendingDownloads = async () => {
      const pending = localStorage.getItem('pending_download');
      if (pending) {
        try {
          const { modelId, filename, startedAt } = JSON.parse(pending);
          const elapsedMinutes = Math.floor((Date.now() - startedAt) / 60000);
          
          console.log(`🔄 Found pending download: ${filename} (${elapsedMinutes} minutes ago)`);
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔄 تحميل مستمر', {
              body: `تم اكتشاف تحميل غير مكتمل لنموذج ${filename}. سيتم استئنافه تلقائياً.`,
              icon: '/icon-192.png',
              badge: '/badge.png',
              silent: false,
              vibrate: [200, 100, 200]
            });
          }
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sw-pending-download', { 
              detail: { modelId, filename, elapsedMinutes } 
            }));
          }
        } catch (error) {
          console.error('Error checking pending downloads:', error);
        }
      }
    };
    
    checkPendingDownloads();
    const interval = setInterval(checkPendingDownloads, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  return null;
}

// ✅ Client Component لإظهار إشعار عند تثبيت التطبيق (PWA)
function PWAListener() {
  useEffect(() => {
    window.addEventListener('appinstalled', () => {
      console.log('📱 App installed as PWA');
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🎉 شكراً لتثبيت Smarty!', {
          body: 'الآن يمكنك استخدام التطبيق بشكل أسرع وأفضل',
          icon: '/icon-192.png',
          badge: '/badge.png',
          silent: false,
          vibrate: [200, 100, 200, 100, 200]
        });
      }
    });
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is running in standalone mode (PWA)');
    }
    
    return () => {
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);
  
  return null;
}

export default function ClientComponents() {
  return (
    <>
      <ServiceWorkerRegister />
      <NotificationPermissionHandler />
      <PendingDownloadsHandler />
      <PWAListener />
    </>
  );
}
