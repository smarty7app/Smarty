import {
  addMinutes,
  addHours,
  addDays,
  setHours,
  setMinutes,
  setSeconds,
  isBefore,
  format,
  differenceInMinutes,
  isValid,
} from 'date-fns';
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

// ===================== الكلمات المفتاحية (KEYWORDS) =====================

const foodKeywords = ['حليب', 'طعام', 'فرن', 'نار', 'milk', 'food', 'oven', 'stove'];
const medicineKeywords = ['دواء', 'علاج', 'medicine', 'pill', 'medication'];
const travelKeywords = ['رحلة', 'سفر', 'trip', 'travel', 'flight'];

export const KEYWORDS: Record<
  string,
  { minutes?: number; hours?: number; priority: Priority; type: EventType }
> = {
  طعام: { minutes: 10, priority: 3, type: EventType.FOOD },
  food: { minutes: 10, priority: 3, type: EventType.FOOD },
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

// ===================== دوال التحليل المساعدة =====================

export function analyzePriority(text: string): Priority {
  const lowerText = text.toLowerCase();
  const urgentKeywords = ['عاجل', 'ضروري', 'مهم جدا', 'فورا', 'urgent', 'important'];
  const lowKeywords = ['يمكن', 'لاحقا', 'بعدين', 'maybe', 'later'];

  if (urgentKeywords.some((kw) => lowerText.includes(kw))) return 4;
  if (lowKeywords.some((kw) => lowerText.includes(kw))) return 1;
  return 3;
}

export function detectEventType(text: string): EventType {
  const lowerText = text.toLowerCase();
  if (/(طائرة|مطار|airport)/.test(lowerText)) return EventType.FLIGHT;
  if (/(اجتماع|موعد|لقاء|مقابلة|meeting|appointment)/.test(lowerText)) return EventType.MEETING;
  if (medicineKeywords.some((kw) => lowerText.includes(kw))) return EventType.MEDICINE;
  if (foodKeywords.some((kw) => lowerText.includes(kw)) || /(طبخ|اكل)/.test(lowerText)) return EventType.FOOD;
  if (/(مدرسة|ابن|ابنة|طفل|school|child|kid)/.test(lowerText)) return EventType.SCHOOL;
  if (travelKeywords.some((kw) => lowerText.includes(kw))) return EventType.TRAVEL;
  return EventType.OTHER;
}

export function extractLocation(text: string): string | undefined {
  const locationPattern = /(?:في|بـ|at|in)\s+([^\s]+(?:\s+[^\s]+){0,2})/;
  const match = text.match(locationPattern);
  return match ? match[1].trim() : undefined;
}

export function generateCustomMessage(eventType: EventType, eventTime: Date, lang: LanguageCode = 'ar'): string {
  const timeStr = format(eventTime, 'hh:mm a');
  const isAr = lang === 'ar';
  switch (eventType) {
    case EventType.FLIGHT: return isAr ? `✈️ موعد رحلتك في ${timeStr}` : `✈️ Flight at ${timeStr}`;
    case EventType.MEDICINE: return isAr ? `💊 وقت الدواء الآن` : `💊 Medicine time`;
    case EventType.FOOD: return isAr ? `🍲 تفقّد الطعام على النار` : `🍲 Check the food`;
    default: return isAr ? `🔔 تذكير: ${timeStr}` : `🔔 Reminder: ${timeStr}`;
  }
}

// ===================== محرك تحليل الوقت V2.0 =====================

interface TimeParseResult {
  dateTime: Date | null;
  confidence: number;
  usedPattern: string;
}

const timePatterns: {
  pattern: RegExp;
  parseFn: (matches: RegExpMatchArray, now: Date) => Date | null;
  weight: number;
}[] = [
  {
    pattern: /(?:بعد|كمان)\s+(?:ساعة|ساعه)\s+(?:و|و\s+)?(?:نص|نصف)/i,
    parseFn: (m, now) => addMinutes(now, 90),
    weight: 0.95
  },
  {
    pattern: /(?:بعد|كمان)\s+(نص|نصف)\s+(?:ساعة|ساعه)/i,
    parseFn: (m, now) => addMinutes(now, 30),
    weight: 0.95
  },
  {
    pattern: /(?:غدوة|غدا|بكرة|بكره)\s+(?:الـ|في\s+)?(?:عشية|العشية|المساء|ليل)/i,
    parseFn: (m, now) => setHours(setMinutes(addDays(now, 1), 0), 18), 
    weight: 0.9
  },
  {
    pattern: /(?:غدوة|غدا|بكرة|بكره)\s+(?:الـ|في\s+)?(?:صباح|الصباح|بكري)/i,
    parseFn: (m, now) => setHours(setMinutes(addDays(now, 1), 0), 8),
    weight: 0.9
  },
  {
    pattern: /(?:الساعة|ساعة)\s+(\d{1,2})(?:\s+)?(?:و|:)\s*(نص|نصف|30)/i,
    parseFn: (m, now) => {
      let h = parseInt(m[1]);
      if (h < 12 && now.getHours() >= 12) h += 12;
      return setHours(setMinutes(now, 30), h);
    },
    weight: 0.95
  },
  {
    pattern: /(?:بعد|كمان)\s+(\d+)\s+(دقيقة|دقائق|ساعة|ساعات)/i,
    parseFn: (m, now) => {
      const val = parseInt(m[1]);
      return m[2].includes('ساع') ? addHours(now, val) : addMinutes(now, val);
    },
    weight: 0.85
  }
];

function extractTimeFromText(text: string, now: Date): TimeParseResult {
  const lowerText = text.toLowerCase();
  for (const { pattern, parseFn, weight } of timePatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      const dateTime = parseFn(match, now);
      if (dateTime && isValid(dateTime)) return { dateTime, confidence: weight, usedPattern: pattern.source };
    }
  }
  return { dateTime: null, confidence: 0, usedPattern: '' };
}

