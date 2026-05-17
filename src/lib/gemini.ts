import { GoogleGenAI } from "@google/genai";

function getAI() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ VITE_GEMINI_API_KEY is not set");
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

  // إذا كان المستخدم يطلب صورة، نستخدم Imagen 4 كحل احتياطي إذا فشل النموذج الأساسي
  // لكننا سنعتمد أساساً على النموذج الأساسي (gemini-2.5-flash-image) لتوليد الصور.
  // نترك هذه الكتلة كـ fallback فقط.
  const isImageRequest = /انشئ|صورة|صمم|ارسم|image|generate|create|draw/i.test(message);
  
  // سنقوم بتوليد الصورة عبر النموذج الأساسي، لذلك لا حاجة لاستدعاء Imagen 4 هنا.
  // إذا أردت الاحتفاظ بـ Imagen 4 كخيار ثانوي، يمكنك تركه كما هو، لكنه لن يُستخدم عادةً.

  const contents = history.map(m => ({
    role: m.role,
    parts: [
      { text: m.text },
      ...(m.image ? [{ inlineData: { data: m.image.data, mimeType: m.image.mimeType } } ] : [])
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
      systemInstruction: "أنت Smarty AI، مساعد ذكي ومحترف في التسويق وكتابة المحتوى وإنشاء الصور الاحترافية. أجب باللغة العربية بشكل أساسي. كن مفيداً ومختصراً. يمكنك إنشاء صور بناءً على طلب المستخدم.",
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

  // إذا فشل النموذج الأساسي في توليد الصورة وكان الطلب صورة، نحاول Imagen 4 كـ fallback
  if (isImageRequest && !generatedImage && !image) {
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
          text: "تم إنشاء الصورة بنجاح (باستخدام Imagen 4).",
          image: { data: base64Data, mimeType: 'image/jpeg' },
          status: 'done'
        };
      }
    } catch (e) {
      console.warn("Imagen 4 fallback failed:", e);
    }
  }

  return { text, image: generatedImage };
}

export async function sendMessage(history: Message[], message: string, image?: { data: string; mimeType: string }) {
  // النموذج الأساسي الجديد: gemini-2.5-flash-image (يدعم النصوص والصور معاً)
  const primaryModel = "gemini-2.5-flash-image";

  try {
    return await _sendMessage(history, message, primaryModel, image);
  } catch (error: any) {
    console.warn(`Error with ${primaryModel}:`, error);

    const isPermissionError = error?.status === 403 ||
                             error?.message?.includes('403') ||
                             error?.message?.includes('PERMISSION_DENIED') ||
                             error?.message?.includes('permission denied');

    if (isPermissionError) {
      // محاولات احتياطية بنماذج أخرى في حالة فشل النموذج الجديد
      const fallbackModels = [
        "gemini-2.0-flash-exp",
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

  const isImageRequest = /انشئ|صورة|صمم|ارسم|image|generate|create|draw/i.test(message);

  yield { status: 'thinking' };
  const contents = history.map(m => ({
    role: m.role,
    parts: [
      { text: m.text },
      ...(m.image ? [{ inlineData: { data: m.image.data, mimeType: m.image.mimeType } } ] : [])
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
      systemInstruction: "أنت Smarty AI، مساعد ذكي متخصص في التسويق وإنشاء المحتوى والصور. أجب باللغة العربية. كن مختصراً ومفيداً.",
    }
  });

  let generatedImage: { data: string; mimeType: string } | undefined = undefined;
  let accumulatedText = "";

  for await (const chunk of stream) {
    const candidates = chunk.candidates;
    if (candidates && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.text) {
          accumulatedText += part.text;
          yield { text: part.text };
        }
        if (part.inlineData && !generatedImage) {
          generatedImage = {
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType
          };
          yield { image: generatedImage };
        }
      }
    }
  }

  // إذا لم يتم توليد صورة وكان الطلب صورة، نحاول Imagen 4 كـ fallback (في وضع البث)
  if (isImageRequest && !generatedImage && !image) {
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
          text: " (تم إنشاء الصورة باستخدام Imagen 4)",
          image: { data: base64Data, mimeType: 'image/jpeg' },
        };
      }
    } catch (e) {
      console.warn("Imagen 4 fallback in stream failed:", e);
    }
  }
}

export async function* sendMessageStream(history: Message[], message: string, image?: { data: string; mimeType: string }) {
  const primaryModel = "gemini-2.5-flash-image";

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
        "gemini-2.0-flash-exp",
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
