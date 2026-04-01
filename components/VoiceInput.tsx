'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLanguage } from './LanguageContext';

// تعريف متغيرات Capacitor (سيتم تعبئتها لاحقًا)
let OfflineSpeechRecognition: any = null;
let Capacitor: any = null;

// هذه الدالة تُستخدم لتحميل Capacitor فقط في المتصفح بعد التأكد من وجوده
async function loadCapacitor() {
  if (typeof window === 'undefined') return;
  if (Capacitor) return; // تم التحميل مسبقًا

  try {
    // استخدام import() مع webpackIgnore لمنع Webpack من محاولة حل الحزمة
    const capacitorModule = await import(/* webpackIgnore: true */ '@capacitor/core');
    Capacitor = capacitorModule.Capacitor;

    if (Capacitor?.isNativePlatform()) {
      const offlineModule = await import(/* webpackIgnore: true */ 'capacitor-offline-speech-recognition');
      OfflineSpeechRecognition = offlineModule.OfflineSpeechRecognition;
    }
  } catch (e) {
    console.log('Capacitor not available, using web speech');
  }
}

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { language } = useLanguage();

  // تحديد ما إذا كنا في بيئة Capacitor أصلية (بعد تحميلها)
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // نحاول تحميل Capacitor مرة واحدة عند تحميل المكون
    loadCapacitor().then(() => {
      setIsNative(!!(Capacitor && Capacitor.isNativePlatform()));
    });
  }, []);

  // إعداد Web Speech API للمتصفح (عند عدم وجود Capacitor)
  useEffect(() => {
    if (isNative) {
      // لا نحتاج لإعداد Web Speech، لأننا سنستخدم Capacitor
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('المتصفح لا يدعم التعرف على الكلام');
      return;
    }

    const recognitionInstance = new SpeechRecognition();

    // ضبط اللغة حسب إعدادات التطبيق
    if (language === 'ar') {
      recognitionInstance.lang = 'ar-DZ';
    } else if (language === 'fr') {
      recognitionInstance.lang = 'fr-FR';
    } else {
      recognitionInstance.lang = 'en-US';
    }

    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;

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

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, onTranscript, isNative]);

  const toggleListening = async () => {
    if (isNative && OfflineSpeechRecognition) {
      // استخدام Capacitor Offline Plugin
      if (isListening) {
        await OfflineSpeechRecognition.stopRecognition();
        setIsListening(false);
      } else {
        try {
          await OfflineSpeechRecognition.downloadLanguageModel({ language: 'ar' });
          await OfflineSpeechRecognition.startRecognition({ language: 'ar' });

          OfflineSpeechRecognition.addListener('recognitionResult', (result: any) => {
            onTranscript(result.text);
            setIsListening(false);
          });

          OfflineSpeechRecognition.addListener('recognitionError', (error: any) => {
            console.error('Speech error:', error);
            setIsListening(false);
          });

          setIsListening(true);
        } catch (error) {
          console.error('Failed to start offline recognition:', error);
        }
      }
    } else {
      // استخدام Web Speech API
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
    }
  };

  return (
    <button
      onClick={toggleListening}
      type="button"
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
      {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
    </button>
  );
    }
