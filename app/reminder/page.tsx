'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// مكون منفصل يستخدم useSearchParams (يجب وضعه داخل Suspense)
function SharedReminderContent() {
  const searchParams = useSearchParams();
  const reminderId = searchParams.get('id');
  const [reminder, setReminder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (reminderId) {
      fetch(`/api/reminder/${reminderId}`)
        .then(res => {
          if (!res.ok) throw new Error('Reminder not found');
          return res.json();
        })
        .then(data => {
          setReminder(data);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setIsLoading(false);
        })
        .catch(err => {
          console.error(err);
          toast.error('فشل في تحميل التذكير');
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setIsLoading(false);
        });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
    }
  }, [reminderId]);

  const addToMyReminders = async () => {
    if (!reminder) {
      toast.error('لا يوجد تذكير لإضافته');
      return;
    }
    setIsAdding(true);
    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: reminder.text,
          reminderTime: reminder.reminderTime,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('تمت إضافة التذكير إلى قائمتك!');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        toast.error(data.error || 'فشل في إضافة التذكير');
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الإضافة');
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;
  }

  if (!reminder) {
    return <div className="flex items-center justify-center min-h-screen">التذكير غير موجود</div>;
  }

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