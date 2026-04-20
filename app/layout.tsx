import type { Metadata, Viewport } from 'next';
import { Inter, Cairo } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LanguageProvider } from '@/components/LanguageContext';
import AuthProvider from '@/components/AuthProvider';
import InstallPrompt from '@/components/InstallPrompt';
import ClientComponents from './ClientComponents'; // ✅ إضافة استيراد ClientComponents

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

// ✅ إعدادات viewport منفصلة (موصى به في Next.js 15+)
export const viewport: Viewport = {
  themeColor: '#E65100',
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
      { url: '/icon1.png', sizes: '192x192' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes', // ✅ التوجيه الحديث
  },
  // تحسين SEO للغة العربية
  alternates: {
    languages: {
      'ar': '/ar',
      'en': '/en',
      'fr': '/fr',
      'zh': '/zh',
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${cairo.variable}`} suppressHydrationWarning>
      <head>
        {/* ✅ التوجيهات الحديثة لـ PWA */}
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
              <ClientComponents /> {/* ✅ إضافة مكون ClientComponents لتسجيل Service Worker والإشعارات */}
            </ErrorBoundary>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
