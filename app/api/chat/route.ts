// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // ✅ استيراد من الملف المخصص
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
      } catch (dbError) {
        console.error('فشل جلب سجل المحادثة:', dbError);
      }
    }

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system',
        content: `أنت مساعد ذكي ومفيد اسمك "Smarty". أنت متخصص في مساعدة المستخدمين في إنشاء وإدارة التذكيرات والمواعيد. ردودك يجب أن تكون مختصرة ومفيدة باللغة العربية. تذكر دائمًا سياق المحادثة السابق مع المستخدم.`,
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

    const reply = completion.choices[0]?.message?.content || 'عذراً، لم أستطع معالجة طلبك.';

    // حفظ المحادثة
    if (userId !== 'anonymous') {
      try {
        const client = await clientPromise;
        const db = client.db('smartyDB');
        const conversations = db.collection('conversations');
        
        const now = new Date();
        await conversations.insertMany([
          {
            userId,
            role: 'user',
            content: prompt,
            timestamp: now,
          },
          {
            userId,
            role: 'assistant',
            content: reply,
            timestamp: new Date(now.getTime() + 1),
          },
        ]);
      } catch (dbError) {
        console.error('فشل حفظ المحادثة:', dbError);
      }
    }

    return NextResponse.json({ type: 'text', reply });
  } catch (error) {
    console.error('Groq API error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ type: 'text', reply: 'حدث خطأ في الاتصال بالمساعد.' }, { status: 500 });
  }
}
}
