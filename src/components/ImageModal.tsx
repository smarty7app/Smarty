import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, ZoomIn } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
}

export default function ImageModal({ isOpen, onClose, imageSrc }: ImageModalProps) {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `ai-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <div className="absolute top-6 right-6 flex gap-4">
            <button
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
              onClick={handleDownload}
              title="تحميل"
            >
              <Download size={28} />
            </button>
            <button
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
              onClick={onClose}
              title="إغلاق"
            >
              <X size={28} />
            </button>
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-5xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageSrc}
              alt="Full view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
