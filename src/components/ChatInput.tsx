import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, ImagePlus, X, Paperclip, FileText, File, FileArchive, FileImage } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, image?: { data: string; mimeType: string }) => void;
  onSendFile?: (message: string, file: { data: string; mimeType: string; name: string }) => void; // جديد
  isLoading: boolean;
  t: {
    placeholder: string;
    delete: string;
  };
  lang: string;
  isDarkMode?: boolean;
}

// دالة مساعدة لإظهار أيقونة الملف
const getFileIcon = (mimeType: string, size = 20) => {
  if (mimeType.startsWith('image/')) return <FileImage size={size} />;
  if (mimeType === 'application/pdf') return <FileText size={size} />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText size={size} />;
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType === 'text/csv') return <FileText size={size} />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <FileArchive size={size} />;
  if (mimeType === 'text/plain') return <FileText size={size} />;
  return <File size={size} />;
};

export default function ChatInput({ onSend, onSendFile, isLoading, t, lang, isDarkMode }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ data: string; mimeType: string; name: string; preview?: string } | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((input.trim() || selectedImage) && !isLoading) {
      onSend(input.trim(), selectedImage ? { data: selectedImage.data, mimeType: selectedImage.mimeType } : undefined);
      setInput("");
      setSelectedImage(null);
    }
  };

  const handleSendFile = () => {
    if ((input.trim() || selectedFile) && !isLoading && onSendFile) {
      onSendFile(input.trim(), selectedFile!);
      setInput("");
      setSelectedFile(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (selectedFile && onSendFile) {
        handleSendFile();
      } else {
        handleSend();
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // الحجم الأقصى 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert("الملف كبير جداً. الحد الأقصى 10 ميجابايت.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64String = result.split(',')[1];
        setSelectedFile({
          data: base64String,
          mimeType: file.type,
          name: file.name,
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

  const canSend = (input.trim() || selectedImage || selectedFile) && !isLoading;
  const isFileMode = !!selectedFile;

  return (
    <div className={`relative flex flex-col gap-2 p-2 border transition-all duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-lg'} rounded-2xl`}>
      {/* عرض الصورة المختارة */}
      {selectedImage && (
        <div className="relative inline-block self-start m-2">
          <div className="relative w-20 h-20 overflow-hidden rounded-lg">
            <img src={selectedImage.preview} alt="" className="w-full h-full object-cover" />
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

      {/* عرض الملف المختار */}
      {selectedFile && (
        <div className={`relative flex items-center gap-3 p-2 m-2 rounded-xl border ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`}>
          <div className="p-1.5 rounded-lg bg-white/20">
            {getFileIcon(selectedFile.mimeType, 20)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs opacity-60">{Math.round(selectedFile.data.length * 0.75 / 1024)} KB</p>
          </div>
          <button 
            onClick={() => setSelectedFile(null)}
            className="p-1 rounded-full hover:bg-black/10 transition-colors"
            title={t.delete}
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      <div className="flex items-end gap-2">
        {/* زر رفع الصورة */}
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={imageInputRef}
          onChange={handleImageChange}
        />
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={isLoading || !!selectedImage || !!selectedFile}
          className={`flex-shrink-0 p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
          title="رفع صورة"
        >
          <ImagePlus size={20} />
        </button>

        {/* زر رفع الملف (PDF, TXT, DOCX, إلخ) - يظهر فقط إذا تم توفير onSendFile */}
        {onSendFile && (
          <>
            <input 
              type="file" 
              accept=".pdf,.txt,.docx,.doc,.csv,.xlsx,.xls,.pptx,.ppt,.zip,.rar,.json,.xml,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || !!selectedImage || !!selectedFile}
              className={`flex-shrink-0 p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
              title="رفع ملف"
            >
              <Paperclip size={20} />
            </button>
          </>
        )}

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
          onClick={isFileMode && onSendFile ? handleSendFile : handleSend}
          disabled={!canSend}
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
