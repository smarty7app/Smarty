'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SharePage() {
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
      <div className="min-h-screen bg-[#E65100] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>جاري تحويل المشاركة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E65100] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-xl">
        <div className="w-16 h-16 bg-[#E65100] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">محتوى مشارك</h1>
        {title && <p className="mb-2"><strong>العنوان:</strong> {title}</p>}
        {text && <p className="mb-2"><strong>النص:</strong> {text}</p>}
        {url && <p className="mb-4 break-all"><strong>الرابط:</strong> <a href={url} className="text-blue-500 underline">{url}</a></p>}
        <p className="text-sm text-gray-500">جاري تحويل المحتوى إلى تذكير...</p>
      </div>
    </div>
  );
}