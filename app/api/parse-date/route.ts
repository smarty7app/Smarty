// app/api/parse-date/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
      console.warn('GEMINI_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'AI غير متوفر حالياً' },
        { status: 503 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
أنت مساعد ذكي متخصص في استخراج التواريخ والمواعيد من النصوص.

النص: "${text}"

المطلوب:
1. استخرج التاريخ والوقت بدقة عالية.
2. إذا كان الوقت قد فات اليوم، اجعله في نفس الوقت من الغد.
3. إذا كان النص يحتوي على تعبيرات مثل "بعد ساعة" أو "بعد يومين"، احسبها بدقة.

أجب فقط بكائن JSON بهذا التنسيق (بدون أي نص آخر):
{
  "reminderTime": "ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)",
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // استخراج JSON من الرد
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // التحقق من صحة التاريخ
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
