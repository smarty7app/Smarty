import { GoogleGenAI } from "@google/genai";

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

async function _sendMessage(history: Message[], message: string, model: string, image?: { data: string; mimeType: string }) {
  const ai = getAI();
  if (!ai) throw new Error("API key missing");

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
          text: "تم إنشاء الصورة بنجاح.",
          image: { data: base64Data, mimeType: 'image/jpeg' },
          status: 'done'
        };
      }
    } catch (e) {
      console.warn("Imagen 4 failed:", e);
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
  const primaryModel = "gemini-2.0-flash-exp";

  try {
    return await _sendMessage(history, message, primaryModel, image);
  } catch (error: any) {
    console.error("sendMessage error:", error);
    throw new Error("حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.");
  }
}

async function* _sendMessageStream(history: Message[], message: string, model: string, image?: { data: string; mimeType: string }) {
  const ai = getAI();
  if (!ai) {
    console.error("AI not initialized");
    yield { text: "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى." };
    return;
  }

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
          text: "تم إنشاء الصورة بنجاح.",
          image: { data: base64Data, mimeType: 'image/jpeg' },
          status: 'done'
        };
        return;
      }
    } catch (e) {
      console.warn("Imagen 4 failed in stream:", e);
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
    console.error("sendMessageStream error:", error);
    yield { text: "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى." };
  }
}
