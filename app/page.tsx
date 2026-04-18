'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import ReminderApp from '@/components/ReminderApp';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// مكون منفصل يستخدم useSearchParams (يجب وضعه داخل Suspense)
function HomeContent() {
  const searchParams = useSearchParams();
  const [initialReminderText, setInitialReminderText] = useState<string | null>(null);

  useEffect(() => {
    const sharedText = searchParams.get('shareText');
    if (sharedText) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialReminderText(decodeURIComponent(sharedText));
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  return <ReminderApp initialReminderText={initialReminderText} />;
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('smarty_splash_seen');
    if (hasSeenSplash) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSplash(false);
    }
  }, []);

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
        <Suspense fallback={<div className="text-center p-8">جاري التحميل...</div>}>
          <HomeContent />
        </Suspense>
      </main>
    </ErrorBoundary>
  );
}