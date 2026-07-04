import React from "react";
import { motion } from "motion/react";
import { 
  ShoppingBag, Search, ShoppingCart, Plus, RefreshCw, Sparkles, Star, ChevronLeft, ArrowRight
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

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
  t: any;
  isRtl: boolean;
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
  onPageChange,
  t,
  isRtl
}: StorefrontProps) {
  const { theme } = useTheme();

  return (
    <div className={`space-y-8 font-sans ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Dynamic Global Top Marketing Promo Bar */}
      <div className="w-full bg-gradient-to-r from-emerald-600/10 via-slate-100/30 dark:via-zinc-900/40 to-teal-500/10 border border-emerald-500/15 shadow-inner rounded-2xl py-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-extrabold text-slate-800 dark:text-zinc-100 text-[11px] md:text-xs">
            {t.exclusive_offers}
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
            {t.exclusive_offers_desc}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-slate-500 dark:text-zinc-400 text-[10px] font-bold">
          <span>{t.free_returns}</span>
          <span>•</span>
          <span>{t.quality_guarantee}</span>
        </div>
      </div>

      {/* Premium Store Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-slate-205 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/80 backdrop-blur-2xl p-6 md:p-10 shadow-xl dark:shadow-2xl"
      >
        <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] opacity-10 dark:opacity-25 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className={`flex flex-col md:flex-row items-center gap-6 text-center ${isRtl ? 'md:text-right' : 'md:text-left'}`}>
            {storeLogo ? (
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-500" />
                <img 
                  src={storeLogo} 
                  alt={storeName} 
                  className="relative w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border-2 border-slate-200 dark:border-zinc-900 shadow-2xl relative z-10"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full blur-md opacity-30" />
                <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-900 dark:to-zinc-950 text-emerald-600 dark:text-emerald-400 border border-slate-250 dark:border-zinc-800 flex items-center justify-center shadow-md dark:shadow-2xl">
                  <ShoppingBag className="w-11 h-11" />
                </div>
              </div>
            )}
            
            <div className="space-y-2.5 max-w-xl">
              <div className={`flex flex-wrap items-center justify-center ${isRtl ? 'md:justify-start' : 'md:justify-start'} gap-2`}>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wide">
                  <Star className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                  {t.verified_store}
                </span>
              </div>
              <h1 className="text-2xl md:text-3.5xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight leading-none">
                {storeName}
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed font-normal">
                {storeDescription || t.store_welcome}
              </p>
            </div>
          </div>

          <button
            onClick={onGoToCart}
            className="shrink-0 relative group py-4 px-7 bg-slate-900 hover:bg-emerald-500 text-white hover:text-black dark:bg-white dark:text-black dark:hover:bg-emerald-400 rounded-2xl transition-all duration-300 flex items-center gap-3.5 shadow-xl hover:shadow-emerald-500/20 active:scale-95 cursor-pointer font-bold"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-md opacity-0 group-hover:opacity-40 transition duration-300" />
            
            <span className="text-xs font-black relative z-10">{t.cart_title}</span>
            <ShoppingCart className="w-4.5 h-4.5 text-slate-350 group-hover:text-black dark:text-zinc-900 relative z-10" />
            {cartCount > 0 ? (
              <span className="bg-emerald-500 text-black text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center justify-center animate-pulse relative z-10">
                {cartCount}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-zinc-500 text-xs font-bold relative z-10">{t.empty_cart_short}</span>
            )}
          </button>
        </div>
      </motion.div>

      {/* Interactive Finder */}
      <div className="bg-white dark:bg-zinc-950/40 border border-slate-205 dark:border-zinc-900/60 p-4 md:p-5 rounded-3xl space-y-4 shadow-sm dark:shadow-none">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          <div className="relative flex-1">
            <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-3.5 w-4 h-4 text-slate-400 dark:text-zinc-500 transition-colors group-focus-within:text-emerald-400`} />
            <input 
              type="text" 
              placeholder={t.search_placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-2xl py-3.5 ${isRtl ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'} text-xs text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium shadow-inner`}
            />
          </div>

          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none scroll-smooth shrink-0 items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
                    selectedCategory === "all" 
                      ? "bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-500/10" 
                      : "bg-slate-50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-150 dark:hover:bg-zinc-900"
                  }`}
                >
                  {t.all_categories_filter}
                </button>
                {categories.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
                      selectedCategory === cat 
                        ? "bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-500/10" 
                        : "bg-slate-50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-150 dark:hover:bg-zinc-900"
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
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-slate-500 dark:text-zinc-500 bg-white dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-900 rounded-3xl shadow-sm dark:shadow-none">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-xs font-bold text-slate-600 dark:text-zinc-400">{t.loading_inventory}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-900 rounded-3xl p-8 max-w-md mx-auto shadow-sm dark:shadow-none">
          <ShoppingBag className="w-14 h-14 text-slate-300 dark:text-zinc-800 mx-auto mb-4 animate-bounce" />
          <h3 className="text-base font-bold text-slate-800 dark:text-zinc-300">{t.no_products_found}</h3>
          <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-2 leading-relaxed">
            {t.no_products_desc}
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
                  className="bg-white dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-900/80 hover:border-slate-300 dark:hover:border-zinc-800 rounded-3xl p-3 md:p-4 flex flex-col justify-between transition-all duration-300 group shadow-md dark:shadow-lg dark:hover:shadow-black/60 relative"
                >
                  <div>
                    <div className="aspect-square w-full rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-900 overflow-hidden relative mb-4 shadow-inner">
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.productName} 
                          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-108 ${outOfStock ? 'opacity-40 grayscale' : ''}`}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-zinc-950 text-slate-400 dark:text-zinc-400">
                          <ShoppingBag className="w-10 h-10" />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Stock Status Badge */}
                      <div className={`absolute top-2.5 ${isRtl ? 'right-2.5' : 'left-2.5'} z-10`}>
                        {outOfStock ? (
                          <span className="text-[10px] bg-red-500 text-white font-black px-3 py-1 rounded-xl shadow-lg border border-red-400/50">
                            {t.out_of_stock}
                          </span>
                        ) : (p.category && p.category !== "مستخرج تلقائياً" && p.category !== "Auto-extracted") ? (
                          <span className="text-[9px] bg-slate-900/95 dark:bg-black/90 text-emerald-400 border border-slate-700/20 dark:border-emerald-500/20 font-extrabold px-2.5 py-1 rounded-lg backdrop-blur-md">
                            {p.category}
                          </span>
                        ) : null}
                      </div>

                      {!outOfStock && p.stockQuantity <= 3 && (
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-amber-500/90 text-black text-[9px] font-black text-center py-1 rounded-lg backdrop-blur-sm shadow-md">
                          {t.only_stock_remaining.replace("{stock}", String(p.stockQuantity))}
                        </div>
                      )}
                    </div>
 
                    <div className={`space-y-1.5 px-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-1.5 ${isRtl ? 'justify-start' : 'justify-start'} text-[10px] text-slate-400 dark:text-zinc-500`}>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">100% Quality</span>
                        <span>•</span>
                        <div className="flex items-center text-amber-500">
                          <Star className="w-2.5 h-2.5 fill-amber-500 shrink-0" />
                          <span className="font-mono ml-0.5 text-[9px]">4.9</span>
                        </div>
                      </div>
                      <h3 className="text-xs md:text-sm font-extrabold text-slate-800 dark:text-zinc-100 line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {p.productName}
                      </h3>
                      <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-zinc-500 line-clamp-2 leading-relaxed h-8">
                        {p.description || t.view_details}
                      </p>
                    </div>
                  </div>

                  {/* Enhanced Price Label */}
                  <div className={`mt-4 pt-4 border-t border-slate-100 dark:border-zinc-900/60 flex items-center justify-between gap-2 px-1`}>
                    <div className={isRtl ? 'text-right' : 'text-left'}>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-505 font-bold uppercase tracking-wider">{t.price_label}</p>
                      <p className="text-lg md:text-xl font-black text-slate-900 dark:text-zinc-100 font-mono mt-0.5 tracking-tight">
                        {(Number(p.price) || 0).toLocaleString()} <span className="text-xs text-emerald-600 dark:text-emerald-400 font-sans font-black">DA</span>
                      </p>
                    </div>

                    <button
                      disabled={outOfStock}
                      onClick={() => onOpenProduct(p)}
                      className={`px-4 py-2.5 rounded-xl text-[11px] font-extrabold transition-all duration-300 flex items-center gap-1.5 shrink-0 select-none cursor-pointer border ${
                        outOfStock 
                          ? "bg-slate-150 dark:bg-zinc-900/50 border-slate-205 dark:border-zinc-850 text-slate-400 dark:text-zinc-650 cursor-not-allowed" 
                          : "bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-500 font-black shadow-md shadow-emerald-500/10 hover:scale-[1.03] active:scale-95"
                      }`}
                    >
                      {outOfStock ? null : <Plus className="w-3.5 h-3.5 shrink-0" />}
                      <span>{outOfStock ? t.sold_out : t.add_to_cart}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Trusted Badges */}
          <div className="mt-12 p-6 md:p-8 bg-white dark:bg-zinc-950/50 border border-slate-205 dark:border-zinc-900/60 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-3 gap-8 relative overflow-hidden shadow-xl dark:shadow-2xl">
            <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className={`space-y-3.5 relative z-10 ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-3">
                <Star className="w-5 h-5 text-emerald-500 dark:text-emerald-400 fill-emerald-500 dark:fill-emerald-400" />
              </div>
              <h4 className="text-xs font-black text-slate-800 dark:text-zinc-100">{t.inspection_delivery}</h4>
              <p className="text-[11px] text-slate-505 dark:text-zinc-400 leading-relaxed font-normal">
                {t.inspection_delivery_desc}
              </p>
            </div>

            <div className={`space-y-3.5 relative z-10 ${isRtl ? 'text-right' : 'text-left'} border-y md:border-y-0 md:border-x border-slate-200 dark:border-zinc-900 w-full md:px-6 py-6 md:py-0`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-3">
                <RefreshCw className="w-5 h-5 text-emerald-500 dark:text-emerald-400 animate-spin-slow" />
              </div>
              <h4 className="text-xs font-black text-slate-800 dark:text-zinc-100">{t.easy_exchange}</h4>
              <p className="text-[11px] text-slate-505 dark:text-zinc-400 leading-relaxed font-normal">
                {t.easy_exchange_desc}
              </p>
            </div>

            <div className={`space-y-3.5 relative z-10 ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-3">
                <ShoppingCart className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              </div>
              <h4 className="text-xs font-black text-slate-800 dark:text-zinc-100">{t.delivery_68_wilayas}</h4>
              <p className="text-[11px] text-slate-505 dark:text-zinc-400 leading-relaxed font-normal">
                {t.delivery_68_wilayas_desc}
              </p>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6 border-t border-slate-200 dark:border-zinc-900/40">
              <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-extrabold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-zinc-850 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 shadow-sm"
              >
                {t.next_page}
              </button>
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-405 font-mono bg-white dark:bg-zinc-950 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-900 shadow-sm">
                {t.page_of.replace("{current}", String(currentPage)).replace("{total}", String(totalPages))}
              </span>
              <button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-205 dark:border-zinc-850 text-slate-700 dark:text-zinc-300 font-extrabold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-zinc-850 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 shadow-sm"
              >
                {t.prev_page}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Sticky Mobile Cart CTA */}
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
              <span>{t.proceed_checkout}</span>
            </div>
            <div className="flex items-center gap-1 font-extrabold">
              <span>{t.order_now}</span>
              <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isRtl ? 'rotate-180' : ''}`} />
            </div>
          </motion.button>
        </div>
      )}

    </div>
  );
}

