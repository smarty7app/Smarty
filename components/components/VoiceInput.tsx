'use client';

import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

export function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');

  const startListening = () => {
    // التأكد من دعم المتصفح
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('متصفحك لا يدعم الإدخال الصوتي');
      return;
    }

    // تهيئة التعرف على الكلام
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'ar-SA'; // العربية (يمكنك تغييرها حسب لغة المستخدم)
    recognition.continuous = false; // لا تستمر في الاستماع بعد انتهاء الجملة
    recognition.interimResults = false; // النتائج النهائية فقط

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript); // إرسال النص إلى المكون الأب
      setIsListening(false);
    };

    recognition.onerror = (event) => {
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
        className={`p-3 rounded-full transition ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'bg-[#E65100] text-white hover:bg-[#b23c00]'
        }`}
      >
        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
