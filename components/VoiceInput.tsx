'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLanguage } from './LanguageContext'; // تأكد أن المسار صحيح حسب مشروعك

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { language } = useLanguage(); // جلب اللغة الحالية من Context التطبيق

  useEffect(() => {
    // 1. التحقق من دعم المتصفح (Chrome, Edge, Safari)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('المتصفح لا يدعم التعرف على الكلام');
      return;
    }

    // 2. إنشاء نسخة التعرف على الصوت
    const recognitionInstance = new SpeechRecognition();
    
    // 3. ضبط اللغة بناءً على إعدادات التطبيق (دقة عالية)
    if (language === 'ar') {
      recognitionInstance.lang = 'ar-DZ'; // الدارجة الجزائرية (الأكثر دقة للهجتنا)
    } else if (language === 'fr') {
      recognitionInstance.lang = 'fr-FR'; // الفرنسية
    } else {
      recognitionInstance.lang = 'en-US'; // الإنجليزية
    }

    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;

    // 4. معالجة النتائج
    recognitionInstance.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setIsListening(false);
    };

    recognitionInstance.onerror = (event: any) => {
      console.error('Speech Recognition Error:', event.error);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognitionInstance;

    // تنظيف (Cleanup) عند إغلاق المكون
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript, language]); // إعادة التشغيل فقط عند تغيير اللغة أو الدالة

  const toggleListening = () => {
    if (!recognitionRef.current) {
      const errorMsg = language === 'ar' ? 'المتصفح لا يدعم هذه الميزة' : 'Browser not supported';
      alert(errorMsg);
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
      type="button" // لمنع عمل Submit للفورم بالخطأ
      className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center ${
        isListening 
          ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' 
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
      }`}
      title={isListening 
        ? (language === 'ar' ? 'جاري الاستماع...' : 'Listening...') 
        : (language === 'ar' ? 'اضغط للتحدث' : 'Tap to speak')
      }
    >
      {isListening ? (
        <Mic className="w-5 h-5" />
      ) : (
        <MicOff className="w-5 h-5" />
      )}
    </button>
  );
}
