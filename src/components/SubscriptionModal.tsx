import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, CreditCard, ShieldCheck } from 'lucide-react';
import { SmartyLogo } from './SmartyLogo';
import Pricing from './Pricing';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
  isDarkMode: boolean;
  onSelectPlan: (planId: string) => void;
  showLimitReachedMessage?: boolean;
}

export default function SubscriptionModal({ isOpen, onClose, lang, isDarkMode, onSelectPlan, showLimitReachedMessage }: SubscriptionModalProps) {
  const t = {
    ar: {
      title: "قم بالترقية إلى Pro",
      subtitle: "لقد استهلكت جميع محاولات إنتاج الصور المجانية. اشترك للمتابعة والحصول على ميزات غير محدودة.",
      defaultSubtitle: "اختر خطتك المثالية وقم بالترقية للحصول على ميزات غير محدودة وأسعار مرنة تناسب احتياجاتك.",
      whyPro: "لماذا Pro؟",
      secure: "دفع آمن بالدينار الجزائري",
      features: [
        "توليد صور غير محدود",
        "وصول أسرع للنماذج الذكية",
        "دعم فني ذو أولوية",
        "تخزين سحابي للمشروعات"
      ]
    },
    en: {
      title: "Upgrade to Pro",
      subtitle: "You have consumed all your free image attempts. Subscribe to continue and get unlimited features.",
      defaultSubtitle: "Choose your perfect plan and upgrade to get unlimited features with flexible pricing.",
      whyPro: "Why Pro?",
      secure: "Secure payment in DZD",
      features: [
        "Unlimited image generation",
        "Faster access to AI models",
        "Priority technical support",
        "Cloud storage for projects"
      ]
    },
    fr: {
      title: "Passer à Pro",
      subtitle: "Vous avez consommé toutes vos tentatives gratuites. Abonnez-vous pour continuer.",
      defaultSubtitle: "Choisissez votre plan idéal et passez à Pro pour bénéficier de fonctionnalités illimitées.",
      whyPro: "Pourquoi Pro ?",
      secure: "Paiement sécurisé en DZD",
      features: [
        "Génération d'images illimitée",
        "Accès plus rapide aux modèles",
        "Support technique prioritaire",
        "Stockage cloud pour projets"
      ]
    }
  }[lang] || { title: "Upgrade to Pro", subtitle: "Subscribe to continue.", whyPro: "Why Pro?", secure: "Secure payment in DZD", features: [] };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border shadow-2xl ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
            }`}
          >
            <button 
              onClick={onClose}
              className={`absolute top-6 right-6 p-2 rounded-xl transition-colors ${
                isDarkMode ? 'hover:bg-slate-800 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'
              }`}
            >
              <X size={24} />
            </button>

            <div className="p-8 md:p-12">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <div className="inline-flex items-center justify-center mb-6">
                  <SmartyLogo size={64} />
                </div>
                <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">{t.title}</h2>
                <p className={`text-lg font-medium opacity-60 leading-relaxed`}>
                  {showLimitReachedMessage ? t.subtitle : t.defaultSubtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                <Pricing 
                  lang={lang} 
                  isDarkMode={isDarkMode} 
                  onSelectPlan={(planId) => {
                    if (planId === 'free') {
                      onClose();
                    } else {
                      onSelectPlan(planId);
                    }
                  }} 
                />
              </div>

              <div className={`mt-12 p-6 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 ${
                isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{t.secure}</h4>
                    <p className="text-sm opacity-50">Satim / Dahabia / Edahabia</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex -space-x-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-200`}>
                        <img 
                          src={`https://i.pravatar.cc/100?u=${i}`} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm font-bold opacity-60">
                    {lang === 'ar' ? 'انضم إلى +1000 مستخدم بريميوم' : 'Join +1000 premium users'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
