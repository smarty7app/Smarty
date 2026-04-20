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
  Check,
  Trash2,
  HardDrive,
  X,
  AlertTriangle
} from 'lucide-react';

// تعريف واجهات البيانات (بدون تغيير)
interface AIModel {
  id: string;
  name: { ar: string; en: string; fr: string };
  size: string;
  sizeMB: number;
  description: { ar: string; en: string; fr: string };
  downloadUrl: string;
  filename: string;
}

interface DownloadInfo {
  modelId: string;
  downloadedBytes: number;
  totalBytes: number;
  chunks: Uint8Array[];
  lastUpdated: number;
}

// النماذج المتوفرة للتحميل (Gemma, Llama, Phi) - نفس الشيء
const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gemma-2-2b',
    name: { ar: 'جيما 2 - 2 مليار', en: 'Gemma 2 - 2B', fr: 'Gemma 2 - 2B' },
    size: '1.5 GB',
    sizeMB: 1500,
    description: { 
      ar: 'سريع، يدعم العربية، مناسب للهواتف المتوسطة', 
      en: 'Fast, supports Arabic, suitable for mid-range phones',
      fr: 'Rapide, supporte l\'arabe, adapté aux smartphones milieu de gamme'
    },
    downloadUrl: 'https://huggingface.co/second-state/Gemma-2b-it-GGUF/resolve/main/gemma-2b-it-Q4_K_M.gguf',
    filename: 'gemma-2b-it-Q4_K_M.gguf'
  },
  {
    id: 'llama-3.2-3b',
    name: { ar: 'لاما 3.2 - 3 مليار', en: 'Llama 3.2 - 3B', fr: 'Llama 3.2 - 3B' },
    size: '2 GB',
    sizeMB: 2000,
    description: { 
      ar: 'أداء عالي، دقة ممتازة، للهواتف المتطورة', 
      en: 'High performance, excellent accuracy, for flagship phones',
      fr: 'Haute performance, excellente précision, pour smartphones haut de gamme'
    },
    downloadUrl: 'https://huggingface.co/Triangle104/Llama-3.2-3B-Instruct-Q4_K_M-GGUF/resolve/main/llama-3.2-3b-instruct-q4_k_m.gguf',
    filename: 'llama-3.2-3b-instruct-q4_k_m.gguf'
  },
  {
    id: 'phi-3.5-mini',
    name: { ar: 'فاي 3.5 مصغر', en: 'Phi-3.5 Mini', fr: 'Phi-3.5 Mini' },
    size: '1.8 GB',
    sizeMB: 1800,
    description: { 
      ar: 'خفيف الوزن، مناسب للهواتف القديمة', 
      en: 'Lightweight, suitable for older phones',
      fr: 'Léger, adapté aux anciens téléphones'
    },
    downloadUrl: 'https://huggingface.co/tensorblock/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf',
    filename: 'Phi-3.5-mini-instruct-Q4_K_M.gguf'
  }
];

// دوال مساعدة للتخزين في IndexedDB (بدون تغيير)
async function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AIModelsDB', 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('models')) db.createObjectStore('models');
      if (!db.objectStoreNames.contains('downloads')) db.createObjectStore('downloads');
    };
  });
}

