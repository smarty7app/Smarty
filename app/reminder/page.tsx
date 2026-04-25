'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

function SharedReminderContent() {
  const searchParams = useSearchParams();
  const reminderId = searchParams.get('id');
  const [reminder, setReminder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const { data: session, status } = useSession(); // ✅ جلب الجلسة

  useEffect(() => {
    if (reminderId) {
      fetch(`/api/reminder/${reminderId}`)
        .then(res => res.json())
        .then(data => {
          setReminder(data);
          setIsLoading(false);
        })
        .catch(() => {
          toast.error('فشل في تحميل التذكير');
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [reminderId]);

  // ✅ إضافة التذكير عبر API الآمن
  const addToMyReminders = async () => {
    if (!reminder) return;
    if (!session?.user?.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reminder.text || reminder.title, // حسب حقل النص الفعلي
          description: '',
          reminderTime: reminder.reminderTime,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل في الحفظ');
      }

      toast.success('تمت إضافة التذكير إلى قائمتك!');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'حدث خطأ أثناء الإضافة');
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;
  if (!reminder) return <div className="flex items-center justify-center min-h-screen">التذكير غير موجود</div>;

  // ✅ تحديد حالة المستخدم بالنسبة للزر
  const isLoggedIn = status === 'authenticated' && session?.user?.id;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">تذكير مشترك</h1>
      <p className="text-lg mb-2">{reminder.text || reminder.title}</p>
      <p className="text-sm text-gray-500 mb-6">
        {new Date(reminder.reminderTime).toLocaleString('ar-EG')}
      </p>

      {isLoggedIn ? (
        <button
          onClick={addToMyReminders}
          disabled={isAdding}
          className="px-6 py-2 bg-[#E65100] text-white rounded-full font-bold disabled:opacity-50"
        >
          {isAdding ? 'جاري الإضافة...' : 'أضف هذا التذكير لي'}
        </button>
      ) : (
        <a
          href="/login"
          className="px-6 py-2 bg-[#E65100] text-white rounded-full font-bold"
        >
          سجل الدخول لإضافة التذكير
        </a>
      )}
    </div>
  );
}

export default function SharedReminderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>}>
      <SharedReminderContent />
    </Suspense>
  );
}
