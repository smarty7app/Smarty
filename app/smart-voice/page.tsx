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
  MessageCircle 
} from 'lucide-react';

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
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { language } = useLanguage();
  const { data: session } = useSession();
  const userId = session?.user?.id || 'anonymous';
  const userEmail = session?.user?.email || '';
  const userName = session?.user?.name || '';

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

  // ✅ دالة معالجة النص (مشتركة بين Web Speech و Whisper) - تم نقلها إلى الأعلى
  const processText = useCallback(async (text: string) => {
    setIsProcessing(true);
    try {
      if (!isOnline) throw new Error('لا يوجد اتصال بالإنترنت');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, userId, userEmail, userName }),
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
  }, [isOnline, userId, userEmail, userName, retryCount]);

  // ✅ دالة بدء التسجيل المحلي (Whisper)
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

// أضف هذه الدالة المساعدة قبل تعريف toggleListening (مثلاً بعد الـ useCallback الأخرى)
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

// ثم قم بتعديل دالة toggleListening كالتالي:
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
    // ✅ التعديل الأساسي: تنظيف أي MediaRecorder معلق قبل بدء recognition
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

      {/* تذييل */}
      <footer className="py-6 text-center">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
          SMARTY AI ASSISTANT
        </p>
      </footer>
    </div>
  );
}
