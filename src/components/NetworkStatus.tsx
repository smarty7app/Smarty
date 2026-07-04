import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

interface NetworkStatusProps {
  isRtl: boolean;
  lang: string;
}

export default function NetworkStatus({ isRtl, lang }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      // Hide "Online" message after 3 seconds
      setTimeout(() => setShowStatus(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getLabel = (ar: string, fr: string, en: string) => {
    if (lang === 'ar') return ar;
    if (lang === 'fr') return fr;
    return en;
  };

  return (
    <AnimatePresence>
      {(showStatus || !isOnline) && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full border shadow-2xl backdrop-blur-md flex items-center gap-2"
          style={{
            backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'
          }}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-400">
                {getLabel('أنت متصل الآن • جاري المزامنة', 'Vous êtes en ligne', 'You are online • Syncing')}
              </span>
              <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-400" />
              <span className="text-[11px] font-bold text-red-400">
                {getLabel('وضع عدم الاتصال • سيتم المزامنة لاحقاً', 'Mode hors ligne', 'Offline Mode • Syncing later')}
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
