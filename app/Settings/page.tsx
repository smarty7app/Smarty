'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Globe, 
  Moon, 
  Settings as SettingsIcon 
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import { LanguageCode } from '@/lib/translations';

/**
 * صفحة الإعدادات - Settings Page
 * 
 * تم إعادة تصميم أزرار اللغات مع الحفاظ على هوية التطبيق (البرتقالي، الأبيض، الأسود)
 * وحذف الأقسام غير الضرورية (الخصوصية والأمان، التحليل الذكي).
 */
export default function SettingsPage() {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const languages: { code: LanguageCode; label: string }[] = [
    { code: 'ar', label: 'العربية' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'zh', label: '中文' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-zinc-950 transition-colors duration-500">
      {/* App Bar */}
      <div className="bg-[#E65100] text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            {t.settings}
          </h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Language Section - Redesigned */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t.language}
          </h3>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-100 dark:border-white/5">
            <div className="p-4 flex flex-wrap justify-center gap-3">
              {languages.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`
                      relative px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-200
                      ${isActive 
                        ? 'bg-[#E65100] text-white shadow-md shadow-[#E65100]/20' 
                        : 'bg-transparent text-zinc-700 dark:text-zinc-300 hover:bg-[#E65100]/10 dark:hover:bg-[#E65100]/20 border border-zinc-200 dark:border-zinc-700'
                      }
                    `}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* System Preferences Section - Only Dark Mode */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            تفضيلات النظام
          </h3>
          
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-100 dark:border-white/5">
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/10 text-indigo-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                  <Moon className="w-5 h-5" />
                </div>
                <span className="font-bold text-black dark:text-white">{t.dark_mode}</span>
              </div>
              <button 
                onClick={toggleDarkMode}
                className={`w-12 h-6 rounded-full relative transition-colors ${isDark ? 'bg-[#E65100]' : 'bg-zinc-200 dark:bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDark ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        <footer className="text-center py-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-700">
            SMARTY v2.0.3 • {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}
