// lib/date-parser.ts

// ==================== الخرائط اللغوية ====================

// --- العربية ---
export const arabicDayMap: Record<string, number> = {
  'الأحد': 0, 'الاثنين': 1, 'الإثنين': 1, 'الثلاثاء': 2, 'الأربعاء': 3, 'الاربعاء': 3,
  'الخميس': 4, 'الجمعة': 5, 'السبت': 6
};

export const arabicMonthMap: Record<string, number> = {
  'يناير': 0, 'كانون الثاني': 0,
  'فبراير': 1, 'شباط': 1,
  'مارس': 2, 'آذار': 2,
  'أبريل': 3, 'نيسان': 3,
  'مايو': 4, 'أيار': 4,
  'يونيو': 5, 'حزيران': 5,
  'يوليو': 6, 'تموز': 6,
  'أغسطس': 7, 'آب': 7,
  'سبتمبر': 8, 'أيلول': 8,
  'أكتوبر': 9, 'تشرين الأول': 9,
  'نوفمبر': 10, 'تشرين الثاني': 10,
  'ديسمبر': 11, 'كانون الأول': 11
};

export const arabicNumeralMap: Record<string, number> = {
  'واحد': 1, 'واحدة': 1, 'اثنين': 2, 'اثنان': 2, 'اثنتين': 2, 'ثلاثة': 3, 'ثلاث': 3,
  'اربعة': 4, 'أربعة': 4, 'خمسة': 5, 'ستة': 6, 'سبعة': 7, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10,
  'نصف': 0.5, 'نص': 0.5, 'ربع': 0.25, 'ثلث': 0.33
};

// --- الفرنسية ---
export const frenchDayMap: Record<string, number> = {
  'dimanche': 0, 'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4, 'vendredi': 5, 'samedi': 6
};

export const frenchMonthMap: Record<string, number> = {
  'janvier': 0, 'février': 1, 'fevrier': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
  'juillet': 6, 'août': 7, 'aout': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11, 'decembre': 11
};

export const frenchNumeralMap: Record<string, number> = {
  'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
  'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
  'demi': 0.5, 'demie': 0.5, 'quart': 0.25, 'tiers': 0.33
};

// --- الإنجليزية ---
export const englishDayMap: Record<string, number> = {
  'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6
};

export const englishMonthMap: Record<string, number> = {
  'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
  'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
};

export const englishNumeralMap: Record<string, number> = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'half': 0.5, 'quarter': 0.25, 'third': 0.33
};

// ==================== أنواع النتائج ====================

export interface ParseResult {
  dateTime: Date;
  confidence: number;
  detectedLanguage: 'ar' | 'fr' | 'en';
  matchedPattern: string;
}

export interface CleanResult {
  parsedText: string;
  reminderTime: Date;
  detectedLanguage: 'ar' | 'fr' | 'en';
  confidence: number;
  originalText: string;
}

// ==================== دوال التنظيف المشتركة ====================

/**
 * تنظيف النص من جميع كلمات الوقت والكلمات الأمرية.
 */
export function cleanReminderText(text: string, language: 'ar' | 'fr' | 'en' = 'ar'): string {
  let cleaned = text;

  // كلمات الأمر حسب اللغة
  const commandWords: Record<'ar' | 'fr' | 'en', string[]> = {
    ar: ['ذكرني', 'تذكير', 'تذكر', 'ذكر', 'أذكر', 'نذكر', 'موعد', 'حدث', 'مهمة'],
    fr: ['rappelle', 'rappel', 'rappeler', 'tâche', 'rendez-vous', 'rdv'],
    en: ['remind', 'reminder', 'remember', 'task', 'appointment', 'event']
  };

  // كلمات الوقت العامة
  const timeKeywords = [
    'غدا', 'غداً', 'بعد غد', 'اليوم', 'صباحا', 'مساء', 'صباحاً', 'مساءً',
    'الساعة', 'على الساعة', 'في الساعة', 'دقيقة', 'دقائق', 'دقيقتين', 'ساعة', 'ساعتين', 'ساعات',
    'يوم', 'أيام', 'اسبوع', 'أسبوع', 'بعد', 'خلال', 'القادم', 'الجاي', 'المقبل',
    ...Object.keys(arabicDayMap), ...Object.keys(arabicMonthMap),
    'tomorrow', 'today', 'am', 'pm', 'o\'clock', 'hour', 'minute', 'hours', 'minutes', 'in', 'at', 'next',
    ...Object.keys(englishDayMap), ...Object.keys(englishMonthMap),
    'demain', 'aujourd\'hui', 'après-demain', 'heure', 'heures', 'minutes', 'dans', 'à', 'prochain',
    ...Object.keys(frenchDayMap), ...Object.keys(frenchMonthMap)
  ];

  // إزالة كلمات الأمر
  commandWords[language].forEach(word => {
    cleaned = cleaned.replace(new RegExp(word, 'gi'), '').trim();
  });

  // إزالة كلمات الوقت
  timeKeywords.forEach(keyword => {
    cleaned = cleaned.replace(new RegExp(keyword, 'gi'), '').trim();
  });

  // إزالة الأرقام (ربما بقايا وقت)
  cleaned = cleaned.replace(/\d+/g, '').trim();

  // تنظيف المسافات والفواصل الزائدة
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/^[\s,،]+|[\s,،]+$/g, '').trim();

  return cleaned || (language === 'ar' ? 'مهمة' : language === 'fr' ? 'Tâche' : 'Task');
}

