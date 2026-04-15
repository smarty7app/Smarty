'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Calendar, RefreshCw, Clock, Sparkles, CheckCircle2, Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ✅ واجهة نتيجة التحليل الذكي
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
  activeSuggestions: string[];
  language: string;
  getTimeBeforeLabel: (eventTime: Date, reminderTime: Date) => string;
  format: any;
  arDZ: any;
  onReminderTimeDetected?: (time: string) => void;
}

// ✅ دالة التحليل الذكي متعددة اللغات
const analyzeReminderText = (text: string): SmartParsedResult | null => {
  if (!text.trim()) return null;

  const now = new Date();
  let reminderTime = now.toISOString();
  let parsedText = text;
  let detectedLanguage: 'ar' | 'fr' | 'en' = 'ar';
  let confidence = 0;

  // الأنماط العربية
  const arPatterns: { regex: RegExp; handler: (m: RegExpMatchArray) => Date; confidence: number }[] = [
    { regex: /بعد (\d+) دقيقة/, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 60000), confidence: 0.9 },
    { regex: /بعد (\d+) ساعة/, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 3600000), confidence: 0.9 },
    { regex: /بعد (\d+) يوم/, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 86400000), confidence: 0.9 },
    { regex: /بعد (\d+) أسبوع|بعد (\d+) اسبوع/, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 7 * 86400000), confidence: 0.9 },
    { regex: /غدا|غداً/, handler: () => new Date(now.setDate(now.getDate() + 1)), confidence: 0.95 },
    { regex: /بعد غد|بعد غداً/, handler: () => new Date(now.setDate(now.getDate() + 2)), confidence: 0.95 },
    { regex: /الساعة (\d+)/, handler: (m) => { const d = new Date(); d.setHours(parseInt(m[1]), 0, 0, 0); return d; }, confidence: 0.85 },
    { regex: /الساعة (\d+) و (\d+) دقيقة/, handler: (m) => { const d = new Date(); d.setHours(parseInt(m[1]), parseInt(m[2]), 0, 0); return d; }, confidence: 0.85 },
    { regex: /الساعة (\d+) والنصف/, handler: (m) => { const d = new Date(); d.setHours(parseInt(m[1]), 30, 0, 0); return d; }, confidence: 0.85 },
  ];

  // الأنماط الفرنسية
  const frPatterns: { regex: RegExp; handler: (m: RegExpMatchArray) => Date; confidence: number }[] = [
    { regex: /dans (\d+) minutes?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 60000), confidence: 0.9 },
    { regex: /dans (\d+) heures?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 3600000), confidence: 0.9 },
    { regex: /dans (\d+) jours?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 86400000), confidence: 0.9 },
    { regex: /dans (\d+) semaines?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 7 * 86400000), confidence: 0.9 },
    { regex: /demain/i, handler: () => new Date(now.setDate(now.getDate() + 1)), confidence: 0.95 },
    { regex: /après-demain/i, handler: () => new Date(now.setDate(now.getDate() + 2)), confidence: 0.95 },
    { regex: /à (\d+)h/i, handler: (m) => { const d = new Date(); d.setHours(parseInt(m[1]), 0, 0); return d; }, confidence: 0.85 },
    { regex: /à (\d+)h(\d+)/i, handler: (m) => { const d = new Date(); d.setHours(parseInt(m[1]), parseInt(m[2]), 0); return d; }, confidence: 0.85 },
  ];

  // الأنماط الإنجليزية
  const enPatterns: { regex: RegExp; handler: (m: RegExpMatchArray) => Date; confidence: number }[] = [
    { regex: /in (\d+) minutes?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 60000), confidence: 0.9 },
    { regex: /in (\d+) hours?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 3600000), confidence: 0.9 },
    { regex: /in (\d+) days?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 86400000), confidence: 0.9 },
    { regex: /in (\d+) weeks?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 7 * 86400000), confidence: 0.9 },
    { regex: /tomorrow/i, handler: () => new Date(now.setDate(now.getDate() + 1)), confidence: 0.95 },
    { regex: /day after tomorrow/i, handler: () => new Date(now.setDate(now.getDate() + 2)), confidence: 0.95 },
    { regex: /at (\d+)/i, handler: (m) => { const d = new Date(); d.setHours(parseInt(m[1]), 0, 0); return d; }, confidence: 0.85 },
    { regex: /at (\d+):(\d+)/i, handler: (m) => { const d = new Date(); d.setHours(parseInt(m[1]), parseInt(m[2]), 0); return d; }, confidence: 0.85 },
  ];

  // فحص العربية أولاً
  for (const { regex, handler, confidence: conf } of arPatterns) {
    const match = text.match(regex);
    if (match) {
      reminderTime = handler(match).toISOString();
      parsedText = text.replace(match[0], '').trim();

      // ✅ دالة التحليل الذكي فائقة القوة - تستخرج الوقت من الحروف والأرقام
const analyzeReminderText = (text: string): SmartParsedResult | null => {
  if (!text.trim()) return null;

  const now = new Date();
  let reminderTime: Date = new Date();
  let parsedText = text;
  let detectedLanguage: 'ar' | 'fr' | 'en' = 'ar';
  let confidence = 0;
  let matchedPattern = '';

  // ================ العربية ================
  const arPatterns: { regex: RegExp; handler: (m: RegExpMatchArray) => Date; confidence: number }[] = [
    // الساعة الرقمية مع الدقائق: "11:30" أو "11:30 صباحا" أو "11:30 مساء"
    { 
      regex: /(\d{1,2}):(\d{2})\s*(صباحا|مساء|ص|م)?/i, 
      handler: (m) => { 
        const d = new Date(); 
        let hour = parseInt(m[1]);
        const minute = parseInt(m[2]);
        const period = m[3];
        if (period && (period.includes('مساء') || period === 'م')) { if (hour < 12) hour += 12; }
        else if (period && (period.includes('صباحا') || period === 'ص')) { if (hour === 12) hour = 0; }
        d.setHours(hour, minute, 0, 0); 
        return d; 
      }, 
      confidence: 0.98 
    },
    // الساعة الرقمية فقط: "11 صباحا" أو "11 مساء" أو "11 ص" أو "11 م"
    { 
      regex: /(\d{1,2})\s*(صباحا|مساء|ص|م)/i, 
      handler: (m) => { 
        const d = new Date(); 
        let hour = parseInt(m[1]);
        const period = m[2];
        if (period && (period.includes('مساء') || period === 'م')) { if (hour < 12) hour += 12; }
        else if (period && (period.includes('صباحا') || period === 'ص')) { if (hour === 12) hour = 0; }
        d.setHours(hour, 0, 0, 0); 
        return d; 
      }, 
      confidence: 0.95 
    },
    // الساعة كتابة: "الحادية عشرة" - "الثانية عشرة"
    { regex: /(الساعة\s+)?(الواحدة|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة|الحادية عشرة|الثانية عشرة)\s*(صباحا|مساء|صباحاً|مساءً|ص|م)?/i, handler: (m) => { const d = new Date(); const hourMap: Record<string, number> = { 'الواحدة': 1, 'الثانية': 2, 'الثالثة': 3, 'الرابعة': 4, 'الخامسة': 5, 'السادسة': 6, 'السابعة': 7, 'الثامنة': 8, 'التاسعة': 9, 'العاشرة': 10, 'الحادية عشرة': 11, 'الثانية عشرة': 12 }; let hour = hourMap[m[2]] || 0; const period = m[3]; if (period && (period.includes('مساء') || period === 'م')) { if (hour < 12) hour += 12; } else if (period && (period.includes('صباحا') || period === 'ص')) { if (hour === 12) hour = 0; } d.setHours(hour, 0, 0, 0); return d; }, confidence: 0.92 },
    // الساعة كتابة مع الدقائق: "الحادية عشرة و ثلاثون دقيقة"
    { regex: /(الساعة\s+)?(الواحدة|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة|الحادية عشرة|الثانية عشرة)\s+و\s+(\d+|[أ-ي]+)\s*دقيقة/i, handler: (m) => { const d = new Date(); const hourMap: Record<string, number> = { 'الواحدة': 1, 'الثانية': 2, 'الثالثة': 3, 'الرابعة': 4, 'الخامسة': 5, 'السادسة': 6, 'السابعة': 7, 'الثامنة': 8, 'التاسعة': 9, 'العاشرة': 10, 'الحادية عشرة': 11, 'الثانية عشرة': 12 }; let hour = hourMap[m[2]] || 0; const minute = parseInt(m[3]) || 0; d.setHours(hour, minute, 0, 0); return d; }, confidence: 0.9 },
    // والنصف: "الحادية عشرة والنصف"
    { regex: /(الساعة\s+)?(الواحدة|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة|الحادية عشرة|الثانية عشرة)\s+والنصف/i, handler: (m) => { const d = new Date(); const hourMap: Record<string, number> = { 'الواحدة': 1, 'الثانية': 2, 'الثالثة': 3, 'الرابعة': 4, 'الخامسة': 5, 'السادسة': 6, 'السابعة': 7, 'الثامنة': 8, 'التاسعة': 9, 'العاشرة': 10, 'الحادية عشرة': 11, 'الثانية عشرة': 12 }; let hour = hourMap[m[2]] || 0; d.setHours(hour, 30, 0, 0); return d; }, confidence: 0.9 },
    // والربع: "الحادية عشرة والربع"
    { regex: /(الساعة\s+)?(الواحدة|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة|الحادية عشرة|الثانية عشرة)\s+والربع/i, handler: (m) => { const d = new Date(); const hourMap: Record<string, number> = { 'الواحدة': 1, 'الثانية': 2, 'الثالثة': 3, 'الرابعة': 4, 'الخامسة': 5, 'السادسة': 6, 'السابعة': 7, 'الثامنة': 8, 'التاسعة': 9, 'العاشرة': 10, 'الحادية عشرة': 11, 'الثانية عشرة': 12 }; let hour = hourMap[m[2]] || 0; d.setHours(hour, 15, 0, 0); return d; }, confidence: 0.9 },
    // والثلث: "الحادية عشرة والثلث"
    { regex: /(الساعة\s+)?(الواحدة|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة|الحادية عشرة|الثانية عشرة)\s+والثلث/i, handler: (m) => { const d = new Date(); const hourMap: Record<string, number> = { 'الواحدة': 1, 'الثانية': 2, 'الثالثة': 3, 'الرابعة': 4, 'الخامسة': 5, 'السادسة': 6, 'السابعة': 7, 'الثامنة': 8, 'التاسعة': 9, 'العاشرة': 10, 'الحادية عشرة': 11, 'الثانية عشرة': 12 }; let hour = hourMap[m[2]] || 0; d.setHours(hour, 20, 0, 0); return d; }, confidence: 0.88 },
    // غداً مع وقت: "غدا الساعة 11" أو "غدا 11:30"
    { regex: /(غدا|غداً).*?(\d{1,2}(:\d{2})?)\s*(صباحا|مساء|ص|م)?/i, handler: (m) => { const d = new Date(); d.setDate(d.getDate() + 1); const timeMatch = m[0].match(/(\d{1,2})(:(\d{2}))?/); if (timeMatch) { let hour = parseInt(timeMatch[1]); const minute = timeMatch[3] ? parseInt(timeMatch[3]) : 0; const period = m[4]; if (period && (period.includes('مساء') || period === 'م')) { if (hour < 12) hour += 12; } d.setHours(hour, minute, 0, 0); } return d; }, confidence: 0.96 },
    // غداً (بدون وقت محدد)
    { regex: /(غدا|غداً)/i, handler: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.95 },
    // بعد غد
    { regex: /بعد\s+غد/i, handler: () => { const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.95 },
    // اليوم مع وقت
    { regex: /اليوم.*?(\d{1,2}(:\d{2})?)\s*(صباحا|مساء|ص|م)?/i, handler: (m) => { const d = new Date(); const timeMatch = m[0].match(/(\d{1,2})(:(\d{2}))?/); if (timeMatch) { let hour = parseInt(timeMatch[1]); const minute = timeMatch[3] ? parseInt(timeMatch[3]) : 0; const period = m[3]; if (period && (period.includes('مساء') || period === 'م')) { if (hour < 12) hour += 12; } d.setHours(hour, minute, 0, 0); } return d; }, confidence: 0.94 },
    // بعد X دقيقة
    { regex: /بعد\s+(\d+)\s+دقيقة/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 60000), confidence: 0.95 },
    // بعد X ساعة
    { regex: /بعد\s+(\d+)\s+ساعة/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 3600000), confidence: 0.95 },
    // بعد X يوم
    { regex: /بعد\s+(\d+)\s+يوم/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 86400000), confidence: 0.95 },
    // بعد X أسبوع
    { regex: /بعد\s+(\d+)\s+(أسبوع|اسبوع)/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 7 * 86400000), confidence: 0.93 },
  ];

  // ================ الفرنسية ================
  const frPatterns: { regex: RegExp; handler: (m: RegExpMatchArray) => Date; confidence: number }[] = [
    { regex: /demain.*?(\d{1,2}[h:]?\d{0,2})/i, handler: (m) => { const d = new Date(); d.setDate(d.getDate() + 1); const timeMatch = m[1].match(/(\d{1,2})[h:]?(\d{0,2})/); if (timeMatch) { d.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]) || 0, 0, 0); } return d; }, confidence: 0.96 },
    { regex: /demain/i, handler: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.95 },
    { regex: /après-demain/i, handler: () => { const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.95 },
    { regex: /aujourd'hui.*?(\d{1,2}[h:]?\d{0,2})/i, handler: (m) => { const d = new Date(); const timeMatch = m[1].match(/(\d{1,2})[h:]?(\d{0,2})/); if (timeMatch) { d.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]) || 0, 0, 0); } return d; }, confidence: 0.94 },
    { regex: /à\s+(\d{1,2})[h:](\d{2})/i, handler: (m) => { const d = new Date(); d.setHours(parseInt(m[1]), parseInt(m[2]), 0, 0); return d; }, confidence: 0.96 },
    { regex: /à\s+(\d{1,2})h/i, handler: (m) => { const d = new Date(); d.setHours(parseInt(m[1]), 0, 0, 0); return d; }, confidence: 0.94 },
    { regex: /dans\s+(\d+)\s+minutes?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 60000), confidence: 0.95 },
    { regex: /dans\s+(\d+)\s+heures?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 3600000), confidence: 0.95 },
    { regex: /dans\s+(\d+)\s+jours?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 86400000), confidence: 0.95 },
  ];

  // ================ الإنجليزية ================
  const enPatterns: { regex: RegExp; handler: (m: RegExpMatchArray) => Date; confidence: number }[] = [
    { regex: /tomorrow.*?(\d{1,2}[:.]?\d{0,2})\s*(am|pm)?/i, handler: (m) => { const d = new Date(); d.setDate(d.getDate() + 1); const timeMatch = m[1].match(/(\d{1,2})[:.]?(\d{0,2})/); if (timeMatch) { let hour = parseInt(timeMatch[1]); const minute = parseInt(timeMatch[2]) || 0; const period = m[2]; if (period && period.toLowerCase() === 'pm' && hour < 12) hour += 12; if (period && period.toLowerCase() === 'am' && hour === 12) hour = 0; d.setHours(hour, minute, 0, 0); } return d; }, confidence: 0.96 },
    { regex: /tomorrow/i, handler: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.95 },
    { regex: /today.*?(\d{1,2}[:.]?\d{0,2})\s*(am|pm)?/i, handler: (m) => { const d = new Date(); const timeMatch = m[1].match(/(\d{1,2})[:.]?(\d{0,2})/); if (timeMatch) { let hour = parseInt(timeMatch[1]); const minute = parseInt(timeMatch[2]) || 0; const period = m[2]; if (period && period.toLowerCase() === 'pm' && hour < 12) hour += 12; if (period && period.toLowerCase() === 'am' && hour === 12) hour = 0; d.setHours(hour, minute, 0, 0); } return d; }, confidence: 0.94 },
    { regex: /at\s+(\d{1,2})[:.](\d{2})\s*(am|pm)?/i, handler: (m) => { const d = new Date(); let hour = parseInt(m[1]); const minute = parseInt(m[2]); const period = m[3]; if (period && period.toLowerCase() === 'pm' && hour < 12) hour += 12; if (period && period.toLowerCase() === 'am' && hour === 12) hour = 0; d.setHours(hour, minute, 0, 0); return d; }, confidence: 0.96 },
    { regex: /at\s+(\d{1,2})\s*(am|pm)/i, handler: (m) => { const d = new Date(); let hour = parseInt(m[1]); const period = m[2]; if (period && period.toLowerCase() === 'pm' && hour < 12) hour += 12; if (period && period.toLowerCase() === 'am' && hour === 12) hour = 0; d.setHours(hour, 0, 0, 0); return d; }, confidence: 0.94 },
    { regex: /in\s+(\d+)\s+minutes?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 60000), confidence: 0.95 },
    { regex: /in\s+(\d+)\s+hours?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 3600000), confidence: 0.95 },
    { regex: /in\s+(\d+)\s+days?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 86400000), confidence: 0.95 },
  ];

  // ================ فحص جميع اللغات ================
  
  // فحص العربية
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

  // فحص الفرنسية إذا لم يتم العثور على تطابق عربي
  if (confidence === 0) {
    for (const { regex, handler, confidence: conf } of frPatterns) {
      const match = text.match(regex);
      if (match) {
        reminderTime = handler(match);
        detectedLanguage = 'fr';
        confidence = conf;
        matchedPattern = match[0];
        break;
      }
    }
  }

  // فحص الإنجليزية
  if (confidence === 0) {
    for (const { regex, handler, confidence: conf } of enPatterns) {
      const match = text.match(regex);
      if (match) {
        reminderTime = handler(match);
        detectedLanguage = 'en';
        confidence = conf;
        matchedPattern = match[0];
        break;
      }
    }
  }

  // ================ تنظيف النص من عبارات الوقت ================
  if (matchedPattern) {
    // إزالة النمط المطابق من النص
    parsedText = text.replace(matchedPattern, '').trim();
    
    // إزالة الكلمات الزائدة
    const fillerWords = /^(في|على|عن|عنوان|تذكير|ذكرني|بأن|ان|أن|بـ|لل|ال)/gi;
    parsedText = parsedText.replace(fillerWords, '').trim();
    
    // تنظيف المسافات الزائدة
    parsedText = parsedText.replace(/\s+/g, ' ').trim();
  }

  // إذا كان النص المستخرج فارغاً، استخدم النص الأصلي مع تنظيف بسيط
  if (!parsedText) {
    parsedText = text.replace(/(غدا|غداً|اليوم|بعد غد|تذكير|ذكرني|موعد|في|على|الساعة|\d{1,2}(:\d{2})?\s*(صباحا|مساء)?)/gi, '').trim();
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

  return null;
};

