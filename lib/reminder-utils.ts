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

// ===================== الأنواع الأساسية (كما كانت) =====================

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
  reminderTime: string; // ISO string (next notify time)
  reminderTimes: string[]; // All scheduled notify times
  eventTime: string; // ISO string (when the event actually is)
  createdAt: string; // ISO string
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
  milk: { minutes: 10, priority: 3, type: EventType.FOOD },
  فرن: { minutes: 15, priority: 3, type: EventType.FOOD },
  oven: { minutes: 15, priority: 3, type: EventType.FOOD },
  نار: { minutes: 10, priority: 3, type: EventType.FOOD },
  stove: { minutes: 10, priority: 3, type: EventType.FOOD },
  رحلة: { hours: 12, priority: 2, type: EventType.TRAVEL },
  trip: { hours: 12, priority: 2, type: EventType.TRAVEL },
  سفر: { hours: 12, priority: 2, type: EventType.TRAVEL },
  travel: { hours: 12, priority: 2, type: EventType.TRAVEL },
  flight: { hours: 24, priority: 4, type: EventType.FLIGHT },
  مدرسة: { hours: 4, priority: 2, type: EventType.SCHOOL },
  school: { hours: 4, priority: 2, type: EventType.SCHOOL },
  ابن: { hours: 4, priority: 2, type: EventType.SCHOOL },
  موعد: { hours: 2, priority: 2, type: EventType.MEETING },
  appointment: { hours: 2, priority: 2, type: EventType.MEETING },
  meeting: { hours: 2, priority: 2, type: EventType.MEETING },
  دواء: { minutes: 30, priority: 4, type: EventType.MEDICINE },
  medicine: { minutes: 30, priority: 4, type: EventType.MEDICINE },
  pill: { minutes: 30, priority: 4, type: EventType.MEDICINE },
  medication: { minutes: 30, priority: 4, type: EventType.MEDICINE },
  طائرة: { hours: 24, priority: 4, type: EventType.FLIGHT },
  مطار: { hours: 24, priority: 4, type: EventType.FLIGHT },
};

// ===================== الدوال القديمة (بدون تغيير) =====================

export function analyzePriority(text: string): Priority {
  const lowerText = text.toLowerCase();
  const urgentKeywords = ['عاجل', 'ضروري', 'مهم جدا', 'فورا', 'urgent', 'important'];
  const normalKeywords = ['عادي', 'تذكير', 'موعد', 'normal', 'reminder'];
  const lowKeywords = ['يمكن', 'لاحقا', 'بعدين', 'maybe', 'later'];

  if (urgentKeywords.some((kw) => lowerText.includes(kw))) return 4;
  if (normalKeywords.some((kw) => lowerText.includes(kw))) return 2;
  if (lowKeywords.some((kw) => lowerText.includes(kw))) return 1;
  return 3;
}

