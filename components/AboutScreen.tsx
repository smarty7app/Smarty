'use client';

import React from 'react';
import { ChevronLeft, Twitter, Facebook, Instagram, Send } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { motion } from 'motion/react';
import Image from 'next/image';  // استيراد مكون الصورة

interface AboutScreenProps {
  onBack: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  const { t, isRTL } = useLanguage();

  // رابط التطبيق للمشاركة
  const APP_URL = 'https://smarty-lac.vercel.app';
  const SHARE_TEXT = encodeURIComponent('جرب تطبيق Smarty - مساعدك الذكي للتذكيرات');

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${SHARE_TEXT}&url=${APP_URL}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${APP_URL}`,
    instagram: `https://www.instagram.com/`, // Instagram لا يدعم مشاركة مباشرة عبر رابط
    telegram: `https://t.me/share/url?url=${APP_URL}&text=${SHARE_TEXT}`,
  };

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
      {/* Logo Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-10"
      >
        <div className="w-24 h-24 bg-white rounded-[2.2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(230,81,0,0.2)] mb-6 transform -rotate-6">
  <Image
    src="/android-chrome-192x192.png"   // استخدام أيقونة PNG أكبر
    alt="Smarty Logo"
    width={96}                           // ملء الحاوية تقريباً (w-24 = 96px)
    height={96}
    className="w-full h-full object-contain scale-110"  // تكبير بسيط داخل الإطار
    priority
  />
</div>  {/* ✅ هذا السطر كان مفقوداً - إغلاق الحاوية البيضاء */}

        <h2 className="text-4xl font-black tracking-tighter text-white select-none pointer-events-none">
          Smarty<span className="text-orange-500">®</span>
        </h2>
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
          {t.version} 2.0 PREMIUM
        </p>
      </motion.div>
        {/* Social Icons */}
        <div className="flex gap-5 justify-center items-center w-full max-w-md mt-4">
          <a
            href={shareLinks.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 backdrop-blur-sm p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110 shadow-md"
            aria-label="Share on X"
          >
            <Twitter className="w-5 h-5 text-white" />
          </a>
          <a
            href={shareLinks.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 backdrop-blur-sm p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110 shadow-md"
            aria-label="Share on Facebook"
          >
            <Facebook className="w-5 h-5 text-white" />
          </a>
          <a
            href={shareLinks.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 backdrop-blur-sm p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110 shadow-md"
            aria-label="Instagram Profile"
          >
            <Instagram className="w-5 h-5 text-white" />
          </a>
          <a
            href={shareLinks.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 backdrop-blur-sm p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110 shadow-md"
            aria-label="Share on Telegram"
          >
            <Send className="w-5 h-5 text-white" />
          </a>
        </div>

        {/* Footer with Privacy & Terms */}
        <div className="mt-12 w-full max-w-md text-center">
          <div className="flex flex-wrap justify-center gap-4 text-white/60 text-xs font-medium">
            <a href="/privacy" className="hover:text-white transition-colors">
              {t.privacy_policy}
            </a>
            <span className="text-white/30">•</span>
            <a href="/terms" className="hover:text-white transition-colors">
              {t.terms_of_service}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
