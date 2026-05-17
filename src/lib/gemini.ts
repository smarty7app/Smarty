import { GoogleGenAI } from "@google/genai";

// ====================================================
// الحصول على مفتاح API بترتيب الأولوية:
// 1. من import.meta.env.VITE_GEMINI_API_KEY (Vite dev/build)
// 2. من window.__GEMINI_KEY__ (runtime injection)
// ====================================================
function getApiKey(): string {
  const key =
    (import.meta.env.VITE_GEMINI_API_KEY as string) ||
    (typeof window !== 'undefined' && (window as any).__GEMINI_KEY__) ||
    '';
  return key;
}

function getAI(): GoogleGenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("❌ GEMINI API KEY غير موجود. أضفه في ملف .env كـ VITE_GEMINI_API_KEY");
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// ====================================================
// النماذج المستخدمة - مرتبة من الأحدث للأقل
// ====================================================
const MODELS = {
  flash: "gemini-2.0-flash",         // الأسرع والأكثر استقراراً
  flashExp: "gemini-2.0-flash-exp",  // تجريبي - قد يكون غير متاح
  pro: "gemini-1.5-pro",             // احتياطي
  imagen: "imagen-3.0-generate-002", // توليد الصور (الأحدث)
  imagenFallback: "imagen-3.0-generate-001", // احتياطي
};

const SYSTEM_INSTRUCTION =
  "أنت Smarty AI، مساعد ذكاء اصطناعي متخصص في التسويق وكتابة المحتوى وتحليل السوق. " +
  "أجب بنفس لغة المستخدم (عربي/إنجليزي/فرنسي). كن مفيداً، دقيقاً، ومباشراً. " +
  "عند الكتابة بالعربية استخدم لغة سلسة ومحترفة. " +
  "عند إنشاء محتوى تسويقي كن إبداعياً وجذاباً.";

export interface Message {
  role: 'user' | 'model';
  text: string;
  status?: 'thinking' | 'generating';
  image?: {
    data: string;
    mimeType: string;
  };
}

// ====================================================
// كشف ما إذا كانت الرسالة طلب إنشاء صورة
// ====================================================
function isImageGenerationRequest(message: string): boolean {
  const imageKeywords = [
    'انشئ صورة', 'أنشئ صورة', 'صمم صورة', 'ارسم',
    'generate image', 'create image', 'draw', 'design image',
    'générer image', 'créer image', 'dessiner'
  ];
  const lowerMsg = message.toLowerCase();
  return imageKeywords.some(kw => lowerMsg.includes(kw));
}

// ====================================================
// محاولة إنشاء صورة مع fallback بين النماذج
// ====================================================
async function tryGenerateImage(
  ai: GoogleGenAI,
  prompt: string
): Promise<{ data: string; mimeType: string } | null> {
  const imagenModels = [MODELS.imagen, MODELS.imagenFallback];

  for (const model of imagenModels) {
    try {
      const response = await ai.models.generateImages({
        model,
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      });
      if (response.generatedImages?.[0]?.image?.imageBytes) {
        return {
          data: response.generatedImages[0].image.imageBytes,
          mimeType: 'image/jpeg',
        };
      }
    } catch (e: any) {
      console.warn(`Imagen model ${model} failed:`, e?.message || e);
    }
  }
  return null;
}

// ====================================================
// بناء محتوى المحادثة للإرسال للـ API
// ====================================================
function buildContents(history: Message[], message: string, image?: { data: string; mimeType: string }) {
  const contents = history
    .filter(m => m.text || m.image) // تجاهل الرسائل الفارغة
    .map(m => ({
      role: m.role,
      parts: [
        ...(m.text ? [{ text: m.text }] : []),
        ...(m.image ? [{ inlineData: { data: m.image.data, mimeType: m.image.mimeType } }] : [])
      ]
    }));

  const currentParts: any[] = [];
  if (message) currentParts.push({ text: message });
  if (image) currentParts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });

  contents.push({ role: 'user', parts: currentParts });
  return contents;
}

