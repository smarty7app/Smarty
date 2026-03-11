'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  Calendar, 
  RefreshCw, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Timer,
  Mic 
} from 'lucide-react';
import VoiceInput from './VoiceInput';
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
        {/* نافذة الكتابة */}
        <motion.div                   
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ 
            type: "spring", 
            damping: 45,
            stiffness: 400,
            mass: 1,
            velocity: 5,
            restDelta: 0.5,
            restSpeed: 0.5
          }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.05}
          onDragEnd={(event, info) => {
            if (info.offset.y > DRAG_THRESHOLD) onClose();
          }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl overflow-y-auto max-h-[90vh] transform-gpu shadow-black/20"
        > 
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing shrink-0" />
          
          <div className="max-w-2xl mx-auto">
            {/* العنوان */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-black dark:text-white tracking-tight">{t.new_reminder}</h2>
              <div className="w-10 h-10 bg-[#E65100]/10 text-[#E65100] rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
            </div>
            
            {/* حقل النص والميكروفون */}
            <div className="relative mb-4 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#E65100] to-amber-500 rounded-[2rem] blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
              <div className="relative bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus-within:border-[#E65100] dark:focus-within:border-[#E65100] rounded-[1.5rem] overflow-hidden transition-all duration-300">
                <textarea
                  autoFocus
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t.what_to_remember}
                  className="w-full min-h-[120px] p-4 bg-transparent resize-none text-xl text-black dark:text-white outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600 font-black leading-relaxed"
                />
                <div className="px-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <VoiceInput onTranscript={setInputText} />
                    <span className="text-xs text-zinc-400 font-bold">اضغط للتحدث</span>
                  </div>
                </div>
              </div>
            </div>
            <AnimatePresence mode="wait">
  {smartParsed && inputText.trim().length > 3 && (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-6" 
    >
      {/* حاوية واحدة رئيسية - تمنع التداخل */}
      <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
        
        {/* السطر الأول: العنوان المستخلص (مرة واحدة فقط) */}
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="bg-orange-500 rounded-lg p-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-orange-900 dark:text-orange-100 truncate leading-tight">
            تذكير جديد: <span className="text-[#E65100]"> 
              {` "${(smartParsed?.title && smartParsed.title !== "..." && smartParsed.title !== "undefined") ? smartParsed.title : inputText}" `} 
            </span>
          </span>
        </div>

        {/* السطر الثاني: شريط المعلومات السريع (ساعة، تاريخ، عد تنازلي) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {/* الوقت */}
          <div className="flex items-center gap-1.5 shrink-0 bg-white/80 dark:bg-black/40 px-2.5 py-1 rounded-lg border border-orange-100/50 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-[#E65100]" />
            <span className="text-[11px] font-black text-zinc-700 dark:text-zinc-200">
              {format(smartParsed.eventTime, 'hh:mm a', { locale: arDZ })}
            </span>
          </div>

          {/* التاريخ الكامل (يوم شهر سنة) */}
          <div className="flex items-center gap-1.5 shrink-0 text-zinc-500 dark:text-zinc-400 px-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">
              {format(smartParsed.eventTime, 'd MMMM yyyy', { locale: arDZ })}
            </span>
          </div>

          {/* العد التنازيلي */}
          <div className="flex items-center gap-1.5 shrink-0 bg-orange-500 text-white px-2.5 py-1 rounded-lg shadow-sm">
            <Timer className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black whitespace-nowrap">
              {getTimeBeforeLabel(new Date(), smartParsed.eventTime)}
            </span>
          </div>
        </div>

        {/* حالة الدقة - تظهر فقط عند الضرورة */}
        {!smartParsed.isTimeDetected && (
          <div className="flex items-center gap-1 px-1">
            <div className="w-1 h-1 bg-zinc-300 rounded-full" />
            <span className="text-[9px] text-zinc-400 font-bold italic">توقيت افتراضي</span>
          </div>
        )}
      </div>
    </motion.div>
  )}
</AnimatePresence>
            
        {/* الاقتراحات الذكية - تظهر إذا كان الحقل فارغاً OR إذا لم يتم اكتشاف وقت محدد */}
<div className="mb-6 px-1">
  {(!inputText || (smartParsed && !smartParsed.isTimeDetected)) ? (
    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
      <p className="w-full text-[10px] font-black text-[#E65100] mb-1 uppercase tracking-[0.2em] opacity-70">
        {t.smart_suggestions}
      </p>
      {/* عرض اقتراحات تساعد المستخدم على تحديد وقت */}
      {["غداً الساعة 9 صباحاً", "بعد ساعتين", "يوم الجمعة القادم"].map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => setInputText(inputText + " " + suggestion)}
          className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:border-[#E65100] transition-all font-bold"
        >
          + {suggestion}
        </button>
      ))}
    </div>
  ) : null}
</div>

            {/* خيار التكرار */}
            <div className="mb-6">
              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl group focus-within:border-[#E65100] transition-colors">
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

            {/* أزرار الحفظ والإلغاء */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-black py-4 rounded-2xl hover:bg-zinc-200 transition-all text-xs uppercase tracking-widest"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleAddReminder}
                disabled={!inputText.trim()}
                className="flex-[2] bg-[#E65100] text-white font-black py-4 rounded-2xl hover:bg-[#BF360C] disabled:opacity-50 transition-all shadow-xl shadow-[#E65100]/20 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
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
 
   
         
