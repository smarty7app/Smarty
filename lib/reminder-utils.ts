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

/**
 * قائمة بأنماط الوقت المدعومة مع دوال التحويل
 */
const timePatterns: {
  pattern: RegExp;
  parseFn: (matches: RegExpMatchArray, now: Date) => Date | null;
  lang: 'ar' | 'en' | 'both';
  weight: number; // مساهمة في الثقة عند المطابقة
}[] = [
  // ===== أنماط عربية =====
  {
    pattern: /بعد\s+(\d+)\s+(دقيقة|دقائق)/i,
    parseFn: (matches, now) => addMinutes(now, parseInt(matches[1])),
    lang: 'ar',
    weight: 0.6,
  },
  {
    pattern: /بعد\s+(\d+)\s+(ساعة|ساعات)/i,
    parseFn: (matches, now) => addHours(now, parseInt(matches[1])),
    lang: 'ar',
    weight: 0.6,
  },
  {
    pattern: /الساعة\s+(\d{1,2})(?:\s*):?\s*(\d{2})?\s*(ص|م|صباحاً|مساءً|صباح|مساء)?/i,
    parseFn: (matches, now) => {
      let hour = parseInt(matches[1]);
      const minute = matches[2] ? parseInt(matches[2]) : 0;
      const period = matches[3] || '';

      if ((period.includes('م') || period.includes('مساء')) && hour < 12) hour += 12;
      else if ((period.includes('ص') || period.includes('صباح')) && hour === 12) hour = 0;

      let date = setHours(setMinutes(now, minute), hour);
      date = setSeconds(date, 0);
      if (isBefore(date, now)) date = addDays(date, 1);
      return date;
    },
    lang: 'ar',
    weight: 0.7,
  },
  {
    pattern: /(?:غداً|غدا|بكرة)\s+الساعة\s+(\d{1,2})(?:\s*):?\s*(\d{2})?\s*(ص|م|صباحاً|مساءً)?/i,
    parseFn: (matches, now) => {
      let hour = parseInt(matches[1]);
      const minute = matches[2] ? parseInt(matches[2]) : 0;
      const period = matches[3] || '';
      if ((period.includes('م') || period.includes('مساء')) && hour < 12) hour += 12;
      else if ((period.includes('ص') || period.includes('صباح')) && hour === 12) hour = 0;
      let date = setHours(setMinutes(addDays(now, 1), minute), hour);
      date = setSeconds(date, 0);
      return date;
    },
    lang: 'ar',
    weight: 0.8,
  },
  {
    pattern: /(?:الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت|الأحد)\s+الساعة\s+(\d{1,2})(?:\s*):?\s*(\d{2})?\s*(ص|م|صباحاً|مساءً)?/i,
    parseFn: (matches, now) => {
      const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const dayIndex = dayNames.findIndex((d) => matches[0].includes(d));
      if (dayIndex === -1) return null;

      let hour = parseInt(matches[1]);
      const minute = matches[2] ? parseInt(matches[2]) : 0;
      const period = matches[3] || '';
      if ((period.includes('م') || period.includes('مساء')) && hour < 12) hour += 12;
      else if ((period.includes('ص') || period.includes('صباح')) && hour === 12) hour = 0;

      let targetDate = new Date(now);
      const currentDay = now.getDay(); // 0 = الأحد
      let daysToAdd = (dayIndex - currentDay + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7; // إذا كان اليوم نفسه، ننتقل للأسبوع القادم
      targetDate = addDays(targetDate, daysToAdd);
      targetDate = setHours(setMinutes(targetDate, minute), hour);
      targetDate = setSeconds(targetDate, 0);
      return targetDate;
    },
    lang: 'ar',
    weight: 0.9,
  },
  // ===== أنماط إنجليزية =====
  {
    pattern: /in\s+(\d+)\s+(minute|minutes)/i,
    parseFn: (matches, now) => addMinutes(now, parseInt(matches[1])),
    lang: 'en',
    weight: 0.6,
  },
  {
    pattern: /in\s+(\d+)\s+(hour|hours)/i,
    parseFn: (matches, now) => addHours(now, parseInt(matches[1])),
    lang: 'en',
    weight: 0.6,
  },
  {
    pattern: /(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
    parseFn: (matches, now) => {
      let hour = parseInt(matches[1]);
      const minute = matches[2] ? parseInt(matches[2]) : 0;
      const period = matches[3] ? matches[3].toLowerCase() : '';

      if (period === 'pm' && hour < 12) hour += 12;
      else if (period === 'am' && hour === 12) hour = 0;

      let date = setHours(setMinutes(now, minute), hour);
      date = setSeconds(date, 0);
      if (isBefore(date, now)) date = addDays(date, 1);
      return date;
    },
    lang: 'en',
    weight: 0.7,
  },
  {
    pattern: /tomorrow\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
    parseFn: (matches, now) => {
      let hour = parseInt(matches[1]);
      const minute = matches[2] ? parseInt(matches[2]) : 0;
      const period = matches[3] ? matches[3].toLowerCase() : '';
      if (period === 'pm' && hour < 12) hour += 12;
      else if (period === 'am' && hour === 12) hour = 0;
      let date = setHours(setMinutes(addDays(now, 1), minute), hour);
      date = setSeconds(date, 0);
      return date;
    },
    lang: 'en',
    weight: 0.8,
  },
  {
    pattern: /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
    parseFn: (matches, now) => {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayIndex = dayNames.findIndex((d) => matches[1].toLowerCase().includes(d));
      if (dayIndex === -1) return null;

      let hour = parseInt(matches[2]);
      const minute = matches[3] ? parseInt(matches[3]) : 0;
      const period = matches[4] ? matches[4].toLowerCase() : '';
      if (period === 'pm' && hour < 12) hour += 12;
      else if (period === 'am' && hour === 12) hour = 0;

      let targetDate = new Date(now);
      const currentDay = now.getDay();
      let daysToAdd = (dayIndex - currentDay + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7;
      targetDate = addDays(targetDate, daysToAdd);
      targetDate = setHours(setMinutes(targetDate, minute), hour);
      targetDate = setSeconds(targetDate, 0);
      return targetDate;
    },
    lang: 'en',
    weight: 0.9,
  },
];

/**
 * محاولة استخراج الوقت باستخدام جميع الأنماط
 */
function extractTimeFromText(text: string, now: Date): TimeParseResult {
  const lowerText = text.toLowerCase();
  let bestResult: TimeParseResult = { dateTime: null, confidence: 0, usedPattern: '' };

  for (const { pattern, parseFn, weight } of timePatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      try {
        const dateTime = parseFn(match, now);
        if (dateTime && isValid(dateTime)) {
          // إذا حصلنا على وقت، نرجعه فوراً مع الثقة
          return { dateTime, confidence: weight, usedPattern: pattern.source };
        }
      } catch (e) {
        // تجاهل الأخطاء
      }
    }
  }
  return bestResult;
}

/**
 * تحسين استخراج العنوان (إزالة كلمات الوقت والكلمات الدالة)
 */
function extractTitle(text: string, detectedType: EventType, location?: string): string {
  let title = text;
  // إزالة كلمات التنبيه العامة
  title = title.replace(/^(ذكرني|تذكير|في|عند|الساعة|على|بعد|في|at|remind me|reminder|in|on)\s*/gi, '');
  // إزالة أنماط الوقت
  for (const { pattern } of timePatterns) {
    title = title.replace(pattern, '');
  }
  // إزالة الموقع إذا وجد
  if (location) {
    const locationRegex = new RegExp(`(?:في|بـ|at|in)\\s*${location}`, 'gi');
    title = title.replace(locationRegex, '');
  }
  // تنظيف المسافات الزائدة
  title = title.replace(/\s+/g, ' ').trim();
  if (!title || title.length === 0) {
    // إذا أصبح العنوان فارغاً، نستخدم نوع الحدث كعنوان افتراضي
    switch (detectedType) {
      case EventType.FLIGHT:
        return 'تذكير رحلة';
      case EventType.MEETING:
        return 'موعد اجتماع';
      case EventType.MEDICINE:
        return 'موعد دواء';
      case EventType.FOOD:
        return 'تذكير طعام';
      case EventType.SCHOOL:
        return 'مدرسة';
      case EventType.TRAVEL:
        return 'سفر';
      default:
        return 'تذكير';
    }
  }
  return title;
}

/**
 * حساب مستوى الثقة بناءً على عدة عوامل
 */
function calculateConfidence(
  text: string,
  extractedTime: Date | null,
  eventType: EventType,
  location: string | undefined,
  timeResult: TimeParseResult
): number {
  let confidence = 0.2; // قاعدة

  // 1. إذا تم استخراج وقت بنمط محدد
  if (extractedTime) {
    confidence += timeResult.confidence; // الوزن المبدئي للنمط
    // مكافأة إضافية إذا كان الوقت دقيقاً (أي يتضمن دقائق)
    if (text.includes(':')) confidence += 0.1;
  } else {
    // إذا لم نجد وقتاً، نخفض الثقة
    confidence -= 0.2;
  }

  // 2. نوع الحدث ليس OTHER
  if (eventType !== EventType.OTHER) confidence += 0.15;

  // 3. وجود موقع
  if (location) confidence += 0.1;

  // 4. طول النص المنطقي (كلما زاد النص الوصفي، زادت الثقة)
  const words = text.split(/\s+/).length;
  if (words >= 3) confidence += 0.1;
  else if (words <= 1) confidence -= 0.1;

  // 5. وجود كلمات دالة من KEYWORDS
  const lowerText = text.toLowerCase();
  for (const word of Object.keys(KEYWORDS)) {
    if (lowerText.includes(word)) {
      confidence += 0.1;
      break;
    }
  }

  // حد أقصى وأدنى
  return Math.min(1, Math.max(0.1, confidence));
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
