'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { transcribeLocal } from '@/lib/local-whisper';
import { 
  ArrowLeft, 
  Wifi, 
  WifiOff, 
  Loader2, 
  Mic, 
  Volume2, 
  Sparkles, 
  MessageCircle,
  Download,
  ChevronDown,
  Check,
  Trash2,
  HardDrive
} from 'lucide-react';

// تعريف واجهات البيانات
interface AIModel {
  id: string;
  name: {
    ar: string;
    en: string;
    fr: string;
  };
  size: string;
  description: {
    ar: string;
    en: string;
    fr: string;
  };
  downloadUrl: string;
  filename: string;
  estimatedSizeMB: number;
}

// النماذج المتوفرة للتحميل
const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gemma-2-2b',
    name: { ar: 'جيما 2 - 2 مليار', en: 'Gemma 2 - 2B', fr: 'Gemma 2 - 2B' },
    size: '1.5 GB',
    description: { 
      ar: 'سريع، يدعم العربية، مناسب للهواتف المتوسطة', 
      en: 'Fast, supports Arabic, suitable for mid-range phones',
      fr: 'Rapide, supporte l\'arabe, adapté aux smartphones milieu de gamme'
    },
    downloadUrl: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    filename: 'gemma-2-2b-it-Q4_K_M.gguf',
    estimatedSizeMB: 1500
  },
  {
    id: 'llama-3.2-3b',
    name: { ar: 'لاما 3.2 - 3 مليار', en: 'Llama 3.2 - 3B', fr: 'Llama 3.2 - 3B' },
    size: '2 GB',
    description: { 
      ar: 'أداء عالي، دقة ممتازة، للهواتف المتطورة', 
      en: 'High performance, excellent accuracy, for flagship phones',
      fr: 'Haute performance, excellente précision, pour smartphones haut de gamme'
    },
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    estimatedSizeMB: 2000
  },
  {
    id: 'phi-3.5-mini',
    name: { ar: 'فاي 3.5 مصغر', en: 'Phi-3.5 Mini', fr: 'Phi-3.5 Mini' },
    size: '1.8 GB',
    description: { 
      ar: 'خفيف الوزن، مناسب للهواتف القديمة', 
      en: 'Lightweight, suitable for older phones',
      fr: 'Léger, adapté aux anciens téléphones'
    },
    downloadUrl: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf',
    filename: 'Phi-3.5-mini-instruct-Q4_K_M.gguf',
    estimatedSizeMB: 1800
  }
];

