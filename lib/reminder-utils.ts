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

const foodKeywords = ['حليب', 'طعام', 'فرن', 'نار', 'اكل', 'طبخ'];
const medicineKeywords = ['دواء', 'علاج', 'انسولين', 'حبة'];

export const KEYWORDS: Record<string, { minutes?: number; hours?: number; priority: Priority; type: EventType }> = {
  طعام: { minutes: 10, priority: 3, type: EventType.FOOD },
  دواء: { minutes: 30, priority: 4, type: EventType.MEDICINE },
  سفر: { hours: 12, priority: 2, type: EventType.TRAVEL },
};

export function analyzePriority(text: string): Priority {
  const lowerText = text.toLowerCase();
  if (/(عاجل|ضروري|فورا|دواء|نار)/.test(lowerText)) return 4;
  return 2;
}

export function detectEventType(text: string): EventType {
  const lowerText = text.toLowerCase();
  if (/(طائرة|مطار|سفر)/.test(lowerText)) return EventType.FLIGHT;
  if (medicineKeywords.some(kw => lowerText.includes(kw))) return EventType.MEDICINE;
  if (foodKeywords.some(kw => lowerText.includes(kw))) return EventType.FOOD;
  return EventType.OTHER;
}

export function extractLocation(text: string): string | undefined {
  const match = text.match(/(?:في|بـ|at|in)\s+([^\s]+)/);
  return match ? match[1].trim() : undefined;
}

const timePatterns = [
  {
    pattern: /(?:بعد|كمان)\s+(?:ساعة|ساعه)\s+(?:و|و\s+)?(?:نص|نصف|30)/i,
    parseFn: (now: Date) => addMinutes(now, 90),
    weight: 0.95
  },
  {
    pattern: /(?:غدوة|غدا|بكرة|بكره)\s+(?:الـ|في\s+)?(?:عشية|العشية|المساء|ليل)/i,
    parseFn: (now: Date) => setHours(setMinutes(addDays(now, 1), 0), 18), 
    weight: 0.9
  },
  {
    pattern: /(?:الساعة|ساعة|الـ)\s*(\d{1,2})(?::(\d{2}))?\s*(نص|نصف|ربع)?/i,
    parseFn: (now: Date, m: RegExpMatchArray) => {
      let h = parseInt(m[1]);
      let mins = m[2] ? parseInt(m[2]) : 0;
      if (m[3]?.includes('نص')) mins = 30;
      if (h < 12 && now.getHours() >= 12) h += 12; 
      let date = setHours(setMinutes(now, mins), h);
      if (isBefore(date, now)) date = addDays(date, 1);
      return date;
    },
    weight: 0.95
  }
]; // <--- المصفوفة مغلقة الآن بشكل صحيح

function extractTimeFromText(text: string, now: Date) {
  for (const item of timePatterns) {
    const match = text.match(item.pattern);
    if (match) {
      const dateTime = item.parseFn(now, match);
      if (dateTime && isValid(dateTime)) return { dateTime, confidence: item.weight };
    }
  }
  return { dateTime: null, confidence: 0.2 };
}

export function parseSmartTime(text: string, lang: LanguageCode = 'ar') {
  const now = new Date();
  const eventType = detectEventType(text);
  const priority = analyzePriority(text);
  const location = extractLocation(text);
  const timeResult = extractTimeFromText(text, now);

  const eventTime = timeResult.dateTime || addMinutes(now, 15);
  const diff = differenceInMinutes(eventTime, now);

  return {
    eventTime,
    reminderTimes: [eventTime],
    priority,
    eventType,
    location,
    confidence: timeResult.confidence,
    suggestedMessage: `تذكير: ${format(eventTime, 'HH:mm')}`,
    totalDurationMinutes: timeResult.dateTime ? null : diff,
  };
}

export function getPriorityLabel(p: Priority, lang: LanguageCode): string {
  return p === 4 ? 'عاجل' : 'عادي';
}

export function getPriorityColor(p: Priority): string {
  return p === 4 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
}
