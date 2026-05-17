// src/lib/gemini.ts
import { GoogleGenAI } from "@google/genai";
import { generateImageWithTogether, estimateImageCost, imagePlans } from "./together";

function getAI() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ VITE_GEMINI_API_KEY is not set");
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  status?: 'thinking' | 'generating';
  image?: {
    data: string;
    mimeType: string;
  };
}

// التحقق مما إذا كان الطلب يتطلب صورة
function isImageRequest(message: string): boolean {
  return /انشئ|صورة|صمم|ارسم|image|generate|create|draw|ارسم لي|صمم لي/i.test(message);
}

// دوال النصوص (مجانية عبر Gemini 1.5 Flash)
async function _sendTextMessage(history: Message[], message: string, model: string, image?: { data: string; mimeType: string }) {
  const ai = getAI();
  if (!ai) throw new Error("Gemini API key missing");

  const contents = history.map(m => ({
    role: m.role,
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

  const response = await ai.models.generateContent({
    model: model,
    contents,
    config: {
      systemInstruction: "أنت Smarty AI، مساعد ذكي ومحترف في التسويق وكتابة المحتوى وتحليل السوق. أجب باللغة العربية بشكل أساسي. كن مفيداً ومختصراً ومهنياً.",
    }
  });

  let text = "";
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.text) text += part.text;
    }
  }
  return { text, image: undefined };
}

export async function sendMessage(history: Message[], message: string, image?: { data: string; mimeType: string }) {
  // استخدام Gemini 1.5 Flash (مجاني بالكامل)
  const model = "gemini-1.5-flash";
  
  try {
    return await _sendTextMessage(history, message, model, image);
  } catch (error: any) {
    console.error("Gemini error:", error);
    throw new Error("حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.");
  }
}

// نسخة البث (streaming) للنصوص
async function* _sendTextMessageStream(history: Message[], message: string, model: string, image?: { data: string; mimeType: string }) {
  const ai = getAI();
  if (!ai) {
    yield { text: "⚠️ خطأ في الاتصال بالذكاء الاصطناعي" };
    return;
  }

  yield { status: 'thinking' };
  
  const contents = history.map(m => ({
    role: m.role,
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

  const stream = await ai.models.generateContentStream({
    model: model,
    contents,
    config: {
      systemInstruction: "أنت Smarty AI، مساعد ذكي للتسويق وكتابة المحتوى. أجب بالعربية.",
    }
  });

  for await (const chunk of stream) {
    const candidates = chunk.candidates;
    if (candidates && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.text) {
          yield { text: part.text };
        }
      }
    }
  }
}

// الدالة الرئيسية التي تختار النموذج حسب الطلب
export async function* sendMessageStream(history: Message[], message: string, image?: { data: string; mimeType: string }) {
  const isRequestingImage = isImageRequest(message);
  
  // إذا كان الطلب يتضمن صورة، استخدم Together AI (مدفوع لكن رخيص)
  if (isRequestingImage && !image) {
    yield { status: 'generating' };
    try {
      // توليد الصورة عبر Together AI
      const generatedImage = await generateImageWithTogether(message);
      yield {
        text: "✅ تم إنشاء الصورة بنجاح.",
        image: generatedImage,
        status: 'done'
      };
      return;
    } catch (error) {
      console.error("Together AI error:", error);
      yield { text: "⚠️ عذراً، حدث خطأ في إنشاء الصورة. يرجى المحاولة مرة أخرى." };
      return;
    }
  }
  
  // للطلبات النصية العادية، استخدم Gemini 1.5 Flash (مجاني)
  const model = "gemini-1.5-flash";
  try {
    const stream = _sendTextMessageStream(history, message, model, image);
    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (error: any) {
    console.error("Stream error:", error);
    yield { text: "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى." };
  }
}
