'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, RefreshCw, Clock, Sparkles, CheckCircle2 
} from 'lucide-react';

// واجهة نتيجة التحليل الذكي
export interface SmartParsedResult {
  parsedText: string;
  reminderTime: string;
  detectedLanguage: 'ar' | 'fr' | 'en';
  confidence: number;
  originalText: string;
}

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

// علم اللغة
const getLanguageFlag = (lang: 'ar' | 'fr' | 'en'): string => {
  switch (lang) {
    case 'ar': return '🇩🇿';
    case 'fr': return '🇫🇷';
    case 'en': return '🇬🇧';
  }
};

// دالة التحليل الذكي فائقة القوة
const analyzeReminderText = (text: string): SmartParsedResult | null => {
  if (!text.trim()) return null;

  const now = new Date();
  let reminderTime: Date = new Date();
  let parsedText = text;
  let detectedLanguage: 'ar' | 'fr' | 'en' = 'ar';
  let confidence = 0;
  let matchedPattern = '';

  // الأنماط العربية
  const arPatterns: { regex: RegExp; handler: (m: RegExpMatchArray) => Date; confidence: number }[] = [
    { regex: /(\d{1,2}):(\d{2})\s*(صباحا|مساء|ص|م)?/i, handler: (m) => { const d = new Date(); let hour = parseInt(m[1]); const minute = parseInt(m[2]); const period = m[3]; if (period && (period.includes('مساء') || period === 'م')) { if (hour < 12) hour += 12; } else if (period && (period.includes('صباحا') || period === 'ص')) { if (hour === 12) hour = 0; } d.setHours(hour, minute, 0, 0); return d; }, confidence: 0.98 },
    { regex: /(\d{1,2})\s*(صباحا|مساء|ص|م)/i, handler: (m) => { const d = new Date(); let hour = parseInt(m[1]); const period = m[2]; if (period && (period.includes('مساء') || period === 'م')) { if (hour < 12) hour += 12; } else if (period && (period.includes('صباحا') || period === 'ص')) { if (hour === 12) hour = 0; } d.setHours(hour, 0, 0, 0); return d; }, confidence: 0.95 },
    { regex: /(غدا|غداً).*?(\d{1,2}(:\d{2})?)\s*(صباحا|مساء|ص|م)?/i, handler: (m) => { const d = new Date(); d.setDate(d.getDate() + 1); const timeMatch = m[0].match(/(\d{1,2})(:(\d{2}))?/); if (timeMatch) { let hour = parseInt(timeMatch[1]); const minute = timeMatch[3] ? parseInt(timeMatch[3]) : 0; const period = m[4]; if (period && (period.includes('مساء') || period === 'م')) { if (hour < 12) hour += 12; } d.setHours(hour, minute, 0, 0); } return d; }, confidence: 0.96 },
    { regex: /(غدا|غداً)/i, handler: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.95 },
    { regex: /بعد\s+غد/i, handler: () => { const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.95 },
    { regex: /بعد\s+(\d+)\s+دقيقة/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 60000), confidence: 0.95 },
    { regex: /بعد\s+(\d+)\s+ساعة/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 3600000), confidence: 0.95 },
    { regex: /بعد\s+(\d+)\s+يوم/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 86400000), confidence: 0.95 },
  ];

  for (const { regex, handler, confidence: conf } of arPatterns) {
    const match = text.match(regex);
    if (match) {
      reminderTime = handler(match);
      detectedLanguage = 'ar';
      confidence = conf;
      matchedPattern = match[0];
      break;
    }
  }

  if (matchedPattern) {
    parsedText = text.replace(matchedPattern, '').trim();
    parsedText = parsedText.replace(/^(في|على|تذكير|ذكرني|موعد)\s*/gi, '').trim();
    parsedText = parsedText.replace(/\s+/g, ' ').trim();
  }

  if (!parsedText) {
    parsedText = text.replace(/(غدا|غداً|اليوم|تذكير|ذكرني|موعد|\d{1,2}(:\d{2})?\s*(صباحا|مساء)?)/gi, '').trim();
    if (!parsedText) parsedText = text;
  }

  return {
    parsedText: parsedText || text,
    reminderTime: reminderTime.toISOString(),
    detectedLanguage,
    confidence,
    originalText: text
  };
};

// تنسيق الوقت للعرض
const formatDetectedTime = (isoString: string, lang: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  
  let dayStr = '';
  if (diffDays === 0) dayStr = 'اليوم';
  else if (diffDays === 1) dayStr = 'غداً';
  else if (diffDays === 2) dayStr = 'بعد غد';
  else if (diffDays < 7 && lang === 'ar') dayStr = arabicDays[date.getDay()];
  else dayStr = date.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { weekday: 'long' });
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'مساءً' : 'صباحاً';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  
  const timeStr = minutes > 0 ? `${hours}:${minutes.toString().padStart(2, '0')} ${period}` : `${hours}:00 ${period}`;
  return `${dayStr}، ${timeStr}`;
};

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
  
  useEffect(() => {
    if (inputText.trim()) {
      const result = analyzeReminderText(inputText);
      setSmartParsed(result);
      if (result && onReminderTimeDetected) {
        onReminderTimeDetected(result.reminderTime);
      }
    } else {
      setSmartParsed(null);
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
                        تحليل ذكي {getLanguageFlag(smartParsed.detectedLanguage)}
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
              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 p-4 rounded-2xl">
                <RefreshCw className="w-5 h-5 text-zinc-400" />
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-black text-zinc-400 mb-1">{t.recurring || 'تكرار'}</p>
                  <select 
                    value={recurring}
                    onChange={(e) => setRecurring(e.target.value)}
                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-black dark:text-white"
                  >
                    <option value="none">{t.once || 'مرة واحدة'}</option>
                    <option value="hourly">{t.hourly || 'كل ساعة'}</option>
                    <option value="daily">{t.daily || 'يومياً'}</option>
                    <option value="weekly">{t.weekly || 'أسبوعياً'}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-black py-4 rounded-2xl">
                {t.cancel || 'إلغاء'}
              </button>
              <button onClick={handleAddReminder} disabled={!inputText.trim()} className="flex-[2] bg-[#E65100] text-white font-black py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {t.save_reminder || 'حفظ التذكير'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
      }
