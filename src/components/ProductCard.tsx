import React, { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { ImageIcon, Check, AlertCircle, Edit3, Trash2, Store } from "lucide-react";
import { Product } from "../types";

interface ProductCardProps {
  product: Product;
  selectedProductIds: string[];
  toggleSelectProduct: (id: string) => void;
  openEditModal: (p: Product) => void;
  setShowDeleteConfirm: (id: string) => void;
  isRtl: boolean;
  t: any;
  enableLazyLoading?: boolean;
  onTogglePublish?: (p: Product) => void;
}

export const ProductCard = React.memo(function ProductCard({
  product,
  selectedProductIds,
  toggleSelectProduct,
  openEditModal,
  setShowDeleteConfirm,
  isRtl,
  t,
  enableLazyLoading = true,
  onTogglePublish,
}: ProductCardProps) {
  const [isVisible, setIsVisible] = useState(!enableLazyLoading);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enableLazyLoading || isVisible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    return () => observer.disconnect();
  }, [enableLazyLoading, isVisible]);

  if (!isVisible) {
    return (
      <div 
        ref={cardRef} 
        className="h-[28rem] bg-zinc-900/10 border border-zinc-850/50 rounded-2xl animate-pulse" 
      />
    );
  }

  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = product.stockQuantity < 5 && product.stockQuantity > 0;
  const isSelected = selectedProductIds.includes(product.id!);

  return (
    <motion.div 
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      transition={{ duration: 0.25 }}
      className="bg-zinc-900/10 border border-zinc-850 hover:border-zinc-700/80 rounded-2xl overflow-hidden flex flex-col group relative transition-all duration-300 transform hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
    >
      {/* Visual Media Bar */}
      <div className="h-44 bg-zinc-950 relative flex items-center justify-center overflow-hidden border-b border-zinc-900">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.productName} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            referrerPolicy="no-referrer" 
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 opacity-30 group-hover:opacity-60 transition-opacity">
            <ImageIcon className="w-8 h-8 text-zinc-500" />
            <span className="text-[10px] tracking-wider uppercase font-extrabold">{isRtl ? "دون صورة" : "No Media"}</span>
          </div>
        )}
        
        {/* Interactive Selection box */}
        <button 
          onClick={() => toggleSelectProduct(product.id!)}
          className={`absolute top-3 left-3 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer backdrop-blur-md z-[10] ${
            isSelected 
              ? "bg-white border-white text-black" 
              : "bg-black/40 border-white/20 hover:border-white/50"
          }`}
        >
          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
        </button>

        {/* Stock Warning & Counters */}
        <span className={`absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md border backdrop-blur-md flex items-center gap-1 z-[10] ${
          isOutOfStock 
            ? "bg-red-500/10 text-red-500 border-red-500/20" 
            : isLowStock 
            ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        }`}>
          {isLowStock && <AlertCircle className="w-3 h-3 animate-pulse" />}
          {isOutOfStock ? (isRtl ? "منتهي" : t.sold_out || "sold out") : isLowStock ? `${product.stockQuantity} ${isRtl ? "قطع متبقية" : t.left || "left"}` : `${product.stockQuantity} ${isRtl ? "متاح" : t.units || "units"}`}
        </span>

        {/* Category Badge */}
        {product.category && (
          <span className="absolute bottom-3 right-3 text-[9px] uppercase tracking-widest font-black text-zinc-400 bg-zinc-950/90 border border-zinc-850 rounded-lg px-2 py-0.5">
            {product.category}
          </span>
        )}

        {/* Publication Status Badge */}
        <span className={`absolute bottom-3 left-3 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg border backdrop-blur-md flex items-center gap-1 z-[10] ${
          product.isPublished === true
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-zinc-950/90 text-zinc-500 border-zinc-850"
        }`}>
          <Store className="w-2.5 h-2.5 shrink-0" />
          <span>{product.isPublished === true ? (isRtl ? "مرفوع بالمتجر" : "In Store") : (isRtl ? "في المستودع" : "Backstore")}</span>
        </span>
      </div>

      {/* Metadata Specs */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4 bg-zinc-900/10">
        <div>
          <div className="flex items-center justify-between gap-2 overflow-hidden mb-1">
            {product.sku ? (
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest truncate">{product.sku}</span>
            ) : (
              <span className="text-zinc-650 text-[9px] font-mono">===</span>
            )}
          </div>
          <h4 className="font-extrabold text-white text-sm line-clamp-1 group-hover:text-amber-400/95 transition-colors">{product.productName}</h4>
          {product.description && <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1 leading-normal">{product.description}</p>}
        </div>

        <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
          <span className="text-emerald-400 font-black text-sm">{product.price.toLocaleString()} {isRtl ? "دج" : "DA"}</span>
          
          <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
            {/* Direct storefront publish toggle */}
            <button 
              onClick={() => onTogglePublish?.(product)} 
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                product.isPublished === true
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25" 
                  : "bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-zinc-500 hover:text-zinc-300"
              }`}
              title={product.isPublished === true ? (isRtl ? "حذف من المتجر الإلكتروني" : "Remove from Storefront") : (isRtl ? "رفع وعرض بالمتجر الإلكتروني" : "Publish to Storefront")}
            >
              <Store className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => openEditModal(product)} 
              className="p-1.5 hover:bg-zinc-805 rounded-xl border border-zinc-850 hover:border-zinc-700 hover:text-white text-zinc-400 transition-all cursor-pointer bg-zinc-950"
              title={isRtl ? "تعديل السلعة" : t.edit_product || "Edit product"}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(product.id!)} 
              className="p-1.5 hover:bg-red-500/10 rounded-xl border border-zinc-850 hover:border-red-500/20 hover:text-red-400 text-zinc-500 transition-all cursor-pointer bg-zinc-950"
              title={isRtl ? "حذف نهائي" : t.delete_button || "Delete product"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default ProductCard;
