import { addMinutes, addHours, addDays, setHours, setMinutes, setSeconds, isBefore, format } from 'date-fns';
import { LanguageCode, translations } from './translations';

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
  
  // تحديد نوع الحدث والأولوية والموقع أولاً (لأنها مهمة للرسالة)
  const eventType = detectEventType(lowerText);
  const priority = analyzePriority(lowerText);
  const location = extractLocation(text);

  let eventTime: Date | null = null;
  let isSpecificTime = false; // هل المستخدم حدد وقتاً؟

  // 1. الكشف عن عبارات "بعد X دقيقة/ساعة" (بالعربية والإنجليزية)
  const afterPatterns = [
    /(?:بعد|في)\s+(\d+)\s*(?:دقيقة|دقائق|min|mins|minutes?)/i, // بعد 10 دقائق، في 5 دقائق
    /(?:بعد|في)\s+(\d+)\s*(?:ساعة|ساعات|hour|hours?)/i, // بعد 2 ساعة، في 3 ساعات
    /(?:in)\s+(\d+)\s*(?:min|mins|minutes?)/i, // in 10 minutes
    /(?:in)\s+(\d+)\s*(?:hour|hours?)/i, // in 2 hours
    /(?:بعد)\s+(\d+)\s*(?:ساعه|ساعتين)/i, // بعد ساعه (بدون تنوين)، بعد ساعتين
    /(?:بعد)\s+(\d+)?\s*(?:نص|نصف)\s*(?:ساعة|ساعه)/i // بعد نص ساعة
  ];

  for (const pattern of afterPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      const value = parseInt(match[1]) || 1; // إذا كان الرقم غير موجود (مثل "نص ساعة")، نعتبره 1
      const unit = match[0]; // النص الكامل للمطابقة
      if (unit.includes('دقيقة') || unit.includes('min')) {
        eventTime = addMinutes(now, value);
      } else if (unit.includes('ساعة') || unit.includes('hour')) {
        eventTime = addHours(now, value);
      }
      isSpecificTime = true;
      break; // وجدنا تطابقاً، نخرج من الحلقة
    }
  }

  // 2. إذا لم نجد عبارة "بعد"، نبحث عن وقت محدد (مثل "الساعة 8")
  if (!eventTime) {
    const timePatterns = [
      /(?:الساعة|على|فـ|في|at|on)\s*(\d{1,2})(?:\s*)?(?::)?(?:\s*)?(\d{2})?(?:\s*)?(صباحا|مساء|صباح|مساء|ص|م|am|pm)?/i,
      /(\d{1,2})(?:\s*)?(?::)?(?:\s*)?(\d{2})?\s*(صباحا|مساء|صباح|مساء|ص|م|am|pm)?/i, // صيغ مثل "8 صباحاً"
    ];

    for (const pattern of timePatterns) {
      const timeMatch = lowerText.match(pattern);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2] || '0');
        let period = timeMatch[3] || '';

        if (typeof period === 'string') period = period.toLowerCase();

        if ((period.includes('مساء') || period.includes('م') || period.includes('pm')) && hour < 12) {
          hour += 12;
        } else if ((period.includes('صباح') || period.includes('ص') || period.includes('am')) && hour === 12) {
          hour = 0;
        }

        eventTime = setSeconds(setMinutes(setHours(now, hour), minute), 0);
        if (isBefore(eventTime, now)) {
          eventTime = addDays(eventTime, 1); // إذا فات الوقت، نضيف يوماً
        }
        isSpecificTime = true;
        break;
      }
    }
  }

  // 3. الكشف عن "غداً" أو "tomorrow"
  if (!eventTime && (lowerText.includes('غدا') || lowerText.includes('غداً') || lowerText.includes('tomorrow'))) {
    // إذا كان هناك كلمة مفتاحية للسفر، نجعل الوقت 8 صباحاً، وإلا 9 صباحاً
    const defaultHour = (eventType === EventType.FLIGHT || eventType === EventType.TRAVEL) ? 8 : 9;
    eventTime = addDays(setSeconds(setMinutes(setHours(now, defaultHour), 0), 0), 1);
    isSpecificTime = true;
  }

  // 4. إذا لم نجد أي وقت محدد، نستخدم الوقت الافتراضي بناءً على الكلمات المفتاحية
  if (!eventTime) {
    for (const [word, config] of Object.entries(KEYWORDS)) {
      if (lowerText.includes(word)) {
        if (config.minutes) eventTime = addMinutes(now, config.minutes);
        else if (config.hours) eventTime = addHours(now, config.hours);
        break;
      }
    }
  }

  // 5. إذا ما زلنا بدون وقت، نستخدم افتراضي 15 دقيقة
  if (!eventTime) {
    eventTime = addMinutes(now, 15);
  }

  // الآن eventTime محدد، نحتاج لحساب أوقات التذكير (reminderTimes)
  let reminderTimes: Date[] = [];
  const finalEventTime = eventTime; // وقت الحدث الفعلي

  const diffMinutes = (finalEventTime.getTime() - now.getTime()) / (60 * 1000);

  if (eventType === EventType.SCHOOL && (lowerText.includes('وضعت') || lowerText.includes('مدرسة'))) {
    // حالة خاصة للمدرسة: تذكير بعد 4 ساعات و 6 ساعات
    reminderTimes = [addHours(now, 4), addHours(now, 6)];
  } else if (diffMinutes > 0) {
    // تذكير تحذيري بعد 80% من المدة
    const warningTime = new Date(finalEventTime.getTime() - (diffMinutes * 0.2 * 60 * 1000));
    reminderTimes = [warningTime, finalEventTime];
  } else {
    reminderTimes = [finalEventTime];
  }

  const suggestedMessage = generateCustomMessage(eventType, finalEventTime, lang);
  
  // حساب الثقة (confidence)
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
