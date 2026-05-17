// src/lib/together.ts

export interface GeneratedImage {
  data: string;
  mimeType: string;
  url?: string;
}

/**
 * توليد صورة عبر Pollinations AI
 */
export async function generateImageWithTogether(
  prompt: string,
  model: string = "flux"
): Promise<GeneratedImage> {

  const imageUrl =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${model}&width=1024&height=1024&nologo=true`;

  try {

    // تحميل الصورة
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error("Failed to generate image");
    }

    const blob = await response.blob();

    // تحويلها إلى Base64
    const base64Data = await blobToBase64(blob);

    return {
      data: base64Data,
      mimeType: "image/png",
      url: imageUrl,
    };

  } catch (error) {
    console.error("Pollinations Error:", error);
    throw error;
  }
}

/**
 * تحويل Blob إلى Base64
 */
async function blobToBase64(blob: Blob): Promise<string> {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onloadend = () => {

      const base64 = reader.result as string;

      resolve(base64.split(',')[1]);
    };

    reader.onerror = reject;

    reader.readAsDataURL(blob);

  });

}

/**
 * التكلفة = مجانية
 */
export function estimateImageCost(): number {
  return 0;
}

/**
 * خطط الصور
 */
export const imagePlans = {
  free: Infinity,
  starter: Infinity,
  pro: Infinity,
};
