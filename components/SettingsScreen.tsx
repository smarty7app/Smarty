'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Settings, Moon, Globe, Trash2, RefreshCcw, LogOut, Mail, UserX } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { LanguageCode } from '@/lib/translations';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // ✅ إضافة استيراد next/image

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [isDark, setIsDark] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [isGuestMode, setIsGuestMode] = React.useState(false);
  const { language, setLanguage, t, isRTL } = useLanguage();
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/login');
    } catch (error) {
      localStorage.removeItem('nextauth.message');
      router.push('/login');
    }
  };

  // إنهاء وضع الضيف
  const handleExitGuestMode = () => {
    document.cookie = "guest_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    sessionStorage.removeItem("guest_mode");
    window.location.href = "/login";
  };

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));

    // التحقق من وضع الضيف (كوكي أو sessionStorage)
    const checkGuestMode = () => {
      const hasGuestCookie = document.cookie.includes('guest_mode=true');
      const hasGuestStorage = sessionStorage.getItem('guest_mode') === 'true';
      setIsGuestMode(hasGuestCookie || hasGuestStorage);
    };
    checkGuestMode();

    const handleStorage = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
      checkGuestMode();
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
        {/* ========== Profile Section ========== */}
        {session?.user && (
          <section className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-5 shadow-xl border border-black/5 dark:border-white/5">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Avatar - ✅ تم إصلاحه باستخدام next/image */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E65100] to-amber-500 flex items-center justify-center text-white text-xl font-bold shadow-lg overflow-hidden">
                    {session.user.image ? (
                      <Image 
                        src={session.user.image} 
                        alt={session.user.name || 'صورة المستخدم'}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // في حالة فشل تحميل الصورة، نعرض الحرف الأول من الاسم
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.textContent = session.user.name?.charAt(0) || 'U';
                            parent.classList.add('flex', 'items-center', 'justify-center');
                          }
                        }}
                      />
                    ) : (
                      <span>{session.user.name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" />
                </div>

                {/* User Info */}
                <div className="flex-1 text-center sm:text-right min-w-0">
                  <h3 className="font-bold text-black dark:text-white truncate">
                    {session.user.name || 'مستخدم Google'}
                  </h3>
                  <div className="flex items-center justify-center sm:justify-end gap-1 text-zinc-500 dark:text-zinc-400 text-sm">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{session.user.email || 'user@gmail.com'}</span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t.logout}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========== Language Section - Redesigned ========== */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-white/50 uppercase tracking-widest px-2 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t.language}
          </h3>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-black/5 dark:border-white/5">
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

        {/* ========== System Preferences (Only Dark Mode) ========== */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-white/50 uppercase tracking-widest px-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {t.system_preferences}
          </h3>
          
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-black/5 dark:border-white/5">
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/10 text-indigo-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                  <Moon className="w-5 h-5" />
                </div>
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
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${
                    isDark
                      ? isRTL
                        ? 'right-8'
                        : 'left-8'
                      : isRTL
                      ? 'right-1'
                      : 'left-1'
                  }`}
                >
                  {isDark ? <Moon className="w-3 h-3 text-[#E65100]" /> : <Moon className="w-3 h-3 text-zinc-300" />}
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* ========== Data Zone ========== */}
        <section className="space-y-3 pt-4">
          <h3 className="text-[10px] font-black text-red-500/40 uppercase tracking-[0.2em] px-4 flex items-center gap-2">
            <Trash2 className="w-3 h-3" />
            {isRTL ? 'البيانات' : 'Data Zone'}
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

        {/* ========== Guest Mode Section ========== */}
        {isGuestMode && (
          <section className="space-y-3 pt-4">
            <h3 className="text-[10px] font-black text-yellow-500/60 uppercase tracking-[0.2em] px-4 flex items-center gap-2">
              <UserX className="w-3 h-3" />
              {isRTL ? 'وضع الزائر' : 'Guest Mode'}
            </h3>
            <div className="bg-yellow-50/50 dark:bg-yellow-900/10 rounded-[1.5rem] overflow-hidden border border-yellow-500/20">
              <button
                onClick={handleExitGuestMode}
                className="w-full flex items-center justify-between p-4 hover:bg-yellow-50 dark:hover:bg-yellow-950/20 transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg text-yellow-600 shadow-sm group-hover:rotate-12 transition-transform">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-black text-yellow-700 dark:text-yellow-400">
                      {isRTL ? 'خروج' : 'Exit'}
                    </span>
                    <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold">
                      {isRTL ? 'العودة إلى شاشة تسجيل الدخول' : 'Return to login screen'}
                    </span>
                  </div>
                </div>
                <ChevronLeft className={`w-4 h-4 text-yellow-300 ${isRTL ? '' : 'rotate-180'}`} />
              </button>
            </div>
          </section>
        )}

        <footer className="text-center py-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{t.app_name} v2.0.0</p>
        </footer>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm shadow-none">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-white/10 text-center"
          >
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogOut className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-black mb-2 dark:text-white">
              {isRTL ? 'تسجيل الخروج؟' : 'Sign Out?'}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold mb-8">
              {isRTL ? 'هل أنت متأكد من رغبتك في تسجيل الخروج؟' : 'Are you sure you want to sign out?'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleLogout}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black active:scale-95"
              >
                {isRTL ? 'نعم، تسجيل الخروج' : 'Yes, Sign Out'}
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl font-bold"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Factory Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm shadow-none">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-white/10 text-center"
          >
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCcw className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-black mb-2 dark:text-white">
              {isRTL ? 'إعادة ضبط المصنع؟' : 'Factory Reset?'}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold mb-8">
              {isRTL ? 'هل أنت متأكد؟ سيتم حذف كل البيانات.' : 'Are you sure? All data will be deleted.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black active:scale-95"
              >
                {isRTL ? 'نعم، احذف الكل' : 'Yes, Delete All'}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl font-bold"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
