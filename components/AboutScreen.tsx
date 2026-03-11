'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Github, Send, Info } from 'lucide-react'; // تم تحديث الأيقونات لتناسب التصميم
import { useLanguage } from './LanguageContext';
import { motion } from 'framer-motion';

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
    <div className="flex flex-col h-full min-h-screen bg-zinc-950 text-white transition-colors duration-500 relative overflow-hidden font-sans">
      {/* تأثير التوهج في الخلفية ليعطي لمسة Premium */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-[#E65100]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-64 h-64 bg-white/5 blur-[100px] rounded-full pointer-events-none" />

      {/* App Bar - تصميم زجاجي */}
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

        {/* 2. بطاقة الوصف (The Glass Card) */}
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md mb-8 text-center">
          <p className="text-white/80 font-medium leading-relaxed italic">
            {/* 2. بطاقة الوصف (The Glass Card) */}
<div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md mb-8 text-center">
  <p className="text-white/80 font-medium leading-relaxed italic">
    &quot;Never Forget Anything Again&quot;
  </p>
</div>

          </p>
        </div>
        
        {/* 3. أزرار التواصل (Action Buttons) */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-10">
          <a 
            href="https://github.com/17benabdallah-hue" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 p-5 bg-white/5 border border-white/10 rounded-[1.8rem] hover:bg-white/10 transition-all group active:scale-95"
          >
            <Github className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">GitHub</span>
          </a>
          <a 
            href="https://t.me/share/url?url=https://smarty-lac.vercel.app/&text=جرب%20تطبيق%20Smarty%20الرائع"
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 p-5 bg-[#0088cc]/10 border border-[#0088cc]/20 rounded-[1.8rem] hover:bg-[#0088cc]/20 transition-all group active:scale-95"
          >
            <Send className="w-6 h-6 text-[#0088cc]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0088cc]/80">تيليجرام</span>
          </a>
        </div>

        {/* 4. عداد الزوار المطور (Smart Counter) */}
        <div className="mt-4 w-full max-w-sm">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-white/40 text-xs font-bold uppercase tracking-widest">عدد الزوار</span>
            </div>
            <span className="text-white font-black text-lg tabular-nums">
              {loading ? '...' : (visitorCount ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* 5. التوقيع السفلي (Digital Signature) */}
        <footer className="mt-auto py-8 text-center">
          <p className="text-white/10 text-[9px] font-bold tracking-[0.4em] uppercase mb-2">Developed with ❤️ by</p>
          <p className="text-white/30 text-[11px] font-black tracking-tighter uppercase">
            Benabdallah Abdallah
          </p>
          <div className="mt-4 text-[10px] text-white/10 font-mono">
            {new Date().getFullYear()} © SMARTY ASSISTANT
          </div>
        </footer>
      </div>
    </div>
  );
};
