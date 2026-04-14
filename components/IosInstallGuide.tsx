// components/IosInstallGuide.tsx
'use client';
import { useState, useEffect } from 'react';

export default function IosInstallGuide() {
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  if (!isIos || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-4 text-center z-50 border border-zinc-200 dark:border-zinc-700">
      <p className="text-sm font-bold">📲 لتثبيت التطبيق:</p>
      <p className="text-xs text-zinc-500 mt-1">اضغط على زر المشاركة <span className="inline-block mx-1">⎙</span> ثم اختر <span className="font-bold">"إلى الشاشة الرئيسية"</span>.</p>
    </div>
  );
}
