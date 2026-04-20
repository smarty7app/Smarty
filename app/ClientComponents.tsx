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
          
          // ✅ إرسال رسالة إلى Service Worker لتأكيد التسجيل
          if (swRegistration.active) {
            swRegistration.active.postMessage({
              type: 'SW_REGISTERED',
              data: { timestamp: Date.now() }
            });
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
        const { type, filename, progress, modelId, error } = event.data;
        
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
              // ✅ إزالة التحميل المعلق من localStorage
              localStorage.removeItem('pending_download');
            }
            break;
          case 'DOWNLOAD_ERROR':
            console.error(`❌ Download error: ${filename} - ${error}`);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sw-download-error', { detail: { modelId, error } }));
              // ✅ إزالة التحميل المعلق من localStorage في حالة الخطأ
              localStorage.removeItem('pending_download');
            }
            break;
          case 'DOWNLOAD_CANCELLED':
            console.log(`⏸️ Download cancelled: ${filename}`);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sw-download-cancelled', { detail: { modelId } }));
              // ✅ إزالة التحميل المعلق من localStorage عند الإلغاء
              localStorage.removeItem('pending_download');
            }
            break;
          case 'SHOW_NOTIFICATION':
            // ✅ عرض إشعار من Service Worker
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(event.data.title, {
                body: event.data.body,
                icon: '/icon-192.png',
                badge: '/badge.png',
                silent: false
              });
            }
            break;
          default:
            console.log('Unknown message type:', type);
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
              silent: false
            });
            
            // ✅ إرسال إشعار إلى Service Worker بتفعيل الإذن
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'NOTIFICATION_PERMISSION_GRANTED',
                data: { timestamp: Date.now() }
              });
            }
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
          
          // ✅ إرسال إشعار للمستخدم
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔄 تحميل مستمر', {
              body: `تم اكتشاف تحميل غير مكتمل لنموذج ${filename}. جاري الاستئناف...`,
              icon: '/icon-192.png',
              badge: '/badge.png',
              silent: false
            });
          }
          
          // ✅ إرسال حدث إلى الصفحة الرئيسية لاستعادة التحميل
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sw-pending-download', { 
              detail: { modelId, filename, elapsedMinutes } 
            }));
          }
          
          // ✅ محاولة استئناف التحميل عبر Service Worker
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'RESUME_DOWNLOAD',
              data: { modelId, filename }
            });
          }
          
        } catch (error) {
          console.error('Error checking pending downloads:', error);
          // ✅ إذا كان هناك خطأ في البيانات، قم بحذفها
          localStorage.removeItem('pending_download');
        }
      }
    };
    
    // ✅ التحقق فوراً عند تحميل الصفحة
    checkPendingDownloads();
    
    // ✅ التحقق كل 30 ثانية بدلاً من 60 ثانية
    const interval = setInterval(checkPendingDownloads, 30000);
    
    // ✅ التحقق أيضاً عند عودة الصفحة للتركيز
    const handleFocus = () => {
      console.log('Page focused, checking pending downloads...');
      checkPendingDownloads();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  return null;
}

// ✅ Client Component لإظهار إشعار عند تثبيت التطبيق (PWA)
function PWAListener() {
  useEffect(() => {
    const handleAppInstalled = () => {
      console.log('📱 App installed as PWA');
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🎉 شكراً لتثبيت Smarty!', {
          body: 'الآن يمكنك استخدام التطبيق بشكل أسرع وأفضل',
          icon: '/icon-192.png',
          badge: '/badge.png',
          silent: false
        });
      }
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is running in standalone mode (PWA)');
    }
    
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
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
