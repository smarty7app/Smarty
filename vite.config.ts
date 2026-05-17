import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  // قراءة المفتاح من بيئة الخادم
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // جعل المفتاح متاحاً لكل من الطريقتين لضمان الوصول إليه
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
