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
    system: `أنت Smarty، مساعد ذكي ومحادثة عامة، مدمج في تطبيق لإدارة التذكيرات والمواعيد.
             شخصيتك: ودود، لطيف، ومتعاون. تتحدث العربية بطلاقة وبأسلوب طبيعي وسلس.
             يمكنك الإجابة عن أي سؤال في أي مجال (المعرفة العامة، العلوم، الترفيه، النصائح، إلخ).
             بالإضافة إلى ذلك، أنت خبير في تنظيم الوقت وإدارة المهام، ويمكنك مساعدة المستخدم في إنشاء تذكيرات ومواعيد إذا طلب ذلك.
             المستخدم الحالي: ${userName || 'مستخدم'} (${userEmail || ''}).
             اجعل إجاباتك مفيدة ومباشرة، ولا تتردد في طرح أسئلة توضيحية إذا لزم الأمر.`,
    prompt: prompt,
  });

  return result.toDataStreamResponse();
}
