import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'أنت مساعد ذكي ومفيد اسمك "Smarty". مهمتك هي مساعدة المستخدمين بالإجابة على أسئلتهم بإختصار شديد. ردودك يجب أن تكون مختصرة ومفيدة باللغة العربية.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content || 'عذراً، لم أستطع معالجة طلبك.';
    return new NextResponse(reply);
  } catch (error) {
    console.error('Groq API error:', error);
    return new NextResponse('حدث خطأ في الاتصال بالمساعد.', { status: 500 });
  }
}
