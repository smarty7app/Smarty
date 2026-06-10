import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, RefreshCw, LogOut, Trash2 } from "lucide-react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  limit,
  setDoc,
  getDoc,
  getDocs,
  getDocFromCache,
  getDocFromServer
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "./lib/firebase";
import { translations, Language } from "./lib/translations";

// --- Connection Watchdog ---
async function testFirebaseConnection() {
  try {
    // Try to reach Firestore server directly to verify config & connectivity
    await getDocFromServer(doc(db, "_system_health", "connection"));
    console.log("✅ [Firebase Connectivity] Successfully reached Firestore server.");
  } catch (error: any) {
    console.error("❌ [Firebase Connectivity] Failed to reach Firestore server:", error.message);
    if (error.message.includes("client is offline") || error.message.includes("network")) {
       console.warn("⚠️ [Firebase Diagnostic] The environment appears to be blocking outgoing connections to Firebase. Please try opening the app in a new tab.");
    }
  }
}
testFirebaseConnection();
import { OrderData, InventoryItem, UserData } from "./types";
import { safeStorage } from "./lib/utils";
import { useUser, FirebaseProvider } from "./components/FirebaseProvider";
import { Logo } from "./components/CommonUI";
import LandingPage from "./components/LandingPage";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import OrderInput from "./components/OrderInput";
import OrderReview from "./components/OrderReview";
import Subscription from "./components/Subscription";
import AdminDashboard from "./components/AdminDashboard";
import WilayasList from "./components/WilayasList";
import PublicCheckoutForm from "./components/PublicCheckoutForm";
import TermsConditions from "./components/TermsConditions";
import PrivacyPolicy from "./components/PrivacyPolicy";
import MerchantProducts from "./components/MerchantProducts";

// --- Constants ---
const initialOrder: OrderData = {
  name: "",
  phone: "",
  wilaya: "",
  commune: "",
  items: [{ product: "", quantity: 1, size: "", color: "", pricePerUnit: 0 }],
  note: "",
  possible_fake_order: false,
  delivery_type: "home",
  status: "pending",
  shipping_company: "Yalidine Express",
  location_url: "",
  shippingFee: 0,
  totalPrice: 0,
};

const PLAN_LIMITS: Record<string, number> = {
  free: 50,
  basic: 50,
  pro: 500,
  professional: 500,
  unlimited: 2000,
  business: 2000,
  enterprise: 999999999,
};

