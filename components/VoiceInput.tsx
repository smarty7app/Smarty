'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

let OfflineSpeechRecognition: any = null;
let Capacitor: any = null;

async function loadCapacitor() {
  if (typeof window === 'undefined') return;
  if (Capacitor) return;
  try {
    // @ts-ignore
    const capacitorModule = await import('@capacitor/core');
    Capacitor = capacitorModule.Capacitor;
    if (Capacitor?.isNativePlatform()) {
      // @ts-ignore
      const offlineModule = await import('capacitor-offline-speech-recognition');
      OfflineSpeechRecognition = offlineModule.OfflineSpeechRecognition;
    }
  } catch (e) {
    console.log('Capacitor not available');
  }
}

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isSmartMode?: boolean;
}

export default function VoiceInput({ onTranscript, isSmartMode = true }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { language } = useLanguage();
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    loadCapacitor().then(() => {
      setIsNative(!!(Capacitor && Capacitor.isNativePlatform()));
    });
  }, []);

  // استخدمنا useCallback لتفادي خطأ Missing Dependency في useEffect
const handleSmartyAI = useCallback(async (text: string) => {
  setIsProcessing(true);
  try {
    const response = await fetch('/api/smarty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, lang: language }),
    });
    const data = await response.json();
    
    const utterance = new SpeechSynthesisUtterance(data.reply);
    
    // إجبار المساعد على النطق بالعربية الفصحى دائماً بغض النظر عن لغة الإدخال
    utterance.lang = 'ar-SA'; 
    
    window.speechSynthesis.speak(utterance);
    
    onTranscript(text);
  } catch (error) {
    console.error("Smarty Error:", error);
  } finally {
    setIsProcessing(false);
  }
}, [language, onTranscript]);


  useEffect(() => {
    if (isNative) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const instance = new SpeechRecognition();
    instance.lang = language === 'ar' ? 'ar-DZ' : (language === 'fr' ? 'fr-FR' : 'en-US');
    instance.continuous = false;
    instance.interimResults = false;

    instance.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (isSmartMode) {
        handleSmartyAI(transcript);
      } else {
        onTranscript(transcript);
      }
      setIsListening(false);
    };

    instance.onend = () => setIsListening(false);
    instance.onerror = () => setIsListening(false);
    
    recognitionRef.current = instance;

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [language, isNative, isSmartMode, handleSmartyAI, onTranscript]);

  const toggleListening = async () => {
    if (isNative && OfflineSpeechRecognition) {
      // منطق الكاباسيتور الخاص بك كما هو...
    } else {
      if (!recognitionRef.current) return;
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
  };

  return (
    <button
      onClick={toggleListening}
      disabled={isProcessing}
      type="button"
      className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center ${
        isListening ? 'bg-red-500 animate-pulse shadow-lg' : 'bg-zinc-800'
      }`}
    >
      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 
       isListening ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5" />}
    </button>
  );
}
