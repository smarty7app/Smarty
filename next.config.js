const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      // الصفحة الرئيسية والمسارات الأخرى (تخزينها مع أولوية الشبكة)
      urlPattern: ({ url }) => {
        return url.pathname === '/' || url.pathname.startsWith('/Settings');
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 يوم
        },
      },
    },
    {
      // ملفات JavaScript و CSS (تخزينها أولاً من الـ cache)
      urlPattern: /\.(?:js|css|woff2|woff|ttf|png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'assets-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    {
      // باقي الطلبات (API، إلخ) - تعتمد على الشبكة أولاً
      urlPattern: /^https:\/\/smarty-lac\.vercel\.app\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'others-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
  ],
});

module.exports = withPWA({
  // إعدادات Next.js الأخرى (إذا كان لديك)
  // مثلاً: i18n, output: 'export', images, إلخ.
});
