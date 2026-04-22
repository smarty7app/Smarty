// app/api/parse-date/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    const { text, language } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'النص مطلوب' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'AI غير متوفر حالياً' },
        { status: 503 }
      );
    }

    // استخدام الـ SDK الجديد
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = 'gemini-1.5-flash'; // أو gemini-1.5-pro أو gemini-1.0-pro

    const prompt = `
أنت مساعد ذكي متخصص في استخراج التواريخ والمواعيد من النصوص العربية.

النص: "${text}"

المطلوب:
1. استخرج التاريخ والوقت بدقة عالية.
2. إذا كان الوقت قد فات اليوم، اجعله في نفس الوقت من الغد.
3. أجب فقط بكائن JSON بهذا التنسيق:

{
  "reminderTime": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "parsedText": "النص بعد إزالة كلمات الأمر",
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

    const result = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    const responseText = result.text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const date = new Date(parsed.reminderTime);

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date from AI');
    }

    return NextResponse.json({
      success: true,
      reminderTime: parsed.reminderTime,
      parsedText: parsed.parsedText || text,
      confidence: parsed.confidence || 0.9,
    });
  } catch (error) {
    console.error('Parse date API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'فشل تحليل النص' },
      { status: 422 }
    );
  }
}