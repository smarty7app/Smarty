// lib/date-parser.ts

// ==================== الخرائط اللغوية (كما هي، لم تتغير) ====================
// ... (جميع الخرائط من النسخة السابقة موجودة هنا، لن أكررها للاختصار، لكن سأضعها في الملف النهائي)
// في الرد الكامل، سأضمن جميع الخرائط اللغوية التي كانت موجودة مسبقاً.

// ==================== دوال مساعدة محسنة ====================

function parseArabicNumberWordImproved(word: string): number | null {
  const normalized = word.toLowerCase().replace(/[ًٌٍَُِّْ]/g, '');
  // دعم "خمسة" و "خمس" و "خمسين" ...
  if (normalized === 'خمسون' || normalized === 'خمسين') return 50;
  if (normalized === 'عشرة') return 10;
  if (normalized === 'عشرين') return 20;
  if (normalized === 'ثلاثين') return 30;
  if (normalized === 'أربعين' || normalized === 'اربعين') return 40;
  if (normalized === 'ستين') return 60;
  if (normalized === 'سبعين') return 70;
  if (normalized === 'ثمانين') return 80;
  if (normalized === 'تسعين') return 90;
  return arabicNumeralMap[normalized] || null;
}

function parseFrenchNumberWordImproved(word: string): number | null {
  const normalized = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized === 'cinquante') return 50;
  if (normalized === 'soixante') return 60;
  // ... إلخ
  return frenchNumeralMap[normalized] || null;
}

function parseEnglishNumberWordImproved(word: string): number | null {
  const normalized = word.toLowerCase();
  if (normalized === 'fifty') return 50;
  if (normalized === 'sixty') return 60;
  // ... إلخ
  return englishNumeralMap[normalized] || null;
}

// دالة لاستخراج المدة الزمنية من النص (محسنة)
function parseDurationFromTextImproved(text: string, lang: 'ar' | 'fr' | 'en'): { days: number; hours: number; minutes: number; months?: number; years?: number } | null {
  let days = 0;
  let hours = 0;
  let minutes = 0;
  let months = 0;
  let years = 0;
  let found = false;

  const patterns: Record<string, Array<{ regex: RegExp; unit: string; multiplier?: number }>> = {
    ar: [
      { regex: /(?:و)?\s*(\d+|واحد|واحدة|اثنين|اثنان|اثنتين|ثلاثة|ثلاث|اربعة|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة|عشرين|ثلاثين|أربعين|خمسين|ستين|سبعين|ثمانين|تسعين)\s*(سنة|سنوات|عام|أعوام)\s*/i, unit: 'years' },
      { regex: /(?:و)?\s*(\d+|واحد|اثنين|ثلاثة|اربعة|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة|عشرين|ثلاثين|أربعين|خمسين)\s*(شهر|أشهر)\s*/i, unit: 'months' },
      { regex: /(?:و)?\s*(\d+|واحد|اثنين|ثلاثة|اربعة|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة|عشرين)\s*(يوم|أيام|يومين)\s*/i, unit: 'days' },
      { regex: /(?:و)?\s*(\d+|واحد|اثنين|ثلاثة|اربعة|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة|عشرين)\s*(ساعة|ساعات|ساعتين)\s*/i, unit: 'hours' },
      { regex: /(?:و)?\s*(\d+|واحد|اثنين|ثلاثة|اربعة|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة|عشرين|خمسون|خمسين)\s*(دقيقة|دقائق|دقيقتين)\s*/i, unit: 'minutes' },
      { regex: /(?:و)?\s*(واحد|اثنان|ثلاثة|اربعة|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة)\s*(?!سنة|شهر|يوم|ساعة|دقيقة)/i, unit: 'minutes', multiplier: 1 } // افتراضي دقائق
    ],
    // يمكن إضافة أنماط للفرنسية والإنجليزية بالمثل
  };

  const parseNumber = (numStr: string, lang: string): number => {
    if (/^\d+$/.test(numStr)) return parseInt(numStr);
    if (lang === 'ar') return parseArabicNumberWordImproved(numStr) || 0;
    if (lang === 'fr') return parseFrenchNumberWordImproved(numStr) || 0;
    return parseEnglishNumberWordImproved(numStr) || 0;
  };

  for (const pattern of patterns[lang]) {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const value = parseNumber(match[1], lang);
      if (isNaN(value)) continue;
      found = true;
      switch (pattern.unit) {
        case 'years': years += value; break;
        case 'months': months += value; break;
        case 'days': days += value; break;
        case 'hours': hours += value; break;
        case 'minutes': minutes += (pattern.multiplier || 1) * value; break;
      }
    }
  }

  if (!found) return null;
  return { days, hours, minutes, months, years };
}

