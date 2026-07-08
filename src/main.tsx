import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// 1. Prevent zoom on pinch/multi-touch gestures (Mobile & Tablet)
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

// 2. Prevent zoom on double tap (iOS Safari & Android)
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = (new Date()).getTime();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// 3. Prevent desktop keyboard zoom shortcuts (Ctrl/Cmd + Plus, Minus, Zero)
document.addEventListener('keydown', (e) => {
  if (
    (e.ctrlKey || e.metaKey) && 
    (e.key === '=' || e.key === '-' || e.key === '+' || e.key === '0')
  ) {
    e.preventDefault();
  }
});

// 4. Prevent desktop mouse wheel zoom (Ctrl/Cmd + scroll)
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
  }
}, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
