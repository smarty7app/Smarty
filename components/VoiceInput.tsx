'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react'; // أضفنا Loader2
import { useLanguage } from './LanguageContext';

// ... (نفس أكواد تحميل Capacitor و OfflineSpeechRecognition دون تغيير) ...

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isSmartMode?: boolean; // خاصية جديدة لتفعيل وضع السكرتير
}

export default function VoiceInput({ onTranscript, isSmartMode = true }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // لحالة تفكير الذكاء الاصطناعي
  const recognitionRef = useRef<any>(null);
  const { language } = useLanguage();
  const [isNative, setIsNative] = useState(false);

  // دالة لتحويل النص إلى صوت (TTS) - مجانية وبسيطة
  const speakResponse = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // دالة التعامل مع الذكاء الاصطناعي
  const handleSmartyAI = async (text: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/smarty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, lang: language }),
      });
      
      const data = await response.json();
      
      // نطق الرد
      speakResponse(data.reply);
      
      // إرسال النص للواجهة إذا كنت تريد عرضه
      onTranscript(text); 
    } catch (error) {
      console.error("Smarty Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // ... (كود الـ useEffect الخاص بـ SpeechRecognition) ...
    // التعديل الوحيد هنا هو استدعاء handleSmartyAI بدلاً من onTranscript مباشرة
    recognitionInstance.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (isSmartMode) {
        handleSmartyAI(transcript);
      } else {
        onTranscript(transcript);
      }
      setIsListening(false);
    };
    // ...
  }, [language, onTranscript, isNative, isSmartMode]);

  return (
    <button
      onClick={toggleListening}
      disabled={isProcessing}
      type="button"
      className={`p-4 rounded-full transition-all duration-500 flex items-center justify-center ${
        isListening 
          ? 'bg-blue-500 scale-110 shadow-[0_0_20px_rgba(59,130,246,0.5)]' 
          : isProcessing 
          ? 'bg-amber-500 animate-spin'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:scale-105'
      } border-2 border-white/10 backdrop-blur-md`}
    >
      {isProcessing ? (
        <Loader2 className="w-6 h-6 animate-spin text-white" />
      ) : isListening ? (
        <Mic className="w-6 h-6 text-white animate-pulse" />
      ) : (
        <MicOff className="w-6 h-6" />
      )}
    </button>
  );
}
