import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingCart, ShoppingBag, Trash2, Plus, Minus, ArrowRight, User, 
  Phone, MapPin, Smartphone, Truck, RefreshCw, ChevronDown, CheckCircle2 
} from "lucide-react";
import { ALGERIA_68_WILAYAS } from "./WilayasList";
import { WILAYA_COMMUNES } from "./PublicCheckoutForm";
import { safeStorage } from "../lib/utils";

interface CartItem {
  cartItemId: string;
  id: string;
  productName: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  size: string;
  color: string;
}

interface StorefrontCartProps {
  merchantId: string;
  merchantName: string;
  cart: CartItem[];
  onUpdateQty: (cartItemId: string, amount: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onBackToStore: () => void;
  onClearCart: () => void;
}

export default function StorefrontCart({
  merchantId,
  merchantName,
  cart,
  onUpdateQty,
  onRemoveItem,
  onBackToStore,
  onClearCart
}: StorefrontCartProps) {
  // Input fields state
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("");
  const [selectedCommune, setSelectedCommune] = useState("");
  const [deliveryType, setDeliveryType] = useState<"home" | "desk">("home");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [note, setNote] = useState("");

  // API dynamic shipping rates and overall processing state
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [loadingShipping, setLoadingShipping] = useState<boolean>(false);
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);
  const [orderErr, setOrderErr] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  // Auto-reset commune list on wilaya selection swap
  const handleWilayaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedWilaya(val);
    setSelectedCommune("");
  };

  // Find active wilaya code
  const activeWilayaObj = ALGERIA_68_WILAYAS.find(w => `${w.code} - ${w.nameAr}` === selectedWilaya || w.code === selectedWilaya);
  const activeWilayaCode = activeWilayaObj?.code || "";
  const communesList = activeWilayaCode ? WILAYA_COMMUNES[activeWilayaCode] || [] : [];

  // Fetch Shipping Fee via endpoint whenever selectedWilaya or deliveryType changes
  useEffect(() => {
    if (!selectedWilaya) {
      setShippingFee(0);
      return;
    }

    const fetchShippingPrice = async () => {
      try {
        setLoadingShipping(true);
        const res = await fetch(`/api/store/shipping-cost?wilaya=${encodeURIComponent(selectedWilaya)}&deliveryType=${deliveryType}`);
        const data = await res.json();
        if (data.success) {
          setShippingFee(Number(data.shippingFee) || 0);
        } else {
          setShippingFee(deliveryType === "home" ? 700 : 400); // stable fallback representation
        }
      } catch (err) {
        console.error("Error setting shipping rate:", err);
        setShippingFee(deliveryType === "home" ? 700 : 400); // safe fallback
      } finally {
        setLoadingShipping(false);
      }
    };

    fetchShippingPrice();
  }, [selectedWilaya, deliveryType]);

  const itemsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalPrice = itemsTotal + shippingFee;

  // Perform backend storefront checkout action
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderErr(null);

    // Initial validations
    if (!customerName.trim() || !phoneNumber.trim()) {
      setOrderErr("يرجى إدخال اسم المستلم ورقم الهاتف للمتابعة.");
      return;
    }

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, "");
    const phoneRegex = /^(05|06|07)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setOrderErr("الرجاء إدخال رقم هاتف جزائري صحيح يتكون من 10 أرقام ويبدأ بـ (05 أو 06 أو 07).");
      return;
    }

    if (!selectedWilaya) {
      setOrderErr("الرجاء اختيار ولاية التوصيل.");
      return;
    }

    if (!selectedCommune) {
      setOrderErr("الرجاء اختيار بلدية التوصيل.");
      return;
    }

    if (cart.length === 0) {
      setOrderErr("سلة التسوق فارغة تماماً. الرجاء العودة واختيار منتج واحد على الأقل.");
      return;
    }

    try {
      setSubmittingOrder(true);

      // Structure Payload matching API requirements
      const payload = {
        merchantId,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        wilaya: activeWilayaObj ? `${activeWilayaObj.code} - ${activeWilayaObj.nameAr}` : selectedWilaya,
        commune: selectedCommune,
        deliveryType: deliveryType,
        deliveryAddress: deliveryAddress.trim(),
        note: note.trim(),
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          size: item.size || "",
          color: item.color || ""
        }))
      };

      const res = await fetch("/api/store/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 403 || data.requiresUpgrade || data.error === "subscription_limit_reached") {
        safeStorage.setItem("upgrade_pending", "true");
        safeStorage.setItem("orderDataPending", JSON.stringify(payload));
        window.location.href = "/?screen=subscription&upgrade_needed=true";
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل تسجيل طلب الشحن والتوصيل.");
      }

      setSuccessOrderId(data.orderId);
      // Success! empty the local cart representation
      onClearCart();
    } catch (err: any) {
      console.error("[Cart Checkout Failed]:", err);
      setOrderErr(err.message || "حدث خطأ غير متوقع أثناء حفظ طلبيتك. يرجى المراجعة والمحاولة مجدداً.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Success view block
  if (successOrderId) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 text-right" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl bg-neutral-950 border border-zinc-850/80 p-6 md:p-10 rounded-[2rem] text-center space-y-6 shadow-2xl relative overflow-hidden"
        >
          {/* Abstract background glows */}
          <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />
          
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/5">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2.5">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">تم تسجيل طلبيتك بنجاح! 🎉</h2>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed max-w-md mx-auto font-medium">
              أهلاً بك، تم إرسال الطلبية وحفظها بنجاح في متجر <span className="text-emerald-400 font-extrabold">{merchantName}</span>. سوف يتواصل معك فريق العمل هاتفياً لتأكيد الشحن لولايتك خلال بضعة ساعات.
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 text-right space-y-3.5 shadow-inner text-xs">
            <div className="flex justify-between border-b border-zinc-900/60 pb-3">
              <span className="text-zinc-500 font-bold">اسم المستلم:</span>
              <span className="text-white font-extrabold">{customerName}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900/60 pb-3">
              <span className="text-zinc-500 font-bold">رقم الهاتف الفعال:</span>
              <span className="text-emerald-400 font-bold font-mono text-xs">{phoneNumber}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900/60 pb-3">
              <span className="text-zinc-500 font-bold">مكان التوصيل والشحن:</span>
              <span className="text-white font-extrabold">
                {activeWilayaObj?.nameAr || selectedWilaya} • {selectedCommune}
              </span>
            </div>
            {deliveryAddress.trim() && (
              <div className="flex justify-between border-b border-zinc-900/60 pb-3">
                <span className="text-zinc-500 font-bold">العنوان الكلي التفصيلي:</span>
                <span className="text-zinc-300">{deliveryAddress}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-zinc-900/60 pb-3">
              <span className="text-zinc-500 font-bold">طريقة الاستلام المفضلة:</span>
              <span className="text-white font-extrabold">
                {deliveryType === "home" ? "توصيل آمن للمنزل 🏠" : "استلام من مكتب مكتب الشحن 📦"}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-zinc-400 font-bold">المبلغ المطلوب للتسليم عند الاستلام:</span>
              <span className="text-emerald-400 font-mono font-black text-sm">{finalPrice.toLocaleString()} DA</span>
            </div>
          </div>

          <button
            onClick={() => {
              setSuccessOrderId(null);
              setCustomerName("");
              setPhoneNumber("");
              setSelectedWilaya("");
              setSelectedCommune("");
              setDeliveryAddress("");
              setNote("");
              onBackToStore();
            }}
            className="w-full py-4 bg-zinc-900 hover:bg-zinc-850 hover:text-white font-black rounded-2xl text-zinc-300 text-xs transition-colors cursor-pointer border border-zinc-800 hover:border-zinc-700"
          >
            تصفح المتجر مجدداً وطلب منتجات أخرى
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="text-right font-sans" dir="rtl">
      {/* Back button link with premium scale hover */}
      <button
        onClick={onBackToStore}
        className="mb-8 py-3 px-5 bg-zinc-900/60 hover:bg-zinc-900 hover:text-white text-zinc-400 rounded-2xl border border-zinc-850 hover:border-zinc-750 transition-all duration-300 inline-flex items-center gap-2 text-xs font-black cursor-pointer active:scale-95 shadow-lg"
      >
        <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>العودة لتصفح منتجات المتجر المتميزة</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-10 items-start">
        
        {/* Left column: Cart goods list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-neutral-950 border border-zinc-900/80 p-5 md:p-6 rounded-3xl space-y-4 shadow-2xl relative">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-widest flex items-center gap-2 pb-3.5 border-b border-zinc-900">
              <ShoppingCart className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              سلة التسوق الخاصة بك ({cart.length})
            </h3>

            {cart.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 flex flex-col items-center gap-3">
                <ShoppingBag className="w-12 h-12 text-zinc-800 animate-bounce" />
                <p className="text-xs font-bold text-zinc-400">لا يوجد أي عناصر في السلة حالياً</p>
                <button
                  onClick={onBackToStore}
                  className="text-xs text-emerald-400 font-extrabold hover:underline cursor-pointer"
                >
                  انقر هنا لتصفح المنتجات وبدء التسوق 🛒
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex gap-3 bg-zinc-900/30 border border-zinc-900 p-3 rounded-2xl items-center justify-between group hover:border-zinc-800 transition-colors"
                  >
                    <div className="flex gap-3 items-center">
                      {/* Frame preview */}
                      <div className="w-12 h-12 rounded-xl bg-black border border-zinc-900 shrink-0 overflow-hidden relative">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-800 bg-zinc-950">
                            <ShoppingBag className="w-5 h-5 text-zinc-700" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-[11px] md:text-xs font-extrabold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">{item.productName}</h4>
                        <div className="flex items-center gap-2.5">
                          <p className="text-[10px] text-emerald-400 font-mono font-bold">{item.price.toLocaleString()} DA</p>
                          {(item.size || item.color) && (
                            <span className="text-[9px] text-zinc-500">
                              {[item.size, item.color].filter(Boolean).join(" • ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quantity switcher */}
                      <div className="flex items-center bg-zinc-900 rounded-xl border border-zinc-800 p-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.cartItemId, -1)}
                          className="w-6 h-6 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-[11px] font-mono font-black w-5.5 text-center text-white">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.cartItemId, 1)}
                          className="w-6 h-6 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => onRemoveItem(item.cartItemId)}
                        className="text-zinc-650 hover:text-red-400 p-1.5 hover:bg-zinc-900/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Display Invoice items list totals */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-zinc-900 text-xs space-y-3">
                <div className="flex justify-between text-zinc-400">
                  <span>مجموع المنتجات بالسلة:</span>
                  <span className="font-mono font-bold text-white">{itemsTotal.toLocaleString()} DA</span>
                </div>
                <div className="flex justify-between text-zinc-400 items-center">
                  <span>تكلفة شحن و توصيل الطرد:</span>
                  {loadingShipping ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : selectedWilaya ? (
                    <span className="text-emerald-400 font-extrabold font-mono">{shippingFee > 0 ? `+ ${shippingFee} DA` : "توصيل مجاني 🤩"}</span>
                  ) : (
                    <span className="text-zinc-600 text-[10px] font-bold">بانتظار تحديد ولايتك</span>
                  )}
                </div>
                <div className="flex justify-between text-xs md:text-sm font-extrabold pt-3 bg-zinc-900/20 p-3 rounded-2xl border-t border-zinc-900">
                  <span className="text-white">المبلغ الجملي المراد دفعه عند الاستلام:</span>
                  <span className="font-mono text-emerald-400 text-sm md:text-base">
                    {finalPrice.toLocaleString()} <span className="text-[11px] text-emerald-400">DA</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Form Customer details */}
        <div className="lg:col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-950 border border-zinc-900/80 p-5 md:p-8 rounded-[2rem] shadow-2xl relative"
          >
            {/* Ambient subtle decorative light leak */}
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[70px] pointer-events-none" />

            <form onSubmit={handleCheckoutSubmit} className="space-y-5">
              {orderErr && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 font-bold leading-relaxed text-right">
                  ⚠️ {orderErr}
                </div>
              )}

              {/* Title Identity */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 pb-2.5 border-b border-zinc-900">
                  <User className="w-4 h-4 text-emerald-400 shrink-0" />
                  1. معلومات الاتصال والمستلم الفعال
                </h3>

                <div className="space-y-1.5">
                  <label className="block text-[10px] text-zinc-500 font-black uppercase tracking-wider px-1">الاسم الكامل للمستلم والزبون *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="مثال: يونس جلال"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-right pr-10 pl-4 py-3 bg-black border border-zinc-900 hover:border-zinc-800 rounded-xl text-white text-xs focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500/50 focus:outline-none transition-all font-medium placeholder:text-zinc-700"
                    />
                    <User className="absolute right-3.5 top-3.5 w-4 h-4 text-zinc-600 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] text-zinc-500 font-black uppercase tracking-wider px-1">رقم هاتف المستلم لتأكيد التوصيل هاتفياً *</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="05XXXXXXXX / 06XXXXXXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-black border border-zinc-900 hover:border-zinc-800 rounded-xl text-white text-xs text-left font-mono focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-zinc-700"
                      dir="ltr"
                    />
                    <Phone className="absolute right-3.5 top-3.5 w-4 h-4 text-zinc-600 pointer-events-none" />
                  </div>
                </div>
              </div>

              <hr className="border-zinc-900/60" />

              {/* Geographical mapping */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 pb-2.5 border-b border-zinc-900">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  2. تفاصيل وتأكيد مكان شحن الطرد
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-zinc-500 font-black px-1">الولاية *</label>
                    <div className="relative font-bold">
                      <select
                        required
                        value={selectedWilaya}
                        onChange={handleWilayaChange}
                        className="w-full pl-9 pr-3 py-3 bg-black border border-zinc-900 hover:border-zinc-800 rounded-xl text-zinc-200 text-xs focus:border-emerald-500/50 focus:outline-none transition-colors appearance-none cursor-pointer font-bold"
                      >
                        <option value="" disabled className="text-zinc-700">اختر الولاية</option>
                        {ALGERIA_68_WILAYAS.map(w => (
                          <option key={w.code} value={`${w.code} - ${w.nameAr}`} className="bg-black text-zinc-200 font-bold">
                            {w.code} - {w.nameAr}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-zinc-500 font-black px-1">البلدية *</label>
                    <div className="relative font-bold">
                      <select
                        required
                        value={selectedCommune}
                        onChange={(e) => setSelectedCommune(e.target.value)}
                        disabled={!selectedWilaya}
                        className="w-full pl-9 pr-3 py-3 bg-black border border-zinc-900 hover:border-zinc-800 rounded-xl text-zinc-200 text-xs focus:border-emerald-500/50 focus:outline-none transition-colors appearance-none cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed font-bold"
                      >
                        <option value="" disabled className="text-zinc-700">اختر البلدية</option>
                        {communesList.map((comm, idx) => (
                          <option key={idx} value={comm} className="bg-black text-zinc-200">
                            {comm}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] text-zinc-500 font-black px-1">العنوان السكني التفصيلي لتسهيل التوصيل</label>
                  <input
                    type="text"
                    placeholder="مثال: حي السلام، عمارة رقم 3، الطابق 2"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-zinc-900 hover:border-zinc-800 rounded-xl text-white text-xs focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-zinc-700 font-medium"
                  />
                </div>

                {/* Delivery Type switcher */}
                <div className="space-y-2">
                  <label className="block text-[10px] text-zinc-500 font-black px-1">طريقة التوصيل المفضلة والمناسبة لك *</label>
                  <div className="grid grid-cols-2 gap-3 font-bold">
                    <button
                      type="button"
                      onClick={() => setDeliveryType("home")}
                      className={`py-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        deliveryType === "home" 
                          ? "bg-white text-black border-white shadow-lg font-black" 
                          : "bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-900"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 shrink-0" />
                      <span>🏠 توصيل للمنزل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType("desk")}
                      className={`py-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        deliveryType === "desk" 
                          ? "bg-white text-black border-white shadow-lg font-black" 
                          : "bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-900"
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5 shrink-0" />
                      <span>📦 استلام من المكتب</span>
                    </button>
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-zinc-500 font-black px-1">ملاحظات تود إرفاقها بالففصل والتوجيه</label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="أضف أي تفاصيل تود إبلاغ الموزع بها..."
                    className="w-full px-4 py-3 bg-black border border-zinc-900 hover:border-zinc-800 rounded-xl text-white text-xs focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500/50 focus:outline-none transition-all resize-none placeholder:text-zinc-700"
                  />
                </div>
              </div>

              {/* Submit Trigger - Premium Glowing Button */}
              <button
                type="submit"
                disabled={submittingOrder || cart.length === 0}
                className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs tracking-wider uppercase rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-xl shadow-emerald-500/10 active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed select-none"
              >
                {submittingOrder ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>جاري إرسال وتوثيق طلبيتك الآن...</span>
                  </>
                ) : (
                  <>
                    <span>تأكيد وإرسال الطلب الآن (الدفع عند الاستلام) ⚡</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
