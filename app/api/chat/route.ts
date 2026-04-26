import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import clientPromise from '@/lib/mongodb';
import { analyzeReminderInput } from '@/lib/date-parser';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const REMINDER_KEYWORDS = [
  'ذكرني', 'تذكير', 'تذكر', 'نبهني', 'موعد', 'حدث', 'مهمة',
  'أضف', 'سجل', 'دوّن', 'بكرة', 'غداً', 'اسبوع', 'ساعة', 'دقيقة',
  'فكرني', 'أذكرني', 'نبّهني', 'قبل', 'بعد',
  'remind', 'reminder', 'task', 'appointment'
];

// ✅ موجه محسّن يطلب النص كاملاً والوقت محلياً
const REMINDER_EXTRACTION_PROMPT = `أنت مساعد خبير في فهم النوايا من النصوص العربية. مهمتك: من النص الذي يقوله المستخدم، استخرج:
1. "text": النص الكامل الذي قاله المستخدم، دون أي تعديل أو حذف. حافظ على كل الكلمات كما هي، حتى لو كانت "ذكرني" أو "فكرني". لا تغير شيئاً.
2. "reminderTime": الوقت والتاريخ الذي قصده المستخدم، بصيغة YYYY-MM-DDTHH:mm:ss (مثلاً 2026-04-27T19:00:00). لا تضف حرف Z ولا ميلي ثانية. حلل عبارات مثل "غدا"، "بعد ساعة"، "الاثنين الجاي"، "قبل الساعة 7 مساء" بدقة.
3. "confidence": رقم بين 0 و 1.

أعد الرد حصراً بصيغة JSON التالية، ولا تضف أي شيء آخر:
{
  "isReminder": true,
  "text": "النص الكامل الذي قاله المستخدم",
  "reminderTime": "YYYY-MM-DDTHH:mm:ss",
  "confidence": 0.95
}`;

export async function POST(request: NextRequest) {
  try {
    const { prompt, userId } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return new NextResponse('النص غير صالح', { status: 400 });
    }

    const looksLikeReminder = REMINDER_KEYWORDS.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );

    if (looksLikeReminder) {
      // محاولة Groq
      try {
        const extractionCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: REMINDER_EXTRACTION_PROMPT },
            { role: 'user', content: prompt },
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        });

        const raw = extractionCompletion.choices[0]?.message?.content || '';
        const cleanJson = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

        try {
          const parsed = JSON.parse(cleanJson);
          if (
            parsed.isReminder === true &&
            typeof parsed.text === 'string' && parsed.text.trim().length > 0 &&
            typeof parsed.reminderTime === 'string' && parsed.reminderTime.trim().length > 0
          ) {
            let reminderTime = parsed.reminderTime.trim();
            // إزالة Z والميلي ثانية إن وُجدت
            reminderTime = reminderTime.replace(/\.\d{3}Z$/, '').replace(/Z$/, '');

            return NextResponse.json({
              type: 'reminder_suggestion',
              suggestion: {
                text: parsed.text.trim(),
                reminderTime,
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
              },
            });
          }
        } catch (e) {
          console.error('فشل تحليل JSON من Groq:', e);
        }
      } catch (e) {
        console.error('فشل استخراج التذكير عبر Groq:', e);
      }

      // خطة بديلة: المحلل المحلي
      const localResult = analyzeReminderInput(prompt);
      if (localResult && localResult.confidence >= 0.6) {
        return NextResponse.json({
          type: 'reminder_suggestion',
          suggestion: {
            text: localResult.originalText || localResult.parsedText,
            reminderTime: localResult.reminderTime.replace(/\.\d{3}Z$/, '').replace(/Z$/, ''),
            confidence: localResult.confidence,
          },
        });
      }
    }

    // الدردشة العادية
    let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    if (userId) {
      try {
        const client = await clientPromise;
        const db = client.db('smartyDB');
        const history = await db.collection('conversations')
          .find({ userId })
          .sort({ timestamp: -1 })
          .limit(10)
          .toArray();
        conversationHistory = history.reverse().map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
      } catch (e) { console.error('فشل جلب المحادثة:', e); }
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

    if (userId) {
      try {
        const client = await clientPromise;
        const db = client.db('smartyDB');
        const now = new Date();
        await db.collection('conversations').insertMany([
          { userId, role: 'user', content: prompt, timestamp: now },
          { userId, role: 'assistant', content: reply, timestamp: new Date(now.getTime() + 1) },
        ]);
      } catch (e) { console.error('فشل حفظ المحادثة:', e); }
    }

    return NextResponse.json({ type: 'text', reply });
  } catch (error) {
    console.error('Chat API error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ type: 'text', reply: 'حدث خطأ في الاتصال بالمساعد.' }, { status: 500 });
  }
}
