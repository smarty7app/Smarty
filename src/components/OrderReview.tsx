import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Phone, MapPin, Truck, Save, ArrowRight, Download, Package, Plus, Trash2, AlertTriangle, Eye, X, ShieldAlert, FileText, Printer, Clock, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { InputField } from "./CommonUI";
import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";

export default function OrderReview({ userData, order, setOrder, loading, handleSave, handleShipOrder, addItem, removeItem, updateItem, setScreen, t, isRtl, initialOrder }: any) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [collapsedItems, setCollapsedItems] = useState<{[key: number]: boolean}>({});
  const [inventory, setInventory] = useState<any[]>([]);
  const [activeItemDropdown, setActiveItemDropdown] = useState<number | null>(null);
  const [quickRegStatus, setQuickRegStatus] = useState<{
    [itemIndex: number]: {
      status: "idle" | "loading" | "success" | "error";
      message?: string;
    }
  }>({});

  const handleQuickRegisterProduct = async (idx: number, productName: string, pricePerUnit: number) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setQuickRegStatus(prev => ({
        ...prev,
        [idx]: { status: "error", message: isRtl ? "⚠️ يجب تسجيل الدخول أولاً للقيام بهذا الإجراء." : "⚠️ You must be logged in to do this." }
      }));
      return;
    }
    setQuickRegStatus(prev => ({
      ...prev,
      [idx]: { status: "loading" }
    }));
    try {
      await addDoc(collection(db, "inventory"), {
        productName: productName.trim(),
        price: pricePerUnit || 0,
        stockQuantity: 100, // A healthy starter default
        category: isRtl ? "مستخرج تلقائياً" : "Auto-extracted",
        sku: "REG-" + Math.floor(1000 + Math.random() * 9000),
        description: isRtl ? "تمت إضافة المنتج تلقائياً من مراجعة الطلب." : "Product automatically registered from order review form.",
        imageUrl: "",
        userId: uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setQuickRegStatus(prev => ({
        ...prev,
        [idx]: { 
          status: "success", 
          message: isRtl 
            ? `🎉 تم تسجيل وإضافة المنتج 「${productName}」 بنجاح لمخزونك بـ 100 قطعة كبداية!` 
            : `🎉 Successfully registered product "${productName}" to your inventory with 100 items!`
        }
      }));
    } catch (err: any) {
      console.error("[Quick Register Product] Error:", err);
      setQuickRegStatus(prev => ({
        ...prev,
        [idx]: { status: "error", message: err.message || "Error adding product" }
      }));
    }
  };

  const hasInsufficientStock = (order.items || []).some((item: any) => {
    if (!item.product) return false;
    const matched = inventory.find((p: any) => p.productName === item.product);
    if (!matched) return false;
    return (Number(matched.stockQuantity) || 0) < (Number(item.quantity) || 1);
  });

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !db) return;
    const q = query(collection(db, "inventory"), where("userId", "==", uid));
    return onSnapshot(q, (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    }, (err) => {
      console.error("Error listening to inventory inside OrderReview:", err);
    });
  }, [userData]);

  const toLocalISOString = (date: any) => {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    const tzoffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (!showPreviewModal) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+P, Command+P (Print)
      // Prevent Ctrl+S, Command+S (Save)
      // Prevent Ctrl+U, Command+U (View source)
      if (
        (e.ctrlKey || e.metaKey) && 
        (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPreviewModal]);

  useEffect(() => {
    const itemsSum = (order.items || []).reduce((acc: number, item: any) => {
      const q = Math.max(0, Number(item.quantity) || 0);
      const p = Math.max(0, Number(item.pricePerUnit) || 0);
      return acc + (q * p);
    }, 0);
    const fee = Math.max(0, Number(order.shippingFee) || 0);
    const calculatedTotal = itemsSum + fee;
    if (order.totalPrice !== calculatedTotal) {
      setOrder({
        ...order,
        totalPrice: calculatedTotal
      });
    }
  }, [order.items, order.shippingFee, setOrder, order.totalPrice]);

  const cleanPhoneStr = (order.phone || "").trim().replace(/\s+/g, "");
  let normalizedPhone = cleanPhoneStr;
  if (normalizedPhone.startsWith("+213")) {
    normalizedPhone = "0" + normalizedPhone.slice(4);
  } else if (normalizedPhone.startsWith("213")) {
    normalizedPhone = "0" + normalizedPhone.slice(3);
  } else if (normalizedPhone.startsWith("00213")) {
    normalizedPhone = "0" + normalizedPhone.slice(5);
  }

  const isPhonePrefixInvalid = order.phone && !/^(05|06|07|5|6|7)/.test(normalizedPhone);

  const warnings = [
    !order.phone ? t.warning_no_phone : null,
    order.phone && order.phone.length < 10 ? t.warning_invalid_phone : null,
    isPhonePrefixInvalid ? t.warning_phone_prefix_invalid : null,
    !order.wilaya ? t.warning_no_wilaya : null,
  ].filter(Boolean);

  const lowStockItems = (order.items || []).filter((item: any) => {
    if (!item.product) return false;
    const matched = inventory.find((p: any) => p.productName === item.product);
    if (!matched) return false;
    const stock = Number(matched.stockQuantity) || 0;
    const reqQty = Number(item.quantity) || 1;
    return stock >= reqQty && stock <= 5;
  });

  const outOfStockItems = (order.items || []).filter((item: any) => {
    if (!item.product) return false;
    const matched = inventory.find((p: any) => p.productName === item.product);
    if (!matched) return false;
    const stock = Number(matched.stockQuantity) || 0;
    const reqQty = Number(item.quantity) || 1;
    return stock < reqQty;
  });

  return (
    <motion.div initial={{ opacity: 0, x: isRtl ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3">
        <button onClick={() => setScreen(order.id ? "dashboard" : "input")} className={`p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 ${isRtl ? 'rotate-180' : ''}`}>
          <ArrowRight className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold tracking-tight">
          {order.id ? t.update_order : t.customer_info}
        </h2>
      </div>

      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 mb-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div className="space-y-1">
              <p className="font-extrabold text-amber-500 text-sm">
                {isRtl ? "⚠️ تنبيه حالة المخزون للمنتجات" : "⚠️ Stock Alert Details"}
              </p>
              <ul className="list-disc list-inside text-xs text-amber-500/80 space-y-1">
                {outOfStockItems.map((item: any, i: number) => {
                  const matched = inventory.find((p: any) => p.productName === item.product);
                  const stock = matched ? matched.stockQuantity : 0;
                  return (
                    <li key={`out-${i}`} className="font-bold text-red-400">
                      {isRtl 
                        ? `الكمية المطلوبة من المنتج 「${item.product}」 تفوق المتوفر في المخزن (المطلوب: ${item.quantity}، المتوفر: ${stock})`
                        : `Requested quantity for "${item.product}" exceeds available stock (Requested: ${item.quantity}, In Stock: ${stock})`
                      }
                    </li>
                  );
                })}
                {lowStockItems.map((item: any, i: number) => {
                  const matched = inventory.find((p: any) => p.productName === item.product);
                  const stock = matched ? matched.stockQuantity : 0;
                  return (
                    <li key={`low-${i}`} className="text-amber-400">
                      {isRtl 
                        ? `مخزون منخفض: المنتج 「${item.product}」 قارب على الانتهاء (متبقي فقط ${stock} قطع في المستودع)`
                        : `Low stock warning: "${item.product}" is running out (only ${stock} units remaining)`
                      }
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {warnings.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/[0.03] border border-amber-500/15 backdrop-blur-md rounded-2xl p-4 mb-6 shadow-lg shadow-amber-505/[0.02]"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/15">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="space-y-1">
              <p className="font-extrabold text-amber-500 text-xs tracking-wide">{t.warning_missing_data}</p>
              <ul className="list-disc list-inside text-[11px] text-zinc-400 font-bold space-y-0.5">
                {warnings.map((w, i) => (
                   <li key={i} className="leading-relaxed">{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column: Customer & Items */}
        <div className="space-y-6">
          {/* Customer Info */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-4">
        <InputField label={t.customer_name} value={order.name} onChange={(v) => setOrder({...order, name: v})} icon={<User className="w-4 h-4 text-zinc-600" />} />
        <InputField label={t.phone_number} value={order.phone} onChange={(v) => setOrder({...order, phone: v})} icon={<Phone className="w-4 h-4 text-zinc-600" />} />
        <div className="grid grid-cols-2 gap-4">
          <InputField label={t.wilaya} value={order.wilaya} onChange={(v) => setOrder({...order, wilaya: v})} icon={<MapPin className="w-4 h-4 text-zinc-600" />} />
          <InputField label={t.commune} value={order.commune} onChange={(v) => setOrder({...order, commune: v})} />
        </div>
        <InputField 
          label={t.order_time} 
          type="datetime-local" 
          value={toLocalISOString(order.createdAt)} 
          onChange={(v) => {
            if (v) {
              setOrder({ ...order, createdAt: new Date(v) });
            }
          }} 
          icon={<Clock className="w-4 h-4 text-zinc-600" />} 
        />
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-500 uppercase px-1 tracking-wider">
            {t.notes}
          </label>
          <div className="flex items-start gap-2 bg-black/50 border border-zinc-800 focus-within:border-zinc-600 rounded-xl px-3 py-2 transition-all">
            <FileText className="w-4 h-4 text-zinc-650 mt-1 shrink-0" />
            <textarea 
              rows={2}
              className="bg-transparent w-full text-sm outline-none placeholder:text-zinc-800 resize-none h-14"
              value={order.note || ""} 
              placeholder={isRtl ? "ملاحظات إضافية بخصوص هذا الطلب..." : "Additional notes for this order..."}
              onChange={(e) => setOrder({...order, note: e.target.value})}
            />
          </div>
        </div>
      </div>

      {/* Items Info */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Package className="w-3 h-3" /> {t.order_details}
          </label>
          <button 
            onClick={addItem}
            className="text-[10px] font-bold text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors"
          >
            <Plus className="w-3 h-3" /> {t.add_item}
          </button>
        </div>

        <div className="space-y-4">
          {order.items.map((item: any, idx: number) => {
            const isCollapsed = collapsedItems[idx] || false;
            const itemsCount = idx + 1;
            return (
              <div key={idx} className={`bg-gradient-to-r from-zinc-950 via-[#131317] to-zinc-900 border ${isCollapsed ? 'border-zinc-900/80 hover:border-zinc-800' : 'border-zinc-800/80 shadow-[0_8px_25px_rgba(0,0,0,0.3)]'} rounded-2xl transition-all duration-300 relative overflow-hidden`}>
                {/* Item Header / Collapse Toggle strip */}
                <div 
                  onClick={() => setCollapsedItems(prev => ({ ...prev, [idx]: !isCollapsed }))}
                  className="flex items-center justify-between px-4 py-3.5 bg-black/40 hover:bg-black/60 border-b border-zinc-900/60 cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5.5 h-5.5 rounded-lg bg-zinc-900 text-zinc-400 border border-zinc-800/60 flex items-center justify-center text-[10px] font-black font-mono">
                      {itemsCount}
                    </span>
                    <span className="text-xs font-semibold text-zinc-100 truncate max-w-[170px] sm:max-w-xs">
                      {item.product || (isRtl ? "عنصر جديد (لم يتم تحديده)" : "New item (unspecified)")}
                    </span>
                    {isCollapsed && (
                      <span className="text-[10px] text-zinc-450 font-bold bg-zinc-900/40 px-2 py-0.5 rounded-md">
                        {item.quantity || 1} {isRtl ? "قطع" : "pcs"} {item.size ? `• ${item.size}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Delete button (uncollapsed/collapsed) */}
                    <button 
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollapsedItems(prev => ({ ...prev, [idx]: !isCollapsed }))}
                      className="p-1.5 rounded-lg text-zinc-455 hover:text-white transition-all cursor-pointer"
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Body Content with AnimatePresence */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="p-4.5 space-y-4 overflow-hidden"
                    >
                      <div className="space-y-1 relative">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-widest block px-1">
                          {t.product}
                        </label>
                        <div className="relative flex items-center bg-[#09090b] border border-zinc-855 rounded-xl focus-within:border-zinc-700 transition-all overflow-hidden focus-within:ring-1 focus-within:ring-purple-500/20">
                          <select
                            value={item.product || ""}
                            onChange={(e) => {
                              const selectedVal = e.target.value;
                              const matched = inventory.find(p => p.productName === selectedVal);
                              updateItem(idx, 'product', selectedVal);
                              if (matched) {
                                updateItem(idx, 'pricePerUnit', matched.price);
                                if (matched.sku) {
                                  updateItem(idx, 'size', matched.sku);
                                }
                              } else {
                                updateItem(idx, 'pricePerUnit', 0);
                              }
                            }}
                            className="w-full bg-transparent text-white py-3 px-4 text-xs font-semibold outline-none appearance-none cursor-pointer pr-10"
                          >
                            <option value="" className="bg-zinc-950 text-zinc-500">
                              {isRtl ? "-- اختر منتج التاجر --" : "-- Select Merchant Product --"}
                            </option>
                            {inventory.map(p => (
                              <option key={p.id} value={p.productName} className="bg-zinc-950 text-zinc-300">
                                {p.productName} ({p.price.toLocaleString()} DZD - {p.stockQuantity} pcs)
                              </option>
                            ))}
                          </select>
                          <div className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-xs`}>
                            ▼
                          </div>
                        </div>

                        {/* Display Red Warning if quantity is greater than current stock or general stock count */}
                        {item.product && (() => {
                          const matched = inventory.find(p => p.productName === item.product);
                          if (matched) {
                            const reqQty = Number(item.quantity) || 1;
                            const stock = Number(matched.stockQuantity) || 0;
                            const isInsufficient = stock < reqQty;

                            if (isInsufficient) {
                              return (
                                <div className="flex items-center gap-1.5 mt-1.5 text-red-500 text-[10.5px] font-black animate-pulse bg-red-500/5 px-2.5 py-1 rounded-lg border border-red-500/10">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                                  <span>
                                    {isRtl 
                                      ? `تنبيه: الكمية المطلوبة (${reqQty}) تفوق المتوفر في المستودع (${stock} قطع متبقية!)` 
                                      : `Warning: Requested quantity (${reqQty}) exceeds available stock (${stock} left!)`
                                    }
                                  </span>
                                </div>
                              );
                            } else if (stock <= 5) {
                              return (
                                <div className="flex items-center gap-1.5 mt-1.5 text-yellow-500 text-[10px] bg-yellow-500/5 px-2.5 py-1 rounded-lg border border-yellow-500/10 font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                                  <span>
                                    {isRtl 
                                      ? `مخزون منخفض: متبقي فقط ${stock} قطع في المستودع` 
                                      : `Low stock: Only ${stock} items left in stock`
                                    }
                                  </span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex items-center gap-1.5 mt-1.5 text-emerald-400 text-[10px] bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10 font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                  <span>
                                    {isRtl 
                                      ? `المخزون متوفر: يوجد ${stock} قطعة جاهزة للتسليم` 
                                      : `In stock: ${stock} items available and ready`
                                    }
                                  </span>
                                </div>
                              );
                            }
                          } else {
                            const regState = quickRegStatus[idx];
                            if (regState?.status === "success") {
                              return (
                                <div className="mt-2.5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-xs">
                                    <span className="text-base">🎉</span>
                                    <span className="text-emerald-400 font-extrabold">{regState.message}</span>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="mt-2.5 p-3.5 rounded-2xl bg-[#0a0a0c] border border-amber-500/15 text-amber-500 space-y-2.5">
                                <div className="flex items-center gap-1.5 font-bold text-xs">
                                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                                  <span>
                                    {isRtl 
                                      ? `تنبيه: المنتج 「${item.product}」 غير مسجل في مستودع المنتجات الخاص بك.` 
                                      : `Notice: "${item.product}" is not currently in your inventory database.`
                                    }
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-500 leading-normal font-sans">
                                  {isRtl 
                                    ? "اضغط أدناه لحفظ وتخزين هذا المنتج فوراً في مخزنك ليتسنى لك إدارة كمياته وشحنه بصورة صحيحة." 
                                    : "Click below to quickly register this product to enable proper stock tracking and logistics deduction."
                                  }
                                </p>

                                {regState?.status === "error" && (
                                  <p className="text-[10.5px] font-extrabold text-red-500 bg-red-500/5 p-2 rounded-xl border border-red-500/10 font-sans">
                                    ❌ {regState.message}
                                  </p>
                                )}

                                <button
                                  type="button"
                                  disabled={regState?.status === "loading"}
                                  onClick={() => handleQuickRegisterProduct(idx, item.product, Number(item.pricePerUnit) || 0)}
                                  className="w-full py-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 active:scale-[0.98] transition-all text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-900/10 cursor-pointer disabled:opacity-55 font-sans"
                                >
                                  {regState?.status === "loading" ? (
                                    <>
                                      <RefreshCw className="animate-spin w-3.5 h-3.5" />
                                      <span>{isRtl ? "جاري الإضافة السريعة للمخزن..." : "Registering to warehouse..."}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>➕ {isRtl ? "إضافة وحفظ المنتج إلى المخزون والمستودع" : "Register and Add item to Inventory"}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          }
                        })()}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3.5">
                        <InputField 
                          label={t.quantity} 
                          value={item.quantity === 0 ? "" : String(item.quantity)} 
                          onChange={(v) => {
                            const val = v === "" ? 0 : Math.max(0, Number(v) || 0);
                            updateItem(idx, 'quantity', val);
                          }} 
                          type="number"
                        />
                        <InputField 
                          label={isRtl ? "سعر القطعة (دج)" : "Prix Unitaire (DA)"} 
                          value={item.pricePerUnit === 0 || item.pricePerUnit === undefined ? "" : String(item.pricePerUnit)} 
                          onChange={(v) => {
                            const val = v === "" ? 0 : Math.max(0, Number(v) || 0);
                            updateItem(idx, 'pricePerUnit', val);
                          }} 
                          type="number"
                        />
                        <InputField 
                          label={t.size} 
                          value={item.size} 
                          onChange={(v) => updateItem(idx, 'size', v)} 
                        />
                        <InputField 
                          label={t.color} 
                          value={item.color} 
                          onChange={(v) => updateItem(idx, 'color', v)} 
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
        </div>

        {/* Right Column: Delivery, Pricing & Actions */}
        <div className="space-y-6">
          {/* Delivery Info */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-4">
         <label className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.delivery_type}</label>
         <div className="flex gap-2">
           {['home', 'desk'].map((type: any) => (
             <button key={type} onClick={() => setOrder({...order, delivery_type: type as any})} className={`flex-1 py-3 rounded-2xl text-xs font-bold border transition-all ${order.delivery_type === type ? 'bg-white text-black' : 'bg-black/30 text-zinc-500 border-zinc-800'}`}>{type === 'home' ? t.delivery_home : t.delivery_desk}</button>
           ))}
         </div>

         <div className="pt-2">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-2">{t.shipping_info}</label>
            <select 
              value={order.shipping_company} 
              onChange={(e) => setOrder({...order, shipping_company: e.target.value})}
              className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
            >
              <option value="Yalidine Express">Yalidine Express</option>
              {(() => {
                const planType = userData?.planType || "free";
                const isProOrAbove = planType === "pro" || planType === "professional" || planType === "unlimited" || planType === "business" || planType === "enterprise";
                const isBusinessOrAbove = planType === "unlimited" || planType === "business" || planType === "enterprise";
                return (
                  <>
                    <option value="ZR Express" disabled={!isProOrAbove}>
                      ZR Express {!isProOrAbove ? `(${isRtl ? "يتطلب باقة Pro" : "Requires Pro plan"})` : ""}
                    </option>
                    <option value="Maystro Delivery" disabled={!isProOrAbove}>
                      Maystro Delivery {!isProOrAbove ? `(${isRtl ? "يتطلب باقة Pro" : "Requires Pro plan"})` : ""}
                    </option>
                    <option value="ECOTRACK" disabled={!isBusinessOrAbove}>
                      ECOTRACK {!isBusinessOrAbove ? `(${isRtl ? "يتطلب باقة Business" : "Requires Business plan"})` : ""}
                    </option>
                    <option value="Anderson" disabled={!isBusinessOrAbove}>
                      Anderson {!isBusinessOrAbove ? `(${isRtl ? "يتطلب باقة Business" : "Requires Business plan"})` : ""}
                    </option>
                  </>
                );
              })()}
            </select>
            {(() => {
              const planType = userData?.planType || "free";
              const isBasic = planType === "free" || planType === "basic";
              if (isBasic) {
                return <p className="text-[9px] text-blue-400 mt-1 px-1 font-medium leading-relaxed">{isRtl ? "⚡ باقتك الحالية تدعم شركة شحن واحدة فقط (Yalidine)." : "⚡ Your current plan supports 1 shipping provider (Yalidine)."}</p>;
              }
              if (planType === "professional") {
                return <p className="text-[9px] text-purple-400 mt-1 px-1 font-medium leading-relaxed">{isRtl ? "⚡ باقتك الحالية تدعم لغاية 3 شركات شحن." : "⚡ Your current plan supports up to 3 shipping providers."}</p>;
              }
              return null;
            })()}
         </div>

         <div className="pt-2">
           <InputField 
             label={isRtl ? "تكلفة الشحن (مرقمة)" : "Frais de livraison (DA)"}
             value={order.shippingFee === 0 || order.shippingFee === undefined ? "" : String(order.shippingFee)}
             onChange={(v) => {
               const val = v === "" ? 0 : Math.max(0, Number(v) || 0);
               setOrder({...order, shippingFee: val});
             }}
             type="number"
           />
         </div>
      </div>

      {/* Final Total Price Display */}
      <div className="bg-gradient-to-r from-zinc-950/80 to-zinc-900/80 border border-emerald-500/20 rounded-3xl p-6 backdrop-blur-xl shadow-[0_12px_40px_rgba(16,185,129,0.05)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
              {isRtl ? "المجموع الكلي النهائي" : "TOTAL DE LA COMMANDE"}
            </span>
            <p className="text-[10px] text-zinc-400 mt-1">
              {isRtl ? "شامل تكاليف المنتجات والتوصيل" : "Produits + livraison compris"}
            </p>
          </div>
          <div className="text-right text-emerald-400">
            <span className="text-2xl font-black font-sans tracking-tight drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]">
              {(order.totalPrice || 0).toLocaleString()} {isRtl ? "دج" : "DA"}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {hasInsufficientStock && (
          <div className="text-red-400 font-extrabold text-xs text-center bg-red-500/10 border border-red-500/20 py-3.5 px-4 rounded-2xl animate-pulse">
            {isRtl 
              ? "⚠️ لا يمكن حفظ أو شحن الطلب لعدم توفر مخزون كافٍ لبعض العناصر!"
              : "⚠️ Cannot save or ship order due to insufficient stock of some items!"
            }
          </div>
        )}

        {order.status === 'shipped' && order.label_url ? (
          <button 
            onClick={() => setShowPreviewModal(true)} 
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm shadow-[0_4px_12px_rgba(16,185,129,0.3)] cursor-pointer"
          >
            <FileText className="w-5 h-5 animate-pulse" /> {isRtl ? "معاينة وتحميل ملصق الشحن الرسمي 📄" : "Preview & Download Official Label 📄"}
          </button>
        ) : (
          order.status !== 'delivered' && (
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleShipOrder} 
                disabled={loading || hasInsufficientStock} 
                className="py-3.5 bg-gradient-to-r from-zinc-100 to-zinc-300 text-black rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Truck className="w-5 h-5" /> {t.confirm_ship}
              </button>
              <button 
                type="button"
                onClick={() => setShowPreviewModal(true)} 
                className="py-3.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm cursor-pointer"
              >
                <Eye className="w-4 h-4 text-yellow-500" /> {isRtl ? "معاينة مسودة الملصق" : "Draft Preview"}
              </button>
            </div>
          )
        )}
        <div className="flex gap-3">
          <button 
            onClick={handleSave} 
            disabled={loading || hasInsufficientStock} 
            className="flex-1 py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" /> {order.id ? t.update_order : t.save_order}
          </button>
          <button onClick={() => { setOrder(initialOrder); setScreen(order.id ? "dashboard" : "input"); }} className={`w-16 h-14 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 cursor-pointer ${isRtl ? 'rotate-180' : ''}`}><ArrowRight /></button>
        </div>
      </div>
        </div>
      </div>

      {/* Security-Hardened Shipping Label Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/95 backdrop-blur-md no-print no-select select-none">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body { display: none !important; }
                .no-print { display: none !important; }
              }
              .no-select {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
              }
            `}} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold text-zinc-300">
                    {order.status === 'shipped' && order.label_url 
                      ? (isRtl ? "ملصق الشحن الرسمي والمؤكد" : "Official Confirmed Label")
                      : (isRtl ? "معاينة مسودة ملصق غير معتمد" : "Unconfirmed Draft Preview")}
                  </span>
                </div>
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content Frame */}
              <div className="p-6 overflow-y-auto flex-1 bg-zinc-900/10 space-y-4">
                {order.status === 'shipped' && order.label_url ? (
                  /* Official Label View */
                  <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                      <p className="text-xs text-emerald-400 font-bold mb-1">
                        {isRtl ? "تم إصدار الملصق الرسمي بنجاح من شركة الشحن" : "Official label successfully issued"}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {isRtl ? "رقم التتبع الخاص بك:" : "Your tracking number:"} {order.tracking_number || "N/A"}
                      </p>
                    </div>

                    <div className="border border-zinc-800 rounded-2xl overflow-y-auto max-h-[62vh] h-[60vh] min-h-[480px] bg-[#f0f2f5] w-full">
                      <iframe 
                        src={`${order.label_url}#toolbar=0&navpanes=0&scrollbar=1`}
                        title="Official Shipping Label"
                        className="w-full min-h-[720px] h-full bg-white block rounded-xl"
                        referrerPolicy="no-referrer"
                        scrolling="yes"
                      />
                    </div>

                    <div className="flex gap-3">
                      <a 
                        href={order.label_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-3 bg-white hover:bg-zinc-200 text-black rounded-xl font-bold text-center text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        {isRtl ? "تنزيل مستند PDF المباشر" : "Download PDF File"}
                      </a>
                      <button 
                        onClick={() => window.print()}
                        className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* High-Security Mock Draft Label Block */
                  <div className="space-y-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3.5 flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-yellow-400">
                          {isRtl ? "ملصق مؤقت - حماية ضد التنزيل المبكر" : "Draft Watermarked Label - Action Restricted"}
                        </h4>
                        <p className="text-[10px] text-zinc-500 leading-normal mt-0.5">
                          {isRtl ? "لقد تم تعطيل تنزيل أو طباعة مسودة الملصق. يرجى الشحن الفعلي للطلبية للحصول على الملصق المعتمد والباركود التشغيلي الرسمي لشركة التوصيل." : "Preview print or download is disabled for unconfirmed orders. Please trigger actual shipping to issue the official label."}
                        </p>
                      </div>
                    </div>

                    {/* The physical-looking premium label card */}
                    <div className="relative bg-white text-black p-5 rounded-2xl shadow-xl overflow-hidden border border-zinc-100 flex flex-col select-none no-select">
                      
                      {/* Secure Repeating Watermark Grid */}
                      <div className="absolute inset-0 grid grid-cols-2 gap-y-12 gap-x-6 rotate-[-15deg] scale-110 pointer-events-none select-none opacity-5 overflow-hidden">
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className="text-red-600 text-[10px] font-black tracking-widest text-center uppercase whitespace-nowrap">
                            SmartyAi - مسودة مؤقتة
                          </div>
                        ))}
                      </div>

                      {/* Top Header of courier */}
                      <div className="flex justify-between items-center border-b-2 border-black pb-2.5">
                        <div>
                          <span className="text-[8px] tracking-wider uppercase text-zinc-400 font-bold block">SmartyAi Premium Logistix</span>
                          <h3 className="text-xs font-black tracking-tighter text-zinc-900">
                            {order.shipping_company ? order.shipping_company.toUpperCase() : "YALIDINE EXPRESS"}
                          </h3>
                        </div>
                        <div className="bg-black text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">
                          {isRtl ? "مسودة" : "DRAFT"}
                        </div>
                      </div>

                      {/* Mock Barcode Block */}
                      <div className="py-4 border-b border-zinc-200">
                        <div className="flex justify-center items-center gap-0.5 mt-1 h-14 select-none pointer-events-none">
                          {[...Array(32)].map((_, i) => (
                            <div key={i} className={`bg-black ${i % 3 === 0 ? "w-[4px]" : i % 5 === 0 ? "w-[1px]" : "w-[2.5px]"} h-full`} />
                          ))}
                        </div>
                        <p className="text-center font-mono text-[9px] tracking-widest mt-1.5 text-black/80">SMARTY-MOCK-{Math.floor(100000 + Math.random() * 900000)}</p>
                      </div>

                      {/* Customer Details Grid */}
                      <div className="py-3 border-b border-zinc-200 text-xs space-y-2 select-none">
                        <div className="grid grid-cols-12 gap-1 border-b border-zinc-100 pb-1.5">
                          <span className="col-span-4 text-[9px] text-zinc-400 uppercase font-black">{isRtl ? "المستلم" : "CLIENT"}</span>
                          <span className="col-span-8 font-bold text-zinc-900">{order.name || "--- ---"}</span>
                        </div>
                        <div className="grid grid-cols-12 gap-1 border-b border-zinc-100 pb-1.5">
                          <span className="col-span-4 text-[9px] text-zinc-400 uppercase font-black">{isRtl ? "الهاتف" : "PHONE"}</span>
                          <span className="col-span-8 font-mono font-bold text-zinc-900">{order.phone || "---------"}</span>
                        </div>
                        <div className="grid grid-cols-12 gap-1 border-b border-zinc-100 pb-1.5">
                          <span className="col-span-4 text-[9px] text-zinc-400 uppercase font-black">{isRtl ? "الموقع" : "LOCATION"}</span>
                          <span className="col-span-8 font-bold text-zinc-900">
                            {(order.wilaya || "----")} {(order.commune ? `• ${order.commune}` : "")}
                          </span>
                        </div>
                        <div className="grid grid-cols-12 gap-1 border-b border-zinc-100 pb-1.5">
                          <span className="col-span-4 text-[9px] text-zinc-400 uppercase font-black">{isRtl ? "طريقة التسليم" : "MODE"}</span>
                          <span className="col-span-8 font-bold text-zinc-900">
                            {order.delivery_type === 'home' 
                              ? (isRtl ? "توصيل للمنزل" : "Home Delivery")
                              : (isRtl ? "مكتب شركة الشحن (Stop Desk)" : "Courier Office Stop Desk")}
                          </span>
                        </div>
                        {/* Order Contents (Items & Products) */}
                        <div className="grid grid-cols-12 gap-1 border-b border-zinc-100 pb-1.5 pt-0.5">
                          <span className="col-span-4 text-[9px] text-zinc-400 uppercase font-black">{isRtl ? "محتوى الطرد" : "CONTENTS"}</span>
                          <div className="col-span-8 space-y-1">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item: any, i: number) => {
                                const details = [];
                                if (item.size) details.push(item.size);
                                if (item.color) details.push(item.color);
                                const extraStr = details.length > 0 ? ` (${details.join('/')})` : '';
                                return (
                                  <div key={i} className="flex justify-between items-center text-xs text-zinc-905 font-bold leading-tight">
                                    <span className="truncate">{item.product || "---"}<span className="text-[10px] text-zinc-500 font-medium">{extraStr}</span></span>
                                    <span className="font-mono text-[10px] bg-zinc-100 px-1.5 py-0.2 rounded-md text-zinc-800 shrink-0 ml-1">x{item.quantity}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-zinc-400">---</span>
                            )}
                          </div>
                        </div>
                        {/* Notes */}
                        {order.note && (
                          <div className="grid grid-cols-12 gap-1 pb-1 pt-0.5">
                            <span className="col-span-4 text-[9px] text-zinc-400 uppercase font-black">{isRtl ? "ملاحظات" : "NOTE"}</span>
                            <span className="col-span-8 text-[11px] font-medium text-zinc-850 leading-tight">
                              {order.note}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Total Net price block */}
                      <div className="mt-3 bg-zinc-50 border-2 border-dashed border-black rounded-lg p-2.5 flex justify-between items-center select-none">
                        <div>
                          <span className="text-[8px] text-zinc-400 font-extrabold uppercase block">{isRtl ? "المبلع للدفع" : "COD VALUE"}</span>
                          <span className="text-[9px] text-zinc-500 leading-none">{isRtl ? "شامل سعر التوصيل والسلعة" : "Inclusive of shipping"}</span>
                        </div>
                        <div className="text-right text-lg font-black text-black font-sans leading-none">
                          {(order.totalPrice || 0).toLocaleString()} <span className="text-xs">DA</span>
                        </div>
                      </div>

                    </div>

                    {/* Action buttons footer for mock */}
                    <div className="text-center pt-2">
                      <p className="text-[9px] text-zinc-600">
                        {isRtl ? "نظام حماية البيانات والتحميل الذكي - SmartyAi Security" : "SmartyAi Order Label Protection Protocol active"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
