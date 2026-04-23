'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, CheckCircle2, X, Loader2 } from 'lucide-react';
import { formatDetectedTime, type SmartParsedResult } from '@/lib/date-parser';
import { analyzeReminderInput } from '@/lib/date-parser'; // للاستخراج المحلي

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reminderData?: {
    text: string;
    time: string;
    recurring?: string;
  };
}

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputText: string;
  setInputText: (text: string) => void;
  recurring: string;
  setRecurring: (value: string) => void;
  handleAddReminder: () => void;
  t: any;
  smartParsed: SmartParsedResult | null;
  setSmartParsed: (result: SmartParsedResult | null) => void;
  activeSuggestions?: string[];
  language: string;
  getTimeBeforeLabel?: (eventTime: Date, reminderTime: Date) => string;
  format?: any;
  arDZ: any;
  onReminderTimeDetected?: (time: string) => void;
}

export default function AddReminderModal({
  isOpen,
  onClose,
  inputText,
  setInputText,
  recurring,
  setRecurring,
  handleAddReminder,
  t,
  smartParsed,
  setSmartParsed,
  language,
  onReminderTimeDetected,
}: AddReminderModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'مرحباً! أنا مساعدك الذكي. يمكنك كتابة تذكير بالوقت والتاريخ، أو سؤالي عن أي شيء. مثلاً: "ذكرني بموعد الطبيب غداً الساعة 3 مساءً"',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingReminder, setPendingReminder] = useState<{ text: string; time: string; recurring?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // تمرير إلى الأسفل تلقائياً
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // تركيز على حقل الإدخال عند الفتح
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      // إعادة تعيين الدردشة عند الإغلاق (اختياري)
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: 'مرحباً! أنا مساعدك الذكي. يمكنك كتابة تذكير بالوقت والتاريخ، أو سؤالي عن أي شيء. مثلاً: "ذكرني بموعد الطبيب غداً الساعة 3 مساءً"',
        },
      ]);
      setPendingReminder(null);
      setInput('');
    }
  }, [isOpen]);

  // دالة للاستخراج باستخدام الذكاء الاصطناعي (محلي أو API)
  const parseReminderFromText = async (text: string): Promise<{ success: boolean; reminderTime?: string; parsedText?: string; error?: string }> => {
    try {
      // أولاً نحاول التحليل المحلي السريع
      const localResult = analyzeReminderInput(text);
      if (localResult && localResult.reminderTime && new Date(localResult.reminderTime) > new Date()) {
        return {
          success: true,
          reminderTime: localResult.reminderTime,
          parsedText: localResult.parsedText,
        };
      }

      // إذا فشل المحلي، نستخدم الذكاء الاصطناعي (Groq)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `استخرج من النص التالي: التاريخ والوقت (بصيغة ISO)، ونص التذكير بعد إزالة كلمات الأمر. أعد فقط JSON بهذا الشكل: {"reminderTime": "ISO string", "parsedText": "نص التذكير"}. النص: "${text}"`,
          model: 'llama-3.3-70b-versatile',
        }),
      });
      if (!res.ok) throw new Error('AI request failed');
      const reply = await res.text();
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid JSON');
      const parsed = JSON.parse(jsonMatch[0]);
      const date = new Date(parsed.reminderTime);
      if (isNaN(date.getTime()) || date <= new Date()) throw new Error('Invalid or past date');
      return {
        success: true,
        reminderTime: parsed.reminderTime,
        parsedText: parsed.parsedText || text,
      };
    } catch (error: any) {
      console.error('Parse error:', error);
      return { success: false, error: error.message };
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // إضافة رسالة مؤقتة للمساعد
    const tempAssistantId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      { id: tempAssistantId, role: 'assistant', content: 'جاري التفكير...' },
    ]);

    try {
      // محاولة استخراج تذكير من النص
      const parseResult = await parseReminderFromText(userMsg.content);
      if (parseResult.success && parseResult.reminderTime && parseResult.parsedText) {
        // نعرض ملخص التذكير ونطلب التأكيد
        const formattedTime = formatDetectedTime(parseResult.reminderTime, language as 'ar' | 'fr' | 'en');
        const confirmMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `📝 **تم استخراج التذكير التالي:**\n\n- **النص:** ${parseResult.parsedText}\n- **الوقت:** ${formattedTime}\n\nهل تريد حفظ هذا التذكير؟ (أجب بنعم أو لا)`,
          reminderData: {
            text: parseResult.parsedText,
            time: parseResult.reminderTime,
            recurring: 'none', // يمكنك تحسين استخراج التكرار لاحقاً
          },
        };
        setMessages(prev => prev.filter(m => m.id !== tempAssistantId).concat(confirmMsg));
        setPendingReminder(confirmMsg.reminderData);
      } else {
        // ليس تذكيراً، نرد برد عام
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userMsg.content,
            model: 'llama-3.3-70b-versatile',
          }),
        });
        const reply = await res.text();
        setMessages(prev => prev.filter(m => m.id !== tempAssistantId).concat({
          id: Date.now().toString(),
          role: 'assistant',
          content: reply,
        }));
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempAssistantId).concat({
        id: Date.now().toString(),
        role: 'assistant',
        content: 'عذراً، حدث خطأ. حاول مرة أخرى.',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReminder = () => {
    if (pendingReminder) {
      // تعبئة الحقول في المكون الأب
      setInputText(pendingReminder.text);
      if (onReminderTimeDetected) onReminderTimeDetected(pendingReminder.time);
      setRecurring(pendingReminder.recurring || 'none');
      // استدعاء الحفظ
      handleAddReminder();
      // إغلاق المودال بعد الحفظ
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;
  const DRAG_THRESHOLD = 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onClose()} />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 45, stiffness: 400, mass: 1 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.05}
          onDragEnd={(event, info) => { if (info.offset.y > DRAG_THRESHOLD) onClose(); }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col"
        >
          <div className="sticky top-0 bg-white dark:bg-zinc-900 p-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
            <h2 className="text-xl font-black">المساعد الذكي</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-[300px] max-h-[60vh]">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-[#E65100] text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.reminderData && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={handleConfirmReminder}
                        className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" /> حفظ التذكير
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>يكتب...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب تذكيراً أو اسأل..."
              className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#E65100]"
              rows={1}
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-[#E65100] hover:bg-[#BF3F00] disabled:opacity-50 text-white rounded-xl px-4 py-2 transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
              }
