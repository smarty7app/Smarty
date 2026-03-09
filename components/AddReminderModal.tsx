'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import VoiceInput from './VoiceInput';
import { cn } from '@/lib/utils'; // إذا كانت دالة cn موجودة، وإلا استخدم التعريف المحلي

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

  return (
    <AnimatePresence>
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
              
              {/* زر الميكروفون */}
              <div className="px-6 pb-6">
                <div className="flex items-center gap-2 mt-2 mb-4">
                  <VoiceInput onTranscript={setInputText} />
                  <span className="text-sm text-zinc-400">يمكنك أيضاً الضغط على الميكروفون للتحدث</span>
                </div>
              </div>
              
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
                  {/* محتوى التحليل الذكي - انسخه من ملفك الأصلي هنا */}
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
                  onChange={(e) => setRecurring(e.target.value)}
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
              onClick={onClose}
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
    </AnimatePresence>
  );
}
