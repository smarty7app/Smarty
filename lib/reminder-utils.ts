import {
  addMinutes, addHours, addDays, setHours, setMinutes, setSeconds, isBefore, format,
} from 'date-fns';
import { LanguageCode, translations } from './translations';

// --- التعريفات الأساسية ---
export type Priority = 1 | 2 | 3 | 4;
export enum EventType {
  FLIGHT = 'FLIGHT', MEETING = 'MEETING', MEDICINE = 'MEDICINE',
  FOOD = 'FOOD', APPOINTMENT = 'APPOINTMENT', TRAVEL = 'TRAVEL',
  SCHOOL = 'SCHOOL', OTHER = 'OTHER',
}
export enum ReminderStage { WARNING = 'WARNING', FINAL = 'FINAL' }

export interface TimeParseResult {
  dateTime: Date | null;
  confidence: number;
  isTimeDetected: boolean;
}

// --- القاموس العالمي الموحد (العقل اللغوي) ---
const GLOBAL_NUM_MAP: any = {
  // Arabic
  'نص': 30, 'نصف': 30, 'ربع': 15, 'ثلث': 20, 'ساعة': 1, 'ساعه': 1, 'ساعتين': 2, 'يوم': 1, 'يومين': 2, 'أربع': 4, 'اربع': 4,
  // English
  'half': 30, 'quarter': 15, 'hour': 1, 'hours': 1, 'day': 1, 'days': 1, 'two': 2, 'four': 4, 'min': 1, 'mins': 1,
  // French
  'demie': 30, 'quart': 15, 'heure': 1, 'heures': 1, 'jour': 1, 'jours': 1, 'deux': 2, 'quatre': 4, 'minute': 1
};

// --- 1. تحليل الأولوية العالمي ---
export function analyzePriority(text: string): Priority {
  const low = text.toLowerCase();
  const urgentPatterns = /(عاجل|ضروري|فورا|urgent|important|emergency|vite|immédiat|🚨)/i;
  const criticalPatterns = /(دواء|علاج|نار|فرن|مطار|طائرة|flight|avion|médicament)/i;
  
  if (urgentPatterns.test(low) || criticalPatterns.test(low)) return 4;
  return 3;
}

// --- 2. تنظيف العنوان (متعدد اللغات) ---
export function extractSmartTitle(text: string): string {
  return text
    .replace(/(?:تذكير|ذكرني|سوي|عمل|remind me|rappelle-moi)\s+/gi, '')
    // حذف أنماط الوقت باللغات الثلاث
    .replace(/(?:بعد|خلال|في|الساعة|in|within|dans|at|à|sur)\s+\d*.*?(?:دقيقة|ساعة|أيام|min|hour|day|jour|minute|صباحا|مساءا|am|pm)/gi, '')
    .replace(/(?:بعد|خلال|in|dans)\s+(?:نصف|نص|ربع|half|quarter|demie|quart|ساعتين|two hours|deux heures)/gi, '')
    .replace(/(?:غداً|غدا|بكرة|tomorrow|demain)/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || text;
}

// --- 3. المحلل الزمني العالمي ---
export function extractTimeFromText(text: string, now: Date): TimeParseResult {
  const low = text.toLowerCase().trim();
  
  // أ. معالجة المدد (بعد/In/Dans)
  const durationRegex = /(?:بعد|خلال|in|dans)\s+(\d+|نصف|نص|ربع|half|quarter|demie|quart|ساعة|hour|heure|day|jour|أربع|four|quatre)\s*(?:دقائق|mins|minutes|ساعة|hours|heures|أيام|days|jours)?/i;
  const match = low.match(durationRegex);

  if (match) {
    const val = match[1];
    const num = isNaN(parseInt(val)) ? (GLOBAL_NUM_MAP[val] || 1) : parseInt(val);
    
    if (/(يوم|day|jour|أيام)/i.test(low)) return { dateTime: addDays(now, num), confidence: 1, isTimeDetected: true };
    if (/(ساعة|hour|heure|ساعات)/i.test(low)) return { dateTime: addHours(now, num), confidence: 1, isTimeDetected: true };
    if (/(نصف|نص|half|demie)/i.test(low)) return { dateTime: addMinutes(now, 30), confidence: 1, isTimeDetected: true };
    if (/(ربع|quarter|quart)/i.test(low)) return { dateTime: addMinutes(now, 15), confidence: 1, isTimeDetected: true };
    
    return { dateTime: addMinutes(now, num), confidence: 1, isTimeDetected: true };
  }

  // ب. معالجة التوقيت المباشر (الساعة 4 / 4PM / 16h)
  const timeRegex = /(?:الساعة|الساعه|at|à|at)\s*(\d{1,2})(?::|h|.)?(\d{2})?\s*(صباحاً|صباحا|مساءً|مساءا|am|pm)?/i;
  const tMatch = low.match(timeRegex);
  if (tMatch) {
    let hrs = parseInt(tMatch[1]);
    const mins = tMatch[2] ? parseInt(tMatch[2]) : 0;
    const period = tMatch[3];
    if (period && /(مساءً|مساءا|pm)/i.test(period) && hrs < 12) hrs += 12;
    if (period && /(صباحاً|صباحا|am)/i.test(period) && hrs === 12) hrs = 0;
    
    let res = setHours(setMinutes(setSeconds(new Date(now), 0), mins), hrs);
    if (isBefore(res, now)) res = addDays(res, 1);
    return { dateTime: res, confidence: 1, isTimeDetected: true };
  }

  if (/(غداً|غدا|بكرة|tomorrow|demain)/i.test(low)) return { dateTime: addDays(now, 1), confidence: 0.9, isTimeDetected: true };
  
  return { dateTime: null, confidence: 0, isTimeDetected: false };
}

// --- 4. المحرك الرئيسي الموحد ---
export function parseSmartTime(text: string, lang: LanguageCode = 'ar') {
  const now = new Date();
  const timeRes = extractTimeFromText(text, now);
  const actualTime = timeRes.dateTime || addMinutes(now, 15);
  
  // كشف النوع بناءً على اللغات الثلاث
  const detectType = (t: string): EventType => {
    const l = t.toLowerCase();
    if (/(طائرة|flight|avion|مطار|airport)/.test(l)) return EventType.FLIGHT;
    if (/(دواء|medicine|médicament|علاج)/.test(l)) return EventType.MEDICINE;
    if (/(أكل|food|manger|غداء|عشاء)/.test(l)) return EventType.FOOD;
    if (/(اجتماع|meeting|rdv|موعد)/.test(l)) return EventType.MEETING;
    return EventType.OTHER;
  };

  return {
    eventTime: actualTime,
    reminderTimes: [actualTime],
    isTimeDetected: timeRes.isTimeDetected,
    confidence: timeRes.confidence,
    priority: analyzePriority(text),
    eventType: detectType(text),
    location: text.match(/(?:في|at|dans|in)\s+([^ ]+)/i)?.[1],
    title: extractSmartTitle(text),
    suggestedMessage: generateCustomMessage(detectType(text), actualTime, lang),
  };
}

export function generateCustomMessage(type: EventType, time: Date, lang: LanguageCode): string {
  const tStr = format(time, 'hh:mm a');
  if (lang === 'en') return `🔔 Reminder: ${tStr}`;
  if (lang === 'fr') return `🔔 Rappel: ${tStr}`;
  return `🔔 تذكير: ${tStr}`;
}

// دالتان للواجهة (UI)
export function getPriorityLabel(p: Priority, l: LanguageCode) { return translations[l].priority_high; }
export function getPriorityColor(p: Priority) { return p === 4 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'; }
