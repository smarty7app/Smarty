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
    }, 2500); // مدة أقصر قليلاً لأن الشعار فقط
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

      {/* الشعار فقط */}
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
            <svg className="w-14 h-14 md:w-20 md:h-20 text-[#E65100]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z"/>
            </svg>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
