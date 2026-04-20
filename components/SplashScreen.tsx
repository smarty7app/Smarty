'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // تأخير لمدة 1.5 ثانية ثم إخفاء الشاشة والانتقال
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 200);
    }, 1500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
        >
          {/* الشعار في المنتصف */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-32 h-32 md:w-40 md:h-40"
          >
            <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl shadow-white/10">
              <Image
                src="/maskable_icon_x384.png"
                alt="Smarty Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
