import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle, 
  CreditCard, 
  Upload, 
  X, 
  Shield, 
  Info, 
  ArrowRight, 
  RefreshCw, 
  Percent, 
  Sparkles, 
  Key, 
  Tag, 
  Coins, 
  AlertCircle, 
  Award, 
  Check, 
  Copy,
  Landmark,
  FileText,
  HelpCircle,
  TrendingUp,
  Fingerprint
} from "lucide-react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function Subscription({ user, userData, setScreen, t, isRtl, planLimits }: any) {
  const isAr = t.total_orders === "إجمالي الطلبات";
  const isFr = t.total_orders === "Total Commandes";
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const getPlanInfo = (p: string | null) => {
    switch (p) {
      case 'professional':
        return { price: '990', name: 'Professional', card: 'CIB Merchant Bank' };
      case 'business':
        return { price: '1,990', name: 'Business', card: 'CIB Merchant Bank' };
      case 'enterprise':
        return { price: '4,990', name: 'Enterprise', card: 'CCP / BaridiMob (Edahabia)' };
      case 'pro':
        return { price: '700', name: 'Pro', card: 'CIB Merchant Bank' };
      case 'unlimited':
        return { price: '2,000', name: 'Unlimited', card: 'CCP / BaridiMob (Edahabia)' };
      default:
        return { price: '0', name: 'Basic', card: 'CIB Merchant Bank' };
    }
  };
  
  // Tabs for the Upgrade Modal: "gateway" (Automated CIB/Edahabia) vs "manual" (CCP manual upload)
  const [activeTab, setActiveTab] = useState<"gateway" | "manual">("gateway");
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  // Manual receipts fields
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Payment Verification state
  const [verifyingCheckoutId, setVerifyingCheckoutId] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"verifying" | "success" | "cancelled" | "error" | null>(null);
  const [isSandboxPayment, setIsSandboxPayment] = useState(false);
  const [simulatingSuccess, setSimulatingSuccess] = useState(false);

  // Copied fields alerts
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Detect query parameters on mount to initiate automatic payment verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutId = params.get("checkout_id");
    const screenParam = params.get("screen");
    const paymentParam = params.get("payment");
    const planParam = params.get("plan");

    if (planParam) {
      setSelectedPlan(planParam);
    }

    if (screenParam === "verification" || checkoutId || paymentParam) {
      // Clean query parameters from URL completely to keep it pristine
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      if (paymentParam === "cancel") {
        setVerificationStatus("cancelled");
        return;
      }

      if (checkoutId) {
        setVerifyingCheckoutId(checkoutId);
        const isSandbox = checkoutId.startsWith("mock_ch_") || params.get("is_sandbox") === "true";
        setIsSandboxPayment(isSandbox);
        
        if (isSandbox) {
          // Keep state at verifying but show the interactive bank sandbox simulator
          setVerificationStatus("verifying");
        } else {
          verifyPayment(checkoutId);
        }
      }
    }
  }, []);

  const currentLimit = planLimits[userData?.planType || 'free'];
  const usagePercentage = Math.min(100, ((userData?.orderCounter || 0) / (currentLimit || 1)) * 100);

  const plans = [
    {
      id: "basic",
      name: isRtl ? "Basic (أساسي)" : "Basic",
      price: "0",
      currency: "DA",
      limit: planLimits.basic,
      features: isAr ? [
        "طلب شهرياً: 50 طلب",
        "القنوات المدعومة: فيسبوك ماسنجر وإنستغرام فقط",
        "تكامل شركات التوصيل: 1 شركة (تختارها)",
        "سرعة معالجة الطلبات: عادية",
        "تكامل مع الأنظمة: لا",
        "الدعم الفني: مجتمع فقط",
        "التحليلات والتقارير: أساسية",
        "التجربة: دائمة مجانية"
      ] : isFr ? [
        "Commandes par mois : 50 commandes",
        "Canaux supportés : Facebook Messenger et Instagram uniquement",
        "Transporteurs : 1 société (votre choix)",
        "Vitesse de traitement : Normale",
        "Intégration externe : Non",
        "Support : Communauté uniquement",
        "Analyses et Rapports : Basiques",
        "Période d'essai : Gratuit à vie"
      ] : [
        "Orders per month: 50 orders",
        "Supported channels: Facebook Messenger and Instagram only",
        "Couriers: 1 company (your choice)",
        "Processing speed: Normal",
        "External integration: No",
        "Support: Community only",
        "Analytics & Reports: Basic",
        "Trial period: Lifetime free"
      ],
      color: "zinc"
    },
    {
      id: "professional",
      name: isRtl ? "Professional (احترافي)" : "Professional",
      price: "990",
      currency: "DA",
      limit: planLimits.professional,
      features: isAr ? [
        "طلب شهرياً: 500 طلب",
        "القنوات المدعومة: فيسبوك ماسنجر وإنستغرام وواتساب (قناة واحدة من اختيار التاجر)",
        "تكامل شركات التوصيل: 3 شركات",
        "سرعة معالجة الطلبات: أسرع 2x",
        "تكامل مع الأنظمة: API أساسي",
        "الدعم الفني: إيميل (8/5)",
        "التحليلات والتقارير: متقدمة",
        "التجربة: 14 يوماً مجاناً"
      ] : isFr ? [
        "Commandes par mois : 500 commandes",
        "Canaux supportés : Facebook Messenger, Instagram et WhatsApp (1 canal de choix du marchand)",
        "Transporteurs : 3 sociétés",
        "Vitesse de traitement : 2x plus rapide",
        "Intégration externe : API de base",
        "Support : Email (8h/5j)",
        "Analyses et Rapports : Avancés",
        "Période d'essai : 14 jours gratuits"
      ] : [
        "Orders per month: 500 orders",
        "Supported channels: Facebook Messenger, Instagram and WhatsApp (1 channel of provider choice)",
        "Couriers: 3 companies",
        "Processing speed: 2x faster",
        "External integration: Basic API",
        "Support: Email (8/5)",
        "Analytics & Reports: Advanced",
        "Trial period: 14 days free"
      ],
      color: "blue"
    },
    {
      id: "business",
      name: isRtl ? "Business (أعمال)" : "Business",
      price: "1990",
      currency: "DA",
      limit: planLimits.business,
      features: isAr ? [
        "طلب شهرياً: 2000 طلب",
        "القنوات المدعومة: فيسبوك ماسنجر وإنستغرام وواتساب (جميع القنوات الرئيسية)",
        "تكامل شركات التوصيل: جميع الشركات (Yalidine, EMS, Speedex, DHL...)",
        "سرعة معالجة الطلبات: أسرع 5x",
        "تكامل مع الأنظمة: API كامل (ERP, WooCommerce, Shopify)",
        "الدعم الفني: إيميل + دردشة (24/6)",
        "التحليلات والتقارير: تفصيلية مع تنبيهات مخصصة",
        "التجربة: 30 يوماً مجاناً"
      ] : isFr ? [
        "Commandes par mois : 2000 commandes",
        "Canaux supportés : Facebook Messenger, Instagram et WhatsApp (tous les canaux principaux)",
        "Transporteurs : Toutes les sociétés (Yalidine, EMS, Speedex, DHL...)",
        "Vitesse de traitement : 5x plus rapide",
        "Intégration externe : API complète (ERP, WooCommerce, Shopify)",
        "Support : Email + Chat (24h/6j)",
        "Analyses et Rapports : Détaillés avec alertes personnalisées",
        "Période d'essai : 30 jours gratuits"
      ] : [
        "Orders per month: 2000 orders",
        "Supported channels: Facebook Messenger, Instagram and WhatsApp (all main channels)",
        "Couriers: All companies (Yalidine, EMS, Speedex, DHL...)",
        "Processing speed: 5x faster",
        "External integration: Full API (ERP, WooCommerce, Shopify)",
        "Support: Email + Chat (24/6)",
        "Analytics & Reports: Detailed with custom alerts",
        "Trial period: 30 days free"
      ],
      color: "purple",
      popular: true
    },
    {
      id: "enterprise",
      name: isRtl ? "Enterprise (شركات)" : "Enterprise",
      price: "4990",
      currency: "DA",
      limit: planLimits.enterprise,
      features: isAr ? [
        "طلب شهرياً: غير محدود",
        "القنوات المدعومة: جميع القنوات المدعومة بما فيها تيليغرام، مع دعم فني ذو أولوية",
        "تكامل شركات التوصيل: جميع الشركات + تكامل مخصص",
        "سرعة معالجة الطلبات: أولوية قصوى",
        "تكامل مع الأنظمة: تكامل احترافي + دعم مطورين",
        "الدعم الفني: أولوية 24/7 + هاتف",
        "التحليلات والتقارير: ذكاء اصطناعي",
        "التجربة: تواصل مع المبيعات"
      ] : isFr ? [
        "Commandes par mois : Illimité",
        "Canaux supportés : Tous les canaux supportés incluant Telegram, avec support prioritaire",
        "Transporteurs : Toutes les sociétés + intégration personnalisée",
        "Vitesse de traitement : Priorité absolue",
        "Intégration externe : Intégration Pro + support développeur",
        "Support : Priorité 24h/7j + Téléphone",
        "Analyses et Rapports : Indicateurs IA",
        "Période d'essai : Contacter le service commercial"
      ] : [
        "Orders per month: Unlimited",
        "Supported channels: Any supported channels including Telegram, with priority support",
        "Couriers: All companies + custom integration",
        "Processing speed: Top priority",
        "External integration: Pro integration + dev support",
        "Support: Priority 24/7 + Phone",
        "Analytics & Reports: AI metrics",
        "Trial period: Contact sales"
      ],
      color: "yellow"
    }
  ];

  // Copy to clipboard helper
  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch((err) => {
      console.error("Could not copy text: ", err);
    });
  };

  // Initiate automated payment session
  const handleInstantPayment = async () => {
    if (!user || !selectedPlan) return;
    setGatewayLoading(true);
    setGatewayError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ planType: selectedPlan })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const resJson = await response.json();
      if (resJson.checkoutUrl) {
        // Safe navigation to checkout page in a new window/tab to bypass iframe policies
        const win = window.open(resJson.checkoutUrl, "_blank");
        if (win) {
          win.focus();
        } else {
          // Popups blocked: fallback to in-frame redirect
          window.location.href = resJson.checkoutUrl;
        }
        setShowUpgradeModal(false);
      } else {
        throw new Error("Empty checkout URL returned");
      }
    } catch (err: any) {
      console.error(err);
      setGatewayError("Failed to reach payment gateway. Verify your network or secrets configurations.");
    } finally {
      setGatewayLoading(false);
    }
  };

  // Verify real checkout on the server
  const verifyPayment = async (checkoutId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/payments/verify-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ checkout_id: checkoutId })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.status === "paid") {
          setVerificationStatus("success");
        } else {
          setVerificationStatus("error");
        }
      } else {
        setVerificationStatus("error");
      }
    } catch (err) {
      console.error(err);
      setVerificationStatus("error");
    }
  };

  // Handle Mock Sandbox success confirmation
  const handleSandboxPaymentSuccess = async () => {
    if (!verifyingCheckoutId) return;
    setSimulatingSuccess(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/payments/sandbox-pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ checkout_id: verifyingCheckoutId })
      });

      if (res.ok) {
        setVerificationStatus("success");
      } else {
        setVerificationStatus("error");
      }
    } catch (err) {
       console.error(err);
       setVerificationStatus("error");
    } finally {
       setSimulatingSuccess(false);
    }
  };

  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          resolve(compressedBase64);
        };
        img.onerror = () => {
          resolve(event.target?.result as string);
        };
      };
      reader.onerror = () => {
        resolve("");
      };
    });
  };

  // Upload CCP file logic (Manual backup)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      if (file.type.startsWith("image/")) {
        try {
          const compressed = await compressImageFile(file);
          setPreviewUrl(compressed);
        } catch (e) {
          console.error("Receipt compression failed, falling back", e);
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDirectActivation = async (planId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        planType: planId,
        subscriptionStatus: "active"
      });
      setShowUpgradeModal(false);
      setSelectedPlan(null);
      alert(isAr 
        ? `تم تنشيط خطة الاشتراك (${planId === 'basic' ? 'Basic' : planId === 'professional' ? 'Professional' : planId === 'business' ? 'Business' : 'Enterprise'}) بنجاح! ستلاحظ تغير استهلاك وحدود الطلبات فوراً.`
        : `Subscription activated successfully for ${planId}! Your order consumption limits have been updated instantly.`
      );
    } catch (err: any) {
      console.error("Error upgrading plan:", err);
      alert(isAr 
        ? "حدث خطأ أثناء ترقية الاشتراك. تم تدوين التفاصيل في وحدة التحكم." 
        : "An error occurred while upgrading the subscription. Details have been logged to the console."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!user || !selectedPlan || !receiptFile) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "subscription_requests"), {
        userId: user.uid,
        userEmail: user.email,
        requestedPlan: selectedPlan,
        receiptUrl: previewUrl || ("https://placeholder-receipt.com/" + Math.random().toString(36).substring(7)),
        status: "pending",
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "users", user.uid), {
        subscriptionStatus: "pending_verification"
      });

      setShowUpgradeModal(false);
      setReceiptFile(null);
      setPreviewUrl(null);
      setSelectedPlan(null);
      alert(t.sub_request_sent || "Request sent successfully! We will verify your payment shortly.");
    } catch (err) {
      console.error(err);
      alert(t.error_sending_request || "Error sending request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isPending = userData?.subscriptionStatus === "pending_verification";

  // Render Verification Screen instead of pricing grid if checkout parsing active
  if (verificationStatus) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="space-y-8 py-10 w-full max-w-xl mx-auto text-center"
      >
        <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          
          {verificationStatus === "verifying" && (
            <>
              {isSandboxPayment ? (
                // Elegant interactive CIB / BaridiMob Bank gateway simulator (No Emojis)
                <div className="space-y-6 text-left" dir={isAr ? 'rtl' : 'ltr'}>
                  <div className="flex items-center gap-3 border-b border-zinc-850 pb-4">
                    <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20">
                      <CreditCard className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white">
                        {isAr ? "محاكي الدفع الآمن CIB / BaridiMob" : isFr ? "Simulateur de passerelle de paiement sécurisé CIB / BaridiMob" : "Mock Payment Gateway (Simulation)"}
                      </h3>
                      <p className="text-xs text-zinc-500">Secure Merchant Sandbox Environment</p>
                    </div>
                  </div>

                  <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-400 leading-relaxed flex items-start gap-3">
                    <Info className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
                    <div>
                       <strong>{isAr ? "بيئة تجريبية نشطة:" : isFr ? "Mode Sandbox Actif :" : "Sandbox Mode Active:"}</strong>{" "}
                       {isAr 
                         ? "هذه واجهة دفع افتراضية مخصصة لاختبار ترقية الحساب. لتنشيط معاملات حقيقية عبر البطاقة الذهبية، يرجى تزويد مفتاح CHARGILY_SECRET_KEY في إعدادات الخادم."
                         : isFr 
                           ? "Ceci est une page de paiement virtuel conçue pour les tests. Pour de vraies transactions, configurez votre CHARGILY_SECRET_KEY dans les variables d'environnement."
                           : "This is a virtual check-out window designed for testing. For genuine transactions, integrate your CHARGILY_SECRET_KEY into server environment variables."
                       }
                    </div>
                  </div>

                  {/* Payment Details Container */}
                  <div className="space-y-3 bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 text-sm">
                    <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                      <span className="text-zinc-500 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-zinc-500" /> {isAr ? "البطاقة المستخدمة" : isFr ? "Fournisseur de carte" : "Card Provider"}
                      </span>
                      <span className="font-mono text-zinc-300 font-semibold">
                        {getPlanInfo(selectedPlan).card}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                      <span className="text-zinc-500 flex items-center gap-2">
                        <Coins className="w-4 h-4 text-zinc-500" /> {isAr ? "المبلغ المستحق" : isFr ? "Montant à payer" : "Amount to Pay"}
                      </span>
                      <span className="font-mono text-emerald-400 font-bold text-base">
                        {getPlanInfo(selectedPlan).price} DZD
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                      <span className="text-zinc-500 flex items-center gap-2">
                        <Key className="w-4 h-4 text-zinc-500" /> {isAr ? "معرف المستخدم" : isFr ? "ID Client" : "Client ID"}
                      </span>
                      <span className="font-mono text-zinc-400 text-xs">
                        {user?.uid?.substring(0, 14)}...
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-zinc-500" /> {isAr ? "جلسة المعاملة" : isFr ? "Jeton de session" : "Session Token"}
                      </span>
                      <span className="font-mono text-blue-400 text-xs">
                        {verifyingCheckoutId?.substring(0, 18)}...
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    <button 
                      onClick={handleSandboxPaymentSuccess}
                      disabled={simulatingSuccess}
                      className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold rounded-2xl shadow-xl shadow-emerald-500/10 active:scale-98 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {simulatingSuccess ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          <span>{isAr ? "تأكيد الدفع التجريبي فورا" : isFr ? "Simuler un paiement réussi" : "Simulate Successful Checkout"}</span>
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => setVerificationStatus(null)}
                      className="w-full py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 font-bold rounded-2xl transition-all cursor-pointer"
                    >
                      {isAr ? "تراجع وإلغاء المعاملة" : isFr ? "Annuler et refuser la session" : "Cancel and Decline Session"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 space-y-4">
                  <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                  <h3 className="text-xl font-bold text-white">
                    {isAr ? "جاري التحقق من عملية الدفع..." : isFr ? "Vérification de la transaction..." : "Verifying Payment Transaction..."}
                  </h3>
                  <p className="text-sm text-zinc-400 px-4 leading-relaxed">
                    {isAr 
                      ? "يرجى عدم إغلاق هذه الصفحة. نتواصل حالياً بنظام الدفع للتأكد من نجاح العملية وترقية حسابك فوراً."
                      : isFr 
                        ? "Veuillez ne pas fermer cette page. Nous contactons le processeur de paiement pour valider votre transaction et activer votre compte."
                        : "Connecting with the payment processor to confirm authorization. Your upgrade is being provisioned."
                    }
                  </p>
                </div>
              )}
            </>
          )}

          {verificationStatus === "success" && (
            <div className="py-6 space-y-6">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-white">
                  {isAr ? "تم تفعيل الاشتراك بنجاح!" : isFr ? "Abonnement activé avec succès !" : "Subscription Activated Successfully!"}
                </h3>
                <p className="text-sm text-zinc-400 px-4 leading-relaxed">
                  {isAr 
                    ? "تهانينا! تلقينا مدفوعاتك وتم ترقية حسابك إلى خطتك الجديدة بنجاح. كافة المزايا متاحة لك الآن بالكامل."
                    : isFr 
                      ? "Félicitations ! Votre paiement a été reçu et votre compte a été mis à niveau vers le nouveau plan. Toutes les fonctionnalités sont maintenant déverrouillées."
                      : "Payment received. Your subscription tier has been fully updated and unlocked on our network."
                  }
                </p>
              </div>
              <button 
                onClick={() => { setVerificationStatus(null); setScreen("dashboard"); }}
                className="w-full py-4 bg-white text-black hover:bg-zinc-100 font-bold rounded-2xl transition-all active:scale-98 shadow-lg cursor-pointer"
              >
                {isAr ? "الذهاب للوحة التحكم" : isFr ? "Lancer le tableau de bord" : "Launch Dashboard"}
              </button>
            </div>
          )}

          {verificationStatus === "cancelled" && (
            <div className="py-6 space-y-6">
              <div className="w-16 h-16 bg-zinc-900 text-zinc-400 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
                <X className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">
                  {isAr ? "تم إلغاء عملية الدفع" : isFr ? "Transaction annulée" : "Transaction Cancelled"}
                </h3>
                <p className="text-sm text-zinc-400 px-4 leading-relaxed">
                  {isAr 
                    ? "تم إيقاف عملية الشحن ولم نقم بخصم مبالغ من بطاقتك. يمكنك إعادة تشغيل جلسة الدفع في أي وقت."
                    : isFr 
                      ? "Le processus d'achat a été annulé. Aucun frais n'a été prélevé sur votre carte. N'hésitez pas à réessayer."
                      : "The checkout process was cancelled. No transaction fees were billed. Feel free to try again."
                  }
                </p>
              </div>
              <button 
                onClick={() => setVerificationStatus(null)}
                className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all cursor-pointer"
              >
                {isAr ? "العودة للترقيات" : isFr ? "Réessayer l'abonnement" : "Retry Upgrade Path"}
              </button>
            </div>
          )}

          {verificationStatus === "error" && (
            <div className="py-6 space-y-6">
              <div className="w-16 h-16 bg-red-500/15 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/25">
                <Shield className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">
                  {isAr ? "تعذر التحقق من المعاملة" : isFr ? "Échec de la vérification" : "Verification Failed"}
                </h3>
                <p className="text-sm text-red-400 px-4 leading-relaxed">
                  {isAr 
                    ? "لم يتم العثور على معاملة مكتملة ومؤكدة تابعة لرمز الجلسة المعطى. يرجى مراجعة رصيد بطاقتك أو الاتصال بالدعم الفني."
                    : isFr 
                      ? "Nous n'avons pas pu vérifier une transaction approuvée pour ce code de session. Veuillez vérifier votre solde ou contacter le support."
                      : "We couldn't verify an approved purchase status with this transaction code. Please request support if issues persist."
                  }
                </p>
              </div>
              <button 
                onClick={() => setVerificationStatus(null)}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all cursor-pointer"
              >
                {isAr ? "المحاولة مجدداً" : isFr ? "Réessayer" : "Try Again"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 pb-20 w-full max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setScreen("dashboard")} 
          className={`p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors hover:border-zinc-700 ${isAr ? 'rotate-180' : ''} cursor-pointer`}
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-500" />
            <span>{t.sub_upgrade || "Subscription"}</span>
          </h2>
          <p className="text-zinc-500 text-xs mt-0.5">
            {isAr ? "اختر خطتك المفضلة لتطوير قدرات عملك" : isFr ? "Découvrez nos abonnements conçus pour vous accompagner" : "Sleek pricing models fitted to grow with you"}
          </p>
        </div>
      </div>

      {/* Usage Progress Bar */}
      {userData && (
        <div className="bg-zinc-900/30 border border-zinc-850 rounded-[1.75rem] p-6 backdrop-blur-md relative overflow-hidden">
           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
           <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-blue-400" />
                {t.sub_usage}
              </span>
              <span className="text-xs font-mono font-semibold text-zinc-305 bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-zinc-800">
                {userData.orderCounter} <span className="text-zinc-650 font-normal">/</span> {currentLimit === Infinity ? '∞' : currentLimit}
              </span>
           </div>
           <div className="h-2.5 bg-zinc-800/40 rounded-full overflow-hidden p-0.5 border border-zinc-850">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${usagePercentage}%` }} 
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
              />
           </div>
        </div>
      )}

      {isPending && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-[1.75rem] p-6 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
           <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner">
             <Shield className="w-6 h-6 animate-pulse" />
           </div>
           <div className="flex-1">
              <h3 className="font-bold text-blue-400 text-sm flex items-center gap-1.5 justify-center md:justify-start">
                <span>{t.sub_pending_title}</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{t.sub_pending_desc}</p>
           </div>
        </div>
      )}

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isSelectedPlan = userData?.planType === plan.id || 
            (userData?.planType === 'free' && plan.id === 'basic') || 
            (userData?.planType === 'pro' && plan.id === 'professional') || 
            (userData?.planType === 'unlimited' && plan.id === 'business');
          return (
            <div 
              key={plan.id}
              className={`
                relative p-6 rounded-[2rem] border transition-all duration-300 flex flex-col group overflow-hidden
                ${plan.popular 
                  ? 'bg-gradient-to-b from-purple-950/10 to-zinc-950/20 border-purple-500 shadow-[0_0_40px_rgba(147,51,234,0.12)] ring-2 ring-purple-500/50' 
                  : plan.color === 'blue'
                    ? 'bg-zinc-950/40 border-blue-900/30 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5'
                    : plan.color === 'yellow'
                      ? 'bg-zinc-950/40 border-yellow-900/30 hover:border-yellow-500/50 hover:shadow-xl hover:shadow-yellow-500/5'
                      : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 hover:shadow-xl hover:shadow-black/20'}
                ${isSelectedPlan ? 'opacity-100 border-zinc-500' : 'opacity-90 hover:opacity-100'}
              `}
            >
              {plan.popular && (
                <>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-purple-500/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-white" />
                    <span>{isRtl ? "الأكثر شعبية" : "Popular"}</span>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                </>
              )}

              <div className="flex justify-between items-start mb-4">
                <h3 className={`text-sm font-black tracking-wider uppercase ${
                  plan.color === 'blue' ? 'text-blue-400' : 
                  plan.color === 'purple' ? 'text-purple-400' : 
                  plan.color === 'yellow' ? 'text-yellow-400' : 'text-zinc-400'
                }`}>
                  {plan.name}
                </h3>
                {isSelectedPlan && (
                  <span className="text-[9px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-bold border border-zinc-700">
                    {isAr ? "نشط" : isFr ? "Actif" : "Active"}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1 mb-6" dir="ltr">
                <span className="text-3xl font-black text-white tracking-tighter">{plan.price}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{plan.currency}</span>
                <span className="text-zinc-500 text-[10px] ml-1 font-normal">/ {isAr ? "شهرياً" : isFr ? "mois" : "month"}</span>
              </div>
              
              <div className="space-y-3.5 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                      plan.color === 'blue' ? 'text-blue-400' : 
                      plan.color === 'purple' ? 'text-purple-400' : 
                      plan.color === 'yellow' ? 'text-yellow-400' : 'text-zinc-500'
                    }`} />
                    <span className="text-[11px] font-medium text-zinc-300 leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                disabled={isSelectedPlan || (plan.id === 'basic') || isPending}
                onClick={() => {
                  setSelectedPlan(plan.id as any);
                  setShowUpgradeModal(true);
                }}
                className={`
                  w-full py-3 rounded-xl font-bold transition-all active:scale-98 disabled:opacity-40 disabled:active:scale-100 text-[10px] tracking-wider uppercase
                  ${isSelectedPlan 
                    ? 'bg-zinc-900 border border-zinc-850 text-zinc-500 cursor-default' 
                    : plan.color === 'blue' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/15' 
                      : plan.color === 'purple' 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-xl shadow-purple-500/15' 
                        : plan.color === 'yellow'
                          ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                          : 'bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-750'
                  }
                `}
              >
                {isSelectedPlan ? (isAr ? "الخطة الحالية" : isFr ? "Plan Actuel" : "Current Plan") : (isAr ? "ترقية الآن" : isFr ? "Choisir" : "Upgrade Plan")}
              </button>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showUpgradeModal && selectedPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowUpgradeModal(false)} 
              className="absolute inset-0 bg-black/85 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-850 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              {/* Permanent Header at top - never scrollable */}
              <div className="p-8 pb-4 flex items-center justify-between border-b border-zinc-900 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white">{t.payment_info || "Billing Portal"}</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {t.upgrade_to || "Upgrade to"}{" "} 
                      <span className="text-blue-400 font-extrabold uppercase bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/20 text-[10px] tracking-wider ml-1">
                        {selectedPlan}
                      </span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowUpgradeModal(false)} 
                  className="p-2 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all hover:scale-105 animate-fade-in cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable content container with customized visual weight */}
              <div className="p-8 pt-4 space-y-6 overflow-y-auto flex-1 max-h-[calc(90vh-140px)] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {/* Secure Payment Selector Tabs (Segmented Controller Style) */}
                <div className="grid grid-cols-2 p-1.5 bg-zinc-900/60 rounded-2xl border border-zinc-850/80">
                  <button 
                    onClick={() => setActiveTab("gateway")}
                    className={`py-3.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'gateway' ? 'bg-zinc-800 text-white border border-zinc-700/50 shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span>{isAr ? "الدفع الإلكتروني التلقائي" : isFr ? "Paiement en ligne" : "Instant e-Payment"}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab("manual")}
                    className={`py-3.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'bg-zinc-800 text-white border border-zinc-700/50 shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>{isAr ? "تحويل CCP / بريدي موب" : isFr ? "Virement CCP / BaridiMob" : "Postal Transfer (CCP)"}</span>
                  </button>
                </div>

                {activeTab === "gateway" ? (
                  // Integrated Automated Chargily Gateway (CIB & Edahabia)
                  <div className="space-y-6">
                    {/* Visual Card Representation */}
                    <div className="bg-gradient-to-br from-zinc-900 to-black p-6 rounded-[2rem] border border-zinc-850 relative overflow-hidden flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                      
                      {/* Interactive Credit Card layout */}
                      <div className="flex items-center gap-3 bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/80 shadow-md">
                        <img src="https://img.icons8.com/color/48/visa.png" className="w-8 h-5 object-contain opacity-80" alt="Visa" />
                        <img src="https://img.icons8.com/color/48/mastercard.png" className="w-8 h-5 object-contain opacity-80" alt="MasterCard" />
                        <span className="w-px h-4 bg-zinc-800" />
                        <span className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-[8px] font-black text-yellow-500 tracking-wider">EDAHABIA</span>
                        <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[8px] font-black text-blue-400 tracking-wider">CIB CARD</span>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="font-bold text-white text-base">
                          {isAr ? "بوابة شحن جزائرية مشفرة بالكامل" : isFr ? "Passerelle de paiement algérienne sécurisée" : "Secured Algerian Payment Gateway"}
                        </h4>
                        <p className="text-[11px] text-zinc-500 max-w-md mx-auto leading-relaxed">
                          {isAr 
                            ? "ادفع بأمان عبر منصة كارت Chargily Pay المعتمدة. تدعم منصتنا البطاقة الذهبية لبريد الجزائر وبطاقات البنوك CIB لتفعيل فوري ومؤتمت بالكامل."
                            : isFr
                              ? "Payez en toute sécurité via Chargily Pay. Les cartes nationales (Edahabia & CIB) sont entièrement prises en charge pour l'activation automatique."
                              : "Direct transactions securely routed via Chargily Pay. Major domestic cards (Edahabia & CIB) are fully supported for automated subscription provisioning."
                          }
                        </p>
                      </div>
                    </div>

                    {gatewayError && (
                      <div className="p-4 bg-red-950/20 border border-red-500/30 text-xs text-red-400 rounded-2xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{gatewayError}</span>
                      </div>
                    )}

                    <button 
                      onClick={handleInstantPayment}
                      disabled={gatewayLoading}
                      className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-xl shadow-blue-500/15 active:scale-98 transition-all disabled:opacity-50"
                    >
                      {gatewayLoading ? (
                        <>
                          <RefreshCw className="animate-spin w-5 h-5" />
                          <span>{isAr ? "جاري تحضير البوابة..." : isFr ? "Préparation de la passerelle..." : "Contacting Secure Gateway..."}</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          <span>{isAr ? "ادفع الآن ببطاقة CIB أو الذهبية" : isFr ? "Payer maintenant par carte CIB ou Edahabia" : "Proceed to Secure Gateway"}</span>
                        </>
                      )}
                    </button>
                    
                    <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-900 flex items-center gap-2 justify-center">
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
                      <p className="text-[10px] text-zinc-500 leading-relaxed text-center">
                        {isAr 
                          ? "سيتم توجيهك إلى خوادم الدفع المشفرة التابعة للبنك لتأكيد المعاملة بأمان."
                          : isFr
                            ? "Vous serez redirigé vers les serveurs bancaires sécurisés pour finaliser la transaction. Sécurisé SSL."
                            : "You will be redirected to certified banking servers to complete the checkout verification. SSL Secured."
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  // Manual CCP System (Legacy/Fallback) - Redesigned to look like clean smart banking cards with copy options
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       
                       {/* BaridiMob Account card mockup */}
                       <div className="bg-gradient-to-br from-teal-950/20 via-zinc-950 to-zinc-950 border border-zinc-850 rounded-3xl p-6 relative overflow-hidden group shadow-md flex flex-col justify-between h-44">
                          <div className="absolute top-3 right-4">
                            <Landmark className="w-5 h-5 text-teal-400/60" />
                          </div>
                          <div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-teal-400 bg-teal-500/5 px-2 py-0.5 rounded border border-teal-500/20">
                              BaridiMob RIP
                            </span>
                            <div className="mt-4 space-y-1">
                              <span className="text-[10px] text-zinc-500 block uppercase font-mono">Recipient RIP ID</span>
                              <span className="font-mono text-sm leading-none tracking-wider text-teal-200 block font-semibold">
                                00799999002222222222
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-900">
                            <span className="text-[10px] text-zinc-500 font-mono">DZD Transfer</span>
                            <button
                              onClick={() => copyToClipboard("00799999002222222222", "rip")}
                              className="text-xs text-teal-400 hover:text-white flex items-center gap-1.5 transition-colors font-bold px-2 py-1 bg-teal-500/5 rounded-lg border border-teal-500/10 hover:border-teal-400/35"
                            >
                              {copiedField === "rip" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{isAr ? "تم النسخ" : isFr ? "Copié" : "Copied"}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>{isAr ? "نسخ RIP" : isFr ? "Copier le RIP" : "Copy RIP"}</span>
                                </>
                              )}
                            </button>
                          </div>
                       </div>

                       {/* CCP Account card mockup */}
                       <div className="bg-gradient-to-br from-yellow-950/10 via-zinc-950 to-zinc-950 border border-zinc-850 rounded-3xl p-6 relative overflow-hidden group shadow-md flex flex-col justify-between h-44">
                          <div className="absolute top-3 right-4">
                            <Landmark className="w-5 h-5 text-yellow-400/60" />
                          </div>
                          <div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/5 px-2 py-0.5 rounded border border-yellow-500/20">
                              CCP Transfer (Algerie Poste)
                            </span>
                            <div className="mt-4 space-y-1">
                              <span className="text-[10px] text-zinc-500 block uppercase font-mono">Account No / Key</span>
                              <span className="font-mono text-sm leading-none tracking-wider text-yellow-200 block font-semibold">
                                12345678 / 99
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-900">
                            <span className="text-[10px] text-zinc-500 font-mono">CCP Bill</span>
                            <button
                              onClick={() => copyToClipboard("12345678 99", "ccp")}
                              className="text-xs text-yellow-400 hover:text-white flex items-center gap-1.5 transition-colors font-bold px-2 py-1 bg-yellow-500/5 rounded-lg border border-yellow-500/10 hover:border-yellow-400/35"
                            >
                              {copiedField === "ccp" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{isAr ? "تم النسخ" : isFr ? "Copié" : "Copied"}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>{isAr ? "نسخ الحساب" : isFr ? "Copier le n°" : "Copy No"}</span>
                                </>
                              )}
                            </button>
                          </div>
                       </div>
                    </div>

                    {/* Receipt Upload Container */}
                    <div className="bg-zinc-900/40 border border-zinc-850 rounded-[1.75rem] p-6 space-y-4">
                      <h4 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-blue-400" />
                        <span>{t.upload_receipt}</span>
                      </h4>
                      
                      <div className="relative group cursor-pointer">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className={`
                          border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all duration-300
                          ${previewUrl ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800 bg-black/40 group-hover:border-zinc-700/80'}
                        `}>
                          {previewUrl ? (
                             <img src={previewUrl} className="w-full h-36 object-contain rounded-xl" />
                          ) : (
                            <>
                              <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                <Upload className="w-5 h-5 text-zinc-450 text-zinc-400" />
                              </div>
                              <p className="text-xs font-semibold text-zinc-300">{t.click_to_upload}</p>
                              <p className="text-[10px] text-zinc-550 text-zinc-500 mt-1">PNG, JPG or PDF (max 5MB)</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <button 
                        onClick={handleSubmitRequest}
                        disabled={loading || !receiptFile}
                        className="w-full py-4 bg-white hover:bg-zinc-100 text-black rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-2xl active:scale-98 transition-all disabled:opacity-40"
                      >
                        {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Shield className="w-5 h-5" />}
                        <span>{t.submit_upgrade || "Request Upgrade"}</span>
                      </button>
                      <p className="text-center text-[9px] text-zinc-550 mt-3.5 uppercase tracking-wider">
                        Custom operator confirmation • Usually activated in under 24 hours
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
