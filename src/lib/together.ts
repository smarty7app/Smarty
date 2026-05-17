// src/lib/together.ts
// Together AI API - لإنشاء الصور بسعر رخيص جداً (~$0.0016 لكل صورة)

const TOGETHER_API_KEY = import.meta.env.VITE_TOGETHER_API_KEY;
const TOGETHER_API_URL = "https://api.together.xyz/v1/images/generations";

export interface GeneratedImage {
  data: string; // base64
  mimeType: string;
  url?: string;
}

/**
 * توليد صورة باستخدام نموذج SDXL أو FLUX
 * @param prompt وصف الصورة المطلوبة
 * @param model اسم النموذج (افتراضي: SDXL)
 * @returns بيانات الصورة بصيغة base64
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
  
  // Together AI يعيد رابط الصورة وليس base64 مباشرة
  if (data.data && data.data[0] && data.data[0].url) {
    // نحتاج إلى تحويل الرابط إلى base64 لتوافقه مع باقي التطبيق
    const imageUrl = data.data[0].url;
    const base64Data = await fetchImageAsBase64(imageUrl);
    return {
      data: base64Data,
      mimeType: "image/png",
      url: imageUrl,
    };
  }
  
  throw new Error("No image generated");
}

/**
 * تحويل رابط الصورة إلى base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]); // نزيل البادئة data:image/...
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * حساب التكلفة التقريبية لكل صورة
 */
export function estimateImageCost(): number {
  // SDXL يكلف حوالي $0.0016 لكل صورة
  return 0.0016;
}

/**
 * باقات الصور المقترحة حسب اشتراك المستخدم
 */
export const imagePlans = {
  free: 3,      // 3 صور مجانية شهرياً
  starter: 50,  // 50 صورة (باقة 400 دج)
  pro: 150,     // 150 صورة (باقة 700 دج)
};
