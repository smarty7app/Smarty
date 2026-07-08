import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, RefreshCw, LogOut, Trash2, Moon, Ban, MessageSquare, Send, X, CheckCircle, AlertTriangle, Info } from "lucide-react";
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
// Removed testFirebaseConnection for reduced bundle noise and startup speed.
// Connection health is now implicitly handled by provider hooks.

import { OrderData, InventoryItem, UserData } from "./types";
import { safeStorage } from "./lib/utils";
import { useUser, FirebaseProvider } from "./components/FirebaseProvider";
import { ThemeProvider, useTheme } from "./context/ThemeContext.tsx";
import { Logo } from "./components/CommonUI";
import { NotificationBell } from "./components/Notifications";
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
import NetworkStatus from "./components/NetworkStatus";
import Settings from "./components/Settings";

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
  const { theme, setTheme, toggleTheme } = useTheme();
  const { user, loading: authLoading, signIn, logout, authError, setAuthError } = useUser();
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
    | "settings"
  >("dashboard");

  // Courier credentials state variables
  const [yalidineId, setYalidineId] = useState("");
  const [yalidineToken, setYalidineToken] = useState("");
  const [zrKey, setZrKey] = useState("");
  const [maystroId, setMaystroId] = useState("");
  const [maystroKey, setMaystroKey] = useState("");
  const [ecotrackToken, setEcotrackToken] = useState("");
  const [andersonUser, setAndersonUser] = useState("");
  const [andersonPass, setAndersonPass] = useState("");
  const [procolisToken, setProcolisToken] = useState("");
  const [nordSudKey, setNordSudKey] = useState("");
  const [fastloToken, setFastloToken] = useState("");
  const [kaziTourKey, setKaziTourKey] = useState("");
  const [soudiaToken, setSoudiaToken] = useState("");
  const [colisLivKey, setColisLivKey] = useState("");

  useEffect(() => {
    safeStorage.setItem("smarty_lang", lang);
  }, [lang]);

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

  // States for banned user support ticket
  const [bannedSupportOpen, setBannedSupportOpen] = useState(false);
  const [bannedSupportName, setBannedSupportName] = useState("");
  const [bannedSupportMessage, setBannedSupportMessage] = useState("");
  const [bannedSupportSending, setBannedSupportSending] = useState(false);
  const [bannedSupportSuccess, setBannedSupportSuccess] = useState(false);
  const [bannedSupportError, setBannedSupportError] = useState("");

  // Startup watchdog for auth loading
  useEffect(() => {
    // Shorter check to warn user but not necessarily error out if it's just slow
    const timeoutId = setTimeout(() => {
      if (authLoading && !user) {
        setAuthStallDetected(true);
        console.warn(
          "⏳ [Auth Watchdog] Authentication is taking longer than expected. This often happens in restricted preview frames.",
        );
      }
    }, 5000);
    return () => clearTimeout(timeoutId);
  }, [authLoading, user]);

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
      screen !== "wilayas" &&
      screen !== "settings"
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
  const isAdmin = user?.email === "12benabdallah@gmail.com" || user?.email === "smarty7.app@gmail.com" || userData?.role === "admin";

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
            const data = snapshot.data();
            setUserData(data as UserData);
            
            // Sync displayName and photoURL if they are in Firebase Auth but missing in Firestore
            if (data && (!data.displayName || !data.photoURL) && (user.displayName || user.photoURL)) {
              await updateDoc(doc(db, "users", user.uid), {
                displayName: data.displayName || user.displayName || "",
                photoURL: data.photoURL || user.photoURL || ""
              });
            }

            if (data?.courierKeys) {
              setYalidineId(data.courierKeys.yalidineId || "");
              setYalidineToken(data.courierKeys.yalidineToken || "");
              setZrKey(data.courierKeys.zrKey || "");
              setMaystroId(data.courierKeys.maystroId || "");
              setMaystroKey(data.courierKeys.maystroKey || "");
              setEcotrackToken(data.courierKeys.ecotrackToken || "");
              setAndersonUser(data.courierKeys.andersonUser || "");
              setAndersonPass(data.courierKeys.andersonPass || "");
              setProcolisToken(data.courierKeys.procolisToken || "");
              setNordSudKey(data.courierKeys.nordSudKey || "");
              setFastloToken(data.courierKeys.fastloToken || "");
              setKaziTourKey(data.courierKeys.kaziTourKey || "");
              setSoudiaToken(data.courierKeys.soudiaToken || "");
              setColisLivKey(data.courierKeys.colisLivKey || "");
            }
          } else {
            const newUser: UserData = {
              planType: "free",
              orderCounter: 0,
              subscriptionStatus: "active",
              email: user.email || "",
              displayName: user.displayName || "",
              photoURL: user.photoURL || "",
              hasBeenWelcomed: false,
              merchantId: user.uid,
              ordersProcessed: 0,
              tokensUsed: 0,
              shippingRequests: 0,
              storageUsed: 0,
              aiCost: 0,
              subscriptionPlan: "free",
              lastBillingDate: new Date().toISOString(),
              createdAt: new Date().toISOString(),
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

  // Synchronize storageUsed (total number of products in inventory + orders in history)
  useEffect(() => {
    if (!user || !userData) return;
    const updateStorageMetric = async () => {
      try {
        const qProducts = query(collection(db, "inventory"), where("userId", "==", user.uid));
        const productsSnap = await getDocs(qProducts);
        const productsCount = productsSnap.size;
        const ordersCount = ordersHistory.length;
        const currentStorage = productsCount + ordersCount;
        
        if (userData.storageUsed !== currentStorage) {
          await updateDoc(doc(db, "users", user.uid), {
            storageUsed: currentStorage,
            merchantId: user.uid,
            lastBillingDate: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Failed to automatically update storage metric:", err);
      }
    };
    const timeout = setTimeout(updateStorageMetric, 3000);
    return () => clearTimeout(timeout);
  }, [user, ordersHistory.length, screen]);

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
      if (!response.ok) {
        let errorMessage = "Extract failed";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorMessage = errData.error;
          }
        } catch (_) {}
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setOrder({
        ...initialOrder,
        ...data,
        items: data.items?.length ? data.items : initialOrder.items,
      });
      setScreen("review");
    } catch (err: any) {
      setError(err?.message || translations[lang].extract_error);
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
        // Increment consumption and update tracking fields
        await updateDoc(doc(db, "users", user.uid), {
          orderCounter: (userData.orderCounter || 0) + 1,
          ordersProcessed: (userData.ordersProcessed || 0) + 1,
          merchantId: user.uid,
          lastBillingDate: new Date().toISOString(),
        });
      }
      alert(t.order_saved_success || "Saved successfully!");
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
        // Increment consumption and update tracking fields
        await updateDoc(doc(db, "users", user.uid), {
          orderCounter: (userData.orderCounter || 0) + 1,
          ordersProcessed: (userData.ordersProcessed || 0) + 1,
          merchantId: user.uid,
          lastBillingDate: new Date().toISOString(),
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

  const handleSaveKeys = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        courierKeys: {
          yalidineId,
          yalidineToken,
          zrKey,
          maystroId,
          maystroKey,
          ecotrackToken,
          andersonUser,
          andersonPass,
          procolisToken,
          nordSudKey,
          fastloToken,
          kaziTourKey,
          soudiaToken,
          colisLivKey,
        }
      });
      alert(t.settings_keys_saved || "API Keys saved and encrypted successfully!");
    } catch (err: any) {
      console.error(err);
      alert(t.save_error || "Failed to save API keys");
    } finally {
      setLoading(false);
    }
  };

  const handleClearKeys = async () => {
    if (!user) return;
    if (!confirm(t.delete_confirm || "Are you sure?")) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        courierKeys: {
          yalidineId: "",
          yalidineToken: "",
          zrKey: "",
          maystroId: "",
          maystroKey: "",
          ecotrackToken: "",
          andersonUser: "",
          andersonPass: "",
          procolisToken: "",
          nordSudKey: "",
          fastloToken: "",
          kaziTourKey: "",
          soudiaToken: "",
          colisLivKey: "",
        }
      });
      setYalidineId("");
      setYalidineToken("");
      setZrKey("");
      setMaystroId("");
      setMaystroKey("");
      setEcotrackToken("");
      setAndersonUser("");
      setAndersonPass("");
      setProcolisToken("");
      setNordSudKey("");
      setFastloToken("");
      setKaziTourKey("");
      setSoudiaToken("");
      setColisLivKey("");
      alert(isRtl ? "تمت إزالة مفاتيح الربط بنجاح" : "API keys successfully cleared!");
    } catch (err: any) {
      console.error(err);
      alert(t.save_error || "Failed to clear API keys");
    } finally {
      setLoading(false);
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
      <div className="min-h-screen bg-theme-bg flex flex-col gap-4 items-center justify-center p-6 text-center select-none transition-colors duration-300 text-theme-text">
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
                ? "إذا كنت تشاهد التطبيق من خلال نافذة المعاينة المؤطرة، فقد يتم حظر الاتصال في متصفحك. يرجى محاولة فتح التطبيق في نافذة مستقلة جديدة باستخدام خيار 'فتح في علامة تبويب جديدة'."
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
        theme={theme}
        setTheme={setTheme}
        authError={authError}
        setAuthError={setAuthError}
      />
    );
  }
  
  if (user && userData?.isBanned) {
    const bannedTranslations = {
      ar: {
        title: "تنبيه الدخول",
        desc: "لا يمكنك الوصول إلى هذا الحساب حالياً، إذا كنت تظن أن هذا الإجراء تم بالخطأ فيرجى التواصل مع الدعم الفني.",
        contactBtn: "تواصل مع الدعم الفني",
        logoutBtn: "تسجيل الخروج",
        supportTitle: "الدعم الفني والمساندة",
        supportDesc: "أرسل تفاصيل استفسارك وسيقوم فريق الدعم بالرد عليك ومراجعة حالة حسابك.",
        nameLabel: "الاسم الكامل",
        emailLabel: "البريد الإلكتروني",
        msgLabel: "تفاصيل الرسالة",
        msgPlaceholder: "اكتب تفاصيل استفسارك أو مشكلتك هنا...",
        sendBtn: "إرسال الرسالة",
        cancelBtn: "إلغاء والعودة",
        sending: "جاري الإرسال...",
        successTitle: "تم الإرسال بنجاح!",
        successDesc: "تم إرسال رسالتك بنجاح. سيقوم فريق الدعم بمراجعة طلبك والتواصل معك عبر البريد الإلكتروني قريباً.",
        successClose: "إغلاق",
        errFill: "يرجى كتابة نص الرسالة أولاً.",
        errSend: "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة لاحقاً."
      },
      en: {
        title: "Access Notification",
        desc: "You cannot access this account right now. If you think this is a mistake, please contact our technical support team.",
        contactBtn: "Contact Technical Support",
        logoutBtn: "Log Out",
        supportTitle: "Technical Support",
        supportDesc: "Send us a message, and our support team will review your account status and assist you.",
        nameLabel: "Full Name",
        emailLabel: "Email Address",
        msgLabel: "Message Details",
        msgPlaceholder: "Describe your query or issue details here...",
        sendBtn: "Send Message",
        cancelBtn: "Cancel & Back",
        sending: "Sending...",
        successTitle: "Sent Successfully!",
        successDesc: "Your message has been received. Our team will review your request and get back to you via email shortly.",
        successClose: "Close",
        errFill: "Please write your message details first.",
        errSend: "An error occurred while sending. Please try again later."
      },
      fr: {
        title: "Notification d'accès",
        desc: "Vous ne pouvez pas accéder à ce compte pour le moment. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter notre équipe d'assistance technique.",
        contactBtn: "Contacter le Support Technique",
        logoutBtn: "Se déconnecter",
        supportTitle: "Support Technique",
        supportDesc: "Envoyez-nous un message et notre équipe d'assistance examinera votre compte pour vous aider.",
        nameLabel: "Nom complet",
        emailLabel: "Adresse e-mail",
        msgLabel: "Détails du message",
        msgPlaceholder: "Décrivez votre demande ou problème ici...",
        sendBtn: "Envoyer le message",
        cancelBtn: "Annuler",
        sending: "Envoi en cours...",
        successTitle: "Envoyé avec succès !",
        successDesc: "Votre message a été bien reçu. Notre équipe d'assistance examinera votre demande et vous contactera bientôt.",
        successClose: "Fermer",
        errFill: "Veuillez d'abord rédiger votre message.",
        errSend: "Une erreur est survenue lors de l'envoi. Veuillez réessayer plus tard."
      }
    };

    const currentTrans = bannedTranslations[lang] || bannedTranslations.en;
    const isBannedRtl = lang === "ar";

    const handleSubmitBannedSupport = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!bannedSupportMessage.trim()) {
        setBannedSupportError(currentTrans.errFill);
        return;
      }
      setBannedSupportSending(true);
      setBannedSupportError("");
      try {
        await addDoc(collection(db, "support_messages"), {
          name: (bannedSupportName || user?.displayName || user?.email?.split('@')[0] || "User").trim(),
          email: user?.email || "",
          message: bannedSupportMessage.trim(),
          attachment: null,
          createdAt: serverTimestamp()
        });
        setBannedSupportSuccess(true);
        setBannedSupportMessage("");
      } catch (err) {
        console.error("Banned support submit error:", err);
        setBannedSupportError(currentTrans.errSend);
      } finally {
        setBannedSupportSending(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 text-center transition-all duration-300 font-sans" dir={isBannedRtl ? "rtl" : "ltr"}>
        
        {/* Top Floating Language Switcher for Banned User */}
        <div className="absolute top-6 right-6 left-6 flex justify-end gap-2 z-10">
          <div className="flex bg-white/85 border border-slate-200 rounded-2xl p-1 shadow-sm backdrop-blur-md">
            {([
              { code: "ar", label: "عربي" },
              { code: "en", label: "EN" },
              { code: "fr", label: "FR" }
            ] as const).map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  lang === l.code ? "bg-slate-700 text-white shadow-md" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white border border-slate-200 rounded-[2rem] p-8 space-y-6 shadow-xl relative overflow-hidden"
        >
          {/* Subtle light background slate glows */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-slate-100 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-slate-100 rounded-full blur-3xl pointer-events-none" />

          {!bannedSupportOpen ? (
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center mx-auto text-slate-600 shadow-sm">
                <Info className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-slate-800">
                  {currentTrans.title}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {user?.email}
                </p>
                <p className="text-sm text-slate-600 leading-relaxed text-center">
                  {currentTrans.desc}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    setBannedSupportName(user?.displayName || "");
                    setBannedSupportOpen(true);
                  }}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-slate-800/10"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{currentTrans.contactBtn}</span>
                </button>

                <button
                  onClick={() => logout()}
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/60 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{currentTrans.logoutBtn}</span>
                </button>
              </div>
            </div>
          ) : (
            // Support Form view inside the card
            <div className="space-y-6 text-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-600 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">{currentTrans.supportTitle}</h3>
                  <p className="text-[10px] text-slate-500 leading-tight">{currentTrans.supportDesc}</p>
                </div>
              </div>

              {bannedSupportSuccess ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-center space-y-4"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-600">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-sm">{currentTrans.successTitle}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{currentTrans.successDesc}</p>
                  </div>
                  <button
                    onClick={() => {
                      setBannedSupportSuccess(false);
                      setBannedSupportOpen(false);
                    }}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    {currentTrans.successClose}
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmitBannedSupport} className="space-y-4">
                  {bannedSupportError && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-2 text-amber-700 text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{bannedSupportError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{currentTrans.nameLabel}</label>
                    <input
                      type="text"
                      value={bannedSupportName}
                      onChange={(e) => setBannedSupportName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-slate-400 outline-none transition-all placeholder:text-slate-400"
                      placeholder={currentTrans.nameLabel}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{currentTrans.emailLabel}</label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200/50 rounded-xl text-slate-400 text-xs outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{currentTrans.msgLabel}</label>
                    <textarea
                      value={bannedSupportMessage}
                      onChange={(e) => setBannedSupportMessage(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-slate-400 outline-none transition-all placeholder:text-slate-400 resize-none"
                      placeholder={currentTrans.msgPlaceholder}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBannedSupportOpen(false);
                        setBannedSupportError("");
                      }}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/60 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                    >
                      {currentTrans.cancelBtn}
                    </button>
                    <button
                      type="submit"
                      disabled={bannedSupportSending}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-600/40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {bannedSupportSending ? (
                        <>
                          <RefreshCw className="animate-spin w-3 h-3" />
                          <span>{currentTrans.sending}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>{currentTrans.sendBtn}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-theme-bg text-theme-text flex flex-col items-center p-4 pt-12 md:pt-16 font-sans mb-20 select-none transition-all duration-300"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <NetworkStatus isRtl={isRtl} lang={lang} />
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
              className="p-2 bg-slate-100/50 dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-800 hover:bg-slate-200/50 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-slate-600 dark:text-zinc-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white/90">
              {screen === "dashboard" ? t.nav_dashboard : t.nav_inventory}
            </h2>
          </div>

          <div className="flex items-center gap-3">
             <button
               onClick={toggleTheme}
               className="p-2 bg-slate-100/50 dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-800 hover:bg-slate-200/50 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-slate-600 dark:text-zinc-400 select-none active:scale-95 flex items-center justify-center shrink-0"
               title={lang === "ar" ? "تغيير المظهر" : lang === "fr" ? "Changer le mode" : "Toggle theme"}
             >
               <Moon className={`w-5 h-5 transition-colors duration-200 ${theme === "dark" ? "text-white" : "text-black"}`} />
             </button>
             <NotificationBell t={t} isRtl={isRtl} />
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
          {screen === "settings" && (
            <Settings
              t={t}
              setScreen={setScreen}
              isRtl={isRtl}
              loading={loading}
              handleSaveKeys={handleSaveKeys}
              handleClearKeys={handleClearKeys}
              lang={lang}
              setLang={setLang}
              yalidineId={yalidineId}
              setYalidineId={setYalidineId}
              yalidineToken={yalidineToken}
              setYalidineToken={setYalidineToken}
              zrKey={zrKey}
              setZrKey={setZrKey}
              maystroId={maystroId}
              setMaystroId={setMaystroId}
              maystroKey={maystroKey}
              setMaystroKey={setMaystroKey}
              ecotrackToken={ecotrackToken}
              setEcotrackToken={setEcotrackToken}
              andersonUser={andersonUser}
              setAndersonUser={setAndersonUser}
              andersonPass={andersonPass}
              setAndersonPass={setAndersonPass}
              procolisToken={procolisToken}
              setProcolisToken={setProcolisToken}
              nordSudKey={nordSudKey}
              setNordSudKey={setNordSudKey}
              fastloToken={fastloToken}
              setFastloToken={setFastloToken}
              kaziTourKey={kaziTourKey}
              setKaziTourKey={setKaziTourKey}
              soudiaToken={soudiaToken}
              setSoudiaToken={setSoudiaToken}
              colisLivKey={colisLivKey}
              setColisLivKey={setColisLivKey}
            />
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
    <ThemeProvider>
      <FirebaseProvider>
        <AppContent />
      </FirebaseProvider>
    </ThemeProvider>
  );
}
