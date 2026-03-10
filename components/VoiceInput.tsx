'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLanguage } from './LanguageContext'; // استيراد السياق لربط اللغة

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { language } = useLanguage(); // الحصول على اللغة الحالية من إعدادات التطبيق

  useEffect(() => {
    // التحقق من دعم المتصفح
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('المتصفح لا يدعم التعرف على الكلام');
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    
    // --- الربط مع إعدادات اللغة ---
    if (language === 'ar') {
      recognitionInstance.lang = 'ar-DZ'; // العربية باللكنة الجزائرية (أفضل للدارجة)
    } else if (language === 'fr') {
      recognitionInstance.lang = 'fr-FR'; // الفرنسية
    } else {
      recognitionInstance.lang = 'en-US'; // الإنجليزية
    }

    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;

    recognitionInstance.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setIsListening(false);
    };

    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognitionInstance;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript, language]); // إضافة language كمراقب ليتحدث المايكروفون عند تغيير اللغة

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('المتصفح لا يدعم التعرف على الكلام');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Start error:', error);
      }
    }
  };

  return (
    <button
      onClick={toggleListening}
      className={`p-2 rounded-full transition-all duration-300 ${
        isListening 
          ? 'bg-red-500 text-white animate-pulse' 
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:scale-110'
      }`}
      title={isListening ? (language === 'ar' ? 'جاري الاستماع...' : 'Listening...') : (language === 'ar' ? 'اضغط للتحدث' : 'Tap to speak')}
    >
      {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
    </button>
  );
}
