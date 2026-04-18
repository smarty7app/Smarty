'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

// مكون منفصل يستخدم useSearchParams (يجب وضعه داخل Suspense)
function ShareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sharedTitle = searchParams.get('title') || '';
    const sharedText = searchParams.get('text') || '';
    const sharedUrl = searchParams.get('url') || '';
    setTitle(sharedTitle);
    setText(sharedText);
    setUrl(sharedUrl);
    setIsLoading(false);

    const timer = setTimeout(() => {
      const reminderText = [sharedTitle, sharedText, sharedUrl].filter(Boolean).join(' ');
      router.push(`/?shareText=${encodeURIComponent(reminderText)}`);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E65100] to-[#BF3F00] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="font-bold">جاري تحويل المشاركة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E65100] to-[#BF3F00] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
        {/* أيقونة احترافية متحركة */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative w-20 h-20 mx-auto mb-6"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[#E65100] to-[#FF8C42] rounded-2xl rotate-6 shadow-xl" />
          <div className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center shadow-inner">
            <svg className="w-10 h-10 text-[#E65100]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z"/>
            </svg>
          </div>
        </motion.div>

        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">محتوى مشارك</h1>
        <p className="text-white/70 text-sm mb-6">جاري التحويل إلى تذكير ذكي...</p>

        {title && (
          <div className="bg-white/10 rounded-xl p-3 mb-3 text-right">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">العنوان</span>
            <p className="text-white font-semibold">{title}</p>
          </div>
        )}
        {text && (
          <div className="bg-white/10 rounded-xl p-3 mb-3 text-right">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">النص</span>
            <p className="text-white font-semibold">{text}</p>
          </div>
        )}
        {url && (
          <div className="bg-white/10 rounded-xl p-3 mb-6 text-right break-all">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">الرابط</span>
            <a href={url} className="text-white/80 underline block text-sm">{url}</a>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
          <div className="animate-pulse w-2 h-2 bg-white rounded-full" />
          <span>جارٍ التحميل إلى التطبيق...</span>
        </div>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-[#E65100] to-[#BF3F00] flex items-center justify-center text-white">جاري التحميل...</div>}>
      <ShareContent />
    </Suspense>
  );
}
