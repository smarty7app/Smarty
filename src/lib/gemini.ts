import { GoogleGenAI } from "@google/genai";

function getAI() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
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

  // إذا كان المستخدم يطلب صورة، استخدم Imagen 4
  const isImageRequest = /انشئ|صورة|صمم|ارسم|image|generate|create|draw/i.test(message);
  
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
          status: 'done' as any
        };
      }
    } catch (e) {
      console.warn("Imagen 4 failed, falling back to Gemini:", e);
    }
  }

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
      systemInstruction: "أنت Smarty AI، مساعد ذكي ولطيف ومحترف في التسويق وكتابة المحتوى. أجب باللغة العربية بشكل أساسي إلا إذا طلب المستخدم لغة أخرى. كن مفيداً ومختصراً وواضحاً. لا تبالغ في استخدام رموز التنسيق مثل النجوم (*) والهاشتاق (#) لجعل النص يبدو أنظف وأسهل في القراءة. استخدم التنسيق فقط عند الضرورة القصوى لتنظيم العناوين أو القوائم بشكل بسيط. لا تذكر اسمك 'Smarty AI' في بداية حديثك. يمكنك الآن إنشاء وتعديل الصور بشكل احترافي.",
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
  // النموذج الأساسي الجديد: gemini-1.5-pro (يدعم النصوص والصور والمستندات)
  // ملاحظة: لا يزال يتم استخدام Imagen 4 لإنشاء الصور عند الطلب في _sendMessage
  const isImageRequest = /انشئ|صورة|صمم|ارسم|image|generate|create|draw/i.test(message);
  // إذا كان الطلب لإنشاء صورة، نستخدم نموذج المحادثة العادي (1.5-pro) بعد محاولة Imagen 4.
  // في حالة رفع صورة (image موجود) أو طلب نص عادي، نستخدم 1.5-pro أيضاً.
  const primaryModel = "gemini-1.5-pro";

  try {
    return await _sendMessage(history, message, primaryModel, image);
  } catch (error: any) {
    console.warn(`Error with ${primaryModel}:`, error);

    const isPermissionError = error?.status === 403 || 
                             error?.message?.includes('403') || 
                             error?.message?.includes('PERMISSION_DENIED') ||
                             error?.message?.includes('permission denied');

    if (isPermissionError) {
      // محاولات احتياطية بنماذج أخرى في حالة فشل 1.5-pro بسبب الأذونات
      try {
        return await _sendMessage(history, message, "gemini-1.5-flash", image);
      } catch (e) {
        try {
          return await _sendMessage(history, message, "gemini-2.0-flash", image);
        } catch (e2) {
          try {
            return await _sendMessage(history, message, "gemini-3-flash-preview", image);
          } catch (e3) {}
        }
      }
      throw new Error("Permission Denied: Please check your Gemini API key in Settings > Secrets.");
    }
    throw error;
  }
}

async function* _sendMessageStream(history: Message[], message: string, model: string, image?: { data: string; mimeType: string }) {
  const ai = getAI();

  // إذا كان طلب صورة، استخدم Imagen 4
  const isImageRequest = /انشئ|صورة|صمم|ارسم|image|generate|create|draw/i.test(message);
  
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
          text: "تم إنشاء الصورة بنجاح بواسطة Imagen 4.", 
          image: { data: base64Data, mimeType: 'image/jpeg' },
          status: 'done' as any
        };
        return;
      }
    } catch (e) {
      console.warn("Imagen 4 failed in stream, falling back to Gemini:", e);
    }
  }

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
      systemInstruction: "أنت Smarty AI، مساعد ذكي ولطيف ومحترف في التسويق وكتابة المحتوى. أجب باللغة العربية بشكل أساسي إلا إذا طلب المستخدم لغة أخرى. كن مفيداً ومختصراً وواضحاً. لا تبالغ في استخدام رموز التنسيق مثل النجوم (*) والهاشتاق (#) لجعل النص يبدو أنظف وأسهل في القراءة. استخدم التنسيق فقط عند الضرورة القصوى لتنظيم العناوين أو القوائم بشكل بسيط. لا تذكر اسمك 'Smarty AI' في بداية حديثك. يمكنك الآن إنشاء وتعديل الصور بشكل احترافي.",
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
  // النموذج الأساسي الجديد: gemini-1.5-pro
  const primaryModel = "gemini-1.5-pro";

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
      // محاولات احتياطية بنماذج أخرى في حالة فشل 1.5-pro
      try {
        const fallbackStream = _sendMessageStream(history, message, "gemini-1.5-flash", image);
        for await (const chunk of fallbackStream) {
          yield chunk;
        }
        return;
      } catch (e) {
        console.warn("gemini-1.5-flash failed, trying gemini-2.0-flash:", e);
        try {
          const fallbackStream2 = _sendMessageStream(history, message, "gemini-2.0-flash", image);
          for await (const chunk of fallbackStream2) {
            yield chunk;
          }
          return;
        } catch (e2) {
          console.warn("gemini-2.0-flash failed, trying gemini-3-flash-preview:", e2);
          try {
            const fallbackStream3 = _sendMessageStream(history, message, "gemini-3-flash-preview", image);
            for await (const chunk of fallbackStream3) {
              yield chunk;
            }
            return;
          } catch (e3) {
            console.error("All fallback models failed:", e3);
          }
        }
      }
      
      throw new Error("Permission Denied: Please check your Gemini API key in Settings > Secrets. You may need to select a billing-enabled key for some models.");
    }
    
    throw error;
  }
}
