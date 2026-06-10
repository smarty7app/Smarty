import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MapPin, Clock, Plus, LayoutDashboard, Trash2, User, AlertTriangle, 
  TrendingUp, CheckCircle2, Truck, XCircle, ShoppingBag, Home, Briefcase, Percent,
  ArrowLeft, Search, Filter, FileText, Download, X, Eye, RefreshCw
} from "lucide-react";
import { doc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../lib/firebase";

export default function Dashboard({ userData, ordersHistory, planLimits, topWilayas, t, setScreen, handleViewOrder, setOrderToDelete }: any) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState("");
  
  // Bulk selection states for Dispatching pending orders in groups
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState("Yalidine Express");
  
  // Tab control between Analytical Stats and Labels Archive
  const [dashboardTab, setDashboardTab] = useState<"stats" | "labels">("stats");
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const q = query(
      collection(db, "inventory"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(items);
    }, (error) => {
      console.error("Error loading inventory for dashboard stats:", error);
    });

    return () => unsubscribe();
  }, []);

  const totalStockValue = products.reduce((sum, p) => sum + ((Number(p.price) || 0) * (Number(p.stockQuantity) || 0)), 0);
  const totalStockQuantity = products.reduce((sum, p) => sum + (Number(p.stockQuantity) || 0), 0);
  const [labelsSearch, setLabelsSearch] = useState("");
  const [labelsCourierFilter, setLabelsCourierFilter] = useState("all");
  const [activePreviewLabelUrl, setActivePreviewLabelUrl] = useState<string | null>(null);
  const [activePreviewTracking, setActivePreviewTracking] = useState<string | null>(null);
  const [showSuspiciousModal, setShowSuspiciousModal] = useState(false);

  // Infinite scrolling limits for each lists
  const [ordersLimit, setOrdersLimit] = useState(15);
  const [filteredOrdersLimit, setFilteredOrdersLimit] = useState(15);
  const [labelsLimit, setLabelsLimit] = useState(15);

  const mainSentinelRef = useRef<HTMLDivElement | null>(null);
  const filteredSentinelRef = useRef<HTMLDivElement | null>(null);
  const labelsSentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset limits on tab or filters/searches changes
  useEffect(() => {
    setOrdersLimit(15);
  }, [dashboardTab, statusFilter]);

  useEffect(() => {
    setFilteredOrdersLimit(15);
  }, [filterSearch, statusFilter]);

  useEffect(() => {
    setLabelsLimit(15);
  }, [labelsSearch, labelsCourierFilter, dashboardTab]);

  // Infinite Scroll IntersectionObserver setup
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target.id === "sentinel-main") {
            setOrdersLimit(prev => prev + 15);
          } else if (entry.target.id === "sentinel-filtered") {
            setFilteredOrdersLimit(prev => prev + 15);
          } else if (entry.target.id === "sentinel-labels") {
            setLabelsLimit(prev => prev + 15);
          }
        }
      });
    }, { rootMargin: "150px" });

    const mainSentinel = mainSentinelRef.current;
    const filteredSentinel = filteredSentinelRef.current;
    const labelsSentinel = labelsSentinelRef.current;

    if (mainSentinel) observer.observe(mainSentinel);
    if (filteredSentinel) observer.observe(filteredSentinel);
    if (labelsSentinel) observer.observe(labelsSentinel);

    return () => {
      if (mainSentinel) observer.unobserve(mainSentinel);
      if (filteredSentinel) observer.unobserve(filteredSentinel);
      if (labelsSentinel) observer.unobserve(labelsSentinel);
    };
  }, [statusFilter, dashboardTab]);

  const shippedCount = ordersHistory.filter((o:any) => o.status === "shipped" || o.status === "delivered" || o.status === "in_transit").length;
  const deliveredCount = ordersHistory.filter((o:any) => o.status === "delivered").length;
  const deliveryRate = shippedCount > 0 ? Math.round((deliveredCount / shippedCount) * 100) : 0;

  // Advanced Stats Calculation
  const total = ordersHistory.length;
  const pending = ordersHistory.filter((o: any) => o.status === "pending").length;
  const confirmed = ordersHistory.filter((o: any) => o.status === "confirmed").length;
  const shipped = ordersHistory.filter((o: any) => o.status === "shipped").length;
  const inTransit = ordersHistory.filter((o: any) => o.status === "in_transit").length;
  const delivered = ordersHistory.filter((o: any) => o.status === "delivered").length;
  const returned = ordersHistory.filter((o: any) => o.status === "returned").length;

  const awaitingProcessing = pending + confirmed;
  const activeDelivery = shipped + inTransit;

  // Delivery success ratio vs failure (returns)
  const closedCount = delivered + returned;
  const successDeliveryRatio = closedCount > 0 ? Math.round((delivered / closedCount) * 100) : 0;
  const returnRatio = closedCount > 0 ? Math.round((returned / closedCount) * 100) : 0;

  // Delivery type distribution
  const homeCount = ordersHistory.filter((o: any) => o.delivery_type === "home" || o.deliveryType === "home").length;
  const deskCount = ordersHistory.filter((o: any) => o.delivery_type === "desk" || o.deliveryType === "desk" || o.delivery_type === "office" || o.delivery_type === "desk_office").length;

  // Suspicious orders (flagged by AI or dynamic structural filters)
  const suspiciousOrders = ordersHistory.filter((o: any) => {
    if (o.possible_fake_order) return true;
    const name = (o.name || "").trim();
    const phone = (o.phone || "").trim();
    const wilaya = (o.wilaya || "").trim();
    const commune = (o.commune || "").trim();
    
    if (!name || name.length < 3) return true;
    if (!phone) return true;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) return true;
    if (!/^(05|06|07|02|03|04|09|5|6|7)/.test(phone.replace(/\s+/g, "").replace(/^\+213/, "0"))) return true;
    if (!wilaya || wilaya === "" || wilaya.toLowerCase() === "unknown") return true;
    if (!commune || commune === "" || commune.toLowerCase() === "unknown") return true;
    
    return false;
  });
  const suspiciousCount = suspiciousOrders.length;

  // Storefront orders count
  const storefrontOrdersCount = ordersHistory.filter((o: any) => o.storeOrder === true || o.source === "storefront").length;

  // Calculate bestselling products across store sales
  const bestsellingProducts = (() => {
    const counts: { [key: string]: { id: string; name: string; quantity: number; revenue: number; image?: string } } = {};
    
    ordersHistory.forEach((order: any) => {
      if (order.status === "returned" || order.status === "cancelled") return;
      
      const items = order.items || [];
      items.forEach((item: any) => {
        const pId = item.productId || item.id || "unknown";
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        
        if (counts[pId]) {
          counts[pId].quantity += qty;
          counts[pId].revenue += qty * price;
        } else {
          counts[pId] = {
            id: pId,
            name: item.productName || item.name || (t.total_orders === "إجمالي الطلبات" ? "منتج غير معروف" : "Unknown Product"),
            quantity: qty,
            revenue: qty * price,
            image: item.imageUrl || item.image
          };
        }
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  })();

  // Bilingual detection & labeling helper
  const isAr = t.total_orders === "إجمالي الطلبات";
  const isFr = t.total_orders === "Total Commandes";
  const isRtl = isAr;

  const getLabel = (ar: string, fr: string, en: string) => {
    if (isAr) return ar;
    if (isFr) return fr;
    return en;
  };

  const getSuspicionReasons = (order: any) => {
    const reasons: string[] = [];
    const name = (order.name || "").trim();
    const phone = (order.phone || "").trim();
    const wilaya = (order.wilaya || "").trim();
    const commune = (order.commune || "").trim();

    if (!name) {
      reasons.push(isAr ? "الاسم مجهول أو مفقود بالكامل" : isFr ? "Le nom est manquant" : "Customer name is missing");
    } else if (name.length < 3) {
      reasons.push(isAr ? "الاسم قصير جداً (يرجى التأكد من الجدية)" : isFr ? "Le nom est trop court" : "Name is too short");
    }

    if (!phone) {
      reasons.push(isAr ? "رقم الهاتف غير موجود" : isFr ? "Numéro de téléphone manquant" : "Phone number is missing");
    } else {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 9 || digits.length > 13) {
        reasons.push(isAr ? `رقم الهاتف غير صحيح (${digits.length} أرقام غير كافية لشبكات الجزائر)` : isFr ? `Numéro de téléphone invalide (${digits.length} chiffres)` : `Invalid phone number layout (${digits.length} digits)`);
      } else {
        const cleanPhone = phone.replace(/\s+/g, "").replace(/^\+213/, "0");
        if (!/^(05|06|07|02|03|04|09|5|6|7)/.test(cleanPhone)) {
          reasons.push(isAr ? "رقم الهاتف لا يبدأ ببادئة اتصالات جزائرية معتمدة (05, 06, 07)" : isFr ? "Préfixe de l'opérateur non reconnu en Algérie (05, 06, 07)" : "Unrecognized carrier prefix for Algeria (05, 06, 07)");
        }
      }
    }

    if (!wilaya || wilaya === "" || wilaya.toLowerCase() === "unknown") {
      reasons.push(isAr ? "اسم الولاية مفقود أو غير محدد بدقة" : isFr ? "La Wilaya est manquante ou indéterminée" : "Wilaya is missing or invalid");
    }

    if (!commune || commune === "" || commune.toLowerCase() === "unknown") {
      reasons.push(isAr ? "اسم البلدية مفقود أو لم يتم التعرف عليه" : isFr ? "La Commune est manquante" : "Commune is missing");
    }

    if (order.possible_fake_order) {
      reasons.push(isAr ? "النظام الذكي اشتبه في جدية الطلب أو نص الرسالة" : isFr ? "L'IA a détecté une possible commande douteuse" : "AI system flagged this text as highly suspicious");
    }

    return reasons;
  };

  const handleBulkConfirm = async () => {
    if (selectedOrderIds.length === 0) return;

    // Check if the selected carrier is allowed for their plan
    const planType = userData?.planType || "free";
    const isProOrAbove = planType === "pro" || planType === "professional" || planType === "unlimited" || planType === "business" || planType === "enterprise";
    const isBusinessOrAbove = planType === "unlimited" || planType === "business" || planType === "enterprise";

    let isAllowed = false;
    if (selectedCarrier === "Yalidine Express") {
      isAllowed = true;
    } else if (selectedCarrier === "ZR Express" || selectedCarrier === "Maystro Delivery") {
      isAllowed = isProOrAbove;
    } else if (selectedCarrier === "ECOTRACK" || selectedCarrier === "Anderson") {
      isAllowed = isBusinessOrAbove;
    }

    if (!isAllowed) {
      alert(isAr 
        ? `عذراً! خطتك الحالية لا تدعم ربط وإرسال الطلبيات لـ ${selectedCarrier}. يرجى ترقيه اشتراكك.` 
        : `Your current plan doesn't support integration/shipping with ${selectedCarrier}. Please upgrade layout permission in subscription center.`
      );
      return;
    }

    setBulkConfirming(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/bulk-confirm-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ orderIds: selectedOrderIds, carrier: selectedCarrier }),
      });

      if (!response.ok) {
        throw new Error("Express shipping register failed");
      }

      const promises = selectedOrderIds.map(id => 
        updateDoc(doc(db, "orders", id), { status: "confirmed" })
      );
      await Promise.all(promises);

      alert(isAr 
        ? `تم بنجاح إرسال ومزامنة ${selectedOrderIds.length} طلبيات مع شركة التوصيل (${selectedCarrier}) ⚡ وتحويل حالتها إلى "مؤكد"!`
        : `Dispatched and confirmed ${selectedOrderIds.length} orders successfully via ${selectedCarrier}!`
      );
      setSelectedOrderIds([]);
    } catch (err: any) {
      console.error("Bulk shipping confirmation failed", err);
      try {
        const promises = selectedOrderIds.map(id => 
          updateDoc(doc(db, "orders", id), { status: "confirmed" })
        );
        await Promise.all(promises);
        alert(isAr 
          ? `تم تحديث وتأكيد حالة الطلبيات المحددة (${selectedOrderIds.length}) مباشرة في قاعدة البيانات بنجاح لـ ${selectedCarrier}! ✅`
          : `Dispatched locally. Confirmed ${selectedOrderIds.length} orders in Firestore for ${selectedCarrier}.`
        );
        setSelectedOrderIds([]);
      } catch (fErr: any) {
        console.error("Dashboard bulk confirmation failure:", fErr);
        alert(isAr 
          ? "فشلت عملية التأكيد والتحميل المزدوج لجميع الطلبات. تم تدوين التفاصيل في وحدة التحكم." 
          : "Failure executing bulk confirmation. Details have been logged to the console."
        );
      }
    } finally {
      setBulkConfirming(false);
    }
  };

  const formatTime = (date: any) => {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    if (isAr) {
      return d.toLocaleString("ar-DZ", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } else {
      return d.toLocaleString("fr-FR", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    }
  };

  if (statusFilter !== null) {
    const getFilteredOrders = () => {
      switch (statusFilter) {
        case "all":
          return ordersHistory;
        case "awaiting":
          return ordersHistory.filter((o: any) => o.status === "pending" || o.status === "confirmed");
        case "transit":
          return ordersHistory.filter((o: any) => o.status === "shipped" || o.status === "in_transit");
        case "delivered":
          return ordersHistory.filter((o: any) => o.status === "delivered");
        case "returned":
          return ordersHistory.filter((o: any) => o.status === "returned");
        case "storefront":
          return ordersHistory.filter((o: any) => o.storeOrder === true || o.source === "storefront");
        default:
          return ordersHistory;
      }
    };

    const getFilterTitle = () => {
      switch (statusFilter) {
        case "all":
          return getLabel("إجمالي الطلبيات", "Toutes les Commandes", "Total Orders");
        case "awaiting":
          return getLabel("في انتظار التأكيد / التحضير", "En Attente de Confirmation", "Awaiting Confirmation");
        case "transit":
          return getLabel("قيد الشحن والتوصيل", "En Cours d'Expédition", "In Transit & Shipping");
        case "delivered":
          return getLabel("الطلبيات المستلمة", "Livraisons Réussies", "Delivered & Received");
        case "returned":
          return getLabel("الطلبيات المرتجعة", "Retours & Rejets", "Returned & Cancelled");
        case "storefront":
          return getLabel("طلبات المتجر الإلكتروني 🛒", "Commandes de la Boutique 🛒", "Storefront Orders 🛒");
        default:
          return getLabel("الطلبات المفروزة", "Commandes Filtrées", "Filtered Orders");
      }
    };

    const targetOrders = getFilteredOrders().filter((o: any) => {
      const q = filterSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        o.name?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.wilaya?.toLowerCase().includes(q) ||
        o.commune?.toLowerCase().includes(q)
      );
    });

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="space-y-6 animate-fade-in"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Header section with back button */}
        <div className="flex items-center justify-between glass-panel rounded-2xl p-4">
          <button
            onClick={() => { setStatusFilter(null); setFilterSearch(""); }}
            className="p-2.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-300 rounded-xl transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-lg"
          >
            <ArrowLeft className={`w-5 h-5 ${isAr ? "rotate-0" : "rotate-180"}`} />
          </button>
          <div className="text-center flex-1">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center justify-center gap-2">
              <Filter className="w-4 h-4 text-purple-400 animate-pulse" />
              {getFilterTitle()} 
              <span className="text-xs bg-purple-500/15 text-purple-400 px-2.5 py-0.5 rounded-full font-mono font-bold border border-purple-500/10">
                {targetOrders.length}
              </span>
            </h2>
            <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
              {getLabel(
                "قائمة الطلبات المصفاة حسب الحالة المختارة ومحرك البحث السريع",
                "Liste des commandes filtrées selon le statut choisi",
                "Filtered order listings matching your chosen status and search criterion"
              )}
            </p>
          </div>
        </div>

        {/* Search input to refine results within this slice */}
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-550">
            <Search className="w-4 h-4 text-zinc-500" />
          </div>
          <input
            type="text"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder={getLabel("البحث باسم الزبون، رقمه، أو الولاية...", "Rechercher par nom, tél, wilaya...", "Search by client name, phone, or wilaya...")}
            className="w-full h-12 pr-10 pl-4 slick-input text-sm text-zinc-100 placeholder-zinc-650 outline-none focus:outline-none transition-all font-sans"
          />
          {filterSearch && (
            <button
              onClick={() => setFilterSearch("")}
              className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-450 hover:text-zinc-250 text-xs cursor-pointer"
            >
              {getLabel("مسح", "Effacer", "Clear")}
            </button>
          )}
        </div>

        {/* Display the matching orders */}
        {targetOrders.length === 0 ? (
          <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl py-12 text-center text-zinc-650">
            <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-10" />
            <p className="text-sm text-zinc-500">
              {getLabel("لا توجد أي طلبيات مطابقة لهذه الحالة", "Aucune commande trouvée", "No orders found matching this status")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {targetOrders.slice(0, filteredOrdersLimit).map((order: any) => {
                const statusColorsMap: any = {
                  pending: "bg-amber-400/5 text-amber-500 border-amber-500/20 hover:bg-amber-400/10",
                  confirmed: "bg-emerald-400/5 text-emerald-400 border-emerald-500/20 hover:bg-emerald-400/10",
                  shipped: "bg-sky-400/5 text-sky-400 border-sky-500/20 hover:bg-sky-400/10",
                  in_transit: "bg-sky-400/5 text-sky-450 border-sky-500/20 hover:bg-sky-400/10",
                  delivered: "bg-emerald-400/10 text-emerald-350 border-emerald-500/30 hover:bg-emerald-400/15",
                  returned: "bg-rose-450/5 text-rose-450 border-rose-500/20 hover:bg-rose-450/10",
                };
                const badgeStyle = statusColorsMap[order.status] || "bg-zinc-850 text-zinc-300 border-zinc-750 hover:bg-zinc-800";

                return (
                  <div
                    key={order.id}
                    onClick={() => handleViewOrder(order)}
                    className="glass-panel p-4 flex items-center justify-between group hover:border-zinc-700/80 hover:bg-white/[0.03] hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:scale-[1.01] cursor-pointer transition-all duration-300 select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
                        order.possible_fake_order 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                          : (order.storeOrder || order.source === "storefront")
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-400 group-hover:border-zinc-700'
                      }`}>
                        {order.possible_fake_order ? (
                          <AlertTriangle className="w-5.5 h-5.5" />
                        ) : (order.storeOrder || order.source === "storefront") ? (
                          <ShoppingBag className="w-5.5 h-5.5" />
                        ) : (
                          <User className="w-5.5 h-5.5" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white flex items-center gap-2 flex-wrap">
                          <span>{order.name}</span>
                          {(order.storeOrder || order.source === "storefront") && (
                            <span className="text-[9px] bg-purple-550/15 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-black font-sans shrink-0">
                              {isAr ? "طلب المتجر 🛒" : "Storefront 🛒"}
                            </span>
                          )}
                        </h4>
                        <p className="text-[10.5px] text-zinc-400 font-medium mt-1 select-none">{order.wilaya} • {order.phone}</p>
                        {order.createdAt && (
                          <p className="text-[9px] text-zinc-500 mt-1 flex items-center gap-1 font-mono font-bold">
                            <Clock className="w-3 h-3 text-zinc-600 shrink-0" />
                            <span>{formatTime(order.createdAt)}</span>
                          </p>
                        )}
                        {order.note && (
                          <p className="text-[10px] text-amber-400 mt-1.5 flex items-center gap-1.5 font-bold bg-amber-500/5 w-fit px-2 py-0.5 rounded border border-amber-500/10">
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[200px]">{order.note}</span>
                          </p>
                        )}
                        {order.dispatchError && (
                          <p className="text-[10px] text-red-400 font-extrabold mt-1.5 flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 w-fit px-2 py-0.5 rounded text-direction-rtl">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="truncate max-w-[220px]">{order.dispatchError}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] px-2.5 py-1.5 rounded-full uppercase font-black tracking-wider border transition-all duration-200 ${badgeStyle}`}>
                        {(t as any)[`status_${order.status}`] || order.status}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOrderToDelete(order.id); }}
                        className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {targetOrders.length > filteredOrdersLimit && (
              <div id="sentinel-filtered" ref={filteredSentinelRef} className="py-8 flex flex-col items-center justify-center space-y-2 text-center text-zinc-500">
                <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />
                <p className="text-[10px] font-medium text-zinc-400">
                  {isAr ? "جاري تحميل المزيد من الطلبيات المصفاة..." : "Loading more filtered orders..."}
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Top Banner & Insight Box */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
        
        {/* Title Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 border-b border-zinc-805 pb-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-500" />
              {t.summary_title}
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
              {getLabel(
                "تحديثات حية لأداء مبيعاتك ونسب نجاح شحن وتوصيل الطرود في الجزائر",
                "Mises à jour en direct de l'état de vos ventes et livraisons en Algérie",
                "Real-time update of your sales progress and delivery success in Algeria"
              )}
            </p>
          </div>
          {suspiciousCount > 0 && (
            <button 
              type="button"
              onClick={() => setShowSuspiciousModal(true)}
              className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2 self-start md:self-auto select-none transition-all cursor-pointer active:scale-95"
            >
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
              <span className="text-[10px] font-extrabold text-yellow-400 font-sans tracking-wide">
                {suspiciousCount} {getLabel("طلبيات مشبوهة", "commandes suspectes", "suspicious orders")}
              </span>
            </button>
          )}
        </div>

        {/* Segmented Switcher */}
        <div className="flex bg-black/60 border border-zinc-800 p-1 rounded-2xl mb-6 backdrop-blur-sm">
          <button 
            type="button"
            onClick={() => setDashboardTab("stats")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${dashboardTab === "stats" ? "bg-white text-black shadow-lg font-extrabold" : "text-zinc-500 hover:text-zinc-350"}`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {isAr ? "إحصائيات الأداء والمؤشرات" : "Analyses & Indicateurs"}
          </button>
          <button 
            type="button"
            onClick={() => setDashboardTab("labels")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${dashboardTab === "labels" ? "bg-white text-black shadow-lg font-extrabold" : "text-zinc-500 hover:text-zinc-350"}`}
          >
            <FileText className="w-3.5 h-3.5" />
            {isAr ? "أرشيف ملصقات الشحن" : "Archived Shipping Labels"}
            {ordersHistory.filter((o: any) => o.tracking_number || o.label_url).length > 0 && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold leading-none ${dashboardTab === "labels" ? "bg-zinc-950 text-emerald-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                {ordersHistory.filter((o: any) => o.tracking_number || o.label_url).length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Selection Renderer */}
        {dashboardTab === "stats" ? (
          /* Stats Analytics view section */
          <div className="space-y-6">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {/* Total Stock Value Card */}
              <div 
                onClick={() => setScreen("products")}
                className="glass-card p-4 hover:border-emerald-500/30 cursor-pointer active:scale-95 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">
                    {getLabel("قيمة المخزون", "Valeur Stock", "Stock Value")}
                  </span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-550 transition-colors">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="block text-base font-bold font-mono text-emerald-400 tracking-tight leading-none mb-1">
                    {totalStockValue.toLocaleString()} DA
                  </span>
                  <span className="text-[9px] text-zinc-500 truncate leading-none block">
                    {totalStockQuantity} {getLabel("قطعة متوفرة", "pièces dispos", "items available")}
                  </span>
                </div>
              </div>

              {/* Total Orders */}
              <div 
                onClick={() => setStatusFilter("all")} 
                className="glass-card p-4 hover:border-purple-500/30 cursor-pointer active:scale-95 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">{t.total_orders}</span>
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-black text-white tracking-tight">{total}</span>
                  <span className="text-[9px] text-zinc-500 truncate leading-none block">
                    {getLabel("عرض كل الطلبيات المتاحة", "Voir toutes les commandes", "View all orders")}
                  </span>
                </div>
              </div>

              {/* Pending / Confirming */}
              <div 
                onClick={() => setStatusFilter("awaiting")}
                className="glass-card p-4 hover:border-amber-500/30 cursor-pointer active:scale-95 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">{t.pending_orders}</span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                    <Clock className="w-4 h-4 animate-pulse" />
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-black text-amber-500 tracking-tight">{awaitingProcessing}</span>
                  <span className="text-[9px] text-zinc-500 truncate leading-none block">
                    {getLabel("قيد التأكيد والفرز للمخزن", "En attente de traitement", "Pending verification")}
                  </span>
                </div>
              </div>

              {/* In Transit Card */}
              <div 
                onClick={() => setStatusFilter("transit")}
                className="glass-card p-4 hover:border-blue-500/30 cursor-pointer active:scale-95 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">{t.status_in_transit}</span>
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-black text-blue-400 tracking-tight">{activeDelivery}</span>
                  <span className="text-[9px] text-zinc-500 truncate leading-none block">
                    {getLabel("طرود قيد الشحن والتوصيل", "En transit chez le livreur", "Package on transit")}
                  </span>
                </div>
              </div>

              {/* Delivered Success Card */}
              <div 
                onClick={() => setStatusFilter("delivered")}
                className="glass-card p-4 hover:border-emerald-500/30 cursor-pointer active:scale-95 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">{t.status_delivered}</span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-black text-emerald-400 tracking-tight">{delivered}</span>
                  <span className="text-[9px] text-zinc-500 truncate leading-none block">
                    {getLabel("طلبات استلمها الزبون بنجاح", "Commandes livrées avec succès", "View successfully delivered")}
                  </span>
                </div>
              </div>

              {/* Returned (Rotour) Card */}
              <div 
                onClick={() => setStatusFilter("returned")}
                className="glass-card p-4 hover:border-red-500/30 cursor-pointer active:scale-95 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">{t.status_returned}</span>
                  <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-black text-red-400 tracking-tight">{returned}</span>
                  <span className="text-[9px] text-zinc-500 truncate leading-none block">
                    {getLabel("طرود مرتجعة أو ملغاة", "Colis retournés ou annulés", "View returned/canceled")}
                  </span>
                </div>
              </div>

              {/* Delivery success rate card */}
              <div className="glass-card p-4 hover:border-emerald-500/30 cursor-pointer active:scale-95 transition-all flex flex-col justify-between group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">{t.stats_delivery_rate}</span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Percent className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-black text-emerald-400 tracking-tight">{deliveryRate}%</span>
                  <span className="text-[9px] text-zinc-500 truncate leading-none block">
                    {getLabel("نسبة نجاح التوصيل الفعلي", "Taux de livraison réussi", "Successful delivery rate")}
                  </span>
                </div>
              </div>

              {/* Storefront Orders Card */}
              <div 
                onClick={() => setStatusFilter("storefront")}
                className="glass-card p-4 hover:border-pink-500/30 cursor-pointer active:scale-95 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">
                    {getLabel("طلبات المتجر", "Boutique", "Storefront")}
                  </span>
                  <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400">
                    <ShoppingBag className="w-4 h-4 animate-pulse" />
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-black text-pink-405 tracking-tight">{storefrontOrdersCount}</span>
                  <span className="text-[9px] text-zinc-500 truncate leading-none block">
                    {getLabel("طلبات قادمة عبر السلة", "Commandes de la boutique", "Orders via store cart")}
                  </span>
                </div>
              </div>

            </div>

            {/* Performance breakdown chart */}
            {closedCount > 0 && (
              <div className="bg-black/30 rounded-2xl p-4 border border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-300 mb-2 flex items-center justify-start gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  {getLabel("مقارنة تسليم الطلبات المغلقة والمسترجعة (المرتجعات)", "Performance de livraison (Livrés vs Retours)", "Closed Shipments Performance (Delivered vs Returns)")}
                </h3>
                <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">
                  {getLabel(
                    `من بين ${closedCount} طرد منتهي (تم استلامه أو رجوعه)، توزع المصير كالتالي:`,
                    `Sur un total de ${closedCount} colis terminés (livrés ou retournés), la répartition est :`,
                    `Out of ${closedCount} finished shipments (either delivered or returned), the distribution is:`
                  )}
                </p>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden flex">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${successDeliveryRatio}%` }}
                    style={{ backgroundColor: "#22c55e" }}
                    className="h-full"
                    title={`Delivered: ${successDeliveryRatio}%`}
                  />
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${returnRatio}%` }}
                    style={{ backgroundColor: "#ef4444" }}
                    className="h-full"
                    title={`Returned: ${returnRatio}%`}
                  />
                </div>
                <div className="flex justify-between items-center mt-2.5 text-[10px]">
                  <div className="flex items-center gap-1.5 font-semibold text-green-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                    <span>{getLabel("استلام ناجح", "Livré", "Delivered")} ({successDeliveryRatio}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-red-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span>{getLabel("مرتجع", "Retour", "Returned")} ({returnRatio}%)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Splits Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Wilayas analytics button card */}
              <div 
                onClick={() => setScreen("wilayas")} 
                className="bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden text-right"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t.stats_top_wilayas || "ولايات الجزائر"}</span>
                    <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500 group-hover:scale-110 transition-transform">
                      <MapPin className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100 group-hover:text-yellow-400 transition-colors">
                    {getLabel("الولايات الأكثر طلباً والدليل الجغرافي", "Wilayas les Plus Demandées & Annuaire", "Most Demanded Wilayas & Analytics")}
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                    {getLabel(
                      "تتبع فرز المبيعات الجغرافية والتحليلات الذكية ونسب التوصيل والمرتجعات لكل ولاية مباشرة.",
                      "Suivez l'analyse des ventes par wilaya, les taux de livraison et l'annuaire complet.",
                      "Track geographical sales analytics, delivery rates, and full 68 wilayas directory."
                    )}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-yellow-500 group-hover:gap-2 transition-all">
                  <span>{getLabel("عرض وتصفح التحليل الكامل للولايات الـ 68", "Voir l'analyse des 68 wilayas", "View full analysis of 68 wilayas")}</span>
                  <span className="text-xs font-mono">→</span>
                </div>
              </div>

              {/* Delivery Choice breakdown */}
              <div className="bg-black/20 rounded-2xl p-4 border border-zinc-800 flex flex-col justify-between text-right">
                <div>
                  <h3 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-3 flex items-center justify-start gap-2">
                    <Truck className="w-4 h-4 text-blue-400" />
                    {getLabel("نوع استلام الطرود", "Distribution de Livraison", "Delivery Location Type")}
                  </h3>
                  <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed">
                    {getLabel(
                      "توزيع خيارات زبائنك بين التوصيل للبيت ومكتب شركة الشحن.",
                      "Répartition des choix de vos clients pour la livraison (à domicile ou bureau).",
                      "Analysis of customer preference between home delivery and office pickup."
                    )}
                  </p>
                  
                  <div className="space-y-3.5">
                    {/* Home delivery usage bar */}
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1 text-zinc-300">
                        <span className="flex items-center gap-1.5 pb-1">
                          <Home className="w-3.5 h-3.5 text-zinc-400" />
                          {t.delivery_home}
                        </span>
                        <span className="font-mono text-zinc-400">{homeCount}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${total > 0 ? (homeCount / total) * 100 : 0}%` }} />
                      </div>
                    </div>

                    {/* Office/Stop-desk delivery usage bar */}
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1 text-zinc-300">
                        <span className="flex items-center gap-1.5 pb-1">
                          <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                          {t.delivery_desk}
                        </span>
                        <span className="font-mono text-zinc-400">{deskCount}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${total > 0 ? (deskCount / total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* 3. Bestselling Products Card */}
            <div className="bg-gradient-to-br from-[#0a0a0a] to-[#0c0c0c] border border-zinc-900 rounded-2xl p-5 text-right space-y-4 shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center justify-start gap-2">
                  <span className="text-yellow-500 text-lg">🏆</span>
                  {getLabel("المنتجات الأكثر مبيعاً في المتجر", "Produits les Plus Vendus", "Bestselling Storefront Products")}
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1 font-sans">
                  {getLabel(
                    "أفضل 5 منتجات مبيعاً بناءً على كميات الطلبات وتفاصيل المبيعات الفعلية.",
                    "Top 5 des produits les plus vendus selon les quantités commandées.",
                    "Top 5 bestselling items based on actual order quantities and sales."
                  )}
                </p>
              </div>

              {bestsellingProducts.length === 0 ? (
                <div className="py-8 text-center text-zinc-650 border border-dashed border-zinc-904 rounded-xl">
                  <p className="text-xs">{getLabel("لا توجد مبيعات مسجلة للمنتجات بعد.", "Aucune vente enregistrée pour le moment.", "No product sales recorded yet.")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-400 font-bold">
                        <th className="pb-2.5 font-bold">{getLabel("المنتج", "Produit", "Product")}</th>
                        <th className="pb-2.5 text-center font-bold">{getLabel("الكمية المباعة", "Quantité", "Qty Sold")}</th>
                        <th className="pb-2.5 text-left font-bold">{getLabel("إجمالي الإيرادات", "Revenu Total", "Total Revenue")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60 font-sans">
                      {bestsellingProducts.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-zinc-950/40 transition-colors">
                          <td className="py-3 flex items-center gap-2.5">
                            <span className="text-xs font-mono font-bold text-zinc-650 w-4">#{idx + 1}</span>
                            <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-855 flex items-center justify-center overflow-hidden shrink-0">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs text-zinc-655 font-bold font-mono">DA</span>
                              )}
                            </div>
                            <span className="font-semibold text-zinc-200 line-clamp-1">{p.name}</span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="inline-block bg-yellow-500/10 text-yellow-500 font-black px-2 py-0.5 rounded-lg text-[11px] font-mono">
                              {p.quantity} pcs
                            </span>
                          </td>
                          <td className="py-3 text-left font-mono text-emerald-400 font-bold">
                            {p.revenue.toLocaleString()} DA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Labels Archive Tab Screen */
          <div className="space-y-5 animate-fade-in text-right">
            
            {/* Search Filter Header Panel */}
            <div className="bg-gradient-to-br from-zinc-950/80 to-zinc-900/50 border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-right">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center justify-start gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    {isAr ? "أرشيف ملصقات الشحن المستخرجة" : "Schedules & Labels Archive"}
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {isAr ? "مراجعة وتنزيل كافة ملصقات Yalidine و ZR المؤكدة والتحكم بها فورياً" : "View previously generated shipping carrier documents in real-time"}
                  </p>
                </div>
                <div className="self-start sm:self-auto text-[10px] px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-bold font-mono">
                  {isAr ? "إجمالي الملصقات: " : "Labels found: "}
                  {ordersHistory.filter((o: any) => o.tracking_number || o.label_url).length}
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-2">
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 pointer-events-none">
                    <Search className="w-4 h-4" />
                  </span>
                  <input 
                    type="text"
                    value={labelsSearch}
                    onChange={(e) => setLabelsSearch(e.target.value)}
                    placeholder={isAr ? "ابحث باسم الزبون، رقم التتبع، الولاية، أو الهاتف..." : "Acheteur, Wilaya, Tracking..."}
                    className="w-full h-11 text-xs bg-zinc-900/60 border border-zinc-800 focus:border-zinc-700 outline-none text-zinc-150 pl-4 pr-10 rounded-xl transition-all font-sans text-right"
                  />
                  {labelsSearch && (
                    <button 
                      onClick={() => setLabelsSearch("")}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 hover:text-white text-xs cursor-pointer"
                    >
                      {isAr ? "مسح" : "Effacer"}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <select 
                    value={labelsCourierFilter}
                    onChange={(e) => setLabelsCourierFilter(e.target.value)}
                    className="w-full h-11 text-xs bg-zinc-900/60 border border-zinc-800 focus:border-zinc-700 outline-none text-zinc-300 px-3 rounded-xl appearance-none cursor-pointer transition-all text-right"
                  >
                    <option value="all">{isAr ? "كل شركات الشحن (الكل)" : "Tous les courriers"}</option>
                    <option value="yalidine">Yalidine Express</option>
                    <option value="zr">ZR Express</option>
                    <option value="maystro">Maystro Delivery</option>
                    <option value="ecotrack">ECOTRACK</option>
                    <option value="anderson">Anderson</option>
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Filter className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

            </div>

            {/* Render matched shipments array */}
            {(() => {
              const matchedArchive = ordersHistory.filter((o: any) => {
                const isShippedLabel = !!(o.tracking_number || o.label_url);
                if (!isShippedLabel) return false;

                const q = labelsSearch.toLowerCase().trim();
                const matchSearchText = !q || (
                  o.name?.toLowerCase().includes(q) ||
                  o.phone?.includes(q) ||
                  o.tracking_number?.toLowerCase().includes(q) ||
                  o.wilaya?.toLowerCase().includes(q) ||
                  o.commune?.toLowerCase().includes(q)
                );

                const companyName = o.shipping_company || "yalidine";
                const matchCourierName = labelsCourierFilter === "all" || 
                  companyName.toLowerCase().includes(labelsCourierFilter);

                return matchSearchText && matchCourierName;
              });

              if (matchedArchive.length === 0) {
                return (
                  <div className="bg-zinc-950/20 border border-zinc-850 rounded-3xl py-12 text-center text-zinc-600">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-15" />
                    <p className="text-xs text-zinc-400">
                      {isAr ? "لا توجد ملصقات مطابقة لفلترة البحث حالياً في الأرشيف." : "Aucune étiquette trouvée."}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Desktop Table Glass Grid */}
                  <div className="hidden md:block bg-zinc-950/25 border border-zinc-850/60 rounded-2xl overflow-hidden backdrop-blur-md">
                    <table className="w-full border-collapse text-right text-xs">
                      <thead>
                        <tr className="bg-zinc-950/80 border-b border-zinc-850/80 text-zinc-400 font-bold">
                          <th className="p-4 text-right">{isAr ? "الزبون والمشتري" : "Client"}</th>
                          <th className="p-4 text-right">{isAr ? "رقم تتبع الطرد" : "ID Tracking"}</th>
                          <th className="p-4 text-right">{isAr ? "شركة النقل" : "Courier App"}</th>
                          <th className="p-4 text-right">{isAr ? "الموقع الجغرافي" : "Destination"}</th>
                          <th className="p-4 text-right">{isAr ? "المبلغ المطلوب" : "COD Value"}</th>
                          <th className="p-4 text-center">{isAr ? "المعاينة والتحميل" : "Actions"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/40">
                        {matchedArchive.slice(0, labelsLimit).map((o: any) => (
                          <tr key={o.id} className="hover:bg-zinc-900/15 transition-colors">
                            <td className="p-4">
                              <span className="font-bold text-zinc-200 block">{o.name}</span>
                              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{o.phone}</span>
                              {o.note && (
                                <span className="text-[10px] text-yellow-500/85 bg-yellow-500/5 border border-yellow-500/10 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-1 font-medium select-none max-w-[180px] truncate">
                                  <FileText className="w-2.5 h-2.5" />
                                  {o.note}
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className="font-mono font-bold text-yellow-500 bg-yellow-400/5 px-2.5 py-1 rounded border border-yellow-500/10">
                                {o.tracking_number || "YAL-TRACKING"}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded bg-zinc-900/80 text-[10px] font-bold text-zinc-300 border border-zinc-800 uppercase tracking-tighter">
                                {o.shipping_company || "Yalidine"}
                              </span>
                            </td>
                            <td className="p-4 text-zinc-400">
                              <span className="font-medium text-zinc-200">{o.wilaya}</span>
                              {o.commune && <span className="text-zinc-500 text-[11px] block mt-0.5">{o.commune}</span>}
                            </td>
                            <td className="p-4 font-mono font-black text-emerald-400 text-sm">
                              {(o.totalPrice || 0).toLocaleString()} <span className="text-[10px] text-zinc-500">DA</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => {
                                    setActivePreviewLabelUrl(o.label_url || null);
                                    setActivePreviewTracking(o.tracking_number || null);
                                  }}
                                  className="p-2.5 hover:bg-zinc-800 rounded-xl text-yellow-500 transition-colors cursor-pointer"
                                  title={isAr ? "معاينة سريعة" : "Fast Preview"}
                                >
                                  <Eye className="w-4.5 h-4.5" />
                                </button>
                                {o.label_url && (
                                  <a 
                                    href={o.label_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2.5 hover:bg-zinc-800 rounded-xl text-emerald-400 transition-colors cursor-pointer flex items-center justify-center"
                                    title={isAr ? "تحميل مباشر" : "Download PDF"}
                                  >
                                    <Download className="w-4.5 h-4.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile responsive card layouts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
                    {matchedArchive.slice(0, labelsLimit).map((o: any) => (
                      <div key={o.id} className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl flex flex-col justify-between space-y-3.5">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-zinc-200">{o.name}</h4>
                              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{o.phone}</p>
                              {o.note && (
                                <span className="text-[9px] text-yellow-500/85 bg-yellow-500/5 border border-yellow-500/10 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-1 font-medium select-none max-w-[150px] truncate">
                                  <FileText className="w-2.5 h-2.5" />
                                  {o.note}
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-zinc-900 text-zinc-300 rounded border border-zinc-800">
                              {o.shipping_company ? o.shipping_company.split(" ")[0] : "YAL"}
                            </span>
                          </div>

                          <div className="flex justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-900/60">
                            <span>{isAr ? "رقم التتبع:" : "Tracking:"}</span>
                            <span className="font-mono font-bold text-yellow-500">{o.tracking_number || "N/A"}</span>
                          </div>

                          <div className="flex justify-between text-[11px] text-zinc-400">
                            <span>{isAr ? "ولاية التوصيل:" : "Wilaya:"}</span>
                            <span className="font-bold text-zinc-300">{o.wilaya} {o.commune && `• ${o.commune}`}</span>
                          </div>

                          <div className="flex justify-between text-[11px] text-zinc-400 pb-1">
                            <span>{isAr ? "مبلغ الدفع الكلي:" : "COD Value:"}</span>
                            <span className="font-black text-emerald-400">{(o.totalPrice || 0).toLocaleString()} DA</span>
                          </div>
                        </div>

                        <div className="flex gap-2.5 border-t border-zinc-900/60 pt-2.5">
                          <button 
                            onClick={() => {
                              setActivePreviewLabelUrl(o.label_url || null);
                              setActivePreviewTracking(o.tracking_number || null);
                            }}
                            className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-805 text-zinc-200 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-yellow-500" />
                            {isAr ? "معاينة" : "Preview"}
                          </button>
                          {o.label_url && (
                            <a 
                              href={o.label_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer text-center"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {isAr ? "تحميل" : "Download"}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {matchedArchive.length > labelsLimit && (
                    <div id="sentinel-labels" ref={labelsSentinelRef} className="py-8 flex flex-col items-center justify-center space-y-2 text-center text-zinc-500">
                      <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
                      <p className="text-[10px] font-medium text-zinc-400">
                        {isAr ? "جاري جلب المزيد من ملصقات الأرشيف..." : "Fetching more archived labels..."}
                      </p>
                    </div>
                  )}

                </div>
              );
            })()}

          </div>
        )}

      </div>

      {dashboardTab === "stats" && (
        /* Traditional last orders section displayer */
        <div className="space-y-4">
          {/* LargeCentered Add Order Button in Slightly Dark Green */}
          <div className="flex justify-center pb-2">
            <button 
              onClick={() => {
                const resolvedPlanLimits = planLimits || {
                  free: 50,
                  basic: 50,
                  pro: 500,
                  professional: 500,
                  unlimited: 2000,
                  business: 2000,
                  enterprise: 999999999,
                };
                const userPlan = (userData?.planType || "free").toLowerCase();
                const limit = resolvedPlanLimits[userPlan] || resolvedPlanLimits.basic;
                const isLimitReached = (userData?.orderCounter || 0) >= limit;

                if (isLimitReached) {
                  setScreen("subscription");
                  window.history.pushState({}, "", "/?screen=subscription&upgrade_needed=true");
                } else {
                  setScreen("input");
                }
              }} 
              className="w-full max-w-md py-4 px-6 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-purple-950/40 transition-all duration-200 active:scale-[0.98] font-sans cursor-pointer border border-purple-500/30"
            >
              <Plus className="w-5 h-5 text-zinc-100" /> 
              <span className="text-sm tracking-wide">{t.new_order}</span>
            </button>
          </div>

           <div className="flex flex-col gap-2.5">
             <div className="flex items-center justify-between">
               <h3 className="text-sm font-bold flex items-center gap-2">
                 <Clock className="w-4 h-4 text-zinc-500" /> 
                 {t.last_orders}
               </h3>
               {ordersHistory.length > 0 && (
                 <div className="flex items-center gap-2">
                   <button
                     type="button"
                     onClick={() => {
                       const pendingIds = ordersHistory
                         .filter((o: any) => o.status === "pending")
                         .map((o: any) => o.id);
                       if (pendingIds.length > 0) {
                         setSelectedOrderIds(prev => Array.from(new Set([...prev, ...pendingIds])));
                       }
                     }}
                     className="text-[10px] text-yellow-500/80 hover:text-yellow-500 hover:underline transition-all font-black cursor-pointer"
                   >
                     تحديد كل المعلق ({ordersHistory.filter((o: any) => o.status === "pending").length})
                   </button>
                   <span className="text-zinc-805 text-[10px]">|</span>
                   <button
                     type="button"
                     onClick={() => setSelectedOrderIds([])}
                     className="text-[10px] text-zinc-500 hover:text-zinc-400 hover:underline transition-all font-black cursor-pointer"
                   >
                     إلغاء التحديد
                   </button>
                 </div>
               )}
             </div>

             {/* Bulk Action Panel - Dispatch Selected Orders to Yalidine Courier Server */}
             <AnimatePresence>
               {selectedOrderIds.length > 0 && (
                 <motion.div
                   initial={{ opacity: 0, height: 0, y: -10 }}
                   animate={{ opacity: 1, height: "auto", y: 0 }}
                   exit={{ opacity: 0, height: 0, y: -10 }}
                   className="overflow-hidden"
                 >
                   <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 font-sans shadow-lg shadow-yellow-950/5 text-right md:text-right">
                     <div className="text-right w-full md:w-auto">
                       <h4 className="text-xs font-black text-yellow-500 uppercase tracking-wide flex items-center gap-1.5 justify-start">
                         <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                         العمليات الجماعية للطلبيات
                       </h4>
                       <p className="text-[11px] text-zinc-400 mt-0.5">
                         تم اختيار <span className="text-yellow-400 font-extrabold font-mono">{selectedOrderIds.length}</span> طلبية معلقة للفرز والربط التلقائي وإرسالها لشركة الشحن.
                       </p>
                     </div>
                     <div className="flex gap-2 w-full md:w-auto flex-wrap md:flex-nowrap items-center">
                       <select
                         value={selectedCarrier}
                         onChange={(e) => setSelectedCarrier(e.target.value)}
                         className="bg-zinc-950 border border-zinc-800 text-zinc-100 font-extrabold text-[11px] px-3 py-2.5 rounded-xl cursor-pointer outline-none focus:border-yellow-500/50 min-w-[150px] transition-colors"
                       >
                         {(() => {
                           const planType = userData?.planType || "free";
                           const isProOrAbove = planType === "pro" || planType === "professional" || planType === "unlimited" || planType === "business" || planType === "enterprise";
                           const isBusinessOrAbove = planType === "unlimited" || planType === "business" || planType === "enterprise";
                           return (
                             <>
                               <option value="Yalidine Express" className="bg-[#0b0b0b] text-zinc-100 font-bold">Yalidine Express</option>
                               <option value="ZR Express" disabled={!isProOrAbove} className="bg-[#0b0b0b] text-zinc-100 font-bold">
                                 ZR Express {!isProOrAbove ? `(${isAr ? "طلب ترقية Pro" : "Pro required"})` : ""}
                               </option>
                               <option value="Maystro Delivery" disabled={!isProOrAbove} className="bg-[#0b0b0b] text-zinc-100 font-bold">
                                 Maystro Delivery {!isProOrAbove ? `(${isAr ? "طلب ترقية Pro" : "Pro required"})` : ""}
                               </option>
                               <option value="ECOTRACK" disabled={!isBusinessOrAbove} className="bg-[#0b0b0b] text-zinc-100 font-bold">
                                 ECOTRACK {!isBusinessOrAbove ? `(${isAr ? "طلب ترقية Business" : "Business required"})` : ""}
                               </option>
                               <option value="Anderson" disabled={!isBusinessOrAbove} className="bg-[#0b0b0b] text-zinc-100 font-bold">
                                 Anderson {!isBusinessOrAbove ? `(${isAr ? "طلب ترقية Business" : "Business required"})` : ""}
                               </option>
                             </>
                           );
                         })()}
                       </select>

                       <button
                         type="button"
                         onClick={handleBulkConfirm}
                         disabled={bulkConfirming}
                         className="flex-1 md:flex-none py-2.5 px-4.5 bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                       >
                         {bulkConfirming ? (
                           <>
                             <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                             جاري إرسال البيانات...
                           </>
                         ) : (
                           <>
                             إرسال الطلبات المحددة ⚡
                           </>
                         )}
                       </button>
                       <button
                         type="button"
                         onClick={() => setSelectedOrderIds([])}
                         className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-350 font-bold text-xs rounded-xl transition-all cursor-pointer"
                       >
                         إلغاء
                       </button>
                     </div>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>
             
             {ordersHistory.length === 0 ? (
             <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl py-12 text-center text-zinc-600">
               <LayoutDashboard className="w-12 h-12 mx-auto mb-2 opacity-20" />
               <p>{t.no_orders}</p>
             </div>
           ) : (
             <div className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {ordersHistory.slice(0, ordersLimit).map((order: any) => {
                  const statusColorsMap: any = {
                    pending: "bg-amber-400/5 text-amber-500 border-amber-500/20 hover:bg-amber-400/10",
                    confirmed: "bg-emerald-400/5 text-emerald-400 border-emerald-500/20 hover:bg-emerald-400/10",
                    shipped: "bg-sky-400/5 text-sky-400 border-sky-500/20 hover:bg-sky-450/10",
                    in_transit: "bg-sky-400/5 text-sky-455 border-sky-500/20 hover:bg-sky-455/10",
                    delivered: "bg-emerald-400/10 text-emerald-350 border-emerald-500/30 hover:bg-emerald-400/15",
                    returned: "bg-rose-455/5 text-rose-455 border-rose-500/20 hover:bg-rose-455/10",
                  };
                  const badgeStyle = statusColorsMap[order.status] || "bg-zinc-850 text-zinc-300 border-zinc-755 hover:bg-zinc-800";
                 const isSelected = selectedOrderIds.includes(order.id);
                 return (
                   <div 
                     key={order.id} 
                     onClick={() => handleViewOrder(order)} 
                     className={`border rounded-2xl p-4 flex items-center justify-between group cursor-pointer transition-all duration-300 animate-fade-in hover:scale-[1.015] hover:shadow-[0_10px_25px_rgba(0,0,0,0.65)] select-none ${isSelected ? 'border-yellow-500/40 bg-gradient-to-br from-[#16161a] via-[#eab308]/[0.02] to-[#0a0a0d] shadow-[0_0_20px_rgba(234,179,8,0.05)]' : 'bg-gradient-to-br from-[#121215] via-[#0f0f12] to-[#0a0a0c] border-zinc-800/70 hover:border-zinc-750'}`}
                   >
                     <div className="flex items-center gap-3">
                       {/* High fidelity checkbox indicator */}
                       <div 
                         onClick={(e) => {
                           e.stopPropagation();
                           setSelectedOrderIds(prev => 
                             prev.includes(order.id)
                               ? prev.filter(id => id !== order.id)
                               : [...prev, order.id]
                           );
                         }}
                         className="p-1 px-1.5 cursor-pointer select-none shrink-0"
                       >
                         <input
                           type="checkbox"
                           checked={isSelected}
                           onChange={() => {}} // Fully controlled onClick state above
                           className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 accent-yellow-500 text-yellow-500 cursor-pointer focus:ring-0 focus:ring-offset-0"
                         />
                       </div>

                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.possible_fake_order ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800/50 text-zinc-400'}`}>
                         {order.possible_fake_order ? <AlertTriangle className="w-5 h-5" /> : <User className="w-5 h-5" />}
                       </div>
                       <div>
                         <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 flex-wrap">
                            <span>{order.customerName || order.name}</span>
                            {(order.storeOrder || order.source === "storefront") && (
                              <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.2 rounded font-bold font-sans">
                                {isAr ? "طلب المتجر 🛒" : "Storefront 🛒"}
                              </span>
                            )}
                          </h4>
                         <p className="text-[10px] text-zinc-500">{order.wilaya} • {order.phoneNumber || order.phone}</p>
                         {order.createdAt && (
                           <div className="text-[9px] text-zinc-500 mt-1 flex items-center gap-1 font-mono">
                             <Clock className="w-3 h-3 text-zinc-650 shrink-0" />
                             <span>{formatTime(order.createdAt)}</span>
                           </div>
                         )}
                         {order.note && (
                           <div className="text-[10px] text-yellow-500/80 mt-1.5 flex items-center gap-1 font-medium bg-yellow-500/5 w-fit px-1.5 py-0.5 rounded border border-yellow-500/10">
                             <FileText className="w-3 h-3 shrink-0" />
                             <span className="truncate max-w-[200px]">{order.note}</span>
                           </div>
                         )}
                         {order.dispatchError && (
                           <div className="text-[10.5px] text-red-400 font-bold mt-1.5 flex items-center gap-1 bg-red-500/10 border border-red-500/20 w-fit px-1.5 py-0.5 rounded text-direction-rtl">
                             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                             <span className="truncate max-w-[220px]">{order.dispatchError}</span>
                           </div>
                         )}
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase font-extrabold border transition-all duration-200 ${badgeStyle}`}>
                          {(t as any)[`status_${order.status}`] || order.status}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOrderToDelete(order.id); }} 
                          className="p-2 text-zinc-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   </div>
                 );
               })}
             </div>
             {ordersHistory.length > ordersLimit && (
               <div id="sentinel-main" ref={mainSentinelRef} className="py-8 flex flex-col items-center justify-center space-y-2 text-center text-zinc-500">
                 <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />
                 <p className="text-[10px] font-medium text-zinc-400">
                   {isAr ? "جاري تحميل المزيد من تاريخ الطلبات..." : "Loading more order history..."}
                 </p>
               </div>
             )}
             </div>
           )}
        </div>
      )}

      {/* Premium In-App PDF Preview Overlay */}
      <AnimatePresence>
        {activePreviewLabelUrl && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/95 backdrop-blur-md select-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-[0_24px_50px_rgba(0,0,0,0.95)]"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950">
                <div className="flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-emerald-450" />
                  <span className="text-xs font-bold text-zinc-300">
                    {isAr ? "معاينة ملصق الشحن رقم:" : "Digital Shipping Label for:"} <span className="font-mono text-yellow-500 font-bold">{activePreviewTracking}</span>
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setActivePreviewLabelUrl(null);
                    setActivePreviewTracking(null);
                  }}
                  className="p-1.5 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 md:p-6 flex-1 bg-zinc-900/10 flex flex-col max-h-[65vh] overflow-y-auto">
                <div className="bg-[#f0f2f5] border border-zinc-800 rounded-2xl overflow-y-auto flex-1 relative min-h-[50vh] w-full">
                  <iframe 
                    src={`${activePreviewLabelUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                    title="Shipping Label PDF Viewer"
                    className="w-full min-h-[720px] h-full bg-white block rounded-xl"
                    referrerPolicy="no-referrer"
                    scrolling="yes"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-zinc-900 flex justify-end gap-3 bg-zinc-950">
                <button 
                  onClick={() => {
                    setActivePreviewLabelUrl(null);
                    setActivePreviewTracking(null);
                  }}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-medium cursor-pointer transition-colors"
                >
                  {isAr ? "إغلاق" : "Close"}
                </button>
                <a 
                  href={activePreviewLabelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl text-xs text-center flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-white"
                >
                  <Download className="w-4 h-4" />
                  {isAr ? "تحميل المستند" : "Download PDF"}
                </a>
              </div>
            </motion.div>
          </div>
        )}

        {showSuspiciousModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/90 backdrop-blur-md select-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-[0_24px_50px_rgba(0,0,0,0.95)]"
            >
              <div className="flex items-center justify-between p-5 border-b border-zinc-900 bg-zinc-950">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-base font-bold text-zinc-100 font-sans">
                      {isAr ? "تشخيص وتحليل الطلبيات المشبوهة" : "Diagnostic des commandes suspectes"}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5" dir="ltr">
                      {suspiciousOrders.length} {isAr ? "طلبيات تحتاج للتحقق والتصحيح قبل الربط البريدي" : "orders need action before courier dispatch"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSuspiciousModal(false)}
                  className="p-1.5 hover:bg-zinc-900 rounded-xl text-zinc-450 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-3.5 bg-zinc-900/10 min-h-[300px]">
                {suspiciousOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    <p className="font-bold text-sm text-zinc-300 font-sans">
                      {isAr ? "تهانينا! جميع طلبياتك سليمة ومكتملة البيانات" : "All orders are fully valid!"}
                    </p>
                    <p className="text-xs text-zinc-500 max-w-md">
                      {isAr ? "لا توجد أي أخطاء في أرقام الهاتف أو أسماء الولايات والبلديات في القائمة النشطة حالياً." : "No missing field inputs or invalid carrier format were detected."}
                    </p>
                  </div>
                ) : (
                  suspiciousOrders.map((order: any, idx: number) => {
                    const reasons = getSuspicionReasons(order);
                    return (
                      <div 
                        key={order.id || idx} 
                        className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-zinc-700/50 transition-all select-none"
                      >
                        <div className="flex-1 space-y-2.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs font-bold text-zinc-200">
                              {order.name || (isAr ? "زبون مجهول الاسم" : "Anonymous customer")}
                            </span>
                            {order.id && (
                              <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-[9px] text-zinc-400 font-mono">
                                ID: {order.id.substring(0, 8)}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] text-zinc-400 font-sans font-medium">
                              {order.wilaya || (isAr ? "الولاية غير معروفة" : "Unknown Wilaya")} - {order.commune || (isAr ? "البلدية غير معروفة" : "Unknown Commune")}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-[11px] text-zinc-400 font-mono">
                            <span dir="ltr" className="flex items-center gap-1.5 select-none font-bold text-zinc-350">
                              <span className="text-zinc-500 text-xs text-left">📞</span> {order.phone || (isAr ? "[لا يوجد رقم هاتفي]" : "[No phone]")}
                            </span>
                          </div>

                          {/* Detail reasons for suspicion */}
                          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-zinc-900/50">
                            {reasons.map((reason, rIdx) => (
                              <div key={rIdx} className="flex items-start gap-1.5 text-xs text-yellow-400">
                                <span className="text-red-500 font-bold shrink-0 mt-0.5">⚠️</span>
                                <span className="font-medium text-left">{reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-auto shrink-0 select-none">
                          <button
                            type="button"
                            onClick={() => {
                              setShowSuspiciousModal(false);
                              handleViewOrder(order);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer leading-none"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {isAr ? "معاينة وتصحيح" : "Fix & Edit"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-5 border-t border-zinc-900 flex justify-end gap-3 bg-zinc-950">
                <button 
                  onClick={() => setShowSuspiciousModal(false)}
                  className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  {isAr ? "حسناً، فهمت" : "Close"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
