import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowRight, RefreshCw, Sparkles, ClipboardPaste, 
  UploadCloud, Image as ImageIcon, FileText, Music, X, Check, FileCode
} from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

export default function OrderInput({ 
  conversation, 
  setConversation, 
  loading, 
  error, 
  handleExtract, 
  handleManualInput,
  setScreen, 
  t, 
  isRtl,
  fileUrl,
  setFileUrl,
  fileMimeType,
  setFileMimeType,
  fileName,
  setFileName,
  fileBase64,
  setFileBase64,
  userId
}: any) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                const compressedFile = new File([blob], newName, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.8
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const startUpload = (fileToUpload: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    // Organize storage path hierarchically: users/{userId}/{orderId}/{file_name}
    const orderDraftId = `draft_${Date.now()}`;
    const cleanFileName = fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const storageRef = ref(storage, `users/${userId || "guest"}/${orderDraftId}/${cleanFileName}`);

    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(progress);
      },
      (error) => {
        console.warn("Storage upload failed or permission denied, fallback active:", error);
        // Do not crash - the file is already active in base64 offline mode!
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setFileUrl(downloadUrl);
        } catch (err: any) {
          console.warn("Could not retrieve download URL, keeping local Base64 mode:", err);
        } finally {
          setIsUploading(false);
        }
      }
    );
  };

  const handleFile = (file: File) => {
    setLocalError(null);
    if (!file) return;

    // Enforce 5MB file format size limit
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setLocalError(t.file_size_exceeded || "File is too large! Maximum allowed is 5MB.");
      return;
    }

    const isAudio = file.type.startsWith("audio/") || file.name.endsWith(".m4a") || file.name.endsWith(".wav") || file.name.endsWith(".mp3");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isPdf && !isAudio) {
      setLocalError(t.invalid_file_type || "Unsupported format! Only Images, PDFs, and Audio are allowed.");
      return;
    }

    const processFileAndUpload = (fileToProcess: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFileBase64(base64String);
        setFileName(fileToProcess.name);
        
        let mime = fileToProcess.type;
        if (!mime) {
          if (fileToProcess.name.endsWith(".m4a")) mime = "audio/mp4";
          else if (fileToProcess.name.endsWith(".mp3")) mime = "audio/mpeg";
          else if (fileToProcess.name.endsWith(".wav")) mime = "audio/wav";
          else if (fileToProcess.name.endsWith(".pdf")) mime = "application/pdf";
          else mime = "image/png";
        }
        setFileMimeType(mime);
        
        // Populate fileUrl with a local object/data URL so form gets unlocked instantly!
        const localUrl = URL.createObjectURL(fileToProcess);
        setFileUrl(localUrl);

        // Upload in the background silently
        startUpload(fileToProcess);
      };
      reader.readAsDataURL(fileToProcess);
    };

    if (isImage) {
      setIsOptimizing(true);
      compressImage(file)
        .then((optimizedFile) => {
          setIsOptimizing(false);
          processFileAndUpload(optimizedFile);
        })
        .catch((err) => {
          console.error("Compression fell back:", err);
          setIsOptimizing(false);
          processFileAndUpload(file);
        });
    } else {
      processFileAndUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const removeFile = () => {
    setFileUrl(null);
    setFileName(null);
    setFileMimeType(null);
    setFileBase64(null);
    setLocalError(null);
  };

  // Helper to determine icon to draw
  const renderFileIcon = () => {
    if (!fileMimeType) return <UploadCloud className="w-10 h-10 text-zinc-500 mb-2" />;
    if (fileMimeType.startsWith("image/")) return <ImageIcon className="w-8 h-8 text-cyan-400" />;
    if (fileMimeType.includes("pdf")) return <FileText className="w-8 h-8 text-rose-400" />;
    return <Music className="w-8 h-8 text-amber-400" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: isRtl ? -20 : 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setScreen("dashboard")} 
          className={`p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer ${isRtl ? 'rotate-180' : ''}`}
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold tracking-tight">{t.new_order}</h2>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl backdrop-blur-md">
        
        {/* Paste Area */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <ClipboardPaste className="w-4 h-4 text-zinc-500" />
            <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">{t.paste_label}</p>
          </div>
          <textarea 
            value={conversation} 
            onChange={(e) => setConversation(e.target.value)} 
            placeholder={t.placeholder} 
            className="w-full h-40 bg-black/40 border border-zinc-800/80 rounded-2xl p-4 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 transition-all resize-none font-sans"
          />
        </div>

        {/* Dropzone / Upload Form */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <UploadCloud className="w-4 h-4 text-zinc-500" />
            <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
              {t.upload_media || "Upload Files & Media"}
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && !isOptimizing && !fileUrl && fileInputRef.current?.click()}
            className={`cursor-pointer group relative flex flex-col items-center justify-center border border-dashed rounded-2xl p-6 text-center transition-all duration-300 min-h-[140px] ${
              isDragging 
                ? "border-cyan-500 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                : fileUrl 
                  ? "border-zinc-800 bg-black/20" 
                  : "border-zinc-800/80 bg-black/40 hover:border-zinc-700 hover:bg-zinc-900/10"
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              accept="image/*,application/pdf,audio/*"
              className="hidden"
            />

            <AnimatePresence mode="wait">
              {isOptimizing ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="w-full space-y-3 animate-pulse"
                >
                  <Sparkles className="w-8 h-8 text-yellow-400 animate-spin mx-auto" style={{ animationDuration: '3s' }} />
                  <p className="text-xs text-yellow-500 font-bold font-sans">
                    {t.optimizing_image || "Optimizing & compressing image..."}
                  </p>
                </motion.div>
              ) : isUploading ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="w-full space-y-3"
                >
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-xs text-zinc-400 font-medium">
                    {t.upload_progress || "Uploading..."} ({uploadProgress}%)
                  </p>
                  
                  {/* Cyan Glowing Progress Tracker */}
                  <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden relative border border-zinc-800">
                    <motion.div 
                      className="bg-cyan-500 h-full rounded-full shadow-[0_0_8px_#22d3ee]"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </motion.div>
              ) : fileUrl ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between w-full p-2 bg-zinc-950/40 rounded-xl border border-zinc-800/60 hover:border-zinc-700/60 transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-900 rounded-lg">
                      {renderFileIcon()}
                    </div>
                    <div className="text-left font-sans">
                      <p className="text-xs font-bold text-zinc-300 max-w-[170px] truncate">
                        {fileName}
                      </p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-0.5">
                        {fileMimeType?.split("/")[1] || "File"} - {t.success_upload || "Ready"}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={removeFile}
                    className="p-1.5 bg-zinc-90 w-7 h-7 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="space-y-1.5 font-sans"
                >
                  <UploadCloud className="w-9 h-9 text-zinc-500 group-hover:text-cyan-400 transition-colors mx-auto" />
                  <p className="text-xs font-semibold text-zinc-300">
                    {t.drag_drop_files || "Drag & drop files here or click to browse"}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {t.max_size_limit || "Maximum file size is 5MB"} (Images, PDFs, Voicemail Audios)
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Local size/type validation alerts */}
        {localError && (
          <p className="text-yellow-500 text-[10px] font-bold bg-yellow-500/5 p-3 rounded-xl border border-yellow-500/10 font-sans">
            {localError}
          </p>
        )}

        {/* Backend extraction API errors */}
        {error && (
          <p className="text-yellow-500 text-[10px] font-bold bg-yellow-500/5 p-3 rounded-xl border border-yellow-500/10 font-sans">
            {String(error).toLowerCase().includes("permission") || String(error).toLowerCase().includes("insufficient") 
              ? t.permission_error 
              : error}
          </p>
        )}

        {/* Extraction trigger button */}
        <button 
          onClick={handleExtract} 
          disabled={loading || isUploading || isOptimizing || (!conversation.trim() && !fileUrl)} 
          className="w-full py-4 bg-white hover:bg-zinc-100 text-black rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 cursor-pointer font-sans"
        >
          {loading ? (
            <RefreshCw className="animate-spin w-5 h-5 text-black" />
          ) : (
            <Sparkles className="w-5 h-5 text-black" />
          )} 
          {loading ? t.extracting : t.extract_button}
        </button>

        {/* Manual Input button */}
        <button 
          type="button"
          onClick={handleManualInput} 
          className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer font-sans mt-3"
        >
          <FileText className="w-5 h-5 text-zinc-400" />
          {t.manual_entry || "ملأ البيانات يدوياً"}
        </button>
      </div>
    </motion.div>
  );
}
