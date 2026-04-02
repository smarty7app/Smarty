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
import {
  Pencil, Trash2, CheckCircle2, Clock, Search, Volume2, VolumeX,
  Settings, Info
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Reminder {
  id: string;
  text: string;
  reminderTime: string;
  isCompleted: boolean;
  recurring?: string;
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
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const { t, isRTL, language } = useLanguage();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      const saved = localStorage.getItem('smarty_reminders');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setReminders(parsed);
        } catch (e) { console.error(e); }
      }
    }
  }, [isMounted]);

  useEffect(() => {
    if (isMounted) localStorage.setItem('smarty_reminders', JSON.stringify(reminders));
  }, [reminders, isMounted]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.muted = true;
      audioRef.current = audio;
    }
  }, []);

  const playSound = () => {
    if (audioRef.current && soundEnabled) {
      audioRef.current.muted = false;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleAddReminder = () => {
    if (!inputText.trim()) return;
    const newReminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      reminderTime: new Date().toISOString(),
      isCompleted: false,
      recurring: recurring !== 'none' ? recurring : undefined,
    };
    setReminders(prev => [newReminder, ...prev]);
    setInputText('');
    setRecurring('none');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const handleToggleComplete = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, isCompleted: !r.isCompleted } : r));
  };

  const handleVoiceInput = async (text: string) => {
    setAssistantMessage(`قال المستخدم: "${text}"\n(سيتم إضافة الذكاء الاصطناعي لاحقًا)`);
    // هنا سنضيف لاحقاً الاتصال بـ API الذكاء الاصطناعي
  };

  const activeReminders = reminders.filter(r => !r.isCompleted);

  if (!isMounted) return null;
  if (showSettings) return <SettingsScreen onBack={() => setShowSettings(false)} />;
  if (showAbout) return <AboutScreen onBack={() => setShowAbout(false)} />;

  return (
    <div className="min-h-screen bg-[#E65100] dark:bg-zinc-950 flex flex-col transition-colors duration-500">
      <header className="sticky top-0 z-10 bg-black/10 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-xl transform -rotate-6">
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
          <button onClick={() => setShowAbout(true)} className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full">
            <Info className="w-5 h-5" />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full">
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full">
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-32">
        <div className="mb-8 relative group">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 text-white/40", isRTL ? "left-4" : "right-4")} />
          <input 
            placeholder="بحث في التذكيرات..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 pr-12 text-white font-bold outline-none focus:border-[#E65100]/50 placeholder:text-white/20"
          />
        </div>

        <div className="flex flex-col items-center justify-center my-8">
          <VoiceInput onTranscript={handleVoiceInput} />
          <p className="text-center text-sm text-white/70 mt-2">
            اضغط للتحدث مع المساعد الذكي
          </p>
        </div>

        {assistantMessage && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 text-white p-4 rounded-2xl mb-6 whitespace-pre-wrap">
            {assistantMessage}
          </div>
        )}

        <section className="space-y-4">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4" /> التذكيرات النشطة ({activeReminders.length})
          </h3>
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {activeReminders.length === 0 ? (
                <div className="text-center py-20 bg-black/5 rounded-[3rem] border border-dashed border-white/10">
                  <p className="text-white/40 font-black text-xs uppercase">لا توجد تذكيرات نشطة</p>
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

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsAdding(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-white dark:bg-zinc-900 text-[#E65100] rounded-2xl shadow-2xl flex items-center justify-center z-50 border border-black/5"
      >
        <Pencil className="w-8 h-8" />
      </motion.button>

      <AddReminderModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        inputText={inputText}
        setInputText={setInputText}
        recurring={recurring}
        setRecurring={setRecurring}
        handleAddReminder={handleAddReminder}
        t={t}
        smartParsed={null}
        activeSuggestions={[]}
        language={language}
        getTimeBeforeLabel={() => ''}
        format={() => ''}
        arDZ={arDZ}
      />

      <footer className="py-8 text-center opacity-20 text-[10px] font-black uppercase">
        Smarty AI Reminder &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
