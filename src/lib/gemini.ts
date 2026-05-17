// src/lib/gemini.ts
import { generateImageWithTogether } from "./together";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export interface Message {
  role: 'user' | 'model';
  text: string;
  status?: 'thinking' | 'generating' | 'done';
  image?: {
    data: string;
    mimeType: string;
    url?: string;
  };
  file?: {           // دعم الملفات المرفوعة
    data: string;
    mimeType: string;
    name: string;
  };
}

// التحقق مما إذا كان الطلب يتطلب صورة
function isImageRequest(message: string): boolean {
  return /صورة|صمم|ارسم|أنشئ|انشئ|لوجو|شعار|خلفية|بوستر|تصميم|image|generate|draw|logo|poster|design|banner/i.test(message);
}

/**
 * دالة بث النصوص المعتمدة على الـ Fetch API لتجنب مشاكل الـ SDK في المتصفح
 */
async function* _sendTextMessageStream(history: Message[], message: string, image?: { data: string; mimeType: string }) {
  if (!GEMINI_API_KEY) {
    yield { text: "⚠️ خطأ: VITE_GEMINI_API_KEY غير معرف في السيرفر." };
    return;
  }

  yield { status: 'thinking' };

  // بناء الهيكل المتوافق مع بروتوكول Gemini
  const contents = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [
      { text: m.text },
      ...(m.image ? [{ inlineData: { data: m.image.data, mimeType: m.image.mimeType } }] : [])
    ]
  }));

  const currentParts: any[] = [{ text: message }];
  if (image) {
    currentParts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });
  }
  contents.push({ role: 'user', parts: currentParts });

  // استخدام رابط الـ Server-Sent Events (SSE) للبث من جوجل مباشرة
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: "أنت Smarty AI، مساعد ذكي ومحترف في التسويق وكتابة المحتوى وتحليل السوق. أجب باللغة العربية بشكل أساسي. كن مفيداً ومختصراً ومهنياً." }]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    if (!reader) return;

    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // معالجة النصوص القادمة كقطع من الجيجسون (JSON Stream)
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // الاحتفاظ بالسطر غير المكتمل

      for (const line of lines) {
        const cleanedLine = line.trim();
        if (!cleanedLine || cleanedLine === "[" || cleanedLine === "]") continue;
        
        // تنظيف الفواصل بين كتل البث
        const jsonStr = cleanedLine.replace(/^,/, "").trim();
        try {
          const parsed = JSON.parse(jsonStr);
          const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textChunk) {
            yield { text: textChunk };
          }
        } catch (e) {
          // تجاوز الأخطاء الطفيفة أثناء معالجة النصوص المجزأة
        }
      }
    }
  } catch (error) {
    console.error("Fetch Stream Error:", error);
    yield { text: "⚠️ عذراً، حدث خطأ أثناء الاتصال بـ Gemini." };
  }
}

/**
 * الدالة الرئيسية التي يستدعيها ملف App.tsx مع دعم الـ Generator (yield)
 * @param history سجل المحادثة السابق
 * @param message نص الرسالة الجديدة
 * @param image صورة مرفوعة (اختياري)
 * @param file ملف مرفوع (اختياري، لا تستخدمه Gemini حالياً)
 */
export async function* sendMessageStream(
  history: Message[],
  message: string,
  image?: { data: string; mimeType: string },
  file?: { data: string; mimeType: string; name: string }  // إضافة دعم الملفات
) {
  const isRequestingImage = isImageRequest(message);
  
  // إذا طلب المستخدم صورة (ولم يرفع صورة مسبقاً للتحليل)، توجه إلى Together AI
  if (isRequestingImage && !image) {
    yield { status: 'generating' };
    try {
      const generatedImage = await generateImageWithTogether(message);
      yield {
        text: "✅ تم إنشاء الصورة بنجاح.",
        image: generatedImage,
        status: 'done'
      };
      return;
    } catch (error) {
      console.error("Together AI error:", error);
      yield { text: "⚠️ عذراً، حدث خطأ في إنشاء الصورة عبر Together AI. يرجى المحاولة مرة أخرى." };
      return;
    }
  }
  
  // للطلبات النصية أو تحليل الصور المرفوعة، توجه إلى Gemini
  // الملفات (file) لا تُستخدم حالياً في Gemini، ولكن يمكن تمريرها إذا أردت مستقبلاً
  try {
    const stream = _sendTextMessageStream(history, message, image);
    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (error) {
    console.error("Stream Root Error:", error);
    yield { text: "عذراً، حدث خطأ غير متوقع." };
  }
  }