export default function SmartVoicePage() {
  const router = useRouter();
  const isMediaRecorderInitializedRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [pulsePhase, setPulsePhase] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [useLocalWhisper, setUseLocalWhisper] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  
  // حالات تحميل النماذج
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [downloadedModels, setDownloadedModels] = useState<Set<string>>(new Set());
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { language } = useLanguage();
  const { data: session } = useSession();
  const userId = session?.user?.id || 'anonymous';
  const userEmail = session?.user?.email || '';
  const userName = session?.user?.name || '';

  // تحميل النماذج المحفوظة من localStorage
  useEffect(() => {
    const savedModels = localStorage.getItem('downloaded_ai_models');
    if (savedModels) {
      setDownloadedModels(new Set(JSON.parse(savedModels)));
    }
    const savedActiveModel = localStorage.getItem('active_ai_model');
    if (savedActiveModel) {
      setActiveModel(savedActiveModel);
    }
  }, []);

  // حفظ النماذج المحفوظة
  useEffect(() => {
    localStorage.setItem('downloaded_ai_models', JSON.stringify(Array.from(downloadedModels)));
  }, [downloadedModels]);

  useEffect(() => {
    if (activeModel) {
      localStorage.setItem('active_ai_model', activeModel);
    }
  }, [activeModel]);

  // مراقبة حالة الاتصال بالإنترنت
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // تأثير النبض المستمر (التنفس)
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // تنظيف مؤقت الصمت
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // دالة الترجمة
  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      'download_model': { ar: 'تحميل نموذج', en: 'Download Model', fr: 'Télécharger Modèle' },
      'select_model': { ar: 'اختر نموذج الذكاء الاصطناعي', en: 'Select AI Model', fr: 'Sélectionner un Modèle IA' },
      'downloaded': { ar: 'تم التحميل', en: 'Downloaded', fr: 'Téléchargé' },
      'active': { ar: 'نشط', en: 'Active', fr: 'Actif' },
      'download': { ar: 'تحميل', en: 'Download', fr: 'Télécharger' },
      'downloading': { ar: 'جاري التحميل...', en: 'Downloading...', fr: 'Téléchargement...' },
      'delete': { ar: 'حذف', en: 'Delete', fr: 'Supprimer' },
      'use_model': { ar: 'استخدام', en: 'Use', fr: 'Utiliser' },
      'storage_info': { ar: 'المساحة المتاحة', en: 'Available Space', fr: 'Espace Disponible' },
      'no_models': { ar: 'لم يتم تحميل أي نموذج بعد', en: 'No models downloaded yet', fr: 'Aucun modèle téléchargé' },
      'switch_to_model': { ar: 'تم التبديل إلى نموذج', en: 'Switched to model', fr: 'Passé au modèle' },
      'delete_confirm': { ar: 'هل أنت متأكد من حذف هذا النموذج؟', en: 'Are you sure you want to delete this model?', fr: 'Êtes-vous sûr de vouloir supprimer ce modèle ?' }
    };
    return translations[key]?.[language] || translations[key]?.en || key;
  };

  // الحصول على نص النموذج حسب اللغة
  const getModelName = (model: AIModel): string => model.name[language as keyof typeof model.name] || model.name.en;
  const getModelDescription = (model: AIModel): string => model.description[language as keyof typeof model.description] || model.description.en;

  // دالة تحميل النموذج
  // دالة تحميل النموذج (النسخة المصححة)
