'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, RefreshCw, Clock, Sparkles, CheckCircle2 
} from 'lucide-react';
import { 
  analyzeReminderInput, 
  formatDetectedTime, 
  type SmartParsedResult 
} from '@/lib/date-parser';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputText: string;
  setInputText: (text: string) => void;
  recurring: string;
  setRecurring: (value: string) => void;
  handleAddReminder: () => void;
  t: any;
  smartParsed: SmartParsedResult | null;
  setSmartParsed: (result: SmartParsedResult | null) => void;
  activeSuggestions?: string[];
  language: string;
  getTimeBeforeLabel?: (eventTime: Date, reminderTime: Date) => string;
  format?: any;
  arDZ: any;
  onReminderTimeDetected?: (time: string) => void;
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
  setSmartParsed,
  activeSuggestions = [],
  language,
  getTimeBeforeLabel = () => '',
  format = (date: Date) => date.toLocaleString(),
  arDZ,
  onReminderTimeDetected,
}: AddReminderModalProps) {

  const [error, setError] = useState<string | null>(null); // ✅ حالة الخطأ

  useEffect(() => {
    if (inputText.trim()) {
      const result = analyzeReminderInput(inputText);
      setSmartParsed(result);
      if (result) {
        setError(null);
        if (onReminderTimeDetected) {
          onReminderTimeDetected(result.reminderTime);
        }
      } else {
        setError('لا يمكن إنشاء تذكير في وقت سابق');
      }
    } else {
      setSmartParsed(null);
      setError(null);
    }
  }, [inputText, setSmartParsed, onReminderTimeDetected]);

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
              <h2 className="text-2xl font-black text-black dark:text-white tracking-tight">{t.new_reminder || 'تذكير جديد'}</h2>
              <div className="w-10 h-10 bg-[#E65100]/10 text-[#E65100] rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
            </div>
            
            <div className="relative mb-4 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#E65100] to-amber-500 rounded-[2rem] blur opacity-20 group-focus-within:opacity-40"></div>
              <div className="relative bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus-within:border-[#E65100] rounded-[1.5rem] overflow-hidden">
                <textarea
                  autoFocus
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t.what_to_remember || 'ماذا تريد أن تتذكر؟'}
                  className="w-full min-h-[120px] p-4 bg-transparent resize-none text-xl text-black dark:text-white outline-none placeholder:text-zinc-300 font-black leading-relaxed"
                />
              </div>
            </div>

            {/* ✅ عرض رسالة الخطأ */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl">
                <p className="text-sm font-bold text-red-600 dark:text-red-400 text-center">{error}</p>
              </div>
            )}

            <AnimatePresence>
              {smartParsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-[#E65100]" />
                      <span className="text-xs font-black text-[#E65100] uppercase tracking-wider">
                        تحليل ذكي
                      </span>
                      <span className="ml-auto text-[10px] font-bold text-zinc-500 bg-white/50 dark:bg-zinc-800/50 px-2 py-0.5 rounded-full">
                        {Math.round(smartParsed.confidence * 100)}% دقة
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-black text-zinc-400 uppercase w-16 pt-0.5">النص</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white flex-1">
                          {smartParsed.parsedText}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#E65100] mt-0.5" />
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex-1">
                          {formatDetectedTime(smartParsed.reminderTime, smartParsed.detectedLanguage)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
           </AnimatePresence>

            <div className="mb-6">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* أيقونة التكرار */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#E65100]/10 to-amber-500/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-[#E65100] dark:text-amber-400" />
                  </div>
                  
                  {/* النص والقائمة المنسدلة */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">
                      {t.recurring || 'تكرار'}
                    </p>
                    
                    {/* قائمة منسدلة مخصصة */}
                    <div className="relative">
                      <select 
                        value={recurring}
                        onChange={(e) => setRecurring(e.target.value)}
                        className="w-full appearance-none bg-transparent border-none p-0 text-base font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-0 cursor-pointer pr-6"
                      >
                        <option value="none">{t.once || 'مرة واحدة'}</option>
                        <option value="hourly">{t.hourly || 'كل ساعة'}</option>
                        <option value="daily">{t.daily || 'يومياً'}</option>
                        <option value="weekly">{t.weekly || 'أسبوعياً'}</option>
                      </select>
                      {/* سهم سفلي مخصص */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={onClose} 
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold py-4 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {t.cancel || 'إلغاء'}
              </button>
              <button 
                onClick={handleAddReminder} 
                disabled={!inputText.trim()} 
                className="flex-[2] bg-gradient-to-r from-[#E65100] to-amber-500 text-white font-bold py-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#E65100]/20 hover:shadow-xl hover:shadow-[#E65100]/30 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                {t.save_reminder || 'حفظ التذكير'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
                      }
