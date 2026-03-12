/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // هذا هو السطر السحري الذي سينشئ مجلد out
  images: {
    unoptimized: true, // ضروري للأندرويد
  },
};

export default nextConfig;
