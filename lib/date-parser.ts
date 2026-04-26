// lib/date-parser.ts

// ==================== الخرائط اللغوية ====================

// --- العربية ---
export const arabicDayMap: Record<string, number> = {
  'الأحد': 0, 'الاحد': 0, 'الاثنين': 1, 'الإثنين': 1, 'الثلاثاء': 2, 'الاربعاء': 3, 'الأربعاء': 3,
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
  parsedText: string;   // النص الكامل الذي قاله المستخدم (بدون تغيير)
  reminderTime: string;
  detectedLanguage: 'ar' | 'fr' | 'en';
  confidence: number;
  originalText: string;
}

// ==================== دوال التحليل المحلي ====================

function parseLocalDateTime(text: string): Date | null {
  if (!text.trim()) return null;
  const now = new Date();
  const lower = text.toLowerCase().trim();

  // استبدال الرموز العربية-الهندية
  const normalized = lower.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));

  // 1. معالجة "بعد X دقيقة/ساعة/يوم"
  const durationMatch = normalized.match(/(?:بعد|خلال|في|بعدي|بعدين)\s+(.+)/i);
  if (durationMatch) {
    const durationText = durationMatch[1];
    let value = 1;
    let unit: 'minute' | 'hour' | 'day' | 'week' | null = null;

    const numMatch = durationText.match(/(\d+)/);
    if (numMatch) value = parseInt(numMatch[1]);
    else {
      for (const [word, num] of Object.entries(arabicNumeralMap)) {
        if (durationText.includes(word)) { value = num; break; }
      }
    }

    if (/(دقيقة|دقائق|دقيقه|دقايق)/.test(durationText)) unit = 'minute';
    else if (/(ساعة|ساعه|ساعات|ساعتين|سوايع)/.test(durationText)) unit = 'hour';
    else if (/(يوم|أيام|ايام|يومين)/.test(durationText)) unit = 'day';
    else if (/(اسبوع|أسبوع|اسابيع|أسابيع)/.test(durationText)) unit = 'week';

    if (unit) {
      const targetDate = new Date(now);
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

  // 2. أيام الأسبوع
  for (const [name, targetDay] of Object.entries(arabicDayMap)) {
    if (normalized.includes(name)) {
      const currentDay = now.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7; // الأسبوع القادم
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + diff);
      targetDate.setHours(9, 0, 0, 0);
      if (normalized.includes('الجاي') || normalized.includes('القادم') || normalized.includes('المقبل')) {
        diff += 7;
        targetDate.setDate(now.getDate() + diff);
      }
      return targetDate;
    }
  }

  // 3. غداً / بعد غد / بكرة
  let dayOffset = 0;
  if (/غدا|غداً|بكرة|بكرا/.test(normalized)) {
    dayOffset = 1;
    if (/بعد غد|بعد بكرة|بعد بكرا/.test(normalized)) dayOffset = 2;
  } else if (/بعد غد|بعد بكرة|بعد بكرا/.test(normalized)) {
    dayOffset = 2;
  }

  // 4. استخراج الوقت
  let hour: number | null = null;
  let minute = 0;

  // أنماط الوقت المختلفة
  const timePatterns = [
    /(?:الساعة|الساعه|على|في|قبل|بعد)?\s*(\d{1,2})\s*(?::\s*(\d{2}))?\s*(صباحاً|صباحا|صباح|مساءً|مساءا|مساء|ص|م|am|pm)?/i,
    /(?:الظهر|الضهر)/i,   // 12:00
    /(?:العصر|العصر)/i,   // 15:00
    /(?:المغرب|العشية|العشيه)/i, // 18:00
    /(?:العشاء|الليل)/i,  // 20:00
    /(?:الصباح|الصبح)/i,  // 06:00
  ];

  const timeMatch = normalized.match(timePatterns[0]);
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
  } else if (timePatterns[1].test(normalized)) { hour = 12; minute = 0; }
  else if (timePatterns[2].test(normalized)) { hour = 15; minute = 0; }
  else if (timePatterns[3].test(normalized)) { hour = 18; minute = 0; }
  else if (timePatterns[4].test(normalized)) { hour = 20; minute = 0; }
  else if (timePatterns[5].test(normalized)) { hour = 6; minute = 0; }

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + dayOffset);

  if (hour !== null) {
    targetDate.setHours(hour, minute, 0, 0);
  } else {
    targetDate.setHours(9, 0, 0, 0);
  }

  if (targetDate.getTime() <= now.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  if (!isNaN(targetDate.getTime())) {
    return targetDate;
  }

  return null;
}

// ==================== دوال التنظيف ====================

// ✅ دالة تنظيف بسيطة تحذف فقط الفراغات الزائدة ولا تمس الكلمات
export function cleanReminderText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// ==================== دالة التحليل الرئيسية ====================

export function analyzeReminderInput(text: string): CleanResult | null {
  if (!text.trim()) return null;

  const parsedDate = parseLocalDateTime(text);

  if (parsedDate && parsedDate.getTime() > Date.now()) {
    return {
      parsedText: text,                // النص الأصلي الكامل
      reminderTime: parsedDate.toISOString(),
      detectedLanguage: 'ar',
      confidence: 0.85,
      originalText: text,
    };
  }

  // القيمة الافتراضية: بعد ساعة
  const fallbackDate = new Date(Date.now() + 60 * 60 * 1000);
  return {
    parsedText: text,
    reminderTime: fallbackDate.toISOString(),
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
