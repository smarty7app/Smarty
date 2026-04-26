// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ✅ موجه خاص للذكاء الاصطناعي لاستخراج التذكير بصيغة JSON
const REMINDER_EXTRACTION_PROMPT = `أنت مساعد ذكي متخصص في استخراج التذكيرات من النصوص العربية. حلل النص المعطى واستخرج المعلومات التالية بدقة:
1. النص المنقى: أزل كلمات الأمر مثل "ذكرني"، "تذكير"، "أضف"، واحتفظ بجوهر المهمة.
2. الوقت والتاريخ: استخرج أي ذكر للوقت أو التاريخ (ساعة، يوم، تاريخ نسبي مثل "غداً"، "بعد ساعة"، إلخ) وحوّله إلى صيغة ISO 8601 (مثال: 2026-04-27T08:00:00.000Z). إذا لم يذكر الوقت، افترض 9 صباحاً. إذا لم يذكر التاريخ، افترض أنه يقصد "غداً" أو الوقت القادم المناسب.

أعد الرد حصراً بصيغة JSON التالية، ولا تضف أي كلام آخر:
{
  "isReminder": true,
  "text": "النص المنقى هنا",
  "reminderTime": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "confidence": 0.95
}

إذا كان النص لا يمثل طلب تذكير (مثل سؤال عام أو محادثة)، أعد فقط:
{
  "isReminder": false
}`;

// كلمات مفتاحية سريعة للكشف الأولي عن نية التذكير
const REMINDER_KEYWORDS = [
  'ذكرني', 'تذكير', 'تذكر', 'نبهني', 'موعد', 'حدث', 'مهمة',
  'أضف', 'سجل', 'دوّن', 'بكرة', 'غداً', 'اسبوع', 'ساعة', 'دقيقة',
  'remind', 'reminder', 'task', 'appointment'
];

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return new NextResponse('النص غير صالح', { status: 400 });
    }

    // ✅ استخراج userId من الجلسة (أمان)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || 'anonymous';

    // ✅ فحص أولي سريع: هل النص يبدو كطلب تذكير؟
    const looksLikeReminder = REMINDER_KEYWORDS.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );

    if (looksLikeReminder) {
      try {
        // ✅ إرسال النص إلى Groq مع موجه استخراج التذكير
        const extractionCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: REMINDER_EXTRACTION_PROMPT },
            { role: 'user', content: prompt },
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 500,
          response_format: { type: 'json_object' }, // إجبار Groq على إخراج JSON
        });

        const extractionReply =
          extractionCompletion.choices[0]?.message?.content || '{"isReminder":false}';

        // ✅ تحليل الرد JSON
        const parsed = JSON.parse(extractionReply);

        if (parsed.isReminder && parsed.text && parsed.reminderTime) {
          // ✅ إعادة اقتراح تذكير إلى الواجهة
          return NextResponse.json({
            type: 'reminder_suggestion',
            suggestion: {
              text: parsed.text,
              reminderTime: parsed.reminderTime,
              confidence: parsed.confidence || 0.9,
            },
          });
        }
        // إذا لم يتعرف Groq على تذكير واضح، نستمر إلى الدردشة العادية
      } catch (extractionError) {
        console.error('فشل استخراج التذكير عبر Groq:', extractionError);
        // نتابع كدردشة عادية في حالة الفشل
      }
    }

    // ✅ الدردشة العادية (مع الذاكرة) إذا لم يكن تذكيراً
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

    const reply =
      completion.choices[0]?.message?.content || 'عذراً، لم أستطع معالجة طلبك.';

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
    return NextResponse.json(
      { type: 'text', reply: 'حدث خطأ في الاتصال بالمساعد.' },
      { status: 500 }
    );
  }
}
