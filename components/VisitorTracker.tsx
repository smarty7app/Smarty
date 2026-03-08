'use client';

import { useEffect } from 'react';

export default function VisitorTracker() {
  useEffect(() => {
    // نتأكد أننا لا نتبع الزائر في وضع التطوير
    if (process.env.NODE_ENV !== 'production') return;

    const trackVisitor = async () => {
      try {
        await fetch('/api/track-visitor', { method: 'POST' });
      } catch (err) {
        console.error('Failed to track visitor:', err);
      }
    };
    
    trackVisitor();
  }, []);

  return null; // هذا المكون لا يعرض أي شيء
}
