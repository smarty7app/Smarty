const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: ({ request, url }) => url.origin === self.location.origin,
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@capacitor/core', 'capacitor-offline-speech-recognition', 'chrono-node');
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
