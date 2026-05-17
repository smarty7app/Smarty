import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, ShieldCheck, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [step, setStep] = useState<'info' | 'processing' | 'success' | 'error'>('info');
  const [paymentMethod, setPaymentMethod] = useState<'dahabia' | 'cib'>('dahabia');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [errors, setErrors] = useState<{ cardNumber?: string; expiry?: string; cvv?: string }>({});
  const [errorMessage, setErrorMessage] = useState('');

  // reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('info');
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setErrors({});
      setErrorMessage('');
      setPaymentMethod('dahabia');
    }
  }, [isOpen]);

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
      errorTitle: "فشل الدفع",
      errorDesc: "حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.",
      retry: "إعادة المحاولة",
      invalidCard: "رقم البطاقة غير صالح (16 رقم)",
      invalidExpiry: "تاريخ انتهاء غير صالح (MM/YY)",
      invalidCvv: "الرمز السري غير صالح (3-4 أرقام)",
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
      errorTitle: "Payment Failed",
      errorDesc: "An error occurred while processing your payment. Please try again.",
      retry: "Retry",
      invalidCard: "Invalid card number (16 digits)",
      invalidExpiry: "Invalid expiry date (MM/YY)",
      invalidCvv: "Invalid CVV (3-4 digits)",
    },
    fr: {
      title: "Paiement Sécurisé",
      subtitle: "Vous vous abonnez à",
      chooseMethod: "Choisissez le mode de paiement",
      cardNumber: "Numéro de carte",
      expiry: "Date d'expiration",
      cvv: "CVV",
      payNow: "Payer maintenant",
      processing: "Traitement du paiement...",
      success: "Paiement réussi !",
      welcome: "Bienvenue dans l'expérience Pro",
      start: "Commencer maintenant",
      dahabia: "Carte Edahabia",
      cib: "Carte bancaire CIB",
      errorTitle: "Échec du paiement",
      errorDesc: "Une erreur s'est produite lors du traitement de votre paiement. Veuillez réessayer.",
      retry: "Réessayer",
      invalidCard: "Numéro de carte invalide (16 chiffres)",
      invalidExpiry: "Date d'expiration invalide (MM/AA)",
      invalidCvv: "CVV invalide (3-4 chiffres)",
    }
  }[lang === 'ar' ? 'ar' : (lang === 'fr' ? 'fr' : 'en')];

  // Validation functions
  const validateCardNumber = (num: string) => {
    const cleaned = num.replace(/\s/g, '');
    return /^\d{16}$/.test(cleaned);
  };
  const validateExpiry = (exp: string) => {
    return /^(0[1-9]|1[0-2])\/\d{2}$/.test(exp);
  };
  const validateCvv = (c: string) => {
    return /^\d{3,4}$/.test(c);
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!validateCardNumber(cardNumber)) newErrors.cardNumber = t.invalidCard;
    if (!validateExpiry(expiry)) newErrors.expiry = t.invalidExpiry;
    if (!validateCvv(cvv)) newErrors.cvv = t.invalidCvv;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Simulate API call – replace with actual backend integration
  const callPaymentApi = async () => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 2000);
    });
  };

  const handlePay = async () => {
    if (!validateForm()) return;
    setStep('processing');
    setErrorMessage('');
    try {
      const result = await callPaymentApi();
      if (result.success) {
        setStep('success');
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : t.errorDesc);
      setStep('error');
    }
  };

  const handleFinalize = () => {
    onPaymentSuccess();
    setStep('info');
    onClose();
  };

  const handleRetry = () => {
    setStep('info');
    setErrorMessage('');
    setErrors({});
  };

  // Format card number with spaces every 4 digits
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '').slice(0, 16);
    const parts = cleaned.match(/.{1,4}/g);
    return parts ? parts.join(' ') : cleaned;
  };
  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\s/g, '');
    if (raw.length <= 16) {
      setCardNumber(formatCardNumber(raw));
    }
  };
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0,2) + '/' + value.slice(2,4);
    }
    setExpiry(value.slice(0,5));
  };
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCvv(value.slice(0,4));
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
                    <div className="text-xs text-slate-500">{lang === 'ar' ? 'دج / شهر' : (lang === 'fr' ? 'DZD / mois' : 'DZD / mo')}</div>
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
                        value={cardNumber}
                        onChange={handleCardChange}
                        placeholder="0000 0000 0000 0000"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all ${
                          errors.cardNumber ? 'border-red-500' : (isDarkMode ? 'border-slate-700 focus:border-orange-500' : 'border-slate-100 focus:border-orange-500')
                        } ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}
                      />
                      {errors.cardNumber && <p className="text-xs text-red-500 mt-1">{errors.cardNumber}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <input 
                          type="text" 
                          value={expiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY"
                          className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                            errors.expiry ? 'border-red-500' : (isDarkMode ? 'border-slate-700 focus:border-orange-500' : 'border-slate-100 focus:border-orange-500')
                          } ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}
                        />
                        {errors.expiry && <p className="text-xs text-red-500 mt-1">{errors.expiry}</p>}
                      </div>
                      <div>
                        <input 
                          type="password" 
                          value={cvv}
                          onChange={handleCvvChange}
                          placeholder="CVV"
                          className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                            errors.cvv ? 'border-red-500' : (isDarkMode ? 'border-slate-700 focus:border-orange-500' : 'border-slate-100 focus:border-orange-500')
                          } ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}
                        />
                        {errors.cvv && <p className="text-xs text-red-500 mt-1">{errors.cvv}</p>}
                      </div>
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
                <p className="text-slate-500">{lang === 'ar' ? 'يتم الاتصال بخوادم SATIM بأمان...' : (lang === 'fr' ? 'Connexion sécurisée aux serveurs SATIM...' : 'Safely connecting to SATIM servers...')}</p>
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

            {step === 'error' && (
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                  <AlertCircle size={40} />
                </div>
                <h3 className="text-2xl font-bold mb-2">{t.errorTitle}</h3>
                <p className="text-slate-500 mb-6">{errorMessage || t.errorDesc}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={handleRetry}
                    className="flex-1 bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    {t.retry}
                  </button>
                  <button 
                    onClick={onClose}
                    className="flex-1 border border-slate-300 dark:border-slate-700 py-4 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    {lang === 'ar' ? 'إلغاء' : (lang === 'fr' ? 'Annuler' : 'Cancel')}
                  </button>
                </div>
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
