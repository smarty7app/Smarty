import { pipeline } from '@xenova/transformers';

let transcriber: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

/**
 * تهيئة نموذج Whisper المحلي
 * يستخدم نمط Singleton لمنع تحميل النموذج أكثر من مرة
 */
export const initWhisper = async (): Promise<any> => {
  // إذا كان النموذج محملاً مسبقاً، أرجعه مباشرة
  if (transcriber) {
    return transcriber;
  }

  // إذا كان التحميل جارياً، انتظر انتهاءه
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  // بدء تحميل جديد
  isLoading = true;
  loadPromise = (async () => {
    try {
      // يمكن استخدام نماذج مختلفة حسب الدقة المطلوبة:
      // - 'Xenova/whisper-tiny'    (الأسرع، ~40MB، دقة مقبولة)
      // - 'Xenova/whisper-base'    (متوازن، ~70MB)
      // - 'Xenova/whisper-small'   (أعلى دقة، ~240MB)
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
      return transcriber;
    } catch (error) {
      console.error('Failed to load Whisper model:', error);
      throw error;
    } finally {
      isLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
};

/**
 * نتائج التفريغ الصوتي
 */
export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
}

/**
 * تفريغ الصوت باستخدام Whisper المحلي
 * @param audioBlob - ملف الصوت (يدعم webm, mp3, wav)
 * @returns النص المستخرج
 */
export const transcribeLocal = async (audioBlob: Blob): Promise<string> => {
  try {
    const whisper = await initWhisper();
    const result = await whisper(audioBlob);
    
    // التعامل مع أنواع مختلفة من النتائج
    if (typeof result === 'string') {
      return result;
    }
    
    if (Array.isArray(result)) {
      return result.map((r: any) => r.text || r).join(' ');
    }
    
    if (result.text) {
      return result.text;
    }
    
    return String(result);
  } catch (error) {
    console.error('Local transcription failed:', error);
    throw new Error('فشل تفريغ الصوت محلياً');
  }
};

/**
 * تفريغ الصوت مع معلومات إضافية (الثقة، اللغة)
 */
export const transcribeLocalWithDetails = async (audioBlob: Blob): Promise<TranscriptionResult> => {
  try {
    const whisper = await initWhisper();
    const result = await whisper(audioBlob, { returnTimestamps: false });
    
    let text = '';
    let confidence: number | undefined;
    let language: string | undefined;
    
    if (Array.isArray(result) && result.length > 0) {
      text = result.map((r: any) => r.text || r).join(' ');
      confidence = result[0]?.confidence;
      language = result[0]?.language;
    } else if (result.text) {
      text = result.text;
      confidence = result.confidence;
      language = result.language;
    } else {
      text = String(result);
    }
    
    return { text, confidence, language };
  } catch (error) {
    console.error('Local transcription with details failed:', error);
    throw new Error('فشل تفريغ الصوت محلياً مع التفاصيل');
  }
};

/**
 * التحقق مما إذا كان النموذج محملاً
 */
export const isModelLoaded = (): boolean => {
  return transcriber !== null;
};

/**
 * التحقق مما إذا كان التحميل جارياً
 */
export const isModelLoading = (): boolean => {
  return isLoading;
};

/**
 * إعادة تعيين النموذج (لتحرير الذاكرة)
 */
export const resetModel = (): void => {
  transcriber = null;
  isLoading = false;
  loadPromise = null;
};

/**
 * الحصول على حجم النموذج التقريبي
 */
export const getModelSize = (): string => {
  return '~40 MB (tiny)';
};