// --- Main App Component ---
function AppContent() {
  const { user, loading: authLoading, signIn, logout } = useUser();
  const [lang, setLang] = useState<Language>(() => {
    const saved = safeStorage.getItem("smarty_lang");
    if (saved === "ar" || saved === "fr" || saved === "en") {
      return saved;
    }
    return "fr";
  });
  const [screen, setScreen] = useState<
    | "dashboard"
    | "products"
    | "input"
    | "review"
    | "subscription"
    | "admin"
    | "terms"
    | "privacy"
  >("dashboard");

  useEffect(() => {
    safeStorage.setItem("smarty_lang", lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    safeStorage.setItem("smarty_theme", "dark");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get("screen");
    const checkoutId = params.get("checkout_id");
    if (screenParam === "subscription" || screenParam === "verification" || checkoutId) {
      setScreen("subscription");
    }
  }, []);

  const [conversation, setConversation] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderData>(initialOrder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordersHistory, setOrdersHistory] = useState<OrderData[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [showRedirectWarning, setShowRedirectWarning] = useState(false);
  const [authStallDetected, setAuthStallDetected] = useState(false);

  // Startup watchdog for auth loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (authLoading) {
        setAuthStallDetected(true);
        console.error(
          "⚠️ [Redirection Watchdog] CRITICAL: Firebase Auth continues to load after 8 seconds. This might indicate that the Firebase App configuration is incorrect, the server is unreachable, or the browser is blocking connection in a sandboxed iframe. If the application is unable to direct you from the landing page, please open the app in a new browser tab.",
        );
      }
    }, 8000);
    return () => clearTimeout(timeoutId);
  }, [authLoading]);

  // Watchdog for Landing page to Dashboard redirection
  useEffect(() => {
    if (!user) {
      setShowRedirectWarning(false);
      return;
    }

    // Default screen to 'dashboard' if logged in and currently on landing or unknown screen
    if (screen === "terms" || screen === "privacy") {
      // Keep on terms/privacy if already selected
    } else if (
      screen !== "dashboard" &&
      screen !== "subscription" &&
      screen !== "products" &&
      screen !== "admin" &&
      screen !== "input" &&
      screen !== "review" &&
      screen !== "wilayas"
    ) {
      console.warn(
        "⚠️ [Routing Control] Active state check: Screen was set to an unknown value. Resetting to dashboard.",
      );
      setScreen("dashboard");
    }

    // Setup watcher for user profile retrieval
    const timeoutId = setTimeout(() => {
      if (!userData) {
        setShowRedirectWarning(true);
        console.error(
          "⚠️ [Redirection Watchdog] WARNING: The user is logged in, but user profile data (userData) from Firestore did not load within 15 seconds. This might be due to a poor connection, incorrect Firebase security rules, or database permission restrictions.",
        );
      }
    }, 15000);

    if (userData) {
      setShowRedirectWarning(false);
    }

    return () => clearTimeout(timeoutId);
  }, [user, userData, screen]);

  const t = translations[lang];
  const isRtl = lang === "ar";
  const isAdmin = user?.email === "12benabdallah@gmail.com";

  const validateStockAvailability = async (items: any[]): Promise<boolean> => {
    if (!items || items.length === 0) return true;
    const uid = user?.uid;
    if (!uid) return false;

    try {
      const q = query(collection(db, "inventory"), where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      const inventoryItems = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];

      for (const item of items) {
        if (!item.product) continue;
        const matched = inventoryItems.find(
          (p) => p.productName === item.product,
        );
        if (matched) {
          const reqQty = Number(item.quantity) || 1;
          const currentStock = Number(matched.stockQuantity) || 0;
          if (currentStock < reqQty) {
            alert(
              isRtl
                ? `عذراً، المخزون غير كافي للمنتج 「${item.product}」. المتوفر في المستودع: ${currentStock} قطع، الكمية المطلوبة: ${reqQty}`
                : `Sorry, insufficient stock for product "${item.product}". In stock: ${currentStock}, requested quantity: ${reqQty}`,
            );
            return false;
          }
        }
      }
      return true;
    } catch (err) {
      console.error("Error validating stock:", err);
      return false;
    }
  };

  const decrementStock = async (items: any[]) => {
    if (!items || items.length === 0) return;
    const uid = user?.uid;
    if (!uid) return;

    try {
      const q = query(collection(db, "inventory"), where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      const inventoryItems = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];

      for (const item of items) {
        if (!item.product) continue;
        const matched = inventoryItems.find(
          (p) => p.productName === item.product,
        );
        if (matched) {
          const reqQty = Number(item.quantity) || 1;
          const currentStock = Number(matched.stockQuantity) || 0;
          const newQty = Math.max(0, currentStock - reqQty);
          await updateDoc(doc(db, "inventory", matched.id), {
            stockQuantity: newQty,
          });
        }
      }
    } catch (err) {
      console.error("Error decrementing stock:", err);
    }
  };

  const wilayaStatsMap = ordersHistory.reduce((acc: any, order) => {
    if (order.wilaya) acc[order.wilaya] = (acc[order.wilaya] || 0) + 1;
    return acc;
  }, {});
  const topWilayas = Object.entries(wilayaStatsMap)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, "users", user.uid),
      async (snapshot) => {
        try {
          if (snapshot.exists()) {
            setUserData(snapshot.data() as UserData);
          } else {
            const newUser: UserData = {
              planType: "free",
              orderCounter: 0,
              subscriptionStatus: "active",
              email: user.email || "",
            };
            await setDoc(doc(db, "users", user.uid), newUser);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      },
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      limit(100),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const orders = snapshot.docs.map((doc) => {
          const o = doc.data();
          let solvedDate = new Date();
          if (o.createdAt) {
            if (typeof o.createdAt.toDate === "function") {
              solvedDate = o.createdAt.toDate();
            } else {
              solvedDate = new Date(o.createdAt);
            }
          }
          return {
            id: doc.id,
            name: o.customerName,
            phone: o.phoneNumber,
            wilaya: o.wilaya,
            commune: o.commune,
            possible_fake_order: o.possibleFake,
            delivery_type: o.deliveryType,
            status: o.status,
            items: (o.items || []).map((item: any) => ({
              product: item.product || "",
              quantity: Number(item.quantity) || 1,
              size: item.size || "",
              color: item.color || "",
              pricePerUnit: Number(item.pricePerUnit) || 0,
            })),
            note: o.note || "",
            shipping_company: o.shippingCompany || "Yalidine Express",
            tracking_number: o.trackingNumber,
            label_url: o.labelUrl,
            location_url: o.locationUrl || "",
            shippingFee: Number(o.shippingFee) || 0,
            totalPrice: Number(o.totalPrice) || 0,
            createdAt: solvedDate,
          };
        });
        // Sort in descending order of createdAt key
        orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setOrdersHistory(orders);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "orders");
      },
    );
  }, [user]);

  const handleExtract = async () => {
    if (!conversation.trim() && !fileUrl && !fileBase64) return;

    // Check billing quota (order consumption limit) before extraction calls
    if (userData && userData.orderCounter >= PLAN_LIMITS[userData.planType]) {
      alert(t.sub_limit_reached);
      setScreen("subscription");
      window.history.pushState({}, "", "/?screen=subscription&upgrade_needed=true");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      let clientInventory: any[] = [];
      const uid = user?.uid;
      if (uid) {
        try {
          const q = query(
            collection(db, "inventory"),
            where("userId", "==", uid),
          );
          const querySnapshot = await getDocs(q);
          clientInventory = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } catch (invErr) {
          console.error("Error loading inventory for payload:", invErr);
        }
      }

      const response = await fetch("/api/extract-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversation,
          fileUrl,
          fileMimeType,
          fileBase64,
          inventoryList: clientInventory,
        }),
      });
      if (!response.ok) throw new Error("Extract failed");
      const data = await response.json();
      setOrder({
        ...initialOrder,
        ...data,
        items: data.items?.length ? data.items : initialOrder.items,
      });
      setScreen("review");
    } catch (err) {
      setError(translations[lang].extract_error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualInput = () => {
    setOrder({
      ...initialOrder,
      items: [
        { product: "", quantity: 1, size: "", color: "", pricePerUnit: 0 },
      ],
    });
    setScreen("review");
  };

  const handleSave = async () => {
    if (!user) return;
    if (!userData) {
      alert(t.loading_user_data || "Loading user data, please wait...");
      return;
    }

    // Check limit
    if (!order.id && userData.orderCounter >= PLAN_LIMITS[userData.planType]) {
      alert(t.sub_limit_reached);
      setScreen("subscription");
      window.history.pushState({}, "", "/?screen=subscription&upgrade_needed=true");
      return;
    }

    setLoading(true);
    try {
      if (!order.id) {
        const isStockAvailable = await validateStockAvailability(order.items);
        if (!isStockAvailable) {
          setLoading(false);
          return;
        }
      }

      const payload = {
        customerName: order.name || "",
        phoneNumber: order.phone || "",
        wilaya: order.wilaya || "",
        commune: order.commune || "",
        deliveryType: order.delivery_type || "home",
        status: order.status || "pending",
        possibleFake: !!order.possible_fake_order,
        note: order.note || "",
        userId: user.uid,
        items: (order.items || []).map((item) => ({
          product: item.product || "",
          quantity: item.quantity || 1,
          size: item.size || "",
          color: item.color || "",
          pricePerUnit: Number(item.pricePerUnit) || 0,
        })),
        shippingCompany: order.shipping_company || "Yalidine Express",
        trackingNumber: order.tracking_number || "",
        labelUrl: order.label_url || "",
        locationUrl: order.location_url || "",
        shippingFee: Number(order.shippingFee) || 0,
        totalPrice: Number(order.totalPrice) || 0,
      };

      if (order.id) {
        await updateDoc(doc(db, "orders", order.id), {
          ...payload,
          createdAt: order.createdAt || new Date(),
        });
      } else {
        await addDoc(collection(db, "orders"), {
          ...payload,
          createdAt: order.createdAt || serverTimestamp(),
        });
        // Increment consumption
        await updateDoc(doc(db, "users", user.uid), {
          orderCounter: (userData.orderCounter || 0) + 1,
        });
      }
      alert(t.shipped_success);
      setScreen("dashboard");
      setOrder(initialOrder);
    } catch (err: any) {
      console.error(err);
      alert(t.save_error);
    } finally {
      setLoading(false);
    }
  };

  const handleShipOrder = async () => {
    if (!user || !userData) return;

    // Check limit if it's a new order
    if (!order.id && userData.orderCounter >= PLAN_LIMITS[userData.planType]) {
      alert(t.sub_limit_reached);
      setScreen("subscription");
      window.history.pushState({}, "", "/?screen=subscription&upgrade_needed=true");
      return;
    }

    setLoading(true);
    try {
      if (!order.id) {
        const isStockAvailable = await validateStockAvailability(order.items);
        if (!isStockAvailable) {
          setLoading(false);
          return;
        }
      }

      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/ship-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order,
          courier: order.shipping_company,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Shipping failed");
      }

      const resData = await response.json();

      const firestorePayload: any = {
        status: resData.status || "shipped",
        trackingNumber: resData.trackingNumber || "",
        labelUrl: resData.labelUrl || "",
        shippingCompany: order.shipping_company || "",
        customerName: order.name || "",
        phoneNumber: order.phone || "",
        wilaya: order.wilaya || "",
        commune: order.commune || "",
        deliveryType: order.delivery_type || "home",
        possibleFake: !!order.possible_fake_order,
        note: order.note || "",
        userId: user.uid,
        items: (order.items || []).map((item) => ({
          product: item.product || "",
          quantity: item.quantity || 1,
          size: item.size || "",
          color: item.color || "",
          pricePerUnit: Number(item.pricePerUnit) || 0,
        })),
        locationUrl: order.location_url || "",
        shippingFee: Number(order.shippingFee) || 0,
        totalPrice: Number(order.totalPrice) || 0,
      };

      let finalOrderId = order.id;
      if (order.id) {
        await updateDoc(doc(db, "orders", order.id), {
          ...firestorePayload,
          createdAt: order.createdAt || new Date(),
        });
        // Decrement product inventory stock levels when shipping label is received
        await decrementStock(order.items);
      } else {
        const docRef = await addDoc(collection(db, "orders"), {
          ...firestorePayload,
          createdAt: order.createdAt || serverTimestamp(),
        });
        finalOrderId = docRef.id;
        // Decrement product inventory stock levels when shipping label is received
        await decrementStock(order.items);
        // Increment consumption
        await updateDoc(doc(db, "users", user.uid), {
          orderCounter: (userData.orderCounter || 0) + 1,
        });
      }

      setOrder({
        ...order,
        id: finalOrderId,
        status: firestorePayload.status,
        tracking_number: firestorePayload.trackingNumber,
        label_url: firestorePayload.labelUrl,
      });

      alert(t.shipped_success + "! " + firestorePayload.trackingNumber);
    } catch (err: any) {
      setError(t.shipping_failed);
      alert(t.shipping_failed);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "orders", id));
      setOrderToDelete(null);
      // Note: We do NOT decrease orderCounter here as requested by user.
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `orders/${id}`);
    }
  };

  // Render search-based public route before requiring user authentication
  const pathname = window.location.pathname;
  const storeMatch = pathname.match(/\/(?:store|s|shop)\/([^/]+)/);
  const urlParams = new URLSearchParams(window.location.search);
  const publicMerchantId =
    (storeMatch ? storeMatch[1] : null) ||
    urlParams.get("merchantId") ||
    urlParams.get("merchant_id") ||
    urlParams.get("m");
  if (publicMerchantId) {
    return <PublicCheckoutForm merchantId={publicMerchantId} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col gap-4 items-center justify-center p-6 text-center select-none">
        <RefreshCw className="animate-spin text-zinc-500 w-8 h-8" />
        {authStallDetected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md p-4 bg-amber-500/5 text-amber-400 border border-amber-500/10 rounded-2xl text-xs space-y-2 mt-4"
          >
            <p className="font-bold">
              {isRtl
                ? "⚠️ تنبيه: يبدو أن تحميل الحساب يستغرق وقتاً أطول من المعتاد."
                : "⚠️ Notice: Authentication is taking longer than usual to load."}
            </p>
            <p className="text-zinc-400 opacity-90 leading-relaxed text-[11px]">
              {isRtl
                ? "إذا كنت تشاهد التطبيق من خلال نافذة المعاينة المؤطرة، فقد يتم حظر الاتصال في متصفحك. يرجى محاولة فتح التطبيق في نافذة مستقلة جديدة باستخدام زر 'فتح في علامة تبويب جديدة'."
                : "If you are viewing inside a preview iframe, your browser might block cross-origin components. Please try opening the application in a new browser tab."}
            </p>
          </motion.div>
        )}
      </div>
    );
  }
  if (!user) {
    if (screen === "terms") {
      return <TermsConditions setScreen={setScreen} t={t} isRtl={isRtl} />;
    }
    if (screen === "privacy") {
      return <PrivacyPolicy setScreen={setScreen} t={t} isRtl={isRtl} />;
    }
    return (
      <LandingPage
        lang={lang}
        setLang={setLang}
        signIn={signIn}
        t={t}
        isRtl={isRtl}
        setScreen={setScreen}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-4 pt-12 md:pt-16 font-sans mb-20 select-none transition-all duration-200"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Redirect/Sync Warning Notice Bar */}
      {showRedirectWarning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 w-full max-w-md md:max-w-4xl lg:max-w-5xl xl:max-w-6xl bg-amber-500/5 text-amber-400 border border-amber-500/15 p-4 rounded-2xl flex flex-col gap-2 relative shadow-lg"
        >
          <div className="flex items-start gap-2.5">
            <span className="text-base shrink-0">⚠️</span>
            <div className="space-y-1">
              <p className="font-bold text-xs text-amber-400">
                {isRtl
                  ? "تنبيه التوجيه الذاتي: فشل أو تأخر تحميل بيانات الملف الشخصي لـ Firestore"
                  : "Redirect Watchdog: Failed or delayed load of Firestore profile"}
              </p>
              <p className="text-[11px] text-zinc-400 leading-normal">
                {isRtl
                  ? "قد يكون التطبيق عاجزاً عن توجيهك بالكامل إلى لوحة التحكم حالياً لأن قاعدة البيانات لا تستجيب بالشكل المطلوب. يُرجى فحص إعدادات الاتصال أو قواعد الحماية (Firestore Rules) في الكونسول."
                  : "We are currently unable to seamlessly direct you to the dashboard because Firestore is not responding. Please inspect your connection status, rules configurations, or console logs."}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {(screen === "dashboard" || screen === "products") && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 w-full max-w-md md:max-w-4xl lg:max-w-5xl xl:max-w-6xl flex items-center justify-between transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              <Menu className="w-5 h-5 text-zinc-400" />
            </button>
            <h2 className="text-lg font-bold tracking-tight text-white/90">
              {screen === "dashboard" ? t.nav_dashboard : t.nav_inventory}
            </h2>
          </div>
        </motion.div>
      )}

      <main
        className={`w-full relative transition-all duration-300 ${
          screen === "dashboard" ||
          screen === "products" ||
          screen === "admin" ||
          screen === "wilayas" ||
          screen === "subscription" ||
          screen === "terms" ||
          screen === "privacy"
            ? "max-w-md md:max-w-4xl lg:max-w-5xl xl:max-w-6xl pb-10"
            : screen === "review"
              ? "max-w-md md:max-w-4xl lg:max-w-5xl pb-10"
              : "max-w-md md:max-w-3xl pb-10"
        }`}
      >
        <AnimatePresence mode="wait">
          {screen === "dashboard" && (
            <Dashboard
              userData={userData}
              ordersHistory={ordersHistory}
              planLimits={PLAN_LIMITS}
              topWilayas={topWilayas}
              t={t}
              setScreen={setScreen}
              handleViewOrder={(o: any) => {
                setOrder(o);
                setScreen("review");
              }}
              setOrderToDelete={setOrderToDelete}
            />
          )}
          {screen === "products" && (
            <MerchantProducts
              user={user}
              userData={userData}
              t={t}
              isRtl={isRtl}
            />
          )}
          {screen === "input" && (
            <OrderInput
              conversation={conversation}
              setConversation={setConversation}
              loading={loading}
              error={error}
              handleExtract={handleExtract}
              handleManualInput={handleManualInput}
              setScreen={setScreen}
              t={t}
              isRtl={isRtl}
              fileUrl={fileUrl}
              setFileUrl={setFileUrl}
              fileMimeType={fileMimeType}
              setFileMimeType={setFileMimeType}
              fileName={fileName}
              setFileName={setFileName}
              fileBase64={fileBase64}
              setFileBase64={setFileBase64}
              userId={user?.uid}
            />
          )}
          {screen === "review" && (
            <OrderReview
              userData={userData}
              order={order}
              setOrder={setOrder}
              loading={loading}
              handleSave={handleSave}
              handleShipOrder={handleShipOrder}
              addItem={() =>
                setOrder({
                  ...order,
                  items: [
                    ...order.items,
                    {
                      product: "",
                      quantity: 1,
                      size: "",
                      color: "",
                      pricePerUnit: 0,
                    },
                  ],
                })
              }
              removeItem={(idx: number) => {
                const items = [...order.items];
                items.splice(idx, 1);
                setOrder({ ...order, items });
              }}
              updateItem={(idx: number, f: any, v: any) => {
                const items = [...order.items];
                (items[idx] as any)[f] = v;
                setOrder({ ...order, items });
              }}
              setScreen={setScreen}
              t={t}
              isRtl={isRtl}
              initialOrder={initialOrder}
            />
          )}
          {screen === "subscription" && (
            <Subscription
              user={user}
              userData={userData}
              setScreen={setScreen}
              t={t}
              isRtl={isRtl}
              planLimits={PLAN_LIMITS}
            />
          )}
          {screen === "admin" && (
            <AdminDashboard t={t} isRtl={isRtl} setScreen={setScreen} />
          )}
          {screen === "wilayas" && (
            <WilayasList
              setScreen={setScreen}
              t={t}
              isRtl={isRtl}
              ordersHistory={ordersHistory}
            />
          )}
          {screen === "terms" && (
            <TermsConditions setScreen={setScreen} t={t} isRtl={isRtl} />
          )}
          {screen === "privacy" && (
            <PrivacyPolicy setScreen={setScreen} t={t} isRtl={isRtl} />
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto py-8 flex flex-col items-center gap-2 text-zinc-700 text-[10px] uppercase tracking-widest text-center">
        <div>{t.footer} &copy; 2026</div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setScreen("terms")}
            className="hover:text-zinc-500 underline transition-colors cursor-pointer"
          >
            {isRtl ? "الشروط والأحكام" : "Terms & Conditions"}
          </button>
          <span className="text-zinc-800">|</span>
          <button
            onClick={() => setScreen("privacy")}
            className="hover:text-zinc-500 underline transition-colors cursor-pointer"
          >
            {isRtl ? "سياسة الخصوصية" : "Privacy Policy"}
          </button>
        </div>
      </footer>

      <Sidebar
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        user={user}
        userData={userData}
        screen={screen}
        setScreen={setScreen}
        setShowLogoutConfirm={setShowLogoutConfirm}
        t={t}
        isRtl={isRtl}
        lang={lang}
        setLang={setLang}
      />

      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Animated premium glass blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setOrderToDelete(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative bg-[#121215] border border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-3xl p-6.5 w-full max-w-sm text-center space-y-7 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500/80" />
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/15">
                <Trash2 className="w-6.5 h-6.5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-zinc-100">{t.delete_confirm}</h3>
                <p className="text-xs text-zinc-450 font-bold leading-relaxed">
                  {lang === "ar" 
                    ? "لا يمكن التراجع عن هذا الإجراء بمجرد تأكيده." 
                    : lang === "fr"
                      ? "Cette action est irréversible."
                      : "This action cannot be undone once confirmed."}
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDelete(orderToDelete)}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-extrabold text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-red-500/10 active:scale-95"
                >
                  {t.delete_button}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl font-extrabold text-sm transition-all duration-200 cursor-pointer active:scale-95"
                >
                  {t.btn_cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-xs text-center space-y-6"
            >
              <LogOut className="text-red-500 w-12 h-12 mx-auto" />
              <h3 className="text-lg font-bold">{t.logout_confirm}</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    logout();
                    setShowLogoutConfirm(false);
                  }}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold"
                >
                  {t.logout_button}
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-3 bg-zinc-800 text-zinc-300 rounded-xl font-bold"
                >
                  {t.btn_cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}
