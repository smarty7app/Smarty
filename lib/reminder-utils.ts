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
} from 'date-fns';

import { LanguageCode, translations } from './translations';

// ===================== 1. الأنواع والتعريفات (محفوظة بالكامل) =====================

export type Priority = 1 | 2 | 3 | 4;

export enum EventType {
  FLIGHT = 'FLIGHT', MEETING = 'MEETING', MEDICINE = 'MEDICINE',
  FOOD = 'FOOD', APPOINTMENT = 'APPOINTMENT', TRAVEL = 'TRAVEL',
  SCHOOL = 'SCHOOL', OTHER = 'OTHER',
}

export enum ReminderStage { WARNING = 'WARNING', FINAL = 'FINAL' }

export interface Reminder {
  id: string; text: string; reminderTime: string; reminderTimes: string[];
  eventTime: string; createdAt: string; isCompleted: boolean;
  recurring: 'none' | 'hourly' | 'daily' | 'weekly';
  priority: Priority; eventType: EventType; location?: string;
  confidence: number; suggestedMessage: string; snoozeCount: number;
  maxSnooze: number; parentId?: string; stage: ReminderStage;
  totalDurationMinutes?: number;
}

export interface TimeParseResult {
  dateTime: Date | null;
  confidence: number;
  isTimeDetected: boolean;
}

// ===================== 2. القواميس والكلمات المفتاحية (محفوظة) =====================

const medicineKeywords = ['دواء', 'علاج', 'انسولين', 'حبة', 'بندول', 'medicine', 'pill', 'medication'];
const foodKeywords = ['حليب', 'طعام', 'فرن', 'نار', 'اكل', 'طبخ', 'عشاء', 'غداء', 'milk', 'food'];

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
};

// ===================== 3. مبرمج الوقت الذكي v5.5 (الأكثر دقة) =====================

export function extractTimeFromText(text: string, now: Date): TimeParseResult {
  const lowerText = text.toLowerCase().trim();
  
  // أ. القواعد الذهبية للمدد (تحل مشاكل الصور)
  const durationRules = [
    { regex: /(?:بعد|خلال)\s+(نصف|نص)\s+ساعة/i, add: () => addMinutes(now, 30) },
    { regex: /(?:بعد|خلال)\s+ربع\s+ساعة/i, add: () => addMinutes(now, 15) },
    { regex: /(?:بعد|خلال)\s+ساعتين/i, add: () => addHours(now, 2) },
    { regex: /(?:بعد|خلال)\s+دقيقة\s+واحدة/i, add: () => addMinutes(now, 1) },
    { regex: /(?:بعد|خلال)\s+(\d+|أربع|اربع|ثلاث|خمس)\s+(أيام|ايام|يوم)/i, 
      apply: (m: any) => {
        const map: any = { 'أربع': 4, 'اربع': 4, 'ثلاث': 3, 'خمس': 5 };
        const val = isNaN(parseInt(m[1])) ? (map[m[1]] || 1) : parseInt(m[1]);
        return addDays(now, val);
      }
    },
    { regex: /(?:بعد|خلال)\s+(\d+|أربع|اربع|ثلاث|خمس)\s+(ساعة|ساعات|ساعه)/i, 
      apply: (m: any) => {
        const map: any = { 'أربع': 4, 'اربع': 4, 'ثلاث': 3 };
        const val = isNaN(parseInt(m[1])) ? (map[m[1]] || 1) : parseInt(m[1]);
        return addHours(now, val);
      }
    },
    { regex: /(?:بعد|خلال)\s+(\d+)\s+(دقيقة|دقائق)/i, apply: (m: any) => addMinutes(now, parseInt(m[1])) }
  ];

  for (const rule of durationRules) {
    const match = lowerText.match(rule.regex);
    if (match) return { dateTime: rule.add ? rule.add() : rule.apply!(match), confidence: 1.0, isTimeDetected: true };
  }

  // ب. الأوقات المحددة (الساعة 4 صباحاً)
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
    let targetDate = setHours(setMinutes(setSeconds(new Date(now), 0), minutes), hours);
    if (isBefore(targetDate, now)) targetDate = addDays(targetDate, 1);
    return { dateTime: targetDate, confidence: 1.0, isTimeDetected: true };
  }

  // ج. غداً
  if (/(غداً|غدا|بكرة|tomorrow)/i.test(lowerText)) {
    return { dateTime: addDays(now, 1), confidence: 0.9, isTimeDetected: true };
  }

  return { dateTime: null, confidence: 0, isTimeDetected: false };
}

// ===================== 4. دوال التنظيف المساعدة =====================

export function extractSmartTitle(text: string): string {
  return text
    .replace(/(?:ذكرني|تذكير|سوي|عمل)\s+/gi, '')
    .replace(/(?:بعد|خلال|في|على|الساعة|الساعه|للساعه)\s+\d+.*?(?:دقيقة|دقائق|ساعة|ساعات|أيام|ايام|يوم|صباحا|مساءا|ص|م|am|pm)/gi, '')
    .replace(/(?:بعد|خلال)\s+(?:نصف|نص|ربع|ثلث|ساعتين|يومين|ساعة|ساعه|دقيقة واحدة)/gi, '')
    .replace(/(?:غداً|غدا|بكرة|tomorrow)/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || text;
}

export function detectEventType(text: string): EventType {
  const low = text.toLowerCase();
  if (/(طائرة|مطار|flight)/.test(low)) return EventType.FLIGHT;
  if (medicineKeywords.some(kw => low.includes(kw))) return EventType.MEDICINE;
  if (foodKeywords.some(kw => low.includes(kw))) return EventType.FOOD;
  if (/(اجتماع|موعد|meeting|appointment)/.test(low)) return EventType.MEETING;
  return EventType.OTHER;
}

export function extractLocation(text: string): string | undefined {
  const match = text.match(/(?:في|بـ|at|in)\s+([^ ]+)/i);
  return match ? match[1] : undefined;
}

// ===================== 5. المحرك الرئيسي (Unified) =====================

export function parseSmartTime(text: string, lang: LanguageCode = 'ar') {
  const now = new Date();
  const timeResult = extractTimeFromText(text, now);
  
  const eventType = detectEventType(text);
  const location = extractLocation(text);

  let finalEventTime = timeResult.dateTime;
  let isTimeDetected = timeResult.isTimeDetected;

  // فحص الكلمات المفتاحية (حليب، فرن...) إذا لم يتم اكتشاف وقت صريح
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
    reminderTimes: [actualTime],
    isTimeDetected: isTimeDetected, 
    confidence: isTimeDetected ? 1.0 : 0.4,
    priority: (text.includes('عاجل') || text.includes('دواء') ? 4 : 3) as Priority,
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

export function getPriorityLabel(priority: Priority, lang: LanguageCode = 'ar'): string {
  return translations[lang][priority === 4 ? 'priority_critical' : 'priority_high'];
}

export function getPriorityColor(priority: Priority): string {
  return priority === 4 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600';
}
