'use client';

import React from 'react';
import { ChevronLeft, Info, Code, MessageCircle } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface AboutScreenProps {
  onBack: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  const { t, isRTL } = useLanguage();

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
        
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-md shadow-xl border border-black/5 dark:border-white/5 mb-8 text-center">
          <p className="font-black text-xl mb-3 text-black dark:text-white">تطوير: Benabdallah Abdallah</p>
          <p className="text-zinc-500 dark:text-zinc-400 font-bold text-sm">بالتعاون مع Gemini</p>
        </div>
        
        <div className="flex gap-4 w-full max-w-md">
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-3 bg-zinc-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black hover:scale-[1.02] transition-transform shadow-lg"
          >
            <Code className="w-5 h-5" />
            GitHub
          </a>
          <a 
            href="https://t.me" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-3 bg-[#0088cc] text-white py-4 rounded-2xl font-black hover:scale-[1.02] transition-transform shadow-lg"
          >
            <MessageCircle className="w-5 h-5" />
            تيليجرام
          </a>
        </div>
      </div>
    </div>
  );
};
