import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

// استخدم Gemini (مجاني لحد 1500 طلب/يوم)
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export async function POST(req: Request) {
  const { prompt, userId, userEmail, userName } = await req.json();

  const result = streamText({
    model: google('gemini-1.5-flash'),
    system: `أنت Smarty، مساعد ذكي متخصص في إدارة التذكيرات والمواعيد. 
             أنت تتحدث العربية بطلاقة، ودود ومفيد. إجاباتك مختصرة ومباشرة.
             المستخدم الحالي: ${userName || 'مستخدم'} (${userEmail || ''})`,
    prompt: prompt,
  });

  return result.toDataStreamResponse();
}
