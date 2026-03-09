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

  const eventType = detectEventType(lowerText);
  const priority = analyzePriority(lowerText);
  const location = extractLocation(text);

  let eventTime: Date | null = null;
  let isSpecificTime = false;

  // 1. الكشف عن عبارات المدة مثل "بعد ساعة" أو "بعد 30 دقيقة"
  const afterPatterns = [
    /(?:بعد|في)\s+(\d+)\s*(?:دقيقة|دقائق|min|mins|minutes?)/i, // بعد 10 دقائق
    /(?:بعد|في)\s+(\d+)\s*(?:ساعة|ساعات|hour|hours?)/i, // بعد 2 ساعة
    /(?:in)\s+(\d+)\s*(?:min|mins|minutes?)/i, // in 10 minutes
    /(?:in)\s+(\d+)\s*(?:hour|hours?)/i, // in 2 hours
    /(?:بعد)\s+(\d+)?\s*(?:نص|نصف)\s*(?:ساعة|ساعه)/i, // بعد نص ساعة
    /(?:بعد)\s+(?:ساعة|ساعه)/i, // بعد ساعة (بدون رقم)
    /(?:بعد)\s+(?:ساعتين)/i, // بعد ساعتين
  ];

  for (const pattern of afterPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      // إذا كان هناك رقم (مثل 10 دقائق)
      if (match[1] && !isNaN(parseInt(match[1]))) {
        const value = parseInt(match[1]);
        if (pattern.source.includes('دقيقة') || pattern.source.includes('min')) {
          eventTime = addMinutes(now, value);
        } else if (pattern.source.includes('ساعة') || pattern.source.includes('hour')) {
          eventTime = addHours(now, value);
        }
      } else {
        // حالات بدون رقم مثل "بعد ساعة" أو "بعد ساعتين"
        if (pattern.source.includes('ساعتين')) {
          eventTime = addHours(now, 2);
        } else if (pattern.source.includes('ساعة') || pattern.source.includes('ساعه')) {
          eventTime = addHours(now, 1);
        } else if (pattern.source.includes('نص')) {
          eventTime = addMinutes(now, 30);
        }
      }
      if (eventTime) {
        isSpecificTime = true;
        break;
      }
    }
  }

  // 2. الكشف عن وقت محدد مثل "الساعة 8 صباحاً"
  if (!eventTime) {
    const timePatterns = [
      /(?:الساعة|على|فـ|في|at|on)\s*(\d{1,2})(?:\s*)?(?::)?(?:\s*)?(\d{2})?(?:\s*)?(صباحا|مساء|صباح|مساء|ص|م|am|pm)?/i,
      /(\d{1,2})(?:\s*)?(?::)?(?:\s*)?(\d{2})?\s*(صباحا|مساء|صباح|مساء|ص|م|am|pm)?/i,
    ];

    for (const pattern of timePatterns) {
      const timeMatch = lowerText.match(pattern);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2] || '0');
        let period = timeMatch[3] || '';

        if (period) period = period.toLowerCase();

        if ((period.includes('مساء') || period.includes('م') || period.includes('pm')) && hour < 12) {
          hour += 12;
        } else if ((period.includes('صباح') || period.includes('ص') || period.includes('am')) && hour === 12) {
          hour = 0;
        }

        eventTime = setSeconds(setMinutes(setHours(now, hour), minute), 0);
        if (isBefore(eventTime, now)) {
          eventTime = addDays(eventTime, 1);
        }
        isSpecificTime = true;
        break;
      }
    }
  }

  // 3. الكشف عن "غداً"
  if (!eventTime && (lowerText.includes('غدا') || lowerText.includes('غداً') || lowerText.includes('tomorrow'))) {
    const defaultHour = (eventType === EventType.FLIGHT || eventType === EventType.TRAVEL) ? 8 : 9;
    eventTime = setHours(addDays(now, 1), defaultHour);
    setMinutes(eventTime, 0);
    setSeconds(eventTime, 0);
    isSpecificTime = true;
  }

  // 4. استخدام الكلمات المفتاحية إذا لم يتم العثور على وقت
  if (!eventTime) {
    for (const [word, config] of Object.entries(KEYWORDS)) {
      if (lowerText.includes(word)) {
        if (config.minutes) eventTime = addMinutes(now, config.minutes);
        else if (config.hours) eventTime = addHours(now, config.hours);
        break;
      }
    }
  }

  // 5. افتراضي 15 دقيقة
  if (!eventTime) {
    eventTime = addMinutes(now, 15);
  }

  // حساب أوقات التذكير (تحذيري + نهائي)
  let reminderTimes: Date[] = [];
  const finalEventTime = eventTime;
  const diffMinutes = (finalEventTime.getTime() - now.getTime()) / (60 * 1000);

  if (eventType === EventType.SCHOOL && (lowerText.includes('وضعت') || lowerText.includes('مدرسة'))) {
    reminderTimes = [addHours(now, 4), addHours(now, 6)];
    // finalEventTime يبقى كما هو
  } else if (diffMinutes > 0) {
    const warningTime = new Date(finalEventTime.getTime() - diffMinutes * 0.2 * 60 * 1000);
    reminderTimes = [warningTime, finalEventTime];
  } else {
    reminderTimes = [finalEventTime];
  }

  const suggestedMessage = generateCustomMessage(eventType, finalEventTime, lang);

  // حساب الثقة
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
    totalDurationMinutes,
  };
}
