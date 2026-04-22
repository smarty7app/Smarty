// lib/ai-date-parser.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

// تهيئة Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export interface AIParsedResult {
  success: boolean;
  reminderTime?: string;
  parsedText?: string;
  error?: string;
  confidence?: number;
}

/**
 * استخدام الذكاء الاصطناعي لتحليل النص واستخراج التاريخ والوقت
 */
export async function parseDateWithAI(text: string, language: string = 'ar'): Promise<AIParsedResult> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const prompt = `
أنت مساعد ذكي متخصص في استخراج التواريخ والمواعيد من النصوص العربية.

النص المدخل: "${text}"

المطلوب:
1. استخرج التاريخ والوقت من النص بدقة شديدة.
2. إذا كان النص لا يحتوي على وقت محدد، استخدم الوقت الحالي.
3. إذا كان النص لا يحتوي على تاريخ محدد، استخدم تاريخ اليوم (أو الغد إذا كان الوقت قد فات).

أجب فقط بكائن JSON بالصيغة التالية (بدون أي نص إضافي):
{
  "reminderTime": "ISO 8601 format YYYY-MM-DDTHH:mm:ss.sssZ",
  "parsedText": "${text}",
  "confidence": 0.95
}

مثال:
النص: "ذكرني بموعد الطبيب غدا الساعة 3 عصرا"
الإجابة:
{
  "reminderTime": "${new Date(Date.now() + 86400000).toISOString().split('T')[0]}T15:00:00.000Z",
  "parsedText": "موعد الطبيب",
  "confidence": 0.98
}

تأكد من أن الوقت دائماً في المستقبل.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // استخراج JSON من الرد
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      reminderTime: parsed.reminderTime,
      parsedText: parsed.parsedText || text,
      confidence: parsed.confidence || 0.9,
    };
  } catch (error) {
    console.error('AI date parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI parsing failed',
    };
  }
}

/**
 * التحليل المختلط: محلي أولاً، ثم AI إذا فشل
 */
export async function hybridDateParse(text: string, language: string = 'ar'): Promise<AIParsedResult> {
  // أولاً: حاول التحليل المحلي السريع
  const { analyzeReminderInput, formatDetectedTime } = await import('./date-parser');
  const localResult = analyzeReminderInput(text);
  
  if (localResult && localResult.confidence > 0.7) {
    // التحقق من صحة التاريخ (ليس في الماضي البعيد)
    const date = new Date(localResult.reminderTime);
    const now = new Date();
    const maxFuture = new Date();
    maxFuture.setFullYear(maxFuture.getFullYear() + 1);
    
    if (date > now && date < maxFuture) {
      return {
        success: true,
        reminderTime: localResult.reminderTime,
        parsedText: localResult.parsedText,
        confidence: localResult.confidence,
      };
    }
  }
  
  // ثانياً: استخدام الذكاء الاصطناعي إذا فشل المحلي
  return await parseDateWithAI(text, language);
}
