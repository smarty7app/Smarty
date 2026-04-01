'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLanguage } from './LanguageContext';

// استيراد Capacitor Plugin بشكل آمن (لن ينفذ في الويب)
let OfflineSpeechRecognition: any;
let Capacitor: any;
if (typeof window !== 'undefined') {
  // التحقق مما إذا كان الكود يعمل داخل Capacitor
  try {
    Capacitor = require('@capacitor/core').Capacitor;
    if (Capacitor.isNativePlatform()) {
      OfflineSpeechRecognition = require('capacitor-offline-speech-recognition').OfflineSpeechRecognition;
    }
  } catch (e) {
    // Capacitor غير موجود – طبيعي في الويب
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

  // تحديد البيئة الحالية
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

  // إعداد التعرف على الصوت (مرة واحدة)
  useEffect(() => {
    if (isNative) {
      // استخدام Capacitor Offline Plugin
      // لا نحتاج إلى إعداد مسبق هنا، سيتم البدء مباشرة في toggleListening
      // يمكن تحميل النموذج عند بدء الاستماع
    } else {
      // استخدام Web Speech API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('المتصفح لا يدعم التعرف على الكلام');
        return;
      }

      const recognitionInstance = new SpeechRecognition();

      // ضبط اللغة حسب إعدادات التطبيق
      if (language === 'ar') {
        recognitionInstance.lang = 'ar-DZ'; // الدارجة الجزائرية
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
    }
  }, [language, onTranscript, isNative]); // إعادة التشغيل عند تغيير اللغة

  const toggleListening = async () => {
    if (isNative) {
      // استخدام Capacitor Offline Plugin
      if (isListening) {
        await OfflineSpeechRecognition.stopRecognition();
        setIsListening(false);
      } else {
        try {
          // تحميل نموذج اللغة (مرة واحدة فقط)
          await OfflineSpeechRecognition.downloadLanguageModel({ language: 'ar' }); // يمكن استخدام language هنا

          await OfflineSpeechRecognition.startRecognition({ language: 'ar' });

          // الاستماع للنتائج
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
