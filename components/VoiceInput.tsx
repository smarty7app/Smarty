'use client';

import React from 'react';
import { Mic } from 'lucide-react';
import Link from 'next/link';

export default function VoiceInput() {
  return (
    <Link href="/smart-voice">
      <button
        type="button"
        className="p-3 rounded-full transition-all duration-300 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700"
      >
        <Mic className="w-5 h-5" />
      </button>
    </Link>
  );
}
