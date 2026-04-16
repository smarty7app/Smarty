'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      console.warn('Speech recognition not supported');
    }
  }, []);

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('المتصفح لا يدعم التعرف على الصوت');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-DZ';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setPulseAnimation(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setIsListening(false);
      setPulseAnimation(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setPulseAnimation(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setPulseAnimation(false);
    };
  };

  if (!isSupported) return null;

  return (
    <div className="relative flex flex-col items-center">
      {/* حلقات النبض المتحركة */}
      <AnimatePresence>
        {pulseAnimation && (
          <>
            <motion.div
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-[#E65100] to-amber-500 blur-xl"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
              className="absolute inset-0 rounded-full bg-[#E65100] blur-2xl"
            />
          </>
        )}
      </AnimatePresence>

      {/* زر الميكروفون الرئيسي */}
      <motion.button
        onClick={handleVoiceInput}
        disabled={isListening}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-28 h-28 rounded-full flex items-center justify-center focus:outline-none disabled:opacity-80 disabled:cursor-not-allowed group"
      >
        {/* خلفية متدرجة داكنة مع شفافية */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-black shadow-2xl border border-white/10" />
        
        {/* طبقة شفافة من لون التطبيق */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#E65100]/20 to-amber-500/20 backdrop-blur-[2px]" />
        
        {/* أيقونة التطبيق شفافة في المنتصف */}
        <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-30 group-hover:opacity-40 transition-opacity duration-500">
          <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z" />
          </svg>
        </div>

        {/* أيقونة الميكروفون في المقدمة */}
        <div className="relative z-10">
          {isListening ? (
            <Volume2 className="w-10 h-10 text-[#E65100] animate-pulse" />
          ) : (
            <Mic className="w-10 h-10 text-white drop-shadow-lg" />
          )}
        </div>

        {/* تأثير توهج عند hover */}
        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#E65100]/20 to-amber-500/20 blur-md" />
      </motion.button>

      {/* النص أسفل الزر */}
      <AnimatePresence mode="wait">
        {isListening ? (
          <motion.p
            key="listening"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 text-white/70 text-sm font-medium tracking-wide flex items-center gap-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E65100] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E65100]" />
            </span>
            جاري الاستماع...
          </motion.p>
        ) : (
          <motion.p
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 text-white/40 text-xs font-bold uppercase tracking-[0.3em]"
          >
            SMARTY AI ASSISTANT
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};
