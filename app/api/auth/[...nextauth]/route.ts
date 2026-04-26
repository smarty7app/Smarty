import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import clientPromise from '@/lib/mongodb';
import { analyzeReminderInput } from '@/lib/date-parser';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

    if (looksLikeReminder) {
      // ✅ استخدم التحليل المحلي للتاريخ (دقيق ولا يفشل أبداً)
      const localResult = analyzeReminderInput(prompt);
      
      if (localResult && localResult.reminderTime) {
        // ✅ استخدم Groq فقط لاستخراج النص (مع الاحتفاظ بالكلمات الأصلية)
        let reminderText = prompt; // النص الكامل كخطة بديلة
        try {
          const extractionCompletion = await groq.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: 'أنت مساعد متخصص في استخراج نص التذكير. أعد فقط النص الأساسي للمهمة بدون أي كلمات إضافية. مثال: "ذكرني اشتري خبز" ← "اشتري خبز". لا تغير المعنى. أعد النص المستخرج فقط.'
              },
              { role: 'user', content: prompt },
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            max_tokens: 200,
          });
          const extractedText = extractionCompletion.choices[0]?.message?.content?.trim();
          if (extractedText && extractedText.length > 0) {
            reminderText = extractedText;
          }
        } catch (groqError) {
          console.error('فشل استخراج النص عبر Groq، استخدام النص الأصلي:', groqError);
        }

        return NextResponse.json({
          type: 'reminder_suggestion',
          suggestion: {
            text: reminderText,
            reminderTime: localResult.reminderTime,
            confidence: localResult.confidence || 0.85,
          },
        });
      }
      // إذا فشل التحليل المحلي، نستمر إلى الدردشة العادية
    }

    // 2. الدردشة العادية (مع الذاكرة)
    let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    if (userId) {
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
    if (userId) {
      try {
        const client = await clientPromise;
        const db = client.db('smartyDB');
        const conversations = db.collection('conversations');
        const now = new Date();
        await conversations.insertMany([
          { userId, role: 'user', content: prompt, timestamp: now },
          { userId, role: 'assistant', content: reply, timestamp: new Date(now.getTime() + 1) },
        ]);
      } catch (dbError) {
        console.error('فشل حفظ المحادثة:', dbError);
      }
    }

    return NextResponse.json({ type: 'text', reply });
  } catch (error) {
    console.error('Chat API error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ type: 'text', reply: 'حدث خطأ في الاتصال بالمساعد.' }, { status: 500 });
  }
}
