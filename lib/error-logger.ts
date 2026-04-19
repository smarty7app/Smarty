/**
 * مسجل الأخطاء - نسخة الويب المستوحاة من نسخة أندرويد
 * ErrorLogger - Web version inspired by the Android implementation
 */

export interface ErrorLogEntry {
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
}

export interface ErrorStats {
  [key: string]: number | string;
  last_error_time: number;
}

const LOG_STORAGE_KEY = 'smart_reminder_error_logs';
const STATS_STORAGE_KEY = 'smart_reminder_error_stats';
const MAX_LOGS = 50;

// متغير اختياري لتمكين تخزين الأخطاء في الإنتاج (افتراضياً false)
let enableProductionStorage = false;
let serverEndpoint: string | null = null;

export const ErrorLogger = {
  /**
   * تحديد ما إذا كان سيتم تخزين الأخطاء في localStorage في بيئة الإنتاج.
   * افتراضياً: يتم التخزين فقط في بيئة التطوير.
   */
  setProductionStorage(enabled: boolean) {
    enableProductionStorage = enabled;
  },

  /**
   * تعيين عنوان API لإرسال الأخطاء إليه (اختياري).
   * إذا تم التعيين، سيتم إرسال الأخطاء إلى الخادم في بيئة الإنتاج.
   */
  setServerEndpoint(url: string) {
    serverEndpoint = url;
  },

  /**
   * تسجيل خطأ جديد.
   * @param error الخطأ (كائن Error أو أي شيء)
   * @param context سياق إضافي (اختياري)
   */
  log(error: Error | any, context?: string) {
    const throwable = error instanceof Error ? error : new Error(String(error));
    
    // 1. طباعة في الكونسول (للمطور دائماً)
    if (context) {
      console.error(`❌ خطأ [${context}]:`, throwable.message, throwable);
    } else {
      console.error('❌ خطأ:', throwable.message, throwable);
    }
    
    // 2. حفظ في التخزين المحلي (فقط في بيئة التطوير أو إذا تم تمكينه صراحةً)
    if (this.shouldStoreLocally()) {
      this.saveToStorage(throwable);
      this.updateErrorStats(throwable);
    }
    
    // 3. إرسال إلى الخادم (في الإنتاج إذا تم تعيين endpoint)
    if (serverEndpoint && process.env.NODE_ENV === 'production') {
      this.sendToServer(throwable, context);
    }
  },

  /**
   * تحديد ما إذا كان يجب التخزين محلياً.
   * يتم التخزين فقط في بيئة التطوير أو إذا تم تمكين enableProductionStorage.
   */
  shouldStoreLocally(): boolean {
    if (process.env.NODE_ENV === 'development') return true;
    return enableProductionStorage === true;
  },

  /**
   * حفظ الخطأ في localStorage (بديل للملفات في أندرويد)
   */
  saveToStorage(throwable: Error) {
    if (!this.shouldStoreLocally()) return;
    
    try {
      const logs: ErrorLogEntry[] = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
      
      const newEntry: ErrorLogEntry = {
        timestamp: new Date().toISOString(),
        type: throwable.name || 'Error',
        message: throwable.message,
        stack: throwable.stack?.split('\n').slice(0, 10).join('\n'),
      };

      // إضافة السجل الجديد في البداية والاحتفاظ بآخر 50 سجل فقط
      const updatedLogs = [newEntry, ...logs].slice(0, MAX_LOGS);
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updatedLogs));
    } catch (e) {
      console.error('فشل حفظ الخطأ في التخزين المحلي', e);
    }
  },

  /**
   * تحديث إحصائيات الأخطاء
   */
  updateErrorStats(throwable: Error) {
    if (!this.shouldStoreLocally()) return;
    
    try {
      const stats: ErrorStats = JSON.parse(localStorage.getItem(STATS_STORAGE_KEY) || '{"last_error_time": 0}');
      
      const errorType = throwable.name || 'Error';
      const currentCount = (stats[errorType] as number) || 0;
      
      stats[errorType] = currentCount + 1;
      stats.last_error_time = Date.now();
      
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error('فشل تحديث إحصائيات الأخطاء', e);
    }
  },

  /**
   * إرسال الخطأ إلى الخادم (في بيئة الإنتاج)
   */
  async sendToServer(throwable: Error, context?: string) {
    if (!serverEndpoint) return;
    
    try {
      await fetch(serverEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          type: throwable.name || 'Error',
          message: throwable.message,
          stack: throwable.stack,
          context,
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (e) {
      // فشل الإرسال - لا نفعل شيئاً لتجنب حلقات لا نهائية
      console.warn('فشل إرسال الخطأ إلى الخادم', e);
    }
  },

  /**
   * الحصول على إحصائيات الأخطاء (من localStorage)
   */
  getErrorStats(): ErrorStats {
    if (!this.shouldStoreLocally()) {
      return { last_error_time: 0 };
    }
    try {
      return JSON.parse(localStorage.getItem(STATS_STORAGE_KEY) || '{"last_error_time": 0}');
    } catch (e) {
      return { last_error_time: 0 };
    }
  },

  /**
   * الحصول على سجل الأخطاء (من localStorage)
   */
  getLogs(): ErrorLogEntry[] {
    if (!this.shouldStoreLocally()) {
      return [];
    }
    try {
      return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  },

  /**
   * مسح جميع الأخطاء المخزنة محلياً
   */
  clearLogs() {
    if (!this.shouldStoreLocally()) return;
    localStorage.removeItem(LOG_STORAGE_KEY);
    localStorage.removeItem(STATS_STORAGE_KEY);
  }
};