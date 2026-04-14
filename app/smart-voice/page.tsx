'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";

// الرابط العام من Cloudflare Tunnel
const API_URL = 'https://compression-weblog-girls-adventures.trycloudflare.com/ask';

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
        {/* زر الميكروفون الكبير */}
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`
            w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl
            ${isListening ? 'bg-white scale-110 ring-4 ring-white/50 dark:ring-white/30' : ''}
            ${isProcessing ? 'bg-white/80 dark:bg-white/60 animate-pulse' : ''}
            ${isSpeaking ? 'bg-white/80 dark:bg-white/60' : ''}
            ${!isListening && !isProcessing && !isSpeaking ? 'bg-white dark:bg-white hover:scale-105' : ''}
          `}
        >
          {isProcessing ? (
            <div className="w-12 h-12 border-4 border-[#E65100] dark:border-[#E65100] border-t-transparent rounded-full animate-spin" />
          ) : (
            (isListening || isSpeaking) ? (
              <Mic className="w-16 h-16 text-[#E65100] dark:text-[#E65100]" />
            ) : (
              <MicOff className="w-16 h-16 text-[#E65100] dark:text-[#E65100]" />
            )
          )}
        </button>

        {/* حالة المساعد */}
        <div className="text-center space-y-2">
          {isListening && <p className="text-white/90 dark:text-white/90 font-bold animate-pulse">🎙️ جاري الاستماع...</p>}
          {isProcessing && <p className="text-white/90 dark:text-white/90 font-bold">🤔 جاري التفكير...</p>}
          {isSpeaking && <p className="text-white/90 dark:text-white/90 font-bold">🗣️ سمارتي يتحدث...</p>}
          {!isListening && !isProcessing && !isSpeaking && (
            <p className="text-white/70 dark:text-white/70 font-bold">اضغط على الميكروفون وابدأ التحدث</p>
          )}
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
