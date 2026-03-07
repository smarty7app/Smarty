/**
 * معالج تقارير الأخطاء - نسخة الويب المستوحاة من نسخة أندرويد
 * ErrorReporter - Web version inspired by the Android implementation
 */

export const ErrorReporter = {
  /**
   * إرسال تقرير تلقائي إلى السيرفر
   */
  async report(error: Error | any) {
    const throwable = error instanceof Error ? error : new Error(String(error));
    
    // لا نريد إبطاء التطبيق، لذا نستخدم fetch في الخلفية
    try {
      const payload = {
        app_version: '1.0.0-web',
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        error_type: throwable.name || 'Error',
        error_message: throwable.message,
        stack_trace: throwable.stack,
        timestamp: Date.now(),
        url: window.location.href,
      };

      // ملاحظة: هذا رابط تجريبي، يجب استبداله برابط حقيقي في الإنتاج
      // console.log('[ErrorReporter] Sending report to server...', payload);
      
      /*
      await fetch('https://your-server.com/api/error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      */
    } catch (e) {
      // تجاهل الأخطاء أثناء إرسال التقارير لتجنب الحلقات اللانهائية
      console.warn('[ErrorReporter] Failed to send report to server', e);
    }
  },

  /**
   * إرسال تقرير عبر البريد الإلكتروني (بديل بسيط)
   */
  sendEmailReport(error: Error | string) {
    const throwable = error instanceof Error ? error : new Error(String(error));
    const recipient = 'support@smartreminder.dz';
    const subject = encodeURIComponent('تقرير خطأ - التذكير الذكي (نسخة الويب)');
    const body = encodeURIComponent(this.buildEmailBody(throwable));
    
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  },

  buildEmailBody(throwable: Error): string {
    return `
نوع الخطأ: ${throwable.name || 'Error'}
الرسالة: ${throwable.message}

إصدار التطبيق: 1.0.0-web
المتصفح: ${navigator.userAgent}
المنصة: ${navigator.platform}
دقة الشاشة: ${window.screen.width}x${window.screen.height}

الوقت: ${new Date().toLocaleString('ar-DZ')}
الرابط: ${window.location.href}

Stack Trace:
${throwable.stack || 'No stack trace available'}
    `.trim();
  }
};
