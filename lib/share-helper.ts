// lib/share-helper.ts
import { nanoid } from 'nanoid';

interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
}

interface ShareResult {
  success: boolean;
  message: string;
  url?: string;
}

export const ShareHelper = {
  /**
   * مشاركة تذكير عبر Web Share API أو نسخ الرابط إلى الحافظة
   * @param reminder - كائن التذكير (نص، وقت، إلخ)
   * @returns نتيجة العملية مع الرابط العميق (إذا تم إنشاؤه)
   */
  shareReminder: async (reminder: { text: string; reminderTime: string }): Promise<ShareResult> => {
    try {
      // 1. إنشاء معرف فريد للتذكير
      const reminderId = nanoid(12); // 12 حرفًا عشوائيًا

      // 2. إرسال التذكير إلى API لحفظه مؤقتًا مع المعرف
      const response = await fetch('/api/share-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reminderId,
          text: reminder.text,
          reminderTime: reminder.reminderTime,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save shared reminder');
      }

      // 3. بناء الرابط العميق
      const appUrl = `https://smarty-lac.vercel.app/reminder?id=${reminderId}`;
      // أو استخدم الرابط المحلي أثناء التطوير
      // const appUrl = `http://localhost:3000/reminder?id=${reminderId}`;

      // 4. محاولة المشاركة عبر Web Share API
      if (navigator.share && navigator.canShare?.({ url: appUrl })) {
        await navigator.share({
          title: 'تذكير من Smarty',
          text: reminder.text,
          url: appUrl,
        });
        return { success: true, message: 'تمت المشاركة بنجاح', url: appUrl };
      } else {
        // الحل البديل: نسخ الرابط إلى الحافظة
        await navigator.clipboard.writeText(appUrl);
        return { success: true, message: 'تم نسخ رابط التذكير إلى الحافظة', url: appUrl };
      }
    } catch (error: any) {
      console.error('Share error:', error);
      // في حالة الفشل، نعود إلى الطريقة القديمة (نص عادي)
      const formattedDate = new Date().toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const textToShare = `📋 تذكير: ${reminder.text}\n\n📅 ${formattedDate}\n\n💡 تم عبر تطبيق Smarty`;
      
      if (navigator.share) {
        try {
          await navigator.share({ title: 'مشاركة التذكير', text: textToShare });
          return { success: true, message: 'تمت المشاركة كنص' };
        } catch (shareError) {
          return ShareHelper.copyToClipboard(textToShare);
        }
      } else {
        return ShareHelper.copyToClipboard(textToShare);
      }
    }
  },

  /**
   * نسخ النص إلى الحافظة
   */
  copyToClipboard: async (text: string): Promise<ShareResult> => {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, message: 'تم نسخ التذكير إلى الحافظة' };
    } catch (error: any) {
      console.error('Clipboard error:', error);
      if (error.name === 'NotAllowedError') {
        return { success: false, message: 'الرجاء السماح بالوصول إلى الحافظة' };
      }
      return { success: false, message: 'فشل نسخ التذكير، يرجى المحاولة يدوياً' };
    }
  },
};