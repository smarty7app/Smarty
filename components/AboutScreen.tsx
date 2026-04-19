'use client';

import React from 'react';
import { ChevronLeft, Twitter, Facebook, Instagram, Send } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { motion } from 'motion/react';

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
    instagram: `https://www.instagram.com/`, // Instagram لا يدعم مشاركة مباشرة عبر رابط، نوجه لصفحة الملف الشخصي أو لفتح التطبيق
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
            {/* ✅ الشعار الجديد (بدلاً من الأيقونة القديمة) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              version="1.0"
              viewBox="0 0 768 768"
              className="w-12 h-12"
            >
              <g fill="#BFBFBF" strokeWidth="0">
                <path d="M128 384v256l255.8-.2 255.7-.3.3-255.8.2-255.7H128zm283.5-171.6c6 .9 26.5 6.6 32.4 9 3.4 1.4 6.1 2.2 6.1 1.8s.4-.3.8.3c.4.5 5.4 3.4 11.2 6.3 14.6 7.4 26.4 15.9 38.4 27.7 12.5 12.3 15.2 15.4 22.1 25.4 5.1 7.6 15.8 26.5 16.1 28.6.1.5 1 2.8 1.9 5 1 2.2 1.9 4.5 2.1 5.2.2 1.4 3.3 11.1 4.1 13.3.3.8.7 2.2.8 3s.7 4.4 1.3 8 1.4 8.3 1.8 10.5c.8 5.1.8 32.7 0 38-4.9 30.7-12.5 51.2-26.9 72.7-19.3 28.8-50.2 53-81.7 64.2-4.1 1.5-8.2 2.9-9 3.3-1.6.7-15.7 4.1-20 4.8-1.4.2-8.5 1-15.7 1.6-18.7 1.7-35.2.2-59.3-5.6-5.1-1.2-20.9-7.4-28.5-11.2-47.9-24-81.7-69.3-90.6-121.4-1.8-10.7-2-15.1-1.6-31.9.5-21.4 2.3-31.4 8.7-49.5 20.4-57.1 71.2-99.2 131.8-109 8.2-1.3 45.1-1.4 53.7-.1"/>
                <path d="M415.7 254.5c-9.4 1.3-30.1 6-32.2 7.3-.5.4-1.8.8-2.8.9-6.2 1-34.3 13.5-43.1 19.1-2.3 1.5-5.2 3.3-6.6 4-5.5 2.9-17.4 12.8-24.5 20.4-5.3 5.6-8.7 10.4-11.7 16.4-3.8 7.7-4.2 9.2-4.2 16.2 0 4.2.3 9 .7 10.7 2.1 7.9 9 15.7 19.2 21.5 5.3 3 21.2 8.7 26.1 9.4 1.6.2 3.6.6 4.4.9 3 1.1 37 5.9 38.9 5.5.3-.1 2 .1 3.6.5 1.7.4 5 .9 7.5 1.2 11 1.1 24.2 5 29.7 8.8 3.7 2.5 5.8 7.5 4.7 10.9-1.3 4.4-6.3 10.5-12.1 14.9-3.2 2.4-6 4.7-6.3 5-.6.7-17.4 9-21.5 10.6-20.1 7.7-47.2 10.8-64.2 7.2-9.9-2.2-15-4.6-19.2-9.5-2.7-3.1-3.2-4.3-2.9-7.5.2-2.2.2-3.9 0-3.9-1.9 0-8.7 4.9-12.5 8.9-9.3 9.9-12.7 23.4-8.2 32.1 2.6 5 8.8 10.8 14.2 13.1 21.5 9.4 66.7 4.8 106.7-10.7 21.2-8.3 49.8-24.4 61.3-34.4 4.4-3.9 5-3.8 2.1.2-5 7.1-17.8 18.8-27.8 25.4-5.8 3.8-10.8 7.3-11.1 7.7-.3.5-.9.8-1.3.7-1.3-.4-6.6 2.2-6.6 3.2 0 .5-.4.6-1 .3-.5-.3-1-.1-1 .6s-.3 1-.6.6c-.6-.6-6.4 1.9-6.4 2.8 0 1.3 16.4-5.2 29.5-11.8 35.8-17.8 56.4-43.9 54.1-68.7-1.9-20.9-22.3-34.6-58.6-39.1-4.7-.5-11.6-1.4-15.5-1.9-3.8-.4-10.8-1.1-15.5-1.5-11.3-.8-28.9-4.1-35.9-6.7-12.3-4.6-15.6-13-8.7-22 9.6-12.6 39-26.2 67.1-31 6.6-1.1 12.8-2.4 13.7-2.9 2.5-1.4 8.2-1.1 11.4.6 1.6.8 3.7 1.5 4.6 1.5 2.1 0 6.9 2.1 8.6 3.7 3.9 3.7 2 10.6-4.4 16.3-3.2 2.7-3.4 3.1-1.3 2.5 4.9-1.5 12.8-6.6 16.9-11.1 6.2-6.7 8.4-12.4 8.5-21.5 0-6.7-.3-8.1-3-12.5-3.7-6-10.4-10.7-19.3-13.5-8.7-2.7-29.5-3.4-43.5-1.4m-26 132.1c-.3.3-1.2.4-1.9.1-.8-.3-.5-.6.6-.6 1.1-.1 1.7.2 1.3.5m47.8 75.4c-.3.5-1.2 1-1.8 1-.7 0-.6-.4.3-1 1.9-1.2 2.3-1.2 1.5 0m-115.8 20.6c-.3.3-1.2.4-1.9.1-.8-.3-.5-.6.6-.6 1.1-.1 1.7.2 1.3.5m8.1.1c-1 .2-2.8.2-4 0-1.3-.2-.5-.4 1.7-.4 2.2-.1 3.2.1 2.3.4"/>
                <path d="M404 476c-.9.6-1 1-.3 1 .6 0 1.5-.5 1.8-1 .8-1.2.4-1.2-1.5 0"/>
              </g>
              <path fill="#BF8080" d="M497 254.4c0 .2.8 1 1.8 1.7 1.5 1.3 1.6 1.2.3-.4s-2.1-2.1-2.1-1.3m-233.1 6.3-3.4 3.8 3.8-3.4c3.4-3.3 4.2-4.1 3.4-4.1-.2 0-1.9 1.7-3.8 3.7m242.1 2.7c0 .2.8 1 1.8 1.7 1.5 1.3 1.6 1.2.3-.4s-2.1-2.1-2.1-1.3m-197.6 39.8-2.9 3.3 3.3-2.9c1.7-1.7 3.2-3.1 3.2-3.3 0-.8-.8-.1-3.6 2.9m163.5 1.5c-1.3 1.6-1.2 1.7.4.4.9-.7 1.7-1.5 1.7-1.7 0-.8-.8-.3-2.1 1.3m-113 16c-1.3 1.6-1.2 1.7.4.4s2.1-2.1 1.3-2.1c-.2 0-1 .8-1.7 1.7m66.2 84.9c0 1.1.3 1.4.6.6.3-.7.2-1.6-.1-1.9-.3-.4-.6.2-.5 1.3m-7.7 13.6-1.9 2.3 2.3-1.9c1.2-1.1 2.2-2.1 2.2-2.3 0-.8-.8-.2-2.6 1.9m-130 13-1.9 2.3 2.3-1.9c1.2-1.1 2.2-2.1 2.2-2.3 0-.8-.8-.2-2.6 1.9m217.5 57.5-2.4 2.8 2.8-2.4c1.5-1.4 2.7-2.6 2.7-2.8 0-.8-.8-.1-3.1 2.4M265 492.2c4.1 4.5 5 5.3 5 4.5 0-.2-2.1-2.3-4.7-4.7l-4.8-4.5zm233.4 4-1.9 2.3 2.3-1.9c2.1-1.8 2.7-2.6 1.9-2.6-.2 0-1.2 1-2.3 2.2m-121.6 45.5c1.2.2 3 .2 4 0 .9-.3-.1-.5-2.3-.4-2.2 0-3 .2-1.7.4m12.5 0c.9.2 2.3.2 3 0 .6-.3-.1-.5-1.8-.5-1.6 0-2.2.2-1.2.5"/>
              <path fill="#BF8040" d="M500 257.3c0 .2 1.5 1.6 3.3 3.3l3.2 2.9-2.9-3.3c-2.8-3-3.6-3.7-3.6-2.9m-64.2 34.4c.7.3 1.6.2 1.9-.1.4-.3-.2-.6-1.3-.5-1.1 0-1.4.3-.6.6m27.3 9.9c0 1.1.3 1.4.6.6.3-.7.2-1.6-.1-1.9-.3-.4-.6.2-.5 1.3m-10.2 143.1-2.4 2.8 2.8-2.4c1.5-1.4 2.7-2.6 2.7-2.8 0-.8-.8-.1-3.1 2.4M281 471.4c0 .2.8 1 1.8 1.7 1.5 1.3 1.6 1.2.3-.4s-2.1-2.1-2.1-1.3m39.3 13.3c.9.2 2.5.2 3.5 0 .9-.3.1-.5-1.8-.5s-2.7.2-1.7.5m63 57c.9.2 2.5.2 3.5 0 .9-.3.1-.5-1.8-.5s-2.7.2-1.7.5"/>
              <path fill="#BF4040" d="M325.8 484.7c.6.2 1.8.2 2.5 0 .6-.3.1-.5-1.3-.5s-1.9.2-1.2.5"/>
              <path fill="#BF4000" d="M361.6 212.6c-85.3 11.6-148.3 86-144.3 170.4.6 11.3 2.8 27.1 4.4 31 .3.8.6 1.8.5 2.2-.5 2.1 7.3 22.9 12.1 32.4 17 33.6 44.2 60.3 77.9 76.4 9.9 4.7 27.2 10.9 32 11.4 1.3.1 2.8.5 3.4.8.5.4 6.2 1.4 12.5 2.4 15.3 2.2 43 1.5 57.1-1.5 33.2-7.2 61-22.2 84.8-46 7-7 14.7-15.5 17.2-19.1 6.4-9.1 13.8-21.7 13.1-22.4-.4-.3-.1-.6.6-.6s.9-.5.6-1c-.3-.6-.2-1 .3-1 1.6 0 11.6-26.2 10.5-27.4-.3-.2-.1-1.1.3-1.8 1-1.6 1-1.4 3.5-12.3 3.6-15.8 2.8-63.6-1.2-66.1-.5-.3-.7-1-.3-1.5.3-.5.1-1.6-.5-2.3-.7-.8-1.1-1.8-1-2.2.1-.5.1-1.1-.1-1.4-.1-.3-.3-1.5-.6-2.7-1.6-9-10-27.5-18.2-40.6-35-55.8-99.5-86-164.6-77.1m94 41.9c17 3.9 26.7 13.9 26.7 27.5 0 13.9-9.6 26.5-24.6 32.2-6 2.3-7.1 1.8-2.3-1 6.2-3.7 9.3-11.2 6.6-16.1-1.9-3.6-8.7-5.4-20-5.4-30.7.1-73 16.3-85.5 32.7-1.5 1.9-2.9 5.3-3.2 7.6-.5 3.6-.2 4.3 3.3 7.8 3.9 3.9 12.9 7.7 20.2 8.7 1.7.2 3.9.6 4.9.9 1.7.5 36.9 4.4 40.3 4.4 3.4.1 22 3.4 29.5 5.3 4.4 1.1 12.1 4 17.1 6.4 15.5 7.5 22.4 17.7 22.4 32.9 0 14.8-6.1 27.7-19.5 41.2-10.4 10.6-21.1 17.9-38.7 26.4-11.6 5.6-37.3 14.8-38.4 13.7-.3-.3 1.2-1 3.3-1.7s4.8-1.9 6.1-2.6c1.2-.8 2.2-1.2 2.2-.9 0 1.1 20.8-9.9 28.9-15.3 8.9-5.9 20.1-15.8 25.4-22.6l3.2-4.1-4 3.1c-54 42-145.3 62.5-174.6 39.4-5.9-4.8-9.3-12.3-8.7-19.8.8-11.1 8.7-23.1 18.8-28.6 2.8-1.5 5.3-2.6 5.6-2.3.3.2-.1 1.7-.8 3.1-2.5 5.7 4.4 12.9 16.4 16.9 8.5 2.8 33 3 45.8.3 32.6-6.7 61.2-24 62.7-37.8.4-3.8.1-4.7-2.3-7.2-5.2-5.2-15.5-8.4-35.4-11.1-6.3-.8-18.4-2.4-26.8-3.5-36.7-4.9-57.4-13.9-66.2-28.6-3.4-5.7-3.5-6.1-3.5-16.4v-10.5l4.5-8.5c14.6-27.8 59.4-54.4 109.5-65.1 8.9-1.9 39.5-4.2 43.3-3.2.7.1 4.2 1 7.8 1.8"/>
              <path fill="#FFBFBF" d="M437 290c-1.1.7.4 1 4.8 1 4 0 6.1-.4 5.7-1-.8-1.3-8.5-1.3-10.5 0m-46.2 61.7c.7.3 1.6.2 1.9-.1.4-.3-.2-.6-1.3-.5-1.1 0-1.4.3-.6.6m37 4c.7.3 1.6.2 1.9-.1.4-.3-.2-.6-1.3-.5-1.1 0-1.4.3-.6.6m123.3 5.9c0 1.1.3 1.4.6.6.3-.7.2-1.6-.1-1.9-.3-.4-.6.2-.5 1.3m-163.3 25.1c.7.3 1.6.2 1.9-.1.4-.3-.2-.6-1.3-.5-1.1 0-1.4.3-.6.6m163.3 2.9c0 1.1.3 1.4.6.6.3-.7.2-1.6-.1-1.9-.3-.4-.6.2-.5 1.3m-218.3 58.1c.7.3 1.6.2 1.9-.1.4-.3-.2-.6-1.3-.5-1.1 0-1.4.3-.6.6m8 0c.7.3 1.6.2 1.9-.1.4-.3-.2-.6-1.3-.5-1.1 0-1.4.3-.6.6M436 462c-.9.6-1 1-.3 1 .6 0 1.5-.5 1.8-1 .8-1.2.4-1.2-1.5 0m-116.2 20.7c.7.3 1.6.2 1.9-.1.4-.3-.2-.6-1.3-.5-1.1 0-1.4.3-.6.6m6 0c1.2.2 3 .2 4 0 .9-.3-.1-.5-2.3-.4-2.2 0-3 .2-1.7.4"/>
            </svg>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white select-none pointer-events-none">
            Smarty<span className="text-orange-500">®</span>
          </h2>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
            {t.version} 2.0 PREMIUM
          </p>
        </motion.div>

        {/* Social Icons - عصرية واحترافية */}
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
