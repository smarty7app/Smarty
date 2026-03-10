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

// --- القواميس الذكية (عقل النظام) ---
const NUM_MAP: any = { 'ربع': 15, 'ثلث': 20, 'نص': 30, 'نصف': 30, 'ساعة': 1, 'ساعه': 1, 'ساعتين': 2, 'يوم': 1, 'يومين': 2, 'أربع': 4, 'اربع': 4, 'ثلاث': 3, 'خمس': 5, 'عشر': 10 };

// --- 1. دالة تحليل الأولوية (المطلوبة للـ Build) ---
export function analyzePriority(text: string): Priority {
  const low = text.toLowerCase();
  if (/(عاجل|ضروري|فورا|urgent|important|emergency|🚨)/i.test(low)) return 4;
  if (/(دواء|علاج|نار|فرن|مطار|طائرة|flight)/i.test(low)) return 4;
  return 3;
}

// --- 2. دالة تنظيف العنوان (الدقة المتناهية) ---
export function extractSmartTitle(text: string): string {
  return text
    .replace(/(?:تذكير|ذكرني|سوي|عمل|ابيك تذكرني)\s+/gi, '')
    .replace(/(?:بعد|خلال|في|على|الساعة|الساعه|للساعه)\s+\d*.*?(?:دقيقة|دقائق|ساعة|ساعات|أيام|ايام|يوم|صباحا|مساءا|ص|م|am|pm)/gi, '')
    .replace(/(?:بعد|خلال)\s+(?:نصف|نص|ربع|ثلث|ساعتين|يومين|ساعة|ساعه|دقيقة واحدة)/gi, '')
    .replace(/(?:غداً|غدا|بكرة|tomorrow)/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || text;
}

// --- 3. المحلل الزمني العميق (Deep Time Parser) ---
export function extractTimeFromText(text: string, now: Date): TimeParseResult {
  const lowerText = text.toLowerCase().trim();
  
  // أ. معالجة المدد (بعد X دقيقة/ساعة/يوم)
  const durationRegex = /(?:بعد|خلال)\s+(\d+|نصف|نص|ربع|ثلث|ساعة|ساعه|ساعتين|يوم|يومين|أربع|اربع|ثلاث|خمس)\s*(?:دقائق|دقيقة|ساعة|ساعه|ساعات|أيام|ايام|يوم)?/i;
  const match = lowerText.match(durationRegex);

  if (match) {
    const val = match[1];
    if (val === 'نصف' || val === 'نص') return { dateTime: addMinutes(now, 30), confidence: 1, isTimeDetected: true };
    if (val === 'ربع') return { dateTime: addMinutes(now, 15), confidence: 1, isTimeDetected: true };
    if (val === 'ساعتين') return { dateTime: addHours(now, 2), confidence: 1, isTimeDetected: true };
    
    const num = isNaN(parseInt(val)) ? (NUM_MAP[val] || 1) : parseInt(val);
    
    if (lowerText.includes('يوم') || lowerText.includes('أيام')) return { dateTime: addDays(now, num), confidence: 1, isTimeDetected: true };
    if (lowerText.includes('ساعة') || lowerText.includes('ساعات')) return { dateTime: addHours(now, num), confidence: 1, isTimeDetected: true };
    return { dateTime: addMinutes(now, num), confidence: 1, isTimeDetected: true };
  }

  // ب. معالجة التوقيت المباشر (الساعة 4:30 م)
  const timeRegex = /(?:الساعة|الساعه|في)\s*(\d{1,2})(?::|.)?(\d{2})?\s*(صباحاً|صباحا|مساءً|مساءا|ص|م|am|pm)?/i;
  const tMatch = lowerText.match(timeRegex);
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

  if (/(غداً|غدا|بكرة)/.test(lowerText)) return { dateTime: addDays(now, 1), confidence: 0.9, isTimeDetected: true };
  
  return { dateTime: null, confidence: 0, isTimeDetected: false };
}

// --- 4. المحرك الرئيسي (The Core Engine) ---
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
    location: extractLocation(text),
    title: extractSmartTitle(text),
    suggestedMessage: generateCustomMessage(eventType, actualTime, lang),
  };
}

// --- الدوال المساعدة ---
export function detectEventType(text: string): EventType {
  const low = text.toLowerCase();
  if (/(طائرة|مطار|سفر|flight)/.test(low)) return EventType.FLIGHT;
  if (/(دواء|علاج|حبة|insulin)/.test(low)) return EventType.MEDICINE;
  if (/(أكل|طعام|طبخ|غداء|عشاء)/.test(low)) return EventType.FOOD;
  return EventType.OTHER;
}

export function extractLocation(text: string) {
  const m = text.match(/(?:في|بـ|at|in)\s+([^ ]+)/i);
  return m ? m[1] : undefined;
}

export function generateCustomMessage(type: EventType, time: Date, lang: LanguageCode): string {
  const tStr = format(time, 'hh:mm a');
  return lang === 'ar' ? `🔔 تذكير ذكي: ${tStr}` : `🔔 Smart Reminder: ${tStr}`;
}

export function getPriorityLabel(p: Priority, l: LanguageCode) { return translations[l].priority_high; }
export function getPriorityColor(p: Priority) { return p === 4 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'; }
