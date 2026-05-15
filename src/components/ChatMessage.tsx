import React, { useState } from "react";
import { motion } from "motion/react";
import { User, ZoomIn, Download, Sparkles } from "lucide-react";
import ImageModal from "./ImageModal";

import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: 'user' | 'model';
  text: string;
  status?: 'thinking' | 'generating';
  image?: {
    data: string;
    mimeType: string;
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

export default function ChatMessage({ role, text, status, image, t, isDarkMode, isLoading }: ChatMessageProps) {
  const isUser = role === 'user';
  const [isModalOpen, setIsModalOpen] = useState(false);

  const imageUrl = image ? `data:${image.mimeType};base64,${image.data}` : null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ai-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            {isLoading && !text && !image && (
              <div className="flex flex-col gap-2">
                {status === 'thinking' && (
                  <div className={`px-4 py-3 rounded-2xl rounded-tr-none shadow-sm border flex items-center gap-3 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-500'
                  }`}>
                    <span className="text-sm italic">{t.thinking}</span>
                  </div>
                )}
                
                {status === 'generating' && (
                  <div className={`w-full max-w-[300px] aspect-square rounded-2xl border flex flex-col items-center justify-center p-8 text-center gap-4 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
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

            {image && (
              <div 
                className={`relative overflow-hidden rounded-2xl border shadow-lg cursor-zoom-in group max-w-full ${
                  isDarkMode ? 'border-slate-700' : 'border-slate-100'
                }`}
                onClick={() => setIsModalOpen(true)}
              >
                <img 
                  src={imageUrl!} 
                  alt="AI Content" 
                  className="max-w-full max-h-[500px] object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                  <div className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors" title={t.zoom}>
                    <ZoomIn size={24} />
                  </div>
                  <button 
                    onClick={handleDownload}
                    className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors" 
                    title={t.download}
                  >
                    <Download size={24} />
                  </button>
                </div>
              </div>
            )}
            
            {text && (
              <div 
                className={`px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all border prose prose-sm max-w-none ${
                  isUser 
                    ? 'bg-orange-500 text-white rounded-tr-none border-orange-400 prose-invert' 
                    : isDarkMode
                      ? 'bg-slate-800 text-slate-200 rounded-tl-none border-slate-700 prose-invert'
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


      {imageUrl && (
        <ImageModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          imageSrc={imageUrl} 
        />
      )}
    </>
  );
}