export function detectEventType(text: string): EventType {
  const lowerText = text.toLowerCase();
  if (/(طائرة|مطار|airport)/.test(lowerText)) return EventType.FLIGHT;
  if (/(اجتماع|موعد|لقاء|مقابلة|meeting|appointment)/.test(lowerText))
    return EventType.MEETING;
  if (medicineKeywords.some((kw) => lowerText.includes(kw))) return EventType.MEDICINE;
  if (foodKeywords.some((kw) => lowerText.includes(kw)) || /(طبخ|اكل)/.test(lowerText))
    return EventType.FOOD;
  if (/(مدرسة|ابن|ابنة|طفل|school|child|kid)/.test(lowerText)) return EventType.SCHOOL;
  if (travelKeywords.some((kw) => lowerText.includes(kw))) return EventType.TRAVEL;
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

export function generateCustomMessage(
  eventType: EventType,
  eventTime: Date,
  lang: LanguageCode = 'ar'
): string {
  const timeStr = format(eventTime, 'hh:mm a');
  const isAr = lang === 'ar';

  switch (eventType) {
    case EventType.FLIGHT:
    case EventType.TRAVEL:
      return isAr
        ? `✈️ اقترب موعد رحلتك في ${timeStr}. تأكد من وثائقك!`
        : `✈️ Your flight at ${timeStr} is approaching. Check your documents!`;
    case EventType.MEETING:
      return isAr
        ? `💼 تذكير باجتماعك في ${timeStr}. استعد للموعد!`
        : `💼 Meeting reminder at ${timeStr}. Get ready!`;
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

export function getPriorityLabel(priority: Priority, lang: LanguageCode = 'ar'): string {
  const t = translations[lang];
  switch (priority) {
    case 1:
      return t.priority_low;
    case 2:
      return t.priority_medium;
    case 3:
      return t.priority_high;
    case 4:
      return t.priority_critical;
    default:
      return t.priority_medium;
  }
}

export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 1:
      return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500';
    case 2:
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    case 3:
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
    case 4:
      return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
    default:
      return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500';
  }
}

// ===================== دوال مساعدة جديدة للتحسين =====================

interface TimeParseResult {
  dateTime: Date | null;
  confidence: number;
  usedPattern: string;
}

 * محرك تحليل الوقت المطور - Smarty Time Engine v2.0
 */
const timePatterns: {
  pattern: RegExp;
  parseFn: (matches: RegExpMatchArray, now: Date) => Date | null;
  weight: number;
}[] = [
  // 1. الأوقات النسبية العامية (بعد ساعة، بعد نص ساعة، بعد ربع ساعة)
  {
    pattern: /(?:بعد|كمان)\s+(?:ساعة|ساعه)\s+(?:و|و\s+)?(?:نص|نصف)/i,
    parseFn: (m, now) => addMinutes(now, 90),
    weight: 0.9
  },
  {
    pattern: /(?:بعد|كمان)\s+(?:ساعة|ساعه)\s+(?:و|و\s+)?(?:ربع)/i,
    parseFn: (m, now) => addMinutes(now, 75),
    weight: 0.9
  },
  {
    pattern: /(?:بعد|كمان)\s+(نص|نصف)\s+(?:ساعة|ساعه)/i,
    parseFn: (m, now) => addMinutes(now, 30),
    weight: 0.9
  },
  // 2. الكلمات اليومية (غدوة، بكرة، اليوم، العشية)
  {
    pattern: /(?:غدوة|غدا|بكرة|بكره)\s+(?:الـ|في\s+)?(?:عشية|العشية|المساء|ليل)/i,
    parseFn: (m, now) => setHours(setMinutes(addDays(now, 1), 0), 18), // غداً 6 مساءً
    weight: 0.85
  },
  {
    pattern: /(?:غدوة|غدا|بكرة|بكره)\s+(?:الـ|في\s+)?(?:صباح|الصباح|بكري)/i,
    parseFn: (m, now) => setHours(setMinutes(addDays(now, 1), 0), 8), // غداً 8 صباحاً
    weight: 0.85
  },
  // 3. تحليل الوقت الرقمي المتطور (الساعة 7 ونص، 8 وربع)
  {
    pattern: /(?:الساعة|ساعة)\s+(\d{1,2})(?:\s+)?(?:و|:)\s*(نص|نصف|30)/i,
    parseFn: (m, now) => {
      let h = parseInt(m[1]);
      if (h < 12 && now.getHours() >= 12) h += 12; // تحويل تلقائي للمساء بناءً على الوقت الحالي
      return setHours(setMinutes(now, 30), h);
    },
    weight: 0.95
  },
  // 4. تحليل "بعد X دقيقة/ساعة" (دعم الأرقام العربية والإنجليزية)
  {
    pattern: /(?:بعد|كمان)\s+(\d+)\s+(دقيقة|دقائق|دقايف|ساعة|ساعات|ساعه)/i,
    parseFn: (m, now) => {
      const val = parseInt(m[1]);
      const unit = m[2];
      return unit.includes('ساع') ? addHours(now, val) : addMinutes(now, val);
    },
    weight: 0.9
  },
  // 5. تحليل أيام الأسبوع مع وقت محدد (السبت الجاي الـ 10)
  {
    pattern: /(الأحد|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت)\s+(?:الجاي|القادم)?\s*(?:الساعة|الـ)?\s*(\d{1,2})/i,
    parseFn: (m, now) => {
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const targetDay = days.indexOf(m[1]);
      let h = parseInt(m[2]);
      let date = addDays(now, (targetDay + 7 - now.getDay()) % 7 || 7);
      return setHours(setMinutes(date, 0), h);
    },
    weight: 0.95
  }
];

// تحديث دالة استخراج العنوان لتكون أكثر ذكاءً
function extractTitle(text: string, detectedType: EventType, location?: string): string {
    let title = text
        .replace(/(ذكرني|فكرني|تذكير|قولي|يا سمارتي|ديرلي تذكير)/gi, '')
        .replace(/(بعد|كمان|الساعة|ساعة|غدوة|بكرة|اليوم|عشية|صباح|ليل)/gi, '')
        // حذف الأرقام التي استُخدمت للوقت فقط
        .replace(/\d{1,2}(?::\d{2})?/g, '') 
        .trim();

    if (!title || title.length < 2) {
        const labels: any = { [EventType.FOOD]: 'تحضير طعام', [EventType.MEDICINE]: 'موعد دواء', [EventType.SCHOOL]: 'مدرسة' };
        return labels[detectedType] || 'تذكير جديد';
    }
    return title;
}

    
// ===================== الدالة الأساسية المحسنة =====================

export function parseSmartTime(
  text: string,
  lang: LanguageCode = 'ar'
): {
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

  // 1. كشف النوع والموقع والأولوية (نفس الدوال القديمة)
  const eventType = detectEventType(lowerText);
  const priority = analyzePriority(lowerText);
  const location = extractLocation(text);

  // 2. استخراج الوقت باستخدام الأنماط الجديدة
  const timeResult = extractTimeFromText(text, now);
  let eventTime: Date | null = timeResult.dateTime;

  // 3. إذا لم نجد وقتاً، نبحث في KEYWORDS (الآلية القديمة)
  if (!eventTime) {
    for (const [word, config] of Object.entries(KEYWORDS)) {
      if (lowerText.includes(word)) {
        if (config.minutes) eventTime = addMinutes(now, config.minutes);
        else if (config.hours) eventTime = addHours(now, config.hours);
        break;
      }
    }
  }

  // 4. إذا ما زال لا يوجد وقت، نستخدم القيمة الافتراضية حسب النوع
  let finalEventTime: Date;
  if (eventTime) {
    finalEventTime = eventTime;
  } else {
    // لم يتم تحديد وقت، نعتمد على مدة افتراضية
    let defaultDuration = 15; // دقيقة
    switch (eventType) {
      case EventType.FOOD:
        defaultDuration = 25;
        break;
      case EventType.MEDICINE:
        defaultDuration = 30;
        break;
      case EventType.MEETING:
        defaultDuration = 60;
        break;
      case EventType.SCHOOL:
        defaultDuration = 240;
        break;
      case EventType.FLIGHT:
      case EventType.TRAVEL:
        defaultDuration = 120;
        break;
    }
    finalEventTime = addMinutes(now, defaultDuration);
  }

  // 5. حساب أوقات التذكير (مع الاحتفاظ بمنطق SCHOOL الخاص)
  let reminderTimes: Date[] = [];
  const diffMinutes = differenceInMinutes(finalEventTime, now);

  if (eventType === EventType.SCHOOL && (lowerText.includes('وضعت') || lowerText.includes('مدرسة'))) {
    // حالة خاصة: تذكير بعد 4 و 6 ساعات
    reminderTimes = [addHours(now, 4), addHours(now, 6)];
    finalEventTime = reminderTimes[1]; // الحدث الرئيسي هو الثاني
  } else if (diffMinutes > 0) {
    const warningTime = new Date(finalEventTime.getTime() - diffMinutes * 0.2 * 60 * 1000);
    reminderTimes = [warningTime, finalEventTime];
  } else {
    reminderTimes = [finalEventTime];
  }

  // 6. حساب الثقة باستخدام الدالة الجديدة
  const confidence = calculateConfidence(text, eventTime, eventType, location, timeResult);

  // 7. استخراج العنوان (بعد إزالة أجزاء الوقت والموقع)
  const title = extractTitle(text, eventType, location);

  // 8. الرسالة المقترحة
  const suggestedMessage = generateCustomMessage(eventType, finalEventTime, lang);

  // 9. المدة الإجمالية (إذا كان الوقت محدداً تكون null)
  const totalDurationMinutes = eventTime ? null : Math.round(diffMinutes);

  return {
    eventTime: finalEventTime,
    reminderTimes,
    priority,
    eventType,
    location,
    confidence,
    suggestedMessage,
    totalDurationMinutes,
  };
      }
