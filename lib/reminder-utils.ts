import {
  addMinutes, addHours, addDays, setHours, setMinutes, setSeconds, isBefore, format,
} from 'date-fns';
import { LanguageCode, translations } from './translations';

// ===================== 1. الأنواع والتعريفات (تأكدنا من التصدير هنا) =====================

export type Priority = 1 | 2 | 3 | 4;

export enum EventType {
  FLIGHT = 'FLIGHT', MEETING = 'MEETING', MEDICINE = 'MEDICINE',
  FOOD = 'FOOD', APPOINTMENT = 'APPOINTMENT', TRAVEL = 'TRAVEL',
  SCHOOL = 'SCHOOL', OTHER = 'OTHER',
}

export enum ReminderStage { WARNING = 'WARNING', FINAL = 'FINAL' }

// تم إضافة export هنا لحل خطأ NotificationService
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

// ===================== 2. القواميس والذكاء اللغوي =====================

const GLOBAL_NUM_MAP: any = {
  'نص': 30, 'نصف': 30, 'ربع': 15, 'ثلث': 20, 'ساعة': 1, 'ساعه': 1, 'ساعتين': 2, 'يوم': 1, 'يومين': 2, 'أربع': 4, 'اربع': 4,
  'half': 30, 'quarter': 15, 'hour': 1, 'hours': 1, 'day': 1, 'days': 1, 'two': 2, 'four': 4,
  'demie': 30, 'quart': 15, 'heure': 1, 'heures': 1, 'jour': 1, 'jours': 1
};

// ===================== 3. المحركات الذكية المصدرة =====================

export function analyzePriority(text: string): Priority {
  const low = text.toLowerCase();
  if (/(عاجل|ضروري|فورا|urgent|important|emergency|vite|immédiat|🚨)/i.test(low) || 
      /(دواء|علاج|نار|فرن|مطار|طائرة|flight|avion)/i.test(low)) {
    return 4;
  }
  return 3;
}

