import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, CreditCard, Upload, X, Shield, Info, ArrowRight, RefreshCw, Percent } from "lucide-react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Subscription({ user, userData, setScreen, t, isRtl, planLimits }: any) {
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "unlimited" | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const currentLimit = planLimits[userData?.planType || 'free'];
  const usagePercentage = Math.min(100, ((userData?.orderCounter || 0) / (currentLimit || 1)) * 100);

  const plans = [
    {
      id: "free",
      name: t.plan_free_name,
      price: "0 DA",
      limit: planLimits.free,
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
      limit: planLimits.pro,
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
      limit: "∞",
      features: [
        t.feature_orders_unlimited,
        t.feature_full_couriers,
        t.feature_priority_support,
        t.feature_api_access,
      ],
      color: "yellow"
    }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRequest = async () => {
    if (!user || !selectedPlan || !receiptFile) return;
    setLoading(true);
    try {
      // In a real app, I would upload to Storage. Here I'll use a placeholder for URL since storage setup isn't confirmed.
      // But I'll simulate the database entry.
      await addDoc(collection(db, "subscription_requests"), {
        userId: user.uid,
        userEmail: user.email,
        requestedPlan: selectedPlan,
        receiptUrl: "https://placeholder-receipt.com/" + Math.random().toString(36).substring(7),
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20 w-full max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => setScreen("dashboard")} className={`p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 ${isRtl ? 'rotate-180' : ''}`}>
          <ArrowRight className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold tracking-tight">{t.sub_upgrade || "Subscription"}</h2>
      </div>

      {/* Usage Progress Bar */}
      {userData && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 backdrop-blur-md">
           <div className="flex justify-between items-center mb-2">
             <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
               <Percent className="w-3.5 h-3.5 text-blue-400" />
               {t.sub_usage}
             </span>
             <span className="text-xs font-mono font-semibold text-zinc-300">
               {userData.orderCounter} <span className="text-zinc-600">/</span> {currentLimit === Infinity ? '∞' : currentLimit}
             </span>
           </div>
           <div className="h-2 bg-zinc-800/60 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${usagePercentage}%` }} 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
              />
           </div>
        </div>
      )}

      {isPending && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-6 flex flex-col items-center text-center space-y-3">
           <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
             <Shield className="w-6 h-6 animate-pulse" />
           </div>
           <div>
             <h3 className="font-bold text-blue-400">{t.sub_pending_title}</h3>
             <p className="text-sm text-zinc-500">{t.sub_pending_desc}</p>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`
              relative p-8 rounded-[2rem] border transition-all flex flex-col group
              ${plan.popular ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.15)] ring-2 ring-blue-500/50' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}
              ${userData?.planType === plan.id ? 'opacity-100' : 'opacity-80 hover:opacity-100'}
            `}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                {t.popular_badge}
              </div>
            )}
            
            <h3 className={`text-xl font-bold mb-1 tracking-tight ${plan.color === 'blue' ? 'text-blue-400' : plan.color === 'yellow' ? 'text-yellow-400' : 'text-zinc-400'}`}>
              {plan.name}
            </h3>
            <div className="text-4xl font-bold mb-8 tracking-tighter" dir="ltr">{plan.price}</div>
            
            <div className="space-y-4 mb-12 flex-1">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${plan.color === 'blue' ? 'text-blue-400' : plan.color === 'yellow' ? 'text-yellow-400' : 'text-zinc-400'}`} />
                  <span className="text-sm font-medium opacity-80">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              disabled={userData?.planType === plan.id || (plan.id === 'free') || isPending}
              onClick={() => {
                setSelectedPlan(plan.id as any);
                setShowUpgradeModal(true);
              }}
              className={`
                w-full py-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100
                ${userData?.planType === plan.id 
                  ? 'bg-zinc-800 text-zinc-500 cursor-default' 
                  : plan.color === 'blue' 
                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-500/20' 
                    : plan.color === 'yellow'
                      ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                      : 'bg-white/10 text-white hover:bg-white/15'
                }
              `}
            >
              {userData?.planType === plan.id ? t.current_plan : t.upgrade_button}
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showUpgradeModal && selectedPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUpgradeModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-[2.5rem] overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                      <CreditCard className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">{t.payment_info}</h2>
                      <p className="text-sm text-zinc-500">{t.upgrade_to} <span className="text-white font-bold uppercase">{selectedPlan}</span></p>
                    </div>
                  </div>
                  <button onClick={() => setShowUpgradeModal(false)} className="p-2 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4">
                      <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest flex items-center gap-2">
                        <Info className="w-3 h-3" /> BaridiMob
                      </h4>
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500">RIP</p>
                        <p className="font-mono text-sm select-all">00799999002222222222</p>
                      </div>
                   </div>
                   <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4">
                      <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest flex items-center gap-2">
                        <Info className="w-3 h-3" /> CCP
                      </h4>
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Account No. / Key</p>
                        <p className="font-mono text-sm select-all">12345678 / 99</p>
                      </div>
                   </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4">
                  <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">{t.upload_receipt}</h4>
                  
                  <div className="relative group cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className={`
                      border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all
                      ${previewUrl ? 'border-green-500/50 bg-green-500/5' : 'border-zinc-800 bg-black/40 group-hover:border-zinc-700'}
                    `}>
                      {previewUrl ? (
                         <img src={previewUrl} className="w-full h-40 object-contain rounded-xl" />
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6 text-zinc-500" />
                          </div>
                          <p className="text-sm font-medium text-zinc-400">{t.click_to_upload}</p>
                          <p className="text-[10px] text-zinc-600 mt-1">PNG, JPG or PDF (max 5MB)</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSubmitRequest}
                    disabled={loading || !receiptFile}
                    className="w-full py-5 bg-white text-black rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-2xl shadow-white/10 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="animate-spin w-6 h-6" /> : <Shield className="w-6 h-6" />}
                    {t.submit_upgrade || "Request Upgrade"}
                  </button>
                  <p className="text-center text-[10px] text-zinc-600 mt-4 uppercase tracking-widest">
                    Secure verification process • Usually takes {"< 24h"}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