// ====================================================
// محاولة الاتصال بالنماذج مع fallback
// ====================================================
async function tryModelsWithFallback(
  ai: GoogleGenAI,
  contents: any[],
  stream: false
): Promise<any>;
async function tryModelsWithFallback(
  ai: GoogleGenAI,
  contents: any[],
  stream: true
): Promise<AsyncIterable<any>>;
async function tryModelsWithFallback(
  ai: GoogleGenAI,
  contents: any[],
  useStream: boolean
): Promise<any> {
  const modelsToTry = [MODELS.flash, MODELS.flashExp, MODELS.pro];

  for (const model of modelsToTry) {
    try {
      if (useStream) {
        return await ai.models.generateContentStream({
          model,
          contents,
          config: { systemInstruction: SYSTEM_INSTRUCTION },
        });
      } else {
        return await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction: SYSTEM_INSTRUCTION },
        });
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      // إذا كان الخطأ بسبب عدم توفر النموذج، جرّب التالي
      if (msg.includes('not found') || msg.includes('404') || msg.includes('not supported')) {
        console.warn(`Model ${model} not available, trying next...`);
        continue;
      }
      // خطأ آخر (quota, permission, etc.) - ارفع الخطأ مباشرة
      throw e;
    }
  }
  throw new Error('All Gemini models failed. Please check your API key and quota.');
}

// ====================================================
// إرسال رسالة (بدون streaming) - للاستخدام الداخلي
// ====================================================
export async function sendMessage(
  history: Message[],
  message: string,
  image?: { data: string; mimeType: string }
): Promise<{ text: string; image?: { data: string; mimeType: string } }> {
  const ai = getAI();
  if (!ai) throw new Error("مفتاح API غير موجود. يرجى إضافة VITE_GEMINI_API_KEY في ملف .env");

  // محاولة إنشاء صورة إذا كانت الرسالة تطلب ذلك
  if (isImageGenerationRequest(message) && !image) {
    const generatedImage = await tryGenerateImage(ai, message);
    if (generatedImage) {
      return { text: "✅ تم إنشاء الصورة بنجاح!", image: generatedImage };
    }
    // إذا فشل إنشاء الصورة، استمر بالرد النصي
  }

  const contents = buildContents(history, message, image);
  const response = await tryModelsWithFallback(ai, contents, false);

  let text = "";
  let generatedImage: { data: string; mimeType: string } | undefined;

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.text) text += part.text;
      if (part.inlineData) {
        generatedImage = { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
      }
    }
  }

  return { text, image: generatedImage };
}

// ====================================================
// إرسال رسالة مع streaming (يُستخدم في الـ UI)
// ====================================================
export async function* sendMessageStream(
  history: Message[],
  message: string,
  image?: { data: string; mimeType: string }
): AsyncGenerator<{
  text?: string;
  image?: { data: string; mimeType: string };
  status?: 'thinking' | 'generating' | 'done';
}> {
  const ai = getAI();
  if (!ai) {
    yield { text: "⚠️ مفتاح API غير موجود. يرجى إضافة VITE_GEMINI_API_KEY في ملف .env" };
    return;
  }

  // محاولة إنشاء صورة
  if (isImageGenerationRequest(message) && !image) {
    yield { status: 'generating' };
    try {
      const generatedImage = await tryGenerateImage(ai, message);
      if (generatedImage) {
        yield {
          text: "✅ تم إنشاء الصورة بنجاح!",
          image: generatedImage,
          status: 'done'
        };
        return;
      }
      // إذا فشل الإنشاء، رد نصياً
      yield { text: "⚠️ لم أتمكن من إنشاء الصورة. جاري الرد نصياً...\n\n" };
    } catch (e: any) {
      console.error("Image generation error:", e);
      yield { text: "⚠️ حدث خطأ في إنشاء الصورة. جاري الرد نصياً...\n\n" };
    }
  }

  // بدء الرد النصي
  yield { status: 'thinking' };

  try {
    const contents = buildContents(history, message, image);
    const stream = await tryModelsWithFallback(ai, contents, true);

    for await (const chunk of stream) {
      if (chunk.candidates?.[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if (part.text) yield { text: part.text };
          if (part.inlineData) {
            yield {
              image: { data: part.inlineData.data, mimeType: part.inlineData.mimeType }
            };
          }
        }
      }
    }
  } catch (error: any) {
    console.error("Gemini streaming error:", error);
    const msg = error?.message || String(error);

    if (msg.toLowerCase().includes('quota') || msg.includes('429')) {
      yield { text: "⚠️ تم تجاوز حد الاستخدام. يرجى الانتظار قليلاً أو ترقية خطتك." };
    } else if (msg.toLowerCase().includes('api key') || msg.includes('401') || msg.includes('403')) {
      yield { text: "⚠️ مفتاح API غير صالح أو انتهت صلاحيته. يرجى التحقق من الإعدادات." };
    } else {
      yield { text: "⚠️ حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى." };
    }
  }
}
