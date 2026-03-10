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

// ===================== الأنواع الأساسية =====================

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

export enum ReminderStage {
  WARNING = 'WARNING',
  FINAL = 'FINAL',
}

export interface Reminder {
  id: string;
  text: string;
  reminderTime: string;
  reminderTimes: string[];
  eventTime: string;
  createdAt: string;
  isCompleted: boolean;
  recurring: 'none' | 'hourly' | 'daily' | 'weekly';
  priority: Priority;
  eventType: EventType;
  location?: string;
  confidence: number;
  suggestedMessage: string;
  snoozeCount: number;
  maxSnooze: number;
  parentId?: string;
  stage: ReminderStage;
  totalDurationMinutes?: number;
}

export interface TimeParseResult {
  dateTime: Date | null;
  confidence: number;
  isTimeDetected: boolean;
}

// ===================== الكلمات المفتاحية والقواميس =====================

const arabicNumbers: Record<string, number> = {
  'واحد': 1, 'اثنين': 2, 'ثلاثة': 3, 'اربعة': 4, 'خمسة': 5, 'ستة': 6, 'سبعة': 7, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10
};

const foodKeywords = ['حليب', 'طعام', 'فرن', 'نار', 'اكل', 'طبخ', 'عشاء', 'غداء', 'milk', 'food', 'oven', 'stove', 'cuisine'];
const medicineKeywords = ['دواء', 'علاج', 'انسولين', 'حبة', 'بندول', 'medicine', 'pill', 'medication', 'médicament'];

// ===================== الكلمات المفتاحية الذكية =====================

export const KEYWORDS: Record<string, { minutes?: number; hours?: number; priority: Priority; type: EventType }> = {
  طعام: { minutes: 10, priority: 3, type: EventType.FOOD },
  حليب: { minutes: 10, priority: 3, type: EventType.FOOD },
  فرن: { minutes: 15, priority: 3, type: EventType.FOOD },
  نار: { minutes: 10, priority: 3, type: EventType.FOOD },
  رحلة: { hours: 12, priority: 2, type: EventType.TRAVEL },
  سفر: { hours: 12, priority: 2, type: EventType.TRAVEL },
  flight: { hours: 24, priority: 4, type: EventType.FLIGHT },
  مدرسة: { hours: 4, priority: 2, type: EventType.SCHOOL },
  موعد: { hours: 2, priority: 2, type: EventType.MEETING },
  دواء: { minutes: 30, priority: 4, type: EventType.MEDICINE },
  طائرة: { hours: 24, priority: 4, type: EventType.FLIGHT },
  مطار: { hours: 24, priority: 4, type: EventType.FLIGHT },
};

// ===================== محرك الوقت المطور v5.0 (الدقة القصوى) =====================

export function extractTimeFromText(text: string, now: Date): TimeParseResult {
  const lowerText = text.toLowerCase().trim();
  let targetDate = new Date(now);
  let isTimeDetected = false;

  // 1. مصفوفة القواعد الذهبية (المدد الزمنية)
  const durationRules = [
    { regex: /(?:بعد|خلال)\s+(نصف|نص)\s+ساعة/i, add: () => addMinutes(now, 30) },
    { regex: /(?:بعد|خلال)\s+ربع\s+ساعة/i, add: () => addMinutes(now, 15) },
    { regex: /(?:بعد|خلال)\s+ثلث\s+ساعة/i, add: () => addMinutes(now, 20) },
    { regex: /(?:بعد|خلال)\s+ساعتين/i, add: () => addHours(now, 2) },
    { regex: /(?:بعد|خلال)\s+يومين/i, add: () => addDays(now, 2) },
    { regex: /(?:بعد|خلال)\s+(\d+|أربع|اربع|ثلاث|خمس|عشرة)\s+(أيام|ايام|يوم)/i, 
      apply: (m: any) => {
        const map: any = { 'أربع': 4, 'اربع': 4, 'ثلاث': 3, 'خمس': 5, 'عشرة': 10 };
        const val = isNaN(parseInt(m[1])) ? map[m[1]] : parseInt(m[1]);
        return addDays(now, val);
      }
    },
    { regex: /(?:بعد|خلال)\s+(\d+|أربع|اربع|ثلاث|خمس)\s+(ساعة|ساعات|ساعه)/i, 
      apply: (m: any) => {
        const map: any = { 'أربع': 4, 'اربع': 4, 'ثلاث': 3, 'خمس': 5 };
        const val = isNaN(parseInt(m[1])) ? map[m[1]] : parseInt(m[1]);
        return addHours(now, val);
      }
    },
    { regex: /(?:بعد|خلال)\s+(\d+|عشر|خمس|عشرة)\s+(دقيقة|دقائق)/i, 
      apply: (m: any) => {
        const map: any = { 'عشر': 10, 'عشرة': 10, 'خمس': 5 };
        const val = isNaN(parseInt(m[1])) ? map[m[1]] : parseInt(m[1]);
        return addMinutes(now, val);
      }
    }
  ];

  // تطبيق قواعد المدد
  for (const rule of durationRules) {
    const match = lowerText.match(rule.regex);
    if (match) {
      targetDate = rule.add ? rule.add() : rule.apply!(match);
      return { dateTime: targetDate, confidence: 1.0, isTimeDetected: true };
    }
  }

  // 2. معالجة الأوقات المحددة (الساعة 4:00 صباحاً)
  const specificTimeRegex = /(?:الساعة|الساعه|للساعه|على|في|at)\s*(\d{1,2})(?::|.)?(\d{2})?\s*(صباحاً|صباحا|مساءً|مساءا|ص|م|am|pm)/i;
  const timeMatch = lowerText.match(specificTimeRegex);

  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3];

    if (period) {
      if (/(مساءً|مساءا|م|pm)/i.test(period) && hours < 12) hours += 12;
      if (/(صباحاً|صباحا|ص|am)/i.test(period) && hours === 12) hours = 0;
    }

    targetDate = setHours(setMinutes(setSeconds(new Date(now), 0), minutes), hours);
    // إذا كان الوقت المطلوب قد مضى اليوم، نجدوله لغد
    if (isBefore(targetDate, now)) targetDate = addDays(targetDate, 1);
    
    return { dateTime: targetDate, confidence: 1.0, isTimeDetected: true };
  }

  // 3. الكلمات المفتاحية البسيطة (غداً، بكرة)
  if (/(غداً|غدا|بكرة|tomorrow)/i.test(lowerText)) {
    return { dateTime: addDays(now, 1), confidence: 0.9, isTimeDetected: true };
  }

  return { dateTime: null, confidence: 0, isTimeDetected: false };
}

