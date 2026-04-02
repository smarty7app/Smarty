'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Calendar, RefreshCw, Clock, Sparkles, CheckCircle2, Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputText: string;
  setInputText: (text: string) => void;
  recurring: string;
  setRecurring: (value: string) => void;
  handleAddReminder: () => void;
  t: any;
  smartParsed: any;
  activeSuggestions: string[];
  language: string;
  getTimeBeforeLabel: (eventTime: Date, reminderTime: Date) => string;
  format: any;
  arDZ: any;
}

export default function AddReminderModal({
  isOpen,
  onClose,
  inputText,
  setInputText,
  recurring,
  setRecurring,
  handleAddReminder,
  t,
  smartParsed,
  activeSuggestions,
  language,
  getTimeBeforeLabel,
  format,
  arDZ,
}: AddReminderModalProps) {
  if (!isOpen) return null;
  const DRAG_THRESHOLD = 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <motion.div                   
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 45, stiffness: 400, mass: 1 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.05}
          onDragEnd={(event, info) => { if (info.offset.y > DRAG_THRESHOLD) onClose(); }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
        > 
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-6 cursor-grab" />
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-black dark:text-white tracking-tight">{t.new_reminder}</h2>
              <div className="w-10 h-10 bg-[#E65100]/10 text-[#E65100] rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
            </div>
            
            {/* حقل النص بدون ميكروفون */}
            <div className="relative mb-4 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#E65100] to-amber-500 rounded-[2rem] blur opacity-20 group-focus-within:opacity-40"></div>
              <div className="relative bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus-within:border-[#E65100] rounded-[1.5rem] overflow-hidden">
                <textarea
                  autoFocus
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t.what_to_remember}
                  className="w-full min-h-[120px] p-4 bg-transparent resize-none text-xl text-black dark:text-white outline-none placeholder:text-zinc-300 font-black leading-relaxed"
                />
              </div>
            </div>

            {/* باقي المحتوى (التكرار، الأزرار) كما هو دون تغيير */}
            <div className="mb-6">
              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 p-4 rounded-2xl">
                <RefreshCw className="w-5 h-5 text-zinc-400" />
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-black text-zinc-400 mb-1">{t.recurring}</p>
                  <select 
                    value={recurring}
                    onChange={(e) => setRecurring(e.target.value)}
                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-black dark:text-white"
                  >
                    <option value="none">{t.once}</option>
                    <option value="hourly">{t.hourly}</option>
                    <option value="daily">{t.daily}</option>
                    <option value="weekly">{t.weekly}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-black py-4 rounded-2xl">
                {t.cancel}
              </button>
              <button onClick={handleAddReminder} disabled={!inputText.trim()} className="flex-[2] bg-[#E65100] text-white font-black py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {t.save_reminder}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
        }
