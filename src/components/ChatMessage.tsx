import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, ZoomIn, Download, Sparkles, FileText, File, FileImage, FileArchive, Loader2, AlertCircle } from "lucide-react";
import ImageModal from "./ImageModal";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: 'user' | 'model';
  text: string;
  status?: 'thinking' | 'generating';
  image?: {
    data: string;      // يمكن أن يكون base64 أو رابط URL
    mimeType: string;
    url?: string;      // في حالة استخدام الرابط مباشرة
  };
  file?: {
    data: string;
    mimeType: string;
    name: string;
  };
  key?: React.Key;
  t: {
    zoom: string;
    download: string;
    thinking: string;
    generatingImage: string;
  };
  isDarkMode?: boolean;
  isLoading?: boolean;
}

// دالة مساعدة لعرض أيقونة مناسبة حسب نوع الملف
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <FileImage size={24} />;
  if (mimeType === 'application/pdf') return <FileText size={24} />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText size={24} />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <FileArchive size={24} />;
  return <File size={24} />;
};

// دالة لتحويل base64 إلى رابط تحميل للملفات (غير الصور)
const getFileUrl = (base64: string, mimeType: string) => {
  return `data:${mimeType};base64,${base64}`;
};

// دالة للتحقق مما إذا كانت الصورة بصيغة URL
const isImageUrl = (str: string): boolean => {
  return str.startsWith('http://') || str.startsWith('https://');
};

