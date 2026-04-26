import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import clientPromise from '@/lib/mongodb';
import { analyzeReminderInput } from '@/lib/date-parser';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// كلمات مفتاحية للكشف الأولي عن نية التذكير
const REMINDER_KEYWORDS = [
  'ذكرني', 'تذكير', 'تذكر', 'نبهني', 'موعد', 'حدث', 'مهمة',
  'أضف', 'سجل', 'دوّن', 'بكرة', 'غداً', 'اسبوع', 'ساعة', 'دقيقة',
  'فكرني', 'أذكرني', 'نبّهني',
  'remind', 'reminder', 'task', 'appointment'
];

export async function POST(request: NextRequest) {
  try {
    const { prompt, userId } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return new NextResponse('النص غير صالح', { status: 400 });
    }

    // 1. فحص أولي: هل النص يبدو كطلب تذكير؟
    const looksLikeReminder = REMINDER_KEYWORDS.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );

    // 2. إذا كان تذكيراً، نستخدم التحليل المحلي (سريع ولا يفشل أبداً)
    if (looksLikeReminder) {
      const localResult = analyzeReminderInput(prompt);
      if (localResult && localResult.confidence >= 0.6) {
        return NextResponse.json({
          type: 'reminder_suggestion',
          suggestion: {
            text: localResult.parsedText || localResult.originalText,
            reminderTime: localResult.reminderTime,
            confidence: localResult.confidence,
          },
        });
      }
      // إذا فشل التحليل المحلي، نستمر إلى الدردشة العادية
    }

    // 3. الدردشة العادية (محاولة Groq أولاً، مع خطة بديلة)
    let reply = 'أهلاً! كيف يمكنني مساعدتك اليوم؟';

    try {
      // جلب سجل المحادثة من MongoDB
      let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
      if (userId && userId !== 'anonymous') {
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

      // محاولة استدعاء Groq
      try {
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

        const groqReply = completion.choices[0]?.message?.content;
        if (groqReply && groqReply.trim()) {
          reply = groqReply;
        }
      } catch (groqError) {
        console.error('فشل استدعاء Groq، استخدام الرد الاحتياطي:', groqError);
        // نستخدم الرد الاحتياطي المحدد مسبقاً
      }

      // حفظ المحادثة (بصمت، دون التأثير على الرد)
      if (userId && userId !== 'anonymous') {
        try {
          const client = await clientPromise;
          const db = client.db('smartyDB');
          const conversations = db.collection('conversations');
          
          const now = new Date();
          await conversations.insertMany([
            { userId, role: 'user', content: prompt, timestamp: now },
            { userId, role: 'assistant', content: reply, timestamp: new Date(now.getTime() + 1) },
          ]).catch(e => console.error('فشل حفظ المحادثة بصمت:', e));
        } catch (dbError) {
          console.error('فشل حفظ المحادثة:', dbError);
        }
      }
    } catch (error) {
      console.error('خطأ في معالجة الدردشة:', error);
      // نستخدم الرد الاحتياطي
    }

    return NextResponse.json({ type: 'text', reply });
  } catch (error) {
    console.error('Chat API error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ type: 'text', reply: 'حدث خطأ في الاتصال بالمساعد.' }, { status: 500 });
  }
            }
