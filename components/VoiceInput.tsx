'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface VoiceInputProps {
  onTranscript?: (text: string) => void;
}

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative flex flex-col items-center">
      {/* حلقات النبض الجذابة */}
      <AnimatePresence>
        {isHovered && (
          <>
            <motion.div
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-[#E65100] to-amber-500 blur-lg"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.2 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
              className="absolute inset-0 rounded-full bg-[#E65100] blur-xl"
            />
          </>
        )}
      </AnimatePresence>

      {/* الزر الرئيسي مع الرابط */}
      <Link href="/smart-voice">
        <motion.button
          type="button"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#E65100]/30 group"
        >
          {/* خلفية داكنة متدرجة */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-black shadow-2xl border border-white/10" />
          
          {/* طبقة شفافة من لون التطبيق */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#E65100]/20 to-amber-500/20 backdrop-blur-[2px]" />
          
          {/* أيقونة التطبيق شفافة في المنتصف */}
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-25 group-hover:opacity-35 transition-opacity duration-500">
            <svg className="w-14 h-14 md:w-16 md:h-16 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.32 15.1l-2.02-2.02C12.87 14.86 12.44 14.75 12 14.75s-.87.11-1.3.33L8.68 17.1c-.81.4-1.68-.3-1.68-1.1s.87-1.5 1.68-1.1l2.02 1.01c.22.11.65-.11.65-.33v-1.12c-1.93-.65-3.35-2.48-3.35-4.66 0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-1.42 4.01-3.35 4.66v1.12c0 .22.43.44.65.33l2.02-1.01c.81-.4 1.68.3 1.68 1.1s-.87 1.5-1.68 1.1z" />
            </svg>
          </div>

          {/* أيقونة Sparkles في المقدمة */}
          <div className="relative z-10">
            <Sparkles className="w-10 h-10 md:w-11 md:h-11 text-white drop-shadow-lg group-hover:text-amber-300 transition-colors duration-300" />
          </div>

          {/* تأثير توهج عند hover */}
          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#E65100]/30 to-amber-500/30 blur-md" />
        </motion.button>
      </Link>

      {/* النص أسفل الزر */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]"
      >
        AI ASSISTANT
      </motion.p>
    </div>
  );
}
