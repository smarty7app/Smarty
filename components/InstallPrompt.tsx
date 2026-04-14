// components/InstallPrompt.tsx
'use client';
import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // يمنع المتصفح من عرض الإشعار الافتراضي
      setDeferredPrompt(e);
      setShowPrompt(true); // نخبر التطبيق بأن الوقت مناسب لعرض إشعارنا المخصص
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt(); // نعرض نافذة التثبيت
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
        setShowPrompt(false);
      });
    }
  };

  if (!showPrompt) return null; // لا نعرض الإشعار إذا لم يكن الوقت مناسباً

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-4 flex items-center justify-between z-50 border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📲</span>
        <div>
          <h3 className="font-bold">ثبّت Smarty!</h3>
          <p className="text-sm text-zinc-500">للوصول السريع والمواعيد الفورية</p>
        </div>
      </div>
      <button
        onClick={handleInstallClick}
        className="bg-[#E65100] text-white px-4 py-2 rounded-full font-bold text-sm"
      >
        تثبيت
      </button>
    </div>
  );
}
