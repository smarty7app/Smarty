const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/smarty-lac\.vercel\.app\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'smarty-static',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff|woff2|ttf)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'smarty-assets',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
  ],
});

module.exports = withPWA({
  // هنا ضع إعدادات Next.js الحالية (إذا كان لديك أي إعدادات)
  // مثال: إذا كنت تستخدم i18n أو output: 'export' أضفها هنا
  // i18n: { locales: ['ar', 'en'], defaultLocale: 'ar' },
});
