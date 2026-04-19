'use client';

import { useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    // إنهاء الشاشة فوراً دون أي تأخير
    onFinish();
  }, [onFinish]);

  // لا نعرض أي شيء
  return null;
}
