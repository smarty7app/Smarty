'use client';

import { useState } from 'react';
import SplashScreen from '@/components/SplashScreen';
import ReminderApp from '@/components/ReminderApp';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-surface text-on-surface">
        <ReminderApp />
      </main>
    </ErrorBoundary>
  );
}
