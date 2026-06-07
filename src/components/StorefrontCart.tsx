import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingCart, ShoppingBag, Trash2, Plus, Minus, ArrowRight, User, 
  Phone, MapPin, Smartphone, Truck, RefreshCw, ChevronDown, CheckCircle2 
} from "lucide-react";
import { ALGERIA_68_WILAYAS } from "./WilayasList";
import { WILAYA_COMMUNES } from "./PublicCheckoutForm";

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
          className="w-full max-w-xl bg-zinc-900/60 border border-zinc-850 p-6 md:p-8 rounded-3xl text-center space-y-6 shadow-2xl relative"
        >
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/5">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-zinc-100">تم تسجيل طلبيتك بنجاح! 🎉</h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
              أهلاً بك، تم إرسال الطلبية وحفظها بنجاح في متجر <span className="text-yellow-500 font-bold">{merchantName}</span>. سوف يتم الاتصال بك هاتفياً لتأكيد الشحن خلال ساعات.
            </p>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-4.5 text-right space-y-3 shadow-inner text-xs">
            <div className="flex justify-between border-b border-zinc-900/80 pb-2.5">
              <span className="text-zinc-500 font-bold">اسم المستلم:</span>
              <span className="text-zinc-200 font-black">{customerName}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900/80 pb-2.5">
              <span className="text-zinc-500 font-bold">رقم الهاتف الفعال:</span>
              <span className="text-zinc-200 font-bold font-mono">{phoneNumber}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900/80 pb-2.5">
              <span className="text-zinc-500 font-bold">مكان الشحن:</span>
              <span className="text-zinc-200 font-bold">
                {activeWilayaObj?.nameAr || selectedWilaya} • {selectedCommune}
              </span>
            </div>
            {deliveryAddress.trim() && (
              <div className="flex justify-between border-b border-zinc-900/80 pb-2.5">
                <span className="text-zinc-500 font-bold">العنوان التفصيلي:</span>
                <span className="text-zinc-200">{deliveryAddress}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-zinc-900/80 pb-2.5">
              <span className="text-zinc-500 font-bold">طريقة الاستلام:</span>
              <span className="text-zinc-200 font-bold">
                {deliveryType === "home" ? "توصيل للمنزل 🏠" : "استلام من مكتب الشحن 📦"}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-zinc-400 font-extrabold">المبلغ المطلوب دفعاً عند الاستلام:</span>
              <span className="text-yellow-500 font-mono font-black text-sm">{finalPrice.toLocaleString()} DA</span>
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
            className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-750 font-black rounded-xl text-zinc-200 text-xs transition-colors cursor-pointer border border-zinc-700 hover:border-zinc-500"
          >
            تصفح المتجر مجدداً وطلب منتجات أخرى
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="text-right" dir="rtl">
      {/* Back button link */}
      <button
        onClick={onBackToStore}
        className="mb-6 py-2 px-4 bg-zinc-900 hover:bg-zinc-850 hover:text-white text-zinc-400 rounded-xl border border-zinc-850 hover:border-zinc-750 transition-colors inline-flex items-center gap-2 text-xs font-bold cursor-pointer"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة لتصفح منتجات المتجر</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 items-start">
        
        {/* Left column: Cart goods list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-zinc-950/40 border border-zinc-900 p-5 rounded-3xl space-y-4 shadow-xl">
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-zinc-900">
              <ShoppingCart className="w-4 h-4 text-yellow-500" />
              سلة التسوق الخاصة بك ({cart.length})
            </h3>

            {cart.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 flex flex-col items-center gap-2">
                <ShoppingBag className="w-10 h-10 text-zinc-800 animate-bounce" />
                <p className="text-xs font-bold">لا يوجد أي عناصر في السلة</p>
                <button
                  onClick={onBackToStore}
                  className="mt-2 text-xs text-yellow-500 hover:underline cursor-pointer"
                >
                  انقر هنا لبدء تسوق المنتجات
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex gap-3 bg-black/40 border border-zinc-900/60 p-2.5 rounded-2xl items-center justify-between"
                  >
                    <div className="flex gap-3 items-center">
                      {/* Frame preview */}
                      <div className="w-11 h-11 rounded-lg bg-zinc-950 border border-zinc-900 shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-800">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-[11px] font-bold text-zinc-200 line-clamp-1">{item.productName}</h4>
                        <div className="flex items-center gap-2.5 mt-0.5">
                          <p className="text-[10px] text-zinc-400 font-mono font-bold">{item.price.toLocaleString()} DA</p>
                          {(item.size || item.color) && (
                            <span className="text-[9px] text-zinc-600">
                              {[item.size, item.color].filter(Boolean).join(" • ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quantity switcher */}
                      <div className="flex items-center bg-zinc-950 rounded-lg border border-zinc-900 p-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.cartItemId, -1)}
                          className="w-5.5 h-5.5 rounded-md hover:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-[10px] font-mono font-bold w-5 text-center text-zinc-300">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.cartItemId, 1)}
                          className="w-5.5 h-5.5 rounded-md hover:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => onRemoveItem(item.cartItemId)}
                        className="text-zinc-700 hover:text-red-400 p-1 cursor-pointer"
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
              <div className="pt-3.5 border-t border-zinc-900 text-xs space-y-2.5">
                <div className="flex justify-between text-zinc-500">
                  <span>مجموع المنتجات:</span>
                  <span className="font-mono">{itemsTotal.toLocaleString()} DA</span>
                </div>
                <div className="flex justify-between text-zinc-500 items-center">
                  <span>تكلفة شحن وتوصيل الطرد:</span>
                  {loadingShipping ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-yellow-500" />
                  ) : selectedWilaya ? (
                    <span className="text-emerald-400 font-bold font-mono">{shippingFee > 0 ? `+ ${shippingFee} DA` : "مجاني"}</span>
                  ) : (
                    <span className="text-zinc-600 text-[10px]">بانتظار تحديد الولاية</span>
                  )}
                </div>
                <div className="flex justify-between text-sm font-black pt-2 bg-gradient-to-t from-black/20 p-2.5 rounded-2xl border-t border-zinc-900/80">
                  <span>المبلغ الإجمالي الكلي:</span>
                  <span className="font-mono text-yellow-500">{finalPrice.toLocaleString()} DA</span>
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
            className="bg-zinc-900/20 border border-zinc-900 p-5 md:p-6 rounded-3xl shadow-xl"
          >
            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              {orderErr && (
                <div className="p-3 bg-red-500/10 border border-red-500/15 rounded-xl text-xs text-red-400 font-bold">
                  {orderErr}
                </div>
              )}

              {/* Title Identity */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-yellow-500" />
                  1. معلومات الاتصال وقبول التكليف
                </h3>

                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold mb-1 px-1">الاسم الكامل للمستلم *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="مثال: يونس جلال"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-right pr-9 pl-3 py-2.5 bg-zinc-950/60 border border-zinc-850 rounded-xl text-zinc-100 text-xs focus:border-yellow-500/50 focus:outline-none transition-colors font-medium"
                    />
                    <User className="absolute right-3.5 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold mb-1 px-1">رقم هاتف المستلم لتأكيد التوصيل *</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="05XXXXXXXX / 06XXXXXXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-3 pr-9 py-2.5 bg-zinc-950/60 border border-zinc-850 rounded-xl text-zinc-100 text-xs text-left font-mono focus:border-yellow-500/50 focus:outline-none transition-colors"
                      dir="ltr"
                    />
                    <Phone className="absolute right-3.5 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <hr className="border-zinc-900" />

              {/* Geographical mapping */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-yellow-500" />
                  2. تفاصيل ومكان شحن الطرد
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1 px-1">الولاية *</label>
                    <div className="relative">
                      <select
                        required
                        value={selectedWilaya}
                        onChange={handleWilayaChange}
                        className="w-full pl-8 pr-3 py-2.5 bg-zinc-950/60 border border-zinc-850 rounded-xl text-zinc-200 text-xs focus:border-yellow-500/50 focus:outline-none transition-colors appearance-none cursor-pointer font-bold"
                      >
                        <option value="" disabled className="text-zinc-650">اختر الولاية</option>
                        {ALGERIA_68_WILAYAS.map(w => (
                          <option key={w.code} value={`${w.code} - ${w.nameAr}`} className="bg-[#050505] text-zinc-100">
                            {w.code} - {w.nameAr}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-2.5 top-3 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1 px-1">البلدية *</label>
                    <div className="relative">
                      <select
                        required
                        value={selectedCommune}
                        onChange={(e) => setSelectedCommune(e.target.value)}
                        disabled={!selectedWilaya}
                        className="w-full pl-8 pr-3 py-2.5 bg-zinc-950/60 border border-zinc-850 rounded-xl text-zinc-250 text-xs focus:border-yellow-500/50 focus:outline-none transition-colors appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                      >
                        <option value="" disabled className="text-zinc-650">اختر البلدية</option>
                        {communesList.map((comm, idx) => (
                          <option key={idx} value={comm} className="bg-[#050505] text-zinc-100">
                            {comm}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-2.5 top-3 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold mb-1 px-1">العنوان السكني التفصيلي</label>
                  <input
                    type="text"
                    placeholder="مثال: حي السلام، عمارة رقم 3، الطابق 2"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-850 rounded-xl text-zinc-100 text-xs focus:border-yellow-500/50 focus:outline-none transition-colors font-medium"
                  />
                </div>

                {/* Delivery Type switcher */}
                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold mb-1.5 px-1">طريقة التوصيل المفضلة *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryType("home")}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${deliveryType === "home" ? "bg-white text-black border-white shadow-md font-black" : "bg-zinc-950/40 border-zinc-850 text-zinc-400 hover:text-white"}`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      🏠 توصيل للمنزل
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType("desk")}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${deliveryType === "desk" ? "bg-white text-black border-white shadow-md font-black" : "bg-zinc-950/40 border-zinc-850 text-zinc-400 hover:text-white"}`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      📦 استلام من المكتب Desktop
                    </button>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold mb-1 px-1">ملاحظات تود إضافتها للطلب</label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="أضف أي تفاصيل خاصة بالمقاس أو طريقة ومدة الشحن المتاحة..."
                    className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-850 rounded-xl text-zinc-100 text-xs focus:border-yellow-500/50 focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Submit Trigger */}
              <button
                type="submit"
                disabled={submittingOrder || cart.length === 0}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-extrabold text-xs rounded-xl tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-yellow-500/10 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submittingOrder ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    جاري إرسال الطلبية وتأكيد الحجز...
                  </>
                ) : (
                  <>
                    تأكيد وإرسال الطلب الآن ⚡
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
