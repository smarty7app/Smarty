import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { 
  Menu,
  RefreshCw,
  LogOut,
  Trash2,
} from "lucide-react";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
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
} from "firebase/firestore";
import { db, auth } from "./lib/firebase";
import { translations, Language } from "./lib/translations";
import { OrderData, InventoryItem, UserData, OperationType } from "./types";
import { handleFirestoreError } from "./lib/utils";
import { useUser, FirebaseProvider } from "./components/FirebaseProvider";
import { Logo } from "./components/CommonUI";
import LandingPage from "./components/LandingPage";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import OrderInput from "./components/OrderInput";
import OrderReview from "./components/OrderReview";
import Settings from "./components/Settings";
import Subscription from "./components/Subscription";
import AdminDashboard from "./components/AdminDashboard";
import WilayasList from "./components/WilayasList";
import PublicCheckoutForm from "./components/PublicCheckoutForm";


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
  enterprise: 999999999 
};

// --- Main App Component ---
function AppContent() {
  const { user, loading: authLoading, signIn, logout } = useUser();
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem("smarty_lang") as Language) || "fr");
  const [screen, setScreen] = useState<"dashboard" | "input" | "review" | "subscription" | "settings" | "admin">("dashboard");

  useEffect(() => {
    localStorage.setItem("smarty_lang", lang);
  }, [lang]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get("screen");
    const checkoutId = params.get("checkout_id");
    if (screenParam === "verification" || checkoutId) {
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
  const [yalidineId, setYalidineId] = useState("");
  const [yalidineToken, setYalidineToken] = useState("");
  const [zrKey, setZrKey] = useState("");
  const [maystroId, setMaystroId] = useState("");
  const [maystroKey, setMaystroKey] = useState("");
  const [ecotrackToken, setEcotrackToken] = useState("");
  const [andersonUser, setAndersonUser] = useState("");
  const [andersonPass, setAndersonPass] = useState("");

  const t = translations[lang];
  const isRtl = lang === 'ar';
  const isAdmin = user?.email === "12benabdallah@gmail.com";

  const wilayaStatsMap = ordersHistory.reduce((acc: any, order) => {
    if (order.wilaya) acc[order.wilaya] = (acc[order.wilaya] || 0) + 1;
    return acc;
  }, {});
  const topWilayas = Object.entries(wilayaStatsMap).sort((a:any, b:any) => b[1] - a[1]).slice(0, 5);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), async (snapshot) => {
      try {
        if (snapshot.exists()) {
          setUserData(snapshot.data() as UserData);
        } else {
          const newUser: UserData = { 
            planType: "free", 
            orderCounter: 0, 
            subscriptionStatus: "active",
            email: user.email || ""
          };
          await setDoc(doc(db, "users", user.uid), newUser);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q, (snapshot) => {
      setOrdersHistory(snapshot.docs.map(doc => {
        const o = doc.data();
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
            pricePerUnit: Number(item.pricePerUnit) || 0
          })),
          note: o.note || "",
          shipping_company: o.shippingCompany || "Yalidine Express",
          tracking_number: o.trackingNumber,
          label_url: o.labelUrl,
          location_url: o.locationUrl || "",
          shippingFee: Number(o.shippingFee) || 0,
          totalPrice: Number(o.totalPrice) || 0,
          createdAt: o.createdAt?.toDate?.() || new Date()
        };
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "orders");
    });
  }, [user]);

  useEffect(() => {
    if (user) {
      const fetchConfig = async () => {
        try {
          // 1. First try to load the decrypted keys from the secure API
          const token = await auth.currentUser?.getIdToken();
          const response = await fetch("/api/merchant-config", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            // If the backend API returned actual config fields, apply them
            if (data && Object.keys(data).length > 0) {
              if (data.yalidineApiKey !== undefined) setYalidineId(data.yalidineApiKey);
              if (data.yalidineApiToken !== undefined) setYalidineToken(data.yalidineApiToken);
              if (data.zrApiKey !== undefined) setZrKey(data.zrApiKey);
              if (data.maystroId !== undefined) setMaystroId(data.maystroId);
              if (data.maystroApiKey !== undefined) setMaystroKey(data.maystroApiKey);
              if (data.ecotrackToken !== undefined) setEcotrackToken(data.ecotrackToken);
              if (data.andersonUser !== undefined) setAndersonUser(data.andersonUser);
              if (data.andersonPass !== undefined) setAndersonPass(data.andersonPass);
              return; // Successfully loaded and decrypted
            }
          }
        } catch (err) {
          console.warn("Secure config load via REST failed, falling back to direct Firestore:", err);
        }

        // 2. Direct Firestore fallback (could return encrypted keys depending on stored state)
        try {
          const configRef = doc(db, "merchant_configs", user.uid);
          const docSnap = await getDoc(configRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.yalidineApiKey) setYalidineId(data.yalidineApiKey);
            if (data.yalidineApiToken) setYalidineToken(data.yalidineApiToken);
            if (data.zrApiKey) setZrKey(data.zrApiKey);
            if (data.maystroId) setMaystroId(data.maystroId);
            if (data.maystroApiKey) setMaystroKey(data.maystroApiKey);
            if (data.ecotrackToken) setEcotrackToken(data.ecotrackToken);
            if (data.andersonUser) setAndersonUser(data.andersonUser);
            if (data.andersonPass) setAndersonPass(data.andersonPass);
          }
        } catch (err) {
          console.error("Failed to fetch merchant config client-side", err);
        }
      };
      fetchConfig();
    }
  }, [user]);

  const handleExtract = async () => {
    if (!conversation.trim() && !fileUrl && !fileBase64) return;
    
    // Check billing quota (order consumption limit) before extraction calls
    if (userData && userData.orderCounter >= PLAN_LIMITS[userData.planType]) {
      alert(t.sub_limit_reached);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/extract-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ conversation, fileUrl, fileMimeType, fileBase64 }),
      });
      if (!response.ok) throw new Error("Extract failed");
      const data = await response.json();
      setOrder({ ...initialOrder, ...data, items: data.items?.length ? data.items : initialOrder.items });
      setScreen("review");
    } catch (err) { 
      setError(translations[lang].extract_error); 
    } finally { 
      setLoading(false); 
    }
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
      return;
    }

    setLoading(true);
    try {
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
         items: (order.items || []).map(item => ({
           product: item.product || "",
           quantity: item.quantity || 1,
           size: item.size || "",
           color: item.color || "",
           pricePerUnit: Number(item.pricePerUnit) || 0
         })), 
         shippingCompany: order.shipping_company || "Yalidine Express", 
         trackingNumber: order.tracking_number || "", 
         labelUrl: order.label_url || "", 
         locationUrl: order.location_url || "",
         shippingFee: Number(order.shippingFee) || 0,
         totalPrice: Number(order.totalPrice) || 0
       };

       if (order.id) {
         await updateDoc(doc(db, "orders", order.id), { ...payload, createdAt: order.createdAt || new Date() });
       } else {
         await addDoc(collection(db, "orders"), { ...payload, createdAt: order.createdAt || serverTimestamp() });
         // Increment consumption
         await updateDoc(doc(db, "users", user.uid), { 
           orderCounter: (userData.orderCounter || 0) + 1 
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
      return;
    }

    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/ship-order", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          order, 
          courier: order.shipping_company,
          keys: {
            yalidineApiKey: yalidineId,
            yalidineApiToken: yalidineToken,
            zrApiKey: zrKey,
            maystroId,
            maystroApiKey: maystroKey,
            ecotrackToken,
            andersonUser,
            andersonPass
          }
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
        items: (order.items || []).map(item => ({
          product: item.product || "",
          quantity: item.quantity || 1,
          size: item.size || "",
          color: item.color || "",
          pricePerUnit: Number(item.pricePerUnit) || 0
        })),
        locationUrl: order.location_url || "",
        shippingFee: Number(order.shippingFee) || 0,
        totalPrice: Number(order.totalPrice) || 0
      };

      let finalOrderId = order.id;
      if (order.id) {
        await updateDoc(doc(db, "orders", order.id), { ...firestorePayload, createdAt: order.createdAt || new Date() });
      } else {
        const docRef = await addDoc(collection(db, "orders"), { ...firestorePayload, createdAt: order.createdAt || serverTimestamp() });
        finalOrderId = docRef.id;
        // Increment consumption
        await updateDoc(doc(db, "users", user.uid), { 
          orderCounter: (userData.orderCounter || 0) + 1 
        });
      }

      setOrder({
        ...order, 
        id: finalOrderId,
        status: firestorePayload.status, 
        tracking_number: firestorePayload.trackingNumber, 
        label_url: firestorePayload.labelUrl
      });
      
      alert(t.shipped_success + "! " + firestorePayload.trackingNumber);
    } catch (err: any) { 
      setError(t.shipping_failed); 
      alert(t.shipping_failed);
    } finally { 
      setLoading(false); 
    }
  };

  const handleSaveKeys = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const trimmedYalidineId = (yalidineId || "").trim();
      const trimmedYalidineToken = (yalidineToken || "").trim();
      const trimmedZrKey = (zrKey || "").trim();
      const trimmedMaystroId = (maystroId || "").trim();
      const trimmedMaystroKey = (maystroKey || "").trim();
      const trimmedEcotrackToken = (ecotrackToken || "").trim();
      const trimmedAndersonUser = (andersonUser || "").trim();
      const trimmedAndersonPass = (andersonPass || "").trim();

      // Validate Yalidine API ID
      if (trimmedYalidineId) {
        const isNumeric = /^\d+$/.test(trimmedYalidineId);
        if (!isNumeric || trimmedYalidineId.length > 20) {
          const arMsg = "معرّف Yalidine API ID غير صالح. يجب أن يحتوي على أرقام فقط ولا يزيد عن 20 خانة.";
          const enMsg = "Invalid Yalidine API ID format. It must be numeric and up to 20 characters.";
          const frMsg = "ID API Yalidine invalide. Il doit être numérique et contenir au maximum 20 caractères.";
          
          const isAr = t.total_orders === "إجمالي الطلبات";
          const isFr = t.total_orders === "Total Commandes";
          
          alert(isAr ? arMsg : (isFr ? frMsg : enMsg));
          setLoading(false);
          return;
        }
      }

      // Update state with trimmed values to keep it clean in UI too
      setYalidineId(trimmedYalidineId);
      setYalidineToken(trimmedYalidineToken);
      setZrKey(trimmedZrKey);
      setMaystroId(trimmedMaystroId);
      setMaystroKey(trimmedMaystroKey);
      setEcotrackToken(trimmedEcotrackToken);
      setAndersonUser(trimmedAndersonUser);
      setAndersonPass(trimmedAndersonPass);

      // 1. Direct secure client-side Firestore save
      const configRef = doc(db, "merchant_configs", user.uid);
      await setDoc(configRef, { 
        yalidineApiKey: trimmedYalidineId, 
        yalidineApiToken: trimmedYalidineToken,
        zrApiKey: trimmedZrKey,
        maystroId: trimmedMaystroId,
        maystroApiKey: trimmedMaystroKey,
        ecotrackToken: trimmedEcotrackToken,
        andersonUser: trimmedAndersonUser,
        andersonPass: trimmedAndersonPass,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Trigger non-blocking server mirror if required
      try {
        const token = await auth.currentUser?.getIdToken();
        await fetch("/api/merchant-config", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ 
            yalidineApiKey: trimmedYalidineId, 
            yalidineApiToken: trimmedYalidineToken,
            zrApiKey: trimmedZrKey,
            maystroId: trimmedMaystroId,
            maystroApiKey: trimmedMaystroKey,
            ecotrackToken: trimmedEcotrackToken,
            andersonUser: trimmedAndersonUser,
            andersonPass: trimmedAndersonPass
          }),
        });
      } catch (err) {
        console.warn("Backend configuration mirror failed (non-blocking fallback active):", err);
      }

      alert(t.settings_keys_saved);
      setScreen("dashboard");
    } catch (err: any) { 
      console.error("Failed to save merchant keys", err);
      alert(t.error_saving_keys || "Error saving API keys."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleClearKeys = async () => {
    if (!user) return;
    const confirmMsg = t.clear_keys_confirm;
    
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      // 1. Clear state variables
      setYalidineId("");
      setYalidineToken("");
      setZrKey("");
      setMaystroId("");
      setMaystroKey("");
      setEcotrackToken("");
      setAndersonUser("");
      setAndersonPass("");

      // 2. Clear client-side Firestore document fields
      const configRef = doc(db, "merchant_configs", user.uid);
      await setDoc(configRef, { 
        yalidineApiKey: "", 
        yalidineApiToken: "",
        zrApiKey: "",
        maystroId: "",
        maystroApiKey: "",
        ecotrackToken: "",
        andersonUser: "",
        andersonPass: "",
        userId: user.uid,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 3. Clear server mirror via POST request passing empty strings
      try {
        const token = await auth.currentUser?.getIdToken();
        await fetch("/api/merchant-config", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ 
            yalidineApiKey: "", 
            yalidineApiToken: "",
            zrApiKey: "",
            maystroId: "",
            maystroApiKey: "",
            ecotrackToken: "",
            andersonUser: "",
            andersonPass: ""
          }),
        });
      } catch (err) {
        console.warn("Server mirror clear failed, client-side empty config takes priority:", err);
      }

      alert(t.cleared_db_success);
      setScreen("dashboard");
    } catch (err: any) {
      console.error("Failed to clear config database", err);
      alert(t.cleared_db_error || "Error cleaning database.");
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
  const urlParams = new URLSearchParams(window.location.search);
  const publicMerchantId = urlParams.get("merchantId") || urlParams.get("merchant_id") || urlParams.get("m");
  if (publicMerchantId) {
    return <PublicCheckoutForm merchantId={publicMerchantId} />;
  }

  if (authLoading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><RefreshCw className="animate-spin text-zinc-500 w-8 h-8" /></div>;
  if (!user) return <LandingPage lang={lang} setLang={setLang} signIn={signIn} t={t} isRtl={isRtl} />;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-4 pt-12 md:pt-16 font-sans mb-20 select-none transition-all duration-200" dir={isRtl ? "rtl" : "ltr"}>
      {screen === "dashboard" && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-8 w-full max-w-md md:max-w-4xl lg:max-w-5xl xl:max-w-6xl flex items-center justify-between transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(true)} className="p-2 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors"><Menu className="w-5 h-5 text-zinc-400" /></button>
            <h2 className="text-lg font-bold tracking-tight text-white/90">
               {t.nav_dashboard}
            </h2>
          </div>
        </motion.div>
      )}

      <main className={`w-full relative transition-all duration-300 ${
        screen === "dashboard" || screen === "admin" || screen === "wilayas" || screen === "subscription"
          ? "max-w-md md:max-w-4xl lg:max-w-5xl xl:max-w-6xl pb-10"
          : screen === "review" || screen === "settings"
          ? "max-w-md md:max-w-4xl lg:max-w-5xl pb-10"
          : "max-w-md md:max-w-3xl pb-10"
      }`}>
        <AnimatePresence mode="wait">
          {screen === "dashboard" && <Dashboard userData={userData} ordersHistory={ordersHistory} planLimits={PLAN_LIMITS} topWilayas={topWilayas} t={t} setScreen={setScreen} handleViewOrder={(o: any) => { setOrder(o); setScreen("review"); }} setOrderToDelete={setOrderToDelete} />}
          {screen === "input" && (
            <OrderInput 
              conversation={conversation} 
              setConversation={setConversation} 
              loading={loading} 
              error={error} 
              handleExtract={handleExtract} 
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
              addItem={() => setOrder({...order, items: [...order.items, { product: "", quantity: 1, size: "", color: "", pricePerUnit: 0 }]})} 
              removeItem={(idx: number) => { const items = [...order.items]; items.splice(idx, 1); setOrder({...order, items}); }} 
              updateItem={(idx: number, f: any, v: any) => { const items = [...order.items]; (items[idx] as any)[f] = v; setOrder({...order, items}); }}
              setScreen={setScreen} 
              t={t} 
              isRtl={isRtl} 
              initialOrder={initialOrder} 
            />
          )}
          {screen === "subscription" && <Subscription user={user} userData={userData} setScreen={setScreen} t={t} isRtl={isRtl} planLimits={PLAN_LIMITS} />}
          {screen === "admin" && <AdminDashboard t={t} isRtl={isRtl} setScreen={setScreen} />}
          {screen === "wilayas" && <WilayasList setScreen={setScreen} t={t} isRtl={isRtl} ordersHistory={ordersHistory} />}
          {screen === "settings" && (
            <Settings 
              userData={userData}
              t={t} 
              setScreen={setScreen} 
              isRtl={isRtl} 
              loading={loading} 
              handleSaveKeys={handleSaveKeys} 
              handleClearKeys={handleClearKeys}
              lang={lang} 
              setLang={setLang}
              yalidineId={yalidineId} setYalidineId={setYalidineId}
              yalidineToken={yalidineToken} setYalidineToken={setYalidineToken}
              zrKey={zrKey} setZrKey={setZrKey}
              maystroId={maystroId} setMaystroId={setMaystroId}
              maystroKey={maystroKey} setMaystroKey={setMaystroKey}
              ecotrackToken={ecotrackToken} setEcotrackToken={setEcotrackToken}
              andersonUser={andersonUser} setAndersonUser={setAndersonUser}
              andersonPass={andersonPass} setAndersonPass={setAndersonPass}
            />
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto py-8 text-zinc-700 text-[10px] uppercase tracking-widest text-center">{t.footer} &copy; 2026</footer>

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
            <div onClick={() => setOrderToDelete(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-xs text-center space-y-6">
              <Trash2 className="text-red-500 w-12 h-12 mx-auto" /><h3 className="text-lg font-bold">{t.delete_confirm}</h3>
              <div className="flex flex-col gap-2"><button onClick={() => handleDelete(orderToDelete)} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold">{t.delete_button}</button><button onClick={() => setOrderToDelete(null)} className="w-full py-3 bg-zinc-800 text-zinc-300 rounded-xl font-bold">{t.btn_cancel}</button></div>
            </motion.div>
          </div>
        )}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowLogoutConfirm(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-xs text-center space-y-6">
              <LogOut className="text-red-500 w-12 h-12 mx-auto" /><h3 className="text-lg font-bold">{t.logout_confirm}</h3>
              <div className="flex flex-col gap-2"><button onClick={() => { logout(); setShowLogoutConfirm(false); }} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold">{t.logout_button}</button><button onClick={() => setShowLogoutConfirm(false)} className="w-full py-3 bg-zinc-800 text-zinc-300 rounded-xl font-bold">{t.btn_cancel}</button></div>
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