function extractTitle(text: string, detectedType: EventType, location?: string): string {
  let title = text.replace(/(ذكرني|فكرني|تذكير|الساعة|ساعة|غدوة|بكرة|بعد|كمان)/gi, '').trim();
  if (!title) return 'تذكير جديد';
  return title;
}

function calculateConfidence(text: string, timeFound: boolean, type: EventType): number {
  let score = 0.3;
  if (timeFound) score += 0.4;
  if (type !== EventType.OTHER) score += 0.2;
  return Math.min(score, 1);
}

// ===================== الدالة الأساسية =====================

export function parseSmartTime(text: string, lang: LanguageCode = 'ar') {
  const now = new Date();
  const eventType = detectEventType(text);
  const priority = analyzePriority(text);
  const location = extractLocation(text);
  const timeResult = extractTimeFromText(text, now);

  let finalEventTime = timeResult.dateTime || addMinutes(now, 15);
  let reminderTimes = [finalEventTime];
  
  const diff = differenceInMinutes(finalEventTime, now);
  if (diff > 20) {
    reminderTimes = [addMinutes(finalEventTime, -Math.floor(diff * 0.2)), finalEventTime];
  }

  return {
    eventTime: finalEventTime,
    reminderTimes,
    priority,
    eventType,
    location,
    confidence: calculateConfidence(text, !!timeResult.dateTime, eventType),
    suggestedMessage: generateCustomMessage(eventType, finalEventTime, lang),
    totalDurationMinutes: timeResult.dateTime ? null : diff,
  };
}

// دالات الألوان والتسميات
export function getPriorityLabel(priority: Priority, lang: LanguageCode = 'ar'): string {
  const t = translations[lang];
  return priority === 4 ? t.priority_critical : priority === 3 ? t.priority_high : t.priority_medium;
}

export function getPriorityColor(priority: Priority): string {
  if (priority === 4) return 'bg-red-100 text-red-600';
  if (priority === 3) return 'bg-orange-100 text-orange-600';
  return 'bg-blue-100 text-blue-600';
}
