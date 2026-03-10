import {
  addMinutes,
  addHours,
  addWeeks,
  addDays,
  setHours,
  setMinutes,
  setSeconds,
  isBefore,
  format,
  differenceInMinutes,
  isValid,
} from 'date-fns';

import { arSA, enUS } from 'date-fns/locale'; 
import { LanguageCode, translations } from './translations';

// ===================== الأنواع الأساسية (التي كانت مفقودة) =====================

export type Priority = 1 | 2 | 3 | 4;

export enum EventType {
  FLIGHT = 'FLIGHT',
  MEETING = 'MEETING',
  MEDICINE = 'MEDICINE',
  FOOD = 'FOOD',
  APPOINTMENT = 'APPOINTMENT',
  TRAVEL = 'TRAVEL',
  SCHOOL = 'SCHOOL',
  OTHER = 'OTHER',
}

// تم إعادة تصدير ReminderStage لإصلاح خطأ الـ Build
export enum ReminderStage {
  WARNING = 'WARNING',
  FINAL = 'FINAL',
}

export interface TimeParseResult {
  dateTime: Date | null;
  confidence: number;
  isTimeDetected: boolean;
}

const arabicNumbers: Record<string, number> = {
  'واحد': 1, 'اثنين': 2, 'ثلاثة': 3, 'اربعة': 4, 'خمسة': 5, 'ستة': 6, 'سبعة': 7, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10
};

const foodKeywords = ['حليب', 'طعام', 'فرن', 'نار', 'اكل', 'طبخ', 'عشاء', 'غداء', 'milk', 'food', 'oven', 'stove', 'cuisine'];
const medicineKeywords = ['دواء', 'علاج', 'انسولين', 'حبة', 'بندول', 'medicine', 'pill', 'medication', 'médicament'];
const travelKeywords = ['رحلة', 'سفر', 'طيارة', 'مطار', 'trip', 'travel', 'flight', 'airport', 'voyage'];

// ===================== محرك تحليل الوقت العالمي v4.0 =====================

export function extractTimeFromText(text: string, now: Date): TimeParseResult {
  const lowerText = text.toLowerCase().trim();
  let eventTime = new Date(now);
  let isTimeDetected = false;
  let confidence = 0.4;

  if (/(غداً|غدا|بكرة|tomorrow|demain)/i.test(lowerText)) {
    eventTime = addDays(now, 1);
    isTimeDetected = true;
    confidence = 0.8;
  } else if (/(بعد يومين|in 2 days|dans 2 jours)/i.test(lowerText)) {
    eventTime = addDays(now, 2);
    isTimeDetected = true;
    confidence = 0.8;
  }

  const digitalTimeRegex = /(?:الساعة|الساعه|على|في|at|@|à|time|heure)\s*(\d{1,2}|واحد|اثنين|ثلاثة|اربعة|خمسة)(?::|h)?(\d{2})?\s*(صباحاً|صباحا|مساءً|مساءا|ص|م|am|pm|soir|matin)?/i;
  const timeMatch = lowerText.match(digitalTimeRegex);

  if (timeMatch) {
    let hourStr = timeMatch[1];
    let hours = isNaN(parseInt(hourStr)) ? arabicNumbers[hourStr] : parseInt(hourStr);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3];

    if (hours !== undefined) {
      if (period) {
        if (/(مساءً|مساءا|م|pm|soir)/i.test(period) && hours < 12) hours += 12;
        if (/(صباحاً|صباحا|ص|am|matin)/i.test(period) && hours === 12) hours = 0;
      } else {
        const targetDate = setHours(setMinutes(new Date(eventTime), minutes), hours);
        if (isBefore(targetDate, now) && hours < 12) hours += 12;
      }

      eventTime = setHours(setMinutes(setSeconds(eventTime, 0), minutes), hours);
      isTimeDetected = true;
      confidence = 1.0;
      return { dateTime: eventTime, confidence, isTimeDetected };
    }
  }

  const relativePatterns = [
    { p: /(?:بعد|in|dans|بعد)\s+(\d+)\s+(?:دقيقة|minutes?|min|دقائق)/i, fn: (d: Date, m: any) => addMinutes(d, parseInt(m[1])) },
    { p: /(?:بعد|after|dans)\s+(\d+)\s+(?:ساعة|hours?|heures?|ساعات)/i, fn: (d: Date, m: any) => addHours(d, parseInt(m[1])) },
    { p: /(?:ساعة ونصف|hour and half|heure et demie)/i, fn: (d: Date) => addMinutes(d, 90) },
    { p: /(?:نصف ساعة|half hour|demie heure)/i, fn: (d: Date) => addMinutes(d, 30) },
  ];

  for (const item of relativePatterns) {
    const m = lowerText.match(item.p);
    if (m) {
      return { dateTime: item.fn(now, m), confidence: 0.9, isTimeDetected: true };
    }
  }

  return { dateTime: addMinutes(now, 15), confidence: 0.4, isTimeDetected: false };
}

