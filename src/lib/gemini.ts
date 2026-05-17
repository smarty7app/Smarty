import { GoogleGenAI } from "@google/genai";

function getAI() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ VITE_GEMINI_API_KEY is not set");
    // إرجاع كائن وهمي لتجنب إيقاف التطبيق (سيظهر خطأ في الاستدعاء)
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  status?: 'thinking' | 'generating';
  image?: {
    data: string; // base64
    mimeType: string;
  };
}

async function _sendMessage(history: Message[], message: string, model: string, image?: { data: string; mimeType: string }) {
  const ai = getAI();
  if (!ai) throw new Error("Gemini API key missing");

  const isImageRequest = /انشئ|صورة|صمم|ارسم|image|generate|create|draw/i.test(message);
  
  // إذا كان طلب صورة ولم يتم رفع صورة، نحاول استخدام Imagen 4 (يتطلب تفعيل الفوترة)
  // لكن هذا اختياري، يمكن إزالته إذا لم تكن الفوترة مفعلة.
  if (isImageRequest && !image) {
    try {
      const imgResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: message,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      });
      if (imgResponse.generatedImages && imgResponse.generatedImages.length > 0) {
        const base64Data = imgResponse.generatedImages[0].image.imageBytes;
        return {
          text: "تم إنشاء الصورة بنجاح بواسطة Imagen 4.",
          image: { data: base64Data, mimeType: 'image/jpeg' },
          status: 'done'
        };
      }
    } catch (e) {
      console.warn("Imagen 4 failed (可能需要 billing):", e);
      // نكمل إلى المحادثة العادية
    }
  }

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
      systemInstruction: "أنت Smarty AI، مساعد ذكي ومحترف في التسويق وكتابة المحتوى. أجب باللغة العربية بشكل أساسي. كن مفيداً ومختصراً.",
    }
  });

  let text = "";
  let generatedImage: { data: string; mimeType: string } | undefined;

  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.text) text += part.text;
      if (part.inlineData) {
        generatedImage = {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType
        };
      }
    }
  }

  return { text, image: generatedImage };
}

export async function sendMessage(history: Message[], message: string, image?: { data: string; mimeType: string }) {
  // استخدام نموذج مجاني ومستقر
  const primaryModel = "gemini-2.0-flash-exp";

  try {
    return await _sendMessage(history, message, primaryModel, image);
  } catch (error: any) {
    console.warn(`Error with ${primaryModel}:`, error);

    const isPermissionError = error?.status === 403 ||
                             error?.message?.includes('403') ||
                             error?.message?.includes('PERMISSION_DENIED') ||
                             error?.message?.includes('permission denied');

    if (isPermissionError) {
      // محاولات احتياطية بنماذج أخرى مجانية
      const fallbackModels = [
        "gemini-1.5-flash",
        "gemini-2.0-flash-lite"
      ];
      for (const fallbackModel of fallbackModels) {
        try {
          console.log(`Trying fallback model: ${fallbackModel}`);
          return await _sendMessage(history, message, fallbackModel, image);
        } catch (e) {
          console.warn(`Fallback ${fallbackModel} failed:`, e);
        }
      }
      throw new Error("عذراً، لا يمكن الاتصال بخدمة الذكاء الاصطناعي حالياً. يرجى التحقق من مفتاح API.");
    }
    throw error;
  }
}

async function* _sendMessageStream(history: Message[], message: string, model: string, image?: { data: string; mimeType: string }) {
  const ai = getAI();
  if (!ai) {
    yield { text: "⚠️ مفتاح API غير موجود. يرجى إضافة VITE_GEMINI_API_KEY في ملف .env" };
    return;
  }

  const isImageRequest = /انشئ|صورة|صمم|ارسم|image|generate|create|draw/i.test(message);

  // إذا كان طلب صورة ولم يتم رفع صورة، نحاول Imagen 4
  if (isImageRequest && !image) {
    yield { status: 'generating' };
    try {
      const imgResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: message,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      });
      if (imgResponse.generatedImages && imgResponse.generatedImages.length > 0) {
        const base64Data = imgResponse.generatedImages[0].image.imageBytes;
        yield {
          text: "تم إنشاء الصورة بنجاح باستخدام Imagen 4.",
          image: { data: base64Data, mimeType: 'image/jpeg' },
          status: 'done'
        };
        return;
      }
    } catch (e) {
      console.warn("Imagen 4 failed in stream:", e);
      // نكمل إلى المحادثة النصية
    }
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
        if (part.inlineData) {
          yield {
            image: {
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType
            }
          };
        }
      }
    }
  }
}

export async function* sendMessageStream(history: Message[], message: string, image?: { data: string; mimeType: string }) {
  const primaryModel = "gemini-2.0-flash-exp";

  try {
    const stream = _sendMessageStream(history, message, primaryModel, image);
    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (error: any) {
    console.warn(`Error with ${primaryModel}:`, error);

    const isPermissionError = error?.status === 403 ||
                             error?.message?.includes('403') ||
                             error?.message?.includes('PERMISSION_DENIED') ||
                             error?.message?.includes('permission denied');

    if (isPermissionError) {
      const fallbackModels = [
        "gemini-1.5-flash",
        "gemini-2.0-flash-lite"
      ];
      for (const fallbackModel of fallbackModels) {
        try {
          console.log(`Trying fallback stream model: ${fallbackModel}`);
          const fallbackStream = _sendMessageStream(history, message, fallbackModel, image);
          for await (const chunk of fallbackStream) {
            yield chunk;
          }
          return;
        } catch (e) {
          console.warn(`Fallback stream ${fallbackModel} failed:`, e);
        }
      }
      yield { text: "عذراً، لا يمكن الاتصال بخدمة الذكاء الاصطناعي حالياً. يرجى المحاولة لاحقاً." };
      return;
    }
    yield { text: "عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." };
  }
}
