'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isSmartMode?: boolean;
}

export default function VoiceInput({ onTranscript, isSmartMode = true }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { language } = useLanguage();

  const handleSmartyAI = useCallback(async (text: string) => {
    setIsProcessing(true);
    try {
      // تحديث الرابط العام إلى الرابط الحالي
      const response = await fetch('https://their-wish-volumes-always.trycloudflare.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await response.json();
      const reply = data.reply || data.error || "عذراً، لم أستطع فهمك.";
      const utterance = new SpeechSynthesisUtterance(reply);
      utterance.lang = 'ar-SA';
      window.speechSynthesis.speak(utterance);
      onTranscript(reply);
    } catch (error) {
      console.error("Smarty Error:", error);
      onTranscript("عذراً، لم أستطع الاتصال بالمساعد.");
    } finally {
      setIsProcessing(false);
    }
  }, [onTranscript]);

  useEffect(() => {
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
  }, [language, isSmartMode, handleSmartyAI, onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
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
