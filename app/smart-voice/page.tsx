'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";

// الرابط العام من Cloudflare Tunnel
const API_URL = 'https://mart-north-yacht-eat.trycloudflare.com/ask';

export default function SmartVoicePage() {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const recognitionRef = useRef<any>(null);
  const { language } = useLanguage();
  const { data: session } = useSession();
  const userId = session?.user?.id || 'anonymous';
  const userEmail = session?.user?.email || '';
  const userName = session?.user?.name || '';  
  
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("متصفحك لا يدعم التعرف على الصوت");
      return;
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
          body: JSON.stringify({ prompt: text, 
          userId: userId, 
          userEmail: userEmail,
          userName: userName }),
          
        }); 
        
        const data = await res.json();
        const reply = data.reply || "عذراً، لم أستطع الرد.";
        setResponse(reply);
        
        // استخدام الصوت من API (Edge-TTS) إذا كان موجوداً
        if (data.audio) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          audio.onplay = () => {
            setIsSpeaking(true);
            setIsProcessing(false);
          };
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = (e) => {
            console.error("Audio playback error:", e);
            // fallback: استخدام SpeechSynthesis إذا فشل تشغيل الصوت
            const utterance = new SpeechSynthesisUtterance(reply);
            utterance.lang = 'ar-SA';
            utterance.onstart = () => {
              setIsSpeaking(true);
              setIsProcessing(false);
            };
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
          };
          audio.play().catch(e => {
            console.error("Audio play error:", e);
            // fallback: استخدام SpeechSynthesis إذا فشل التشغيل
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
          // استخدام SpeechSynthesis كبديل إذا لم يكن هناك صوت من API
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
        setResponse("حدث خطأ في الاتصال بالمساعد.");
        setIsProcessing(false);
      }
    };

    instance.onerror = () => {
      setIsListening(false);
      setIsProcessing(false);
      setResponse("لم يتم التعرف على صوتك، حاول مرة أخرى.");
    };

    instance.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = instance;

    return () => instance.abort();
  }, [language]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  return (
    <div className="min-h-screen bg-[#E65100] dark:bg-black flex flex-col transition-colors duration-300">
      {/* شريط علوي شفاف */}
      <div className="sticky top-0 bg-black/10 dark:bg-white/5 backdrop-blur-md px-6 py-4 flex items-center gap-4 border-b border-white/10 dark:border-white/5">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft className="w-6 h-6 text-white/70 dark:text-white/70 hover:text-white dark:hover:text-white transition" />
        </button>
        <h1 className="text-xl font-black text-white dark:text-white">Smarty <span className="text-[10px] font-bold opacity-40">AI VOICE</span></h1>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-10">
        {/* زر الميكروفون الفخم */}
<div className="relative flex flex-col items-center">
  {/* حلقات النبض */}
  {(isListening || isProcessing) && (
    <>
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#E65100] to-amber-500 blur-xl opacity-40 animate-pulse" />
      <div className="absolute inset-0 rounded-full bg-[#E65100] blur-2xl opacity-20 animate-ping" />
    </>
  )}

  <button
    onClick={toggleListening}
    disabled={isProcessing}
    className="relative w-36 h-36 rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#E65100]/30 group"
  >
    {/* خلفية داكنة متدرجة */}
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-black shadow-2xl border border-white/10" />
    
    {/* طبقة شفافة من لون التطبيق */}
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#E65100]/20 to-amber-500/20 backdrop-blur-[2px]" />
    
    {/* أيقونة التطبيق شفافة في المنتصف */}
    <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-25 group-hover:opacity-35 transition-opacity duration-500">
      <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z" />
      </svg>
    </div>

    {/* الأيقونة في المقدمة */}
    <div className="relative z-10">
      {isProcessing ? (
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      ) : isListening ? (
        <Mic className="w-14 h-14 text-white drop-shadow-lg" />
      ) : isSpeaking ? (
        <Volume2 className="w-14 h-14 text-white drop-shadow-lg" />
      ) : (
        <Mic className="w-14 h-14 text-white drop-shadow-lg group-hover:text-amber-300 transition-colors duration-300" />
      )}
    </div>

    {/* تأثير توهج عند hover */}
    <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#E65100]/30 to-amber-500/30 blur-md" />
  </button>

  {/* النص أسفل الزر */}
  <p className="mt-6 text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">
    SMARTY AI ASSISTANT
  </p>
</div>

        {/* عرض النص المُسمع والرد */}
        <div className="w-full max-w-md space-y-4 mt-8">
          {transcript && (
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5">
              <p className="text-xs font-bold text-white/60 dark:text-white/60 uppercase tracking-wider">أنت:</p>
              <p className="text-white dark:text-white text-lg font-bold mt-1">{transcript}</p>
            </div>
          )}
          {response && (
            <div className="bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-2xl p-5">
              <p className="text-xs font-bold text-white/60 dark:text-white/60 uppercase tracking-wider">سمارتي:</p>
              <p className="text-white dark:text-white text-lg font-bold mt-1">{response}</p>
            </div>
          )}
        </div>
      </div>

      {/* تذييل بسيط */}
      <footer className="py-6 text-center">
        <p className="text-[10px] font-black text-white/30 dark:text-white/30 uppercase tracking-widest">Smarty AI Assistant • تحدث بطلاقة</p>
      </footer>
    </div>
  );
}
