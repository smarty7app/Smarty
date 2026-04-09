'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export default function VoiceInput({ onTranscript, isSmartMode = true }: { onTranscript: (t: string) => void, isSmartMode?: boolean }) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { language } = useLanguage();

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
      utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';
      window.speechSynthesis.speak(utterance);
      onTranscript(text);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  }, [language, onTranscript]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const instance = new SpeechRecognition();
    instance.lang = language === 'ar' ? 'ar-DZ' : 'en-US';
    instance.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (isSmartMode) handleSmartyAI(transcript);
      else onTranscript(transcript);
      setIsListening(false);
    };
    instance.onend = () => setIsListening(false);
    recognitionRef.current = instance;
  }, [language, isSmartMode, handleSmartyAI, onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("المتصفح لا يدعم التعرف على الصوت");
    if (isListening) recognitionRef.current.stop();
    else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <button onClick={toggleListening} disabled={isProcessing} className="p-3 rounded-full bg-zinc-800">
      {isProcessing ? <Loader2 className="animate-spin" /> : isListening ? <Mic className="text-red-500" /> : <MicOff />}
    </button>
  );
}
