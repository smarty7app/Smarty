import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import clientPromise from '@/lib/mongodb';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { prompt, userId } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return new NextResponse('النص غير صالح', { status: 400 });
    }

    // ✅ جلب سجل المحادثة من MongoDB
    let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    if (userId) {
      try {
        const client = await clientPromise;
        const db = client.db('smartyDB');
        const conversations = db.collection('conversations');
        
        // جلب آخر 10 رسائل مرتبة تصاعدياً حسب الزمن
        const history = await conversations
          .find({ userId })
          .sort({ timestamp: -1 })
          .limit(10)
          .toArray();
        
        // عكس الترتيب ليكون الأقدم فالأحدث (كما يتوقع Groq)
        conversationHistory = history.reverse().map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
      } catch (dbError) {
        console.error('فشل جلب سجل المحادثة:', dbError);
        // نستمر بدون تاريخ إذا فشل الاتصال
      }
    }

    // بناء مصفوفة messages كاملة: system prompt + history + السؤال الجديد
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system',
        content: `أنت مساعد ذكي ومفيد اسمك "Smarty". أنت متخصص في مساعدة المستخدمين في إنشاء وإدارة التذكيرات والمواعيد. ردودك يجب أن تكون مختصرة ومفيدة باللغة العربية. تذكر دائمًا سياق المحادثة السابق مع المستخدم.`,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: prompt,
      },
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content || 'عذراً، لم أستطع معالجة طلبك.';

    // ✅ حفظ سؤال المستخدم والرد في قاعدة البيانات
    if (userId) {
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
            timestamp: new Date(now.getTime() + 1), // فارق بسيط للترتيب
          },
        ]);
      } catch (dbError) {
        console.error('فشل حفظ المحادثة:', dbError);
      }
    }

    return new NextResponse(reply, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('Groq API error:', error instanceof Error ? error.message : error);
    return new NextResponse('حدث خطأ في الاتصال بالمساعد.', { status: 500 });
  }
}
