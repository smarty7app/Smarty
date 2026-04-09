// app/api/smarty/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai"; // تصحيح حرف i

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { message, lang } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // دمج التعليمات في برومبت واحد قوي
    const systemInstruction = `
      أنت "سمارتي" (Smarty)، سكرتير جزائري ذكي ومحترف. 
      لغتك الحالية هي ${lang === 'ar' ? 'العربية (الدارجة الجزائرية البيضاء)' : 'الفرنسية'}.
      مهمتك: مساعدة المستخدم في تنظيم وقته وتذكيره بمواعيده.
      أسلوبك: ودود، سريع، وقصير جداً لأن ردودك ستقرأ صوتياً.
      رسالة المستخدم: "${message}"
    `;

    const result = await model.generateContent(systemInstruction);
    const response = await result.response;
    const text = response.text();

    return Response.json({ reply: text });
  } catch (error) {
    console.error("Gemini Error:", error);
    return Response.json({ reply: "عذراً، واجهت مشكلة في الاتصال بصديقك سمارتي." }, { status: 500 });
  }
}
