'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Send, Sparkles, CheckCircle2, Loader2, User, Bot, XCircle 
} from 'lucide-react';
import { 
  analyzeReminderInput, 
  formatDetectedTime, 
  type SmartParsedResult 
} from '@/lib/date-parser';

// ✅ دالة مساعدة للتحقق من صحة التاريخ
function isValidDateString(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
      id: 'welcome',
      role: 'assistant',
      content: 'مرحباً! 👋 أنا مساعدك الذكي. يمكنك كتابة تذكير مثل "ذكرني باجتماع غداً الساعة 10 صباحاً"، أو اسألني عن أي شيء. سأقوم بتحويل طلباتك إلى تذكيرات وحفظها تلقائياً.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingReminder, setPendingReminder] = useState<{ text: string; time: string; recurring?: string } | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // مفتاح التخزين المؤقت
  const DRAFT_STORAGE_KEY = 'smarty_reminder_draft';

  // مراقبة حالة الاتصال بالإنترنت
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // تحميل المسودة عند فتح المودال
  useEffect(() => {
    if (isOpen) {
      const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.inputText && typeof draft.inputText === 'string') {
            setInput(draft.inputText);
          }
          if (draft.recurring && typeof draft.recurring === 'string') {
            setRecurring(draft.recurring);
          }
        } catch (e) {
          console.error('Failed to load draft reminder', e);
        }
      }
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, setInputText, setRecurring]);

  // تمرير إلى أسفل المحادثة تلقائياً
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // دالة الإغلاق الداخلية
  const handleClose = (saveDraft: boolean) => {
    if (saveDraft && input.trim()) {
      const draft = {
        inputText: input,
        recurring,
        savedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } else if (!saveDraft) {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      setInput('');
      setRecurring('none');
    }
    onClose();
  };

  // استخراج التذكير من النص (AI أولاً، ثم محلي)
  const extractReminder = async (text: string): Promise<{ success: boolean; reminderTime?: string; parsedText?: string; error?: string }> => {
    if (isOnline) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `استخرج من النص التالي التاريخ والوقت (بصيغة ISO 8601) ونص التذكير النظيف. أجب فقط بكائن JSON بهذا الشكل: {"reminderTime": "YYYY-MM-DDTHH:mm:ss.sssZ", "parsedText": "نص التذكير"}. النص: "${text}"`,
            model: 'llama-3.3-70b-versatile',
          }),
        });
        if (!response.ok) throw new Error('AI request failed');
        const reply = await response.text();
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
        console.error('AI extraction error:', error);
      }
    }

    // التحليل المحلي (احتياطي)
    const localResult = analyzeReminderInput(text);
    if (localResult && isValidDateString(localResult.reminderTime)) {
      const date = new Date(localResult.reminderTime);
      if (date > new Date()) {
        return {
          success: true,
          reminderTime: localResult.reminderTime,
          parsedText: localResult.parsedText,
        };
      }
    }
    return { success: false, error: 'لم نتمكن من استخراج وقت صالح للتذكير. يرجى كتابة الوقت بشكل أوضح.' };
  };

  // دالة مساعدة لحفظ التذكير بشكل مباشر (لضمان الإضافة الفورية وإغلاق المودال)
  const addReminderDirectly = (reminder: { text: string; time: string; recurring?: string }) => {
    setInputText(reminder.text);
    if (onReminderTimeDetected) onReminderTimeDetected(reminder.time);
    setRecurring(reminder.recurring || 'none');
    handleAddReminder();
    onClose(); // إغلاق المودال بعد الحفظ لرؤية التذكير الجديد فوراً
  };

  // إرسال رسالة المستخدم
  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsProcessing(true);

    const thinkingId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      {
        id: thinkingId,
        role: 'assistant',
        content: '🤔 جاري التفكير...',
        timestamp: new Date(),
      },
    ]);

    try {
      const reminder = await extractReminder(userInput);
      if (reminder.success && reminder.reminderTime && reminder.parsedText) {
        setMessages(prev => prev.filter(m => m.id !== thinkingId));
        const formattedTime = formatDetectedTime(reminder.reminderTime, language as 'ar' | 'fr' | 'en');
        const confirmMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `📝 **تم استخراج التذكير التالي:**\n\n• **الوصف:** ${reminder.parsedText}\n• **الوقت:** ${formattedTime}\n\nهل تريد حفظ هذا التذكير؟`,
          timestamp: new Date(),
          reminderData: {
            text: reminder.parsedText,
            time: reminder.reminderTime,
            recurring: 'none',
          },
        };
        setMessages(prev => [...prev, confirmMessage]);
        setPendingReminder(confirmMessage.reminderData);
      } else {
        let reply = '';
        if (isOnline) {
          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: userInput, model: 'llama-3.3-70b-versatile' }),
            });
            reply = await response.text();
          } catch (err) {
            reply = 'عذراً، لا يمكنني الاتصال بالإنترنت حالياً. يرجى المحاولة لاحقاً.';
          }
        } else {
          reply = 'أنت غير متصل بالإنترنت حالياً. يمكنك كتابة تذكير بالوقت والتاريخ بشكل واضح، وسأحاول معالجته محلياً.';
        }
        setMessages(prev => prev.filter(m => m.id !== thinkingId).concat({
          id: Date.now().toString(),
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        }));
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== thinkingId).concat({
        id: Date.now().toString(),
        role: 'assistant',
        content: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
        timestamp: new Date(),
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  // حفظ التذكير المؤكد
  const handleConfirmReminder = () => {
    if (pendingReminder) {
      addReminderDirectly(pendingReminder);
      setPendingReminder(null);
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      setInput('');
      setRecurring('none');
    }
  };

  // إلغاء التذكير المعلق
  const handleCancelReminder = () => {
    if (pendingReminder) {
      setPendingReminder(null);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: '❌ تم إلغاء التذكير. يمكنك كتابة تذكير آخر أو طرح سؤال.',
          timestamp: new Date(),
        },
      ]);
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
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => handleClose(true)} />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 45, stiffness: 400, mass: 1 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.05}
          onDragEnd={(event, info) => { if (info.offset.y > DRAG_THRESHOLD) handleClose(true); }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        >
          {/* رأس النافذة */}
          <div className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#E65100] to-amber-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-black dark:text-white">المساعد الذكي</h2>
            </div>
            <button onClick={() => handleClose(true)} className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          {/* منطقة المحادثة */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[60vh]">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === 'user' 
                      ? 'bg-[#E65100]/20 text-[#E65100]' 
                      : 'bg-gradient-to-br from-[#E65100] to-amber-500 text-white'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`rounded-2xl px-4 py-2 ${
                    msg.role === 'user' 
                      ? 'bg-[#E65100] text-white' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                    {msg.reminderData && (
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          onClick={handleConfirmReminder}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> حفظ
                        </button>
                        <button
                          onClick={handleCancelReminder}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition"
                        >
                          <XCircle className="w-3.5 h-3.5" /> إلغاء
                        </button>
                      </div>
                    )}
                    <div className={`text-[10px] mt-1 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isProcessing && !messages.some(m => m.content === '🤔 جاري التفكير...') && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E65100]" />
                  <span className="text-sm">يجري التفكير...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* شريط الإدخال */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب تذكيراً أو اسأل..."
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#E65100] text-black dark:text-white text-sm"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isProcessing}
                className="bg-[#E65100] hover:bg-[#BF3F00] disabled:opacity-50 text-white rounded-full p-2 transition shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 text-center mt-2">
              يمكنك كتابة تذكير مثل &quot;ذكرني بموعد الطبيب غداً الساعة 3 مساءً&quot;
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
          }