// ==================== دالة التحليل الرئيسية ====================

/**
 * تحليل نص لاستخراج التاريخ والوقت مع دعم العربية والفرنسية والإنجليزية.
 */
export function parseSmartDateTime(text: string, baseDate: Date = new Date()): ParseResult | null {
  if (!text.trim()) return null;

  const now = new Date(baseDate);
  let bestMatch: ParseResult | null = null;

  // ========== الأنماط العربية ==========
  const arPatterns: Array<{ regex: RegExp; handler: (m: RegExpMatchArray) => Date; confidence: number }> = [
    // وقت رقمي مع دقائق: "11:30 صباحا"
    { regex: /(\d{1,2}):(\d{2})\s*(صباحا|مساء|ص|م)?/i, handler: (m) => { const d = new Date(now); let hour = parseInt(m[1]); const minute = parseInt(m[2]); const period = m[3]; if (period && (period.includes('مساء') || period === 'م')) { if (hour < 12) hour += 12; } else if (period && (period.includes('صباحا') || period === 'ص')) { if (hour === 12) hour = 0; } d.setHours(hour, minute, 0, 0); return d; }, confidence: 0.98 },
    // وقت رقمي فقط: "11 صباحا"
    { regex: /(\d{1,2})\s*(صباحا|مساء|ص|م)/i, handler: (m) => { const d = new Date(now); let hour = parseInt(m[1]); const period = m[2]; if (period && (period.includes('مساء') || period === 'م')) { if (hour < 12) hour += 12; } else if (period && (period.includes('صباحا') || period === 'ص')) { if (hour === 12) hour = 0; } d.setHours(hour, 0, 0, 0); return d; }, confidence: 0.95 },
    // يوم من أيام الأسبوع: "الثلاثاء القادم"
    { regex: /(?:يوم\s+)?(الأحد|الاثنين|الإثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|السبت)\s*(?:القادم|الجاي|المقبل)?/i, handler: (m) => { const d = new Date(now); const targetDay = arabicDayMap[m[1].toLowerCase()]; const currentDay = d.getDay(); let daysToAdd = targetDay - currentDay; if (daysToAdd <= 0) daysToAdd += 7; d.setDate(d.getDate() + daysToAdd); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.92 },
    // شهر ميلادي: "في مارس 2026"
    { regex: new RegExp(`(?:في\\s+)?(${Object.keys(arabicMonthMap).join('|')})\\s*(?:(?:عام|سنة)\\s*(\\d{4}))?\\s*(?:القادم|المقبل)?`, 'i'), handler: (m) => { const d = new Date(now); const month = arabicMonthMap[m[1].toLowerCase()]; const year = m[2] ? parseInt(m[2]) : d.getFullYear(); d.setFullYear(year, month, 1); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.88 },
    // غداً مع وقت اختياري: "غدا الساعة 3"
    { regex: /(غدا|غداً).*?(\d{1,2}(?::\d{2})?)?\s*(صباحا|مساء|ص|م)?/i, handler: (m) => { const d = new Date(now); d.setDate(d.getDate() + 1); const timeMatch = m[2]; const period = m[3]; if (timeMatch) { let hour = parseInt(timeMatch.split(':')[0]); const minute = timeMatch.includes(':') ? parseInt(timeMatch.split(':')[1]) : 0; if (period && (period.includes('مساء') || period === 'م')) { if (hour < 12) hour += 12; } else if (period && (period.includes('صباحا') || period === 'ص')) { if (hour === 12) hour = 0; } d.setHours(hour, minute, 0, 0); } else { d.setHours(9, 0, 0, 0); } return d; }, confidence: 0.96 },
    { regex: /(غدا|غداً)/i, handler: () => { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.95 },
    // بعد غد
    { regex: /بعد\s+غد/i, handler: () => { const d = new Date(now); d.setDate(d.getDate() + 2); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.95 },
    // فترات نسبية: "بعد 3 ساعات"
    { regex: /بعد\s+(\d+)\s+دقيقة/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 60000), confidence: 0.95 },
    { regex: /بعد\s+(\d+)\s+ساعة/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 3600000), confidence: 0.95 },
    { regex: /بعد\s+(\d+)\s+يوم/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 86400000), confidence: 0.95 },
    { regex: /بعد\s+(\d+)\s+أسبوع|اسبوع/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 7 * 86400000), confidence: 0.95 },
    // فترات نسبية بالكلمات: "بعد ساعتين"
    { regex: /بعد\s+(ساعة|ساعتين)/i, handler: (m) => new Date(now.getTime() + (m[1] === 'ساعتين' ? 2 : 1) * 3600000), confidence: 0.9 },
    { regex: /بعد\s+(دقيقة|دقيقتين)/i, handler: (m) => new Date(now.getTime() + (m[1] === 'دقيقتين' ? 2 : 1) * 60000), confidence: 0.9 },
  ];

  // ========== الأنماط الفرنسية ==========
  const frPatterns: Array<{ regex: RegExp; handler: (m: RegExpMatchArray) => Date; confidence: number }> = [
    { regex: /demain\s+à\s+(\d{1,2})[h:](\d{2})?/i, handler: (m) => { const d = new Date(now); d.setDate(d.getDate() + 1); const hour = parseInt(m[1]); const minute = m[2] ? parseInt(m[2]) : 0; d.setHours(hour, minute, 0, 0); return d; }, confidence: 0.95 },
    { regex: /demain/i, handler: () => { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.95 },
    { regex: /après-demain/i, handler: () => { const d = new Date(now); d.setDate(d.getDate() + 2); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.95 },
    { regex: /dans\s+(\d+)\s+minutes?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 60000), confidence: 0.95 },
    { regex: /dans\s+(\d+)\s+heures?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 3600000), confidence: 0.95 },
    { regex: /dans\s+(\d+)\s+jours?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 86400000), confidence: 0.95 },
    // يوم من أيام الأسبوع: "lundi prochain"
    { regex: new RegExp(`(${Object.keys(frenchDayMap).join('|')})\\s*(prochain|suivant)?`, 'i'), handler: (m) => { const d = new Date(now); const targetDay = frenchDayMap[m[1].toLowerCase()]; const currentDay = d.getDay(); let daysToAdd = targetDay - currentDay; if (daysToAdd <= 0) daysToAdd += 7; d.setDate(d.getDate() + daysToAdd); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.92 },
  ];

  // ========== الأنماط الإنجليزية ==========
  const enPatterns: Array<{ regex: RegExp; handler: (m: RegExpMatchArray) => Date; confidence: number }> = [
    { regex: /tomorrow\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i, handler: (m) => { const d = new Date(now); d.setDate(d.getDate() + 1); let hour = parseInt(m[1]); const minute = m[2] ? parseInt(m[2]) : 0; const period = m[3]; if (period && period.toLowerCase() === 'pm' && hour < 12) hour += 12; if (period && period.toLowerCase() === 'am' && hour === 12) hour = 0; d.setHours(hour, minute, 0, 0); return d; }, confidence: 0.95 },
    { regex: /tomorrow/i, handler: () => { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.95 },
    { regex: /in\s+(\d+)\s+minutes?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 60000), confidence: 0.95 },
    { regex: /in\s+(\d+)\s+hours?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 3600000), confidence: 0.95 },
    { regex: /in\s+(\d+)\s+days?/i, handler: (m) => new Date(now.getTime() + parseInt(m[1]) * 86400000), confidence: 0.95 },
    // يوم من أيام الأسبوع: "next monday"
    { regex: new RegExp(`next\\s+(${Object.keys(englishDayMap).join('|')})`, 'i'), handler: (m) => { const d = new Date(now); const targetDay = englishDayMap[m[1].toLowerCase()]; const currentDay = d.getDay(); let daysToAdd = targetDay - currentDay; if (daysToAdd <= 0) daysToAdd += 7; d.setDate(d.getDate() + daysToAdd); d.setHours(9, 0, 0, 0); return d; }, confidence: 0.92 },
  ];

  // فحص الأنماط بالترتيب: عربي -> فرنسي -> إنجليزي
  const allPatterns = [...arPatterns, ...frPatterns, ...enPatterns];
  
  for (const pattern of allPatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      const dateTime = pattern.handler(match);
      const detectedLang = pattern === arPatterns.find(p => p.regex === pattern.regex) ? 'ar' :
                           pattern === frPatterns.find(p => p.regex === pattern.regex) ? 'fr' : 'en';
      
      const candidate: ParseResult = {
        dateTime,
        confidence: pattern.confidence,
        detectedLanguage: detectedLang,
        matchedPattern: match[0]
      };

      if (!bestMatch || candidate.confidence > bestMatch.confidence) {
        bestMatch = candidate;
      }
      break; // نأخذ أول تطابق (حسب الأولوية)
    }
  }

  return bestMatch;
}