const downloadModel = async (model: AIModel) => {
  if (!isOnline) {
    setResponse('لا يوجد اتصال بالإنترنت للتحميل');
    return;
  }

  // التحقق من المساحة المتاحة
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const availableMB = (estimate.quota! - estimate.usage!) / (1024 * 1024);
    if (availableMB < model.estimatedSizeMB + 100) {
      setResponse(`مساحة غير كافية. تحتاج إلى ${model.estimatedSizeMB} MB إضافية.`);
      return;
    }
  }

  setDownloadingModel(model.id);
  setDownloadProgress(prev => ({ ...prev, [model.id]: 0 }));

  try {
    const response = await fetch(model.downloadUrl);
    if (!response.ok) throw new Error('فشل التحميل');

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // ✅ التصحيح: التأكد من أن value هو Uint8Array
        if (value) {
          chunks.push(value);
          received += value.length;
          
          if (total > 0) {
            const progress = (received / total) * 100;
            setDownloadProgress(prev => ({ ...prev, [model.id]: progress }));
          }
        }
      }
    }

    // ✅ التصحيح: دمج الـ chunks بشكل صحيح
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const mergedArray = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      mergedArray.set(chunk, offset);
      offset += chunk.length;
    }
    
    // إنشاء Blob من Uint8Array المدمج
    const blob = new Blob([mergedArray], { type: 'application/octet-stream' });
    
    // حفظ الملف باستخدام FileReader
    const readerForSave = new FileReader();
    readerForSave.onload = () => {
      const base64 = readerForSave.result as string;
      try {
        localStorage.setItem(`model_${model.id}`, base64);
        setDownloadedModels(prev => new Set(prev).add(model.id));
        setResponse(`تم تحميل نموذج ${getModelName(model)} بنجاح`);
      } catch (error) {
        // إذا فشل localStorage بسبب الحجم الكبير
        console.error('Failed to save to localStorage:', error);
        setResponse(`النموذج كبير جداً للحفظ في التخزين المحلي. سيتم استخدامه مؤقتاً فقط.`);
        // يمكن تخزين مرجع للملف بدلاً من الملف نفسه
        sessionStorage.setItem(`model_${model.id}_ref`, 'downloaded');
        setDownloadedModels(prev => new Set(prev).add(model.id));
      }
    };
    readerForSave.onerror = () => {
      setResponse(`فشل حفظ النموذج: خطأ في قراءة الملف`);
      setDownloadingModel(null);
    };
    readerForSave.readAsDataURL(blob);
    
  } catch (error) {
    console.error('Download error:', error);
    setResponse(`فشل تحميل النموذج: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
  } finally {
    setDownloadingModel(null);
    setDownloadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[model.id];
      return newProgress;
    });
  }
};

  // دالة حذف النموذج
  const deleteModel = (modelId: string) => {
    if (confirm(t('delete_confirm'))) {
      localStorage.removeItem(`model_${modelId}`);
      setDownloadedModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelId);
        return newSet;
      });
      if (activeModel === modelId) {
        setActiveModel(null);
      }
      setResponse(`تم حذف النموذج`);
    }
  };

  // دالة تفعيل النموذج
  const activateModel = (modelId: string) => {
    setActiveModel(modelId);
    setResponse(`${t('switch_to_model')} ${AVAILABLE_MODELS.find(m => m.id === modelId)?.name[language as keyof typeof model.name] || modelId}`);
    setShowModelDialog(false);
  };

  // دالة معالجة النص (مشتركة بين Web Speech و Whisper)
  const processText = useCallback(async (text: string) => {
    setIsProcessing(true);
    try {
      if (!isOnline) throw new Error('لا يوجد اتصال بالإنترنت');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: text, 
          userId, 
          userEmail, 
          userName,
          model: activeModel // إرسال النموذج النشط للـ API
        }),
      });

      if (!res.ok) {
        if (res.status === 429) throw new Error('تم تجاوز الحد اليومي للطلبات');
        throw new Error(`API error: ${res.status}`);
      }

      const reply = await res.text();
      setResponse(reply);

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(reply);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => { setIsSpeaking(true); setIsProcessing(false); };
      utterance.onend = () => { setIsSpeaking(false); setRetryCount(0); };
      utterance.onerror = () => { setIsSpeaking(false); setIsProcessing(false); setResponse('عذراً، لم أستطع نطق الرد.'); };
      window.speechSynthesis.speak(utterance);
    } catch (error: any) {
      console.error('Chat error:', error);
      if (retryCount < 3 && error.message.includes('fetch')) {
        setRetryCount(prev => prev + 1);
        setResponse(`محاولة إعادة الاتصال (${retryCount + 1}/3)...`);
        setTimeout(() => processText(text), 2000);
      } else {
        setResponse(error.message || 'حدث خطأ في الاتصال بالمساعد.');
        setIsProcessing(false);
      }
    }
  }, [isOnline, userId, userEmail, userName, retryCount, activeModel]);

  // دالة بدء التسجيل المحلي (Whisper)
  const startLocalRecording = useCallback(async () => {
    try {
      isMediaRecorderInitializedRef.current = true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        setIsListening(false);
        setIsProcessing(true);
        setIsModelLoading(true);
        setResponse('جاري تحميل نموذج الذكاء الاصطناعي المحلي...');
        
        try {
          const text = await transcribeLocal(audioBlob);
          setTranscript(text);
          await processText(text);
        } catch (error) {
          console.error('Local transcription error:', error);
          setResponse('فشل التفريغ المحلي. تأكد من اتصالك بالإنترنت للتحميل الأولي.');
          setIsProcessing(false);
        } finally {
          setIsModelLoading(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      setTranscript('');
      setResponse('');
      clearSilenceTimer();
      
      silenceTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setResponse('لم أسمع شيئاً. حاول مرة أخرى.');
        }
      }, 10000);
    } catch (error) {
      console.error('Mic error:', error);
      setResponse('فشل الوصول إلى الميكروفون.');
    }
  }, [clearSilenceTimer, processText]);

  // دالة إنشاء كائن SpeechRecognition (Web Speech API)
  const createRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('متصفحك لا يدعم التعرف على الصوت');
      return null;
    }

    const instance = new SpeechRecognition();
    instance.lang = language === 'ar' ? 'ar-DZ' : 'en-US';
    instance.continuous = true;
    instance.interimResults = true;

    instance.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setResponse('');
      setRetryCount(0);
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        if (isListening) {
          recognitionRef.current?.stop();
          setResponse('لم أسمع شيئاً. حاول مرة أخرى.');
        }
      }, 10000);
    };

    instance.onaudiostart = () => clearSilenceTimer();
    instance.onaudioend = () => clearSilenceTimer();

    instance.onresult = (event: any) => {
      clearSilenceTimer();
      
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }
      
      if (interimTranscript) {
        setTranscript(interimTranscript);
      }
      
      if (finalTranscript) {
        setTranscript(finalTranscript);
        setIsListening(false);
        processText(finalTranscript);
      }
    };

    instance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsProcessing(false);
      clearSilenceTimer();
      switch (event.error) {
        case 'not-allowed': setResponse('الرجاء السماح بالوصول إلى الميكروفون.'); break;
        case 'no-speech': setResponse('لم يتم اكتشاف أي صوت، حاول مرة أخرى.'); break;
        case 'network': setResponse('خطأ في الشبكة، تحقق من اتصالك.'); break;
        default: setResponse('لم يتم التعرف على صوتك، حاول مرة أخرى.');
      }
    };

    instance.onend = () => {
      setIsListening(false);
      clearSilenceTimer();
    };

    return instance;
  }, [language, processText, clearSilenceTimer, isListening]);

  // تنظيف الكائن القديم عند تغيير اللغة
  useEffect(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    recognitionRef.current = null;
    mediaRecorderRef.current = null;
    clearSilenceTimer();
  }, [language, clearSilenceTimer]);

  // تنظيف MediaRecorder
  const cleanupMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch(e) { console.warn(e); }
      }
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => {
          if (track.readyState === 'live') track.stop();
        });
      }
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  // دالة تشغيل/إيقاف التسجيل
  const toggleListening = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    if (isListening) {
      if (useLocalWhisper && mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        clearSilenceTimer();
        setIsListening(false);
        return;
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Recognition already stopped");
        }
      }
      clearSilenceTimer();
      setIsListening(false);
      return;
    }

    if (isProcessing) return;

    if (useLocalWhisper) {
      startLocalRecording();
    } else {
      if (!isOnline) {
        setResponse('لا يوجد اتصال بالإنترنت');
        return;
      }
      cleanupMediaRecorder();
      
      recognitionRef.current = createRecognition();
      try {
        recognitionRef.current?.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setTimeout(() => {
          recognitionRef.current = createRecognition();
          recognitionRef.current?.start();
        }, 100);
      }
    }
  };

  // حساب حجم النبض حسب الحالة
  const getPulseScale = () => {
    if (isListening) return 1.12 + Math.sin(pulsePhase * 0.25) * 0.04;
    if (isProcessing || isModelLoading) return 1.08 + Math.sin(pulsePhase * 0.2) * 0.03;
    if (isSpeaking) return 1.06 + Math.sin(pulsePhase * 0.15) * 0.02;
    return 1 + Math.sin(pulsePhase * 0.12) * 0.025;
  };

  // حساب شفافية الشعار حسب الحالة
  const getLogoOpacity = () => {
    if (isListening) return 0.95 + Math.sin(pulsePhase * 0.3) * 0.05;
    if (isProcessing || isModelLoading) return 0.85;
    if (isSpeaking) return 0.8;
    return 0.65 + Math.sin(pulsePhase * 0.1) * 0.05;
  };

  return (
    <div className="min-h-screen bg-[#E65100] dark:bg-black flex flex-col transition-colors duration-300">
      {/* شريط علوي شفاف */}
      <div className="sticky top-0 bg-black/10 dark:bg-white/5 backdrop-blur-md px-6 py-4 flex items-center gap-4 border-b border-white/10 dark:border-white/5 z-10">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft className="w-6 h-6 text-white/70 dark:text-white/70 hover:text-white dark:hover:text-white transition" />
        </button>
        <h1 className="text-xl font-black text-white dark:text-white">
          Smarty <span className="text-[10px] font-bold opacity-40">AI VOICE</span>
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {/* زر تحميل النموذج الجديد */}
          <button
            onClick={() => setShowModelDialog(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full transition bg-gradient-to-r from-purple-500/30 to-purple-600/20 text-purple-200 hover:from-purple-500/40 hover:to-purple-600/30 border border-purple-500/30"
          >
            <Download className="w-3 h-3" />
            {t('download_model')}
            {activeModel && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-1"></span>
            )}
          </button>
          {!isOnline && <WifiOff className="w-4 h-4 text-red-400" />}
          <button
            onClick={() => setUseLocalWhisper(!useLocalWhisper)}
            className={`text-[10px] font-bold px-2 py-1 rounded-full transition ${useLocalWhisper ? 'bg-purple-500/30 text-purple-200' : 'bg-white/10 text-white/60'}`}
          >
            {useLocalWhisper ? 'محلي' : 'سحابي'}
          </button>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* الكائن الحي - الشعار النابض */}
        <div className="relative flex flex-col items-center justify-center">
          {/* هالات */}
          <div className="absolute w-80 h-80 rounded-full bg-gradient-to-r from-[#E65100]/30 via-amber-500/20 to-[#E65100]/30 blur-3xl" style={{ opacity: isListening ? 0.7 : isProcessing ? 0.5 : isSpeaking ? 0.4 : 0.25, transform: `scale(${getPulseScale() * 1.1})`, transition: 'opacity 0.5s ease, transform 0.4s ease-out' }} />
          <div className="absolute w-64 h-64 rounded-full bg-[#E65100]/40 blur-2xl" style={{ opacity: isListening ? 0.5 : isSpeaking ? 0.35 : 0.2, transform: `scale(${getPulseScale() * 1.05})`, transition: 'opacity 0.5s ease, transform 0.4s ease-out' }} />
          <div className="absolute w-52 h-52 rounded-full bg-amber-500/30 blur-xl" style={{ opacity: isListening ? 0.4 : 0.15, transform: `scale(${getPulseScale()})`, transition: 'opacity 0.5s ease, transform 0.4s ease-out' }} />

          {/* الشعار الرئيسي - الكائن الحي */}
          <button
            onClick={toggleListening}
            disabled={isProcessing && !isSpeaking}
            className="relative w-44 h-44 rounded-full flex items-center justify-center focus:outline-none group cursor-pointer"
            style={{ transform: `scale(${getPulseScale()})`, transition: 'transform 0.4s ease-out' }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-black via-zinc-900 to-black shadow-[0_0_80px_rgba(0,0,0,0.8)]" />
            <div className="absolute inset-0 rounded-full bg-white/5 backdrop-blur-xl border border-white/10" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#E65100]/40 to-amber-500/30" style={{ opacity: isListening ? 0.8 : isProcessing ? 0.6 : isSpeaking ? 0.5 : 0.25, transition: 'opacity 0.5s ease' }} />
            <div className="relative z-10">
              <svg className="w-24 h-24 text-white drop-shadow-2xl" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: getLogoOpacity(), filter: isListening ? 'drop-shadow(0 0 25px #E65100)' : 'drop-shadow(0 0 10px rgba(230,81,0,0.3))', transition: 'opacity 0.3s ease, filter 0.3s ease' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z" />
              </svg>
            </div>
            {(isProcessing || isModelLoading) && <div className="absolute inset-0 rounded-full border-2 border-[#E65100]/30 border-t-[#E65100] animate-spin" />}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition duration-700 bg-gradient-to-r from-[#E65100]/20 to-amber-500/20 blur-xl" />
          </button>
          
          {/* حالة الكائن */}
          <div className="mt-6 text-center min-h-[24px]">
            {!isOnline && (
              <div className="flex items-center justify-center gap-2 text-red-400">
                <WifiOff className="w-4 h-4" />
                <p className="text-sm font-medium">لا يوجد اتصال بالإنترنت</p>
              </div>
            )}

            {activeModel && (
              <div className="flex items-center justify-center gap-2 text-green-400/70 mb-2">
                <HardDrive className="w-3 h-3" />
                <p className="text-[10px] font-medium">
                  {AVAILABLE_MODELS.find(m => m.id === activeModel)?.name[language as keyof typeof AVAILABLE_MODELS[0]['name']] || activeModel}
                </p>
              </div>
            )}

            {isModelLoading && (
              <div className="flex items-center justify-center gap-2 text-purple-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm font-medium">تحميل النموذج المحلي...</p>
              </div>
            )}

            {isListening && (
              <div className="flex items-center justify-center gap-2">
                <Mic className="w-4 h-4 text-white/70 animate-pulse" />
                <p className="text-white/70 text-sm font-medium">
                  {useLocalWhisper ? 'جاري التسجيل...' : 'يستمع إليك الآن...'}
                </p>
              </div>
            )}

            {isProcessing && !isModelLoading && (
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <p className="text-white/70 text-sm font-medium">يفكر...</p>
              </div>
            )}

            {isSpeaking && (
              <div className="flex items-center justify-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-300" />
                <p className="text-white/70 text-sm font-medium">يتحدث...</p>
              </div>
            )}

            {!isListening && !isProcessing && !isSpeaking && !isModelLoading && isOnline && (
              <div className="flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4 text-white/40" />
                <p className="text-white/40 text-xs font-medium tracking-wide">
                  اضغط على الشعار للتحدث مع المساعد الذكي
                </p>
              </div>
            )}
          </div>
        </div>

        {/* عرض النص المُسمع والرد */}
        <div className="w-full max-w-md space-y-4 mt-10">
          {transcript && (
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider">أنت</p>
              <p className="text-white text-lg font-medium mt-1">{transcript}</p>
            </div>
          )}
          {response && (
            <div className="bg-gradient-to-r from-[#E65100]/20 to-amber-500/20 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider">سمارتي</p>
              <p className="text-white text-lg font-medium mt-1">{response}</p>
            </div>
          )}
        </div>
      </div>

      {/* حوار اختيار وتحميل النماذج */}
      {showModelDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowModelDialog(false)}>
          <div className="bg-gradient-to-br from-zinc-900 to-black rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-black/90 backdrop-blur-md p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">{t('select_model')}</h2>
              <p className="text-xs text-white/40 mt-1">اختر نموذج الذكاء الاصطناعي الذي تريد استخدامه</p>
            </div>
            
            <div className="p-4 space-y-3">
              {AVAILABLE_MODELS.map((model) => {
                const isDownloaded = downloadedModels.has(model.id);
                const isActive = activeModel === model.id;
                const isDownloading = downloadingModel === model.id;
                const progress = downloadProgress[model.id] || 0;
                
                return (
                  <div key={model.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white">{getModelName(model)}</h3>
                          {isActive && (
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                              {t('active')}
                            </span>
                          )}
                          {isDownloaded && !isActive && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                              {t('downloaded')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40 mt-1">{model.size}</p>
                        <p className="text-xs text-white/60 mt-2">{getModelDescription(model)}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      {!isDownloaded ? (
                        <button
                          onClick={() => downloadModel(model)}
                          disabled={isDownloading}
                          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-bold py-2 rounded-xl transition disabled:opacity-50"
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {t('downloading')} {Math.round(progress)}%
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              {t('download')}
                            </>
                          )}
                        </button>
                      ) : (
                        <>
                          {!isActive && (
                            <button
                              onClick={() => activateModel(model.id)}
                              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-sm font-bold py-2 rounded-xl transition"
                            >
                              <Check className="w-4 h-4" />
                              {t('use_model')}
                            </button>
                          )}
                          <button
                            onClick={() => deleteModel(model.id)}
                            className="px-4 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold py-2 rounded-xl transition"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('delete')}
                          </button>
                        </>
                      )}
                    </div>
                    
                    {isDownloading && (
                      <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-300 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => setShowModelDialog(false)}
                className="w-full py-2 text-white/60 hover:text-white text-sm transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تذييل */}
      <footer className="py-6 text-center">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
          SMARTY AI ASSISTANT
        </p>
      </footer>
    </div>
  );
      }
