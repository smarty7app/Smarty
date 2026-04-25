// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { analyzeReminderInput } from '@/lib/date-parser'; // تأكد من المسار

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

    // 2. محاولة تحليل التذكير محلياً
    const reminderResult = analyzeReminderInput(prompt);
    if (reminderResult && reminderResult.confidence >= 0.7) {
      // اقتراح تذكير – لا نحفظ شيء الآن
      return NextResponse.json({
        type: 'reminder_suggestion',
        suggestion: {
          text: reminderResult.parsedText || reminderResult.originalText,
          reminderTime: reminderResult.reminderTime,
          confidence: reminderResult.confidence,
        },
      });
    }

    // 3. إذا لم يكن تذكيراً، نكمل المحادثة مع Groq والذاكرة
    let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    if (userId !== 'anonymous') {
      try {
        const client = await clientPromise;
        const db = client.db('smartyDB');
        const conversations = db.collection('conversations');
        const history = await conversations
          .find({ userId })
          .sort({ timestamp: -1 })
          .limit(10)
          .toArray();
        conversationHistory = history.reverse().map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
      } catch (e) {
        console.error('فشل جلب سجل المحادثة:', e);
      }
    }

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system',
        content: 'أنت مساعد ذكي ومفيد اسمك "Smarty"...',
      },
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
    if (userId !== 'anonymous') {
      try {
        const client = await clientPromise;
        const db = client.db('smartyDB');
        const now = new Date();
        await db.collection('conversations').insertMany([
          { userId, role: 'user', content: prompt, timestamp: now },
          { userId, role: 'assistant', content: reply, timestamp: new Date(now.getTime() + 1) },
        ]);
      } catch (e) {
        console.error('فشل حفظ المحادثة:', e);
      }
    }

    return NextResponse.json({ type: 'text', reply });
  } catch (error) {
    console.error('Groq API error:', error);
    return new NextResponse('حدث خطأ...', { status: 500 });
  }
}
