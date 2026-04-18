'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function SharedReminderContent() {
  const searchParams = useSearchParams();
  const reminderId = searchParams.get('id');
  const [reminder, setReminder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

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

  const addToMyReminders = () => {
    if (!reminder) return;
    setIsAdding(true);
    try {
      // 1. جلب التذكيرات الحالية من localStorage
      const existing = JSON.parse(localStorage.getItem('smarty_reminders') || '[]');
      // 2. إنشاء تذكير جديد بنفس الصيغة
      const newReminder = {
        id: Math.random().toString(36).substr(2, 9),
        text: reminder.text,
        reminderTime: reminder.reminderTime,
        isCompleted: false,
      };
      // 3. إضافة التذكير الجديد في البداية
      const updated = [newReminder, ...existing];
      // 4. حفظ في localStorage
      localStorage.setItem('smarty_reminders', JSON.stringify(updated));
      toast.success('تمت إضافة التذكير إلى قائمتك!');
      // 5. التوجيه إلى الصفحة الرئيسية
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الإضافة');
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;
  if (!reminder) return <div className="flex items-center justify-center min-h-screen">التذكير غير موجود</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">تذكير مشترك</h1>
      <p className="text-lg mb-2">{reminder.text}</p>
      <p className="text-sm text-gray-500 mb-6">
        {new Date(reminder.reminderTime).toLocaleString('ar-EG')}
      </p>
      <button
        onClick={addToMyReminders}
        disabled={isAdding}
        className="px-6 py-2 bg-[#E65100] text-white rounded-full font-bold disabled:opacity-50"
      >
        {isAdding ? 'جاري الإضافة...' : 'أضف هذا التذكير لي'}
      </button>
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
