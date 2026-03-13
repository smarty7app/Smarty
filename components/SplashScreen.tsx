'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react'; // أيقونة الجرس

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 600); // ننتظر انتهاء تأثير الاختفاء
    }, 2800); // زيادة طفيفة في المدة لتظهر الحركات الجديدة

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#0A0F1E] via-[#0F172A] to-[#020617]"
    >
      {/* طبقة خلفية متحركة (جسيمات خفيفة) */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: '50%', y: '50%', opacity: 0 }}
            animate={{
              x: `${Math.random() * 200 - 100}%`,
              y: `${Math.random() * 200 - 100}%`,
              opacity: [0, 0.15, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
            className="absolute w-0.5 h-0.5 bg-white/10 rounded-full"
          />
        ))}
      </div>

      {/* الحاوية الرئيسية */}
      <div className="relative z-10 flex flex-col items-center">
        {/* حلقة متوهجة خلف الشعار */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.3, opacity: 0.2 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute w-64 h-64 rounded-full bg-[#E65100]/20 blur-3xl"
        />

        {/* الشعار بحجم أكبر وتأثير ثلاثي الأبعاد خفيف */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -5 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="relative"
        >
          <motion.img
            src="/icons/launchericon-512x512.png"
            alt="Smarty Logo"
            className="w-40 h-40 md:w-56 md:h-56 drop-shadow-2xl"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
        </motion.div>

        {/* اسم Smarty مع جرس صغير بجانبه */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
          className="flex items-center gap-3 mt-6"
        >
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight">
            Smarty
          </h1>
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ delay: 1.8, duration: 1, repeat: Infinity, repeatDelay: 3 }}
          >
            <Bell className="w-8 h-8 md:w-10 md:h-10 text-[#E65100] fill-[#E65100]/20" />
          </motion.div>
        </motion.div>

        {/* العبارة الجديدة: Never Forget Anything Again */}
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="mt-4 text-sm md:text-base text-zinc-300 font-light tracking-widest uppercase"
        >
          Never Forget Anything Again
        </motion.p>

        {/* خط فاصل أنيق يظهر في النهاية */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '40%' }}
          transition={{ delay: 1.9, duration: 0.8 }}
          className="mt-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
      </div>
    </motion.div>
  );
}