export function extractSmartTitle(text: string): string {
  return text
    .replace(/(غداً|غدا|بكرة|tomorrow|demain|بعد|خلال|in|dans|at|à|الساعة|الساعه|على|في)/gi, '')
    .replace(/\d{1,2}(:|\s?h\s?)(\d{2})?/g, '')
    .replace(/(صباحاً|صباحا|مساءً|مساءا|ص|م|am|pm|soir|matin)/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || "...";
}

// ===================== الدوال المساعدة للتحليل =====================

export function analyzePriority(text: string): Priority {
  const lowerText = text.toLowerCase();
  const urgent = /(عاجل|ضروري|foura|urgent|important|vite|immédiat)/i.test(lowerText);
  if (urgent || /(دواء|نار|فرن|طائرة|flight)/.test(lowerText)) return 4;
  return 3;
}

export function detectEventType(text: string): EventType {
  const lowerText = text.toLowerCase();
  if (/(طائرة|مطار|flight|avion|airport)/.test(lowerText)) return EventType.FLIGHT;
  if (medicineKeywords.some(kw => lowerText.includes(kw))) return EventType.MEDICINE;
  if (foodKeywords.some(kw => lowerText.includes(kw))) return EventType.FOOD;
  if (/(اجتماع|موعد|meeting|rdv|rendez-vous)/.test(lowerText)) return EventType.MEETING;
  return EventType.OTHER;
}

// إعادة إضافة الدالة المفقودة getPriorityLabel
export function getPriorityLabel(priority: Priority, lang: LanguageCode = 'ar'): string {
  const t = translations[lang];
  switch (priority) {
    case 1: return t.priority_low;
    case 4: return t.priority_critical;
    case 3: return t.priority_high;
    default: return t.priority_medium;
  }
}

// إعادة إضافة الدالة المساعدة للألوان
export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 1: return 'bg-zinc-100 text-zinc-500';
    case 4: return 'bg-red-100 text-red-600 dark:bg-red-900/30';
    case 3: return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30';
    default: return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30';
  }
}

export function parseSmartTime(text: string, lang: LanguageCode = 'ar') {
  const now = new Date();
  const timeResult = extractTimeFromText(text, now);
  const eventType = detectEventType(text);
  const priority = analyzePriority(text);
  const finalEventTime = timeResult.dateTime || addMinutes(now, 15);

  return {
    eventTime: finalEventTime,
    isTimeDetected: timeResult.isTimeDetected,
    confidence: timeResult.confidence,
    priority,
    eventType,
    title: extractSmartTitle(text),
    suggestedMessage: generateCustomMessage(eventType, finalEventTime, lang),
  };
}

export function generateCustomMessage(eventType: EventType, eventTime: Date, lang: LanguageCode = 'ar'): string {
  const timeStr = format(eventTime, 'hh:mm a');
  const isAr = lang === 'ar';
  const messages = {
    [EventType.FLIGHT]: isAr ? `✈️ موعد الرحلة: ${timeStr}` : `✈️ Flight at: ${timeStr}`,
    [EventType.MEDICINE]: isAr ? `💊 وقت الدواء: ${timeStr}` : `💊 Medicine time: ${timeStr}`,
    [EventType.FOOD]: isAr ? `🍲 تفقّد الطعام: ${timeStr}` : `🍲 Check food: ${timeStr}`,
    [EventType.OTHER]: isAr ? `🔔 تذكير: ${timeStr}` : `🔔 Reminder: ${timeStr}`,
  };
  return messages[eventType] || messages[EventType.OTHER];
}