export default function ChatMessage({ role, text, status, image, file, t, isDarkMode, isLoading }: ChatMessageProps) {
  const isUser = role === 'user';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  
  // تحديد مصدر الصورة النهائي
  let imageUrl: string | null = null;
  let isUrl = false;
  
  if (image) {
    if (image.url) {
      imageUrl = image.url;
      isUrl = true;
    } else if (image.data) {
      if (isImageUrl(image.data)) {
        imageUrl = image.data;
        isUrl = true;
      } else {
        // افتراض أنه base64
        imageUrl = `data:${image.mimeType};base64,${image.data}`;
        isUrl = false;
      }
    }
  }

  // إعادة تعيين حالة الخطأ عند تغيير الصورة
  useEffect(() => {
    setImageLoadError(false);
    setImageLoading(!!imageUrl);
  }, [imageUrl]);

  const handleDownload = (e: React.MouseEvent, url: string, filename: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageDownload = (e: React.MouseEvent) => {
    if (!imageUrl) return;
    // استخراج الامتداد من mimeType أو افتراض png
    let ext = 'png';
    if (image?.mimeType) {
      ext = image.mimeType.split('/')[1] || 'png';
    }
    handleDownload(e, imageUrl, `ai-generated-${Date.now()}.${ext}`);
  };

  const handleFileDownload = (e: React.MouseEvent) => {
    if (!file) return;
    const url = getFileUrl(file.data, file.mimeType);
    handleDownload(e, url, file.name);
  };

  const handleImageError = () => {
    setImageLoadError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex w-full mb-6 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        dir="auto"
      >
        <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <div 
            className={`flex flex-col gap-3 ${
              isUser ? 'items-end text-right' : 'items-start text-left'
            }`}
          >
            {/* حالة التحميل (النص والصورة) */}
            {isLoading && !text && !image && !file && (
              <div className="flex flex-col gap-2">
                {status === 'thinking' && (
                  <div className={`px-4 py-3 rounded-2xl rounded-tr-none shadow-sm border flex items-center gap-3 ${
                    isDarkMode ? 'bg-slate-800 border-white/[0.07] text-slate-400' : 'bg-white border-slate-100 text-slate-500'
                  }`}>
                    <span className="text-sm italic">{t.thinking}</span>
                  </div>
                )}
                
                {status === 'generating' && (
                  <div className={`w-full max-w-[300px] aspect-square rounded-2xl border flex flex-col items-center justify-center p-8 text-center gap-4 ${
                    isDarkMode ? 'bg-slate-800 border-white/[0.07]' : 'bg-white border-slate-100'
                  }`}>
                    <p className="text-sm font-medium text-slate-500">{t.generatingImage}</p>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <motion.div 
                           key={i}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ delay: i * 0.2, repeat: Infinity, duration: 1 }}
                          className="w-1.5 h-1.5 rounded-full bg-orange-500" 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* عرض الصورة مع دعم كل من base64 والروابط، مع تحسينات التحميل والأخطاء */}
            {image && imageUrl && (
              <div className="relative">
                {/* مؤشر تحميل الصورة */}
                {imageLoading && (
                  <div className={`absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl z-10 backdrop-blur-sm`}>
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  </div>
                )}
                
                {/* رسالة خطأ عند فشل التحميل */}
                {imageLoadError && (
                  <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border text-center gap-3 ${
                    isDarkMode ? 'bg-slate-800 border-red-500/30' : 'bg-white border-red-300'
                  }`}>
                    <AlertCircle className="w-10 h-10 text-red-500" />
                    <p className="text-sm font-medium">فشل تحميل الصورة</p>
                    <button 
                      onClick={() => {
                        setImageLoadError(false);
                        setImageLoading(true);
                        // إعادة تحميل الصورة عن طريق إعادة تعيين src مؤقتاً
                        const img = new Image();
                        img.onload = () => {
                          setImageLoading(false);
                          setImageLoadError(false);
                        };
                        img.onerror = () => {
                          setImageLoading(false);
                          setImageLoadError(true);
                        };
                        img.src = imageUrl!;
                      }}
                      className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition"
                    >
                      إعادة المحاولة
                    </button>
                  </div>
                )}
                
                {/* عنصر الصورة الرئيسي (يظهر فقط إذا لم يكن هناك خطأ) */}
                {!imageLoadError && (
                  <div 
                    className={`relative overflow-hidden rounded-2xl border shadow-lg cursor-zoom-in group max-w-full ${
                      isDarkMode ? 'border-white/[0.07]' : 'border-slate-100'
                    }`}
                    onClick={() => setIsModalOpen(true)}
                  >
                    <img 
                      src={imageUrl} 
                      alt="AI Content" 
                      className="max-w-full max-h-[500px] object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      onError={handleImageError}
                      onLoad={handleImageLoad}
                      style={{ opacity: imageLoading ? 0 : 1 }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                      <div className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors" title={t.zoom}>
                        <ZoomIn size={24} />
                      </div>
                      <button 
                        onClick={handleImageDownload}
                        className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors" 
                        title={t.download}
                      >
                        <Download size={24} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* عرض الملف */}
            {file && !image && (
              <div 
                className={`relative flex items-center gap-4 p-4 rounded-2xl border shadow-sm max-w-sm ${
                  isDarkMode ? 'bg-slate-800 border-white/[0.07]' : 'bg-white border-slate-100'
                }`}
              >
                <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  {getFileIcon(file.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs opacity-60 mt-1">{Math.round(file.data.length * 0.75 / 1024)} KB</p>
                </div>
                <button
                  onClick={handleFileDownload}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                  }`}
                  title={t.download}
                >
                  <Download size={18} />
                </button>
              </div>
            )}
            
            {/* عرض النص (كما هو مع دعم Markdown) */}
            {text && (
              <div 
                className={`px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all border prose-chat max-w-none ${
                  isUser 
                    ? 'bg-orange-500 text-white rounded-br-md shadow-orange border-orange-500/20' 
                    : isDarkMode
                      ? 'bg-white/[0.04] text-slate-200 rounded-tl-none border-white/[0.07] prose-invert'
                      : 'bg-white text-slate-800 rounded-tl-none border-slate-100'
                }`}
                dir="auto"
              >
                <ReactMarkdown>{text}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {imageUrl && !imageLoadError && (
        <ImageModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          imageSrc={imageUrl} 
        />
      )}
    </>
  );
}