export function extractSmartTitle(text: string): string {
  let cleaned = text;

  // 1. حذف البادئات (الكلمات اللي نبداو بيها الهدرة)
  const prefixes = [
    /^(ذكرني|فكرني|ديرلي تذكير|سويلي|ابعتلي|كاشما تفكرني|سجل)\s+(بـ|ب|أن|ان)?/gi,
    /^(remind me to|remind me|set a reminder|add a task)\s+/gi,
    /^(rappelle-moi de|rappelle-moi|créer un rappel)\s+/gi
  ];
  
  prefixes.forEach(reg => cleaned = cleaned.replace(reg, ''));

  // 2. حذف كلمات الوقت المعقدة (Time Patterns)
  // يحيي: "من ذاك"، "في الليل"، "بعد شوية"، "in 2 hours"
  const timePatterns = [
  // تم إضافة النقطتين (?:) بعد علامة الاستفهام لفتح مجموعة غير لاقطة صحيحة
  /(?:بعد|خلال|في|على|للساعة|للساعه|دوا الـ|in|within|at|by|dans|à)\s+\d*.*?(?:دقيقة|دقيقه|دقائق|ساعة|ساعه|ساعات|سوايع|أيام|ايام|يوم|minutes?|mins?|hours?|days?|صباحا|مساءا|am|pm|du matin|du soir)/gi,
  
  // السطر الثاني كان صحيحاً، لكن أضفت لك كلمة "الوقيت" بالدارجة لزيادة الدقة
  /(?:الساعة|الساعه|الوقت|الوقيت|time|l'heure)\s*(\d{1,2})(?::|.)?(\d{2})?\s*(صباحا|مساءا|ص|م|am|pm)?/gi
];
  
  timePatterns.forEach(reg => cleaned = cleaned.replace(reg, ''));

  // 3. حذف الكلمات الزمنية "تاع الدزاير" والعالمية
  const relativeTime = [
    /(?:غداً|غدا|بكرة|بكرت|بعدين|قريبا|ساعتين|دقيقتين|يومين|دوقا|دروك|دقيقة|دقيقه|tomorrow|demain|today|tonight|later|soon|tout de suite)/gi
  ];
  
  relativeTime.forEach(reg => cleaned = cleaned.replace(reg, ''));

  // 4. تنظيف "الزيادات" اللي تبقى في لافان (End Clean-up)
  cleaned = cleaned
    .replace(/\s+(في|على|عند|الى|إلى|بعد|at|on|in|to|for|by|de|à|dans)$/g, '')
    .replace(/\s+/g, ' ') 
    .trim();

  // إذا بقا السطر فارغ، رجع النص كيما كان
  return cleaned || text;
}

export function extractTimeFromText(text: string, now: Date): TimeParseResult {
  const low = text.toLowerCase().trim();
  
  // 1. القاموس المرن والشامل لجميع اللهجات وأشكال الكتابة
  const GLOBAL_NUM_MAP: Record<string, number> = {
  // --- العربية والدارجة (DZ) ---
  'دقيقة': 1, 'دقيقه': 1, 'دقيقتين': 2, 'دقائق': 1, 'دقايق': 1,
  'ساعة': 60, 'ساعه': 60, 'ساعتين': 120, 'ساعتان': 120, 'سوايع': 60,
  'تلت سوايع': 180, 'اربع سوايع': 240, 'خمس سوايع': 300,
  'ثلاث ساعات': 180, 'أربع ساعات': 240, 'خمس ساعات': 300,
  'نصف': 30, 'نص': 30, 'ربع': 15, 'ثلث': 20,
  'يوم': 1440, 'يومين': 2880, 'بكرة': 1440, 'غدا': 1440, 'غداً': 1440,
  'واحد': 1, 'واحدة': 1, 'واحده': 1, 'شوية': 5,

  // --- اللغات الأجنبية (EN + FR) ---
  // ملاحظة: الكلمات المشتركة مثل 'minute' نكتبها مرة واحدة فقط
  'minute': 1, 
  'minutes': 1, 
  'min': 1,
  'hour': 60, 
  'hours': 60, 
  'heure': 60, 
  'heures': 60,
  'hr': 60,
  'day': 1440, 
  'days': 1440, 
  'jour': 1440, 
  'jours': 1440,
  'tomorrow': 1440, 
  'demain': 1440,
  'half': 30, 
  'demi': 30, 
  'quarter': 15, 
  'quart': 15,
  'third': 20
};

  // 2. البحث عن "بعد/خلال" + (كلمة أو رقم)
  const durationRegex = /(?:بعد|خلال|in|dans)\s+(\d+|نصف|نص|ربع|ساعة|ساعه|ساعتين|ساعتان|يوم|يومين|دقيقة|دقيقه|دقيقتين|واحدة|واحده|واحد|half|quarter|hour|day)/i;
  const match = low.match(durationRegex);

  if (match) {
    const val = match[1];
    let totalMinutes = 0;

    // حالة الرقم المباشر (مثلاً: بعد 5 دقائق)
    if (!isNaN(parseInt(val))) {
      const num = parseInt(val);
      if (/(ساعة|ساعه|ساعات|hour)/i.test(low)) totalMinutes = num * 60;
      else if (/(يوم|أيام|ايام|day)/i.test(low)) totalMinutes = num * 1440;
      else totalMinutes = num; // دقائق افتراضياً
    } 
    // حالة الكلمات (مثلاً: بعد ساعتين، بعد دقيقة)
    else if (GLOBAL_NUM_MAP[val]) {
      totalMinutes = GLOBAL_NUM_MAP[val];
    }

    if (totalMinutes > 0) {
      return { dateTime: addMinutes(now, totalMinutes), confidence: 1, isTimeDetected: true };
    }
  }

  // 3. فحص الوقت المباشر (مثلاً: الساعة 9:30 مساءً)
  const timeRegex = /(?:الساعة|الساعه|at|à|على|في)\s*(\d{1,2})(?::|h|.)?(\d{2})?\s*(صباحاً|صباحا|مساءً|مساءا|ص|م|am|pm)?/i;
  const tMatch = low.match(timeRegex);
  if (tMatch) {
    let hrs = parseInt(tMatch[1]);
    const mins = tMatch[2] ? parseInt(tMatch[2]) : 0;
    const period = tMatch[3];
    if (period && /(مساءً|مساءا|م|pm)/i.test(period) && hrs < 12) hrs += 12;
    if (period && /(صباحاً|صباحا|ص|am)/i.test(period) && hrs === 12) hrs = 0;
    
    let res = setHours(setMinutes(setSeconds(new Date(now), 0), mins), hrs);
    if (isBefore(res, now)) res = addDays(res, 1);
    return { dateTime: res, confidence: 1, isTimeDetected: true };
  }

  // 4. حالة غداً أو بكرة
  if (/(غداً|غدا|بكرة|tomorrow|demain)/i.test(low)) {
    return { dateTime: addDays(now, 1), confidence: 0.9, isTimeDetected: true };
  }

  return { dateTime: null, confidence: 0, isTimeDetected: false };
}

export function detectEventType(text: string): EventType {
  const l = text.toLowerCase();
  if (/(طائرة|flight|avion|مطار|airport)/.test(l)) return EventType.FLIGHT;
  if (/(دواء|medicine|médicament|علاج)/.test(l)) return EventType.MEDICINE;
  if (/(أكل|food|manger|غداء|عشاء)/.test(l)) return EventType.FOOD;
  if (/(اجتماع|meeting|rdv|موعد)/.test(l)) return EventType.MEETING;
  return EventType.OTHER;
}

export function parseSmartTime(text: string, lang: LanguageCode = 'ar') {
  const now = new Date();
  const timeRes = extractTimeFromText(text, now);
  const actualTime = timeRes.dateTime || addMinutes(now, 15);
  const eventType = detectEventType(text);

  return {
    eventTime: actualTime,
    reminderTimes: [actualTime],
    isTimeDetected: timeRes.isTimeDetected,
    confidence: timeRes.confidence,
    priority: analyzePriority(text),
    eventType,
    location: text.match(/(?:في|at|dans|in)\s+([^ ]+)/i)?.[1],
    title: extractSmartTitle(text),
    suggestedMessage: generateCustomMessage(eventType, actualTime, lang),
  };
}

export function generateCustomMessage(type: EventType, time: Date, lang: LanguageCode): string {
  const tStr = format(time, 'hh:mm a');
  if (lang === 'en') return `🔔 Reminder: ${tStr}`;
  if (lang === 'fr') return `🔔 Rappel: ${tStr}`;
  return `🔔 تذكير: ${tStr}`;
}

export function getPriorityLabel(p: Priority, l: LanguageCode) {
  return translations[l][p === 4 ? 'priority_critical' : 'priority_high'];
}

export function getPriorityColor(p: Priority) {
  return p === 4 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white';
}