// دالة معالجة المدة الزمنية المحسنة
function handleDurationImproved(duration: any, now: Date): Date {
  const targetDate = new Date(now);
  if (duration.years) targetDate.setFullYear(targetDate.getFullYear() + duration.years);
  if (duration.months) targetDate.setMonth(targetDate.getMonth() + duration.months);
  if (duration.days) targetDate.setDate(targetDate.getDate() + duration.days);
  if (duration.hours) targetDate.setHours(targetDate.getHours() + duration.hours);
  if (duration.minutes) targetDate.setMinutes(targetDate.getMinutes() + duration.minutes);
  return targetDate;
}

// ==================== دالة التحليل الرئيسية (محسنة) ====================

export function parseSmartDateTime(text: string, baseDate: Date = new Date()): ParseResult | null {
  if (!text.trim()) return null;
  const now = new Date(baseDate);
  const lowerText = text.toLowerCase();

  // 1. معالجة الكلمات السريعة (حالاً، الآن، بعد شوي)
  if (/(حالاً|الآن|الحين|بعد شوي|بعد شوية|بعد قليل|دقيقة|ثانية)/i.test(lowerText)) {
    // إذا كانت "دقيقة" أو "ثانية" فقط، نعتبر بعد دقيقة واحدة
    if (/^(دقيقة|ثانية)$/i.test(text.trim())) {
      return { dateTime: new Date(now.getTime() + 60000), confidence: 0.9, detectedLanguage: 'ar', matchedPattern: text };
    }
    // وإلا نعتبرها بعد دقيقة واحدة كافتراض
    return { dateTime: new Date(now.getTime() + 60000), confidence: 0.85, detectedLanguage: 'ar', matchedPattern: text };
  }

  // 2. معالجة المدد الزمنية (بعد X دقيقة/ساعة/يوم/شهر/سنة)
  const durationPattern = /(?:بعد|خلال|في)\s+(.+?)(?:\s*مقدما|\s*من الآن)?$/i;
  const durationMatch = text.match(durationPattern);
  if (durationMatch) {
    const duration = parseDurationFromTextImproved(durationMatch[1], 'ar');
    if (duration) {
      const dateTime = handleDurationImproved(duration, now);
      if (!isNaN(dateTime.getTime())) {
        return { dateTime, confidence: 0.94, detectedLanguage: 'ar', matchedPattern: durationMatch[0] };
      }
    }
  }

  // 3. معالجة التواريخ المطلقة (مثل 15 أبريل 2026، 15/4/2026)
  const absoluteDatePattern = /(\d{1,2})\s*(?:\/|-|\.)\s*(\d{1,2})\s*(?:\/|-|\.)\s*(\d{2,4})/;
  const absoluteMatch = text.match(absoluteDatePattern);
  if (absoluteMatch) {
    let day = parseInt(absoluteMatch[1]);
    let month = parseInt(absoluteMatch[2]) - 1;
    let year = parseInt(absoluteMatch[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return { dateTime: date, confidence: 0.98, detectedLanguage: 'ar', matchedPattern: absoluteMatch[0] };
    }
  }

  // 4. معالجة "غداً الساعة X" أو "غداً"
  if (/(غدا|غداً)/i.test(lowerText)) {
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(صباحا|مساء|ص|م|am|pm)?/i);
    let hour = 9, minute = 0;
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3]?.toLowerCase();
      if (period && (period.includes('مساء') || period === 'م' || period === 'pm')) {
        if (hour < 12) hour += 12;
      } else if (period && (period.includes('صباحا') || period === 'ص' || period === 'am')) {
        if (hour === 12) hour = 0;
      }
    }
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    date.setHours(hour, minute, 0, 0);
    return { dateTime: date, confidence: 0.96, detectedLanguage: 'ar', matchedPattern: 'غداً' };
  }

  // 5. معالجة "بعد غد"
  if (/بعد\s+غد/i.test(lowerText)) {
    const date = new Date(now);
    date.setDate(date.getDate() + 2);
    date.setHours(9, 0, 0, 0);
    return { dateTime: date, confidence: 0.96, detectedLanguage: 'ar', matchedPattern: 'بعد غد' };
  }

  // 6. معالجة أيام الأسبوع (الاثنين القادم، الجمعة الجاي)
  for (const [dayName, dayIndex] of Object.entries(arabicDayMap)) {
    const regex = new RegExp(`(?:يوم\\s+)?${dayName}\\s*(?:القادم|الجاي|المقبل)?`, 'i');
    if (regex.test(text)) {
      const currentDay = now.getDay();
      let daysToAdd = dayIndex - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      const date = new Date(now);
      date.setDate(date.getDate() + daysToAdd);
      date.setHours(9, 0, 0, 0);
      return { dateTime: date, confidence: 0.92, detectedLanguage: 'ar', matchedPattern: dayName };
    }
  }

  // 7. معالجة الوقت المطلق (الساعة 3 عصراً، 10:30 صباحاً)
  const timePattern = /(?:الساعة|في الساعة|على الساعة)?\s*(\d{1,2})(?::(\d{2}))?\s*(صباحا|مساء|ص|م|am|pm)?/i;
  const timeMatch = text.match(timePattern);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    let minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3]?.toLowerCase();
    if (period && (period.includes('مساء') || period === 'م' || period === 'pm')) {
      if (hour < 12) hour += 12;
    } else if (period && (period.includes('صباحا') || period === 'ص' || period === 'am')) {
      if (hour === 12) hour = 0;
    }
    const date = new Date(now);
    date.setHours(hour, minute, 0, 0);
    // إذا كان الوقت أقل من الآن، نعتبره غداً
    if (date.getTime() < now.getTime()) {
      date.setDate(date.getDate() + 1);
    }
    return { dateTime: date, confidence: 0.97, detectedLanguage: 'ar', matchedPattern: timeMatch[0] };
  }

  // 8. معالجة "اسبوع" أو "أسبوع" بدون بعد
  if (/(اسبوع|أسبوع)/i.test(lowerText)) {
    const date = new Date(now);
    date.setDate(date.getDate() + 7);
    return { dateTime: date, confidence: 0.88, detectedLanguage: 'ar', matchedPattern: 'اسبوع' };
  }

  // 9. معالجة "شهر" بدون بعد
  if (/شهر/i.test(lowerText)) {
    const date = new Date(now);
    date.setMonth(date.getMonth() + 1);
    return { dateTime: date, confidence: 0.88, detectedLanguage: 'ar', matchedPattern: 'شهر' };
  }

  // 10. معالجة "سنة" بدون بعد
  if (/سنة/i.test(lowerText)) {
    const date = new Date(now);
    date.setFullYear(date.getFullYear() + 1);
    return { dateTime: date, confidence: 0.88, detectedLanguage: 'ar', matchedPattern: 'سنة' };
  }

  // إذا لم يتم التعرف على أي نمط
  return null;
}

