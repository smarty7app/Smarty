'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';

const API_URL = 'https://mart-north-yacht-eat.trycloudflare.com/ask';

export default function SmartVoicePage() {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [pulsePhase, setPulsePhase] = useState(0);
  const recognitionRef = useRef<any>(null);
  const { language } = useLanguage();
  const { data: session } = useSession();
  const userId = session?.user?.id || 'anonymous';
  const userEmail = session?.user?.email || '';
  const userName = session?.user?.name || '';

  // تأثير النبض المستمر (التنفس)
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // دالة إنشاء كائن SpeechRecognition
  const createRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('متصفحك لا يدعم التعرف على الصوت');
      return null;
    }

    const instance = new SpeechRecognition();
    instance.lang = language === 'ar' ? 'ar-DZ' : 'en-US';
    instance.continuous = false;
    instance.interimResults = false;

    instance.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    instance.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsListening(false);
      setIsProcessing(true);

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            userId: userId,
            userEmail: userEmail,
            userName: userName,
          }),
        });

        const data = await res.json();
        const reply = data.reply || 'عذراً، لم أستطع الرد.';
        setResponse(reply);

        if (data.audio) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          audio.onplay = () => {
            setIsSpeaking(true);
            setIsProcessing(false);
          };
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => {
            const utterance = new SpeechSynthesisUtterance(reply);
            utterance.lang = 'ar-SA';
            utterance.onstart = () => {
              setIsSpeaking(true);
              setIsProcessing(false);
            };
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
          };
          audio.play().catch(() => {
            const utterance = new SpeechSynthesisUtterance(reply);
            utterance.lang = 'ar-SA';
            utterance.onstart = () => {
              setIsSpeaking(true);
              setIsProcessing(false);
            };
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
          });
        } else {
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.lang = 'ar-SA';
          utterance.onstart = () => {
            setIsSpeaking(true);
            setIsProcessing(false);
          };
          utterance.onend = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
        }
      } catch (error) {
        console.error(error);
        setResponse('حدث خطأ في الاتصال بالمساعد.');
        setIsProcessing(false);
      }
    };

    instance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsProcessing(false);
      
      // رسائل خطأ أكثر وضوحًا
      if (event.error === 'not-allowed') {
        setResponse('الرجاء السماح بالوصول إلى الميكروفون.');
      } else if (event.error === 'no-speech') {
        setResponse('لم يتم اكتشاف أي صوت، حاول مرة أخرى.');
      } else {
        setResponse('لم يتم التعرف على صوتك، حاول مرة أخرى.');
      }
    };

    instance.onend = () => {
      setIsListening(false);
    };

    return instance;
  }, [language, userId, userEmail, userName]);

  // تنظيف الكائن القديم عند تغيير اللغة
  useEffect(() => {
    // إيقاف أي جلسة استماع نشطة
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // تجاهل الأخطاء
      }
    }
    recognitionRef.current = null;
  }, [language]);

  const toggleListening = () => {
    // إذا كان هناك جلسة استماع نشطة، أوقفها
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    // إذا كان قيد المعالجة، لا تفعل شيئًا
    if (isProcessing) return;

    // إنشاء كائن جديد إذا لم يكن موجودًا
    if (!recognitionRef.current) {
      recognitionRef.current = createRecognition();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        // إعادة إنشاء الكائن إذا فشل البدء
        recognitionRef.current = createRecognition();
        if (recognitionRef.current) {
          setTimeout(() => {
            recognitionRef.current?.start();
          }, 50);
        }
      }
    }
  };

  // حساب حجم النبض حسب الحالة
  const getPulseScale = () => {
    if (isListening) return 1.12 + Math.sin(pulsePhase * 0.25) * 0.04;
    if (isProcessing) return 1.08 + Math.sin(pulsePhase * 0.2) * 0.03;
    if (isSpeaking) return 1.06 + Math.sin(pulsePhase * 0.15) * 0.02;
    return 1 + Math.sin(pulsePhase * 0.12) * 0.025;
  };

  // حساب شفافية الشعار حسب الحالة
  const getLogoOpacity = () => {
    if (isListening) return 0.95 + Math.sin(pulsePhase * 0.3) * 0.05;
    if (isProcessing) return 0.85;
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
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* الكائن الحي - الشعار النابض */}
        <div className="relative flex flex-col items-center justify-center">
          {/* هالة خارجية كبيرة */}
          <div
            className="absolute w-80 h-80 rounded-full bg-gradient-to-r from-[#E65100]/30 via-amber-500/20 to-[#E65100]/30 blur-3xl"
            style={{
              opacity: isListening ? 0.7 : isProcessing ? 0.5 : isSpeaking ? 0.4 : 0.25,
              transform: `scale(${getPulseScale() * 1.1})`,
              transition: 'opacity 0.5s ease, transform 0.4s ease-out',
            }}
          />

          {/* هالة متوسطة */}
          <div
            className="absolute w-64 h-64 rounded-full bg-[#E65100]/40 blur-2xl"
            style={{
              opacity: isListening ? 0.5 : isSpeaking ? 0.35 : 0.2,
              transform: `scale(${getPulseScale() * 1.05})`,
              transition: 'opacity 0.5s ease, transform 0.4s ease-out',
            }}
          />

          {/* هالة داخلية */}
          <div
            className="absolute w-52 h-52 rounded-full bg-amber-500/30 blur-xl"
            style={{
              opacity: isListening ? 0.4 : 0.15,
              transform: `scale(${getPulseScale()})`,
              transition: 'opacity 0.5s ease, transform 0.4s ease-out',
            }}
          />

          {/* الشعار الرئيسي - الكائن الحي */}
          <button
            onClick={toggleListening}
            disabled={isProcessing}
            className="relative w-44 h-44 rounded-full flex items-center justify-center focus:outline-none group cursor-pointer"
            style={{
              transform: `scale(${getPulseScale()})`,
              transition: 'transform 0.4s ease-out',
            }}
          >
            {/* الجسم الداكن */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-black via-zinc-900 to-black shadow-[0_0_80px_rgba(0,0,0,0.8)]" />

            {/* طبقة زجاجية */}
            <div className="absolute inset-0 rounded-full bg-white/5 backdrop-blur-xl border border-white/10" />

            {/* الدم - اللون البرتقالي النابض */}
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-[#E65100]/40 to-amber-500/30"
              style={{
                opacity: isListening ? 0.8 : isProcessing ? 0.6 : isSpeaking ? 0.5 : 0.25,
                transition: 'opacity 0.5s ease',
              }}
            />

            {/* شعار Smarty */}
            <div className="relative z-10">
              <svg
                className="w-24 h-24 text-white drop-shadow-2xl"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{
                  opacity: getLogoOpacity(),
                  filter: isListening ? 'drop-shadow(0 0 25px #E65100)' : 'drop-shadow(0 0 10px rgba(230,81,0,0.3))',
                  transition: 'opacity 0.3s ease, filter 0.3s ease',
                }}
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z" />
              </svg>
            </div>

            {/* تأثير hover */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition duration-700 bg-gradient-to-r from-[#E65100]/20 to-amber-500/20 blur-xl" />
          </button>

          {/* حالة الكائن */}
          <div className="mt-6 text-center">
            {isListening && (
              <p className="text-white/70 text-sm font-medium animate-pulse">أستمع إليك...</p>
            )}
            {isProcessing && (
              <p className="text-white/70 text-sm font-medium">أفكر...</p>
            )}
            {isSpeaking && (
              <p className="text-white/70 text-sm font-medium">أتحدث...</p>
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
