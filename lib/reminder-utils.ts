import { addMinutes, addHours, addDays, setHours, setMinutes, setSeconds, isBefore, format } from 'date-fns';
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
  OTHER = 'OTHER'
}

export enum ReminderStage {
  WARNING = 'WARNING',
  FINAL = 'FINAL'
}

export interface Reminder {
  id: string;
  text: string;
  reminderTime: string; // ISO string (next notify time)
  reminderTimes: string[]; // All scheduled notify times
  eventTime: string;    // ISO string (when the event actually is)
  createdAt: string;    // ISO string
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

const foodKeywords = ['حليب', 'طعام', 'فرن', 'نار', 'milk', 'food', 'oven', 'stove'];
const medicineKeywords = ['دواء', 'علاج', 'medicine', 'pill', 'medication'];
const travelKeywords = ['رحلة', 'سفر', 'trip', 'travel', 'flight'];

const KEYWORDS: Record<string, { minutes?: number; hours?: number; priority: Priority; type: EventType }> = {
  'طعام': { minutes: 10, priority: 3, type: EventType.FOOD },
  'food': { minutes: 10, priority: 3, type: EventType.FOOD },
  'حليب': { minutes: 10, priority: 3, type: EventType.FOOD },
  'milk': { minutes: 10, priority: 3, type: EventType.FOOD },
  'فرن': { minutes: 15, priority: 3, type: EventType.FOOD },
  'oven': { minutes: 15, priority: 3, type: EventType.FOOD },
  'نار': { minutes: 10, priority: 3, type: EventType.FOOD },
  'stove': { minutes: 10, priority: 3, type: EventType.FOOD },
  'رحلة': { hours: 12, priority: 2, type: EventType.TRAVEL },
  'trip': { hours: 12, priority: 2, type: EventType.TRAVEL },
  'سفر': { hours: 12, priority: 2, type: EventType.TRAVEL },
  'travel': { hours: 12, priority: 2, type: EventType.TRAVEL },
  'flight': { hours: 24, priority: 4, type: EventType.FLIGHT },
  'مدرسة': { hours: 4, priority: 2, type: EventType.SCHOOL },
  'school': { hours: 4, priority: 2, type: EventType.SCHOOL },
  'ابن': { hours: 4, priority: 2, type: EventType.SCHOOL },
  'موعد': { hours: 2, priority: 2, type: EventType.MEETING },
  'appointment': { hours: 2, priority: 2, type: EventType.MEETING },
  'meeting': { hours: 2, priority: 2, type: EventType.MEETING },
  'دواء': { minutes: 30, priority: 4, type: EventType.MEDICINE },
  'medicine': { minutes: 30, priority: 4, type: EventType.MEDICINE },
  'pill': { minutes: 30, priority: 4, type: EventType.MEDICINE },
  'medication': { minutes: 30, priority: 4, type: EventType.MEDICINE },
  'طائرة': { hours: 24, priority: 4, type: EventType.FLIGHT },
  'مطار': { hours: 24, priority: 4, type: EventType.FLIGHT },
};

export function analyzePriority(text: string): Priority {
  const lowerText = text.toLowerCase();
  const urgentKeywords = ["عاجل", "ضروري", "مهم جدا", "فورا", "urgent", "important"];
  const normalKeywords = ["عادي", "تذكير", "موعد", "normal", "reminder"];
  const lowKeywords = ["يمكن", "لاحقا", "بعدين", "maybe", "later"];
  
  if (urgentKeywords.some(kw => lowerText.includes(kw))) return 4;
  if (normalKeywords.some(kw => lowerText.includes(kw))) return 2;
  if (lowKeywords.some(kw => lowerText.includes(kw))) return 1;
  return 3;
}

export function detectEventType(text: string): EventType {
  const lowerText = text.toLowerCase();
  if (/(طائرة|مطار|airport)/.test(lowerText)) return EventType.FLIGHT;
  if (/(اجتماع|موعد|لقاء|مقابلة|meeting|appointment)/.test(lowerText)) return EventType.MEETING;
  if (medicineKeywords.some(kw => lowerText.includes(kw))) return EventType.MEDICINE;
  if (foodKeywords.some(kw => lowerText.includes(kw)) || /(طبخ|اكل)/.test(lowerText)) return EventType.FOOD;
  if (/(مدرسة|ابن|ابنة|طفل|school|child|kid)/.test(lowerText)) return EventType.SCHOOL;
  if (travelKeywords.some(kw => lowerText.includes(kw))) return EventType.TRAVEL;
  return EventType.OTHER;
}

export function extractLocation(text: string): string | undefined {
  const locationPattern = /(?:في|بـ|at|in)\s+([^\s]+(?:\s+[^\s]+){0,2})/;
  const match = text.match(locationPattern);
  return match ? match[1].trim() : undefined;
}

export function calculateReminderTime(eventType: EventType, eventTime: Date): Date {
  let minutesBefore = 10;
  switch (eventType) {
    case EventType.FLIGHT:
    case EventType.TRAVEL:
      minutesBefore = 120; // 2 hours
      break;
    case EventType.MEETING:
      minutesBefore = 15;
      break;
    case EventType.MEDICINE:
      minutesBefore = 5;
      break;
    case EventType.FOOD:
      minutesBefore = 2;
      break;
    case EventType.SCHOOL:
      minutesBefore = 15;
      break;
  }
  return addMinutes(eventTime, -minutesBefore);
}

export function generateCustomMessage(eventType: EventType, eventTime: Date, lang: LanguageCode = 'ar'): string {
  const timeStr = format(eventTime, 'hh:mm a');
  const isAr = lang === 'ar';

  switch (eventType) {
    case EventType.FLIGHT:
    case EventType.TRAVEL:
      return isAr ? `✈️ اقترب موعد رحلتك في ${timeStr}. تأكد من وثائقك!` : `✈️ Your flight at ${timeStr} is approaching. Check your documents!`;
    case EventType.MEETING:
      return isAr ? `💼 تذكير باجتماعك في ${timeStr}. استعد للموعد!` : `💼 Meeting reminder at ${timeStr}. Get ready!`;
    case EventType.MEDICINE:
      return isAr ? `💊 حان وقت تناول الدواء. لا تنسى!` : `💊 Time to take your medicine. Don't forget!`;
    case EventType.FOOD:
      return isAr ? `🍲 الطعام جاهز تقريباً! تفقده الآن.` : `🍲 Food is almost ready! Check it now.`;
    case EventType.SCHOOL:
      return isAr ? `🏫 اقترب موعد عودة الأبناء من المدرسة.` : `🏫 Time for kids to return from school.`;
    default:
      return isAr ? `🔔 تذكير: ${timeStr}` : `🔔 Reminder: ${timeStr}`;
  }
}

export function parseSmartTime(text: string, lang: LanguageCode = 'ar'): { 
  eventTime: Date; 
  reminderTimes: Date[]; 
  priority: Priority;
  eventType: EventType;
  location?: string;
  confidence: number;
  suggestedMessage: string;
  totalDurationMinutes: number | null;
} {
  const now = new Date();
  const lowerText = text.toLowerCase();
  
  let eventTime: Date | null = null;
  const eventType = detectEventType(lowerText);
  const priority = analyzePriority(lowerText);
  const location = extractLocation(text);

  // Time extraction logic
  const timePattern = /(الساعة|على|فـ|في|at|on)\s*(\d{1,2})(?:\s*)?(?::)?(?:\s*)?(\d{2})?(?:\s*)?(صباحا|مساء|صباح|مساء|ص|م|am|pm)?/i;
  const timeMatch = lowerText.match(timePattern);

  let isSpecificTime = false;

  if (timeMatch) {
    isSpecificTime = true;
    let hour = parseInt(timeMatch[2]);
    const minute = parseInt(timeMatch[3] || '0');
    const period = timeMatch[4] || '';

    if ((period.includes('مساء') || period.includes('م') || period.toLowerCase().includes('pm')) && hour < 12) {
      hour += 12;
    } else if ((period.includes('صباح') || period.includes('ص') || period.toLowerCase().includes('am')) && hour === 12) {
      hour = 0;
    }

    eventTime = setSeconds(setMinutes(setHours(now, hour), minute), 0);
    if (isBefore(eventTime, now)) {
      eventTime = addDays(eventTime, 1);
    }
  } else if (lowerText.includes('بعد') || lowerText.includes('in ')) {
    const minutesMatch = lowerText.match(/(?:بعد|in)\s*(\d+)\s*(?:دقيقة|min)/);
    const hoursMatch = lowerText.match(/(?:بعد|in)\s*(\d+)\s*(?:ساعة|hour)/);
    
    if (minutesMatch) {
      eventTime = addMinutes(now, parseInt(minutesMatch[1]));
    } else if (hoursMatch) {
      eventTime = addHours(now, parseInt(hoursMatch[1]));
    }
  } else if (lowerText.includes('غدا') || lowerText.includes('غداً') || lowerText.includes('tomorrow')) {
    if (lowerText.includes('رحلة') || lowerText.includes('سفر') || lowerText.includes('flight')) {
      // Default flight tomorrow to 8:00 AM
      eventTime = addDays(setSeconds(setMinutes(setHours(now, 8), 0), 0), 1);
    } else {
      eventTime = addDays(setSeconds(setMinutes(setHours(now, 9), 0), 0), 1);
    }
  } else {
    // Default based on keyword
    for (const [word, config] of Object.entries(KEYWORDS)) {
      if (lowerText.includes(word)) {
        if (config.minutes) eventTime = addMinutes(now, config.minutes);
        else if (config.hours) eventTime = addHours(now, config.hours);
        break;
      }
    }
  }

  // Calculate Reminder Times (Warning + Final)
  let reminderTimes: Date[] = [];
  let finalEventTime: Date;

  if (eventTime) {
    finalEventTime = eventTime;
    const diffMinutes = (finalEventTime.getTime() - now.getTime()) / (60 * 1000);
    
    // Special case for School: Alerts at +4h and +6h
    if (eventType === EventType.SCHOOL && (lowerText.includes('وضعت') || lowerText.includes('مدرسة'))) {
      reminderTimes = [addHours(now, 4), addHours(now, 6)];
      finalEventTime = reminderTimes[1];
    } else if (diffMinutes > 0) {
      const warningTime = new Date(finalEventTime.getTime() - (diffMinutes * 0.2 * 60 * 1000));
      reminderTimes = [warningTime, finalEventTime];
    } else {
      reminderTimes = [finalEventTime];
    }
  } else {
    // No time specified, use default duration based on event type
    let defaultDuration = 15;
    switch (eventType) {
      case EventType.FOOD: defaultDuration = 25; break;
      case EventType.MEDICINE: defaultDuration = 30; break;
      case EventType.MEETING: defaultDuration = 60; break;
      case EventType.SCHOOL: defaultDuration = 240; break; // 4 hours
    }
    finalEventTime = addMinutes(now, defaultDuration);
    
    if (eventType === EventType.SCHOOL) {
      reminderTimes = [addHours(now, 4), addHours(now, 6)];
      finalEventTime = reminderTimes[1];
    } else {
      const warningTime = addMinutes(now, defaultDuration * 0.8);
      reminderTimes = [warningTime, finalEventTime];
    }
  }

  const suggestedMessage = generateCustomMessage(eventType, finalEventTime, lang);
  
  // Confidence calculation
  let confidence = 0.5;
  if (isSpecificTime) confidence += 0.3;
  if (eventType !== EventType.OTHER) confidence += 0.1;
  if (location) confidence += 0.1;
  confidence = Math.min(confidence, 1.0);

  const totalDurationMinutes = isSpecificTime ? null : Math.round((finalEventTime.getTime() - now.getTime()) / (60 * 1000));

  return {
    eventTime: finalEventTime,
    reminderTimes,
    priority,
    eventType,
    location,
    confidence,
    suggestedMessage,
    totalDurationMinutes
  };
}

export function getPriorityLabel(priority: Priority, lang: LanguageCode = 'ar'): string {
  const t = translations[lang];
  switch (priority) {
    case 1: return t.priority_low;
    case 2: return t.priority_medium;
    case 3: return t.priority_high;
    case 4: return t.priority_critical;
    default: return t.priority_medium;
  }
}

export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 1: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500';
    case 2: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    case 3: return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
    case 4: return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
    default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500';
  }
}
