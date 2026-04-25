'use client';

import { Suspense, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';

function ShareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasRedirected = useRef(false);

  // ✅ نحسب القيم مباشرة من searchParams بدلاً من useState + useEffect
  const sharedTitle = searchParams.get('title') || '';
  const sharedText = searchParams.get('text') || '';
  const sharedUrl = searchParams.get('url') || '';
  const hasContent = sharedTitle || sharedText || sharedUrl;
  const reminderText = useMemo(
    () => [sharedTitle, sharedText, sharedUrl].filter(Boolean).join(' '),
    [sharedTitle, sharedText, sharedUrl]
  );

  // ✅ ننفذ التوجيه مرة واحدة فقط
  useEffect(() => {
    if (!hasRedirected.current) {
      hasRedirected.current = true;
      const timer = setTimeout(() => {
        router.push(`/?shareText=${encodeURIComponent(reminderText)}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [router, reminderText]);

  // ✅ حالة عدم وجود معاملات مشاركة
  if (!hasContent) {
    return (
      <div className="min-h-screen bg-[#E65100] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-xl text-center">
          <h1 className="text-2xl font-bold mb-4">رابط المشاركة غير صالح</h1>
          <p className="text-gray-500">لم يتم توفير أي محتوى للمشاركة.</p>
        </div>
      </div>
    );
  }

  // ✅ حالة المشاركة الصالحة
  return (
    <div className="min-h-screen bg-[#E65100] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-xl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, rotate: -5 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative w-20 h-20 mx-auto mb-5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#E65100] to-[#FF8C42] rounded-2xl rotate-6 shadow-xl" />
          <div className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center shadow-inner">
            <svg className="w-10 h-10 text-[#E65100]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z"/>
            </svg>
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold mb-2">محتوى مشارك</h1>
        {sharedTitle && <p className="mb-2"><strong>العنوان:</strong> {sharedTitle}</p>}
        {sharedText && <p className="mb-2"><strong>النص:</strong> {sharedText}</p>}
        {sharedUrl && <p className="mb-4 break-all"><strong>الرابط:</strong> <a href={sharedUrl} className="text-blue-500 underline">{sharedUrl}</a></p>}
        <p className="text-sm text-gray-500">جاري تحويل المحتوى إلى تذكير...</p>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#E65100] flex items-center justify-center text-white">جاري التحميل...</div>}>
      <ShareContent />
    </Suspense>
  );
}
