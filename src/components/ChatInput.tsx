import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, ImagePlus, X } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, image?: { data: string; mimeType: string }) => void;
  isLoading: boolean;
  t: {
    placeholder: string;
    delete: string;
  };
  lang: string;
  isDarkMode?: boolean;
}

export default function ChatInput({ onSend, isLoading, t, lang, isDarkMode }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((input.trim() || selectedImage) && !isLoading) {
      onSend(input.trim(), selectedImage ? { data: selectedImage.data, mimeType: selectedImage.mimeType } : undefined);
      setInput("");
      setSelectedImage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If it's Cmd+Enter or Ctrl+Enter, send the message
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
    // Otherwise, normal behavior (Enter alone adds a new line in a textarea)
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64String = result.split(',')[1];
        setSelectedImage({
          data: base64String,
          mimeType: file.type,
          preview: result
        });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className={`relative flex flex-col gap-2 p-2 border transition-all duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-lg'} rounded-2xl`}>
      {selectedImage && (
        <div className={`relative inline-block self-start m-2`}>
          <div className="relative w-20 h-20 overflow-hidden rounded-lg">
            <img 
              src={selectedImage.preview} 
              alt="" 
              className="w-full h-full object-cover"
            />
          </div>
          <button 
            onClick={() => setSelectedImage(null)}
            className={`absolute -top-2 ${lang === 'ar' ? '-left-2' : '-right-2'} bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors z-10`}
            title={t.delete}
          >
            <X size={14} />
          </button>
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <input 
          type="file" 
          role="button"
          aria-label="Upload image"
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || !!selectedImage}
          className={`flex-shrink-0 p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
          title={t.placeholder}
        >
          <ImagePlus size={20} />
        </button>

        <div className="flex-1 relative flex items-center">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
            className={`w-full max-h-[150px] py-3 px-1 rounded-lg transition-all resize-none text-[15px] font-medium leading-relaxed custom-scrollbar bg-transparent border-none ${
              isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'
            } focus:outline-none ${lang === 'ar' ? 'text-right' : 'text-left'}`}
            disabled={isLoading}
            dir="auto"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={(!input.trim() && !selectedImage) || isLoading}
          className={`flex-shrink-0 p-3 rounded-xl transition-all shadow-md group ${
            isDarkMode
              ? 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none'
              : 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className={`w-5 h-5 ${lang === 'ar' ? '' : 'rotate-180 rtl:rotate-0'}`} />
          )}
        </button>
      </div>
    </div>

  );
}
