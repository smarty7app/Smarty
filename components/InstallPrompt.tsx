'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // التحقق إذا كان التطبيق مثبتاً بالفعل (يعمل كـ PWA)
    const checkStandalone = () => {
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      setIsStandalone(isInStandaloneMode);
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('✅ User accepted the install prompt');
          setShowPrompt(false);
        } else {
          console.log('❌ User dismissed the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  // لا نعرض الإشعار إذا كان التطبيق مثبتاً أو لم يظهر حدث التثبيت
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-4 flex items-center justify-between border border-zinc-200 dark:border-zinc-700 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#E65100] rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z"/>
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-black dark:text-white text-sm">ثبّت Smarty</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">للوصول السريع والإشعارات</p>
        </div>
      </div>
      <button
        onClick={handleInstallClick}
        className="bg-[#E65100] text-white px-5 py-2 rounded-full font-bold text-sm shadow-lg hover:opacity-90 transition"
      >
        تثبيت
      </button>
    </div>
  );
}
