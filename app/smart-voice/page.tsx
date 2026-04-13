'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';

export default function SmartVoicePage() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const recognitionRef = useRef<any>(null);
  const { language } = useLanguage();

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
        const res = await fetch('http://localhost:5000/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text }),
        });
        const data = await res.json();
        const reply = data.reply || "عذراً، لم أستطع الرد.";
        setResponse(reply);
        setIsProcessing(false);
        setIsSpeaking(true);

        const utterance = new SpeechSynthesisUtterance(reply);
        utterance.lang = 'ar-SA';
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
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
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      {/* شريط علوي */}
      <div className="p-4 flex items-center gap-4 border-b border-outline">
        <Link href="/">
          <ArrowLeft className="w-6 h-6 text-on-surface-variant hover:text-primary transition" />
        </Link>
        <h1 className="text-xl font-semibold">سمارتي - المساعد الذكي</h1>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        {/* زر الميكروفون الكبير */}
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`
            w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300
            ${isListening ? 'bg-error scale-110 ring-4 ring-error-container' : ''}
            ${isProcessing ? 'bg-tertiary animate-pulse' : ''}
            ${isSpeaking ? 'bg-secondary' : ''}
            ${!isListening && !isProcessing && !isSpeaking ? 'bg-primary hover:bg-primary-container hover:text-on-primary-container' : ''}
            text-on-primary
          `}
        >
          {isProcessing ? (
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            (isListening || isSpeaking) ? (
              <Mic className="w-12 h-12 text-on-primary" />
            ) : (
              <MicOff className="w-12 h-12 text-on-primary" />
            )
          )}
        </button>

        {/* حالة المساعد */}
        <div className="text-center space-y-2">
          {isListening && <p className="text-error animate-pulse">🎙️ جاري الاستماع...</p>}
          {isProcessing && <p className="text-tertiary">🤔 جاري التفكير...</p>}
          {isSpeaking && <p className="text-secondary">🗣️ سمارتي يتحدث...</p>}
          {!isListening && !isProcessing && !isSpeaking && (
            <p className="text-on-surface-variant">اضغط على الميكروفون وابدأ التحدث</p>
          )}
        </div>

        {/* عرض النص المُسمع والرد */}
        <div className="w-full max-w-md space-y-4 mt-8">
          {transcript && (
            <div className="bg-surface-variant rounded-xl p-4">
              <p className="text-sm text-on-surface-variant">أنت:</p>
              <p className="text-on-surface">{transcript}</p>
            </div>
          )}
          {response && (
            <div className="bg-primary-container rounded-xl p-4">
              <p className="text-sm text-on-primary-container">سمارتي:</p>
              <p className="text-on-primary-container">{response}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
          }
