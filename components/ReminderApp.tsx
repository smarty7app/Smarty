'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  plus,
  pencil, 
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
  Timer
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { t, isRTL, language } = useLanguage();

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
          console.warn('Audio playback blocked by browser. Interaction required.', e);
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
        if (soundEnabled) {
          playNotificationSound();
        }
        
        // Update the next reminder time if there are more
        const now = new Date();
        const nextTimes = rem.reminderTimes
          .map(t => new Date(t))
          .filter(t => t > now)
          .sort((a, b) => a.getTime() - b.getTime());
        
        if (nextTimes.length > 0) {
          return prev.map(r => 
            r.id === id ? { ...r, reminderTime: nextTimes[0].toISOString() } : r
          );
        }

        // Handle recurring if no more alert times
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
          // For recurring, we mark the current one as completed and add the new one
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
    if (notificationService) {
      notificationService.cancelReminder(id);
    }
  }, []);

  const handleToggleComplete = React.useCallback((id: string) => {
    setReminders(prev => {
      const updated = prev.map(r => {
        if (r.id === id) {
          const newState = !r.isCompleted;
          if (notificationService) {
            if (newState) {
              notificationService.cancelReminder(id);
            } else {
              notificationService.scheduleReminder(r, (rid) => handleReminderDueRef.current(rid));
            }
          }
          return { ...r, isCompleted: newState };
        }
        return r;
      });
      return updated;
    });
  }, []);

  // Load reminders from cache
  useEffect(() => {
    const cached = localStorage.getItem('smart_reminders_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setTimeout(() => {
            setReminders(parsed);
            if (notificationService) {
              notificationService.rescheduleAll(parsed, (id) => {
                handleReminderDueRef.current(id);
              });
            }
          }, 0);
        }
      } catch (e) {
        console.error('Failed to parse cached reminders', e);
      }
    }
    
    const smartAnalysis = localStorage.getItem('smart_analysis_enabled');
    if (smartAnalysis !== null) {
      setTimeout(() => setIsSmartAnalysisEnabled(smartAnalysis === 'true'), 0);
    }

    setTimeout(() => setIsMounted(true), 0);
  }, []); // Only run once on mount

  // Save reminders to cache
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('smart_reminders_cache', JSON.stringify(reminders));
    }
  }, [reminders, isMounted]);

  // Theme Initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    let initialTheme: 'light' | 'dark' = 'light';
    if (savedTheme) {
      initialTheme = savedTheme;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      initialTheme = 'dark';
    }
    
    const timer = setTimeout(() => {
      setTheme(initialTheme);
      if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, 0);

    const handleStorage = () => {
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      setTheme(currentTheme);
      const smartAnalysis = localStorage.getItem('smart_analysis_enabled');
      if (smartAnalysis !== null) {
        setIsSmartAnalysisEnabled(smartAnalysis === 'true');
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Initialize audio object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.muted = true;
      audioRef.current = audio;
    }
  }, []);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    
    if (nextState && audioRef.current) {
      audioRef.current.muted = true;
      audioRef.current.play().catch(() => {});
    }
  };

  // Background checker for due reminders (safety fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      setReminders(prev => {
        const dueReminders = prev.filter(rem => !rem.isCompleted && isPast(parseISO(rem.reminderTime)));
        if (dueReminders.length > 0) {
          dueReminders.forEach(rem => handleReminderDueRef.current(rem.id));
        }
        return prev;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []); // Remove handleReminderDue dependency

  const handleSnooze = React.useCallback((id: string, durationMinutes: number = 5) => {
    setReminders(prev => {
      const reminder = prev.find(r => r.id === id);
      if (!reminder || reminder.snoozeCount >= reminder.maxSnooze) return prev;

      const newReminderTime = addMinutes(new Date(), durationMinutes);
      const snoozedReminder: Reminder = {
        ...reminder,
        id: Math.random().toString(36).substr(2, 9),
        reminderTime: newReminderTime.toISOString(),
        snoozeCount: reminder.snoozeCount + 1,
        parentId: reminder.id,
        isCompleted: false,
      };

      if (notificationService) {
        notificationService.cancelReminder(id);
        notificationService.scheduleReminder(snoozedReminder, (rid) => handleReminderDueRef.current(rid));
      }

      return [snoozedReminder, ...prev.filter(r => r.id !== id)];
    });
  }, []);

  const smartParsed = useMemo(() => {
    if (!isSmartAnalysisEnabled || !inputText.trim()) return null;
    try {
      return parseSmartTime(inputText, language);
    } catch (e) {
      return null;
    }
  }, [inputText, isSmartAnalysisEnabled, language]);

  const handleAddReminder = () => {
    if (!inputText.trim()) return;

    let reminderTimes: Date[] = [new Date()];
    let eventTime = new Date();
    let reminderPriority: Priority = 1;
    let eventType = EventType.OTHER;
    let location: string | undefined;
    let confidence = 0.5;
    let suggestedMessage = '';

    if (isSmartAnalysisEnabled && smartParsed) {
      reminderTimes = smartParsed.reminderTimes;
      eventTime = smartParsed.eventTime;
      reminderPriority = smartParsed.priority;
      eventType = smartParsed.eventType;
      location = smartParsed.location;
      confidence = smartParsed.confidence;
      suggestedMessage = smartParsed.suggestedMessage;
    } else {
      if (selectedDate) {
        eventTime = new Date(selectedDate);
      } else {
        eventTime = new Date(Date.now() + 15 * 60000);
      }
      reminderTimes = [eventTime];
      reminderPriority = analyzePriority(inputText);
      eventType = detectEventType(inputText);
      suggestedMessage = generateCustomMessage(eventType, eventTime, language);
    }
    
    // Create a SINGLE reminder with multiple alert times
    const newReminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      reminderTime: reminderTimes[0].toISOString(), // Next alert
      reminderTimes: reminderTimes.map(t => t.toISOString()), // All alerts
      eventTime: eventTime.toISOString(),
      createdAt: new Date().toISOString(),
      isCompleted: false,
      recurring,
      priority: reminderPriority,
      eventType,
      location,
      confidence,
      suggestedMessage,
      snoozeCount: 0,
      maxSnooze: 3,
      stage: ReminderStage.FINAL,
      totalDurationMinutes: smartParsed?.totalDurationMinutes || undefined
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

  const activeReminders = reminders.filter(r => !r.isCompleted).sort((a, b) => 
    new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime()
  );
  
  const completedReminders = reminders.filter(r => r.isCompleted).slice(0, 10);

  if (!isMounted) return null;

  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} />;
  }

  if (showAbout) {
    return <AboutScreen onBack={() => setShowAbout(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#E65100] dark:bg-zinc-950 flex flex-col transition-colors duration-500">
      
      {/* Due Reminder Modal */}
      <AnimatePresence>
        {dueReminder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[3rem] p-8 shadow-2xl border border-black/5 dark:border-white/5"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-[#E65100]/10 rounded-[2rem] flex items-center justify-center mb-6">
                  <Bell className="w-10 h-10 text-[#E65100] animate-bounce" />
                </div>
                
                <p className="text-xs font-black text-[#E65100] uppercase tracking-widest mb-2">📋 {t.app_name}</p>
                
                <h2 className="text-2xl font-black mb-2 dark:text-white">
                  {dueReminder.text}
                </h2>
                
                {dueReminder.suggestedMessage && (
                  <p className="text-zinc-500 dark:text-zinc-400 mb-8 italic text-lg leading-relaxed">
                    {dueReminder.suggestedMessage}
                  </p>
                )}

                <div className="flex flex-col gap-3 w-full">
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      onClick={() => {
                        handleSnooze(dueReminder.id);
                        setDueReminder(null);
                      }}
                      disabled={dueReminder.snoozeCount >= dueReminder.maxSnooze}
                      className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
                    >
                      <Timer className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                      <span className="text-xs font-black uppercase tracking-widest">😴 {t.snooze} 5 {language === 'ar' ? 'دقائق' : 'mins'}</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const currentRem = reminders.find(r => r.id === dueReminder.id);
                        if (currentRem && !currentRem.isCompleted) {
                          handleToggleComplete(dueReminder.id);
                        }
                        setDueReminder(null);
                      }}
                      className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-[#E65100] hover:bg-[#D84315] transition-all"
                    >
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span className="text-xs font-black uppercase tracking-widest text-white">
                        ✅ {dueReminder.recurring !== 'none' ? (language === 'ar' ? 'تم' : 'Done') : (language === 'ar' ? 'إكمال' : 'Complete')}
                      </span>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedReminderForDetails(dueReminder);
                      setDueReminder(null);
                    }}
                    className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all"
                  >
                    <Info className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300">
                      📄 {t.details}
                    </span>
                  </button>
                </div>
                
                <button 
                  onClick={() => setDueReminder(null)}
                  className="mt-6 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:text-zinc-600"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reminder Details Modal */}
      <AnimatePresence>
        {selectedReminderForDetails && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[3rem] p-8 shadow-2xl border border-black/5 dark:border-white/5"
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black dark:text-white flex items-center gap-2">
                    <Info className="w-6 h-6 text-[#E65100]" />
                    {t.details}
                  </h2>
                  <button onClick={() => setSelectedReminderForDetails(null)} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <Plus className="w-6 h-6 rotate-45 text-zinc-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'النص الأصلي' : 'Original Text'}</p>
                    <p className="text-lg font-bold dark:text-white">{selectedReminderForDetails.text}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">📅 {t.event_time}</p>
                      <p className="text-sm font-bold dark:text-white">
                        {format(parseISO(selectedReminderForDetails.eventTime), 'p, d MMM')}
                      </p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">⏰ {t.remind_at}</p>
                      <p className="text-sm font-bold dark:text-white">
                        {format(parseISO(selectedReminderForDetails.reminderTime), 'p, d MMM')}
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">💬 {t.suggested_message}</p>
                    <p className="text-sm font-bold dark:text-white italic">&quot;{selectedReminderForDetails.suggestedMessage}&quot;</p>
                  </div>

                  <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">🔍 {t.confidence}</p>
                      <p className="text-sm font-bold dark:text-white">{(selectedReminderForDetails.confidence * 100).toFixed(0)}%</p>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      getPriorityColor(selectedReminderForDetails.priority)
                    )}>
                      {getPriorityLabel(selectedReminderForDetails.priority, language)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedReminderForDetails(null)}
                  className="w-full bg-[#E65100] text-white font-black py-4 rounded-2xl hover:bg-[#D84315] transition-all text-sm uppercase tracking-widest"
                >
                  {t.back}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* App Bar */}
      <header className="sticky top-0 z-10 bg-black/10 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white text-[#E65100] rounded-2xl flex items-center justify-center shadow-lg">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white leading-none tracking-tight">{t.app_name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAbout(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
            title={t.about}
          >
            <Info className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
            title={t.settings}
          >
            <Settings className="w-6 h-6" />
          </button>
          <button 
            onClick={toggleSound}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-32">
        {/* Search Bar */}
        <div className="mb-8 px-2">
          <div className="relative group">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-white transition-colors", isRTL ? "left-4" : "right-4")} />
            <input 
              type="text"
              placeholder={t.search_placeholder}
              className={cn(
                "w-full bg-white/10 border border-white/10 rounded-2xl py-3.5 text-sm focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all outline-none shadow-sm text-white placeholder:text-white/30 font-bold",
                isRTL ? "pl-12 pr-5" : "pr-12 pl-5"
              )}
              onChange={(e) => {
                // Search logic
              }}
            />
          </div>
        </div>

        {/* Active Reminders */}
        <section className="space-y-4 mb-12">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t.active_reminders} ({activeReminders.length})
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {activeReminders.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  className="text-center py-20 bg-black/5 rounded-[3rem] border border-dashed border-white/10"
                >
                  <Bell className="w-16 h-16 text-white/10 mx-auto mb-4" />
                  <p className="text-white/40 font-black uppercase tracking-widest text-xs">{t.no_active_reminders}</p>
                </motion.div>
              ) : (
                activeReminders.map((rem) => {
                  const isDueSoon = !rem.isCompleted && 
                    new Date(rem.reminderTime).getTime() - getTrueTime().getTime() < 300000 && // 5 mins
                    new Date(rem.reminderTime).getTime() - getTrueTime().getTime() > 0;

                  return (
                    <motion.div
                      key={rem.id}
                      layout
                      initial={{ opacity: 0, y: 20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      transition={{ 
                        opacity: { duration: 0.2 },
                        height: { duration: 0.3 },
                        y: { type: "spring", stiffness: 300, damping: 25 }
                      }}
                      className="overflow-hidden"
                    >
                      <div className="relative rounded-[2.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800/50">
                        <div className="absolute inset-0 flex justify-between items-center px-8">
                          <div className="flex items-center gap-2 text-emerald-500 font-bold opacity-70">
                            <CheckCircle2 className="w-6 h-6" />
                            <span className="text-sm uppercase tracking-widest">{language === 'ar' ? 'إكمال' : 'Complete'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-red-500 font-bold opacity-70">
                            <span className="text-sm uppercase tracking-widest">{language === 'ar' ? 'حذف' : 'Delete'}</span>
                            <Trash2 className="w-6 h-6" />
                          </div>
                        </div>

                        <motion.div
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={0.8}
                          onDragEnd={(e, { offset }) => {
                            if (offset.x > 100) handleToggleComplete(rem.id);
                            if (offset.x < -100) handleDelete(rem.id);
                          }}
                          className={cn(
                            "relative bg-white dark:bg-zinc-900 p-5 rounded-[2.5rem] border transition-all duration-300 group cursor-grab active:cursor-grabbing",
                            isDueSoon 
                              ? "border-white dark:border-zinc-700 shadow-[0_8px_30px_rgba(0,0,0,0.2)] ring-2 ring-white/50 dark:ring-zinc-700/50" 
                              : "border-black/5 dark:border-white/5 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                          )}>
                          <div className="flex items-start gap-5">
                            <button 
                              onClick={() => handleToggleComplete(rem.id)}
                              className={cn(
                                "mt-1 w-8 h-8 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 shrink-0",
                                "border-zinc-100 dark:border-zinc-800 hover:border-[#E65100] hover:bg-[#E65100]/5 text-transparent hover:text-[#E65100]"
                              )}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-black dark:text-white text-xl font-black mb-1 break-words leading-tight tracking-tight">
                                {rem.text}
                              </p>
                              {rem.suggestedMessage && rem.suggestedMessage !== rem.text && (
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-3 italic">
                                  {rem.suggestedMessage}
                                </p>
                              )}
                              
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatDistanceToNow(parseISO(rem.reminderTime), { addSuffix: true, locale: language === 'ar' ? arDZ : undefined })}
                                </div>
                                
                                <div className={cn(
                                  "px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                  rem.priority === 4 ? "bg-red-500 text-white" :
                                  rem.priority === 3 ? "bg-orange-500 text-white" :
                                  "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                                )}>
                                  {t.priority} {getPriorityLabel(rem.priority, language)}
                                </div>

                                {rem.stage === ReminderStage.WARNING && (
                                  <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {language === 'ar' ? 'تذكير تحذيري' : 'Warning Reminder'}
                                  </div>
                                )}

                                {rem.location && (
                                  <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {t.location}: {rem.location}
                                  </div>
                                )}

                                {rem.recurring !== 'none' && (
                                  <div className="flex items-center gap-1.5 bg-[#E65100]/10 text-[#E65100] px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    {rem.recurring === 'hourly' ? t.hourly : rem.recurring === 'daily' ? t.daily : t.weekly}
                                  </div>
                                )}

                                {rem.reminderTimes.length > 1 && (
                                  <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    <Bell className="w-3.5 h-3.5" />
                                    {t.all_alerts}: {rem.reminderTimes.length}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 shrink-0">
                              <button 
                                onClick={() => handleSnooze(rem.id)}
                                disabled={rem.snoozeCount >= rem.maxSnooze}
                                className={cn(
                                  "p-3 rounded-2xl transition-all",
                                  rem.snoozeCount >= rem.maxSnooze 
                                    ? "text-zinc-100 dark:text-zinc-800 cursor-not-allowed" 
                                    : "text-zinc-300 hover:text-orange-500 hover:bg-orange-50"
                                )}
                                title={t.snooze}
                              >
                                <Timer className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => ShareHelper.shareReminder(rem.text)}
                                className="p-3 text-zinc-300 hover:text-blue-500 hover:bg-blue-50 rounded-2xl transition-all"
                                title="مشاركة التذكير"
                              >
                                <Share2 className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(rem.id)}
                                className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                title="حذف التذكير"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Completed Reminders */}
        {completedReminders.length > 0 && (
          <section className="space-y-4 mt-16">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {t.completed_recently}
              </h3>
              <button 
                onClick={() => setReminders(prev => prev.filter(r => !r.isCompleted))}
                className="text-xs font-bold text-primary hover:underline"
              >
                {t.clear_all}
              </button>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {completedReminders.map((rem) => (
                  <motion.div 
                    key={rem.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-2xl flex items-center gap-4 border border-zinc-100 dark:border-zinc-800/50 group"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="flex-1 text-zinc-500 dark:text-zinc-400 line-through text-sm font-medium truncate">{rem.text}</p>
                    <button 
                      onClick={() => handleDelete(rem.id)}
                      className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}
      </main>

      {/* Floating Action Button & Modal */}
      <AnimatePresence>
        {isAdding && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-[3rem] p-8 z-50 shadow-2xl border-t border-black/5 dark:border-white/5 max-h-[90vh] overflow-y-auto"
            >
              <div className="max-w-2xl mx-auto">
                <div className="w-12 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mx-auto mb-10" />
                
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-black text-black dark:text-white tracking-tight">{t.new_reminder}</h2>
                  <div className="w-12 h-12 bg-[#E65100]/10 text-[#E65100] rounded-2xl flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="relative mb-8 group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#E65100] to-amber-500 rounded-[2.5rem] blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
                  <div className="relative bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus-within:border-[#E65100] dark:focus-within:border-[#E65100] rounded-[2rem] overflow-hidden transition-all duration-300">
                    <textarea
                      autoFocus
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={t.what_to_remember}
                      className="w-full min-h-[160px] p-6 bg-transparent resize-none text-2xl text-black dark:text-white outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600 font-black leading-relaxed"
                    />
                    
                    {/* AI Suggestions */}
                    <AnimatePresence>
                      {!inputText ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="px-6 pb-6"
                        >
                          <p className="text-xs font-bold text-[#E65100] mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                            <Sparkles className="w-4 h-4" />
                            {t.smart_suggestions}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {["موعد الطبيب غداً", "أخذ الدواء 8 مساءً"].map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => setInputText(suggestion)}
                                className="text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-2xl text-zinc-600 dark:text-zinc-300 hover:border-[#E65100] hover:text-[#E65100] hover:bg-[#E65100]/5 transition-all font-bold"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      ) : activeSuggestions.length > 0 ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="px-6 pb-6"
                        >
                          <p className="text-xs font-bold text-emerald-500 mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                            <Sparkles className="w-4 h-4" />
                            {t.smart_completion}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {activeSuggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => setInputText(suggestion)}
                                className="text-sm bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-2xl text-emerald-700 dark:text-emerald-400 hover:border-emerald-500 hover:bg-emerald-500 hover:text-white transition-all font-bold"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Smart Analysis Preview */}
                <AnimatePresence>
                  {smartParsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: 10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: 10 }}
                      className="mb-8 overflow-hidden"
                    >
                      <div className={cn(
                        "border rounded-[2rem] p-6 flex flex-col gap-4 transition-colors",
                        smartParsed.confidence > 0.8 ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30" :
                        smartParsed.confidence > 0.5 ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30" :
                        "bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                              smartParsed.confidence > 0.8 ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                              smartParsed.confidence > 0.5 ? "bg-amber-500 text-white shadow-amber-500/20" :
                              "bg-rose-500 text-white shadow-rose-500/20"
                            )}>
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                              <p className={cn(
                                "text-[10px] font-black uppercase tracking-widest mb-0.5",
                                smartParsed.confidence > 0.8 ? "text-emerald-600 dark:text-emerald-400" :
                                smartParsed.confidence > 0.5 ? "text-amber-600 dark:text-amber-400" :
                                "text-rose-600 dark:text-rose-400"
                              )}>
                                🔍 {t.smart_analysis} ({(smartParsed.confidence * 100).toFixed(0)}%)
                              </p>
                              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {t.confidence}: {smartParsed.confidence > 0.8 ? (language === 'ar' ? 'عالية' : 'High') : smartParsed.confidence > 0.5 ? (language === 'ar' ? 'متوسطة' : 'Medium') : (language === 'ar' ? 'منخفضة' : 'Low')}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">📅 {t.event_time}</p>
                            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                              {format(smartParsed.eventTime, 'eeee d MMMM, p', { locale: language === 'ar' ? arDZ : undefined })}
                            </p>
                          </div>
                          <div className="bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">⏰ {t.remind_before}</p>
                            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                              {getTimeBeforeLabel(smartParsed.eventTime, smartParsed.reminderTimes[0])}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white/50 dark:bg-black/20 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">💬 {t.suggested_message}</p>
                          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200 italic leading-relaxed">
                            &quot;{smartParsed.suggestedMessage}&quot;
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mb-10">
                  <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl group focus-within:border-[#E65100] transition-colors">
                    <RefreshCw className="w-5 h-5 text-zinc-400 group-focus-within:text-[#E65100]" />
                    <div className="flex-1">
                      <p className="text-[10px] uppercase font-black text-zinc-400 tracking-widest mb-1">{t.recurring}</p>
                      <select 
                        value={recurring}
                        onChange={(e) => setRecurring(e.target.value as any)}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-black dark:text-white cursor-pointer appearance-none"
                      >
                        <option value="none">{t.once}</option>
                        <option value="hourly">{t.hourly}</option>
                        <option value="daily">{t.daily}</option>
                        <option value="weekly">{t.weekly}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setIsAdding(false)}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-black py-4 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-sm uppercase tracking-widest"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleAddReminder}
                    disabled={!inputText.trim()}
                    className="flex-[2] bg-[#E65100] text-white font-black py-4 rounded-2xl hover:bg-[#BF360C] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-[#E65100]/20 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    {t.save_reminder}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsAdding(true)}
        className="fixed bottom-8 left-8 w-16 h-16 bg-white dark:bg-zinc-900 text-[#E65100] rounded-[1.5rem] shadow-2xl flex items-center justify-center z-30 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
      >
       <Pencil className="w-8 h-8" />
      </motion.button>

      <footer className="py-8 text-center bg-black/5">
      </footer>
    </div>
  );
}
