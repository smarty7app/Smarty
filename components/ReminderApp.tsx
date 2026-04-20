'use client';

import { toast } from 'sonner';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { ShareHelper } from '@/lib/share-helper';
import VoiceInput from './VoiceInput';
import AddReminderModal from './AddReminderModal';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { arDZ } from 'date-fns/locale';
import { useLanguage } from './LanguageContext';
import { SettingsScreen } from './SettingsScreen';
import { AboutScreen } from './AboutScreen';
import { motion, AnimatePresence } from 'motion/react';
import { Pencil, Trash2, CheckCircle2, Clock, Search, Volume2, VolumeX, Settings, Info, Timer, Calendar, AlertCircle, Bell, BellOff, Share2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { notificationService } from './NotificationService';
import { 
  analyzeReminderInput, 
  formatDetectedTime, 
  formatCountdown, 
  cleanReminderText,
  type SmartParsedResult 
} from '@/lib/date-parser';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface Reminder { id: string; text: string; reminderTime: string; isCompleted: boolean; }

// ✅ دالة مساعدة للتحقق من صحة التاريخ
function isValidReminderTime(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

// ✅ دالة آمنة لعرض الوقت النسبي (تجنب parseISO المباشر)
function safeFormatDistanceToNow(dateString: string, locale: any): string {
  if (!isValidReminderTime(dateString)) return 'تاريخ غير صالح';
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale });
  } catch {
    return 'تاريخ غير صالح';
  }
}

// ✅ دالة لتحميل التذكيرات من localStorage (للاستخدام في lazy initialization)
function loadRemindersFromStorage(): Reminder[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('smarty_reminders');
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    // تصفية التذكيرات ذات التاريخ غير الصالح
    return parsed.filter((rem: Reminder) => isValidReminderTime(rem.reminderTime));
  } catch (e) {
    console.error('Failed to load reminders', e);
    return [];
  }
}

export default function ReminderApp({ initialReminderText }: { initialReminderText?: string | null }) {
  // ✅ استخدام lazy initialization لتجنب useEffect للتحميل الأولي
  const [reminders, setReminders] = useState<Reminder[]>(loadRemindersFromStorage);
  const [inputText, setInputText] = useState('');
  const [recurring, setRecurring] = useState<string>('none');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('');
  const [reminderDateTime, setReminderDateTime] = useState<string>('');
  const [smartParsed, setSmartParsed] = useState<SmartParsedResult | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const { t, isRTL, language } = useLanguage();
   
   useEffect(() => {
    if (initialReminderText) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputText(initialReminderText);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAdding(true);
    }
  }, [initialReminderText]);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isMounted && notificationService) {
      notificationService.requestPermission().then((permission) => {
        setNotificationsEnabled(permission === 'granted');
      });
    }
  }, [isMounted]);

  // ✅ حفظ التذكيرات في localStorage عند تغييرها (بدون تحميل أولي)
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('smarty_reminders', JSON.stringify(reminders));
      if (notificationService) {
        notificationService.rescheduleAll(reminders, () => {});
      }
    }
  }, [reminders, isMounted]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.muted = true;
      audioRef.current = audio;
    }
  }, []);

  // معالج الإدخال الصوتي
  const handleVoiceInput = (text: string) => {
    const result = analyzeReminderInput(text);
    if (result) {
      setInputText(result.parsedText);
      setReminderDateTime(result.reminderTime);
      setIsAdding(true);
      const { text: countdownText } = formatCountdown(result.reminderTime, result.detectedLanguage);
      setAssistantMessage(`✅: "${result.parsedText}" | ${countdownText}`);
    } else {
      setInputText(text);
      setReminderDateTime(new Date().toISOString());
      setIsAdding(true);
      setAssistantMessage(`✅: "${text}"`);
    }
  };

  // ✅ تعديل: التحقق من صحة reminderDateTime قبل إضافة التذكير
  const handleAddReminder = () => {
    if (!inputText.trim()) return;
    let finalTime = reminderDateTime;
    if (!isValidReminderTime(finalTime)) {
      finalTime = new Date().toISOString();
    }
    const newReminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      reminderTime: finalTime,
      isCompleted: false
    };
    setReminders(prev => [newReminder, ...prev]);
    setInputText('');
    setReminderDateTime('');
    setRecurring('none');
    setSmartParsed(null);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => setReminders(prev => prev.filter(r => r.id !== id));
  const handleToggleComplete = (id: string) => setReminders(prev => prev.map(r => r.id === id ? { ...r, isCompleted: !r.isCompleted } : r));

  // ✅ دالة مشاركة التذكير

