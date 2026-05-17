// src/lib/gemini.ts

export interface Message {
  role: 'user' | 'model';
  text: string;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * دالة بديلة ومستقرة ترسل الطلب مباشرة لتجنب حظر الـ SDK في بيئة النشر
 */
export async function sendMessageStream(
  chatHistory: Message[], 
  onChunk: (text: string) => void
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("❌ VITE_GEMINI_API_KEY is missing");
  }

  // تحويل صيغة المحادثة إلى الهيكل المدعوم من جوجل
  const contents = chatHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // محاكاة الـ Stream أو تمرير النص كاملاً لإبقاء التوافق مع App.tsx
    onChunk(outputText);
    return outputText;

  } catch (error) {
    console.error("Gemini Fetch Error: ", error);
    throw error;
  }
}
