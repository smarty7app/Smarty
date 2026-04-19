'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  const [particles] = useState(() =>
    [...Array(15)].map(() => ({
      startX: Math.random() * 100,
      startY: Math.random() * 100,
      deltaX: Math.random() * 200 - 100,
      deltaY: Math.random() * 200 - 100,
      duration: 4 + Math.random() * 3,
      delay: Math.random() * 2,
    }))
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 600);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
    >
      {/* جسيمات خلفية */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            initial={{ x: `${p.startX}%`, y: `${p.startY}%`, opacity: 0 }}
            animate={{
              x: `${p.startX + p.deltaX}%`,
              y: `${p.startY + p.deltaY}%`,
              opacity: [0, 0.15, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
            }}
            className="absolute w-0.5 h-0.5 bg-white/10 rounded-full"
          />
        ))}
      </div>

      {/* الشعار الجديد من الأيقونات */}
      <div className="relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.3, opacity: 0.15 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute w-64 h-64 rounded-full bg-[#E65100]/20 blur-3xl"
        />

        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
          className="group"
        >
          <div className="w-28 h-28 md:w-36 md:h-36 bg-white rounded-2xl flex items-center justify-center shadow-2xl transform -rotate-6 transition-transform group-hover:rotate-0 duration-300">
            
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
