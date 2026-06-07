import React from "react";
import { motion } from "motion/react";
import { 
  ShoppingBag, Search, ShoppingCart, Plus, RefreshCw, Layers 
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
    <div className="space-y-6 text-right">
      
      {/* Premium Store Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-zinc-900 bg-gradient-to-br from-zinc-950 to-zinc-900/40 p-6 md:p-8"
      >
        <div className="absolute inset-0 bg-yellow-500/[0.01] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-right">
            {storeLogo ? (
              <img 
                src={storeLogo} 
                alt={storeName} 
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border border-zinc-800 shadow-md shadow-black/40"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-zinc-900 text-yellow-500/80 border border-zinc-800 flex items-center justify-center shadow-lg">
                <ShoppingBag className="w-10 h-10" />
              </div>
            )}
            
            <div className="space-y-1.5 max-w-xl">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">{storeName}</h1>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                {storeDescription}
              </p>
            </div>
          </div>

          <button
            onClick={onGoToCart}
            className="shrink-0 relative py-3 px-5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-100 rounded-2xl border border-zinc-850 hover:border-zinc-700 transition-all flex items-center gap-2.5 shadow-lg active:scale-95 cursor-pointer"
          >
            <ShoppingCart className="w-4.5 h-4.5 text-yellow-500" />
            <span className="text-xs font-black">سلة المشتريات</span>
            {cartCount > 0 ? (
              <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center justify-center animate-pulse">
                {cartCount}
              </span>
            ) : (
              <span className="text-zinc-600 text-xs font-bold">فارغة</span>
            )}
          </button>
        </div>
      </motion.div>

      {/* Interactive Finder and Categories block */}
      <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-3xl space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Dynamic Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="ابحث عن منتج متاح في المتجر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-850 rounded-2xl py-3 pr-10 pl-4 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700 focus:bg-zinc-950 transition-all font-medium text-right shadow-inner"
            />
          </div>

          {/* Ribbon list of Categories */}
          {categories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none scroll-smooth shrink-0 items-center">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedCategory === "all" 
                      ? "bg-white text-black border-white font-black shadow-md" 
                      : "bg-zinc-900/60 border-zinc-850 text-zinc-400 hover:text-white"
                  }`}
                >
                  الكل
                </button>
                {categories.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      selectedCategory === cat 
                        ? "bg-white text-black border-white font-black shadow-md" 
                        : "bg-zinc-900/60 border-zinc-850 text-zinc-400 hover:text-white"
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

      {/* Catalog Grid View */}
      {loadingProducts ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-500 bg-zinc-950/20 border border-zinc-900 rounded-3xl">
          <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
          <p className="text-xs font-bold text-zinc-400">جاري تصفية وتحديث منتجات المتجر والمخزون...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-zinc-950/20 border border-zinc-900 rounded-3xl p-8 max-w-md mx-auto">
          <ShoppingBag className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-zinc-350">لم نعثر على أي منتجات للمتجر</h3>
          <p className="text-[11px] text-zinc-500 mt-1 lines-relaxed">
            المنتجات المطلوبة حالياً قد تكون نفدت أو غير متطابقة مع تصفيتك الحالية. راسلنا للمزيد.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {products.map((p) => {
              const outOfStock = Number(p.stockQuantity || 0) <= 0;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-950/30 border border-zinc-900 hover:border-zinc-800 rounded-2xl md:rounded-3xl p-3 flex flex-col justify-between transition-all hover:translate-y-[-2px] group relative"
                >
                  <div>
                    {/* Image Frame */}
                    <div className="aspect-square w-full rounded-xl md:rounded-2xl bg-zinc-950 border border-zinc-900 overflow-hidden relative mb-3 shadow-inner">
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.productName} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-800">
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                      
                      {/* Stock Status Badge */}
                      <div className="absolute top-2 right-2 z-10">
                        {outOfStock ? (
                          <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/25 font-black px-2 py-0.5 rounded-lg backdrop-blur-md">غير متوفر</span>
                        ) : p.category ? (
                          <span className="text-[9px] bg-zinc-900/90 text-zinc-300 border border-zinc-850 font-bold px-2 py-0.5 rounded-lg backdrop-blur-md">{p.category}</span>
                        ) : null}
                      </div>

                      {/* Floating Stock Warning */}
                      {!outOfStock && p.stockQuantity <= 3 && (
                        <div className="absolute bottom-2 left-2 right-2 bg-yellow-500/90 text-black text-[9px] font-black text-center py-0.5 rounded-lg backdrop-blur-sm shadow-md">
                          متبقي {p.stockQuantity} قطع فقط!
                        </div>
                      )}
                    </div>

                    {/* Title and description */}
                    <div className="space-y-1">
                      <h3 className="text-xs md:text-sm font-bold text-zinc-100 line-clamp-1">{p.productName}</h3>
                      <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed h-8">
                        {p.description || "لا يوجد وصف إضافي متوفر حالياً لهذا المنتج."}
                      </p>
                    </div>
                  </div>

                  {/* Buy action and Pricing details */}
                  <div className="mt-3 pt-3 border-t border-zinc-950/60 flex items-center justify-between gap-1.5">
                    <div>
                      <p className="text-[9px] text-zinc-500 leading-none">سعر المنتج</p>
                      <p className="text-sm font-black text-yellow-500 font-mono mt-0.5">{(Number(p.price) || 0).toLocaleString()} DA</p>
                    </div>

                    <button
                      disabled={outOfStock}
                      onClick={() => onOpenProduct(p)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                        outOfStock 
                          ? "bg-zinc-900/80 border border-zinc-850 text-zinc-600 cursor-not-allowed" 
                          : "bg-white text-black hover:bg-yellow-500 shadow-md hover:scale-[1.03] active:scale-95"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{outOfStock ? "نفد" : "أضف للسلة"}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 font-black rounded-xl text-xs hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
              >
                التالي
              </button>
              <span className="text-xs font-bold text-zinc-400 font-mono">
                صفحة {currentPage} من {totalPages}
              </span>
              <button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 font-black rounded-xl text-xs hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
              >
                السابق
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