// ✅ تنسيق الوقت للعرض
const formatDetectedTime = (isoString: string, lang: string): string => {
  const date = new Date(isoString);
  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return date.toLocaleString(locale, {
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
};

// ✅ علم اللغة
const getLanguageFlag = (lang: 'ar' | 'fr' | 'en'): string => {
  switch (lang) {
    case 'ar': return '🇩🇿';
    case 'fr': return '🇫🇷';
    case 'en': return '🇬🇧';
  }
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
  activeSuggestions,
  language,
  getTimeBeforeLabel,
  format,
  arDZ,
  onReminderTimeDetected,
}: AddReminderModalProps) {
  
  // ✅ تحليل النص أثناء الكتابة
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
              <h2 className="text-2xl font-black text-black dark:text-white tracking-tight">{t.new_reminder}</h2>
              <div className="w-10 h-10 bg-[#E65100]/10 text-[#E65100] rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
            </div>
            
            {/* حقل النص */}
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

            {/* ✅ لوحة التحليل الذكي - تظهر أسفل حقل الكتابة */}
            <AnimatePresence>
              {smartParsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
                    {/* رأس اللوحة */}
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-[#E65100]" />
                      <span className="text-xs font-black text-[#E65100] uppercase tracking-wider">
                        تحليل ذكي {getLanguageFlag(smartParsed.detectedLanguage)}
                      </span>
                      <span className="ml-auto text-[10px] font-bold text-zinc-500 bg-white/50 dark:bg-zinc-800/50 px-2 py-0.5 rounded-full">
                        {Math.round(smartParsed.confidence * 100)}% دقة
                      </span>
                    </div>

                    {/* محتوى اللوحة */}
                    <div className="space-y-2">
                      {/* النص المستخرج */}
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-black text-zinc-400 uppercase w-16 pt-0.5">النص</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white flex-1">
                          {smartParsed.parsedText}
                        </span>
                      </div>

                      {/* الوقت المستخرج */}
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#E65100] mt-0.5" />
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex-1">
                          {formatDetectedTime(smartParsed.reminderTime, smartParsed.detectedLanguage)}
                        </span>
                      </div>

                      {/* النص الأصلي (اختياري) */}
                      {smartParsed.originalText !== smartParsed.parsedText && (
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-black text-zinc-400 uppercase w-16 pt-0.5">الأصلي</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-1 line-through">
                            {smartParsed.originalText}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* التكرار */}
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

            {/* الأزرار */}
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
