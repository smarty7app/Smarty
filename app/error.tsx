// app/error.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // ✅ هنا تظهر التفاصيل للمطور فقط (في وحدة التحكم)
    console.group('🚨 تفاصيل الخطأ التقني (للمطور فقط)');
    console.error('اسم الخطأ:', error.name);
    console.error('رسالة الخطأ:', error.message);
    console.error('تتبع المكدس:', error.stack);
    if (error.digest) {
      console.error('معرف الخطأ (digest):', error.digest);
    }
    console.groupEnd();

    // 🟢 يمكنك إرسال الخطأ إلى خدمة خارجية (مثل Sentry) هنا
    // logErrorToService(error);
  }, [error]);

  const handleReset = () => {
    reset(); // محاولة إعادة تحميل الصفحة أو استعادة الحالة
  };

  const goHome = () => {
    router.push('/');
  };

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-white p-4 text-center dark:from-zinc-950 dark:to-zinc-900">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl dark:bg-zinc-900">
            {/* أيقونة خطأ بسيطة */}
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h1 className="mb-2 text-2xl font-bold text-zinc-800 dark:text-white">
              عذراً، حدث خلل غير متوقع
            </h1>
            <p className="mb-6 text-zinc-500 dark:text-zinc-400">
              فريقنا يعمل على حل المشكلة. يرجى المحاولة مرة أخرى لاحقاً.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleReset}
                className="flex-1 rounded-xl bg-[#E65100] py-3 font-bold text-white transition hover:bg-[#BF3F00]"
              >
                إعادة المحاولة
              </button>
              <button
                onClick={goHome}
                className="flex-1 rounded-xl border border-zinc-200 bg-white py-3 font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
              >
                العودة للرئيسية
              </button>
            </div>

            {/* في بيئة التطوير فقط، نعرض معرف الخطأ (بدون تفاصيل تقنية) */}
            {process.env.NODE_ENV === 'development' && error.digest && (
              <p className="mt-4 text-xs text-zinc-400">
                رمز الخطأ: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}