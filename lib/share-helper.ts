// lib/share-helper.ts

interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
}

interface ShareResult {
  success: boolean;
  message: string;
}

export const ShareHelper = {
  /**
   * مشاركة تذكير عبر Web Share API أو نسخه إلى الحافظة
   */
  shareReminder: async (reminderText: string, customUrl?: string): Promise<ShareResult> => {
    const formattedDate = new Date().toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const textToShare = `📋 تذكير: ${reminderText}\n\n📅 ${formattedDate}\n\n💡 تم عبر تطبيق Smarty`;
    
    const shareData: ShareOptions = {
      title: 'مشاركة التذكير',
      text: textToShare,
    };
    
    if (customUrl) {
      shareData.url = customUrl;
    }

    // 1. استخدام Web Share API
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return { success: true, message: 'تمت المشاركة بنجاح' };
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return { success: false, message: 'تم إلغاء المشاركة' };
        }
        console.error('Share error:', error);
        // الانتقال إلى النسخ كحل بديل
        return ShareHelper.copyToClipboard(textToShare);
      }
    }
    
    // 2. الحل البديل: نسخ إلى الحافظة
    return ShareHelper.copyToClipboard(textToShare);
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
