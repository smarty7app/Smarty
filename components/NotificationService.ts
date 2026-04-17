'use client';

interface Reminder {
  id: string;
  text: string;
  reminderTime: string;
  isCompleted: boolean;
  recurring?: 'none' | 'hourly' | 'daily' | 'weekly'; // دعم التكرار
}

class NotificationService {
  private timers: Map<string, NodeJS.Timeout[]> = new Map();
  private permission: NotificationPermission = 'default';
  private audio: HTMLAudioElement | null = null;
  private storageKey = 'smarty_scheduled_reminders';

  constructor() {
    if (typeof window !== 'undefined') {
      this.permission = Notification.permission;
      this.initAudio();
      this.loadAndRescheduleReminders();
    }
  }

  private initAudio(): void {
    try {
      this.audio = new Audio('/sounds/notification.mp3');
      this.audio.volume = 0.7;
      this.audio.load(); // محاولة تحميل الملف
    } catch (e) {
      console.warn('Could not load notification sound', e);
      this.audio = null;
    }
  }

  private loadAndRescheduleReminders(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const reminders: Reminder[] = JSON.parse(saved);
        this.rescheduleAll(reminders);
      }
    } catch (e) {
      console.error('Failed to load scheduled reminders from localStorage', e);
    }
  }

  private saveRemindersToStorage(reminders: Reminder[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(reminders));
    } catch (e) {
      console.error('Failed to save scheduled reminders to localStorage', e);
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined') return 'denied';
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      if (permission === 'granted') {
        await this.registerServiceWorker();
      }
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration.active) {
        await navigator.serviceWorker.register('/sw.js');
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  scheduleReminder(reminder: Reminder, onComplete?: (id: string) => void): void {
    if (reminder.isCompleted) return;
    this.cancelReminder(reminder.id);

    const now = Date.now();
    const reminderTimers: NodeJS.Timeout[] = [];
    let triggerTime = new Date(reminder.reminderTime).getTime();

    // إذا كان الوقت في الماضي، نعيد حسابه للتكرار
    if (triggerTime <= now && reminder.recurring && reminder.recurring !== 'none') {
      triggerTime = this.getNextRecurringTime(triggerTime, reminder.recurring);
    }

    if (triggerTime <= now) {
      // إذا كان الوقت لا يزال في الماضي (لا يمكن جدولته)، نتجاهل
      return;
    }

    const delay = triggerTime - now;
    const earlyDelay = delay - 5 * 60 * 1000;

    // تذكير مبكر قبل 5 دقائق
    if (earlyDelay > 0) {
      const earlyTimer = setTimeout(() => {
        this.showNotification(reminder, true);
      }, earlyDelay);
      reminderTimers.push(earlyTimer);
    }

    // التذكير الرئيسي
    const timer = setTimeout(() => {
      this.showNotification(reminder, false);
      this.playSound();
      if (onComplete) onComplete(reminder.id);
      // جدولة التكرار إذا كان مطلوباً
      if (reminder.recurring && reminder.recurring !== 'none') {
        const nextReminder = { ...reminder };
        const nextTime = this.getNextRecurringTime(triggerTime, reminder.recurring);
        nextReminder.reminderTime = new Date(nextTime).toISOString();
        this.scheduleReminder(nextReminder, onComplete);
      }
      this.removeTimerFromMap(reminder.id, timer);
    }, delay);
    reminderTimers.push(timer);

    this.timers.set(reminder.id, reminderTimers);
    this.saveRemindersToStorage(this.getActiveReminders());
  }

  private getNextRecurringTime(lastTime: number, recurring: string): number {
    const next = new Date(lastTime);
    switch (recurring) {
      case 'hourly':
        next.setHours(next.getHours() + 1);
        break;
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      default:
        return lastTime;
    }
    return next.getTime();
  }

  cancelReminder(id: string): void {
    const timers = this.timers.get(id);
    if (timers) {
      timers.forEach(timer => clearTimeout(timer));
      this.timers.delete(id);
      this.saveRemindersToStorage(this.getActiveReminders());
    }
  }

  updateReminder(reminder: Reminder, onComplete?: (id: string) => void): void {
    this.cancelReminder(reminder.id);
    this.scheduleReminder(reminder, onComplete);
  }

  private getActiveReminders(): Reminder[] {
    const active: Reminder[] = [];
    for (const [id] of this.timers) {
      // لا يمكن استعادة النص والوقت من المؤقتات، لذا نعتمد على localStorage منفصل
      // هنا نستخدم localStorage المخزن مسبقاً
    }
    // نرجع التذكيرات من localStorage (يتم تحديثها عند كل جدولة)
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  private removeTimerFromMap(reminderId: string, timer: NodeJS.Timeout): void {
    const current = this.timers.get(reminderId);
    if (current) {
      const filtered = current.filter(t => t !== timer);
      if (filtered.length === 0) {
        this.timers.delete(reminderId);
      } else {
        this.timers.set(reminderId, filtered);
      }
    }
  }

  private async showNotification(reminder: Reminder, isEarly: boolean = false): Promise<void> {
    const title = isEarly ? 'تذكير مبكر' : 'تذكير';
    const body = isEarly ? `باقي 5 دقائق: ${reminder.text}` : reminder.text;

    const options: NotificationOptions = {
      body,
      icon: '/web-app-manifest-192x192.png',
      tag: reminder.id,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200],
      data: {
        reminderId: reminder.id,
        reminderText: reminder.text,
        timestamp: new Date().toISOString(),
      },
      actions: [
        { action: 'complete', title: 'تم' },
        { action: 'snooze', title: 'تذكير لاحق' },
        { action: 'open', title: 'فتح التطبيق' },
      ],
    };

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
        return;
      }
      if (this.permission === 'granted') {
        const notification = new Notification(title, options);
        notification.onclick = () => window.focus();
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  private playSound(): void {
    if (this.audio) {
      this.audio.play().catch(e => console.warn('Cannot play notification sound:', e));
    } else {
      // محاولة إنشاء صوت افتراضي
      try {
        const beep = new Audio('data:audio/wav;base64,U3RlYWx0aCB3YXZl...'); // beep قصير
        beep.play().catch(() => {});
      } catch {}
    }
  }

  rescheduleAll(reminders: Reminder[], onComplete?: (id: string) => void): void {
    // إلغاء جميع المؤقتات الحالية
    for (const timers of this.timers.values()) {
      timers.forEach(timer => clearTimeout(timer));
    }
    this.timers.clear();
    // جدولة التذكيرات النشطة
    reminders.forEach(reminder => {
      if (!reminder.isCompleted) {
        this.scheduleReminder(reminder, onComplete);
      }
    });
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  getScheduledCount(): number {
    return this.timers.size;
  }

  destroy(): void {
    for (const timers of this.timers.values()) {
      timers.forEach(timer => clearTimeout(timer));
    }
    this.timers.clear();
    localStorage.removeItem(this.storageKey);
    this.audio = null;
  }
}

export const notificationService = typeof window !== 'undefined' ? new NotificationService() : null;
