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
const travelKeywords = ['رحلة', 'سفر', 'طيارة', 'مطار', 'trip', 'travel', 'flight', 'airport', 'voyage'];

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

// ===================== محرك الوقت المطور v4.0 (Multilingual) =====================

export function extractTimeFromText(text: string, now: Date): TimeParseResult {
  const lowerText = text.toLowerCase().trim();
  let eventTime = new Date(now);
  let isTimeDetected = false;
  let confidence = 0.4;

  // 1. الأيام (عربي، إنجليزي، فرنسي)
  if (/(غداً|غدا|بكرة|tomorrow|demain)/i.test(lowerText)) {
    eventTime = addDays(now, 1);
    isTimeDetected = true;
    confidence = 0.8;
  } else if (/(بعد يومين|in 2 days|dans 2 jours)/i.test(lowerText)) {
    eventTime = addDays(now, 2);
    isTimeDetected = true;
    confidence = 0.8;
  }

  // 2. التحليل الرقمي (مثل: الساعة 7:30 مساءً، at 5pm، à 10h)
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

  // 3. الأنماط النسبية
  const relativePatterns = [
    { p: /(?:بعد|in|dans|خلال)\s+(\d+)\s+(?:دقيقة|minutes?|min|دقائق)/i, fn: (d: Date, m: any) => addMinutes(d, parseInt(m[1])) },
    { p: /(?:بعد|after|dans|خلال)\s+(\d+)\s+(?:ساعة|hours?|heures?|ساعات)/i, fn: (d: Date, m: any) => addHours(d, parseInt(m[1])) },
    { p: /(?:نصف ساعة|half hour|demie heure|نص ساعة)/i, fn: (d: Date) => addMinutes(d, 30) },
    { p: /(?:ربع ساعة|quarter hour|quart d'heure)/i, fn: (d: Date) => addMinutes(d, 15) },
  ];

  for (const item of relativePatterns) {
    const m = lowerText.match(item.p);
    if (m) return { dateTime: item.fn(now, m), confidence: 0.9, isTimeDetected: true };
  }

  return { dateTime: null, confidence: 0, isTimeDetected: false };
}

// ===================== دوال التحليل المساعدة =====================

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
  const urgent = /(عاجل|ضروري|foura|urgent|important|vite|immédiat)/i.test(lowerText);
  if (urgent || /(دواء|نار|فرن|طائرة|flight)/.test(lowerText)) return 4;
  return 3;
}

export function detectEventType(text: string): EventType {
  const lowerText = text.toLowerCase();
  if (/(طائرة|مطار|flight|avion|airport)/.test(lowerText)) return EventType.FLIGHT;
  if (medicineKeywords.some(kw => lowerText.includes(kw))) return EventType.MEDICINE;
  if (foodKeywords.some(kw => lowerText.includes(kw))) return EventType.FOOD;
  if (/(اجتماع|موعد|meeting|rdv|rendez-vous|appointment)/.test(lowerText)) return EventType.MEETING;
  return EventType.OTHER;
}

export function extractLocation(text: string): string | undefined {
  const locationPattern = /(?:في|بـ|بمنطقة|at|in)\s+([^\s]+(?:\s+[^\s]+){0,2})/;
  const match = text.match(locationPattern);
  return match ? match[1].trim() : undefined;
}

// ===================== الدالة الأساسية (المخ) =====================

export function parseSmartTime(text: string, lang: LanguageCode = 'ar') {
  const now = new Date();
  const timeResult = extractTimeFromText(text, now);
  
  const eventType = detectEventType(text);
  const priority = analyzePriority(text);
  const location = extractLocation(text);

  let eventTime = timeResult.dateTime;

  // دعم الكلمات المفتاحية KEYWORDS من الملف القديم إذا لم يكتشف وقت محدد
  if (!eventTime) {
    for (const [word, config] of Object.entries(KEYWORDS)) {
      if (text.toLowerCase().includes(word)) {
        if (config.minutes) eventTime = addMinutes(now, config.minutes);
        else if (config.hours) eventTime = addHours(now, config.hours);
        break;
      }
    }
  }

  const finalEventTime = eventTime || addMinutes(now, 15);
  const diffMinutes = differenceInMinutes(finalEventTime, now);

  // منطق التنبيهات المتعددة (من الملف القديم)
  let reminderTimes: Date[] = [];
  if (diffMinutes > 60) {
    reminderTimes = [addMinutes(finalEventTime, -30), finalEventTime];
  } else if (diffMinutes > 15) {
    reminderTimes = [addMinutes(finalEventTime, -5), finalEventTime];
  } else {
    reminderTimes = [finalEventTime];
  }

  return {
    eventTime: finalEventTime,
    reminderTimes,
    isTimeDetected: timeResult.isTimeDetected,
    confidence: timeResult.confidence || 0.4,
    priority,
    eventType,
    location,
    title: extractSmartTitle(text),
    suggestedMessage: generateCustomMessage(eventType, finalEventTime, lang),
    totalDurationMinutes: timeResult.isTimeDetected ? null : diffMinutes,
  };
}

export function generateCustomMessage(eventType: EventType, eventTime: Date, lang: LanguageCode = 'ar'): string {
  const timeStr = format(eventTime, 'hh:mm a');
  const isAr = lang === 'ar';
  
  switch (eventType) {
    case EventType.FLIGHT:
      return isAr ? `✈️ موعد الرحلة في ${timeStr}` : `✈️ Flight at ${timeStr}`;
    case EventType.MEDICINE:
      return isAr ? `💊 حان وقت الدواء (${timeStr})` : `💊 Medicine time (${timeStr})`;
    case EventType.FOOD:
      return isAr ? `🍲 تفقّد الطعام (${timeStr})` : `🍲 Check the food (${timeStr})`;
    default:
      return isAr ? `🔔 تذكير: ${timeStr}` : `🔔 Reminder: ${timeStr}`;
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
