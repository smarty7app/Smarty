import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowRight, RefreshCw, Zap, ClipboardPaste, 
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
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setScreen("dashboard")} 
          className={`p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white border border-slate-200 dark:border-zinc-805 transition-colors duration-200 cursor-pointer ${isRtl ? 'rotate-180' : ''}`}
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold tracking-tight">{t.new_order}</h2>
      </div>

      <div className="glass-panel rounded-[2rem] p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glow effect at background */}
        <div className="absolute top-[-30%] right-[-10%] w-72 h-72 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Paste Area */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <ClipboardPaste className="w-4 h-4 text-purple-400" />
            <p className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-widest">{t.paste_label}</p>
          </div>
          <textarea 
            value={conversation} 
            onChange={(e) => setConversation(e.target.value)} 
            placeholder={t.placeholder} 
            className="w-full h-44 p-4 text-sm text-zinc-100 bg-zinc-950 border border-zinc-800/80 rounded-2xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none focus:outline-none transition-all duration-300 resize-none font-sans placeholder-zinc-600"
          />
        </div>

        {/* Dropzone / Upload Form */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <UploadCloud className="w-4 h-4 text-purple-400" />
            <p className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-widest">
              {t.upload_media || "Upload Files & Media"}
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && !isOptimizing && !fileUrl && fileInputRef.current?.click()}
            className={`cursor-pointer group relative flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-500 min-h-[160px] overflow-hidden ${
              isDragging 
                ? "border-purple-500 bg-purple-500/[0.04] shadow-[0_0_35px_rgba(168,85,247,0.15)]" 
                : fileUrl 
                  ? "border-zinc-800 bg-zinc-950/40" 
                  : "border-zinc-850 hover:border-purple-550/40 bg-zinc-900/[0.12] hover:bg-purple-950/[0.03] hover:shadow-[0_12px_40px_rgba(168,85,247,0.06)]"
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
                  <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                  <p className="text-xs text-purple-400 font-bold font-sans">
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
                  <RefreshCw className="w-8 h-8 text-purple-450 animate-spin mx-auto" />
                  <p className="text-xs text-zinc-400 font-semibold font-mono">
                    {t.upload_progress || "Uploading..."} ({uploadProgress}%)
                  </p>
                  
                  {/* Purple Glowing Progress Tracker */}
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden relative border border-zinc-900">
                    <motion.div 
                      className="bg-purple-500 h-full rounded-full shadow-[0_0_8px_rgba(147,51,234,0.5)] bg-gradient-to-r from-purple-600 to-indigo-500"
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
                  className="flex items-center justify-between w-full p-3 bg-zinc-950/60 rounded-2xl border border-zinc-800 hover:border-zinc-750 transition-all shadow-inner"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800">
                      {renderFileIcon()}
                    </div>
                    <div className="text-left font-sans">
                      <p className="text-xs font-extrabold text-zinc-100 max-w-[170px] truncate">
                        {fileName}
                      </p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-extrabold mt-1">
                        {fileMimeType?.split("/")[1] || "File"} • {t.success_upload || "Ready"}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={removeFile}
                    className="p-1.5 bg-zinc-900 w-8 h-8 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 transition-all flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="space-y-2.5 font-sans"
                >
                  <div className="relative w-12 h-12 mx-auto flex items-center justify-center bg-purple-500/5 group-hover:bg-purple-500/10 border border-purple-550/10 group-hover:border-purple-500/20 rounded-2xl transition-all duration-300">
                    <UploadCloud className="w-6 h-6 text-zinc-500 group-hover:text-purple-400 group-hover:scale-115 transition-all duration-300" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
                      {t.drag_drop_files || "Drag & drop files here or click to browse"}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      {t.max_size_limit || "Maximum file size is 5MB"} (Images, PDFs, Voicemail Audios)
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Local size/type validation alerts */}
        {localError && (
          <p className="text-amber-500 text-xs font-extrabold bg-amber-500/5 p-4 rounded-xl border border-amber-500/15 font-sans">
            {localError}
          </p>
        )}

        {/* Backend extraction API errors */}
        {error && (
          <p className="text-amber-500 text-xs font-extrabold bg-amber-500/5 p-4 rounded-xl border border-amber-500/15 font-sans">
            {String(error).toLowerCase().includes("permission") || String(error).toLowerCase().includes("insufficient") 
              ? t.permission_error 
              : error}
          </p>
        )}

        {/* Extraction trigger button */}
        <button 
          onClick={handleExtract} 
          disabled={loading || isUploading || isOptimizing || (!conversation.trim() && !fileUrl)} 
          className="w-full py-4.5 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white rounded-2xl font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_4px_20px_rgba(147,51,234,0.3)] hover:shadow-[0_8px_30px_rgba(147,51,234,0.5)] transition-all duration-300 hover:scale-[1.01] active:scale-98 disabled:opacity-30 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer font-sans relative overflow-hidden group"
        >
          {loading ? (
            <RefreshCw className="animate-spin w-5 h-5 text-white" />
          ) : (
            <Zap className="w-5 h-5 text-white animate-pulse" />
          )}  
          <span>{loading ? t.extracting : t.extract_button}</span>
        </button>

        {/* Manual Input button */}
        <button 
          type="button"
          onClick={handleManualInput} 
          className="w-full py-4 bg-slate-100 dark:bg-zinc-900/40 hover:bg-slate-200 dark:hover:bg-zinc-900/80 border border-slate-300 dark:border-zinc-800 text-slate-700 dark:text-zinc-100 rounded-2xl font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer font-sans mt-3"
        >
          <FileText className="w-5 h-5 text-slate-500 dark:text-zinc-400" />
          {t.manual_entry || "ملأ البيانات يدوياً"}
        </button>
      </div>
    </motion.div>
  );
}
