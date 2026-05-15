import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, ShieldCheck, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPrice: string;
  lang: string;
  isDarkMode: boolean;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, planName, planPrice, lang, isDarkMode, onPaymentSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<'info' | 'processing' | 'success'>('info');
  const [paymentMethod, setPaymentMethod] = useState<'dahabia' | 'cib'>('dahabia');

  const t = {
    ar: {
      title: "دفع آمن",
      subtitle: "أنت بصدد الاشتراك في بخطة",
      chooseMethod: "اختر وسيلة الدفع",
      cardNumber: "رقم البطاقة",
      expiry: "تاريخ انتهاء الصلاحية",
      cvv: "الرمز السري (CVV)",
      payNow: "دفع الآن",
      processing: "جاري معالجة الدفع...",
      success: "تم الدفع بنجاح!",
      welcome: "مرحباً بك في عالم الاحتراف",
      start: "ابدأ الاستخدام الآن",
      dahabia: "بطاقة الذهبية",
      cib: "بطاقة CIB البنكية",
    },
    en: {
      title: "Secure Payment",
      subtitle: "You are subscribing to",
      chooseMethod: "Choose payment method",
      cardNumber: "Card Number",
      expiry: "Expiry Date",
      cvv: "CVV",
      payNow: "Pay Now",
      processing: "Processing payment...",
      success: "Payment Successful!",
      welcome: "Welcome to the Pro experience",
      start: "Start Using Now",
      dahabia: "Edahabia Card",
      cib: "CIB Bank Card",
    }
  }[lang === 'ar' ? 'ar' : 'en'];

  const handlePay = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('success');
    }, 3000);
  };

  const handleFinalize = () => {
    onPaymentSuccess();
    setStep('info');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative w-full max-w-md rounded-2xl shadow-xl overflow-hidden ${
              isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
            }`}
          >
            {step === 'info' && (
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold">{t.title}</h3>
                    <p className="text-sm text-slate-500">{t.subtitle} <span className="text-orange-500 font-semibold">{planName}</span></p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-500">{planPrice}</div>
                    <div className="text-xs text-slate-500">{lang === 'ar' ? 'دج / شهر' : 'DZD / mo'}</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-slate-500 mb-2 block">{t.chooseMethod}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setPaymentMethod('dahabia')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                          paymentMethod === 'dahabia' 
                            ? 'border-orange-500 bg-orange-500/5 text-orange-500' 
                            : isDarkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <CreditCard size={24} />
                        <span className="text-sm font-medium">{t.dahabia}</span>
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('cib')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                          paymentMethod === 'cib' 
                            ? 'border-orange-500 bg-orange-500/5 text-orange-500' 
                            : isDarkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <CreditCard size={24} />
                        <span className="text-sm font-medium">{t.cib}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="0000 0000 0000 0000"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-orange-500' : 'bg-slate-50 border-slate-100 focus:border-orange-500'
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="MM/YY"
                        className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-orange-500' : 'bg-slate-50 border-slate-100 focus:border-orange-500'
                        }`}
                      />
                      <input 
                        type="password" 
                        placeholder="CVV"
                        className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-orange-500' : 'bg-slate-50 border-slate-100 focus:border-orange-500'
                        }`}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handlePay}
                    className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ShieldCheck size={20} />
                    {t.payNow}
                  </button>
                </div>
              </div>
            )}

            {step === 'processing' && (
              <div className="p-12 text-center">
                <Loader2 size={48} className="mx-auto text-orange-500 animate-spin mb-4" />
                <h3 className="text-xl font-bold mb-2">{t.processing}</h3>
                <p className="text-slate-500">{lang === 'ar' ? 'يتم الاتصال بخوادم SATIM بأمان...' : 'Safely connecting to SATIM servers...'}</p>
              </div>
            )}

            {step === 'success' && (
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-bold mb-2">{t.success}</h3>
                <p className="text-slate-500 mb-8">{t.welcome}</p>
                <button 
                  onClick={handleFinalize}
                  className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  {t.start}
                  <ArrowRight size={20} />
                </button>
              </div>
            )}


            <button 
              onClick={onClose}
              className={`absolute top-6 right-6 p-2 rounded-xl transition-colors ${
                isDarkMode ? 'hover:bg-slate-800 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'
              }`}
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
