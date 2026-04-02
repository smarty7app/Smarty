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
  const [assistantMessage, setAssistantMessage] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { t, isRTL, language } = useLanguage();
   
  // 1. تثبيت حالة الـ Mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 2. جلب البيانات من localStorage
  useEffect(() => {
    if (isMounted) {
      const savedReminders = localStorage.getItem('smarty_reminders');
      if (savedReminders) {
        try {
          const parsed = JSON.parse(savedReminders);
          if (Array.isArray(parsed)) {
            setReminders(parsed);
          }
        } catch (e) {
          console.error("Error loading reminders", e);
        }
      }
    }
  }, [isMounted]);
    
  // --- منطق المعاينة الحية ---
  const preview = useMemo(() => {
    if (isSmartAnalysisEnabled && inputText.trim().length >= 1) { 
      try {
        const analysis = parseSmartTime(inputText, language);
        return analysis.isTimeDetected ? analysis : null;
      } catch (e) {
        return null;
      }
    }
    return null;
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
    
    const timer = setTimeout(() => {
      setTheme(initialTheme);
      document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    }, 0);

    return () => clearTimeout(timer);
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

  // إضافة التذكير اليدوي
  const handleAddReminder = () => {
    if (!inputText.trim()) return;

    const currentSmartParsed = isSmartAnalysisEnabled ? parseSmartTime(inputText, language) : null;

    let eventTime = new Date();
    let isTimeDetected = false;

    if (isSmartAnalysisEnabled && currentSmartParsed && currentSmartParsed.isTimeDetected) {
      eventTime = currentSmartParsed.eventTime;
      isTimeDetected = true;
    } else if (selectedDate) {
      eventTime = new Date(selectedDate);
      isTimeDetected = true;
    } else {
      eventTime = addMinutes(new Date(), 15);
    }

    const finalReminderTimes = (currentSmartParsed?.reminderTimes && currentSmartParsed.reminderTimes.length > 0) 
      ? currentSmartParsed.reminderTimes 
      : [eventTime];

    const newReminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      reminderTime: finalReminderTimes[0].toISOString(),
      reminderTimes: finalReminderTimes.map(t => t.toISOString()),
      eventTime: eventTime.toISOString(),
      createdAt: new Date().toISOString(),
      isCompleted: false,
      recurring,
      priority: currentSmartParsed?.priority || 3,
      eventType: currentSmartParsed?.eventType || EventType.OTHER,
      location: currentSmartParsed?.location,
      confidence: currentSmartParsed?.confidence || 0.4,
      suggestedMessage: currentSmartParsed?.suggestedMessage || inputText,
      snoozeCount: 0,
      maxSnooze: 3,
      stage: ReminderStage.FINAL,
    };

    setReminders(prev => [newReminder, ...prev]);
    
    if (notificationService) {
      notificationService.scheduleReminder(newReminder, (id) => {
        handleReminderDueRef.current(id);
      });
    }

    setInputText('');
    setRecurring('none');
    setSelectedDate('');
    setIsAdding(false);
  };

  // المساعد الذكي (معالجة الصوت)
  const handleVoiceInput = async (text: string) => {
    if (!text.trim()) return;
    setAssistantMessage('جاري معالجة طلبك...');

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          reminders: reminders.map(r => ({
            id: r.id,
            text: r.text,
            reminderTime: r.reminderTime,
            isCompleted: r.isCompleted,
            recurring: r.recurring,
          })),
        }),
      });

      const data = await response.json();

      switch (data.action) {
        case 'add':
          const newReminder: Reminder = {
            id: Math.random().toString(36).substr(2, 9),
            text: data.text,
            reminderTime: data.datetime || new Date().toISOString(),
            reminderTimes: [data.datetime || new Date().toISOString()],
            eventTime: data.datetime || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isCompleted: false,
            recurring: data.repeat || 'none',
            priority: 3,
            eventType: EventType.OTHER,
            confidence: 0.9,
            suggestedMessage: data.text,
            snoozeCount: 0,
            maxSnooze: 3,
            stage: ReminderStage.FINAL,
          };
          setReminders(prev => [newReminder, ...prev]);
          if (notificationService) {
            notificationService.scheduleReminder(newReminder, (id) => handleReminderDueRef.current(id));
          }
          setAssistantMessage(`✓ تمت إضافة التذكير: ${data.text}`);
          break;

        case 'list':
          if (reminders.length === 0) {
            setAssistantMessage('لا توجد تذكيرات نشطة.');
          } else {
            const listText = reminders.map((r, i) => `${i+1}. ${r.text} - ${new Date(r.reminderTime).toLocaleString()}`).join('\n');
            setAssistantMessage(listText);
          }
          break;

        case 'delete':
          if (data.id !== undefined && reminders[data.id]) {
            const deletedReminder = reminders[data.id];
            setReminders(prev => prev.filter((_, idx) => idx !== data.id));
            if (notificationService) notificationService.cancelReminder(deletedReminder.id);
            setAssistantMessage(`✓ تم حذف التذكير: ${deletedReminder.text}`);
          } else {
            setAssistantMessage('لم أجد التذكير المطلوب للحذف.');
          }
          break;

        case 'update':
          if (data.id !== undefined && reminders[data.id]) {
            setReminders(prev => prev.map((r, idx) =>
              idx === data.id ? { ...r, text: data.text || r.text, reminderTime: data.datetime || r.reminderTime } : r
            ));
            setAssistantMessage(`✓ تم تحديث التذكير.`);
          } else {
            setAssistantMessage('لم أجد التذكير المطلوب للتحديث.');
          }
          break;

        case 'reply':
          setAssistantMessage(data.message);
          break;

        default:
          setAssistantMessage('عذراً، لم أفهم طلبك. حاول مرة أخرى.');
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      setAssistantMessage('حدث خطأ في الاتصال بالمساعد. تأكد من اتصالك بالإنترنت.');
    }
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
      <header className="sticky top-0 z-10 bg-black/10 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/10 select-none transform-gpu">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-xl transform -rotate-6 transition-transform group-hover:rotate-0 duration-300">
            <svg className="w-6 h-6 text-[#E65100]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z"/>
            </svg>
          </div>
          <div className="flex flex-col -space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tighter">
              Smarty<span className="text-[10px] opacity-40 ml-0.5 align-top">®</span>
            </h1>
            <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em]">
              Premium Assistant
            </span>
          </div>
        </div>

        <div className="flex gap-1">
          <button onClick={() => setShowAbout(true)} className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90">
            <Info className="w-5 h-5" />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90">
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={toggleSound} className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90">
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-32">
        {/* Search */}
        <div className="mb-8 relative group">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 text-white/40 transition-colors group-focus-within:text-[#E65100]", isRTL ? "left-4" : "right-4")} />
          <input 
            placeholder={t.search_placeholder}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 pr-12 text-white font-bold outline-none focus:border-[#E65100]/50 focus:bg-white/10 transition-all placeholder:text-white/20"
          />
        </div>

        {/* الميكروفون الرئيسي */}
        <div className="flex flex-col items-center justify-center my-8">
          <VoiceInput onTranscript={handleVoiceInput} />
          <p className="text-center text-sm text-white/70 mt-2">
            اضغط للتحدث مع المساعد الذكي
          </p>
        </div>

        {/* رد المساعد */}
        {assistantMessage && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 text-white p-4 rounded-2xl mb-6 whitespace-pre-wrap">
            {assistantMessage}
          </div>
        )}

        {/* قائمة التذكيرات */}
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
     