const handleShare = async (reminder: Reminder) => {
 const result = await ShareHelper.shareReminder({
    text: reminder.text,
    reminderTime: reminder.reminderTime,
  });
  if (result.success) {
    toast.success(result.message);
  } else {
    toast.error(result.message);
  }
};

  const handleCloseModal = () => {
    setIsAdding(false);
    setSmartParsed(null);
    setReminderDateTime('');
  };

  const activeReminders = reminders.filter(r => !r.isCompleted);

  if (!isMounted) return null;
  if (showSettings) return <SettingsScreen onBack={() => setShowSettings(false)} />;
  if (showAbout) return <AboutScreen onBack={() => setShowAbout(false)} />;

  return (
    <div className="min-h-screen bg-[#E65100] dark:bg-zinc-950 flex flex-col">
      <header className="sticky top-0 bg-black/10 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
         // داخل header، استبدل كتلة الشعار بهذا:
         <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-xl -rotate-6">
           <Image
             src="/maskable_icon_x384.png"   // ← استخدام الأيقونة الجديدة عالية الدقة
             alt="Smarty Logo"
             width={40}
             height={40}
             className="w-6 h-6 object-contain"
             priority
           />
         </div>
          <div><h1 className="text-2xl font-black text-white">Smarty<span className="text-[10px] opacity-40">®</span></h1><span className="text-[8px] font-bold text-white/30">Premium Assistant</span></div>
        </div>
        <div className="flex gap-1">
           <button onClick={() => setShowAbout(true)} className="p-2.5 text-white/70 hover:text-white"><Info className="w-5 h-5" /></button>
           <button onClick={() => setShowSettings(true)} className="p-2.5 text-white/70 hover:text-white"><Settings className="w-5 h-5" /></button>
           <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2.5 text-white/70 hover:text-white">{soundEnabled ? <Volume2 /> : <VolumeX />}</button>
           <button onClick={() => notificationService?.requestPermission()} className="p-2.5 text-white/70 hover:text-white">{notificationsEnabled ? <Bell /> : <BellOff />}</button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-32">
        <div className="mb-8 relative group">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 text-white/40", isRTL ? "left-4" : "right-4")} />
          <input
            placeholder={t.search_reminders_placeholder}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 pr-12 text-white font-bold outline-none focus:border-[#E65100]/50"
          /> 
        </div>

        <div className="flex flex-col items-center justify-center my-8">
          <VoiceInput onTranscript={handleVoiceInput} />
        <p className="text-center text-sm text-white/70 mt-2">{t.tap_to_speak}</p>
        </div>

        {assistantMessage && <div className="bg-white/10 backdrop-blur-sm text-white p-4 rounded-2xl mb-6 text-center">{assistantMessage}</div>}

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
                activeReminders.map((rem) => {
                  // ✅ حماية عرض التواريخ: إذا كان التاريخ غير صالح نعرض رسائل افتراضية
                  const isValid = isValidReminderTime(rem.reminderTime);
                  const exactTime = isValid ? formatDetectedTime(rem.reminderTime, 'ar') : (language === 'ar' ? 'تاريخ غير صالح' : 'Invalid date');
                  const countdownObj = isValid ? formatCountdown(rem.reminderTime, 'ar') : { text: (language === 'ar' ? 'تاريخ غير صالح' : 'Invalid date'), isPast: false };
                  const cleanedText = cleanReminderText(rem.text, 'ar');
                  return (
                    <motion.div key={rem.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className={cn("bg-white dark:bg-zinc-900 p-5 rounded-[2.5rem] shadow-lg flex items-start gap-4", countdownObj.isPast && "opacity-70")}>
                        <button onClick={() => handleToggleComplete(rem.id)} className="mt-1 w-8 h-8 rounded-2xl border-2 border-zinc-100 flex items-center justify-center text-emerald-500">
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                          <p className="text-xl font-black dark:text-white">{cleanedText}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 px-3 py-1.5 rounded-full text-[10px] font-bold text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              {exactTime}
                            </span>
                            <span className={cn(
                              "px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5",
                              countdownObj.isPast ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300" : "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300"
                            )}>
                              {countdownObj.isPast ? <AlertCircle className="w-3 h-3" /> : <Timer className="w-3 h-3" />}
                              {countdownObj.text}
                            </span>
                            <span className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-full text-[10px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              {safeFormatDistanceToNow(rem.reminderTime, arDZ)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <button onClick={() => handleShare(rem)} className="text-zinc-300 hover:text-blue-500 transition-colors p-1">
                            <Share2 className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleDelete(rem.id)} className="text-zinc-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsAdding(true)} className="fixed bottom-8 right-8 w-16 h-16 bg-white dark:bg-zinc-900 text-[#E65100] rounded-2xl shadow-2xl flex items-center justify-center z-50">
        <Pencil className="w-8 h-8" />
      </motion.button>

      <AddReminderModal
        isOpen={isAdding}
        onClose={handleCloseModal}
        inputText={inputText}
        setInputText={setInputText}
        recurring={recurring}
        setRecurring={setRecurring}
        handleAddReminder={handleAddReminder}
        t={t}
        smartParsed={smartParsed}
        setSmartParsed={setSmartParsed}
        activeSuggestions={[]}
        language={language}
        getTimeBeforeLabel={() => ''}
        format={formatDistanceToNow}
        arDZ={arDZ}
        onReminderTimeDetected={setReminderDateTime}
      />
      <footer className="py-8 text-center opacity-20 text-[10px] font-black uppercase">Smarty AI Reminder &copy; {new Date().getFullYear()}</footer>
    </div>
  );
}
