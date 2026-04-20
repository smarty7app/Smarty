'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
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

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-4 flex items-center justify-between border border-zinc-200 dark:border-zinc-700 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#E65100] rounded-xl flex items-center justify-center overflow-hidden">
          <Image
            src="/maskable_icon_x384.png"
            alt="Smarty Logo"
            width={40}
            height={40}
            className="w-full h-full object-cover"
            priority
          />
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
