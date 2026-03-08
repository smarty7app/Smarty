'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Info, Code, MessageCircle, Eye } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface AboutScreenProps {
  onBack: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  const { t, isRTL } = useLanguage();
  const [visitorCount, setVisitorCount] = useState(0);
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    // استخدام setTimeout لتأخير setState قليلاً (تجنب التحذير)
    const timer = setTimeout(() => {
      let count = localStorage.getItem('smarty_visitor_count');
      if (!count) {
        count = '1';
        localStorage.setItem('smarty_visitor_count', count);
      } else {
        count = (parseInt(count) + 1).toString();
        localStorage.setItem('smarty_visitor_count', count);
      }
      setVisitorCount(parseInt(count));
      setIsAnimated(true);
      
      // إيقاف التأثير الحركي بعد ثانية
      setTimeout(() => setIsAnimated(false), 1000);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#E65100] dark:bg-zinc-950 text-black dark:text-white transition-colors duration-500">
      {/* App Bar */}
      <div className="flex items-center gap-4 p-6 bg-black/10 backdrop-blur-sm sticky top-0 z-10 border-b border-white/10">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          {isRTL ? <ChevronLeft className="w-6 h-6 rotate-180" /> : <ChevronLeft className="w-6 h-6" />}
        </button>
        <h1 className="text-2xl font-black tracking-tight text-white">{t.about}</h1>
      </div>

      <div className="flex-1 flex flex-col items-center p-6 pt-16">
        <div className="w-28 h-28 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-2xl mb-8 text-[#E65100]">
          <Info className="w-14 h-14" />
        </div>
        
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
            href="https://t.me/share/url?url=https://smartyz.netlify.app&text=جرب%20تطبيق%20Smarty%20الرائع"
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-3 bg-[#0088cc] text-white py-4 rounded-2xl font-black hover:scale-[1.02] transition-transform shadow-lg"
          >
            <MessageCircle className="w-5 h-5" />
            تيليجرام
          </a>
        </div>
         
        {/* Badge Counter - تصميم احترافي */}
        <div className="mt-8 w-full max-w-md">
          <div className="relative">
            {/* خط فاصل مع تأثير */}
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            
            {/* محتوى العداد */}
            <div className="relative flex justify-center">
              <div className="bg-[#E65100] dark:bg-zinc-800 px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 border border-white/10">
                <div className="relative">
                  <Eye className={`w-5 h-5 text-white/70 ${isAnimated ? 'animate-pulse' : ''}`} />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                </div>
                <span className="text-white/50 text-sm">زوار التطبيق</span>
                <div className="h-4 w-px bg-white/20 mx-1"></div>
                <span className="text-white font-black text-lg tabular-nums">
                  {visitorCount.toLocaleString()}
                </span>
                <span className="text-white/30 text-xs">مشاهدة</span>
              </div>
            </div>
          </div>
        </div>

        {/* بصمة رقمية صغيرة (اختياري) */}
        <div className="mt-4 text-white/30 text-[10px] font-mono tracking-wider text-center">
        {new Date().getFullYear()} © Smatry
      {/* bay - الاسم الكامل في الأسفل */}
      <div className="w-full max-w-md text-center mb-2">
      <p className="text-white/20 text-[8px] font-center">
               Bay:Benabdallah Abdallah
    </p>
  </div>
        </div>
      </div>
    </div>
  );
};
