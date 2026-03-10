'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import VoiceInput from './VoiceInput';
import AddReminderModal from './AddReminderModal';
import {
  Bell, 
  Plus,
  Pencil, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Calendar,
  Search,
  Volume2,
  VolumeX,
  BarChart3,
  Download,
  Settings,
  Sparkles,
  ClipboardList,
  Info,
  Share2,
  MapPin,
  Timer,
  Tag
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isBefore, parseISO, addHours, addMinutes, addDays, addWeeks } from 'date-fns';
import { arDZ } from 'date-fns/locale';
import { 
  Reminder, 
  parseSmartTime, 
  getPriorityLabel, 
  getPriorityColor,
  Priority,
  EventType,
  detectEventType,
  generateCustomMessage,
  analyzePriority,
  ReminderStage
} from '@/lib/reminder-utils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SettingsScreen } from './SettingsScreen';
import { AboutScreen } from './AboutScreen';
import { ShareHelper } from '@/lib/share-helper';
import { notificationService } from './NotificationService';
import { useLanguage } from './LanguageContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SMART_SUGGESTIONS: Record<string, string[]> = {
  "حليب": ["شراء حليب", "وضع الحليب في الثلاجة", "موعد شرب الحليب"],
  "اجتماع": ["اجتماع العمل الساعة 10", "تحضير عرض الاجتماع", "تأكيد الاجتماع"],
  "دواء": ["تناول الدواء", "شراء الدواء من الصيدلية", "موعد الدواء"]
};

