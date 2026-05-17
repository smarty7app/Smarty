import React from 'react';
import { motion } from 'motion/react';
import { Check, Sparkles, Zap, Shield, Rocket, Clock } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

const plans: Record<string, Plan[]> = {
  ar: [
    {
      id: 'free',
      name: 'المجانية',
      price: '0 دج/شهر',
      features: ['محادثات أساسية', 'تحليل صور محدود', 'دعم لغات متعددة'],
      cta: 'ابدأ مجاناً'
    },
    {
      id: 'starter',
      name: 'Pro',
      price: '400 دج/شهر',
      features: ['محادثات أسرع', 'المزيد من تحليل الصور', 'أولوية في الدعم'],
      cta: 'اشترك الآن',
      popular: true
    },
    {
      id: 'pro',
      name: 'Ultra',
      price: '700 دج/شهر',
      features: ['كل شيء غير محدود', 'توليد صور متقدم', 'دعم فني خاص'],
      cta: 'كن محترفاً'
    }
  ],
  en: [
    {
      id: 'free',
      name: 'Free',
      price: '0 DZD/mo',
      features: ['Basic chat', 'Limited image analysis', 'Multi-language support'],
      cta: 'Start for free'
    },
    {
      id: 'starter',
      name: 'Pro',
      price: '400 DZD/mo',
      features: ['Faster responses', 'More image analysis', 'Priority support'],
      cta: 'Subscribe now',
      popular: true
    },
    {
      id: 'pro',
      name: 'Ultra',
      price: '700 DZD/mo',
      features: ['Unlimited everything', 'Advanced image generation', 'Dedicated support'],
      cta: 'Go Pro'
    }
  ],
  fr: [
    {
      id: 'free',
      name: 'Gratuit',
      price: '0 DZD/mois',
      features: ['Chat de base', 'Analyse d\'images limitée', 'Support multi-langues'],
      cta: 'Commencer gratuitement'
    },
    {
      id: 'starter',
      name: 'Pro',
      price: '400 DZD/mois',
      features: ['Réponses plus rapides', 'Plus d\'analyse d\'images', 'Support prioritaire'],
      cta: 'S\'abonner maintenant',
      popular: true
    },
    {
      id: 'pro',
      name: 'Ultra',
      price: '700 DZD/mois',
      features: ['Tout illimité', 'Génération d\'images avancée', 'Support dédié'],
      cta: 'Devenir Pro'
    }
  ]
};

interface PricingProps {
  lang: string;
  isDarkMode: boolean;
  onSelectPlan: (planId: string) => void;
  isLoggingIn?: boolean;
}

export default function Pricing({ lang, isDarkMode, onSelectPlan, isLoggingIn }: PricingProps) {
  const currentPlans = plans[lang] || plans.en;

  const t = {
    ar: {
      title: 'اختر خطتك المثالية',
      subtitle: 'أسعار مرنة تناسب احتياجاتك',
      popular: 'الأكثر طلباً'
    },
    en: {
      title: 'Choose your perfect plan',
      subtitle: 'Flexible pricing that scales with you',
      popular: 'Popular'
    },
    fr: {
      title: 'Choisissez votre forfait idéal',
      subtitle: 'Des tarifs flexibles adaptés à vos besoins',
      popular: 'Populaire'
    }
  }[lang] || { title: 'Choose your perfect plan', subtitle: 'Flexible pricing that scales with you', popular: 'Popular' };

  return (
    <div className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className={`text-3xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
          >
            {t.title}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 text-lg"
          >
            {t.subtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {currentPlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-8 rounded-2xl border flex flex-col transition-all hover:shadow-xl ${
                  plan.popular 
                    ? isDarkMode ? 'bg-slate-800 border-orange-500 shadow-orange-500/10' : 'bg-white border-orange-500 shadow-orange-500/10' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold ring-4 ring-white/10 select-none">
                    {t.popular}
                  </div>
                )}
                
                <div className="mb-8">
                  <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{plan.price.split(' ')[0]}</span>
                    <span className="text-slate-500 text-sm">{plan.price.split(' ').slice(1).join(' ')}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Check size={14} className="text-orange-500" />
                      </div>
                      <span className="text-slate-500 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onSelectPlan(plan.id)}
                  disabled={isLoggingIn}
                  className={`w-full py-4 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed select-none ${
                    plan.popular
                      ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'
                      : isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-950 hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
