'use client';

import { Reminder } from '@/lib/reminder-utils';

class NotificationService {
  private timers: Map<string, NodeJS.Timeout[]> = new Map();
  private permission: NotificationPermission = 'default';
  private audio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.permission = Notification.permission;
      this.audio = new Audio('/sounds/notification.mp3');
      this.audio.volume = 0.7;
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

    const times = reminder.reminderTimes || [reminder.reminderTime];
    
    times.forEach((timeStr: string) => {
      const triggerTime = new Date(timeStr).getTime();
      const delay = triggerTime - now;

      const earlyDelay = delay - 5 * 60 * 1000;
      
      if (earlyDelay > 0) {
        const earlyTimer = setTimeout(() => {
          this.showNotification(reminder, true);
        }, earlyDelay);
        reminderTimers.push(earlyTimer);
      }

      if (delay > 0) {
        const timer = setTimeout(() => {
          this.showNotification(reminder, false);
          this.playSound();
          
          if (onComplete) {
            onComplete(reminder.id);
          }
          
          const currentTimers = this.timers.get(reminder.id) || [];
          const updatedTimers = currentTimers.filter(t => t !== timer);
          if (updatedTimers.length === 0) {
            this.timers.delete(reminder.id);
          } else {
            this.timers.set(reminder.id, updatedTimers);
          }
        }, delay);
        reminderTimers.push(timer);
      }
    });

    if (reminderTimers.length > 0) {
      this.timers.set(reminder.id, reminderTimers);
    }
  }

  cancelReminder(id: string): void {
    const reminderTimers = this.timers.get(id);
    if (reminderTimers) {
      reminderTimers.forEach((timer) => clearTimeout(timer));
      this.timers.delete(id);
    }
  }

  private async showNotification(reminder: Reminder, isEarly: boolean = false): Promise<void> {
    const title = isEarly ? 'تذكير مبكر - Smarty' : 'حان الموعد - Smarty';
    const body = isEarly 
      ? `باقي 5 دقائق على: ${reminder.text}` 
      : reminder.text;

    const options: NotificationOptions = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: reminder.id,
      renotify: true,
      requireInteraction: !isEarly,
      silent: false,
      vibrate: [200, 100, 200],
      data: {
        reminderId: reminder.id,
        reminderText: reminder.text,
        url: '/',
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'complete',
          title: 'تم',
        },
        {
          action: 'snooze',
          title: 'تذكير لاحق',
        },
        {
          action: 'open',
          title: 'فتح التطبيق',
        },
      ],
    };

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        await navigator.serviceWorker.ready;
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification(title, options);
          return;
        }
      }

      if (this.permission === 'granted') {
        const notification = new Notification(title, options);
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  private playSound(): void {
    if (this.audio) {
      this.audio.play().catch(e => console.warn('Cannot play sound:', e));
    }
  }

  rescheduleAll(reminders: Reminder[], onComplete?: (id: string) => void): void {
    this.timers.forEach((timers) => timers.forEach(timer => clearTimeout(timer)));
    this.timers.clear();

    reminders.forEach((reminder) => {
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
    this.timers.forEach((timers) => timers.forEach(timer => clearTimeout(timer)));
    this.timers.clear();
    this.audio = null;
  }
}

export const notificationService = typeof window !== 'undefined' ? new NotificationService() : null;