// تصدير الدوال النهائية
export function analyzeReminderInput(text: string): CleanResult | null {
  if (!text.trim()) return null;

  const parseResult = parseSmartDateTime(text);
  if (!parseResult) {
    return {
      parsedText: cleanReminderText(text, 'ar'),
      reminderTime: new Date().toISOString(),
      detectedLanguage: 'ar',
      confidence: 0.5,
      originalText: text
    };
  }

  const date = parseResult.dateTime;
  if (isNaN(date.getTime())) {
    console.warn('[date-parser] Invalid date parsed, falling back to current time');
    return {
      parsedText: cleanReminderText(text, 'ar'),
      reminderTime: new Date().toISOString(),
      detectedLanguage: 'ar',
      confidence: 0.5,
      originalText: text
    };
  }

  const cleaned = cleanReminderText(text, parseResult.detectedLanguage);
  return {
    parsedText: cleaned,
    reminderTime: date.toISOString(),
    detectedLanguage: parseResult.detectedLanguage,
    confidence: parseResult.confidence,
    originalText: text
  };
}

// formatDetectedTime و formatCountdown محسّنتان أيضاً (نفس السابق مع تحسينات أمان)
export function formatDetectedTime(isoString: string, lang: 'ar' | 'fr' | 'en' = 'ar'): string {
  if (!isoString || typeof isoString !== 'string') {
    return lang === 'ar' ? 'وقت غير محدد' : (lang === 'fr' ? 'Heure non définie' : 'Time not set');
  }
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return lang === 'ar' ? 'وقت غير محدد' : (lang === 'fr' ? 'Date invalide' : 'Invalid time');
  }
  // ... باقي الكود كما هو (لم يتغير)
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  // ... (أكمل بنفس المنطق السابق)
  let dayStr = '';
  if (diffDays === 0) dayStr = lang === 'ar' ? 'اليوم' : lang === 'fr' ? "aujourd'hui" : 'today';
  else if (diffDays === 1) dayStr = lang === 'ar' ? 'غداً' : lang === 'fr' ? 'demain' : 'tomorrow';
  else if (diffDays === 2) dayStr = lang === 'ar' ? 'بعد غد' : lang === 'fr' ? 'après-demain' : 'day after tomorrow';
  else if (diffDays < 7 && lang === 'ar') dayStr = arabicDays[date.getDay()];
  else dayStr = date.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? (lang === 'ar' ? 'مساءً' : lang === 'fr' ? 'soir' : 'PM') : (lang === 'ar' ? 'صباحاً' : lang === 'fr' ? 'matin' : 'AM');
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  const timeStr = minutes > 0 ? `${hours}:${minutes.toString().padStart(2, '0')} ${period}` : `${hours}:00 ${period}`;
  return `${dayStr}، ${timeStr}`;
}

