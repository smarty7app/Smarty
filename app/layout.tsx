'use client';

import type { Metadata, Viewport } from 'next';
import { Inter, Cairo } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LanguageProvider } from '@/components/LanguageContext';
import AuthProvider from '@/components/AuthProvider';
import InstallPrompt from '@/components/InstallPrompt';
import { useEffect } from 'react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-arabic',
  display: 'swap',
});

// ✅ إعدادات viewport منفصلة
export const viewport: Viewport = {
  themeColor: '#e65100',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Smarty',
  description: 'تطبيق ذكي لإدارة التذكيرات والمواعيد مع تحليل تلقائي للنصوص العربية',
  applicationName: 'Smarty',
  appleWebApp: {
    capable: true,
    title: 'Smarty',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
      { url: '/apple-touch-icon-152x152.png', sizes: '152x152' },
      { url: '/apple-touch-icon-167x167.png', sizes: '167x167' },
      { url: '/apple-touch-icon-180x180.png', sizes: '180x180' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  alternates: {
    languages: {
      'ar': '/ar',
      'en': '/en',
      'fr': '/fr',
      'zh': '/zh',
    },
  },
};

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
            // إظهار إشعار في الواجهة
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sw-download-started', { detail: { modelId, filename } }));
            }
            break;
          case 'DOWNLOAD_PROGRESS':
            console.log(`📥 Download progress: ${filename} - ${Math.round(progress)}%`);
            // تحديث التقدم في الواجهة
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sw-download-progress', { detail: { modelId, progress } }));
            }
            break;
          case 'DOWNLOAD_COMPLETE':
            console.log(`✅ Download complete: ${filename}`);
            // إعلام الواجهة باكتمال التحميل
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
            // إرسال إشعار ترحيبي
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
          
          // إظهار إشعار للمستخدم
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔄 تحميل مستمر', {
              body: `تم اكتشاف تحميل غير مكتمل لنموذج ${filename}. سيتم استئنافه تلقائياً.`,
              icon: '/icon-192.png',
              badge: '/badge.png',
              silent: false,
              vibrate: [200, 100, 200]
            });
          }
          
          // إعلام الواجهة بوجود تحميل معلق
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
    
    // التحقق كل دقيقة
    const interval = setInterval(checkPendingDownloads, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  return null;
}

// ✅ Client Component لإظهار إشعار عند تثبيت التطبيق (PWA)
function PWAListener() {
  useEffect(() => {
    // كشف تثبيت التطبيق كـ PWA
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
    
    // كشف دعم PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is running in standalone mode (PWA)');
    }
    
    return () => {
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);
  
  return null;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${cairo.variable}`} suppressHydrationWarning>
      <head>
        {/* ✅ أيقونات Favicon و PWA */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
        
        {/* ✅ أيقونات Apple Touch */}
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* ✅ ملف Manifest وأيقونة Safari Pinned Tab */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#E65100" />
        
        {/* ✅ ألوان الشريط العلوي */}
        <meta name="theme-color" content="#E65100" />
        <meta name="msapplication-TileColor" content="#E65100" />
        
        {/* ✅ إعدادات PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Smarty" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* ✅ تحسينات أمان */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        
        {/* ✅ سكريبت تهيئة الوضع الداكن */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && prefersDark)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="font-arabic antialiased bg-[#f8fafc] text-slate-900 dark:bg-zinc-950 dark:text-white">
        <AuthProvider>
          <LanguageProvider>
            <ErrorBoundary>
              {children}
              <InstallPrompt />
              
              {/* ✅ مكونات Service Worker والإشعارات */}
              <ServiceWorkerRegister />
              <NotificationPermissionHandler />
              <PendingDownloadsHandler />
              <PWAListener />
            </ErrorBoundary>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
