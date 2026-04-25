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
  const { data: session } = useSession();

  useEffect(() => {
    if (reminderId) {
      fetch(`/api/reminder/${reminderId}`)
        .then((res) => res.json())
        .then((data) => setReminder(data))
        .catch(() => {
          // لا نعرض خطأ للمستخدم
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [reminderId]);

  // حفظ محلي (يستخدم للزوار أو عند فشل الخادم)
  const saveLocally = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('smarty_reminders') || '[]');
      const newReminder = {
        id: Math.random().toString(36).substr(2, 9),
        text: reminder.text || reminder.title,
        reminderTime: reminder.reminderTime,
        isCompleted: false,
      };
      const updated = [newReminder, ...existing];
      localStorage.setItem('smarty_reminders', JSON.stringify(updated));
    } catch (e) {
      // لا شيء
    }
  };

  const addToMyReminders = async () => {
    if (!reminder) return;
    setIsAdding(true);

    try {
      // إذا كان المستخدم مسجلاً نحاول الحفظ في قاعدة البيانات
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: reminder.text || reminder.title,
              description: '',
              reminderTime: reminder.reminderTime,
            }),
          });

          if (!response.ok) {
            // فشل الخادم – نلجأ للحفظ المحلي
            saveLocally();
          }
          // إذا نجح الخادم، التذكير حُفظ في السحابة ولا داعي للمحلي
        } catch {
          // خطأ شبكة – نحفظ محلياً
          saveLocally();
        }
      } else {
        // زائر – نحفظ محلياً فقط
        saveLocally();
      }
    } finally {
      // دائماً نظهر نجاح، ولا تظهر أي أخطاء
      toast.success('تمت إضافة التذكير إلى قائمتك!');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        جاري التحميل...
      </div>
    );
  }

  if (!reminder) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        التذكير غير موجود
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">تذكير مشترك</h1>
      <p className="text-lg mb-2">{reminder.text || reminder.title}</p>
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
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          جاري التحميل...
        </div>
      }
    >
      <SharedReminderContent />
    </Suspense>
  );
}
