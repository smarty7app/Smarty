'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Info, Code, MessageCircle } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface AboutScreenProps {
  onBack: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  const { t, isRTL } = useLanguage();
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTotalVisitors = async () => {
      try {
        const res = await fetch('/api/get-total-visitors');
        const data = await res.json();
        if (data.success) {
          setVisitorCount(data.total);
        }
      } catch (err) {
        console.error('Failed to fetch visitor count:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTotalVisitors();
  }, []);

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#E65100] dark:bg-zinc-950 text-black dark:text-white transition-colors duration-500">
      {/* App Bar */}
       <header className="flex items-center gap-4 p-6 bg-black/20 backdrop-blur-xl sticky top-0 z-10 border-b border-white/5">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90 border border-white/5 text-white/70"
        >
          {isRTL ? <ChevronLeft className="w-6 h-6 rotate-180" /> : <ChevronLeft className="w-6 h-6" />}
        </button>
        <h1 className="text-xl font-bold tracking-tight text-white/90">{t.about}</h1>
      </header>

      <div className="flex-1 flex flex-col items-center p-8 pt-12 overflow-y-auto">
        
        {/* 1. قسم الشعار الموحد (The Core Identity) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-10"
        >
          <div className="w-24 h-24 bg-white rounded-[2.2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(230,81,0,0.2)] mb-6 transform -rotate-6">
            <svg className="w-12 h-12 text-[#E65100]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z"/>
            </svg>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white">
            Smarty<span className="text-orange-500">®</span>
          </h2>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
            {t.version} 2.0 PREMIUM
          </p>
        </motion.div>
        
        <h2 className="text-4xl font-black mb-2 text-white tracking-tight">{t.app_name}</h2>
        <p className="text-white/70 font-bold mb-12 tracking-widest uppercase text-sm">{t.version} 2.0</p>
        
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 w-full max-w-xs shadow-lg border border-black/5 dark:border-white/5 mb-4 text-center">
          <p className="text-zinc-900 dark:text-white text-sm font-medium">
            Never Forget Anything Again
          </p>
        </div>
        
        <div className="flex gap-4 w-full max-w-md">
          <a 
            href="https://github.com/17benabdallah-hue" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-3 bg-zinc-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black hover:scale-[1.02] transition-transform shadow-lg"
          >
            <Code className="w-5 h-5" />
            GitHub
          </a>
          <a 
            href="https://t.me/share/url?url=https://smarty-lac.vercel.app/&text=جرب%20تطبيق%20Smarty%20الرائع"
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-3 bg-[#0088cc] text-white py-4 rounded-2xl font-black hover:scale-[1.02] transition-transform shadow-lg"
          >
            <MessageCircle className="w-5 h-5" />
            تيليجرام
          </a>
        </div>

        {/* Badge Counter - Supabase */}
        <div className="mt-8 w-full max-w-md">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="bg-[#E65100] dark:bg-zinc-800 px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 border border-white/10">
                <span className="text-white/70 text-sm">عدد الزوار</span>
                <div className="h-4 w-px bg-white/20 mx-1"></div>
                <span className="text-white font-black text-lg tabular-nums">
                  {loading ? 'جاري التحميل...' : (visitorCount ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* بصمة رقمية صغيرة */}
        <div className="mt-4 text-white/30 text-[10px] font-mono tracking-wider text-center">
          {new Date().getFullYear()} © Smarty
        </div>

        {/* bay - الاسم الكامل */}
        <div className="w-full max-w-md text-center mt-2">
          <p className="text-white/20 text-[8px]">
            Bay: Benabdallah Abdallah
          </p>
        </div>
      </div>
    </div>
  );
};
