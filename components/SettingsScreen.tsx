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
  const [showResetConfirm, setShowResetConfirm] = React.useState(false); 
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
  
  {/* أضفنا dir="ltr" هنا لتوحيد منطق الحركة تقنياً مع الحفاظ على النصوص صحيحة */}
  <div dir="ltr" className="bg-white dark:bg-zinc-900 rounded-[2rem] p-1.5 shadow-xl border border-black/5 dark:border-white/5 relative flex items-center h-16">
    <motion.div
      initial={false}
      animate={{
        // الآن الحركة دائماً موجبة لأننا ثبتنا الاتجاه لليسار تقنياً
        x: (languages.findIndex(l => l.code === language) * 100) + '%'
      }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="absolute top-1.5 bottom-1.5 rounded-2xl bg-[#E65100] shadow-lg shadow-orange-500/30"
      style={{ 
        width: `calc(${100 / languages.length}% - 0.75rem)`,
        left: '0.375rem'
      }}
    />

    {languages.map((lang) => (
      <button
        key={lang.code}
        onClick={() => setLanguage(lang.code)}
        className={`relative z-10 flex-1 h-full flex items-center justify-center font-black text-xs tracking-wider transition-colors duration-300 ${
          language === lang.code 
            ? 'text-white' 
            : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
        }`}
      >
        {/* نستخدم النص كما هو أو نحوله لـ UpperCase إذا لم يكن عربياً فقط */}
        {lang.code === 'ar' ? lang.label : lang.label.toUpperCase()}
      </button>
    ))}
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
        <section className="space-y-3 pt-4">
          <h3 className="text-[10px] font-black text-red-500/40 uppercase tracking-[0.2em] px-4 flex items-center gap-2">
            <Trash2 className="w-3 h-3" />
            {isRTL ? 'منطقة الخطر' : 'Danger Zone'}
          </h3>
          
          <div className="bg-red-50/50 dark:bg-red-900/10 rounded-[1.5rem] overflow-hidden border border-red-500/10">
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg text-red-500 shadow-sm group-hover:rotate-12 transition-transform">
                  <RefreshCcw className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-black text-red-600 dark:text-red-400">
                    {isRTL ? 'إعادة ضبط المصنع' : 'Factory Reset'}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-bold">
                    {isRTL ? 'حذف كل البيانات' : 'Clear all data'}
                  </span>
                </div>
              </div>
              <ChevronLeft className={`w-4 h-4 text-red-200 ${isRTL ? '' : 'rotate-180'}`} />
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
