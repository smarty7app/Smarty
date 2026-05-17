// src/lib/together.ts
// Together AI API - لإنشاء الصور بسعر رخيص جداً (~$0.0016 لكل صورة)

const TOGETHER_API_KEY = import.meta.env.VITE_TOGETHER_API_KEY;
const TOGETHER_API_URL = "https://api.together.xyz/v1/images/generations";

export interface GeneratedImage {
  data: string;      // يمكن أن يكون Base64 أو رابط URL (مرن)
  mimeType: string;
  url?: string;      // الرابط المباشر إن وُجد
}

/**
 * توليد صورة باستخدام نموذج SDXL أو FLUX
 * @param prompt وصف الصورة المطلوبة
 * @param model اسم النموذج (افتراضي: SDXL)
 * @returns بيانات الصورة (يفضل استخدام الرابط المباشر)
 */
export async function generateImageWithTogether(
  prompt: string,
  model: string = "stabilityai/stable-diffusion-xl-base-1.0"
): Promise<GeneratedImage> {
  if (!TOGETHER_API_KEY) {
    throw new Error("❌ VITE_TOGETHER_API_KEY is not set");
  }

  const response = await fetch(TOGETHER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOGETHER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      negative_prompt: "low quality, blurry, distorted, watermark, text",
      width: 1024,
      height: 1024,
      steps: 30,
      n: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Together AI error:", error);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.data && data.data[0] && data.data[0].url) {
    const imageUrl = data.data[0].url;
    // نعيد الرابط مباشرة دون تحويل إلى Base64
    // هذا أسرع ويتجنب مشاكل CORS وحجم البيانات
    return {
      data: imageUrl,      // الرابط يُستخدم كـ "data"
      mimeType: "image/png",
      url: imageUrl,
    };
  }
  
  throw new Error("No image generated");
}

/**
 * حساب التكلفة التقريبية لكل صورة
 */
export function estimateImageCost(): number {
  return 0.0016;
}

/**
 * باقات الصور المقترحة حسب اشتراك المستخدم
 */
export const imagePlans = {
  free: 3,
  starter: 50,
  pro: 150,
};
