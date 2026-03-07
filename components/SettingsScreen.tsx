'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Settings, Shield, Bell, Moon, Sparkles, Globe, Trash2, RefreshCcw } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { LanguageCode } from '@/lib/translations';

interface SettingsScreenProps {
  onBack: () => void;
}

/**
 * شاشة الإعدادات - نسخة الويب المستوحاة من SettingsScreen في أندرويد
 * Settings Screen - Web version inspired by the Android implementation
 */
export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [isDark, setIsDark] = React.useState(false);
  const [isSmartAnalysisEnabled, setIsSmartAnalysisEnabled] = React.useState(true);
  const { language, setLanguage, t, isRTL } = useLanguage();

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const smartAnalysis = localStorage.getItem('smart_analysis_enabled');
    if (smartAnalysis !== null) {
      setIsSmartAnalysisEnabled(smartAnalysis === 'true');
    }
    
    const handleStorage = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  
  const languages: { code: LanguageCode; label: string }[] = [
    { code: 'ar', label: t.arabic },
    { code: 'en', label: t.english },
    { code: 'fr', label: t.french },
    { code: 'zh', label: t.chinese },
  ];

  return (
    <div className="flex flex-col h-full bg-[#E65100] dark:bg-zinc-950 text-black dark:text-white transition-colors duration-500">
      {/* App Bar */}
      <div className="flex items-center gap-4 p-6 bg-black/10 backdrop-blur-sm sticky top-0 z-10 border-b border-white/10">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          {isRTL ? <ChevronLeft className="w-6 h-6 rotate-180" /> : <ChevronLeft className="w-6 h-6" />}
        </button>
        <h1 className="text-2xl font-black tracking-tight text-white">{t.settings}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Language Section */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-white/50 uppercase tracking-widest px-2 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t.language}
          </h3>
          
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-lg border border-black/5 dark:border-white/5">
            <div className="p-2 grid grid-cols-2 gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex items-center justify-center p-4 rounded-2xl font-bold transition-all ${
                    language === lang.code 
                      ? 'bg-[#E65100] text-white shadow-lg' 
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* System Preferences */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-white/50 uppercase tracking-widest px-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {t.system_preferences}
          </h3>
          
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-lg border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between p-6 border-b border-zinc-50 dark:border-white/5">
              <div className="flex items-center gap-4">
                <Moon className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                <div className="flex flex-col">
                  <span className="font-bold text-black dark:text-white">{t.dark_mode}</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                    {isDark ? (isRTL ? 'مفعل' : 'Enabled') : (isRTL ? 'معطل' : 'Disabled')}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  const newIsDark = !isDark;
                  setIsDark(newIsDark);
                  if (newIsDark) {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                  }
                  window.dispatchEvent(new Event('storage'));
                }}
                className={`w-14 h-7 rounded-full relative transition-all duration-300 ${isDark ? 'bg-[#E65100] shadow-inner' : 'bg-zinc-100 dark:bg-zinc-800'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${
                  isDark 
                    ? (isRTL ? 'right-8' : 'left-8') 
                    : (isRTL ? 'right-1' : 'left-1')
                }`}>
                  {isDark ? <Moon className="w-3 h-3 text-[#E65100]" /> : <Moon className="w-3 h-3 text-zinc-300" />}
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between p-6 border-b border-zinc-50 dark:border-white/5">
              <div className="flex items-center gap-4">
                <Shield className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                <span className="font-bold text-black dark:text-white">{t.privacy_security}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <Sparkles className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                <div className="flex flex-col">
                  <span className="font-bold text-black dark:text-white">{t.smart_analysis}</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t.smart_analysis_desc}</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  const newState = !isSmartAnalysisEnabled;
                  setIsSmartAnalysisEnabled(newState);
                  localStorage.setItem('smart_analysis_enabled', newState.toString());
                  window.dispatchEvent(new Event('storage'));
                }}
                className={`w-14 h-7 rounded-full relative transition-all duration-300 ${isSmartAnalysisEnabled ? 'bg-[#E65100] shadow-inner' : 'bg-zinc-100 dark:bg-zinc-800'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${
                  isSmartAnalysisEnabled 
                    ? (isRTL ? 'right-8' : 'left-8') 
                    : (isRTL ? 'right-1' : 'left-1')
                }`}>
                  {isSmartAnalysisEnabled ? <Sparkles className="w-3 h-3 text-[#E65100]" /> : <Sparkles className="w-3 h-3 text-zinc-300" />}
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-red-500/50 uppercase tracking-widest px-2 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            {isRTL ? 'منطقة الخطر' : 'Danger Zone'}
          </h3>
          
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-lg border border-red-500/10">
            <button 
              onClick={() => {
                if (confirm(isRTL ? 'هل أنت متأكد من حذف جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to reset all data? This action cannot be undone.')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="w-full flex items-center justify-between p-6 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-500 group-hover:scale-110 transition-transform">
                  <RefreshCcw className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-red-500">{isRTL ? 'إعادة ضبط المصنع' : 'Factory Reset'}</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{isRTL ? 'حذف جميع التذكيرات والإعدادات' : 'Delete all reminders and settings'}</span>
                </div>
              </div>
            </button>
          </div>
        </section>

        <footer className="text-center py-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{t.app_name} v2.0.0</p>
        </footer>
      </div>
    </div>
  );
};