/**
 * دالة شاملة: تحلل النص وتعيد نتيجة نظيفة جاهزة للاستخدام.
 */
export function analyzeReminderInput(text: string): CleanResult | null {
  if (!text.trim()) return null;

  const parseResult = parseSmartDateTime(text);
  if (!parseResult) {
    // إذا لم نجد وقتاً، نعيد الوقت الحالي مع ثقة منخفضة
    return {
      parsedText: cleanReminderText(text, 'ar'),
      reminderTime: new Date(),
      detectedLanguage: 'ar',
      confidence: 0.5,
      originalText: text
    };
  }

  const cleaned = cleanReminderText(text, parseResult.detectedLanguage);
  
  return {
    parsedText: cleaned,
    reminderTime: parseResult.dateTime,
    detectedLanguage: parseResult.detectedLanguage,
    confidence: parseResult.confidence,
    originalText: text
  };
}

// ==================== دوال تنسيق الوقت للعرض ====================

/**
 * تنسيق وقت التذكير للعرض مع اسم اليوم والوقت.
 */
export function formatDetectedTime(isoString: string, lang: 'ar' | 'fr' | 'en' = 'ar'): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const frenchDays = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  let dayStr = '';
  if (diffDays === 0) dayStr = lang === 'ar' ? 'اليوم' : lang === 'fr' ? 'aujourd\'hui' : 'today';
  else if (diffDays === 1) dayStr = lang === 'ar' ? 'غداً' : lang === 'fr' ? 'demain' : 'tomorrow';
  else if (diffDays === 2) dayStr = lang === 'ar' ? 'بعد غد' : lang === 'fr' ? 'après-demain' : 'day after tomorrow';
  else if (diffDays < 7 && lang === 'ar') dayStr = arabicDays[date.getDay()];
  else if (diffDays < 7 && lang === 'fr') dayStr = frenchDays[date.getDay()];
  else if (diffDays < 7 && lang === 'en') dayStr = englishDays[date.getDay()];
  else dayStr = date.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? (lang === 'ar' ? 'مساءً' : lang === 'fr' ? 'soir' : 'PM') : (lang === 'ar' ? 'صباحاً' : lang === 'fr' ? 'matin' : 'AM');
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  
  const timeStr = minutes > 0 ? `${hours}:${minutes.toString().padStart(2, '0')} ${period}` : `${hours}:00 ${period}`;
  return `${dayStr}، ${timeStr}`;
}

/**
 * تنسيق الوقت المتبقي (العد التنازلي).
 */
export function formatCountdown(isoString: string, lang: 'ar' | 'fr' | 'en' = 'ar'): { text: string; isPast: boolean } {
  const date = new Date(isoString);
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
    // ... نسخة فرنسية مختصرة (يمكن إضافتها لاحقاً)
    text = isPast ? `il y a ${diffMinutes} min` : `dans ${diffMinutes} min`;
  } else {
    // الإنجليزية
    text = isPast ? `${diffMinutes} min ago` : `in ${diffMinutes} min`;
  }
  
  return { text, isPast };
}
