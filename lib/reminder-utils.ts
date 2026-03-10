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

// ===================== الكلمات المفتاحية المتطورة =====================

const foodKeywords = ['حليب', 'طعام', 'فرن', 'نار', 'اكل', 'طبخ', 'عشاء', 'غداء', 'milk', 'food', 'oven', 'stove'];
const medicineKeywords = ['دواء', 'علاج', 'انسولين', 'حبة', 'بندول', 'medicine', 'pill', 'medication'];
const travelKeywords = ['رحلة', 'سفر', 'طيارة', 'مطار', 'trip', 'travel', 'flight', 'airport'];

export const KEYWORDS: Record<
  string,
  { minutes?: number; hours?: number; priority: Priority; type: EventType }
> = {
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

// ===================== دوال التحليل المساعدة =====================

export function analyzePriority(text: string): Priority {
  const lowerText = text.toLowerCase();
  const urgentKeywords = ['عاجل', 'ضروري', 'مهم جدا', 'فورا', 'حالا', 'urgent', 'important'];
  const lowKeywords = ['يمكن', 'لاحقا', 'بعدين', 'براحتك', 'maybe', 'later'];

  if (urgentKeywords.some((kw) => lowerText.includes(kw))) return 4;
  if (lowKeywords.some((kw) => lowerText.includes(kw))) return 1;
  if (/(دواء|نار|فرن|طائرة)/.test(lowerText)) return 4;
  return 3;
}

export function detectEventType(text: string): EventType {
  const lowerText = text.toLowerCase();
  if (/(طائرة|مطار|طيارة|airport)/.test(lowerText)) return EventType.FLIGHT;
  if (/(اجتماع|موعد|لقاء|مقابلة|meeting|appointment)/.test(lowerText)) return EventType.MEETING;
  if (medicineKeywords.some((kw) => lowerText.includes(kw))) return EventType.MEDICINE;
  if (foodKeywords.some((kw) => lowerText.includes(kw)) || /(طبخ|اكل)/.test(lowerText)) return EventType.FOOD;
  if (/(مدرسة|ابن|ابنة|طفل|قراية|school|child|kid)/.test(lowerText)) return EventType.SCHOOL;
  if (travelKeywords.some((kw) => lowerText.includes(kw))) return EventType.TRAVEL;
  return EventType.OTHER;
}

export function extractLocation(text: string): string | undefined {
  const locationPattern = /(?:في|بـ|بمنطقة|at|in)\s+([^\s]+(?:\s+[^\s]+){0,2})/;
  const match = text.match(locationPattern);
  return match ? match[1].trim() : undefined;
}

export function generateCustomMessage(
  eventType: EventType,
  eventTime: Date,
  lang: LanguageCode = 'ar'
): string {
  const timeStr = format(eventTime, 'hh:mm a');
  const isAr = lang === 'ar';

  switch (eventType) {
    case EventType.FLIGHT:
      return isAr ? `✈️ موعد الرحلة في ${timeStr}. لا تنس الجواز!` : `✈️ Flight at ${timeStr}. Check passport!`;
    case EventType.MEETING:
      return isAr ? `💼 اجتماعك سيبدأ في ${timeStr}` : `💼 Meeting starts at ${timeStr}`;
    case EventType.MEDICINE:
      return isAr ? `💊 حان وقت الدواء. صحة وعافية!` : `💊 Time for medicine. Stay healthy!`;
    case EventType.FOOD:
      return isAr ? `🍲 تفقّد الطعام الآن (${timeStr})` : `🍲 Check the food at ${timeStr}`;
    case EventType.SCHOOL:
      return isAr ? `🏫 موعد المدرسة/الأبناء في ${timeStr}` : `🏫 School/Kids time at ${timeStr}`;
    default:
      return isAr ? `🔔 تذكير: ${timeStr}` : `🔔 Reminder: ${timeStr}`;
  }
}

// ===================== محرك الوقت المطور v2.0 =====================

interface TimeParseResult {
  dateTime: Date | null;
  confidence: number;
  usedPattern: string;
}

const timePatterns = [
  
  const timePatterns = [
  // 1. الأنماط المركبة والمثنى (أولوية قصوى لأنها الأكثر تحديداً)
  {
    pattern: /(?:بعد|خلال)\s+ساعتين/i,
    parseFn: (now: Date) => addHours(now, 2),
    weight: 1.0
  },
  {
    pattern: /(?:بعد|خلال)\s+(?:ساعة|ساعه)\s+(?:و\s+)?(?:نص|نصف)/i,
    parseFn: (now: Date) => addMinutes(now, 90),
    weight: 1.0
  },
  {
    pattern: /(?:بعد|خلال)\s+(?:ساعة|ساعه)\s+(?:و\s+)?(?:ربع)/i,
    parseFn: (now: Date) => addMinutes(now, 75),
    weight: 1.0
  },

  // 2. أنماط الأجزاء الصريحة (نصف ساعة، ربع ساعة، ثلث ساعة)
  {
    pattern: /(?:بعد|خلال)\s+(?:نص|نصف)\s+ساعة/i,
    parseFn: (now: Date) => addMinutes(now, 30),
    weight: 0.99
  },
  {
    pattern: /(?:بعد|خلال)\s+ثلث\s+ساعة/i, // إضافة الثلث (20 دقيقة)
    parseFn: (now: Date) => addMinutes(now, 20),
    weight: 0.99
  },
  {
    pattern: /(?:بعد|خلال)\s+ربع\s+ساعة/i,
    parseFn: (now: Date) => addMinutes(now, 15),
    weight: 0.99
  },

  // 3. النمط الرقمي للدقائق (مثل: بعد 10 دقائق) 
  // تم تقديمه ليتم فحص الأرقام قبل الساعات المفردة
  {
    pattern: /(?:بعد|خلال)\s+(\d+)\s+(?:دقيقة|دقيقه|دقائق)/i,
    parseFn: (now: Date, m: RegExpMatchArray) => addMinutes(now, parseInt(m[1])),
    weight: 0.98
  },

  // 4. نمط الساعة المفردة (ساعة واحدة فقط)
  {
    pattern: /(?:بعد|خلال)\s+(?:ساعة|ساعه)(?!\s+(?:و\s+)?(?:نص|نصف|ربع|ثلث))/i,
    parseFn: (now: Date) => addHours(now, 1),
    weight: 0.97
  },

  // 5. النمط الرقمي للساعات (مثل: بعد 5 ساعات)
  {
    pattern: /(?:بعد|خلال)\s+(\d+)\s+(?:ساعة|ساعه|ساعات)/i,
    parseFn: (now: Date, m: RegExpMatchArray) => addHours(now, parseInt(m[1])),
    weight: 0.96
  },

  // 6. كلمات الدقائق الوصفية (خمس دقائق، عشر دقائق)
  {
    pattern: /(?:بعد|خلال)\s+(عشر|خمس|عشرة|خمسة)\s+(?:دقائق|دقيقة|دقيقه)/i,
    parseFn: (now: Date, m: RegExpMatchArray) => {
      const mins = m[1].includes("خمس") ? 5 : 10;
      return addMinutes(now, mins);
    },
    weight: 0.95
  },

  // 7. المواعيد اليومية الثابتة
  {
    pattern: /(?:غداً|غدا|بكرة)\s+(?:في\s+)?(?:صباح|الصباح)/i,
    parseFn: (now: Date) => setHours(setMinutes(addDays(now, 1), 0), 8),
    weight: 0.9
  },
  {
    pattern: /(?:غداً|غدا|بكرة)\s+(?:في\s+)?(?:مساء|المساء|ليل)/i,
    parseFn: (now: Date) => setHours(setMinutes(addDays(now, 1), 0), 20),
    weight: 0.9
  }
];


export function extractTimeFromText(text: string, now: Date): TimeParseResult {
  const lowerText = text.toLowerCase();
  for (const item of timePatterns) {
    const match = lowerText.match(item.pattern);
    if (match) {
      const dateTime = item.parseFn(now, match);
      if (dateTime && isValid(dateTime)) {
        return { 
          dateTime, 
          confidence: item.weight, 
          usedPattern: item.pattern.source 
        };
      }
    }
  }
  return { dateTime: null, confidence: 0, usedPattern: '' };
    }
// ===================== الدالة الأساسية (المخ) =====================

export function parseSmartTime(text: string, lang: LanguageCode = 'ar') {
  const now = new Date();
  const lowerText = text.toLowerCase();

  const eventType = detectEventType(lowerText);
  const priority = analyzePriority(lowerText);
  const location = extractLocation(text);
  const timeResult = extractTimeFromText(text, now);

  let eventTime = timeResult.dateTime;

  // البحث في الكلمات المفتاحية إذا لم نجد وقتاً صريحاً
  if (!eventTime) {
    for (const [word, config] of Object.entries(KEYWORDS)) {
      if (lowerText.includes(word)) {
        if (config.minutes) eventTime = addMinutes(now, config.minutes);
        else if (config.hours) eventTime = addHours(now, config.hours);
        break;
      }
    }
  }

  const finalEventTime = eventTime || addMinutes(now, 15);
  const diffMinutes = differenceInMinutes(finalEventTime, now);

  // منطق التنبيهات المتعددة
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
    priority,
    eventType,
    location,
    confidence: timeResult.confidence || 0.4,
    suggestedMessage: generateCustomMessage(eventType, finalEventTime, lang),
    totalDurationMinutes: timeResult.dateTime ? null : diffMinutes,
  };
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