async function saveModelToIndexedDB(modelId: string, blob: Blob): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['models'], 'readwrite');
    const store = transaction.objectStore('models');
    const request = store.put(blob, modelId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getModelFromIndexedDB(modelId: string): Promise<Blob | null> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['models'], 'readonly');
    const store = transaction.objectStore('models');
    const request = store.get(modelId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function deleteModelFromIndexedDB(modelId: string): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['models'], 'readwrite');
    const store = transaction.objectStore('models');
    const request = store.delete(modelId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function saveDownloadProgress(modelId: string, info: Partial<DownloadInfo>): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['downloads'], 'readwrite');
    const store = transaction.objectStore('downloads');
    const request = store.put(info, modelId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getDownloadProgress(modelId: string): Promise<Partial<DownloadInfo> | null> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['downloads'], 'readonly');
    const store = transaction.objectStore('downloads');
    const request = store.get(modelId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function deleteDownloadProgress(modelId: string): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['downloads'], 'readwrite');
    const store = transaction.objectStore('downloads');
    const request = store.delete(modelId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// دالة لتحميل نموذج Whisper المحلي (حوالي 75 ميجابايت)
async function downloadWhisperModel(
  onProgress: (percent: number) => void,
  signal: AbortSignal
): Promise<Blob> {
  const WHISPER_MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin';
  const response = await fetch(WHISPER_MODEL_URL, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        if (total > 0) onProgress((received / total) * 100);
      }
    }
  }
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const mergedArray = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    mergedArray.set(chunk, offset);
    offset += chunk.length;
  }
  return new Blob([mergedArray], { type: 'application/octet-stream' });
}

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
  
  // حالات تحميل النماذج (Gemma, Llama, Phi)
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [downloadedModels, setDownloadedModels] = useState<Set<string>>(new Set());
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // حالات تحميل نموذج Whisper المحلي
  const [whisperDownloaded, setWhisperDownloaded] = useState(false);
  const [whisperDownloading, setWhisperDownloading] = useState(false);
  const [whisperProgress, setWhisperProgress] = useState(0);
  const [showWhisperConsent, setShowWhisperConsent] = useState(false);
  const whisperAbortControllerRef = useRef<AbortController | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { language } = useLanguage();
  const { data: session } = useSession();
  const userId = session?.user?.id || 'anonymous';
  const userEmail = session?.user?.email || '';
  const userName = session?.user?.name || '';

  // التحقق من وجود نموذج Whisper في IndexedDB عند تحميل الصفحة
  useEffect(() => {
    const checkWhisperModel = async () => {
      const db = await openIndexedDB();
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.get('whisper_model');
      request.onsuccess = () => {
        if (request.result) setWhisperDownloaded(true);
      };
    };
    checkWhisperModel();
  }, []);

  // تحميل النماذج المحفوظة من IndexedDB (Gemma, Llama, Phi)
  useEffect(() => {
    const loadSavedModels = async () => {
      const db = await openIndexedDB();
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.getAllKeys();
      request.onsuccess = () => {
        const keys = request.result as string[];
        // استبعاد مفتاح whisper_model من قائمة النماذج النصية
        const modelKeys = keys.filter(key => key !== 'whisper_model');
        setDownloadedModels(new Set(modelKeys));
      };
      const savedActiveModel = localStorage.getItem('active_ai_model');
      if (savedActiveModel) setActiveModel(savedActiveModel);
      
      const pendingDownloads = await getDownloadProgress('pending');
      if (pendingDownloads) {
        const model = AVAILABLE_MODELS.find(m => m.id === pendingDownloads.modelId);
        if (model) downloadModel(model, true);
      }
    };
    loadSavedModels();
  }, []);

  useEffect(() => {
    if (activeModel) localStorage.setItem('active_ai_model', activeModel);
  }, [activeModel]);

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

  useEffect(() => {
    const interval = setInterval(() => setPulsePhase(prev => (prev + 1) % 100), 50);
    return () => clearInterval(interval);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  }, []);

  // دالة الترجمة الكاملة (مع إضافة المفاتيح الجديدة)
  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      // أزرار رئيسية
      'download_model': { ar: 'تحميل نموذج', en: 'Download Model', fr: 'Télécharger Modèle' },
      'select_model': { ar: 'اختر نموذج الذكاء الاصطناعي', en: 'Select AI Model', fr: 'Sélectionner un Modèle IA' },
      'downloaded': { ar: 'تم التحميل', en: 'Downloaded', fr: 'Téléchargé' },
      'active': { ar: 'نشط', en: 'Active', fr: 'Actif' },
      'download': { ar: 'تحميل', en: 'Download', fr: 'Télécharger' },
      'downloading': { ar: 'جاري التحميل...', en: 'Downloading...', fr: 'Téléchargement...' },
      'delete': { ar: 'حذف', en: 'Delete', fr: 'Supprimer' },
      'use_model': { ar: 'استخدام', en: 'Use', fr: 'Utiliser' },
      'switch_to_model': { ar: 'تم التبديل إلى نموذج', en: 'Switched to model', fr: 'Passé au modèle' },
      'delete_confirm': { ar: 'هل أنت متأكد من حذف هذا النموذج؟', en: 'Are you sure you want to delete this model?', fr: 'Êtes-vous sûr de vouloir supprimer ce modèle ?' },
      'close': { ar: 'إغلاق', en: 'Close', fr: 'Fermer' },
      'local': { ar: 'محلي', en: 'Local', fr: 'Local' },
      'cloud': { ar: 'سحابي', en: 'Cloud', fr: 'Cloud' },
      'cancel': { ar: 'إلغاء', en: 'Cancel', fr: 'Annuler' },
      'resume': { ar: 'استئناف', en: 'Resume', fr: 'Reprendre' },
      'cancel_download': { ar: 'إلغاء التحميل', en: 'Cancel Download', fr: 'Annuler Téléchargement' },
      
      // حالات الصوت
      'no_internet': { ar: 'لا يوجد اتصال بالإنترنت', en: 'No internet connection', fr: 'Pas de connexion internet' },
      'listening': { ar: 'يستمع إليك الآن...', en: 'Listening to you...', fr: 'Vous écoute...' },
      'recording': { ar: 'جاري التسجيل...', en: 'Recording...', fr: 'Enregistrement...' },
      'thinking': { ar: 'يفكر...', en: 'Thinking...', fr: 'Réflexion...' },
      'speaking': { ar: 'يتحدث...', en: 'Speaking...', fr: 'Parle...' },
      'tap_to_speak': { ar: 'اضغط على الشعار للتحدث مع المساعد الذكي', en: 'Tap the logo to speak with the smart assistant', fr: 'Appuyez sur le logo pour parler avec l\'assistant intelligent' },
      
      // رسائل الردود
      'loading_model': { ar: 'جاري تحميل نموذج الذكاء الاصطناعي المحلي...', en: 'Loading local AI model...', fr: 'Chargement du modèle IA local...' },
      'mic_access_failed': { ar: 'فشل الوصول إلى الميكروفون.', en: 'Failed to access microphone.', fr: 'Échec de l\'accès au microphone.' },
      'no_speech_detected': { ar: 'لم أسمع شيئاً. حاول مرة أخرى.', en: 'I didn\'t hear anything. Try again.', fr: 'Je n\'ai rien entendu. Réessayez.' },
      'allow_mic': { ar: 'الرجاء السماح بالوصول إلى الميكروفون.', en: 'Please allow microphone access.', fr: 'Veuillez autoriser l\'accès au microphone.' },
      'no_speech': { ar: 'لم يتم اكتشاف أي صوت، حاول مرة أخرى.', en: 'No speech detected, try again.', fr: 'Aucune parole détectée, réessayez.' },
      'network_error': { ar: 'خطأ في الشبكة، تحقق من اتصالك.', en: 'Network error, check your connection.', fr: 'Erreur réseau, vérifiez votre connexion.' },
      'recognition_failed': { ar: 'لم يتم التعرف على صوتك، حاول مرة أخرى.', en: 'Could not recognize your voice, try again.', fr: 'Impossible de reconnaître votre voix, réessayez.' },
      'transcription_failed': { ar: 'فشل التفريغ المحلي. تأكد من اتصالك بالإنترنت للتحميل الأولي.', en: 'Local transcription failed. Make sure you have internet for initial download.', fr: 'La transcription locale a échoué. Assurez-vous d\'avoir une connexion internet pour le téléchargement initial.' },
      'speech_synthesis_failed': { ar: 'عذراً، لم أستطع نطق الرد.', en: 'Sorry, I couldn\'t speak the response.', fr: 'Désolé, je n\'ai pas pu prononcer la réponse.' },
      'daily_limit_exceeded': { ar: 'تم تجاوز الحد اليومي للطلبات', en: 'Daily request limit exceeded', fr: 'Limite quotidienne de requêtes dépassée' },
      'connection_error': { ar: 'حدث خطأ في الاتصال بالمساعد.', en: 'Connection error with the assistant.', fr: 'Erreur de connexion avec l\'assistant.' },
      'retrying': { ar: 'محاولة إعادة الاتصال', en: 'Retrying connection', fr: 'Tentative de reconnexion' },
      
      // رسائل التحميل
      'download_success': { ar: 'تم تحميل النموذج بنجاح', en: 'Model downloaded successfully', fr: 'Modèle téléchargé avec succès' },
      'download_failed': { ar: 'فشل تحميل النموذج', en: 'Failed to download model', fr: 'Échec du téléchargement du modèle' },
      'delete_success': { ar: 'تم حذف النموذج', en: 'Model deleted', fr: 'Modèle supprimé' },
      'no_space': { ar: 'مساحة غير كافية', en: 'Insufficient space', fr: 'Espace insuffisant' },
      'download_cancelled': { ar: 'تم إلغاء التحميل', en: 'Download cancelled', fr: 'Téléchargement annulé' },
      'download_resumed': { ar: 'تم استئناف التحميل', en: 'Download resumed', fr: 'Téléchargement repris' },
      
      // مفاتيح جديدة لتحميل Whisper
      'whisper_consent_title': { ar: 'تنبيه: مطلوب تحميل نموذج إضافي', en: 'Alert: Additional Model Required', fr: 'Alerte : Modèle supplémentaire requis' },
      'whisper_consent_message': { ar: 'لتشغيل السكرتير الذكي بدون إنترنت، يجب تحميل نموذج التعرف على الصوت (حوالي 75 ميجابايت). هل توافق على التحميل الآن؟', en: 'To use the smart assistant offline, you need to download the speech recognition model (approx. 75 MB). Do you agree to download now?', fr: 'Pour utiliser l\'assistant intelligent hors ligne, vous devez télécharger le modèle de reconnaissance vocale (environ 75 Mo). Acceptez-vous de télécharger maintenant ?' },
      'agree': { ar: 'موافق', en: 'Agree', fr: 'Accepter' },
      'decline': { ar: 'رفض', en: 'Decline', fr: 'Refuser' },
      'downloading_whisper': { ar: 'جاري تحميل نموذج التعرف على الصوت...', en: 'Downloading speech recognition model...', fr: 'Téléchargement du modèle de reconnaissance vocale...' },
      'whisper_download_success': { ar: 'تم تحميل نموذج التعرف على الصوت بنجاح. يمكنك الآن استخدام السكرتير الذكي بدون إنترنت.', en: 'Speech recognition model downloaded successfully. You can now use the smart assistant offline.', fr: 'Modèle de reconnaissance vocale téléchargé avec succès. Vous pouvez maintenant utiliser l\'assistant intelligent hors ligne.' },
      'whisper_download_failed': { ar: 'فشل تحميل نموذج التعرف على الصوت. تأكد من اتصالك بالإنترنت.', en: 'Failed to download speech recognition model. Check your internet connection.', fr: 'Échec du téléchargement du modèle de reconnaissance vocale. Vérifiez votre connexion Internet.' },
    };
    return translations[key]?.[language] || translations[key]?.en || key;
  };

  const getModelName = (model: AIModel): string => model.name[language as keyof typeof model.name] || model.name.en;
  const getModelDescription = (model: AIModel): string => model.description[language as keyof typeof model.description] || model.description.en;

  // دالة تحميل النموذج النصي (Gemma, Llama, Phi) - بدون تغيير
  const downloadModel = async (model: AIModel, resume: boolean = false) => {
    if (!isOnline) {
      setResponse(t('no_internet'));
      return;
    }
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const availableMB = (estimate.quota! - estimate.usage!) / (1024 * 1024);
      if (availableMB < model.sizeMB + 100) {
        setResponse(`${t('no_space')}. ${t('need_space')} ${model.sizeMB + 100} MB`);
        return;
      }
    }
    setDownloadingModel(model.id);
    setDownloadProgress(prev => ({ ...prev, [model.id]: 0 }));
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    let startByte = 0;
    let existingChunks: Uint8Array[] = [];
    if (resume) {
      const savedProgress = await getDownloadProgress(model.id);
      if (savedProgress && savedProgress.downloadedBytes) {
        startByte = savedProgress.downloadedBytes;
        existingChunks = savedProgress.chunks || [];
      }
    }
    try {
      const headers: HeadersInit = {};
      if (startByte > 0) headers.Range = `bytes=${startByte}-`;
      const response = await fetch(model.downloadUrl, { headers, signal: abortControllerRef.current.signal });
      if (!response.ok && response.status !== 206) throw new Error(t('download_failed'));
      const total = parseInt(response.headers.get('content-length') || '0', 10) + startByte;
      const reader = response.body?.getReader();
      const chunks = [...existingChunks];
      let received = startByte;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            const progress = (received / total) * 100;
            setDownloadProgress(prev => ({ ...prev, [model.id]: progress }));
            if (Math.floor(Date.now() / 5000) !== Math.floor((Date.now() - 100) / 5000)) {
              await saveDownloadProgress(model.id, { modelId: model.id, downloadedBytes: received, totalBytes: total, chunks, lastUpdated: Date.now() });
            }
          }
        }
      }
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const mergedArray = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) { mergedArray.set(chunk, offset); offset += chunk.length; }
      const blob = new Blob([mergedArray], { type: 'application/octet-stream' });
      await saveModelToIndexedDB(`model_${model.id}`, blob);
      await deleteDownloadProgress(model.id);
      setDownloadedModels(prev => new Set(prev).add(model.id));
      setResponse(`✅ ${t('download_success')}: ${getModelName(model)}`);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Smarty AI', { body: `${t('download_success')}: ${getModelName(model)}` });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') setResponse(`⏸️ ${t('download_cancelled')}`);
      else { console.error(error); setResponse(`❌ ${t('download_failed')}: ${error.message || t('unknown_error')}`); }
    } finally {
      setDownloadingModel(null);
      abortControllerRef.current = null;
      setDownloadProgress(prev => { const newProgress = { ...prev }; delete newProgress[model.id]; return newProgress; });
    }
  };

  const cancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setResponse(`⏸️ ${t('download_cancelled')}`);
      setDownloadingModel(null);
    }
  };

  const deleteModel = async (modelId: string) => {
    if (confirm(t('delete_confirm'))) {
      await deleteModelFromIndexedDB(`model_${modelId}`);
      setDownloadedModels(prev => { const newSet = new Set(prev); newSet.delete(modelId); return newSet; });
      if (activeModel === modelId) setActiveModel(null);
      setResponse(`🗑️ ${t('delete_success')}`);
    }
  };

  const activateModel = (modelId: string) => {
    setActiveModel(modelId);
    const selectedModel = AVAILABLE_MODELS.find(m => m.id === modelId);
    const modelName = selectedModel ? getModelName(selectedModel) : modelId;
    setResponse(`${t('switch_to_model')} ${modelName}`);
    setShowModelDialog(false);
  };

  // دالة بدء تحميل نموذج Whisper بعد موافقة المستخدم
  const startWhisperDownload = async () => {
    if (!isOnline) {
      setResponse(t('no_internet'));
      return;
    }
    setShowWhisperConsent(false);
    setWhisperDownloading(true);
    setWhisperProgress(0);
    if (whisperAbortControllerRef.current) whisperAbortControllerRef.current.abort();
    whisperAbortControllerRef.current = new AbortController();
    try {
      const blob = await downloadWhisperModel((p) => setWhisperProgress(p), whisperAbortControllerRef.current.signal);
      await saveModelToIndexedDB('whisper_model', blob);
      setWhisperDownloaded(true);
      setResponse(t('whisper_download_success'));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        setResponse(t('whisper_download_failed'));
      }
    } finally {
      setWhisperDownloading(false);
      whisperAbortControllerRef.current = null;
    }
  };

  // تعديل دالة startLocalRecording لطلب تحميل Whisper إذا لم يكن محملاً
  const startLocalRecording = useCallback(async () => {
    // إذا كان الوضع محلياً ولم يتم تحميل نموذج Whisper بعد، نعرض نافذة الموافقة
    if (useLocalWhisper && !whisperDownloaded && !whisperDownloading) {
      setShowWhisperConsent(true);
      return;
    }
    // إذا كان لا يزال قيد التحميل، نعطي رسالة انتظار
    if (useLocalWhisper && whisperDownloading) {
      setResponse(t('downloading_whisper'));
      return;
    }
    // باقي الكود الأصلي للتسجيل
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
        setResponse(t('loading_model'));
        try {
          const text = await transcribeLocal(audioBlob);
          setTranscript(text);
          await processText(text);
        } catch (error) {
          console.error('Local transcription error:', error);
          setResponse(t('transcription_failed'));
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
          setResponse(t('no_speech_detected'));
        }
      }, 10000);
    } catch (error) {
      console.error('Mic error:', error);
      setResponse(t('mic_access_failed'));
    }
  }, [clearSilenceTimer, processText, t, useLocalWhisper, whisperDownloaded, whisperDownloading]);

  // دالة معالجة النص (بدون تغيير)
  const processText = useCallback(async (text: string) => {
    setIsProcessing(true);
    try {
      if (!isOnline) throw new Error(t('no_internet'));
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, userId, userEmail, userName, model: activeModel })
      });
      if (!res.ok) { if (res.status === 429) throw new Error(t('daily_limit_exceeded')); throw new Error(`API error: ${res.status}`); }
      const reply = await res.text();
      setResponse(reply);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(reply);
      utterance.lang = 'ar-SA'; utterance.rate = 1.0; utterance.pitch = 1.0;
      utterance.onstart = () => { setIsSpeaking(true); setIsProcessing(false); };
      utterance.onend = () => { setIsSpeaking(false); setRetryCount(0); };
      utterance.onerror = () => { setIsSpeaking(false); setIsProcessing(false); setResponse(t('speech_synthesis_failed')); };
      window.speechSynthesis.speak(utterance);
    } catch (error: any) {
      console.error(error);
      if (retryCount < 3 && error.message.includes('fetch')) {
        setRetryCount(prev => prev + 1);
        setResponse(`${t('retrying')} (${retryCount + 1}/3)...`);
        setTimeout(() => processText(text), 2000);
      } else { setResponse(error.message || t('connection_error')); setIsProcessing(false); }
    }
  }, [isOnline, userId, userEmail, userName, retryCount, activeModel, t]);

  // دالة إنشاء كائن SpeechRecognition (بدون تغيير)
  const createRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert(t('recognition_failed')); return null; }
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
      silenceTimerRef.current = setTimeout(() => { if (isListening) recognitionRef.current?.stop(); setResponse(t('no_speech_detected')); }, 10000);
    };
    instance.onaudiostart = () => clearSilenceTimer();
    instance.onaudioend = () => clearSilenceTimer();
    instance.onresult = (event: any) => {
      clearSilenceTimer();
      let interimTranscript = '', finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcriptPart;
        else interimTranscript += transcriptPart;
      }
      if (interimTranscript) setTranscript(interimTranscript);
      if (finalTranscript) { setTranscript(finalTranscript); setIsListening(false); processText(finalTranscript); }
    };
    instance.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false); setIsProcessing(false); clearSilenceTimer();
      switch (event.error) {
        case 'not-allowed': setResponse(t('allow_mic')); break;
        case 'no-speech': setResponse(t('no_speech')); break;
        case 'network': setResponse(t('network_error')); break;
        default: setResponse(t('recognition_failed'));
      }
    };
    instance.onend = () => { setIsListening(false); clearSilenceTimer(); };
    return instance;
  }, [language, processText, clearSilenceTimer, isListening, t]);

  useEffect(() => {
    if (recognitionRef.current) try { recognitionRef.current.abort(); } catch(e) {}
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    recognitionRef.current = null; mediaRecorderRef.current = null; clearSilenceTimer();
  }, [language, clearSilenceTimer]);

  const cleanupMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') try { mediaRecorderRef.current.stop(); } catch(e) {}
      if (mediaRecorderRef.current.stream) mediaRecorderRef.current.stream.getTracks().forEach(track => { if (track.readyState === 'live') track.stop(); });
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  const toggleListening = () => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); }
    if (isListening) {
      if (useLocalWhisper && mediaRecorderRef.current?.state === 'recording') { mediaRecorderRef.current.stop(); clearSilenceTimer(); setIsListening(false); return; }
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
      clearSilenceTimer(); setIsListening(false); return;
    }
    if (isProcessing) return;
    if (useLocalWhisper) startLocalRecording();
    else {
      if (!isOnline) { setResponse(t('no_internet')); return; }
      cleanupMediaRecorder();
      recognitionRef.current = createRecognition();
      try { recognitionRef.current?.start(); } catch(error) { setTimeout(() => { recognitionRef.current = createRecognition(); recognitionRef.current?.start(); }, 100); }
    }
  };

  const getPulseScale = () => {
    if (isListening) return 1.12 + Math.sin(pulsePhase * 0.25) * 0.04;
    if (isProcessing || isModelLoading) return 1.08 + Math.sin(pulsePhase * 0.2) * 0.03;
    if (isSpeaking) return 1.06 + Math.sin(pulsePhase * 0.15) * 0.02;
    return 1 + Math.sin(pulsePhase * 0.12) * 0.025;
  };

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
        <button onClick={() => router.back()} className="p-1"><ArrowLeft className="w-6 h-6 text-white/70 hover:text-white transition" /></button>
        <h1 className="text-xl font-black text-white">Smarty <span className="text-[10px] font-bold opacity-40">AI VOICE</span></h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowModelDialog(true)} className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/30 to-purple-600/20 text-purple-200 hover:from-purple-500/40 border border-purple-500/30"><Download className="w-3 h-3" />{t('download_model')}{activeModel && <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-1"></span>}</button>
          {!isOnline && <WifiOff className="w-4 h-4 text-red-400" />}
          <button onClick={() => setUseLocalWhisper(!useLocalWhisper)} className={`text-[10px] font-bold px-2 py-1 rounded-full transition ${useLocalWhisper ? 'bg-purple-500/30 text-purple-200' : 'bg-white/10 text-white/60'}`}>{useLocalWhisper ? t('local') : t('cloud')}</button>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="relative flex flex-col items-center justify-center">
          <div className="absolute w-80 h-80 rounded-full bg-gradient-to-r from-[#E65100]/30 via-amber-500/20 to-[#E65100]/30 blur-3xl" style={{ opacity: isListening ? 0.7 : isProcessing ? 0.5 : isSpeaking ? 0.4 : 0.25, transform: `scale(${getPulseScale() * 1.1})`, transition: 'opacity 0.5s ease, transform 0.4s ease-out' }} />
          <div className="absolute w-64 h-64 rounded-full bg-[#E65100]/40 blur-2xl" style={{ opacity: isListening ? 0.5 : isSpeaking ? 0.35 : 0.2, transform: `scale(${getPulseScale() * 1.05})`, transition: 'opacity 0.5s ease, transform 0.4s ease-out' }} />
          <div className="absolute w-52 h-52 rounded-full bg-amber-500/30 blur-xl" style={{ opacity: isListening ? 0.4 : 0.15, transform: `scale(${getPulseScale()})`, transition: 'opacity 0.5s ease, transform 0.4s ease-out' }} />
          <button onClick={toggleListening} disabled={isProcessing && !isSpeaking} className="relative w-44 h-44 rounded-full flex items-center justify-center focus:outline-none group cursor-pointer" style={{ transform: `scale(${getPulseScale()})`, transition: 'transform 0.4s ease-out' }}>
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
          <div className="mt-6 text-center min-h-[24px]">
            {!isOnline && <div className="flex items-center justify-center gap-2 text-red-400"><WifiOff className="w-4 h-4" /><p className="text-sm font-medium">{t('no_internet')}</p></div>}
            {activeModel && <div className="flex items-center justify-center gap-2 text-green-400/70 mb-2"><HardDrive className="w-3 h-3" /><p className="text-[10px] font-medium">{AVAILABLE_MODELS.find(m => m.id === activeModel) ? getModelName(AVAILABLE_MODELS.find(m => m.id === activeModel)!) : activeModel}</p></div>}
            {isModelLoading && <div className="flex items-center justify-center gap-2 text-purple-300"><Loader2 className="w-4 h-4 animate-spin" /><p className="text-sm font-medium">{t('loading_model')}</p></div>}
            {isListening && <div className="flex items-center justify-center gap-2"><Mic className="w-4 h-4 text-white/70 animate-pulse" /><p className="text-white/70 text-sm font-medium">{useLocalWhisper ? t('recording') : t('listening')}</p></div>}
            {isProcessing && !isModelLoading && <div className="flex items-center justify-center gap-2"><Sparkles className="w-4 h-4 text-amber-300 animate-pulse" /><p className="text-white/70 text-sm font-medium">{t('thinking')}</p></div>}
            {isSpeaking && <div className="flex items-center justify-center gap-2"><Volume2 className="w-4 h-4 text-emerald-300" /><p className="text-white/70 text-sm font-medium">{t('speaking')}</p></div>}
            {!isListening && !isProcessing && !isSpeaking && !isModelLoading && isOnline && <div className="flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4 text-white/40" /><p className="text-white/40 text-xs font-medium tracking-wide">{t('tap_to_speak')}</p></div>}
          </div>
        </div>
        <div className="w-full max-w-md space-y-4 mt-10">
          {transcript && <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10"><p className="text-xs font-bold text-white/40 uppercase tracking-wider">{t('you')}</p><p className="text-white text-lg font-medium mt-1">{transcript}</p></div>}
          {response && <div className="bg-gradient-to-r from-[#E65100]/20 to-amber-500/20 backdrop-blur-md rounded-2xl p-5 border border-white/10"><p className="text-xs font-bold text-white/40 uppercase tracking-wider">{t('smarty')}</p><p className="text-white text-lg font-medium mt-1">{response}</p></div>}
        </div>
      </div>

      {/* حوار اختيار وتحميل النماذج النصية (Gemma, Llama, Phi) */}
      {showModelDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowModelDialog(false)}>
          <div className="bg-gradient-to-br from-zinc-900 to-black rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-black/90 backdrop-blur-md p-4 border-b border-white/10 flex justify-between items-center"><h2 className="text-lg font-bold text-white">{t('select_model')}</h2><button onClick={() => setShowModelDialog(false)} className="p-1 hover:bg-white/10 rounded-full"><X className="w-5 h-5 text-white/60" /></button></div>
            <div className="p-4 space-y-3">
              {AVAILABLE_MODELS.map(model => {
                const isDownloaded = downloadedModels.has(`model_${model.id}`);
                const isActive = activeModel === model.id;
                const isDownloading = downloadingModel === model.id;
                const progress = downloadProgress[model.id] || 0;
                return (
                  <div key={model.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-2"><div><div className="flex items-center gap-2 flex-wrap"><h3 className="font-bold text-white">{getModelName(model)}</h3>{isActive && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">{t('active')}</span>}{isDownloaded && !isActive && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{t('downloaded')}</span>}</div><p className="text-xs text-white/40 mt-1">{model.size}</p><p className="text-xs text-white/60 mt-2">{getModelDescription(model)}</p></div></div>
                    <div className="flex gap-2 mt-3">
                      {!isDownloaded ? (
                        <>
                          <button onClick={() => downloadModel(model, false)} disabled={isDownloading} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-bold py-2 rounded-xl transition disabled:opacity-50">
                            {isDownloading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('downloading')} {Math.round(progress)}%</> : <><Download className="w-4 h-4" />{t('download')}</>}
                          </button>
                          {isDownloading && <button onClick={cancelDownload} className="px-4 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold py-2 rounded-xl transition"><X className="w-4 h-4" />{t('cancel')}</button>}
                        </>
                      ) : (
                        <>
                          {!isActive && <button onClick={() => activateModel(model.id)} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-sm font-bold py-2 rounded-xl transition"><Check className="w-4 h-4" />{t('use_model')}</button>}
                          <button onClick={() => deleteModel(model.id)} className="px-4 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold py-2 rounded-xl transition"><Trash2 className="w-4 h-4" />{t('delete')}</button>
                        </>
                      )}
                    </div>
                    {isDownloading && <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-purple-300 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-white/10"><button onClick={() => setShowModelDialog(false)} className="w-full py-2 text-white/60 hover:text-white text-sm transition">{t('close')}</button></div>
          </div>
        </div>
      )}

      {/* نافذة الموافقة لتحميل نموذج Whisper */}
      {showWhisperConsent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowWhisperConsent(false)}>
          <div className="bg-gradient-to-br from-zinc-900 to-black rounded-2xl max-w-md w-full border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{t('whisper_consent_title')}</h3>
              <p className="text-white/70 text-sm mb-6">{t('whisper_consent_message')}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowWhisperConsent(false)} className="flex-1 py-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition"> {t('decline')} </button>
                <button onClick={startWhisperDownload} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold hover:from-purple-500 transition"> {t('agree')} </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* شريط تقدم تحميل Whisper (يظهر أثناء التحميل) */}
      {whisperDownloading && (
        <div className="fixed bottom-20 left-4 right-4 bg-black/90 backdrop-blur-md rounded-2xl p-4 border border-white/10 z-50">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{t('downloading_whisper')}</p>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-300 rounded-full transition-all duration-300" style={{ width: `${whisperProgress}%` }} />
              </div>
            </div>
            <button onClick={() => whisperAbortControllerRef.current?.abort()} className="text-white/60 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <footer className="py-6 text-center"><p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">SMARTY AI ASSISTANT</p></footer>
    </div>
  );
}
