'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Info, Code, MessageCircle, Sparkles, ExternalLink } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { motion } from "motion/react";

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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gradient-to-br from-[#E65100] to-[#F97316] dark:from-black dark:to-zinc-900 text-black dark:text-white transition-all duration-500">
      {/* App Bar with glass morphism */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex items-center gap-4 p-6 bg-white/10 dark:bg-black/40 backdrop-blur-xl sticky top-0 z-10 border-b border-white/20 dark:border-white/5"
      >
        <button 
          onClick={onBack} 
          className="p-2.5 hover:bg-white/20 dark:hover:bg-white/10 rounded-2xl transition-all active:scale-90 border border-white/20 dark:border-white/10 text-white"
        >
          {isRTL ? <ChevronLeft className="w-5 h-5 rotate-180" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">{t.about}</h1>
      </motion.header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col items-center p-6 pt-8 overflow-y-auto"
      >
        {/* Logo Section with enhanced animation */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-28 h-28 bg-white dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-orange-500/30 dark:shadow-black/50 mb-5 transform hover:rotate-3 transition-transform duration-500">
            <svg className="w-14 h-14 text-[#E65100] dark:text-[#F97316]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z"/>
            </svg>
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-white drop-shadow-md">
            Smarty<span className="text-orange-200 dark:text-orange-300">®</span>
          </h2>
          <p className="text-white/60 dark:text-white/50 text-[11px] font-bold uppercase tracking-[0.3em] mt-3">
            {t.version} 2.0 PREMIUM
          </p>
        </motion.div>

        {/* Tagline Card */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-3xl p-5 w-full max-w-xs shadow-xl border border-white/20 dark:border-white/10 mb-6 text-center"
        >
          <p className="text-white text-base font-semibold tracking-wide">
            ✨ Never Forget Anything Again ✨
          </p>
        </motion.div>

        {/* Social Links - Modern & Glossy */}
        <motion.div 
          variants={itemVariants}
          className="flex gap-4 w-full max-w-md"
        >
          <a 
            href="https://github.com/17benabdallah-hue" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl active:scale-95 group"
          >
            <Code className="w-5 h-5 group-hover:rotate-3 transition-transform" />
            <span>GitHub</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
          </a>
          <a 
            href="https://t.me/share/url?url=https://smarty-lac.vercel.app/&text=جرب%20تطبيق%20Smarty%20الرائع"
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-[#0088cc] text-white py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl active:scale-95 group"
          >
            <MessageCircle className="w-5 h-5 group-hover:rotate-3 transition-transform" />
            <span>تيليجرام</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
          </a>
        </motion.div>

        {/* Visitor Counter - Modernized */}
        <motion.div 
          variants={itemVariants}
          className="mt-10 w-full max-w-md"
        >
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20 dark:border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 border border-white/20 dark:border-white/10">
                <span className="text-white/80 text-sm font-medium">👥 عدد الزوار</span>
                <div className="h-5 w-px bg-white/30 mx-1"></div>
                <span className="text-white font-black text-xl tabular-nums">
                  {loading ? (
                    <span className="inline-block w-12 h-6 bg-white/20 rounded animate-pulse" />
                  ) : (
                    (visitorCount ?? 0).toLocaleString()
                  )}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          variants={itemVariants}
          className="mt-8 text-white/40 text-[10px] font-mono tracking-wider text-center"
        >
          <p>© {new Date().getFullYear()} Smarty • {t.version} 2.0</p>
          <p className="mt-1 text-[9px] opacity-50">Made with ❤️ for smart reminders</p>
        </motion.div>
      </motion.div>
    </div>
  );
};
