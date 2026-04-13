'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

interface VoiceInputProps {
  onTranscript?: (text: string) => void;
}

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  return (
    <Link href="/smart-voice">
      <button
        type="button"
        className="p-3 rounded-full transition-all duration-300 flex items-center justify-center bg-black text-white hover:bg-black/80 dark:bg-[#E65100] dark:hover:bg-[#E65100]/80 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <Sparkles className="w-5 h-5" />
      </button>
    </Link>
  );
}
