import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Cpu, Shield, Truck, Activity, CheckCircle, Download, X, Info } from "lucide-react";
import { Logo, FeatureCard } from "./CommonUI";
import { Language } from "../lib/translations";
import { signInWithPopup } from 'firebase/auth'; // 1. استيراد نافذة المصادقة من حزمة الفايربيس الأساسية
import { auth, googleProvider } from '../lib/firebase'; // 2. استيراد المتغيرات المهيأة من ملفك الصحيح

export default function LandingPage({ lang, setLang, signIn, t, isRtl }: { lang: Language, setLang: (l: Language) => void, signIn: () => void, t: any, isRtl: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

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

  // دالة مخصصة للتعامل مع تسجيل الدخول المنبثق لحساب جوجل المربوط بـ Gemini Project
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("👋 تم تسجيل الدخول بنجاح للمستخدم:", result.user.displayName);
      // بعد نجاح الدخول، نقوم باستدعاء دالة تحديث حالة التطبيق الممررة من الـ App.tsx
      signIn(); 
    } catch (error) {
      console.error("❌ حدث خطأ أثناء عملية الدخول عبر جوجل:", error);
    }
  };

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

  const plans = [
    {
      id: "free",
      name: t.plan_free_name,
      price: "0 DA",
      features: [
        t.feature_orders_30,
        t.feature_basic_extraction,
        t.feature_community_support,
      ],
      color: "zinc"
    },
    {
      id: "pro",
      name: t.plan_pro_name,
      price: "700 DA",
      features: [
        t.feature_orders_350,
        t.feature_faster_extraction,
        t.feature_yalidine_integration,
        t.feature_email_support,
      ],
      color: "blue",
      popular: true
    },
    {
      id: "unlimited",
      name: t.plan_unlimited_name,
      price: "2000 DA",
      features: [
        t.feature_orders_unlimited,
        t.feature_full_couriers,
        t.feature_priority_support,
        t.feature_api_access,
      ],
      color: "yellow"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden" dir={isRtl ? "rtl" : "ltr"}>
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden crystal-button p-1 flex items-center justify-center">
              <Logo className="w-full h-full text-blue-400" />
            </div>
            <span className="text-xl font-bold tracking-tight glow-text">SmartyAi Order</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {/* تحديث الحدث ليقوم بالدخول الفعلي عبر جوجل */}
            <button onClick={handleGoogleSignIn} className="px-5 py-2 bg-white text-black rounded-xl font-bold text-sm tracking-tight hover:scale-105 transition-all active:scale-95">{t.login_button}</button>
          </div>
        </div>
      </nav>
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-[1.2] max-w-4xl mx-auto">{t.landing_hero_title}</motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">{t.landing_hero_subtitle}</motion.p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xs sm:max-w-xl mx-auto pt-4">
            {/* تحديث زر الـ CTA البداية السريعة ليطلق نافذة جوجل */}
            <button 
              onClick={handleGoogleSignIn} 
              className="w-full sm:w-auto px-8 py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
            >
              <Zap className="w-6 h-6" /> 
              <span>{t.landing_cta}</span>
            </button>
            
            {!installed && (
              <button 
                onClick={handleInstallClick} 
                className="w-full sm:w-auto px-8 py-5 rounded-2xl font-bold text-lg hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white"
              >
                <Download className="w-6 h-6 text-blue-400" /> 
                <span>{t.pwa_install_btn}</span>
              </button>
            )}
          </div>
          
          <div className="pt-20">
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-8">Integrated with Algerian Logistics Leaders</p>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
              {['Yalidine', 'ZR Express', 'Nord Express', 'Sud Express', 'Procolis', 'Maystro', 'Ecotrack', 'Anderson'].map(name => (
                <span key={name} className="text-xl font-black italic tracking-tighter hover:text-blue-400 transition-colors">{name}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="py-20 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard icon={<Cpu className="w-6 h-6 text-blue-400" />} title={t.landing_feature_1_title} desc={t.landing_feature_1_desc} />
          <FeatureCard icon={<Shield className="w-6 h-6 text-red-500" />} title={t.landing_feature_2_title} desc={t.landing_feature_2_desc} />
          <FeatureCard icon={<Truck className="w-6 h-6 text-green-400" />} title={t.landing_feature_3_title} desc={t.landing_feature_3_desc} />
          <FeatureCard icon={<Activity className="w-6 h-6 text-yellow-400" />} title={t.landing_feature_4_title} desc={t.landing_feature_4_desc} />
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{t.sub_upgrade || "Upgrade Plans"}</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">{t.landing_pricing_subtitle || "Choose the best plan for your business."}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`
                  relative p-8 rounded-[2.5rem] border transition-all flex flex-col
                  ${plan.popular ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.1)] ring-1 ring-blue-500/50' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                    {t.popular_badge || "Most Popular"}
                  </div>
                )}
                
                <h3 className={`text-xl font-bold mb-1 tracking-tight ${plan.color === 'blue' ? 'text-blue-400' : plan.color === 'yellow' ? 'text-yellow-400' : 'text-zinc-400'}`}>
                  {plan.name}
                </h3>
                <div className="text-5xl font-bold mb-8 tracking-tighter" dir="ltr">{plan.price}</div>
                
                <div className="space-y-4 mb-12 flex-1">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle className={`w-5 h-5 mt-0.5 shrink-0 ${plan.color === 'blue' ? 'text-blue-400' : plan.color === 'yellow' ? 'text-yellow-400' : 'text-zinc-400'}`} />
                      <span className="text-sm font-medium opacity-80">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* تحديث أزرار الباقات لتقوم بتسجيل الدخول الفوري وبدء الخدمة */}
                <button 
                  onClick={handleGoogleSignIn}
                  className={`
                    w-full py-5 rounded-[1.5rem] font-bold transition-all active:scale-95
                    ${plan.color === 'blue' 
                        ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-500/20' 
                        : plan.color === 'yellow'
                          ? 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-xl shadow-yellow-500/10'
                          : 'bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/5'
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

      <footer className="py-20 px-6 border-t border-white/10 text-center space-y-8">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center gap-2">
             <Logo className="w-6 h-6 text-zinc-500" />
             <span className="font-bold text-zinc-500 tracking-tight">SmartyAi Order</span>
          </div>
          
          <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800">
            {[
              { code: 'ar', label: 'العربية' },
              { code: 'fr', label: 'Français' },
              { code: 'en', label: 'English' }
            ].map((l) => (
              <button 
                key={l.code} 
                onClick={() => setLang(l.code as any)} 
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${lang === l.code ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        
        <p className="text-[10px] uppercase tracking-widest text-zinc-600">SmartyAi Order • {t.landing_footer_payments} &copy; 2026</p>
      </footer>

      {/* PWA Installation Instructions Modal */}
      <AnimatePresence>
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

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">{t.pwa_install_guide}</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">SmartyAi Order Premium App</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Method 1: Safari / iOS */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3 text-right">
                  <div className="flex items-center gap-2" dir={isRtl ? "rtl" : "ltr"}>
                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded border border-blue-500/10">iOS</span>
                    <h4 className="text-sm font-bold text-zinc-200">Apple Safari</h4>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-zinc-450 space-y-2 leading-relaxed" dir={isRtl ? "rtl" : "ltr"}>
                    <li>
                      {isRtl 
                        ? "اضغط على زر المشاركة في متصفح سفاري (أيقونة المربع مع السهم للأعلى)." 
                        : "Tap the Share button in the Safari browser (the square icon with an arrow pointing up)."}
                    </li>
                    <li>
                      {isRtl 
                        ? "قم بالتمرير للأسفل واختر (إضافة إلى الصفحة الرئيسية)." 
                        : "Scroll down and select 'Add to Home Screen'."}
                    </li>
                    <li>
                      {isRtl 
                        ? "اضغط (إضافة) لتثبيت التطبيق على جهازك." 
                        : "Tap 'Add' to install the app on your device."}
                    </li>
                  </ol>
                </div>

                {/* Method 2: Android / Chrome / Edge */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3 text-right">
                  <div className="flex items-center gap-2" dir={isRtl ? "rtl" : "ltr"}>
                    <span className="text-xs font-bold px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/10">Android / PC</span>
                    <h4 className="text-sm font-bold text-zinc-200">Google Chrome & Edge</h4>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-zinc-450 space-y-2 leading-relaxed" dir={isRtl ? "rtl" : "ltr"}>
                    <li>
                      {isRtl 
                        ? "اضغط على زر الخيارات (النقاط الثلاث) في أعلى أو أسفل المتصفح." 
                        : "Tap the three dots menu button at the top/bottom of your browser."}
                    </li>
                    <li>
                      {isRtl 
                        ? "اختر (تثبيت التطبيق) أو (إضافة إلى الشاشة الرئيسية)." 
                        : "Select 'Install App' or 'Add to Home Screen' from the menu list."}
                    </li>
                    <li>
                      {isRtl 
                        ? "إذا كنت تستخدم الكمبيوتر، يمكنك الضغط على أيقونة التنزيل التي تظهر مباشرة في شريط العناوين بالمتصفح."
                        : "On desktop, click on the install/download icon directly in your browser's address bar."}
                    </li>
                  </ol>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs text-zinc-500" dir={isRtl ? "rtl" : "ltr"}>
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
                  <span className="text-[11px] text-zinc-500">{isRtl ? "تثبيت خفيف وسريع ولا يحتاج تحديث" : "Very lightweight, fast, no updates required"}</span>
                </div>
                <button 
                  onClick={() => setShowGuide(false)}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-850 hover:text-white hover:border-zinc-700 transition-all text-zinc-300 font-bold cursor-pointer"
                >
                  {isRtl ? "موافق" : "Got it"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}