import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, ImagePlus, X, Paperclip, FileText, File, FileArchive, FileImage, AlertCircle } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, image?: { data: string; mimeType: string }) => void;
  onSendFile?: (message: string, file: { data: string; mimeType: string; name: string }) => void;
  isLoading: boolean;
  t: {
    placeholder: string;
    delete: string;
  };
  lang: string;
  isDarkMode?: boolean;
}

// أيقونات الملفات حسب نوع MIME
const getFileIcon = (mimeType: string, size = 20) => {
  if (mimeType.startsWith('image/')) return <FileImage size={size} />;
  if (mimeType === 'application/pdf') return <FileText size={size} />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText size={size} />;
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType === 'text/csv') return <FileText size={size} />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <FileArchive size={size} />;
  if (mimeType === 'text/plain') return <FileText size={size} />;
  return <File size={size} />;
};

// تنسيق حجم الملف (بايت إلى KB/MB)
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ChatInput({ onSend, onSendFile, isLoading, t, lang, isDarkMode }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; preview: string; name: string; size: number } | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ data: string; mimeType: string; name: string; size: number; preview?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 ميجابايت

  const clearError = useCallback(() => setErrorMsg(null), []);

  const handleSend = useCallback(() => {
    if ((input.trim() || selectedImage) && !isLoading) {
      onSend(input.trim(), selectedImage ? { data: selectedImage.data, mimeType: selectedImage.mimeType } : undefined);
      setInput("");
      setSelectedImage(null);
      clearError();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  }, [input, selectedImage, isLoading, onSend, clearError]);

  const handleSendFile = useCallback(() => {
    if ((input.trim() || selectedFile) && !isLoading && onSendFile) {
      onSendFile(input.trim(), selectedFile!);
      setInput("");
      setSelectedFile(null);
      clearError();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  }, [input, selectedFile, isLoading, onSendFile, clearError]);

  const processImageFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg(`الملف كبير جداً. الحد الأقصى ${formatFileSize(MAX_FILE_SIZE)}.`);
      return false;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      setSelectedImage({
        data: base64String,
        mimeType: file.type,
        preview: result,
        name: file.name,
        size: file.size
      });
      clearError();
    };
    reader.readAsDataURL(file);
    return true;
  };

  const processGenericFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg(`الملف كبير جداً. الحد الأقصى ${formatFileSize(MAX_FILE_SIZE)}.`);
      return false;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      setSelectedFile({
        data: base64String,
        mimeType: file.type,
        name: file.name,
        size: file.size,
        preview: result
      });
      clearError();
    };
    reader.readAsDataURL(file);
    return true;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processGenericFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // سحب وإفلات
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isLoading) return;

    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    const file = files[0];

    if (file.type.startsWith('image/')) {
      processImageFile(file);
    } else if (onSendFile) {
      processGenericFile(file);
    } else {
      setErrorMsg("يُسمح فقط برفع الصور.");
    }
  };

  // إلغاء تحديد الصورة أو الملف
  const clearImage = () => setSelectedImage(null);
  const clearFile = () => setSelectedFile(null);

  // تغيير ارتفاع الـ textarea تلقائياً
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // إغلاق الخطأ بعد 5 ثوانٍ
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const canSend = (input.trim() || selectedImage || selectedFile) && !isLoading;
  const isFileMode = !!selectedFile;
  const isImageMode = !!selectedImage;

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col gap-2 p-2 border transition-all duration-300 ${
        isDarkMode ? 'bg-white/[0.04] border-white/[0.07]' : 'bg-white border-slate-200 shadow-md'
      } rounded-2xl input-glow ${isDragging ? 'border-orange-500 bg-orange-500/5 ring-2 ring-orange-500/30' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* رسالة خطأ */}
      {errorMsg && (
        <div className="mx-2 mt-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={clearError} className="opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* عرض الصورة المختارة */}
      {selectedImage && (
        <div className="relative inline-block self-start m-2 group">
          <div className="relative w-20 h-20 overflow-hidden rounded-lg border border-white/20 shadow-sm">
            <img src={selectedImage.preview} alt={selectedImage.name} className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] font-bold px-1 py-0.5 text-center truncate">
            {selectedImage.name.length > 15 ? selectedImage.name.slice(0, 12) + '...' : selectedImage.name}
          </div>
          <button 
            onClick={clearImage}
            className={`absolute -top-2 ${lang === 'ar' ? '-left-2' : '-right-2'} bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors z-10`}
            title={t.delete}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* عرض الملف المختار */}
      {selectedFile && !selectedImage && (
        <div className={`relative flex items-center gap-3 p-2 m-2 rounded-xl border ${
          isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="p-1.5 rounded-lg bg-white/20">
            {getFileIcon(selectedFile.mimeType, 20)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs opacity-60">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button 
            onClick={clearFile}
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
          disabled={isLoading}
        />
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={isLoading || !!(selectedImage || selectedFile)}
          className={`flex-shrink-0 p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
          title="رفع صورة"
        >
          <ImagePlus size={20} />
        </button>

        {/* زر رفع الملفات العامة */}
        {onSendFile && (
          <>
            <input 
              type="file" 
              accept=".pdf,.txt,.docx,.doc,.csv,.xlsx,.xls,.pptx,.ppt,.zip,.rar,.json,.xml,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || !!(selectedImage || selectedFile)}
              className={`flex-shrink-0 p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
              title="رفع ملف"
            >
              <Paperclip size={20} />
            </button>
          </>
        )}

        {/* حقل النص */}
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

        {/* زر الإرسال */}
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

      {/* إرشاد السحب والإفلات */}
      {isDragging && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl z-20 backdrop-blur-sm pointer-events-none">
          <div className="bg-orange-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg">
            أفلت الملف هنا لرفعه
          </div>
        </div>
      )}
    </div>
  );
          }
