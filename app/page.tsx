'use client';

import { useState, useEffect } from 'react';
import InstallPrompt from '@/components/InstallPrompt';
import SplashScreen from '@/components/SplashScreen';
import ReminderApp from '@/components/ReminderApp';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
        <ReminderApp />
        <InstallPrompt />
      </main>
    </ErrorBoundary>
  );
}
