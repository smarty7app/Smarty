'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // إخفاء الشاشة بعد 2.5 ثانية
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 500); // ننتظر انتهاء تأثير الاختفاء
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#020617]"
    >
      {/* الشعار مع تأثير تضخم */}
      <motion.img
        src="/icons/launchericon-512x512.png" // ضع مسار شعارك هنا
        alt="Smarty Logo"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="w-32 h-32 md:w-48 md:h-48 drop-shadow-2xl"
      />

      {/* اسم التطبيق يظهر ببطء */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="mt-4 text-3xl md:text-4xl font-bold text-white"
      >
        Smarty
      </motion.h1>

      {/* شعار Premium */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="mt-2 text-sm text-amber-400 font-medium"
      >
        PREMIUM
      </motion.p>
    </motion.div>
  );
}
