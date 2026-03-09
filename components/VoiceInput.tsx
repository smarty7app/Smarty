'use client';

import { useState } from 'react';
import { Mic } from 'lucide-react';
import { useLanguage } from './LanguageContext';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const { language } = useLanguage();

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('متصفحك لا يدعم الإدخال الصوتي');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    switch (language) {
      case 'ar': recognition.lang = 'ar-SA'; break;
      case 'en': recognition.lang = 'en-US'; break;
      case 'fr': recognition.lang = 'fr-FR'; break;
      case 'zh': recognition.lang = 'zh-CN'; break;
      default: recognition.lang = 'ar-SA';
    }

    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setError(`خطأ: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={startListening}
        disabled={isListening}
        className={`p-3 rounded-full transition-all duration-300 ${
          isListening 
            ? 'bg-blue-500 text-white animate-pulse scale-110' 
            : 'bg-[#E65100] text-white hover:bg-[#b23c00] hover:scale-105'
        } shadow-lg`}
      >
        <Mic size={20} className={isListening ? 'animate-pulse' : ''} />
      </button>
      {isListening && <span className="text-blue-500 text-sm">جاري الاستماع...</span>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
