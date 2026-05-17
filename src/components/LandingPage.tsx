import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Image as ImageIcon, Globe, MessageSquare, Shield, Rocket, ArrowRight, LogIn, Tent, Compass, Sun, Map, Download, Loader2, Eye } from 'lucide-react';
import { SmartyLogo } from './SmartyLogo';
import Pricing from './Pricing';

interface LandingPageProps {
  onLogin: () => void;
  onGuestLogin?: () => void; // إضافة دالة الضيف
  isLoggingIn?: boolean;
  lang: string;
  isDarkMode: boolean;
  onInstall?: () => void;
  showInstall?: boolean;
  onLanguageChange: (lang: 'ar' | 'en' | 'fr') => void;
}

export default function LandingPage({ onLogin, onGuestLogin, isLoggingIn, lang, isDarkMode, onInstall, showInstall, onLanguageChange }: LandingPageProps) {
  const t = {
    ar: {
      heroTitle: "حوّل أي فكرة أو منتج إلى حملة تسويقية جاهزة خلال دقائق بالذكاء الاصطناعي",
      heroSubtitle: "أرسل صورة منتجك أو تحدث مع Smarty AI... وسيحوّلها تلقائيًا إلى صور احترافية، إعلانات تسويقية جاهزة، وتحليل سوق كامل داخل دردشة واحدة.",
      cta: "جرّبه مجانًا الآن",
      guestMode: "تجربة بدون تسجيل",
      trustText: "لا تحتاج خبرة في التصميم أو التسويق. فقط اطلب ذلك من الذكاء الاصطناعي.",
      features: "مجرد سطر... والباقي يحدث تلقائيًا",
      pricing: "باقات التجار",
      login: "تسجيل الدخول",
      install: "تحميل التطبيق",
      footer: "© 2026 Smarty AI.",
      whyTitle: "لماذا Smarty AI؟",
      whyList: [
        "كل شيء داخل دردشة واحدة",
        "نتائج خلال ثوانٍ",
        "سهل لأي صاحب مشروع",
        "لا تحتاج خبرة تقنية",
        "مدعوم بأحدث تقنيات الذكاء الاصطناعي"
      ],
      finalCtaTitle: "جاهز لتنطلق؟",
      finalCtaSubtitle: "انضم إلى آلاف التجار الذين يثقون في Smarty AI لتحويل أفكارهم إلى حملات تسويقية ناجحة.",
      finalCtaButtons: "ابدأ رحلتك الآن",
      featureList: [
        { title: "🎨 تصميم منتجات احترافي", desc: "أرسل صورة عادية من هاتفك، واحصل على صور استوديو احترافية جاهزة للإعلانات والمتاجر الإلكترونية.", icon: ImageIcon },
        { title: "✍️ كتابة إعلانات تزيد المبيعات", desc: "احصل على عناوين جذابة، منشورات تسويقية، وسيناريوهات إعلانية مكتوبة بالذكاء الاصطناعي خلال ثوانٍ.", icon: Sparkles },
        { title: "📈 تحليل سوق ذكي", desc: "اكتشف المنتجات الرائجة، المنافسين، واتجاهات السوق قبل أن تبدأ البيع.", icon: Map },
        { title: "🤖 مساعد أعمال متكامل", desc: "بدل استخدام عشرات الأدوات… Smarty AI يجمع التصميم، التسويق، والتحليل في مكان واحد.", icon: Shield }
      ],
      interactiveTitle: "شاهد كيف يعمل",
      interactivePrompt: "حوّل هذه الصورة إلى إعلان احترافي لفيسبوك مع وصف تسويقي جذاب",
      interactiveResponse: ["صورة منتج احترافية", "عنوان إعلاني قوي", "وصف تسويقي جاهز", "اقتراح جمهور مستهدف"]
    },
    en: {
      heroTitle: "Turn Any Idea or Product into a Ready-to-Launch Marketing Campaign in Minutes with AI",
      heroSubtitle: "Send a product photo or talk to Smarty AI... and it will automatically transform it into professional shots, ready-to-use ads, and full market analysis inside a single chat.",
      cta: "Try it free now",
      guestMode: "Try without signing in",
      trustText: "No design or marketing experience needed. Just talk to AI.",
      features: "Just a Chat... and the rest happens automatically",
      pricing: "Merchant Plans",
      login: "Login",
      install: "Install App",
      footer: "© 2026 Smarty AI.",
      whyTitle: "Why Smarty AI?",
      whyList: [
        "Everything inside one chat",
        "Results in seconds",
        "Easy for any business owner",
        "No technical experience needed",
        "Powered by cutting-edge AI"
      ],
      finalCtaTitle: "Ready to Launch?",
      finalCtaSubtitle: "Join thousands of merchants who trust Smarty AI to turn their ideas into successful marketing campaigns.",
      finalCtaButtons: "Start Your Journey Now",
      featureList: [
        { title: "🎨 Pro Product Design", desc: "Send a normal photo from your phone and get studio-quality shots ready for ads and e-shops.", icon: ImageIcon },
        { title: "✍️ Ad Copy that Sells", desc: "Get catchy headlines, marketing posts, and ad scripts written by AI in seconds.", icon: Sparkles },
        { title: "📈 Smart Market Analysis", desc: "Discover trending products, competitors, and market trends before you start selling.", icon: Map },
        { title: "🤖 All-in-One Business Assistant", desc: "Instead of using dozens of tools... Smarty AI combines design, marketing, and analysis in one place.", icon: Shield }
      ],
      interactiveTitle: "See It in Action",
      interactivePrompt: "Turn this image into a professional Facebook ad with an engaging marketing description",
      interactiveResponse: ["Professional product shot", "Strong ad headline", "Ready-to-use marketing copy", "Target audience suggestion"]
    },
    fr: {
      heroTitle: "Transformez n'importe quelle idée ou produit en campagne marketing prête en quelques minutes grâce à l'IA",
      heroSubtitle: "Envoyez une photo de produit ou parlez à Smarty AI... et il la transformera automatiquement en clichés pro, publicités prêtes à l'emploi et analyse de marché complète dans un seul chat.",
      cta: "Essayez gratuitement",
      guestMode: "Essayer sans inscription",
      trustText: "Aucune expérience en design ou marketing requise. Parlez simplement à l'IA.",
      features: "Une simple discussion... et le reste se fait automatiquement",
      pricing: "Forfaits Marchands",
      login: "Connexion",
      install: "Installer l'App",
      footer: "© 2026 Smarty AI.",
      whyTitle: "Pourquoi Smarty AI ?",
      whyList: [
        "Tout dans une seule discussion",
        "Résultats en quelques secondes",
        "Facile pour tout entrepreneur",
        "Aucune expertise technique requise",
        "Propulsé par l'IA de pointe"
      ],
      finalCtaTitle: "Prêt à Démarrer ?",
      finalCtaSubtitle: "Rejoignez des milliers de marchands qui font confiance à Smarty AI pour transformer leurs idées en campagnes marketing réussies.",
      finalCtaButtons: "Commencez Maintenant",
      featureList: [
        { title: "🎨 Design Produit Pro", desc: "Envoyez une photo simple de votre téléphone et obtenez des clichés de studio prêts pour vos pubs et e-boutiques.", icon: ImageIcon },
        { title: "✍️ Rédaction Publicitaire", desc: "Obtenez des titres accrocheurs, des posts marketing et des scripts publicitaires écrits par l'IA en quelques secondes.", icon: Sparkles },
        { title: "📈 Analyse de Marché", desc: "Découvrez les produits tendances, les concurrents et les tendances du marché avant de commencer à vendre.", icon: Map },
        { title: "🤖 Assistant Business", desc: "Au lieu d'utiliser des dizaines d'outils... Smarty AI réunit design, marketing et analyse en un seul endroit.", icon: Shield }
      ],
      interactiveTitle: "Voir en Action",
      interactivePrompt: "Transformez cette image en une publicité Facebook professionnelle avec une description marketing engageante",
      interactiveResponse: ["Photo de produit pro", "Titre publicitaire fort", "Copie marketing prête à l'emploi", "Suggestion d'audience cible"]
    }
  }[lang];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0d0f12] text-white' : 'bg-white text-slate-900'} ${lang === 'ar' ? 'font-sans' : ''}`} dir="rtl">
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 backdrop-blur-md border-b ${isDarkMode ? 'bg-[#13161c]/80 border-white/[0.07]' : 'bg-white/80 border-slate-100'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SmartyLogo size={32} />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 mr-4">
              {['ar', 'en', 'fr'].map((l) => (
                <button
                  key={l}
                  onClick={() => onLanguageChange(l as any)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    lang === l 
                      ? 'bg-orange-500 text-white' 
                      : `text-slate-500 hover:text-orange-500 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <button 
              onClick={onLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              <span className="select-none">{t.login}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-20 px-4 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-4xl md:text-6xl font-black mb-6 max-w-4xl mx-auto leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
        >
          {t.heroTitle}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto mb-10"
        >
          {t.heroSubtitle}
        </motion.p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={onLogin}
            disabled={isLoggingIn}
            className="flex items-center justify-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:bg-orange-600 hover:scale-105 shadow-xl shadow-orange-500/20 btn-shine active:scale-95 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? <Loader2 size={20} className="animate-spin" /> : <><span className="select-none">{t.cta}</span><ArrowRight size={20} /></>}
          </motion.button>

          {onGuestLogin && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              onClick={onGuestLogin}
              className={`flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg transition-all border ${isDarkMode ? 'bg-white/[0.04] border-white/[0.07] text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Eye size={20} />
              <span className="select-none">{t.guestMode}</span>
            </motion.button>
          )}
          
          {showInstall && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              onClick={onInstall}
              className={`flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg transition-all border ${isDarkMode ? 'bg-white/[0.04] border-white/[0.07] text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Download size={20} />
              <span className="select-none">{t.install}</span>
            </motion.button>
          )}
        </div>
      </header>

      {/* Features Grid */}
      <section className={`py-20 px-4 ${isDarkMode ? 'bg-white/[0.025]' : 'bg-slate-50'}`}>
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">{t.features}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {t.featureList.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-6 rounded-2xl border transition-all hover:shadow-xl card-hover ${isDarkMode ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-slate-100 shadow-sm'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-orange-50'}`}>
                  <feature.icon className="text-orange-500" size={24} />
                </div>
                <h3 className="font-bold text-xl mb-2">{feature.title}</h3>
                <p className="text-slate-500">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-right">
              <h2 className="text-4xl font-bold mb-6">{t.interactiveTitle}</h2>
              <p className="text-slate-500 text-lg mb-8 leading-relaxed">{t.trustText}</p>
              <ul className="space-y-4">
                {t.whyList.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 justify-end">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`p-1 rounded-3xl border shadow-2xl relative ${isDarkMode ? 'bg-white/[0.04] border-white/[0.07]' : 'bg-slate-100 border-slate-200'}`}>
              <div className={`p-6 rounded-[1.4rem] ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0" />
                    <div className={`flex-1 p-4 rounded-2xl rounded-tl-none text-sm font-medium ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                      {t.interactivePrompt}
                    </div>
                  </div>
                  <div className="flex gap-4 items-start flex-row-reverse">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-orange-100/50">
                      <Sparkles size={20} className="text-orange-500" />
                    </div>
                    <div className={`flex-1 p-6 rounded-2xl rounded-tr-none border border-orange-100 bg-orange-50/30`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {t.interactiveResponse.map((item, idx) => (
                          <div key={idx} className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${isDarkMode ? 'bg-white/[0.04] border-white/[0.07] text-orange-400' : 'bg-white border-orange-100 text-orange-600'}`}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <Pricing lang={lang} isDarkMode={isDarkMode} onSelectPlan={onLogin} isLoggingIn={isLoggingIn} />
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4">
        <div className={`max-w-5xl mx-auto p-12 md:p-20 rounded-3xl border relative overflow-hidden text-center ${isDarkMode ? 'bg-white/[0.04] border-white/[0.07]' : 'bg-slate-950 border-slate-900 text-white shadow-2xl'}`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t.finalCtaTitle}</h2>
            <p className="opacity-70 text-lg md:text-xl max-w-2xl mx-auto mb-10">{t.finalCtaSubtitle}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={onLogin} disabled={isLoggingIn} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                {isLoggingIn && <Loader2 size={24} className="animate-spin" />}
                <span className="select-none">{t.finalCtaButtons}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 border-t ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-100'}`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className={`font-bold mb-4 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{t.footerNote}</p>
          <p className="text-slate-500 text-sm">{t.footer}</p>
        </div>
      </footer>
    </div>
  );
}
