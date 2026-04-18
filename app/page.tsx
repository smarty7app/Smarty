'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import SplashScreen from '@/components/SplashScreen';
import ReminderApp from '@/components/ReminderApp';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Home() {
  const searchParams = useSearchParams();
  const [showSplash, setShowSplash] = useState(true);
  const [initialReminderText, setInitialReminderText] = useState<string | null>(null);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('smarty_splash_seen');
    if (hasSeenSplash) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSplash(false);
    }
  }, []);

  useEffect(() => {
    const sharedText = searchParams.get('shareText');
    if (sharedText) {
      setInitialReminderText(decodeURIComponent(sharedText));
      // إزالة المعامل من الرابط بعد الاستخدام
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  const handleSplashFinish = () => {
    setShowSplash(false);
    sessionStorage.setItem('smarty_splash_seen', 'true');
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-surface text-on-surface">
        <ReminderApp initialReminderText={initialReminderText} />
      </main>
    </ErrorBoundary>
  );
}