import React from "react";
import { motion } from "motion/react";
import { 
  Package, 
  X, 
  Tag, 
  Hash, 
  Layers, 
  DollarSign, 
  FileText, 
  ImageIcon, 
  Upload, 
  RefreshCw,
  Sparkles,
  Wand2
} from "lucide-react";
import { auth } from "../lib/firebase";
import { Product } from "../types";

interface ProductModalProps {
  showAddModal: boolean;
  editingProduct: Product | null;
  onClose: () => void;
  onCancel?: () => void;
  onSubmit: (e: React.FormEvent) => void;
  productName: string;
  setProductName: (val: string) => void;
  sku: string;
  setSku: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  price: string;
  setPrice: (val: string) => void;
  stockQuantity: string;
  setStockQuantity: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  imageUrl: string;
  setImageUrl: (val: string) => void;
  imageFileBase64: string | null;
  setImageFileBase64: (val: string | null) => void;
  isDragging: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  apiLoading: boolean;
  isPublished: boolean;
  setIsPublished: (val: boolean) => void;
  isRtl: boolean;
  t: any;
}

export const ProductModal = React.memo(function ProductModal({
  showAddModal,
  editingProduct,
  onClose,
  onCancel,
  onSubmit,
  productName,
  setProductName,
  sku,
  setSku,
  category,
  setCategory,
  price,
  setPrice,
  stockQuantity,
  setStockQuantity,
  description,
  setDescription,
  imageUrl,
  setImageUrl,
  imageFileBase64,
  setImageFileBase64,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleImageChange,
  apiLoading,
  isPublished,
  setIsPublished,
  isRtl,
  t,
}: ProductModalProps) {
  const [showSuccessBadge, setShowSuccessBadge] = React.useState(false);
  const [aiText, setAiText] = React.useState("");
  const [aiActive, setAiActive] = React.useState(false);
  const [aiParsing, setAiParsing] = React.useState(false);
  const [aiStatus, setAiStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [aiErrorMsg, setAiErrorMsg] = React.useState("");

  const runAiExtraction = async () => {
    if (aiParsing) return;
    setAiParsing(true);
    setAiStatus("idle");
    setAiErrorMsg("");

    try {
      const userObj = auth.currentUser;
      if (!userObj) {
        throw new Error(isRtl ? "يجب تسجيل الدخول أولاً لاستخدام الذكاء الاصطناعي." : "You must be authenticated to use AI parsing.");
      }
      const token = await userObj.getIdToken();

      const response = await fetch("/api/inventory/ai-parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          textHint: aiText.trim(),
          imageBase64: imageFileBase64,
          imageUrl: imageUrl
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || (isRtl ? "فشل تحليل البيانات بالذكاء الاصطناعي" : "AI parsing failed"));
      }

      const prod = data.product;
      if (prod) {
        if (prod.productName) setProductName(prod.productName);
        if (prod.category) setCategory(prod.category);
        if (prod.price !== undefined) setPrice(prod.price.toString());
        if (prod.stockQuantity !== undefined) setStockQuantity(prod.stockQuantity.toString());
        if (prod.description) setDescription(prod.description);
        
        setAiStatus("success");
      } else {
        throw new Error(isRtl ? "لم يتم استخراج أية بيانات صالحة" : "No valid product data extracted");
      }
    } catch (err: any) {
      console.error("AI parse client error:", err);
      setAiStatus("error");
      setAiErrorMsg(err?.message || (isRtl ? "خطأ أثناء الاتصال بخادم الذكاء الاصطناعي" : "Server communication error"));
    } finally {
      setAiParsing(false);
    }
  };

  React.useEffect(() => {
    if (imageFileBase64 || imageUrl) {
      setShowSuccessBadge(true);
      const timer = setTimeout(() => {
        setShowSuccessBadge(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowSuccessBadge(false);
    }
  }, [imageFileBase64, imageUrl]);

  if (!showAddModal && !editingProduct) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 15 }} 
        className="relative bg-zinc-950/90 border border-zinc-850 rounded-3xl w-full max-w-lg p-6 space-y-6 overflow-y-auto max-h-[85vh] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        dir={isRtl ? "rtl" : "ltr"}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <h3 className="text-base font-bold flex items-center gap-2 text-zinc-100">
            <Package className="w-5 h-5 text-zinc-400" />
            {editingProduct 
              ? (isRtl ? t.edit_product || "تعديل حقول المنتج" : t.edit_product || "Modify Product Data Sheet")
              : (isRtl ? "إضافة منتج جديد للمستودع" : t.add_product || "Inventory Registration Portal")
            }
          </h3>
          <button 
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Input fields */}
        <form onSubmit={onSubmit} className="space-y-4">

          {/* AI ASSIST PANEL */}
          <div className="bg-gradient-to-br from-indigo-950/30 to-purple-950/30 border border-indigo-900/40 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setAiActive(!aiActive)}
                className="flex items-center gap-2 text-xs font-bold text-indigo-300 hover:text-white transition-colors cursor-pointer"
              >
                <span>
                  {isRtl ? "مساعد الذكاء الاصطناعي الذكي" : "Smart AI Auto-Fill"}
                </span>
              </button>
              
              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase tracking-wider">
                {isRtl ? "توفير الوقت" : "Time Saver"}
              </span>
            </div>

            {aiActive ? (
              <div className="space-y-3 pt-2 border-t border-indigo-950/40 animate-fadeIn">
                <p className="text-[10.5px] text-zinc-400 leading-normal">
                  {isRtl 
                    ? "اكتب مواصفات منتجك بشكل عشوائي، أو الصق منشور فيسبوك/إنستغرام، أو دع الذكاء الاصطناعي يحلل مستندات أو صورة المنتج المرفوعة تلقائياً بضغطة واحدة!"
                    : "Write random notes, paste a social media draft, or analyze the uploaded picture below to auto-populate fields instantly!"
                  }
                </p>

                <div className="relative">
                  <textarea
                    rows={2}
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    placeholder={isRtl 
                      ? "مثال: عباية فاخرة سوداء مطرزة، السعر 4900 دج، متوفر منها 15 حبة من دبي..."
                      : "e.g. black abaya, price 4900 da, 15 items in stock..."
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-650 outline-none focus:border-indigo-800 transition-all resize-none h-14"
                  />
                </div>

                {/* Helper notice if image uploaded */}
                {(imageFileBase64 || imageUrl) && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {isRtl 
                        ? "صورة المنتج جاهزة! سيحلل الذكاء الاصطناعي الصورة أيضاً لتوفير أدق البيانات." 
                        : "Image detected! AI will combine both text hint and visual analysis."
                      }
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={runAiExtraction}
                    disabled={aiParsing}
                    className="flex-1 py-1 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-500/15 min-h-[36px]"
                  >
                    {aiParsing ? (
                      <>
                        <RefreshCw className="animate-spin w-3.5 h-3.5" />
                        <span>{isRtl ? "جاري التحليل وملء النموذج..." : "Analyzing & autofilling..."}</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5 text-indigo-200" />
                        <span>{isRtl ? "توليد تلقائي بالذكاء الاصطناعي" : "Analyze & Autofill Details"}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiActive(false)}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-xl hover:text-white cursor-pointer"
                  >
                    {isRtl ? "إخفاء" : "Hide"}
                  </button>
                </div>

                {/* Status displays */}
                {aiStatus === "success" && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-medium text-center animate-fadeIn">
                    {isRtl ? "تم ملء كافة الحقول بنجاح! يرجى مراجعتها وتأكيد الإضافة." : "Form fields populated successfully! Check out details below."}
                  </div>
                )}

                {aiStatus === "error" && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-[11px] font-medium text-center animate-fadeIn">
                     ⚠️ {aiErrorMsg}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>
                  {isRtl ? "وفر الوقت واجعل الذكاء الاصطناعي يكتب مواصفات المنتج ويرفعه!" : "Instantly write specifications and upload via AI!"}
                </span>
                <button
                  type="button"
                  onClick={() => setAiActive(true)}
                  className="text-indigo-400 hover:text-indigo-300 underline font-semibold text-[10.5px] cursor-pointer"
                >
                  {isRtl ? "تفعيل مساعد الكتابة 🧠" : "Expand Assistant 🧠"}
                </button>
              </div>
            )}
          </div>
          
          {/* Product Name */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-300 font-medium uppercase px-1 tracking-wider block text-left">
              {isRtl ? "اسم المنتج المطلوب *" : t.product_name || "Product Name *"}
            </label>
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 focus-within:border-zinc-500 transition-all">
              <Tag className="w-4 h-4 text-zinc-400 shrink-0" />
              <input 
                type="text" 
                required
                placeholder={isRtl ? "مثال: حذاء رياضي من الجلد الفاخر" : "e.g. Leather sneakers, silk abaya..."}
                className="bg-transparent w-full text-xs outline-none placeholder:text-zinc-500 text-zinc-100"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
          </div>

          {/* SKU Code & Category classification */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-300 font-medium uppercase px-1 tracking-wider block text-left">
                {isRtl ? "رمز المنتج SKU" : t.product_sku || "Sku Code"}
              </label>
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 focus-within:border-zinc-500 transition-all">
                <Hash className="w-4 h-4 text-zinc-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder={isRtl ? "أدخل رمز SKU" : "AB-4029"}
                  className="bg-transparent w-full text-xs outline-none placeholder:text-zinc-500 text-zinc-100 font-mono uppercase"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-zinc-300 font-medium uppercase px-1 tracking-wider block text-left">
                {isRtl ? "فئة السلعة" : t.product_category || "Category"}
              </label>
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 focus-within:border-zinc-500 transition-all">
                <Layers className="w-4 h-4 text-zinc-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder={isRtl ? "مثال: أحذية، ملابس..." : "Clothing, Accessories..."}
                  className="bg-transparent w-full text-xs outline-none placeholder:text-zinc-500 text-zinc-100"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Pricing in DZD & Physical Stock Counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-300 font-medium uppercase px-1 tracking-wider block text-left">
                {isRtl ? "السعر بالدينار (DZD) *" : t.product_price || "Price in DZD *"}
              </label>
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 focus-within:border-zinc-500 transition-all">
                <DollarSign className="w-4 h-4 text-zinc-400 shrink-0" />
                <input 
                  type="number" 
                  required
                  min="0"
                  placeholder="3500"
                  className="bg-transparent w-full text-xs outline-none placeholder:text-zinc-500 text-zinc-100 font-mono font-bold"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-zinc-300 font-medium uppercase px-1 tracking-wider block text-left">
                {isRtl ? "كمية المخزون الإجمالية *" : t.product_stock || "Stock quantity *"}
              </label>
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 focus-within:border-zinc-500 transition-all">
                <Package className="w-4 h-4 text-zinc-400 shrink-0" />
                <input 
                  type="number" 
                  required
                  min="0"
                  placeholder="15"
                  className="bg-transparent w-full text-xs outline-none placeholder:text-zinc-500 text-zinc-100 font-mono"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Short textual description */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-300 font-medium uppercase px-1 tracking-wider block text-left">
              {isRtl ? "وصف مقتضب وثانوي" : t.product_description || "Short Description"}
            </label>
            <div className="flex items-start gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 focus-within:border-zinc-500 transition-all">
              <FileText className="w-4 h-4 text-zinc-400 mt-1 shrink-0" />
              <textarea 
                rows={2}
                placeholder={isRtl ? "أضف أية تفاصيل، خيارات الألوان، مواصفات الضمان..." : "Write custom descriptions, color codes, size specs..."}
                className="bg-transparent w-full text-xs outline-none placeholder:text-zinc-500 text-zinc-100 resize-none h-14"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Storefront Display Toggle */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between gap-4 mt-2">
            <div className="space-y-1 text-left flex-1">
              <span className="text-xs font-bold text-zinc-100 block">
                {t.upload_to_store_label || "عرض في المتجر الإلكتروني"}
              </span>
              <p className="text-[10px] text-zinc-500 leading-normal block">
                {t.upload_to_store_desc || "سيتيح هذا الخيار عرض هذا المنتج للزبائن للشراء مباشرة من رابط متجرك العام"}
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 cursor-pointer focus:outline-none ${
                isPublished ? "bg-emerald-500 animate-pulse" : "bg-zinc-800"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 ${
                  isRtl 
                    ? (isPublished ? "right-6" : "right-1") 
                    : (isPublished ? "left-6" : "left-1")
                }`}
              />
            </button>
          </div>

          {/* Interactive Drag and Drop visual uploader with fallback input link */}
          <div className="space-y-3 pt-2 bg-zinc-950/40 p-4 rounded-2xl border border-zinc-900/80">
            <label className="text-[11px] text-zinc-300 font-medium uppercase px-1 tracking-wider block text-left">
              {isRtl ? "صورة المنتج والملفات المرفوعة" : t.product_image || "Product Thumbnail & Media"}
            </label>
            
            {/* If NO image loaded, show standard uploader */}
            {!(imageFileBase64 || imageUrl) ? (
              <div className="space-y-3 animate-fadeIn">
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border border-dashed px-4 py-6 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer text-xs font-semibold transition-all text-center ${
                    isDragging 
                      ? "border-emerald-500 bg-emerald-500/5 text-emerald-400" 
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-400 hover:text-white"
                  }`}
                >
                  <input 
                    type="file" 
                    id="merchant-image-file"
                    accept="image/*"
                    className="hidden" 
                    onChange={handleImageChange}
                  />
                  <label htmlFor="merchant-image-file" className="flex flex-col items-center gap-2 w-full justify-center h-full cursor-pointer">
                    <div className="p-2.5 rounded-full bg-zinc-900/80 text-zinc-400 border border-zinc-800">
                      <Upload className="w-5 h-5 shrink-0" />
                    </div>
                    <div>
                      <p className="text-zinc-200 text-xs font-bold">{isRtl ? "اضغط هنا لاختيار صورة" : "Click to browse images"}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{isRtl ? "أو قم بسحب وإسقاط الملف هنا" : "or drag and drop your file here"}</p>
                    </div>
                  </label>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-zinc-900"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{isRtl ? "أو أضف رابط خارجي" : "or enter external URL"}</span>
                  <div className="flex-grow border-t border-zinc-900"></div>
                </div>

                {/* Fallback absolute url input */}
                <input 
                  type="url" 
                  placeholder="https://example.com/product_image_link.jpg"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-650 outline-none focus:border-zinc-600 transition-all"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            ) : (
              /* If there IS an image loaded, show a majestic, beautiful and clear preview container */
              <div className="space-y-3 animate-fadeIn">
                <div className="relative w-full h-52 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden group shadow-inner">
                  {/* The visual image itself */}
                  <img 
                    src={imageFileBase64 || imageUrl} 
                    alt="Upload Preview" 
                    className="w-full h-full object-contain filter drop-shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Elegant Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 opacity-90 transition-opacity" />

                  {/* Top bar status */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <div>
                      {showSuccessBadge && (
                        <span className="text-[9.5px] uppercase font-mono tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-lg backdrop-blur-md font-extrabold flex items-center gap-1.5 animate-fadeIn">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {isRtl ? "تم تحميل الصورة بنجاح!" : "Image ready for upload!"}
                        </span>
                      )}
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={() => { setImageUrl(""); setImageFileBase64(null); }}
                      className="p-1.5 bg-black/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-xl border border-zinc-800 hover:border-red-500/30 transition-all cursor-pointer backdrop-blur-md"
                      title={isRtl ? "إزالة هذه الصورة" : "Remove selected image"}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom bar status */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">{isRtl ? "نوع المصدر" : "SOURCE METHOD"}</p>
                      <p className="text-[10px] text-zinc-300 font-semibold">
                        {imageFileBase64 ? (isRtl ? "ملف مرفوع محلياً (Base64)" : "Direct File Upload") : (isRtl ? "رابط مباشر خارجي" : "External Resource Link")}
                      </p>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={() => { setImageUrl(""); setImageFileBase64(null); }}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      {isRtl ? "تغيير الصورة" : "Choose custom image"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit sheet controls */}
          <div className="flex gap-3 pt-4 border-t border-zinc-900 mt-6">
            <button 
              type="submit" 
              disabled={apiLoading}
              className="flex-1 py-3 bg-white hover:bg-zinc-150 text-black rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {apiLoading && <RefreshCw className="animate-spin w-4 h-4" />}
              {editingProduct 
                ? (isRtl ? "تحديث المنتج" : t.edit_product || "Update product specs") 
                : (isRtl ? "إضافة المنتج للمخزن" : t.add_product || "Register Item")
              }
            </button>
            <button 
              type="button" 
              onClick={onCancel || onClose}
              className="px-5 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold hover:bg-zinc-800 rounded-xl text-xs cursor-pointer"
            >
              {isRtl ? "إلغاء الأمر" : t.btn_cancel || "Cancel"}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
});

export default ProductModal;