export function parseSmartTime(text: string, lang: LanguageCode = 'ar') {
  const now = new Date();
  const timeResult = extractTimeFromText(text, now);
  
  const eventType = detectEventType(text);
  const priority = analyzePriority(text);
  const location = extractLocation(text);

  // إذا لم يتم اكتشاف وقت من النص، نستخدم 15 دقيقة كافتراضي
  const actualTime = timeResult.dateTime || addMinutes(now, 15);

  return {
    eventTime: actualTime,
    reminderTimes: [actualTime],
    isTimeDetected: timeResult.isTimeDetected, 
    confidence: timeResult.confidence,
    priority,
    eventType,
    location,
    title: extractSmartTitle(text),
    suggestedMessage: generateCustomMessage(eventType, actualTime, lang),
  };
}

// ===================== دوال التحليل المساعدة =====================

export function extractLocation(text: string): string | undefined {
  const match = text.match(/(?:في|بـ|at|in)\s+([^ ]+)/i);
  return match ? match[1] : undefined;
}

export function extractSmartTitle(text: string): string {
  return text
    .replace(/(غداً|غدا|بكرة|tomorrow|demain|بعد|خلال|in|dans|at|à|الساعة|الساعه|على|في)/gi, '')
    .replace(/\d{1,2}(:|\s?h\s?)(\d{2})?/g, '')
    .replace(/(صباحاً|صباحا|مساءً|مساءا|ص|م|am|pm|soir|matin)/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || "...";
}

export function analyzePriority(text: string): Priority {
  const lowerText = text.toLowerCase();
  if (/(عاجل|ضروري|urgent|important)/i.test(lowerText) || /(دواء|نار|فرن|طائرة)/.test(lowerText)) return 4;
  return 3;
}

export function detectEventType(text: string): EventType {
  const lowerText = text.toLowerCase();
  if (/(طائرة|مطار|flight)/.test(lowerText)) return EventType.FLIGHT;
  if (medicineKeywords.some(kw => lowerText.includes(kw))) return EventType.MEDICINE;
  if (foodKeywords.some(kw => lowerText.includes(kw))) return EventType.FOOD;
  if (/(اجتماع|موعد|meeting|appointment)/.test(lowerText)) return EventType.MEETING;
  return EventType.OTHER;
}

// ===================== المحرك الرئيسي =====================

export function parseSmartTime(text: string, lang: LanguageCode = 'ar') {
  const now = new Date();
  const timeResult = extractTimeFromText(text, now);
  
  const eventType = detectEventType(text);
  const priority = analyzePriority(text);
  const location = extractLocation(text);

  let finalEventTime = timeResult.dateTime;
  let isTimeDetected = timeResult.isTimeDetected;

  if (!finalEventTime) {
    for (const [word, config] of Object.entries(KEYWORDS)) {
      if (text.toLowerCase().includes(word)) {
        finalEventTime = config.minutes ? addMinutes(now, config.minutes) : addHours(now, config.hours || 0);
        isTimeDetected = true; 
        break;
      }
    }
  }

  const actualTime = finalEventTime || addMinutes(now, 15);

  return {
    eventTime: actualTime,
    reminderTimes: [actualTime], // تم الإصلاح هنا ليتوافق مع النوع Reminder
    isTimeDetected: isTimeDetected, 
    confidence: isTimeDetected ? 1.0 : 0.4,
    priority,
    eventType,
    location,
    title: extractSmartTitle(text),
    suggestedMessage: generateCustomMessage(eventType, actualTime, lang),
  };
}

export function generateCustomMessage(eventType: EventType, eventTime: Date, lang: LanguageCode = 'ar'): string {
  const timeStr = format(eventTime, 'hh:mm a');
  const isAr = lang === 'ar';
  
  switch (eventType) {
    case EventType.FLIGHT: return isAr ? `✈️ موعد الرحلة في ${timeStr}` : `✈️ Flight at ${timeStr}`;
    case EventType.MEDICINE: return isAr ? `💊 حان وقت الدواء (${timeStr})` : `💊 Medicine time (${timeStr})`;
    case EventType.FOOD: return isAr ? `🍲 تفقّد الطعام (${timeStr})` : `🍲 Check the food (${timeStr})`;
    default: return isAr ? `🔔 تذكير: ${timeStr}` : `🔔 Reminder: ${timeStr}`;
  }
}

// ===================== دوال الواجهة (UI) =====================

export function getPriorityLabel(priority: Priority, lang: LanguageCode = 'ar'): string {
  const t = translations[lang];
  switch (priority) {
    case 1: return t.priority_low;
    case 4: return t.priority_critical;
    case 3: return t.priority_high;
    default: return t.priority_medium;
  }
}

export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 1: return 'bg-zinc-100 text-zinc-500';
    case 4: return 'bg-red-100 text-red-600 dark:bg-red-900/30';
    case 3: return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30';
    default: return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30';
  }
}
