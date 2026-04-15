'use client';

import React, { useState, useEffect } from 'react';
import VoiceInput from './VoiceInput';
import AddReminderModal from './AddReminderModal';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { arDZ } from 'date-fns/locale';
import { useLanguage } from './LanguageContext';
import { SettingsScreen } from './SettingsScreen';
import { AboutScreen } from './AboutScreen';
import { motion, AnimatePresence } from 'motion/react';
import { Pencil, Trash2, CheckCircle2, Clock, Search, Volume2, VolumeX, Settings, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface Reminder { id: string; text: string; reminderTime: string; isCompleted: boolean; }

// ✅ واجهة نتيجة التحليل الذكي
export interface SmartParsedResult {
  parsedText: string;
  reminderTime: string;
  detectedLanguage: 'ar' | 'fr' | 'en';
  confidence: number;
  originalText: string;
}

export default function ReminderApp() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [inputText, setInputText] = useState('');
  const [recurring, setRecurring] = useState<string>('none');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('');
  const [reminderDateTime, setReminderDateTime] = useState<string>('');
  // ✅ State للتحليل الذكي أثناء الكتابة
  const [smartParsed, setSmartParsed] = useState<SmartParsedResult | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const { t, isRTL, language } = useLanguage();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setIsMounted(true); }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isMounted) { const saved = localStorage.getItem('smarty_reminders'); if (saved) setReminders(JSON.parse(saved)); } }, [isMounted]);

  useEffect(() => { if (isMounted) localStorage.setItem('smarty_reminders', JSON.stringify(reminders)); }, [reminders, isMounted]);

  useEffect(() => { if (typeof window !== 'undefined') { const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); audio.muted = true; audioRef.current = audio; } }, []);

  // ✅ دالة تحليل الوقت من النص العربي (للاستخدام الصوتي)
  const parseArabicTime = (text: string): { parsedText: string; reminderTime: string } => {
    const now = new Date();
    let reminderTime = now.toISOString();
    let parsedText = text;

    const patterns: { regex: RegExp; handler: (m: RegExpMatchArray) => Date }[] = [
      { regex: /بعد (\d+) دقيقة/, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 60000) },
      { regex: /بعد (\d+) ساعة/, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 3600000) },
      { regex: /بعد (\d+) يوم/, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 86400000) },
      { regex: /بعد (\d+) أسبوع|بعد (\d+) اسبوع/, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 7 * 86400000) },
      { regex: /غدا|غداً/, handler: () => new Date(now.setDate(now.getDate() + 1)) },
      { regex: /بعد غد|بعد غداً/, handler: () => new Date(now.setDate(now.getDate() + 2)) },
      { regex: /الساعة (\d+)/, handler: (m) => { const d = new Date(); d.setHours(parseInt(m[1]), 0, 0, 0); return d; } },
      { regex: /الساعة (\d+) و (\d+) دقيقة/, handler: (m) => { const d = new Date(); d.setHours(parseInt(m[1]), parseInt(m[2]), 0, 0); return d; } },
      { regex: /الساعة (\d+) والنصف/, handler: (m) => { const d = new Date(); d.setHours(parseInt(m[1]), 30, 0, 0); return d; } },
    ];

    for (const { regex, handler } of patterns) {
      const match = text.match(regex);
      if (match) {
        reminderTime = handler(match).toISOString();
        parsedText = text.replace(match[0], '').trim();
        break;
      }
    }

    return { parsedText: parsedText || text, reminderTime };
  };

  // ✅ دالة تنسيق وقت التذكير للعرض مع العد التنازلي
  const formatReminderTime = (isoString: string): { exactTime: string; countdown: string } => {
    const date = parseISO(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();

    const exactTime = date.toLocaleTimeString('ar-DZ', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });

    let countdown = '';
    const absDiffMs = Math.abs(diffMs);
    const diffMinutes = Math.floor(absDiffMs / 60000);
    const diffHours = Math.floor(absDiffMs / 3600000);
    const diffDays = Math.floor(absDiffMs / 86400000);

    if (diffMs < 0) {
      if (diffMinutes < 1) countdown = 'الآن';
      else if (diffMinutes < 60) countdown = `منذ ${diffMinutes} دقيقة`;
      else if (diffHours < 24) countdown = `منذ ${diffHours} ساعة`;
      else if (diffDays === 1) countdown = 'منذ يوم';
      else if (diffDays === 2) countdown = 'منذ يومين';
      else if (diffDays < 11) countdown = `منذ ${diffDays} أيام`;
      else countdown = `منذ ${diffDays} يوم`;
    } else {
      if (diffMinutes < 1) countdown = 'أقل من دقيقة';
      else if (diffMinutes < 60) countdown = `متبقي ${diffMinutes} دقيقة`;
      else if (diffHours < 24) countdown = `متبقي ${diffHours} ساعة`;
      else if (diffDays === 0) countdown = 'اليوم';
      else if (diffDays === 1) countdown = 'غداً';
      else if (diffDays === 2) countdown = 'بعد غد';
      else if (diffDays < 11) countdown = `متبقي ${diffDays} أيام`;
      else countdown = `متبقي ${diffDays} يوم`;
    }

    return { exactTime, countdown };
  };

  const handleAddReminder = () => {
    if (!inputText.trim()) return;
    const newReminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      reminderTime: reminderDateTime || new Date().toISOString(),
      isCompleted: false
    };
    setReminders(prev => [newReminder, ...prev]);
    setInputText('');
    setReminderDateTime('');
    setRecurring('none');
    setSmartParsed(null); // ✅ إعادة تعيين التحليل الذكي
    setIsAdding(false);
  };

  const handleDelete = (id: string) => setReminders(prev => prev.filter(r => r.id !== id));

  const handleToggleComplete = (id: string) => setReminders(prev => prev.map(r => r.id === id ? { ...r, isCompleted: !r.isCompleted } : r));

  const handleVoiceInput = (text: string) => {
    const { parsedText, reminderTime } = parseArabicTime(text);
    setInputText(parsedText);
    setReminderDateTime(reminderTime);
    setIsAdding(true);
    setAssistantMessage(`✅: "${parsedText}" | ${formatReminderTime(reminderTime).countdown}`);
  };

  // ✅ دالة إغلاق المودال مع إعادة تعيين التحليل الذكي
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
          <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-xl -rotate-6">
            <svg className="w-6 h-6 text-[#E65100]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z"/></svg>
          </div>
          <div><h1 className="text-2xl font-black text-white">Smarty<span className="text-[10px] opacity-40">®</span></h1><span className="text-[8px] font-bold text-white/30">Premium Assistant</span></div>
        </div>
        <div className="flex gap-1">
           <button onClick={() => setShowAbout(true)} className="p-2.5 text-white/70 hover:text-white">
             <Info className="w-5 h-5" />
           </button>
           <button onClick={() => setShowSettings(true)} className="p-2.5 text-white/70 hover:text-white">
             <Settings className="w-5 h-5" />
           </button>
           <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2.5 text-white/70 hover:text-white">
             {soundEnabled ? <Volume2 /> : <VolumeX />}
           </button>
         </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-32">
        <div className="mb-8 relative group">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 text-white/40", isRTL ? "left-4" : "right-4")} />
          <input placeholder="بحث في التذكيرات..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 pr-12 text-white font-bold outline-none focus:border-[#E65100]/50" />
        </div>

        <div className="flex flex-col items-center justify-center my-8">
          <VoiceInput onTranscript={handleVoiceInput} />
          <p className="text-center text-sm text-white/70 mt-2">اضغط للتحدث مع المساعد الذكي</p>
        </div>

        {assistantMessage && <div className="bg-white/10 backdrop-blur-sm text-white p-4 rounded-2xl mb-6 text-center">{assistantMessage}</div>}

        <section className="space-y-4">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4" /> التذكيرات النشطة ({activeReminders.length})</h3>
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {activeReminders.length === 0 ? (
                <div className="text-center py-20 bg-black/5 rounded-[3rem] border border-dashed border-white/10"><p className="text-white/40 font-black text-xs uppercase">لا توجد تذكيرات نشطة</p></div>
              ) : (
                activeReminders.map((rem) => {
                  const { exactTime, countdown } = formatReminderTime(rem.reminderTime);
                  return (
                    <motion.div key={rem.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2.5rem] shadow-lg flex items-start gap-4">
                        <button onClick={() => handleToggleComplete(rem.id)} className="mt-1 w-8 h-8 rounded-2xl border-2 border-zinc-100 flex items-center justify-center text-emerald-500"><CheckCircle2 className="w-5 h-5" /></button>
                        <div className="flex-1">
                          <p className="text-xl font-black dark:text-white">{rem.text}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded-full text-[10px] font-black text-orange-700 dark:text-orange-300">
                              🕐 {exactTime}
                            </span>
                            <span className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full text-[10px] font-black text-blue-700 dark:text-blue-300">
                              ⏳ {countdown}
                            </span>
                            <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-[10px] font-black text-zinc-500">
                              {formatDistanceToNow(parseISO(rem.reminderTime), { addSuffix: true, locale: arDZ })}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => handleDelete(rem.id)} className="text-zinc-300 hover:text-red-500"><Trash2 /></button>
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
