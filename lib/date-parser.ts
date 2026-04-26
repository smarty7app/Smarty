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
  'احدى عشر': 11, 'احد عشر': 11, 'اثنا عشر': 12, 'اثني عشر': 12,
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
  'onze': 11, 'douze': 12,
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
  'eleven': 11, 'twelve': 12,
  'half': 0.5, 'quarter': 0.25, 'third': 0.33
};

// ==================== أنواع النتائج ====================

export interface CleanResult {
  parsedText: string;
  reminderTime: string;
  detectedLanguage: 'ar' | 'fr' | 'en';
  confidence: number;
  originalText: string;
}

// ==================== دوال التحليل المحلي ====================

function parseLocalDateTime(text: string): Date | null {
  if (!text.trim()) return null;
  const now = new Date();
  const lower = text.toLowerCase();

  // 1. معالجة "بعد X دقيقة/ساعة/يوم"
  const durationMatch = text.match(/(?:بعد|خلال|في)\s+(.+)/i);
  if (durationMatch) {
    const durationText = durationMatch[1];
    let value = 1;
    let unit: 'minute' | 'hour' | 'day' | 'week' | null = null;
    
    const numMatch = durationText.match(/(\d+)/);
    if (numMatch) value = parseInt(numMatch[1]);
    else {
      for (const [word, num] of Object.entries(arabicNumeralMap)) {
        if (durationText.includes(word)) {
          value = num;
          break;
        }
      }
    }
    
    if (/(دقيقة|دقائق|دقيقتين)/.test(durationText)) unit = 'minute';
    else if (/(ساعة|ساعات|ساعتين)/.test(durationText)) unit = 'hour';
    else if (/(يوم|أيام|يومين)/.test(durationText)) unit = 'day';
    else if (/(اسبوع|أسبوع|أسبوعين)/.test(durationText)) unit = 'week';
    
    if (unit) {
      let targetDate = new Date(now);
      switch (unit) {
        case 'minute': targetDate.setMinutes(now.getMinutes() + value); break;
        case 'hour': targetDate.setHours(now.getHours() + value); break;
        case 'day': targetDate.setDate(now.getDate() + value); break;
        case 'week': targetDate.setDate(now.getDate() + value * 7); break;
      }
      if (!isNaN(targetDate.getTime()) && targetDate.getTime() > now.getTime()) {
        return targetDate;
      }
    }
  }

  // 2. تحديد إزاحة اليوم (غداً، بعد غد)
  let dayOffset = 0;
  if (/غدا|غداً|بكرة|بكرا/.test(lower)) {
    dayOffset = 1;
  }
  if (/بعد\s+غد|بعد بكرة|بعد بكرا/.test(lower)) {
    dayOffset = 2;
  }

  // 3. معالجة الوقت المطلق (الساعة 3 مساءً، 7:00 مساء، إلخ)
  let hour: number | null = null;
  let minute = 0;

  // نمط يلتقط "الساعة 7:00 مساءً"، "على 7 مساء"، "7:00 مساء"، إلخ
  const timeMatch = text.match(/(?:الساعة|الساعه|على|في)?\s*(\d{1,2})\s*(?::\s*(\d{2}))?\s*(صباحاً|صباحا|صباح|مساءً|مساءا|مساء|ص|م|am|pm)?/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3]?.toLowerCase();

    if (period) {
      if (period.includes('مساء') || period === 'م' || period === 'pm') {
        if (hour < 12) hour += 12;
      } else if (period.includes('صباح') || period === 'ص' || period === 'am') {
        if (hour === 12) hour = 0;
      }
    }
    // إذا لم تُذكر فترة، نتعامل مع الساعة كما هي (قد تكون بنظام 24 ساعة)
  }

  // 4. بناء التاريخ النهائي
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + dayOffset);

  if (hour !== null) {
    targetDate.setHours(hour, minute, 0, 0);
  } else {
    targetDate.setHours(9, 0, 0, 0); // الوقت الافتراضي 9 صباحاً إذا لم يُذكر وقت
  }

  // إذا كان الوقت الناتج قد مضى (ولم يُذكر غداً)، نزيد يوماً
  if (targetDate.getTime() <= now.getTime() && dayOffset === 0) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  if (!isNaN(targetDate.getTime())) {
    return targetDate;
  }

  // 5. معالجة "اسبوع" (إذا لم نجد أي شيء آخر)
  if (/(اسبوع|أسبوع)/.test(lower)) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + 7);
    return targetDate;
  }

  return null;
}

