// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { analyzeReminderInput } from '@/lib/date-parser';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string') {
      return new NextResponse('النص غير صالح', { status: 400 });
    }

    // 1. جلب userId من الجلسة (آمن)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || 'anonymous';

    // 2. اقتراح تذكير محلياً إذا أمكن
    const reminderResult = analyzeReminderInput(prompt);
    if (reminderResult && reminderResult.confidence >= 0.7) {
      return NextResponse.json({
        type: 'reminder_suggestion',
        suggestion: {
          text: reminderResult.parsedText || reminderResult.originalText,
          reminderTime: reminderResult.reminderTime,
          confidence: reminderResult.confidence,
        },
      });
    }

    // 3. بخلاف ذلك، نستخدم Groq للرد العادي (مع الذاكرة)
    let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    if (userId !== 'anonymous') {
      // ... كود جلب السجل كما سبق
    }

    const messages = [
      { role: 'system', content: '...' },
      ...conversationHistory,
      { role: 'user', content: prompt },
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content || 'عذراً...';

    // حفظ المحادثة
    // ...

    return NextResponse.json({ type: 'text', reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ type: 'text', reply: 'حدث خطأ في الاتصال.' }, { status: 500 });
  }
}
