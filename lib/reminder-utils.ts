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
  let isTimeDetected = true;
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
    [
  // الأيام: (بعد أربع أيام، بعد 4 أيام)
  {
    pattern: /(?:بعد|خلال)\s+(\d+|أربع|اربع|ثلاث|خمس|سنة|شهر)\s+(?:أيام|ايام|يوم|أسبوع|اسبوع)/i,
    parseFn: (now: Date, m: RegExpMatchArray) => {
      const numMap: any = { 'أربع': 4, 'اربع': 4, 'ثلاث': 3, 'خمس': 5 };
      const val = m[1];
      const amount = isNaN(parseInt(val)) ? (numMap[val] || 1) : parseInt(val);
      if (m[0].includes('أسبوع') || m[0].includes('اسبوع')) return addDays(now, amount * 7);
      return addDays(now, amount);
    },
    weight: 1.0
  },
  // الساعات: (بعد ساعة واحدة، بعد ساعتين، بعد 3 ساعات)
  {
    pattern: /(?:بعد|خلال)\s+(\d+|ساعة|ساعه|ساعتين)\s*(واحد|واحدة|واحده|ساعتين|ساعات|ساعة|ساعه)?/i,
    parseFn: (now: Date, m: RegExpMatchArray) => {
      const text = m[0];
      if (text.includes('ساعتين')) return addHours(now, 2);
      if (text.includes('ساعة') || text.includes('ساعه')) {
        const num = parseInt(m[1]);
        return addHours(now, isNaN(num) ? 1 : num);
      }
      return addHours(now, parseInt(m[1]) || 1);
    },
    weight: 1.0
  },
  // الدقائق: (بعد نصف ساعة، بعد 10 دقائق)
  {
    pattern: /(?:بعد|خلال)\s+(نصف|نص|ربع|ثلث)\s+(ساعة|ساعه)|(?:بعد|خلال)\s+(\d+)\s+دقيقة/i,
    parseFn: (now: Date, m: RegExpMatchArray) => {
      if (m[1] === 'نصف' || m[1] === 'نص') return addMinutes(now, 30);
      if (m[1] === 'ربع') return addMinutes(now, 15);
      if (m[1] === 'ثلث') return addMinutes(now, 20);
      return addMinutes(now, parseInt(m[3]) || 5);
    },
    weight: 1.0
   }
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

export function parseSmartTime(text: string, lang: LanguageCode = 'ar') {
  const now = new Date();
  // 1. محاولة استخراج الوقت باستخدام الأنماط الجديدة
  const timeResult = extractTimeFromText(text, now);
  
  const eventType = detectEventType(text);
  const priority = analyzePriority(text);
  const location = extractLocation(text);

  let finalEventTime = timeResult.dateTime;
  let isTimeDetected = timeResult.isTimeDetected;

  // 2. إذا لم يجد نمطاً صريحاً، يبحث في الكلمات المفتاحية (حليب، فرن، إلخ)
  if (!finalEventTime) {
    for (const [word, config] of Object.entries(KEYWORDS)) {
      if (text.toLowerCase().includes(word)) {
        finalEventTime = config.minutes ? addMinutes(now, config.minutes) : addHours(now, config.hours || 0);
        isTimeDetected = true; 
        break;
      }
    }
  }

  // 3. التوقيت النهائي (الواقعي أو الاحتياطي)
  const actualTime = finalEventTime || addMinutes(now, 15);

  return {
    eventTime: actualTime,
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