// ==================== دوال التنظيف ====================

export function cleanReminderText(text: string, language: 'ar' | 'fr' | 'en' = 'ar'): string {
  let cleaned = text;

  const commandWords: Record<'ar' | 'fr' | 'en', string[]> = {
    ar: ['ذكرني', 'تذكير', 'تذكر', 'ذكر', 'أذكر', 'نذكر', 'موعد', 'حدث', 'مهمة'],
    fr: ['rappelle', 'rappel', 'rappeler', 'tâche', 'rendez-vous', 'rdv'],
    en: ['remind', 'reminder', 'remember', 'task', 'appointment', 'event']
  };

  const timeKeywords = [
    'غدا', 'غداً', 'بعد غد', 'اليوم', 'صباحا', 'مساء', 'صباحاً', 'مساءً',
    'الساعة', 'على الساعة', 'في الساعة', 'دقيقة', 'دقائق', 'دقيقتين', 'ساعة', 'ساعتين', 'ساعات',
    'يوم', 'أيام', 'اسبوع', 'أسبوع', 'بعد', 'خلال', 'القادم', 'الجاي', 'المقبل',
    'tomorrow', 'today', 'am', 'pm', 'o\'clock', 'hour', 'minute', 'hours', 'minutes', 'in', 'at', 'next',
    'demain', 'aujourd\'hui', 'après-demain', 'heure', 'heures', 'minutes', 'dans', 'à', 'prochain'
  ];

  commandWords[language].forEach(word => {
    cleaned = cleaned.replace(new RegExp(word, 'gi'), '').trim();
  });

  timeKeywords.forEach(keyword => {
    cleaned = cleaned.replace(new RegExp(keyword, 'gi'), '').trim();
  });

  cleaned = cleaned.replace(/\d+/g, '').trim();
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/^[\s,،]+|[\s,،]+$/g, '').trim();

  return cleaned || (language === 'ar' ? 'مهمة' : language === 'fr' ? 'Tâche' : 'Task');
}

// ==================== دالة التحليل الرئيسية (متزامنة) ====================

export function analyzeReminderInput(text: string): CleanResult | null {
  if (!text.trim()) return null;

  const parsedDate = parseLocalDateTime(text);
  
  // دالة مساعدة لتنسيق الوقت محلياً (بدون تحويل إلى UTC)
  const formatLocalTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
  };

  if (parsedDate && parsedDate.getTime() > Date.now()) {
    return {
      parsedText: text,   // النص الكامل الذي قاله المستخدم
      reminderTime: formatLocalTime(parsedDate),   // وقت محلي صريح
      detectedLanguage: 'ar',
      confidence: 0.85,
      originalText: text,
    };
  }

  // القيمة الافتراضية: بعد ساعة
  const fallbackDate = new Date(Date.now() + 60 * 60 * 1000);
  return {
    parsedText: text,
    reminderTime: formatLocalTime(fallbackDate),
    detectedLanguage: 'ar',
    confidence: 0.3,
    originalText: text,
  };
}

export type SmartParsedResult = CleanResult;

// ==================== دوال التنسيق ====================

export function formatDetectedTime(isoString: string, lang: 'ar' | 'fr' | 'en' = 'ar'): string {
  if (!isoString) return lang === 'ar' ? 'وقت غير محدد' : 'Time not set';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return lang === 'ar' ? 'وقت غير محدد' : 'Invalid time';

  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let dayStr = '';
  if (diffDays === 0) dayStr = 'اليوم';
  else if (diffDays === 1) dayStr = 'غداً';
  else if (diffDays === 2) dayStr = 'بعد غد';
  else dayStr = date.toLocaleDateString('ar-EG', { weekday: 'long', month: 'long', day: 'numeric' });

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'مساءً' : 'صباحاً';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;

  const timeStr = minutes > 0 ? `${hours}:${minutes.toString().padStart(2, '0')} ${period}` : `${hours}:00 ${period}`;
  return `${dayStr}، ${timeStr}`;
}

export function formatCountdown(isoString: string, lang: 'ar' | 'fr' | 'en' = 'ar'): { text: string; isPast: boolean } {
  if (!isoString) return { text: lang === 'ar' ? 'وقت غير محدد' : 'Invalid time', isPast: false };
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

  return { text, isPast };
}