export default function ReminderApp() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [inputText, setInputText] = useState('');
  const [preview, setPreview] = useState<any>(null); // حالة المعاينة الحية
  const [recurring, setRecurring] = useState<Reminder['recurring']>('none');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [dueReminder, setDueReminder] = useState<Reminder | null>(null);
  const [selectedReminderForDetails, setSelectedReminderForDetails] = useState<Reminder | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSmartAnalysisEnabled, setIsSmartAnalysisEnabled] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { t, isRTL, language } = useLanguage();

  // --- منطق المعاينة الحية (Live Preview Logic) ---
  useEffect(() => {
  if (isSmartAnalysisEnabled && inputText.trim().length > 3) {
    try {
      const analysis = parseSmartTime(inputText, language);
      // لفها داخل setTimeout لإصلاح خطأ الـ Build
      setTimeout(() => setPreview(analysis), 0);
    } catch (e) {
      setTimeout(() => setPreview(null), 0);
    }
  } else {
    setTimeout(() => setPreview(null), 0);
  }
}, [inputText, isSmartAnalysisEnabled, language]);

  const activeSuggestions = useMemo(() => {
    if (!inputText.trim()) return [];
    const words = inputText.trim().split(' ');
    const lastWord = words[words.length - 1];
    return (lastWord && SMART_SUGGESTIONS[lastWord]) ? SMART_SUGGESTIONS[lastWord] : [];
  }, [inputText]);

  const getTrueTime = React.useCallback(() => new Date(Date.now()), []);

  const getNextRecurringTime = React.useCallback((rem: Reminder) => {
    const current = parseISO(rem.reminderTime);
    switch (rem.recurring) {
      case 'hourly': return addHours(current, 1);
      case 'daily': return addDays(current, 1);
      case 'weekly': return addWeeks(current, 1);
      default: return current;
    }
  }, []);

  const getTimeBeforeLabel = React.useCallback((eventTime: Date, reminderTime: Date) => {
    const diffMinutes = Math.round((eventTime.getTime() - reminderTime.getTime()) / (60 * 1000));
    if (diffMinutes <= 0) return language === 'ar' ? 'في نفس الوقت' : 'At the same time';
    if (diffMinutes >= 60) {
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      if (language === 'ar') {
        return `${hours} ساعة ${mins > 0 ? `و ${mins} دقيقة` : ''}`;
      }
      return `${hours} hour(s) ${mins > 0 ? `and ${mins} min(s)` : ''}`;
    }
    return language === 'ar' ? `${diffMinutes} دقيقة` : `${diffMinutes} min(s)`;
  }, [language]);

  const playNotificationSound = React.useCallback(() => {
    if (audioRef.current && soundEnabled) {
      try {
        audioRef.current.muted = false;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => {
          console.warn('Audio playback blocked by browser.', e);
        });
      } catch (e) {
        console.error('Audio playback failed', e);
      }
    }
  }, [soundEnabled]);

  const handleReminderDueRef = useRef<(id: string) => void>(() => {});

  const handleReminderDue = React.useCallback((id: string) => {
    setReminders(prev => {
      const rem = prev.find(r => r.id === id);
      if (rem && !rem.isCompleted) {
        setDueReminder(rem);
        if (soundEnabled) playNotificationSound();
        
        const now = new Date();
        const nextTimes = rem.reminderTimes
          .map(t => new Date(t))
          .filter(t => t > now)
          .sort((a, b) => a.getTime() - b.getTime());
        
        if (nextTimes.length > 0) {
          return prev.map(r => r.id === id ? { ...r, reminderTime: nextTimes[0].toISOString() } : r);
        }

        if (rem.recurring !== 'none') {
          const nextTime = getNextRecurringTime(rem);
          const newRem: Reminder = {
            ...rem,
            id: Math.random().toString(36).substr(2, 9),
            reminderTime: nextTime.toISOString(),
            reminderTimes: [nextTime.toISOString()],
            createdAt: new Date().toISOString(),
            isCompleted: false,
            snoozeCount: 0,
          };
          if (notificationService) {
            notificationService.scheduleReminder(newRem, (rid) => handleReminderDueRef.current(rid));
          }
          return [newRem, ...prev.map(r => r.id === id ? { ...r, isCompleted: true } : r)];
        }
      }
      return prev;
    });
  }, [soundEnabled, playNotificationSound, getNextRecurringTime]);

  useEffect(() => {
    handleReminderDueRef.current = handleReminderDue;
  }, [handleReminderDue]);

  const handleDelete = React.useCallback((id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    if (notificationService) notificationService.cancelReminder(id);
  }, []);

  const handleToggleComplete = React.useCallback((id: string) => {
    setReminders(prev => prev.map(r => {
      if (r.id === id) {
        const newState = !r.isCompleted;
        if (notificationService) {
          if (newState) notificationService.cancelReminder(id);
          else notificationService.scheduleReminder(r, (rid) => handleReminderDueRef.current(rid));
        }
        return { ...r, isCompleted: newState };
      }
      return r;
    }));
  }, []);

  // Cache Loading
  useEffect(() => {
    const cached = localStorage.getItem('smart_reminders_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setTimeout(() => {
            setReminders(parsed);
            if (notificationService) {
              notificationService.rescheduleAll(parsed, (id) => handleReminderDueRef.current(id));
            }
          }, 0);
        }
      } catch (e) { console.error(e); }
    }
    const smartAnalysis = localStorage.getItem('smart_analysis_enabled');
    if (smartAnalysis !== null) setTimeout(() => setIsSmartAnalysisEnabled(smartAnalysis === 'true'), 0);
    setTimeout(() => setIsMounted(true), 0);
  }, []);

  useEffect(() => {
    if (isMounted) localStorage.setItem('smart_reminders_cache', JSON.stringify(reminders));
  }, [reminders, isMounted]);

  // Theme Logic
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.muted = true;
      audioRef.current = audio;
    }
  }, []);

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled && audioRef.current) {
      audioRef.current.muted = true;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleSnooze = React.useCallback((id: string, durationMinutes: number = 5) => {
    setReminders(prev => {
      const reminder = prev.find(r => r.id === id);
      if (!reminder || reminder.snoozeCount >= reminder.maxSnooze) return prev;
      const newTime = addMinutes(new Date(), durationMinutes);
      const snoozed: Reminder = {
        ...reminder,
        id: Math.random().toString(36).substr(2, 9),
        reminderTime: newTime.toISOString(),
        snoozeCount: reminder.snoozeCount + 1,
        isCompleted: false,
      };
      if (notificationService) {
        notificationService.cancelReminder(id);
        notificationService.scheduleReminder(snoozed, (rid) => handleReminderDueRef.current(rid));
      }
      return [snoozed, ...prev.filter(r => r.id !== id)];
    });
  }, []);

  const handleAddReminder = () => {
    if (!inputText.trim()) return;

    let reminderTimes: Date[] = [new Date()];
    let eventTime = new Date();
    let priority: Priority = 3;
    let eventType = EventType.OTHER;

    // استخدام المعاينة الحية إذا كانت موجودة
    if (isSmartAnalysisEnabled && preview) {
      reminderTimes = preview.reminderTimes;
      eventTime = preview.eventTime;
      priority = preview.priority;
      eventType = preview.eventType;
    } else {
      eventTime = selectedDate ? new Date(selectedDate) : addMinutes(new Date(), 15);
      reminderTimes = [eventTime];
      priority = analyzePriority(inputText);
      eventType = detectEventType(inputText);
    }
    
    const newReminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      // التعديل: حفظ العنوان النظيف المكتشف ذكياً
      text: (isSmartAnalysisEnabled && preview?.title) ? preview.title : inputText,
      reminderTime: reminderTimes[0].toISOString(),
      reminderTimes: reminderTimes.map(t => t.toISOString()),
      eventTime: eventTime.toISOString(),
      createdAt: new Date().toISOString(),
      isCompleted: false,
      recurring,
      priority,
      eventType,
      location: preview?.location,
      confidence: preview?.confidence || 0.5,
      suggestedMessage: preview?.suggestedMessage || generateCustomMessage(eventType, eventTime, language),
      snoozeCount: 0,
      maxSnooze: 3,
      stage: ReminderStage.FINAL,
    };

    setReminders(prev => [newReminder, ...prev]);
    if (notificationService) notificationService.scheduleReminder(newReminder, (id) => handleReminderDueRef.current(id));

    setInputText('');
    setPreview(null);
    setRecurring('none');
    setIsAdding(false);
  };

  const activeReminders = reminders.filter(r => !r.isCompleted).sort((a, b) => 
    new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime()
  );
  
  const completedReminders = reminders.filter(r => r.isCompleted).slice(0, 10);

  if (!isMounted) return null;
  if (showSettings) return <SettingsScreen onBack={() => setShowSettings(false)} />;
  if (showAbout) return <AboutScreen onBack={() => setShowAbout(false)} />;

  return (
    <div className="min-h-screen bg-[#E65100] dark:bg-zinc-950 flex flex-col transition-colors duration-500">
      
      {/* App Bar */}
      <header className="sticky top-0 z-10 bg-black/10 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white text-[#E65100] rounded-2xl flex items-center justify-center shadow-lg">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white">{t.app_name}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAbout(true)} className="p-2 text-white"><Info /></button>
          <button onClick={() => setShowSettings(true)} className="p-2 text-white"><Settings /></button>
          <button onClick={toggleSound} className="p-2 text-white">{soundEnabled ? <Volume2 /> : <VolumeX />}</button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-32">
        {/* Search */}
        <div className="mb-8 relative">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 text-white/40", isRTL ? "left-4" : "right-4")} />
          <input 
            placeholder={t.search_placeholder}
            className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none"
          />
        </div>

        {/* Reminders List */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4" /> {t.active_reminders} ({activeReminders.length})
          </h3>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {activeReminders.length === 0 ? (
                <div className="text-center py-20 bg-black/5 rounded-[3rem] border border-dashed border-white/10">
                  <p className="text-white/40 font-black text-xs uppercase">{t.no_active_reminders}</p>
                </div>
              ) : (
                activeReminders.map((rem) => (
                  <motion.div key={rem.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2.5rem] shadow-lg flex items-start gap-4">
                      <button onClick={() => handleToggleComplete(rem.id)} className="mt-1 w-8 h-8 rounded-2xl border-2 border-zinc-100 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <div className="flex-1">
                        <p className="text-xl font-black dark:text-white leading-tight">{rem.text}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-[10px] font-black text-zinc-500">
                            {formatDistanceToNow(parseISO(rem.reminderTime), { addSuffix: true, locale: arDZ })}
                          </span>
                          <span className={cn("px-3 py-1 rounded-full text-[10px] font-black text-white", rem.priority >= 3 ? "bg-orange-500" : "bg-blue-500")}>
                            {getPriorityLabel(rem.priority, language)}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(rem.id)} className="text-zinc-300 hover:text-red-500"><Trash2 /></button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsAdding(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-white dark:bg-zinc-900 text-[#E65100] rounded-2xl shadow-2xl flex items-center justify-center z-50 border border-black/5"
      >
        <Pencil className="w-8 h-8" />
      </motion.button>

      {/* Modal - نمرر له الـ preview ليعرض المعاينة الحية */}
      <AddReminderModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        inputText={inputText}
        setInputText={setInputText}
        recurring={recurring}
        setRecurring={(val: any) => setRecurring(val)}
        handleAddReminder={handleAddReminder}
        t={t}
        smartParsed={preview} // نمرر المعاينة الحية هنا
        activeSuggestions={activeSuggestions}
        language={language}
        getTimeBeforeLabel={getTimeBeforeLabel}
        format={format}
        arDZ={arDZ}
      />
      
      <footer className="py-8 text-center opacity-20 text-[10px] font-black uppercase">
        Smarty AI Reminder &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
