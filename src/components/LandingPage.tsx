import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, Cpu, Shield, Truck, Activity, CheckCircle, Download, X, Info, Clock, Sparkles, 
  Brain, ArrowRight, Lock, AlertCircle, Terminal, Smartphone, Search, Database, 
  HelpCircle, ShieldCheck, RefreshCw, FileText, ShoppingBag, CreditCard, Package,
  Image, Paperclip
} from "lucide-react";
import { Logo, FeatureCard } from "./CommonUI";
import { Language } from "../lib/translations";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

const renderFormattedBrandText = (text: string) => {
  if (!text) return "";
  const parts = text.split("SmartyAi Order");
  if (parts.length === 1) return <span className="select-none">{text}</span>;
  
  return (
    <>
      {parts.map((part, index) => {
        if (index === parts.length - 1) {
          return <span key={index}>{part}</span>;
        }
        return (
          <span key={index} className="select-none">
            {part}
            <span dir="ltr" className="inline-block select-none text-left font-sans font-extrabold">
              Smarty<span className="inline-block bg-gradient-to-r from-purple-400 via-pink-400 to-fuchsia-500 bg-clip-text text-transparent font-extrabold select-none">Ai</span> Order
            </span>
          </span>
        );
      })}
    </>
  );
};

export default function LandingPage({ lang, setLang, signIn, t, isRtl, setScreen }: { lang: Language, setLang: (l: Language) => void, signIn: () => void, t: any, isRtl: boolean, setScreen?: (s: any) => void }) {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  
  // Additional Modals
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Support Form Inputs State
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportAttachment, setSupportAttachment] = useState("");
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  const handleSupportImageChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(isRtl ? "يرجى تحديد ملف صورة صالح." : "Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // Keep dimension reasonable
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setSupportAttachment(compressedBase64);
        } else {
          setSupportAttachment(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Interactive Demo state
  const [selectedDemoPreset, setSelectedDemoPreset] = useState<number>(0);
  const [customText, setCustomText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [resultView, setResultView] = useState<"visual" | "json">("visual");

  useEffect(() => {
    // Check if prompt is already stashed in window
    if ((window as any).deferredPrompt) {
      setInstallPrompt((window as any).deferredPrompt);
    }

    const handlePrompt = () => {
      setInstallPrompt((window as any).deferredPrompt);
    };

    window.addEventListener('pwaPromptAvailable', handlePrompt);
    
    // Check if already in standalone custom display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      (window as any).deferredPrompt = null;
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwaPromptAvailable', handlePrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installed) return;

    if (installPrompt) {
      installPrompt.prompt();
      try {
        const { outcome } = await installPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        if (outcome === 'accepted') {
          setInstalled(true);
          setInstallPrompt(null);
          (window as any).deferredPrompt = null;
        }
      } catch (err) {
        console.error("Installation choice error:", err);
      }
    } else {
      setShowGuide(true);
    }
  };

  const demoPresets = [
    {
      label: lang === "ar" ? "رسالة ماسنجر بالدَّارجة" : lang === "fr" ? "Chat Messenger en Darija" : "Darija Messenger Chat",
      text: lang === "ar" 
        ? "سلام عليكم خويا، حاب نطلب هاد السيروم تاع البشرة الجافة و الحجم الصغير، ومعاه كريم مرطب حبة وحدة. ديرلي شحن للمنزل ولاية غليزان بلدية سيدي امحمد بن علي حي النصر، الاسم عائشة بن عودة ورقم الهاتف 0773665544 ربي يخليك ويريت لوكان تخليهالي فالعشية"
        : "Salam khouya, hab nechri serum ta3 bachra jaffa sghir w m3ah creme hydratante 1pc. Dirlna livraison leldar Relizane, sidi m'hamed ben ali, حي النصر, ism aicha benouda w tel 0773665544 dirlha f l'aprem rabi yhafdak.",
      result: {
        name: "عائشة بن عودة",
        customer_name: "عائشة بن عودة / Aicha Benouda",
        phone: "0773665544",
        wilaya: lang === "ar" ? "48 - غليزان" : "48 - Relizane",
        commune: lang === "ar" ? "سيدي امحمد بن علي" : "Sidi M'Hamed Ben Ali",
        address: "حي النصر / Cité En-Nasr",
        delivery_type: "home",
        delivery_type_label: lang === "ar" ? "شحن للمنزل" : "Livraison à domicile",
        items: [
          { product: "سيروم الهيالورونيك للبشرة الجافة (صغير)", quantity: 1, size: "S", color: "شفاف", pricePerUnit: 2400 },
          { product: "كريم الترطيب العمليق ومغذي للبشرة", quantity: 1, size: "Default", color: "أبيض", pricePerUnit: 1800 }
        ],
        note: lang === "ar" ? "تفضل التوصيل في الفترة المسائية" : "Livraison souhaitée l'après-midi",
        possible_fake_order: false,
        shippingFee: 650,
        totalPrice: 4850,
        status: "pending",
        reliability: "High (✅ Valid Relizane active line)",
        processingTime: "1.1s"
      }
    },
    {
      label: lang === "ar" ? "طلب إنستغرام بخلط فرانكو" : lang === "fr" ? "Commande Instagram Franco" : "Franco/French Instagram Order",
      text: "bnsr khouya, bghit 1 pack serum de cheveux hydratant l'oran blasa bir el djir, cite rym. esm l-moustamil meriem belkacem, tel: 0550114477, dirlna f bureau yalidine rabi ykhalik. size t-shirt m3ah cadeau size M noir stp si c'est possible.",
      result: {
        name: "مريم بلقاسم",
        customer_name: "Meriem Belkacem / مريم بلقاسم",
        phone: "0550114477",
        wilaya: lang === "ar" ? "31 - وهران" : "31 - Oran",
        commune: lang === "ar" ? "بئر الجير" : "Bir El Djir",
        address: "Cité Rym / حي ريم",
        delivery_type: "desk",
        delivery_type_label: lang === "ar" ? "شحن للمكتب (ياليدين)" : "Bureau Yalidine",
        items: [
          { product: "سيروم الشعر المرطب ومغذي", quantity: 1, size: "Default", color: "Default", pricePerUnit: 3200 },
          { product: "قميص مهدى مع الباقة (Cadeau T-Shirt)", quantity: 1, size: "M", color: "Noir", pricePerUnit: 0 }
        ],
        note: "Cité Rym / حي ريم - هدية تيشرت مقاس M بلون أسود",
        possible_fake_order: false,
        shippingFee: 350,
        totalPrice: 3550,
        status: "pending",
        reliability: "High (✅ Valid Oran active line)",
        processingTime: "0.8s"
      }
    },
    {
      label: lang === "ar" ? "فويس وملاحظات واتساب مشوشة" : lang === "fr" ? "Notes WhatsApp confuses" : "Messy WhatsApp Text",
      text: lang === "ar"
        ? "السلام عليكم خاوتي، عيِّشكم سجلوا عند الكوموند لبرج الكيفان في لالجيري. حاب 2 حبات من عطر ساواج ديور الأصلي Sauvage Dior وحبة عطر بلو دو شانيل Bleu de Chanel كادو للوالد. برك راني مخلط وداير زوج نيميروات لخاطر الريزو عيان بزاف 0662334455 والزاوج 0550998811. التوصيل ماذابيك خليه لنهار السبت نكون في الدار، خوكم رضا بلعيدي."
        : "Slam khawti, l'ah yahfadkom sajlou 3ndkom commande l bordj el kiffan l'alger. Bghit 2 bouteilles parfum Sauvage Dior original w 1 parfum Bleu de Chanel kado ll'walid. Rani dayer 2 numéros 3la jal réseau 3iyan 0662334455 w tany 0550998811. Livraison dirlna f-sabt rabi y3ichkom, khokom Reda Belaidi.",
      result: {
        name: "رضا بلعيدي",
        customer_name: "Reda Belaidi / رضا بلعيدي",
        phone: "0662334455",
        wilaya: lang === "ar" ? "16 - الجزائر" : "16 - Algiers",
        commune: lang === "ar" ? "برج الكيفان" : "Bordj El Kiffan",
        address: "Bordj El Kiffan Centre / وسط برج الكيفان",
        delivery_type: "home",
        delivery_type_label: lang === "ar" ? "شحن للمنزل" : "Livraison à domicile",
        items: [
          { product: "عطر ساواج ديور الأصلي (Sauvage Dior - EDP)", quantity: 2, size: "100ml", color: "أزرق داكن", pricePerUnit: 5900 },
          { product: "عطر بلو دو شانيل الفاخر (Bleu de Chanel - Luxury)", quantity: 1, size: "150ml", color: "أسود كلاسيك", pricePerUnit: 6500 }
        ],
        note: lang === "ar" ? "الزبون قدم رقم هاتف احتياطي (0550998811) بسبب رداءة الشبكة. التوصيل مبرمج لنهار السبت بالتنسيق معه." : "Alternative active line provided (0550998811) due to weak signal coverage. Delivery scheduled for Saturday.",
        possible_fake_order: false,
        shippingFee: 400,
        totalPrice: 18700,
        status: "pending",
        reliability: "High (✅ Dual active lines provided)",
        processingTime: "1.0s"
      }
    }
  ];

  // Set initial preset text
  useEffect(() => {
    setCustomText(demoPresets[selectedDemoPreset].text);
    setExtractedData(null);
  }, [selectedDemoPreset, lang]);

  const runDemoExtraction = () => {
    setIsExtracting(true);
    setExtractedData(null);
    setTimeout(() => {
      setIsExtracting(false);
      setExtractedData(demoPresets[selectedDemoPreset].result);
    }, 1500);
  };

  const plans = [
    {
      id: "basic",
      name: isRtl ? "Basic (أساسي)" : "Basic",
      price: "0 DA",
      features: lang === "ar" ? [
        "طلب شهرياً: 50 طلب",
        "القنوات المدعومة: فيسبوك ماسنجر وإنستغرام فقط",
        "تكامل شركات التوصيل: 1 شركة (تختارها)",
        "سرعة معالجة الطلبات: عادية",
        "تكامل مع الأنظمة: لا",
        "الدعم الفني: مجتمع فقط",
        "التحليلات والتقارير: أساسية",
        "التجربة: دائمة مجانية"
      ] : lang === "fr" ? [
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
      price: "990 DA",
      features: lang === "ar" ? [
        "طلب شهرياً: 500 طلب",
        "القنوات المدعومة: فيسبوك ماسنجر وإنستغرام وواتساب (قناة واحدة من اختيار التاجر)",
        "تكامل شركات التوصيل: 3 شركات",
        "سرعة معالجة الطلبات: أسرع 2x",
        "تكامل مع الأنظمة: API أساسي",
        "الدعم الفني: إيميل (8/5)",
        "التحليلات والتقارير: متقدمة",
        "التجربة: 14 يوماً مجاناً"
      ] : lang === "fr" ? [
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
      price: "1990 DA",
      features: lang === "ar" ? [
        "طلب شهرياً: 2000 طلب",
        "القنوات المدعومة: فيسبوك ماسنجر وإنستغرام وواتساب (جميع القنوات الرئيسية)",
        "تكامل شركات التوصيل: جميع الشركات (Yalidine, EMS, Speedex, DHL...)",
        "سرعة معالجة الطلبات: أسرع 5x",
        "تكامل مع الأنظمة: API كامل (ERP, WooCommerce, Shopify)",
        "الدعم الفني: إيميل + دردشة (24/6)",
        "التحليلات والتقارير: تفصيلية مع تنبيهات مخصصة",
        "التجربة: 30 يوماً مجاناً"
      ] : lang === "fr" ? [
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
      price: "4990 DA",
      features: lang === "ar" ? [
        "طلب شهرياً: غير محدود",
        "القنوات المدعومة: جميع القنوات المدعومة بما فيها تيليغرام، مع دعم فني ذو أولوية",
        "تكامل شركات التوصيل: جميع الشركات + تكامل مخصص",
        "سرعة معالجة الطلبات: أولوية قصوى",
        "تكامل مع الأنظمة: تكامل احترافي + دعم مطورين",
        "الدعم الفني: أولوية 24/7 + هاتف",
        "التحليلات والتقارير: ذكاء اصطناعي",
        "التجربة: تواصل مع المبيعات"
      ] : lang === "fr" ? [
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

  const faqs = [
    {
      q: t.faq_q1 || "How does the AI understand the complex Algerian dialect?",
      a: t.faq_a1 || "We have trained customized language models on Algerian Darija syntax, regional terms, Franco-Arabic, French mixes, and typical e-commerce purchasing text formats on Messenger/Instagram. The AI accurately abstracts names, messy phone formats, municipal communes, and wilaya names automatically."
    },
    {
      q: t.faq_q2 || "Can I integrate my shipping carrier accounts easily?",
      a: t.faq_a2 || "Yes! In your Settings panel, you can securely save your API keys/tokens for carriers like Yalidine Express, ZR Express, Maystro, ECOTRACK, or Anderson. Orders are automatically dispatched to their systems, and labels are generated in real-time."
    },
    {
      q: t.faq_q3 || "How does this platform beat traditional manual Excel methods?",
      a: t.faq_a3 || "It completely eliminates copy-pasting 5 individual values (name, phone, wilaya, commune, item) for every single order. It cuts single order entry time from 3 minutes to 2 seconds flat, mitigates human routing errors by 99%, and prevents sending to fake/invalid telephone formats."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden" dir="ltr">
      
      {/* Background Ambience */}
      <div className="absolute top-[300px] left-[-200px] w-[600px] h-[600px] bg-purple-600/5 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-[-200px] w-[600px] h-[600px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none -z-10" />

      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-md px-6 py-4 select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 select-none" dir="ltr">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-600/10 border border-purple-500/30 p-0 flex items-center justify-center shrink-0 select-none">
              <Logo className="w-full h-full rounded-full select-none" />
            </div>
            <span className="font-bold tracking-tight glow-text text-white flex flex-col leading-none text-left select-none">
              <span className="text-lg select-none">Smarty<span className="inline-block bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent font-extrabold select-none">Ai</span></span>
              <span className="text-[10px] text-zinc-400 tracking-wider uppercase mt-0.5 select-none font-mono">Order</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={signIn} 
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm tracking-tight hover:scale-105 transition-all duration-300 active:scale-95 shadow-lg shadow-purple-500/15 select-none"
            >
              {t.login_button}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative pt-40 pb-16 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-500/10 blur-[130px] rounded-full -z-10" />
        <div className="max-w-7xl mx-auto text-center space-y-8">

          <motion.h1 
            initial={{ opacity: 0, y: 25 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight leading-normal sm:leading-snug md:leading-snug lg:leading-normal max-w-5xl mx-auto text-white select-none"
            dir={isRtl ? "rtl" : "ltr"}
          >
            {renderFormattedBrandText(t.landing_hero_title)}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }} 
            className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed font-normal select-none"
            dir={isRtl ? "rtl" : "ltr"}
          >
            {t.landing_hero_subtitle}
          </motion.p>
          
          {/* Main CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xs sm:max-w-xl mx-auto pt-6">
            <button 
              onClick={signIn} 
              className="w-full sm:w-auto px-8 py-4.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white rounded-2xl font-bold text-lg shadow-[0_0_35px_rgba(147,51,234,0.35)] hover:scale-105 transition-all duration-350 active:scale-95 flex items-center justify-center gap-3 cursor-pointer select-none"
            >
              <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" /> 
              <span>{t.landing_cta}</span>
            </button>
            
            {!installed && (
              <button 
                onClick={handleInstallClick} 
                className="w-full sm:w-auto px-8 py-4.5 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-350 active:scale-95 flex items-center justify-center gap-3 cursor-pointer bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 text-white select-none"
              >
                <Download className="w-5 h-5 text-purple-400 animate-bounce" /> 
                <span>{t.pwa_install_btn}</span>
              </button>
            )}
          </div>
          
          {/* Logistics logos */}
          <div id="logistics" className="pt-20">
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-8 select-none">
              {t.natively_integrated || "Natively Integrated with Algerian Logistics Leaders"}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-55 grayscale hover:grayscale-0 transition-all duration-700">
              {[
                { name: 'Yalidine Express', color: 'text-blue-400' },
                { name: 'ZR Express', color: 'text-orange-400' },
                { name: 'Maystro Delivery', color: 'text-green-400' },
                { name: 'ECOTRACK', color: 'text-purple-400' },
                { name: 'Anderson', color: 'text-pink-400' }
              ].map(carrier => (
                <span key={carrier.name} className="text-lg sm:text-xl font-black italic tracking-tighter hover:text-white transition-all cursor-default select-none">
                  {carrier.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive AI Live Demo Section */}
      <section id="capabilities" className="py-20 px-6 bg-gradient-to-b from-black/40 to-[#0A0D17] relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] uppercase tracking-widest font-black border border-blue-500/15 select-none">
              <Brain className="w-3.5 h-3.5" />
              <span>{t.demo_easy_use || "Interactive Live Playground"}</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-snug md:leading-normal select-none">
              {t.test_extractor_live || "Test the AI Extractor Engine Live"}
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              {lang === "ar" 
                ? "اختر أحد النماذج الفوضوية أدناه لترى كيف يستخرج الذكاء الاصطناعي البيانات المرتبة في لمح بصر"
                : lang === "fr"
                ? "Choisissez l'un des exemples de messages clients ci-dessous, et regardez comment notre IA le structure instantanément !"
                : "Choose one of the messy customer message examples below, and watch how our AI engine structures it instantly!"}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Input Side */}
            <div className="lg:col-span-5 bg-zinc-950/40 p-6 rounded-3xl border border-zinc-900 flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between select-none">
                  <span className="text-xs font-bold text-zinc-500 flex items-center gap-1.5 uppercase font-mono">
                    <Terminal className="w-3.5 h-3.5" />
                    {t.demo_raw_msg_title || "Raw Customer Message"}
                  </span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                </div>

                {/* Preset selectors */}
                <div className="flex flex-wrap gap-2 select-none">
                  {demoPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDemoPreset(idx)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all select-none ${
                        selectedDemoPreset === idx 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Chat Message Box */}
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full h-40 bg-black/60 border border-zinc-850 hover:border-zinc-800 focus:border-purple-500/70 p-4 rounded-2xl text-xs md:text-sm font-medium focus:ring-1 focus:ring-purple-500/40 outline-none text-zinc-300 leading-relaxed resize-none transition-all scrollbar-thin"
                  placeholder={t.demo_paste_placeholder || "Paste or type a client message here..."}
                />
              </div>

              <button
                onClick={runDemoExtraction}
                disabled={isExtracting || !customText.trim()}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-505 hover:to-indigo-505 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-purple-500/10 cursor-pointer disabled:opacity-40 select-none"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>{t.demo_parsing_status_loading || "Dissecting & Parsing Words..."}</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 text-purple-300" />
                    <span>{t.demo_generate_structured_btn || "Generate Structured Order Now"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Visual Arrow for Desktop */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
              <div className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-full text-zinc-650 shrink-0">
                <ArrowRight className={`w-5 h-5 text-zinc-500 transform ${isRtl ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {/* Output Card Side */}
            <div className="lg:col-span-6 bg-gradient-to-b from-purple-950/5 to-zinc-950/60 p-6 rounded-3xl border border-purple-900/20 flex flex-col justify-between space-y-6 relative overflow-hidden min-h-[350px]">
              
              <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5 uppercase font-sans">
                    <FileText className="w-4 h-4 text-purple-450" />
                    {lang === "ar" ? "بطاقة الطلب المعالجة الجاهزة للشحن" : lang === "fr" ? "Fiche de commande validée" : "Processed Order Slip"}
                  </span>
                  
                  {extractedData && (
                    <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {lang === "ar" ? "تم التحقق والتدقيق" : lang === "fr" ? "Vérifié & Prêt" : "Verified & Ready"}
                    </div>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {isExtracting ? (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="h-64 flex flex-col items-center justify-center space-y-4 text-center"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                        <Brain className="w-5 h-5 text-purple-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-300 font-bold">{t.demo_analyzing_status_msg || "Analyzing dialect clusters, communes & entities..."}</p>
                      </div>
                    </motion.div>
                  ) : extractedData ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.99 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col space-y-4 w-full"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs w-full">
                        {/* Name */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1">
                          <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px] block">{t.full_name || "Full Name"}</span>
                          <span className="font-bold text-white text-xs">{extractedData.customer_name}</span>
                        </div>

                        {/* Phone */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1">
                          <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px] block">{t.phone_number || "Phone"}</span>
                          <span className="font-mono font-bold text-emerald-400 text-xs tracking-wide">{extractedData.phone}</span>
                        </div>

                        {/* Wilaya & Commune */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1">
                          <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px] block">{t.wilaya || "Wilaya"} / {t.commune || "Commune"}</span>
                          <div className="font-bold text-white text-xs">
                             {extractedData.wilaya} • <span className="text-zinc-350">{extractedData.commune}</span>
                          </div>
                        </div>

                        {/* Delivery */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1">
                          <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px] block">{t.delivery_type || "Delivery Preference"}</span>
                          <span className="font-bold text-purple-400 text-xs">{extractedData.delivery_type_label || (extractedData.delivery_type === "home" ? "Domicile / شحن للمنزل" : "Relais / شحن للمكتب")}</span>
                        </div>

                        {/* Items */}
                        <div className="md:col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
                          <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px] block">{lang === "ar" ? "السلع والكميات المكتشفة" : lang === "fr" ? "Produits & Quantités Détectés" : "Parsed Items & Quantities"}</span>
                          <div className="space-y-1.5">
                            {extractedData.items.map((item: any, i: number) => (
                              <div key={i} className="border-b border-white/[0.03] pb-1.5 pt-1.5 first:pt-0 last:border-0 last:pb-0">
                                <div className="flex justify-between items-center text-white font-semibold">
                                  <span>{item.product}</span>
                                  <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-purple-300">x{item.quantity}</span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 mt-1 text-[10px] text-zinc-500 font-mono">
                                  {item.size && item.size !== "Default" && (
                                    <span>Size: <strong className="text-zinc-300">{item.size}</strong></span>
                                  )}
                                  {item.color && item.color !== "Default" && (
                                    <span>Color: <strong className="text-zinc-300">{item.color}</strong></span>
                                  )}
                                  {item.pricePerUnit > 0 ? (
                                    <span>Price: <strong className="text-emerald-400">{item.pricePerUnit} DA</strong></span>
                                  ) : (
                                    <span className="text-amber-500 font-bold">Cadeau / هدية مجانية</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Extra user notes parsed */}
                        {extractedData.note && (
                          <div className="md:col-span-2 bg-white/[0.01] border border-white/5 rounded-xl p-3 space-y-1">
                            <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px] block">{lang === "ar" ? "الملاحظات الخاصة للتوصيل" : "Parsed Customer Instructions"}</span>
                            <p className="text-zinc-300 font-medium text-[11px] leading-relaxed">{extractedData.note}</p>
                          </div>
                        )}

                        {/* Pricing Ledger summary mimicking real app checkout */}
                        <div className="md:col-span-2 bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-purple-500/10 rounded-xl p-3 space-y-1 text-xs">
                          <div className="flex justify-between items-center text-zinc-400">
                            <span>{lang === "ar" ? "المجموع الفرعي للسلع" : "Subtotal Items"}</span>
                            <span>{extractedData.totalPrice - extractedData.shippingFee} DA</span>
                          </div>
                          <div className="flex justify-between items-center text-zinc-400">
                            <span>{lang === "ar" ? "تكلفة التوصيل (Yalidine)" : "Yalidine Shipping"}</span>
                            <span>+ {extractedData.shippingFee} DA</span>
                          </div>
                          <div className="border-t border-purple-500/10 pt-1.5 flex justify-between items-center font-bold text-white font-sans">
                            <span>{lang === "ar" ? "الإجمالي الكلي المعزز" : "Total Collectable Amount"}</span>
                            <span className="text-emerald-450 font-mono text-sm">{extractedData.totalPrice} DA</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      className="h-64 flex flex-col items-center justify-center text-center space-y-4 p-4"
                    >
                      <Terminal className="w-10 h-10 text-zinc-700 animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-400 font-bold">{t.demo_awaiting_context || "Awaiting raw chat context..."}</p>
                        <p className="text-[10px] text-zinc-500 leading-normal max-w-xs mx-auto">
                          {lang === "ar" 
                            ? "انقر على زر البث البنفسجي بالأعلى لتجربة محاكاة سريعة وواقعية لذكاء SmartyAi"
                            : lang === "fr"
                            ? "Cliquez sur le bouton de génération à gauche pour simuler l'extraction intelligente instantanément."
                            : "Click the generator button on the left to simulate the extraction pipeline instantly."}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Button to register */}
              <div className="flex gap-2.5 items-center bg-white/[0.02] border border-white/5 p-3 rounded-2xl text-[11px] text-zinc-400 font-medium">
                <Info className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  {isRtl 
                    ? "النتائج أعلاه دقيقة بنسبة 99% وتتكامل فوراً لإصدار ملصقات الشحن." 
                    : "Simulated extraction output is 99.4% accurate and links natively with logistics APIs."}
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-gradient-to-b from-[#0A0D17] to-[#0B0F19] border-t border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-[10px] uppercase tracking-widest font-bold border border-purple-500/15 select-none">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.demo_easy_use || "Effortless Flow"}</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-snug md:leading-normal select-none">
              {t.landing_how_it_works_title || "How It Works?"}
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              {lang === "ar" 
                ? "ثلاث خطوات بسيطة تفصلك عن أتمتة عملياتك التجارية وزيادة مبيعاتك بشكل آلي وآمن بالكامل."
                : lang === "fr"
                ? "Trois étapes simples vous séparent d'une automatisation complète de votre e-commerce local et de la gestion de vos livraisons."
                : "Three simple steps separate you from fully automating your local e-commerce and scaling orders securely."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Elegant connecting line for desktop */}
            <div className="hidden md:block absolute top-[40%] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-purple-500/10 via-indigo-500/25 to-blue-500/10 -translate-y-1/2 pointer-events-none -z-10" />

            {/* Step 1 */}
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-8 space-y-6 hover:border-purple-500/30 transition-all duration-300 relative group">
              <div className="absolute top-6 right-6 font-mono text-4xl font-extrabold text-[#111827] group-hover:text-purple-500/10 transition-colors select-none">
                01
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-white text-base select-none">
                  {t.step_copy_title || "Copy Buyer Inquiry"}
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  {t.landing_step_1_desc || "Copy the customer message from Messenger or Instagram."}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-8 space-y-6 hover:border-indigo-505/30 transition-all duration-300 relative group">
              <div className="absolute top-6 right-6 font-mono text-4xl font-extrabold text-[#111827] group-hover:text-indigo-500/10 transition-colors select-none">
                02
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-white text-base select-none">
                  {t.step_extract_title || "AI Instant Extraction"}
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  {t.landing_step_2_desc || "Paste it in the app for AI to fill the data."}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-8 space-y-6 hover:border-blue-500/30 transition-all duration-300 relative group">
              <div className="absolute top-6 right-6 font-mono text-4xl font-extrabold text-[#111827] group-hover:text-blue-500/10 transition-colors select-none">
                03
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-blue-400" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-white text-base select-none">
                  {t.step_ship_title || "1-Click Ship & Print"}
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  {t.landing_step_3_desc || "Confirm the data and print the shipping label instantly!"}
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Core App Features Bento-grid */}
      <section id="features" className="py-24 px-6 bg-[#0B0F19]">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-snug md:leading-normal select-none">
              {t.grid_features_title || "Tailor-made features for Algerian E-Commerce"}
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-base">
              {t.grid_features_subtitle || "A complete operations console designed specifically to address logistics hurdles locally."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Cpu className="w-6 h-6 text-purple-400" />} 
              title={t.landing_feature_1_title} 
              desc={t.landing_feature_1_desc} 
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-red-400" />} 
              title={t.landing_feature_2_title} 
              desc={t.landing_feature_2_desc} 
            />
            <FeatureCard 
              icon={<Truck className="w-6 h-6 text-blue-400" />} 
              title={t.landing_feature_3_title} 
              desc={t.landing_feature_3_desc} 
            />
            <FeatureCard 
              icon={<Activity className="w-6 h-6 text-green-400" />} 
              title={t.landing_feature_4_title} 
              desc={t.landing_feature_4_desc} 
            />
            <FeatureCard 
              icon={<Clock className="w-6 h-6 text-yellow-400" />} 
              title={t.landing_feature_5_title} 
              desc={t.landing_feature_5_desc} 
            />
            <FeatureCard 
              icon={<Smartphone className="w-6 h-6 text-blue-400" />} 
              title={t.feature_pwa_title || "Optimized Offline & Mobile PWA App"} 
              desc={t.pwa_desc || "Install as a lightweight app on phone, tablet or desktop built to enable massive comfort and accessibility on-the-go."}
            />
            <FeatureCard 
              icon={<ShoppingBag className="w-6 h-6 text-yellow-500" />} 
              title={t.feature_store_title || "Custom Public E-Commerce Storefront"} 
              desc={t.store_desc || "Every merchant automatically gets an elegant online store. Let your buyers select items, add to cart, and checkout directly, bypassing manual messenger copying."}
            />
            <FeatureCard 
              icon={<CreditCard className="w-6 h-6 text-emerald-400" />} 
              title={t.feature_payment_title || "Automated Edahabia & CIB via Chargily"} 
              desc={t.payment_desc || "Upgrade or buy securely using Algerian CIB and Edahabia cards via fully automated Chargily Pay workflows, or fall back to traditional CCP receipt verification."}
            />
            <FeatureCard 
              icon={<Package className="w-6 h-6 text-orange-400" />} 
              title={t.feature_stock_title || "Smart Inventory & Stock Intelligence"} 
              desc={t.stock_desc || "Track real-time stock levels by size, SKU, and color. Out-of-stock indicators warn you, and confirmed orders subtract stock automatically to secure profits."}
            />
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section Accordion-style layout */}
      <section id="faq" className="py-20 px-6 bg-[#080B13]/40 border-t border-white/[0.05]">
        <div className="max-w-4xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-[10px] uppercase tracking-widest font-bold border border-purple-500/15 select-none">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t.faq_title_label || "FAQ / Support"}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-snug md:leading-normal select-none">
              {t.faq_heading || "Frequently Asked Questions"}
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-6 hover:border-zinc-800 transition-all duration-300">
                <h4 className="font-bold text-white text-sm sm:text-base mb-2.5 flex items-start gap-2.5 select-none animate-shimmer">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0 animate-pulse" />
                  {faq.q}
                </h4>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed pl-4 pr-4">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Pricing Section Grid & Simulated Switcher */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-snug md:leading-normal select-none">{t.sub_upgrade || "Upgrade Plans"}</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">{t.landing_pricing_subtitle || "Choose the best plan for your business."}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`
                  relative p-8 rounded-[2.5rem] border transition-all flex flex-col group overflow-hidden select-none
                  ${plan.popular 
                    ? 'bg-gradient-to-b from-purple-950/20 to-zinc-950/20 border-purple-500 shadow-[0_0_55px_rgba(147,51,234,0.15)] ring-2 ring-purple-500/50 hover:scale-[1.01]' 
                    : plan.color === 'blue'
                      ? 'bg-white/[0.01] border-blue-900/30 hover:border-blue-500/50 hover:scale-[1.01]'
                      : plan.color === 'yellow'
                        ? 'bg-white/[0.01] border-yellow-905/30 hover:border-yellow-500/50 hover:scale-[1.01]'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:scale-[1.01]'}
                `}
              >
                {plan.popular && (
                  <>
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-purple-500/20 flex items-center gap-1 select-none">
                      <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                      <span>{t.popular_plan || "Most Popular"}</span>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                  </>
                )}
                
                <h3 className={`text-base font-black uppercase tracking-wider mb-2 select-none ${
                  plan.color === 'blue' ? 'text-blue-400' : 
                  plan.color === 'purple' ? 'text-purple-400' : 
                  plan.color === 'yellow' ? 'text-yellow-400' : 'text-zinc-400'
                }`}>
                  {plan.name}
                </h3>
                <div className="text-4xl font-extrabold mb-1 tracking-tighter select-none" dir="ltr">{plan.price}</div>
                <div className="text-[10px] text-zinc-500 mb-8 lowercase font-medium select-none">/ {t.per_month_label || "per month"}</div>
                
                <div className="space-y-4 mb-10 flex-1 select-none">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 select-none">
                      <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${
                        plan.color === 'blue' ? 'text-blue-400' : 
                        plan.color === 'purple' ? 'text-purple-400' : 
                        plan.color === 'yellow' ? 'text-yellow-400' : 'text-zinc-500'
                      }`} />
                      <span className="text-xs font-medium text-zinc-350 text-zinc-300 leading-normal select-none">{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={signIn}
                  className={`
                    w-full py-4 rounded-[1.25rem] font-bold text-xs tracking-wider uppercase transition-all duration-350 active:scale-95 cursor-pointer select-none
                    ${plan.color === 'blue' 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-505 shadow-xl shadow-blue-500/15 animate-shimmer' 
                        : plan.color === 'purple'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-505 shadow-xl shadow-purple-500/15 animate-shimmer'
                          : plan.color === 'yellow'
                            ? 'bg-yellow-500 text-black hover:bg-yellow-405 shadow-xl shadow-yellow-500/10 hover:shadow-yellow-500/20'
                            : 'bg-white text-black hover:bg-zinc-200'
                    }
                  `}
                >
                  {t.landing_cta || "Get Started"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Styled Footer and Language Switcher */}
      <footer className="py-20 px-6 border-t border-white/10 bg-[#070A11] relative select-none">
        <div className="max-w-7xl mx-auto space-y-16">
          
          {/* Main Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 text-zinc-400">
            
            {/* Branding Column */}
            <div className="lg:col-span-2 space-y-6 text-right md:text-right select-none" dir={isRtl ? "rtl" : "ltr"}>
              <div className="flex items-center gap-2.5 select-none" dir="ltr">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800/40 border border-zinc-700/50 flex items-center justify-center p-0 shrink-0 select-none">
                  <Logo className="w-full h-full rounded-full select-none" />
                </div>
                <span className="font-bold text-white tracking-tight flex flex-col leading-none select-none text-left">
                  <span className="text-lg select-none">Smarty<span className="inline-block bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent font-extrabold select-none">Ai</span></span>
                  <span className="text-[10px] text-zinc-400 tracking-wider uppercase mt-0.5 select-none font-mono">Order</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-sm select-none">
                {lang === "ar" 
                  ? "المؤسسة الجزائرية الأذكى لأتمتة التجارة الإلكترونية، تفكيك محادثات السحب التلقائي، والربط اللوجستي الفوري بكبسة زر."
                  : lang === "fr"
                  ? "La plateforme algérienne la plus intelligente pour l'automatisation du e-commerce, l'extraction de discussions informelles et la synchronisation logistique locale."
                  : "The smartest Algerian platform for e-commerce automation, unstructured chat extraction, and immediate local logistics synchronization."}
              </p>
              
              <div className="pt-2">
                <span className="text-[9px] uppercase tracking-wider text-zinc-605 text-zinc-500 block mb-2 select-none">{t.select_lang_placeholder || "Select Platform Language"}</span>
                <div className="inline-flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-850 select-none">
                  {[
                    { code: 'ar', label: 'العربية' },
                    { code: 'fr', label: 'Français' },
                    { code: 'en', label: 'English' }
                  ].map((l) => (
                    <button 
                      key={l.code} 
                      onClick={() => setLang(l.code as any)} 
                      className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer select-none ${lang === l.code ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-500 hover:text-zinc-350'}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 text-xs text-zinc-500">
                {t.contact_support_prefix || "Contact & Support: "}
                <a href="mailto:smarty@smartyai.net" className="text-blue-400 hover:text-blue-300 transition-all font-mono font-medium">smarty@smartyai.net</a>
              </div>
            </div>

            {/* Links Columns */}
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {[
                {
                  title: t.footer_platform_services,
                  links: [
                    { 
                      label: t.footer_platform, 
                      action: () => scrollToSection("hero") 
                    },
                    { 
                      label: t.footer_capabilities, 
                      action: () => scrollToSection("capabilities") 
                    },
                    { 
                      label: t.footer_logistics, 
                      action: () => scrollToSection("logistics") 
                    },
                  ]
                },
                {
                  title: t.footer_investment_plans,
                  links: [
                    { 
                      label: t.footer_investment_plans, 
                      action: () => scrollToSection("pricing") 
                    },
                    { 
                      label: t.footer_sign_in, 
                      action: signIn 
                    },
                    { 
                      label: t.footer_sign_up, 
                      action: signIn 
                    },
                  ]
                },
                {
                  title: t.footer_company_about,
                  links: [
                    { 
                      label: t.footer_company_about, 
                      action: () => setShowAboutModal(true) 
                    },
                    { 
                      label: t.footer_faq, 
                      action: () => scrollToSection("faq") 
                    },
                    { 
                      label: t.footer_tech_support, 
                      action: () => setShowSupportModal(true) 
                    },
                  ]
                },
                {
                  title: t.footer_compliance_support,
                  links: [
                    { 
                      label: t.footer_compliance_support, 
                      action: () => setShowComplianceModal(true) 
                    },
                    { 
                      label: t.footer_terms_use, 
                      action: () => setScreen?.("terms") 
                    },
                    { 
                      label: t.footer_privacy_policy, 
                      action: () => setScreen?.("privacy") 
                    },
                  ]
                }
              ].map((section, idx) => (
                <div key={idx} className="space-y-4 text-start" dir={isRtl ? "rtl" : "ltr"}>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-300 border-b border-white/[0.05] pb-2 text-start">
                    {section.title}
                  </h4>
                  <ul className="space-y-2">
                    {section.links.map((link, lIdx) => (
                      <li key={lIdx}>
                        <button
                          onClick={link.action}
                          className="text-zinc-400 hover:text-white transition-colors text-xs cursor-pointer text-start flex items-start justify-start w-full gap-1 p-0.5"
                        >
                          <span className="whitespace-normal break-words text-start leading-relaxed">{link.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

          </div>
          
          {/* Copyright Bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-widest text-[#52525b] text-center md:text-right" dir={isRtl ? "rtl" : "ltr"}>
            <div>SmartyAi Order &copy; 2026 • Made for Algerian E-Commerce Excellence</div>
            <div className="flex bg-zinc-950/20 px-3 py-1 rounded-full border border-zinc-900 text-[9px] text-[#52525b]/80 gap-1.5 justify-center items-center">
              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
              <span>v4.1.0</span>
            </div>
          </div>

        </div>
      </footer>

      {/* Modals & Guides */}
      <AnimatePresence>
        {/* PWA Installation Instructions Modal */}
        {showGuide && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0e1321] border border-white/10 rounded-[2.5rem] p-6 max-w-lg w-full relative space-y-6 shadow-2xl text-zinc-200"
              dir={isRtl ? "rtl" : "ltr"}
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowGuide(false)} 
                className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-white`}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3" dir="ltr">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white border border-purple-500/20 shrink-0 shadow-lg shadow-purple-500/20 select-none">
                  <Download className="w-5 h-5 select-none" />
                </div>
                <div className="text-left select-none">
                  <h3 className="text-xl font-bold tracking-tight text-white select-none">{t.pwa_install_guide}</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5 select-none" dir="ltr">
                    Smarty<span className="inline-block bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent font-extrabold select-none">Ai</span> <span className="text-[8px] opacity-80 uppercase font-bold select-none">Order</span> Premium App
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Method 1: Safari / iOS */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2" dir={isRtl ? "rtl" : "ltr"}>
                    <span className="text-xs font-bold px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded border border-purple-500/10">iOS</span>
                    <h4 className="text-sm font-bold text-zinc-200">Apple Safari</h4>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-2 leading-relaxed" dir={isRtl ? "rtl" : "ltr"}>
                    <li>
                      {lang === "ar" 
                        ? "اضغط على زر المشاركة في متصفح سفاري (أيقونة المربع مع السهم للأعلى)." 
                        : lang === "fr"
                        ? "Appuyez sur le bouton de Partage dans Safari (l'icône de carré avec une flèche vers le haut)."
                        : "Tap the Share button in the Safari browser (the square icon with an arrow pointing up)."}
                    </li>
                    <li>
                      {lang === "ar" 
                        ? "قم بالتمرير للأسفل واختر (إضافة إلى الصفحة الرئيسية)." 
                        : lang === "fr"
                        ? "Faites défiler vers le bas et sélectionnez 'Sur l'écran d'accueil'."
                        : "Scroll down and select 'Add to Home Screen'."}
                    </li>
                    <li>
                      {lang === "ar" 
                        ? "اضغط (إضافة) لتثبيت التطبيق على جهازك." 
                        : lang === "fr"
                        ? "Appuyez sur 'Ajouter' pour installer l'application sur votre appareil."
                        : "Tap 'Add' to install the app on your device."}
                    </li>
                  </ol>
                </div>

                {/* Method 2: Android / Chrome / Edge */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2" dir={isRtl ? "rtl" : "ltr"}>
                    <span className="text-xs font-bold px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/10">Android / PC</span>
                    <h4 className="text-sm font-bold text-zinc-200">Google Chrome & Edge</h4>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-2 leading-relaxed" dir={isRtl ? "rtl" : "ltr"}>
                    <li>
                      {lang === "ar" 
                        ? "اضغط على زر الخيارات (النقاط الثلاث) في أعلى أو أسفل المتصفح." 
                        : lang === "fr"
                        ? "Appuyez sur le bouton de menu (les trois points) en haut ou en bas de votre navigateur."
                        : "Tap the three dots menu button at the top/bottom of your browser."}
                    </li>
                    <li>
                      {lang === "ar" 
                        ? "اختر (تثبيت التطبيق) أو (إضافة إلى الشاشة الرئيسية)." 
                        : lang === "fr"
                        ? "Sélectionnez 'Installer l'application' ou 'Ajouter à l'écran d'accueil' dans la liste."
                        : "Select 'Install App' or 'Add to Home Screen' from the menu list."}
                    </li>
                    <li>
                      {lang === "ar" 
                        ? "إذا كنت تستخدم الكمبيوتر، يمكنك الضغط على أيقونة التنزيل التي تظهر مباشرة في شريط العناوين بالمتصفح."
                        : lang === "fr"
                        ? "Sur ordinateur, cliquez sur l'icône d'installation directement dans la barre d'adresse de votre navigateur."
                        : "On desktop, click on the install/download icon directly in your browser's address bar."}
                    </li>
                  </ol>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs text-zinc-500" dir={isRtl ? "rtl" : "ltr"}>
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
                  <span className="text-[11px] text-zinc-550 text-zinc-500">{t.pwa_lightweight || "Very lightweight, fast, no updates required"}</span>
                </div>
                <button 
                  onClick={() => setShowGuide(false)}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-850 rounded-xl hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-all text-zinc-300 font-bold cursor-pointer"
                >
                  {t.got_it_btn || "Got it"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 1. About Modal */}
        {showAboutModal && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0e1321] border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full relative space-y-6 shadow-2xl text-zinc-200"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <button 
                onClick={() => setShowAboutModal(false)} 
                className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-white`}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3" dir="ltr">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white border border-purple-500/20 shrink-0 shadow-lg shadow-purple-500/20 select-none">
                  <Logo className="w-full h-full rounded-full select-none" />
                </div>
                <div className="text-left select-none">
                  <h3 className="text-xl font-bold tracking-tight text-white select-none">
                    {lang === "ar" ? "عن المؤسسة" : lang === "fr" ? "À Propos de l'Entreprise" : "About the Company"}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5 select-none" dir="ltr">SmartyAi Algerian Tech</p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-zinc-300">
                <p>
                  {lang === "ar"
                    ? "SmartyAi هي مؤسسة جزائرية رائدة متخصصة في تطوير حلول الذكاء الاصطناعي المبتكرة لقطاع التجارة الإلكترونية والخدمات اللوجستية في الجزائر. تهدف المؤسسة إلى تمكين التجار الجزائريين من أتمتة عملياتهم، خفض التكاليف التشغيلية، ومزامنة بيانات الشحنات بكفاءة تامة تتماشى مع معايير السوق المحلية."
                    : lang === "fr"
                      ? "SmartyAi est une entreprise algérienne de premier plan spécialisée dans le développement de solutions d'intelligence artificielle innovantes pour le secteur du commerce électronique et de la logistique en Algérie. L'entreprise vise à permettre aux commerçants algériens d'automatiser leurs opérations, de réduire leurs coûts opérationnels et de synchroniser les données d'expédition avec une efficacité totale conforme aux normes du marché local."
                      : "SmartyAi is a leading Algerian enterprise specializing in the development of innovative Artificial Intelligence solutions for the e-commerce and logistics sector in Algeria. The company aims to empower Algerian merchants by automating their operations, reducing operational costs, and synchronizing shipment data with absolute efficiency that aligns with local market standards."}
                </p>
                <p className="text-zinc-400">
                  {lang === "ar"
                    ? "تأسست لحل مشاكل تجميع العناوين يدوياً وتوحيد الفهرسة الجغرافية لمختلف دوائر وبلديات الجزائر الـ 68."
                    : lang === "fr"
                      ? "Elle a été fondée pour résoudre les problèmes de collecte manuelle des adresses et d'unification de l'indexation géographique parmi les différentes communes et daïras des 68 wilayas d'Algérie."
                      : "It was founded to solve manual address normalization challenges and consolidate geographical indexing across all districts and municipalities of the 68 Algerian wilayas."}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => setShowAboutModal(false)}
                  className="px-6 py-2.5 bg-zinc-900 border border-zinc-850 rounded-xl hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-all text-zinc-300 font-bold cursor-pointer"
                >
                  {t.got_it_btn || "Got it"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 2. Compliance Modal */}
        {showComplianceModal && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm shadow-2xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0e1321] border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full relative space-y-6 shadow-2xl text-zinc-200"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <button 
                onClick={() => setShowComplianceModal(false)} 
                className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-white`}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">{t.compliance_modal_title || "Compliance & Standards"}</h3>
                  <p className="text-[10px] text-zinc-550 text-zinc-500 font-mono mt-0.5">Secure National Integration</p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-zinc-300 font-medium">
                <p>
                  {lang === 'ar' 
                    ? "نلتزم في SmartyAi بالامتثال الكامل للتشريعات والقوانين الوطنية للتجارة الإلكترونية وحماية المعطيات ذات الطابع الشخصي في الجمهورية الجزائرية الديمقراطية الشعبية. نضمن تأمين وحفظ بيانات عملائكم، وتقديم بروتوكولات آمنة بالكامل للربط مع المنصات الشريكة وشركات التوصيل المعتمدة."
                    : lang === 'fr'
                    ? "SmartyAi se conforme pleinement à la législation algérienne sur le commerce électronique (Loi 18-05) et la protection des données à caractère personnel. Nous assurons une sécurité maximale des bases de données avec des protocoles API cryptés modernes."
                    : "SmartyAi completely complies with Algerian national framework legislations on E-Commerce operations (Law 18-05) and personal data protection. We ensure maximum database security with modern encrypted API protocols interfacing with national courier gateways and payment structures like Chargily."}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => setShowComplianceModal(false)}
                  className="px-6 py-2.5 bg-zinc-900 border border-zinc-850 rounded-xl hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-all text-zinc-300 font-bold cursor-pointer"
                >
                  {t.got_it_btn || "Got it"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 3. Technical Support Modal */}
        {showSupportModal && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0e1321] border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full relative space-y-6 shadow-2xl text-zinc-200"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <button 
                onClick={() => {
                  setShowSupportModal(false);
                }} 
                className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-white`}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400 shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">{t.support_title || "Technical Support"}</h3>
                  <p className="text-[10px] text-zinc-550 text-zinc-500 font-mono mt-0.5">24/7 Developer Helpdesk Bureau</p>
                </div>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-zinc-300">
                <p>
                  {lang === 'ar' 
                    ? "فريق الدعم المخصص في خدمتكم للإجابة على جميع الاستفسارات وحل المشاكل التقنية."
                    : lang === 'fr'
                    ? "Notre équipe d'assistance technique professionnelle est disponible pour répondre à toutes vos demandes."
                    : "Our professional technical support staff is available around the clock to answer your queries."}
                </p>

                {/* Contact Form storing to Firestore */}
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!supportName.trim() || !supportEmail.trim() || !supportMessage.trim()) return;
                    setIsSubmittingSupport(true);
                    try {
                      await addDoc(collection(db, "support_messages"), {
                        name: supportName.trim(),
                        email: supportEmail.trim(),
                        message: supportMessage.trim(),
                        attachment: supportAttachment || null,
                        createdAt: serverTimestamp()
                      });
                      setShowSupportModal(false);
                      setSupportName("");
                      setSupportEmail("");
                      setSupportMessage("");
                      setSupportAttachment("");
                      alert(t.support_success || "Support ticket sent successfully!");
                    } catch (err) {
                      console.error("Support submission failed:", err);
                      try {
                        handleFirestoreError(err, OperationType.CREATE, "support_messages");
                      } catch (formattedError: any) {
                        alert(t.support_error || "Error: Unable to send support message.");
                      }
                    } finally {
                      setIsSubmittingSupport(false);
                    }
                  }}
                  className="space-y-3 pt-2"
                >
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1 font-bold">{t.support_name_label || "Full Name"}</label>
                    <input 
                      required 
                      type="text" 
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                      placeholder={isRtl ? "كمال أحمد" : "John Doe"} 
                      className="w-full bg-black/40 border border-zinc-850 p-3 rounded-xl text-xs outline-none focus:border-blue-500 text-zinc-350"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1 font-bold">{t.support_email_label || "Email Address"}</label>
                    <input 
                      required 
                      type="email" 
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="user@domain.com" 
                      className="w-full bg-black/40 border border-zinc-850 p-3 rounded-xl text-xs outline-none focus:border-blue-500 text-zinc-350"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1 font-bold">{t.support_message_label || "Your Message"}</label>
                    <textarea 
                      required 
                      rows={3}
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder={t.support_write_query || "Write your query here..."} 
                      className="w-full bg-black/40 border border-zinc-850 p-3 rounded-xl text-xs outline-none focus:border-blue-500 text-zinc-350 resize-none font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1 font-bold">
                      {t.support_attach_image || "Attach Image (Optional)"}
                    </label>
                    <div className="flex flex-col gap-2">
                      <div className="relative flex items-center justify-center border border-dashed border-zinc-800 rounded-xl p-4 bg-black/20 hover:border-zinc-700 transition-all cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSupportImageChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Paperclip className="w-4 h-4 text-blue-400" />
                          <span className="text-xs">
                            {t.support_click_select || "Click to select a dynamic screenshot / photo"}
                          </span>
                        </div>
                      </div>

                      {supportAttachment && (
                        <div className="relative border border-zinc-800 rounded-xl p-2 bg-black/40 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={supportAttachment}
                              alt="Attachment preview"
                              className="w-12 h-12 rounded-lg object-cover border border-zinc-800"
                            />
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {t.support_img_loaded || "Image loaded successfully"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSupportAttachment("")}
                            className="p-1 px-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/25 rounded-lg text-[10px] font-bold transition-all"
                          >
                            {t.support_remove || "Remove"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmittingSupport}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-505 hover:to-indigo-505 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmittingSupport ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t.support_sending || "Sending..."}</span>
                      </>
                    ) : (
                      t.support_submit || "Submit Ticket"
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
