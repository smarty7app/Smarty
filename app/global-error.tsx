// app/global-error.tsx
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // نفس المنطق السابق، لكن هنا نعيد كتابة كامل الـ HTML
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-700">عذراً، تعطل التطبيق بشكل كامل</h1>
            <button onClick={reset} className="mt-4 rounded bg-red-600 px-4 py-2 text-white">
              إعادة التحميل
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}