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
  sizes?: string;
  setSizes?: (val: string) => void;
  colors?: string;
  setColors?: (val: string) => void;
  sizeLabel?: string;
  setSizeLabel?: (val: string) => void;
  colorLabel?: string;
  setColorLabel?: (val: string) => void;
  isWarehouse?: boolean;
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
  sizes = "",
  setSizes,
  colors = "",
  setColors,
  sizeLabel = "",
  setSizeLabel,
  colorLabel = "",
  setColorLabel,
  isWarehouse = false,
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
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 15 }} 
        className="relative bg-theme-card border border-theme-border rounded-3xl w-full max-w-lg p-6 space-y-6 overflow-y-auto max-h-[85vh] shadow-xl backdrop-blur-xl text-theme-text"
        dir={isRtl ? "rtl" : "ltr"}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-theme-border pb-3">
          <h3 className="text-base font-bold flex items-center gap-2 text-theme-text font-sans">
            <Package className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            {editingProduct 
              ? (isRtl ? t.edit_product || "تعديل حقول المنتج" : t.edit_product || "Modify Product Data Sheet")
              : (isRtl ? "إضافة منتج جديد للمستودع" : t.add_product || "Inventory Registration Portal")
            }
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-white rounded-xl hover:bg-theme-bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Input fields */}
        <form onSubmit={onSubmit} className="space-y-4">

          {/* AI ASSIST PANEL */}
          {!isWarehouse && (
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
                      className="flex-1 py-1.5 px-3 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-500/10 min-h-[36px]"
                    >
                      {aiParsing ? (
                        <>
                          <RefreshCw className="animate-spin w-3.5 h-3.5 text-white" />
                          <span>{isRtl ? "جاري التحليل وملء النموذج..." : "Analyzing & autofilling..."}</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5 text-purple-200" />
                          <span>{isRtl ? "توليد تلقائي بالذكاء الاصطناعي" : "Analyze & Autofill Details"}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAiActive(false)}
                      className="px-3 py-2 bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs rounded-xl hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
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
          )}
          
          {/* Product Name */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-300 font-medium uppercase px-1 tracking-wider block text-left">
              {isRtl ? "اسم المنتج المطلوب *" : t.product_name || "Product Name *"}
            </label>
            <div className={`flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 focus-within:border-zinc-500 transition-all ${isWarehouse ? "opacity-60 cursor-not-allowed" : ""}`}>
              <Tag className="w-4 h-4 text-zinc-400 shrink-0" />
              <input 
                type="text" 
                required
                disabled={isWarehouse}
                placeholder={isRtl ? "مثال: حذاء رياضي من الجلد الفاخر" : "e.g. Leather sneakers, silk abaya..."}
                className="bg-transparent w-full text-xs outline-none placeholder:text-zinc-500 text-zinc-100 disabled:cursor-not-allowed"
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
              <div className={`flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 focus-within:border-zinc-500 transition-all ${isWarehouse ? "opacity-60 cursor-not-allowed" : ""}`}>
                <Hash className="w-4 h-4 text-zinc-400 shrink-0" />
                <input 
                  type="text" 
                  disabled={isWarehouse}
                  placeholder={isRtl ? "أدخل رمز SKU" : "AB-4029"}
                  className="bg-transparent w-full text-xs outline-none placeholder:text-zinc-500 text-zinc-100 font-mono uppercase disabled:cursor-not-allowed"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-zinc-300 font-medium uppercase px-1 tracking-wider block text-left">
                {isRtl ? "فئة السلعة" : t.product_category || "Category"}
              </label>
              <div className={`flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 focus-within:border-zinc-500 transition-all ${isWarehouse ? "opacity-60 cursor-not-allowed" : ""}`}>
                <Layers className="w-4 h-4 text-zinc-400 shrink-0" />
                <input 
                  type="text" 
                  disabled={isWarehouse}
                  placeholder={isRtl ? "مثال: أحذية، ملابس..." : "Clothing, Accessories..."}
                  className="bg-transparent w-full text-xs outline-none placeholder:text-zinc-500 text-zinc-100 disabled:cursor-not-allowed"
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
              <div className={`flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 focus-within:border-zinc-500 transition-all ${isWarehouse ? "opacity-60 cursor-not-allowed" : ""}`}>
                <DollarSign className="w-4 h-4 text-zinc-400 shrink-0" />
                <input 
                  type="number" 
                  required
                  disabled={isWarehouse}
                  min="0"
                  placeholder="3500"
                  className="bg-transparent w-full text-xs outline-none placeholder:text-zinc-500 text-zinc-100 font-mono font-bold disabled:cursor-not-allowed"
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
            <div className={`flex items-start gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 focus-within:border-zinc-500 transition-all ${isWarehouse ? "opacity-60 cursor-not-allowed" : ""}`}>
              <FileText className="w-4 h-4 text-zinc-400 mt-1 shrink-0" />
              <textarea 
                rows={2}
                disabled={isWarehouse}
                placeholder={isRtl ? "أضف أية تفاصيل، خيارات الألوان، مواصفات الضمان..." : "Write custom descriptions, color codes, size specs..."}
                className="bg-transparent w-full text-xs outline-none placeholder:text-zinc-500 text-zinc-100 resize-none h-14 disabled:cursor-not-allowed"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Custom Product Options Settings */}
          <div className={`space-y-3 bg-[#0d0d0d]/80 border border-zinc-900 p-4 rounded-2xl ${isWarehouse ? "opacity-55 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-xs font-bold text-indigo-350">
                {isRtl ? "خيارات مخصصة للمنتج (مقاسات، أحجام، ألوان، روائح...)" : "Custom Product Options (Sizes, Colors, Volumes...)"}
              </span>
              <span className="text-[9px] bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded border border-zinc-850">
                {isRtl ? "اختياري" : "Optional"}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed text-left block">
              {isRtl 
                ? "اتركها فارغة لعدم تفعيلها، أو أدخل خيارات مفصولة بفاصلة لعرضها لزبائنك ليختاروا منها عند الشراء مباشرة."
                : "Leave empty to hide, or define custom options for customers to select at checkout."}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Option 1 Label */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 block text-left">
                  {isRtl ? "اسم الخيار الأول (مثال: المقاس، الحجم)" : "Option 1 Label (e.g. Size, Scent)"}
                </label>
                <input 
                  type="text" 
                  disabled={isWarehouse}
                  placeholder={isRtl ? "الحجم، القياس، السعة..." : "e.g. Size, Volume"}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 disabled:cursor-not-allowed"
                  value={sizeLabel}
                  onChange={(e) => setSizeLabel && setSizeLabel(e.target.value)}
                />
              </div>

              {/* Option 1 Values */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 block text-left">
                  {isRtl ? "القيم المتاحة (مفصولة بفاصلة)" : "Option 1 Values (comma separated)"}
                </label>
                <input 
                  type="text" 
                  disabled={isWarehouse}
                  placeholder={isRtl ? "S, M, L أو 50ml, 100ml" : "e.g. S, M, L or 50ml, 100ml"}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 disabled:cursor-not-allowed"
                  value={sizes}
                  onChange={(e) => setSizes && setSizes(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Option 2 Label */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 block text-left">
                  {isRtl ? "اسم الخيار الثاني (مثال: اللون، الرائحة)" : "Option 2 Label (e.g. Color, Scent)"}
                </label>
                <input 
                  type="text" 
                  disabled={isWarehouse}
                  placeholder={isRtl ? "اللون، الرائحة، النوع..." : "e.g. Color, Scent"}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 disabled:cursor-not-allowed"
                  value={colorLabel}
                  onChange={(e) => setColorLabel && setColorLabel(e.target.value)}
                />
              </div>

              {/* Option 2 Values */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 block text-left">
                  {isRtl ? "القيم المتاحة (مفصولة بفاصلة)" : "Option 2 Values (comma separated)"}
                </label>
                <input 
                  type="text" 
                  disabled={isWarehouse}
                  placeholder={isRtl ? "أسود, أبيض أو عود, مسك" : "e.g. Black, White or Oud, Musk"}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 disabled:cursor-not-allowed"
                  value={colors}
                  onChange={(e) => setColors && setColors(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Storefront Display Toggle */}
          <div className={`bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between gap-4 mt-2 ${isWarehouse ? "opacity-55 pointer-events-none" : ""}`}>
            <div className="space-y-1 text-left flex-1 font-sans">
              <span className="text-xs font-bold text-zinc-100 block">
                {t.upload_to_store_label || (isRtl ? "عرض في المتجر الإلكتروني" : "Publish to Online Storefront")}
              </span>
              <p className="text-[10px] text-zinc-500 leading-normal block">
                {t.upload_to_store_desc || (isRtl ? "تفعيل هذا الخيار سيعرض المنتج لعملائك لشرائه مباشرة من متجرك العام" : "Make this product visible and purchasable by public customers")}
              </p>
            </div>
            
            <button
              type="button"
              disabled={isWarehouse}
              onClick={() => setIsPublished(!isPublished)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPublished ? "bg-purple-600" : "bg-zinc-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isPublished ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Interactive Drag and Drop visual uploader with fallback input link */}
          <div className="space-y-3 pt-2 bg-theme-bg-secondary/40 dark:bg-zinc-950/40 p-4 rounded-2xl border border-theme-border dark:border-zinc-900">
            <label className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium uppercase px-1 tracking-wider block text-left">
              {isRtl ? "صورة المنتج والملفات المرفوعة" : t.product_image || "Product Thumbnail & Media"}
            </label>
            
            {/* If NO image loaded, show standard uploader */}
            {!(imageFileBase64 || imageUrl) ? (
              <div className="space-y-3 animate-fadeIn">
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border border-[1.5px] border-dashed px-4 py-6 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer text-xs font-semibold transition-all text-center ${
                    isDragging 
                      ? "border-emerald-500 bg-emerald-500/5 text-emerald-400" 
                      : "border-slate-350 dark:border-zinc-800 bg-theme-bg dark:bg-zinc-950/40 hover:border-zinc-550 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white"
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
                    <div className="p-2.5 rounded-full bg-slate-200/50 dark:bg-zinc-900/80 text-secondary dark:text-zinc-400 border border-slate-300 dark:border-zinc-800">
                      <Upload className="w-5 h-5 shrink-0 text-slate-650 dark:text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-zinc-200 text-xs font-bold">{isRtl ? "اضغط هنا لاختيار صورة" : "Click to browse images"}</p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1">{isRtl ? "أو قم بسحب وإسقاط الملف هنا" : "or drag and drop your file here"}</p>
                    </div>
                  </label>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-theme-border dark:border-zinc-900"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-zinc-550 dark:text-zinc-500 font-mono uppercase tracking-widest">{isRtl ? "أو أضف رابط خارجي" : "or enter external URL"}</span>
                  <div className="flex-grow border-t border-theme-border dark:border-zinc-900"></div>
                </div>

                {/* Fallback absolute url input */}
                <input 
                  type="url" 
                  placeholder="https://example.com/product_image_link.jpg"
                  className="w-full bg-theme-bg dark:bg-zinc-950/80 border border-theme-border dark:border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-theme-text placeholder:text-theme-text-muted outline-none focus:border-slate-300 dark:focus:border-zinc-750 transition-all font-sans"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            ) : (
              /* If there IS an image loaded, show a preview container */
              <div className="space-y-3 animate-fadeIn">
                <div className="relative w-full h-52 rounded-2xl bg-zinc-950 border border-zinc-850 overflow-hidden group shadow-inner">
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
                      className="p-1.5 bg-black/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-xl border border-zinc-850 hover:border-red-500/30 transition-all cursor-pointer backdrop-blur-md"
                      title={isRtl ? "إزالة هذه الصورة" : "Remove selected image"}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom bar status */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">{isRtl ? "نوع المصدر" : "SOURCE METHOD"}</p>
                      <p className="text-[10px] text-zinc-350 font-semibold font-sans">
                        {imageFileBase64 ? (isRtl ? "ملف مرفوع محلياً" : "Direct File Upload") : (isRtl ? "رابط مباشر" : "External Resource Link")}
                      </p>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={() => { setImageUrl(""); setImageFileBase64(null); }}
                      className="text-[10px] text-zinc-450 hover:text-white underline cursor-pointer"
                    >
                      {isRtl ? "تغيير الصورة" : "Choose custom image"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit sheet controls */}
          <div className="flex gap-3 pt-4 border-t border-theme-border mt-6">
            <button 
              type="submit" 
              disabled={apiLoading}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-md shadow-purple-500/10"
            >
              {apiLoading && <RefreshCw className="animate-spin w-4 h-4 text-white" />}
              {editingProduct 
                ? (isRtl ? "تحديث المنتج" : t.edit_product || "Update product specs") 
                : (isRtl ? "إضافة المنتج للمخزن" : t.add_product || "Register Item")
              }
            </button>
            <button 
              type="button" 
              onClick={onCancel || onClose}
              className="px-5 py-3 bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs cursor-pointer transition-all active:scale-95"
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