export function formatCountdown(isoString: string, lang: 'ar' | 'fr' | 'en' = 'ar'): { text: string; isPast: boolean } {
  if (!isoString || typeof isoString !== 'string') return { text: lang === 'ar' ? 'وقت غير محدد' : 'Invalid time', isPast: false };
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return { text: lang === 'ar' ? 'وقت غير محدد' : 'Invalid time', isPast: false };
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);
  const diffMinutes = Math.floor(absDiffMs / 60000);
  const diffHours = Math.floor(absDiffMs / 3600000);
  const diffDays = Math.floor(absDiffMs / 86400000);
  let text = '';
  if (lang === 'ar') {
    if (isPast) {
      if (diffMinutes < 1) text = 'الآن';
      else if (diffMinutes < 60) text = `منذ ${diffMinutes} دقيقة`;
      else if (diffHours < 24) text = `منذ ${diffHours} ساعة`;
      else if (diffDays === 1) text = 'منذ يوم';
      else if (diffDays === 2) text = 'منذ يومين';
      else text = `منذ ${diffDays} يوم`;
    } else {
      if (diffMinutes < 1) text = 'أقل من دقيقة';
      else if (diffMinutes < 60) text = `متبقي ${diffMinutes} دقيقة`;
      else if (diffHours < 24) text = `متبقي ${diffHours} ساعة`;
      else if (diffDays === 0) text = 'اليوم';
      else if (diffDays === 1) text = 'غداً';
      else if (diffDays === 2) text = 'بعد غد';
      else text = `متبقي ${diffDays} يوم`;
    }
  } else if (lang === 'fr') {
    text = isPast ? `il y a ${diffMinutes} min` : `dans ${diffMinutes} min`;
  } else {
    text = isPast ? `${diffMinutes} min ago` : `in ${diffMinutes} min`;
  }
  return { text, isPast };
}
