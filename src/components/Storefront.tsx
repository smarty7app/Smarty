import React from "react";
import { motion } from "motion/react";
import { 
  ShoppingBag, Search, ShoppingCart, Plus, RefreshCw, Sparkles, Star, ChevronLeft, ArrowRight
} from "lucide-react";

interface Product {
  id: string;
  productName: string;
  price: number;
  description?: string;
  imageUrl?: string;
  category?: string;
  stockQuantity: number;
}

interface StorefrontProps {
  merchantId: string;
  storeName: string;
  storeLogo: string;
  storeDescription: string;
  products: Product[];
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  cartCount: number;
  onOpenProduct: (product: Product) => void;
  onGoToCart: () => void;
  loadingProducts: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Storefront({
  storeName,
  storeLogo,
  storeDescription,
  products,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  cartCount,
  onOpenProduct,
  onGoToCart,
  loadingProducts,
  currentPage,
  totalPages,
  onPageChange
}: StorefrontProps) {
  return (
    <div className="space-y-8 text-right font-sans" dir="rtl">
      
      {/* Dynamic Global Top Marketing Promo Bar */}
      <div className="w-full bg-gradient-to-r from-emerald-600/10 via-zinc-950/60 to-teal-500/10 border border-emerald-500/15 shadow-inner rounded-2xl py-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-extrabold text-white text-[11px] md:text-xs">عروض حصرية اليوم:</span>
          <span className="text-emerald-400 font-extrabold">شحن سريع مخفض + دفع نقداً عند التوصيل واستلام طلبك 🚚</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-zinc-400 text-[10px] font-bold">
          <span>🔄 استبدال واسترجاع مجاني خلال 7 أيام</span>
          <span>•</span>
          <span>⭐ منتجات أصلية ذات جودة مضمونة 100%</span>
        </div>
      </div>

      {/* Premium Store Header Card with Dynamic Glowing Background & Global Quality Feel */}
      <motion.div 
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-neutral-950/80 backdrop-blur-2xl p-6 md:p-10 shadow-2xl"
      >
        {/* Abstract Ambient Glow Effects */}
        <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[5%] w-60 h-60 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Decorative Grid Lines Overlay representing international SaaS interfaces */}
        <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
            {storeLogo ? (
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-500" />
                <img 
                  src={storeLogo} 
                  alt={storeName} 
                  className="relative w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border-2 border-zinc-900 shadow-2xl relative z-10"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full blur-md opacity-30" />
                <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-zinc-900 to-zinc-950 text-emerald-400 border border-zinc-800 flex items-center justify-center shadow-2xl">
                  <ShoppingBag className="w-11 h-11" />
                </div>
              </div>
            )}
            
            <div className="space-y-2.5 max-w-xl">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-extrabold uppercase tracking-wide">
                  <Star className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                  متجر رسمي موثق
                </span>
              </div>
              <h1 className="text-2xl md:text-3.5xl font-extrabold text-white tracking-tight leading-none">
                {storeName}
              </h1>
              <p className="text-xs md:text-sm text-zinc-400 leading-relaxed font-normal">
                {storeDescription || "أهلاً بك في متجرنا المتميز. نوفر لك تشكيلة راقية من المنتجات مع خدمات توصيل متميزة وسهلة."}
              </p>
            </div>
          </div>

          <button
            onClick={onGoToCart}
            className="shrink-0 relative group py-4 px-7 bg-white text-black hover:bg-emerald-400 rounded-2xl transition-all duration-300 flex items-center gap-3.5 shadow-xl hover:shadow-emerald-500/20 active:scale-95 cursor-pointer font-bold"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-md opacity-0 group-hover:opacity-40 transition duration-300" />
            
            <span className="text-xs font-black relative z-10">سلة المشتريات</span>
            <ShoppingCart className="w-4.5 h-4.5 text-zinc-900 relative z-10" />
            {cartCount > 0 ? (
              <span className="bg-emerald-500 text-black text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center justify-center animate-pulse relative z-10">
                {cartCount}
              </span>
            ) : (
              <span className="text-zinc-500 text-xs font-bold relative z-10">فارغة</span>
            )}
          </button>
        </div>
      </motion.div>

      {/* Interactive Finder, Filters and Categories block */}
      <div className="bg-neutral-950/40 border border-zinc-900/60 p-4 md:p-5 rounded-3xl space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          {/* Dynamic Search Box with Modern Glow & Sleek Styling */}
          <div className="relative flex-1">
            <Search className="absolute right-4 top-3.5 w-4 h-4 text-zinc-500 transition-colors group-focus-within:text-emerald-400" />
            <input 
              type="text" 
              placeholder="ابحث عن منتج متاح في المتجر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/80 border border-zinc-800 rounded-2xl py-3.5 pr-11 pl-4 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium text-right shadow-inner"
            />
          </div>

          {/* Ribbon list of Categories - Horizontally scrollable and extremely modern */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none scroll-smooth shrink-0 items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
                    selectedCategory === "all" 
                      ? "bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-500/10" 
                      : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  الكل
                </button>
                {categories.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
                      selectedCategory === cat 
                        ? "bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-500/10" 
                        : "bg-zinc-900/40 border-zinc-800 text-zinc-405 hover:text-white hover:bg-zinc-900"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Catalog Grid View with Ultra design details */}
      {loadingProducts ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-zinc-500 bg-neutral-950/20 border border-zinc-900 rounded-3xl">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-400" />
          <p className="text-xs font-bold text-zinc-400">جاري تصفية وتحديث منتجات المتجر والمخزون...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 bg-neutral-950/20 border border-zinc-900 rounded-3xl p-8 max-w-md mx-auto">
          <ShoppingBag className="w-14 h-14 text-zinc-800 mx-auto mb-4 animate-bounce" />
          <h3 className="text-base font-bold text-zinc-305">لم نعثر على أي منتجات</h3>
          <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
            المنتجات المطلوبة غير متوفرة حالياً بالمتجر أو غير متطابقة مع تصفيتك الحالية. راسلنا للاستفسار.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => {
              const outOfStock = Number(p.stockQuantity || 0) <= 0;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -6 }}
                  className="bg-zinc-950/30 border border-zinc-900/80 hover:border-zinc-800 rounded-3xl p-3 md:p-4 flex flex-col justify-between transition-all duration-300 group shadow-lg hover:shadow-black/60 relative"
                >
                  <div>
                    {/* Image Frame with hover scale */}
                    <div className="aspect-square w-full rounded-2xl bg-black border border-zinc-900 overflow-hidden relative mb-4 shadow-inner">
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.productName} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-800">
                          <ShoppingBag className="w-10 h-10" />
                        </div>
                      )}
                      
                      {/* Dark overlay on hover for luxury touch */}
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Stock Status Badge */}
                      <div className="absolute top-2.5 right-2.5 z-10">
                        {outOfStock ? (
                          <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/25 font-black px-2.5 py-1 rounded-lg backdrop-blur-md">
                            غير متوفر
                          </span>
                        ) : p.category ? (
                          <span className="text-[9px] bg-black/90 text-zinc-350 border border-zinc-800 font-extrabold px-2.5 py-1 rounded-lg backdrop-blur-md">
                            {p.category}
                          </span>
                        ) : null}
                      </div>

                      {/* Floating Stock Warning indicator */}
                      {!outOfStock && p.stockQuantity <= 3 && (
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-emerald-500 text-black text-[9px] font-black text-center py-1 rounded-lg backdrop-blur-sm shadow-md">
                          متبقي {p.stockQuantity} قطع فقط!
                        </div>
                      )}
                    </div>
 
                    {/* Title, rating mock representation, and description */}
                    <div className="space-y-1.5 px-1 text-right">
                      <div className="flex items-center gap-1.5 justify-start text-[10px] text-zinc-500">
                        <span className="text-emerald-400 font-mono">100% أصلي</span>
                        <span>•</span>
                        <div className="flex items-center text-amber-500">
                          <Star className="w-2.5 h-2.5 fill-amber-500 shrink-0" />
                          <span className="font-mono ml-0.5 text-[9px]">4.9</span>
                        </div>
                      </div>
                      <h3 className="text-xs md:text-sm font-extrabold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
                        {p.productName}
                      </h3>
                      <p className="text-[10px] md:text-[11px] text-zinc-500 line-clamp-2 leading-relaxed h-8">
                        {p.description || "لا يوجد وصف إضافي متوفر حالياً لهذا المنتج المميز."}
                      </p>
                    </div>
                  </div>

                  {/* Buy action and Pricing details */}
                  <div className="mt-4 pt-4 border-t border-zinc-900/60 flex items-center justify-between gap-2 px-1">
                    <div className="text-right">
                      <p className="text-[9px] text-zinc-500 font-medium">سعر المنتج</p>
                      <p className="text-xs md:text-sm font-black text-white font-mono mt-0.5">
                        {(Number(p.price) || 0).toLocaleString()} <span className="text-[10px] text-emerald-400 font-sans font-bold">DA</span>
                      </p>
                    </div>

                    <button
                      disabled={outOfStock}
                      onClick={() => onOpenProduct(p)}
                      className={`px-4 py-2.5 rounded-xl text-[11px] font-extrabold transition-all duration-300 flex items-center gap-1.5 shrink-0 select-none cursor-pointer border ${
                        outOfStock 
                          ? "bg-zinc-900/50 border-zinc-850 text-zinc-650 cursor-not-allowed" 
                          : "bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-500 font-black shadow-md shadow-emerald-500/10 hover:scale-[1.03] active:scale-95"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span>{outOfStock ? "نفد" : "أضف للسلة"}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Global Marketing Trust Badge Matrix under Product Catalog */}
          <div className="mt-12 p-6 md:p-8 bg-zinc-950/25 border border-zinc-900/60 rounded-[2rem] grid grid-cols-1 md:grid-cols-3 gap-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="space-y-3.5 relative z-10 text-right">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <Star className="w-5 h-5 text-emerald-400 fill-emerald-400" />
              </div>
              <h4 className="text-xs font-black text-white">معاينة الطلب وضمان الدفع عند الاستلام 💵</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-normal">
                تسوق بكل راحة وبدون أي قلق! نحن نضمن لك إمكانية مراجعة ومعاينة سلعك بنفسك فور الاستلام وقبل تسليم المبلغ للموزع. لا دفع مسبق أبداً!
              </p>
            </div>

            <div className="space-y-3.5 relative z-10 text-right border-y md:border-y-0 md:border-x border-zinc-90 w-full md:px-6 py-6 md:py-0 border-zinc-900">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin-slow" />
              </div>
              <h4 className="text-xs font-black text-white">ضمان الاستبدال السهل والإرجاع المرن 🔄</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-normal">
                رضاك هو غايتنا الأولى! إن لم يتناسب المقاس أو كان هناك أي ملاحظة، تواصل معنا فوراً لنقوم باستبدال المنتج وتوفير الحلول المرضية خلال 24 ساعة.
              </p>
            </div>

            <div className="space-y-3.5 relative z-10 text-right">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="text-xs font-black text-white">توصيل سريع مع Yalidine Express لـ 68 ولاية 🚚</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-normal">
                نقوم بتسليم وتغليف طرودك وإرسالها عبر شبكة Yalidine الموثوقة لتضمن توصيلها الآمن لباب بيتك أو لمكتب الولاية بأفضل الأسعار.
              </p>
            </div>
          </div>

          {/* Pagination Controls formatted beautifully */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6 border-t border-zinc-900/40">
              <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-extrabold rounded-xl text-xs hover:bg-zinc-850 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
              >
                التالي
              </button>
              <span className="text-xs font-bold text-zinc-400 font-mono bg-zinc-950 px-3.5 py-1.5 rounded-lg border border-zinc-900">
                صفحة {currentPage} من {totalPages}
              </span>
              <button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-extrabold rounded-xl text-xs hover:bg-zinc-850 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
              >
                السابق
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Sticky Mobile Cart CTA for dynamic checkout acceleration */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-6 right-6 z-40 md:hidden">
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onGoToCart}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs tracking-wider rounded-2xl flex items-center justify-between gap-3 shadow-2xl shadow-emerald-500/30 font-sans cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <ShoppingCart className="w-4 h-4 text-black" />
                <span className="absolute -top-1.5 -right-1.5 bg-neutral-950 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center justify-center animate-bounce">
                  {cartCount}
                </span>
              </div>
              <span>عرض سلة التسوق وإتمام الطلبية ⚡</span>
            </div>
            <div className="flex items-center gap-1 font-extrabold">
              <span>طلب الآن</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 rotate-180" />
            </div>
          </motion.button>
        </div>
      )}

    </div>
  );
}

