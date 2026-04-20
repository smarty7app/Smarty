import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

// استخدم Gemini (مجاني لحد 1500 طلب/يوم)
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// تكوينات النماذج المختلفة
const MODEL_CONFIGS = {
  'gemma-2-2b': {
    name: 'Gemma 2 2B',
    model: 'gemini-1.5-flash',
    systemPrompt: (userName: string) => `أنت Smarty، مساعد ذكي يعمل بنموذج Gemma 2B (نسخة خفيفة وسريعة).
             شخصيتك: ودود، سريع الاستجابة، ومباشر. تتحدث العربية بطلاقة.
             المستخدم الحالي: ${userName || 'مستخدم'}.
             قدم إجابات مختصرة ومفيدة، وركز على السرعة والدقة.`,
    temperature: 0.7,
  },
  'llama-3.2-3b': {
    name: 'Llama 3.2 3B',
    model: 'gemini-1.5-flash',
    systemPrompt: (userName: string) => `أنت Smarty، مساعد ذكي يعمل بنموذج Llama 3.2 (نسخة متطورة ودقيقة).
             شخصيتك: ذكي، تحليلي، وشامل. تتحدث العربية بطلاقة وبأسلوب احترافي.
             تقدم إجابات مفصلة وشاملة، مع أمثلة عند الحاجة.
             المستخدم الحالي: ${userName || 'مستخدم'}.
             أنت خبير في جميع المجالات وتقدم إجابات دقيقة وعميقة.`,
    temperature: 0.8,
  },
  'phi-3.5-mini': {
    name: 'Phi-3.5 Mini',
    model: 'gemini-1.5-flash',
    systemPrompt: (userName: string) => `أنت Smarty، مساعد ذكي يعمل بنموذج Phi-3.5 (نسخة صغيرة وفعالة).
             شخصيتك: لطيف، بسيط، وسهل الفهم. تتحدث العربية ببساطة ووضوح.
             تقدم إجابات قصيرة ومباشرة، مناسبة للهواتف الأقل قدرة.
             المستخدم الحالي: ${userName || 'مستخدم'}.
             ركز على البساطة والوضوح في إجاباتك.`,
    temperature: 0.6,
  },
  'default': {
    name: 'Smarty Default',
    model: 'gemini-1.5-flash',
    systemPrompt: (userName: string) => `أنت Smarty، مساعد ذكي ومحادثة عامة، مدمج في تطبيق لإدارة التذكيرات والمواعيد.
             شخصيتك: ودود، لطيف، ومتعاون. تتحدث العربية بطلاقة وبأسلوب طبيعي وسلس.
             يمكنك الإجابة عن أي سؤال في أي مجال (المعرفة العامة، العلوم، الترفيه، النصائح، إلخ).
             بالإضافة إلى ذلك، أنت خبير في تنظيم الوقت وإدارة المهام، ويمكنك مساعدة المستخدم في إنشاء تذكيرات ومواعيد إذا طلب ذلك.
             المستخدم الحالي: ${userName || 'مستخدم'}.
             اجعل إجاباتك مفيدة ومباشرة، ولا تتردد في طرح أسئلة توضيحية إذا لزم الأمر.`,
    temperature: 0.7,
  }
};

// سجل الاستخدام اليومي للمستخدمين
const userDailyUsage = new Map<string, { count: number; date: string }>();

// دالة مساعدة للتحقق من الحد اليومي
function checkDailyLimit(userId: string): { allowed: boolean; remaining: number; limit: number } {
  const today = new Date().toISOString().split('T')[0];
  const userRecord = userDailyUsage.get(userId);
  const DAILY_LIMIT = 1500;
  
  if (!userRecord || userRecord.date !== today) {
    return { allowed: true, remaining: DAILY_LIMIT, limit: DAILY_LIMIT };
  }
  
  const remaining = Math.max(0, DAILY_LIMIT - userRecord.count);
  return { allowed: remaining > 0, remaining, limit: DAILY_LIMIT };
}

// دالة لتسجيل الاستخدام
function recordUsage(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const userRecord = userDailyUsage.get(userId);
  
  if (!userRecord || userRecord.date !== today) {
    userDailyUsage.set(userId, { count: 1, date: today });
  } else {
    userRecord.count++;
    userDailyUsage.set(userId, userRecord);
  }
}

export async function POST(req: Request) {
  try {
    const { prompt, userId, userEmail, userName, model: requestedModel } = await req.json();
    
    if (!prompt) {
      return new Response('Prompt is required', { status: 400 });
    }
    
    // تحديد المستخدم
    const finalUserId = userId || 'anonymous';
    const finalUserName = userName || 'مستخدم';
    
    // التحقق من الحد اليومي
    const { allowed, remaining, limit } = checkDailyLimit(finalUserId);
    if (!allowed) {
      return new Response(
        `تم تجاوز الحد اليومي للطلبات (${limit} طلب). يرجى المحاولة غداً.`,
        { status: 429 }
      );
    }
    
    // تحديد النموذج المستخدم
    const activeModelKey = requestedModel && MODEL_CONFIGS[requestedModel as keyof typeof MODEL_CONFIGS]
      ? requestedModel
      : 'default';
    
    const activeModel = MODEL_CONFIGS[activeModelKey as keyof typeof MODEL_CONFIGS];
    
    // تسجيل الاستخدام
    recordUsage(finalUserId);
    
    // إنشاء رسالة النظام المخصصة للنموذج
    const systemPrompt = activeModel.systemPrompt(finalUserName);
    
    // إضافة معلومات عن النموذج المستخدم في السياق
    const enhancedPrompt = `[النموذج المستخدم: ${activeModel.name}]
سؤال المستخدم: ${prompt}`;
    
    // استخدام Gemini مع تكوينات النموذج المحدد
    const result = streamText({
      model: google(activeModel.model),
      system: systemPrompt,
      prompt: enhancedPrompt,
      temperature: activeModel.temperature,
    });
    
    // الحصول على دفق النص
    const stream = result.toTextStreamResponse();
    
    // إضافة معلومات الاستخدام المتبقي في الـ headers
    stream.headers.set('X-Remaining-Requests', (remaining - 1).toString());
    stream.headers.set('X-Active-Model', activeModel.name);
    
    return stream;
    
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      'عذراً، حدث خطأ في الاتصال بالمساعد الذكي. يرجى المحاولة لاحقاً.',
      { status: 500 }
    );
  }
}

// دالة OPTIONS لدعم CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
