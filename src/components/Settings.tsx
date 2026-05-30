import { motion } from "motion/react";
import { ArrowRight, Shield, Globe, Eye, EyeOff, Pencil, CheckCircle2, Trash2, Lock, Copy } from "lucide-react";
import { useState, useEffect, useRef, ChangeEvent } from "react";
import { InputField } from "./CommonUI";

function SecureTokenField({ label, value, onChange, isRtl, t, forceEdit }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isRtl: boolean;
  t: any;
  forceEdit?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [initialValue, setInitialValue] = useState(value);

  useEffect(() => {
    if (!forceEdit) {
      setInitialValue(value);
    }
  }, [forceEdit, value]);

  // If there is no value, then they must be editing (there is no token yet).
  // Otherwise, they can edit only when bulk editing is turned on.
  const activeEditing = !value || forceEdit;

  const maskToken = (token: string) => {
    if (!token) return "";
    const len = token.length;
    if (len <= 6) {
      if (len <= 2) {
        return "•".repeat(len);
      }
      const startLen = Math.floor(len / 2);
      const start = token.slice(0, startLen);
      const end = token.slice(-1);
      const middleLen = len - startLen - 1;
      return start + "•".repeat(middleLen) + end;
    }
    const start = token.slice(0, 3);
    const end = token.slice(-3);
    const middleLen = len - 6;
    return start + "•".repeat(middleLen) + end;
  };

  const isDisplayingMasked = activeEditing && showPassword && value === initialValue && !!value;

  const displayValue = !activeEditing 
    ? maskToken(value) 
    : (isDisplayingMasked ? maskToken(value) : value);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!activeEditing) return;
    const val = e.target.value;

    if (isDisplayingMasked) {
      const expectedMask = maskToken(initialValue);
      if (val !== expectedMask) {
        let newVal = "";
        if (val.startsWith(expectedMask)) {
          newVal = val.slice(expectedMask.length);
        } else if (val.endsWith(expectedMask)) {
          newVal = val.slice(0, val.length - expectedMask.length);
        } else {
          newVal = val.replace(/•/g, "");
        }
        onChange(newVal);
      }
    } else {
      onChange(val);
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-[10px] text-zinc-500 uppercase px-1 tracking-wider flex justify-between">
        {label}
      </label>
      <div className="flex items-center gap-2 bg-black/50 border border-zinc-800 focus-within:border-zinc-600 rounded-xl px-3 py-2 transition-all group relative">
        <input 
          type={!activeEditing ? "text" : (showPassword ? "text" : "password")}
          className={`bg-transparent w-full text-sm outline-none placeholder:text-zinc-800 ${!activeEditing ? "text-zinc-500 select-none font-mono" : "text-white"}`}
          value={displayValue ?? ""}
          onChange={handleInputChange}
          readOnly={!activeEditing}
          placeholder={!activeEditing ? "••••••••" : t.placeholder_enter_token}
        />
        
        {activeEditing && (
          <div className={`flex items-center gap-2 shrink-0 ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="flex items-center justify-center p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-all"
              title={showPassword ? t.title_hide : t.title_show}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settings({ 
  userData,
  t, setScreen, isRtl, loading, handleSaveKeys, handleClearKeys, lang, setLang,
  yalidineId, setYalidineId, yalidineToken, setYalidineToken,
  zrKey, setZrKey, maystroId, setMaystroId, maystroKey, setMaystroKey,
  ecotrackToken, setEcotrackToken, andersonUser, setAndersonUser, andersonPass, setAndersonPass
}: any) {
  const isAr = t.total_orders === "إجمالي الطلبات";
  const isFr = t.total_orders === "Total Commandes";
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const backupRef = useRef<any>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  const planType = userData?.planType || "free";
  const isBasic = planType === "free" || planType === "basic";
  const isProOrAbove = planType === "pro" || planType === "professional" || planType === "unlimited" || planType === "business" || planType === "enterprise";
  const isBusinessOrAbove = planType === "unlimited" || planType === "business" || planType === "enterprise";

  const toggleBulkEdit = () => {
    if (!isBulkEditing) {
      // Entering edit mode: backup current values
      backupRef.current = {
        yalidineId,
        yalidineToken,
        zrKey,
        maystroId,
        maystroKey,
        ecotrackToken,
        andersonUser,
        andersonPass
      };
      setIsBulkEditing(true);
    } else {
      // Canceling edit mode: restore from backup
      if (backupRef.current) {
        setYalidineId(backupRef.current.yalidineId || "");
        setYalidineToken(backupRef.current.yalidineToken || "");
        setZrKey(backupRef.current.zrKey || "");
        setMaystroId(backupRef.current.maystroId || "");
        setMaystroKey(backupRef.current.maystroKey || "");
        setEcotrackToken(backupRef.current.ecotrackToken || "");
        setAndersonUser(backupRef.current.andersonUser || "");
        setAndersonPass(backupRef.current.andersonPass || "");
      }
      setIsBulkEditing(false);
    }
  };

  const cancelLabel = t.btn_cancel;
  const editLabel = t.btn_edit;

  const languages = [
    { code: "ar", label: "العربية" },
    { code: "fr", label: "Français" },
    { code: "en", label: "English" }
  ];

  return (
    <motion.div initial={{ opacity: 0, x: isRtl ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setScreen("dashboard")} className={`p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 ${isRtl ? 'rotate-180' : ''}`}>
          <ArrowRight className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">{t.settings_title}</h2>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-4 text-xs text-zinc-400 flex items-start gap-3">
        <Shield className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {t.settings_notice_alert}
        </p>
      </div>

      {/* Couriers Section */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 space-y-8">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t.settings_courier_config}</h3>
          </div>
          <button
            type="button"
            onClick={toggleBulkEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all border border-blue-500/10 shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{isBulkEditing ? cancelLabel : editLabel}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Yalidine */}
          <div className="space-y-4 p-4 rounded-2xl bg-zinc-900/10 border border-zinc-800/40 relative">
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-blue-500 pl-3">Yalidine Express</h4>
            <InputField label={t.settings_yalidine_id} value={yalidineId} onChange={setYalidineId} readOnly={!isBulkEditing} />
            <SecureTokenField label={t.settings_yalidine_token || "Yalidine API Token"} value={yalidineToken} onChange={setYalidineToken} isRtl={isRtl} t={t} forceEdit={isBulkEditing} />
          </div>

          {/* ZR Express */}
          <div className="space-y-4 p-4 rounded-2xl bg-zinc-900/10 border border-zinc-800/40 relative">
            {!isProOrAbove && (
              <div className="absolute inset-0 bg-[#0B0F19]/90 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center text-center p-4 z-10 border border-blue-500/30">
                <Lock className="w-5 h-5 text-blue-400 mb-1.5 animate-pulse" />
                <p className="text-white text-xs font-bold">{isAr ? "يتطلب ترقية الخطّة" : isFr ? "Mise à niveau requise" : "Upgrade Required"}</p>
                <p className="text-[9px] text-zinc-400 mt-1">{isAr ? "يتطلب باقة Professional أو أعلى" : isFr ? "Nécessite le plan Professional ou supérieur" : "Requires Professional plan or above"}</p>
              </div>
            )}
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-orange-500 pl-3">ZR Express</h4>
            <SecureTokenField label={t.settings_zr_key} value={zrKey} onChange={setZrKey} isRtl={isRtl} t={t} forceEdit={isBulkEditing && isProOrAbove} />
          </div>

          {/* Maystro */}
          <div className="space-y-4 p-4 rounded-2xl bg-zinc-900/10 border border-zinc-800/40 relative">
            {!isProOrAbove && (
              <div className="absolute inset-0 bg-[#0B0F19]/90 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center text-center p-4 z-10 border border-blue-500/30">
                <Lock className="w-5 h-5 text-blue-400 mb-1.5 animate-pulse" />
                <p className="text-white text-xs font-bold">{isAr ? "يتطلب ترقية الخطّة" : isFr ? "Mise à niveau requise" : "Upgrade Required"}</p>
                <p className="text-[9px] text-zinc-400 mt-1">{isAr ? "يتطلب باقة Professional أو أعلى" : isFr ? "Nécessite le plan Professional ou supérieur" : "Requires Professional plan or above"}</p>
              </div>
            )}
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-green-500 pl-3">Maystro Delivery</h4>
            <InputField label={t.settings_maystro_id} value={maystroId} onChange={setMaystroId} readOnly={!isBulkEditing || !isProOrAbove} />
            <SecureTokenField label={t.settings_maystro_key} value={maystroKey} onChange={setMaystroKey} isRtl={isRtl} t={t} forceEdit={isBulkEditing && isProOrAbove} />
          </div>

          {/* ECOTRACK */}
          <div className="space-y-4 p-4 rounded-2xl bg-zinc-900/10 border border-zinc-800/40 relative">
            {!isBusinessOrAbove && (
              <div className="absolute inset-0 bg-[#0B0F19]/90 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center text-center p-4 z-10 border border-purple-500/30">
                <Lock className="w-5 h-5 text-purple-400 mb-1.5 animate-pulse" />
                <p className="text-white text-xs font-bold">{isAr ? "يتطلب ترقية الخطّة" : isFr ? "Mise à niveau requise" : "Upgrade Required"}</p>
                <p className="text-[9px] text-zinc-400 mt-1">{isAr ? "يتطلب باقة Business أو أعلى" : isFr ? "Nécessite le plan Business ou supérieur" : "Requires Business plan or above"}</p>
              </div>
            )}
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-zinc-500 pl-3">ECOTRACK</h4>
            <SecureTokenField label={t.settings_ecotrack_token} value={ecotrackToken} onChange={setEcotrackToken} isRtl={isRtl} t={t} forceEdit={isBulkEditing && isBusinessOrAbove} />
          </div>

          {/* Anderson */}
          <div className="space-y-4 p-4 rounded-2xl bg-zinc-900/10 border border-zinc-800/40 relative">
            {!isBusinessOrAbove && (
              <div className="absolute inset-0 bg-[#0B0F19]/90 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center text-center p-4 z-10 border border-purple-500/30">
                <Lock className="w-5 h-5 text-purple-400 mb-1.5 animate-pulse" />
                <p className="text-white text-xs font-bold">{isAr ? "يتطلب ترقية الخطّة" : isFr ? "Mise à niveau requise" : "Upgrade Required"}</p>
                <p className="text-[9px] text-zinc-400 mt-1">{isAr ? "يتطلب باقة Business أو أعلى" : isFr ? "Nécessite le plan Business ou supérieur" : "Requires Business plan or above"}</p>
              </div>
            )}
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-zinc-500 pl-3">Anderson</h4>
            <InputField label={t.settings_anderson_user} value={andersonUser} onChange={setAndersonUser} readOnly={!isBulkEditing || !isBusinessOrAbove} />
            <SecureTokenField label={t.settings_anderson_pass} value={andersonPass} onChange={setAndersonPass} isRtl={isRtl} t={t} forceEdit={isBulkEditing && isBusinessOrAbove} />
          </div>
        </div>

        <div className="pt-4 text-center">
          <button 
            onClick={handleSaveKeys} 
            disabled={loading} 
            className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-white/5"
          >
            <Shield className="w-5 h-5" /> {t.settings_save_keys}
          </button>

          <p className="mt-4 text-[10px] text-zinc-600 leading-relaxed max-w-xs mx-auto">
            {t.settings_secure_notice}
          </p>
        </div>
      </div>

      {/* Social Channels Integration Guide Section */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-400">
            <Globe className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              {isAr ? "دليل ربط وتفعيل القنوات الاجتماعية" : isFr ? "Guide de connexion des canaux sociaux" : "Social Channels Integration Guide"}
            </h3>
          </div>
          <p className="text-xs text-zinc-400">
            {isAr 
              ? "دليل التنفيذ العملي لربط وتفعيل استقبال المحادثات تلقائياً عبر واجهات برمجة التطبيقات (APIs)" 
              : isFr 
                ? "Détails opérationnels et intégration par API pour la réception automatique des messages" 
                : "Operational details and API integration steps for automated message reception"}
          </p>
        </div>

        {/* Channels Grid / Table */}
        <div className="overflow-x-auto border border-zinc-800/60 rounded-2xl bg-black/20">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 px-4 py-3 bg-zinc-900/40 text-zinc-400 font-medium">
                <th className="p-4 text-right">{isAr ? "القناة" : isFr ? "Canal" : "Channel"}</th>
                <th className="p-4">{isAr ? "واجهة برمجة التطبيقات (API) الرئيسية" : isFr ? "API Principale" : "Main API"}</th>
                <th className="p-4">{isAr ? "طريقة الربط الأساسية" : isFr ? "Méthode de liaison" : "Connection Method"}</th>
                <th className="p-4">{isAr ? "الأدوات والموارد" : isFr ? "Outils et Ressources" : "Tools and Resources"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
              <tr>
                <td className="p-4 font-bold text-right flex items-center gap-2 justify-end">
                  <span className="px-2 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-400 border border-blue-500/10">Facebook</span>
                  <span>{isAr ? "فيسبوك ماسنجر" : "Facebook Messenger"}</span>
                </td>
                <td className="p-4 font-mono text-xs">Messenger Platform API</td>
                <td className="p-4 font-semibold text-blue-400/90">Webhooks</td>
                <td className="p-4 text-zinc-400">
                  {isAr 
                    ? "توثيق فيسبوك الرسمي، مكتبة @msgly/messenger لـ Node.js" 
                    : isFr 
                      ? "Documentation FB officielle, bibliothèque Node.js @msgly/messenger" 
                      : "Official FB documentation, @msgly/messenger Node.js library"}
                </td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-right flex items-center gap-2 justify-end">
                  <span className="px-2 py-0.5 text-[10px] rounded bg-pink-500/10 text-pink-400 border border-pink-500/10">Instagram</span>
                  <span>{isAr ? "إنستغرام" : "Instagram"}</span>
                </td>
                <td className="p-4 font-mono text-xs">Instagram Graph API</td>
                <td className="p-4 font-semibold text-pink-400/90">{isAr ? "Webhooks عبر تطبيق فيسبوك" : isFr ? "Webhooks via FB App" : "Webhooks via FB App"}</td>
                <td className="p-4 text-zinc-400">
                  {isAr 
                    ? "توثيق Instagram Messaging API، نفس إعدادات فيسبوك ماسنجر مع إضافة صلاحيات Instagram" 
                    : isFr 
                      ? "Doc Instagram Messaging API, même configuration que Messenger avec permissions Instagram" 
                      : "Instagram Messaging API Docs, same setup as Messenger with Instagram permissions"}
                </td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-right flex items-center gap-2 justify-end">
                  <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">WhatsApp</span>
                  <span>{isAr ? "واتساب" : "WhatsApp"}</span>
                </td>
                <td className="p-4 font-mono text-xs">WhatsApp Business API</td>
                <td className="p-4 font-semibold text-emerald-400/90">{isAr ? "Webhooks أو مزود Twilio" : isFr ? "Webhooks ou Twilio" : "Webhooks or Twilio"}</td>
                <td className="p-4 text-zinc-400">
                  {isAr 
                    ? "وثائق Meta Developer، Twilio API كحل بديل لتبسيط الإعداد" 
                    : isFr 
                      ? "Doc Meta Developer, Twilio API comme alternative pour simplifier l'installation" 
                      : "Meta Developer Docs, Twilio API as a simpler alternative setup"}
                </td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-right flex items-center gap-2 justify-end">
                  <span className="px-2 py-0.5 text-[10px] rounded bg-sky-500/10 text-sky-400 border border-sky-500/10">Telegram</span>
                  <span>{isAr ? "تيليغرام" : "Telegram"}</span>
                </td>
                <td className="p-4 font-mono text-xs">Telegram Bot API</td>
                <td className="p-4 font-semibold text-sky-450">Webhooks</td>
                <td className="p-4 text-zinc-400">
                  {isAr 
                    ? "توثيق Telegram Bot API، مكتبات مثل node-telegram-bot-api" 
                    : isFr 
                      ? "Documentation Telegram Bot API, package node-telegram-bot-api" 
                      : "Telegram Bot API Docs, node-telegram-bot-api package"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Webhooks Connection Matrix Section */}
        <div className="space-y-4 pt-4 border-t border-zinc-800/65">
          <div className="space-y-1">
            <h4 className="font-bold text-zinc-200 text-xs flex items-center gap-1.5 justify-start">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
              {isAr ? "🔗 مصفوفة ربط القنوات بالـ Webhooks الفعالة" : "🔗 Active Channels Webhooks Matrix"}
            </h4>
            <p className="text-[11px] text-zinc-400">
              {isAr 
                ? "انسخ روابط الـ Webhooks المباشرة الخاصة بك واربطها بلوحة تحكم المطورين لتلقي وتفكيك طلبات عملائك فورياً:" 
                : "Copy your direct webhooks to link inside developer app portals to process buyer inquiries in real-time:"}
            </p>
          </div>

          <div className="overflow-x-auto border border-zinc-800 rounded-2xl bg-black/25">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 font-medium text-xs">
                  <th className="p-3 text-right">{isAr ? "القناة" : "Channel"}</th>
                  <th className="p-3 text-left">{isAr ? "نقاط النهاية الموصى بها (Endpoints)" : "Recommended Endpoints"}</th>
                  <th className="p-3 text-right">{isAr ? "خطوات الربط السريعة" : "Quick Connection Steps"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                {/* Facebook Messenger */}
                <tr>
                  <td className="p-3 font-bold text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span>{isAr ? "فيسبوك ماسنجر" : "Facebook Messenger"}</span>
                    </div>
                  </td>
                  <td className="p-3 text-left">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-300 bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-800 max-w-xs md:max-w-md overflow-hidden">
                      <span className="shrink-0 font-bold px-1 bg-blue-550/10 text-[9px] rounded text-blue-400">POST</span>
                      <span className="truncate select-all">{`${typeof window !== "undefined" ? window.location.origin : ""}/webhook/facebook?merchantId=${userData?.uid || "demo_merchant_id"}`}</span>
                      <button
                        onClick={() => copyToClipboard(`${typeof window !== "undefined" ? window.location.origin : ""}/webhook/facebook?merchantId=${userData?.uid || "demo_merchant_id"}`, "facebook")}
                        className="ml-auto shrink-0 p-1 rounded-lg hover:bg-zinc-805 text-zinc-400 hover:text-white transition-all"
                        title="Copy copy link"
                      >
                        {copiedKey === "facebook" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-zinc-400 text-right leading-relaxed text-[11px]">
                    {isAr 
                      ? "استخدم التوثيق الرسمي من فيسبوك. اتبع دليل How to Integrate Facebook Messenger with a CRM للحصول على خطوات تفصيلية." 
                      : "Use FB official documentation. Follow 'How to Integrate Facebook Messenger with a CRM' guide for extreme details."}
                  </td>
                </tr>

                {/* Instagram */}
                <tr>
                  <td className="p-3 font-bold text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                      <span>{isAr ? "إنستغرام" : "Instagram"}</span>
                    </div>
                  </td>
                  <td className="p-3 text-left">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-300 bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-800 max-w-xs md:max-w-md overflow-hidden">
                      <span className="shrink-0 font-bold px-1 bg-pink-500/10 text-[9px] rounded text-pink-400">POST</span>
                      <span className="truncate select-all">{`${typeof window !== "undefined" ? window.location.origin : ""}/webhook/instagram?merchantId=${userData?.uid || "demo_merchant_id"}`}</span>
                      <button
                        onClick={() => copyToClipboard(`${typeof window !== "undefined" ? window.location.origin : ""}/webhook/instagram?merchantId=${userData?.uid || "demo_merchant_id"}`, "instagram")}
                        className="ml-auto shrink-0 p-1 rounded-lg hover:bg-zinc-805 text-zinc-400 hover:text-white transition-all"
                        title="Copy copy link"
                      >
                        {copiedKey === "instagram" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-zinc-400 text-right leading-relaxed text-[11px]">
                    {isAr 
                      ? "يتم عبر نفس تطبيق فيسبوك. تأكد من اشتراك (Subscribe) الـ webhook الخاص بك على أحداث Instagram." 
                      : "Done via target same Facebook App. Ensure subscribing your webhook endpoint triggers on Instagram events."}
                  </td>
                </tr>

                {/* WhatsApp */}
                <tr>
                  <td className="p-3 font-bold text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{isAr ? "واتساب" : "WhatsApp"}</span>
                    </div>
                  </td>
                  <td className="p-3 text-left">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-300 bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-800 max-w-xs md:max-w-md overflow-hidden">
                      <span className="shrink-0 font-bold px-1 bg-emerald-550/10 text-[9px] rounded text-emerald-400">POST</span>
                      <span className="truncate select-all">{`${typeof window !== "undefined" ? window.location.origin : ""}/webhook/whatsapp?merchantId=${userData?.uid || "demo_merchant_id"}`}</span>
                      <button
                        onClick={() => copyToClipboard(`${typeof window !== "undefined" ? window.location.origin : ""}/webhook/whatsapp?merchantId=${userData?.uid || "demo_merchant_id"}`, "whatsapp")}
                        className="ml-auto shrink-0 p-1 rounded-lg hover:bg-zinc-850 text-zinc-400 hover:text-white transition-all"
                        title="Copy copy link"
                      >
                        {copiedKey === "whatsapp" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-zinc-400 text-right leading-relaxed text-[11px]">
                    {isAr 
                      ? "إذا اخترت طريق Twilio، استخدم دليل الإعداد في Twilio Docs." 
                      : "If you choose the Twilio route integration, configure your endpoints within Twilio Docs setup guidelines."}
                  </td>
                </tr>

                {/* Telegram */}
                <tr>
                  <td className="p-3 font-bold text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      <span>{isAr ? "تيليغرام" : "Telegram"}</span>
                    </div>
                  </td>
                  <td className="p-3 text-left">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-300 bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-800 max-w-xs md:max-w-md overflow-hidden">
                      <span className="shrink-0 font-bold px-1 bg-sky-550/10 text-[9px] rounded text-sky-400">POST</span>
                      <span className="truncate select-all">{`${typeof window !== "undefined" ? window.location.origin : ""}/webhook/telegram?merchantId=${userData?.uid || "demo_merchant_id"}`}</span>
                      <button
                        onClick={() => copyToClipboard(`${typeof window !== "undefined" ? window.location.origin : ""}/webhook/telegram?merchantId=${userData?.uid || "demo_merchant_id"}`, "telegram")}
                        className="ml-auto shrink-0 p-1 rounded-lg hover:bg-zinc-850 text-zinc-400 hover:text-white transition-all"
                        title="Copy copy link"
                      >
                        {copiedKey === "telegram" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-zinc-400 text-right leading-relaxed text-[11px]">
                    {isAr 
                      ? "اتبع خطوات إعداد الـ Webhook في Bots: An introduction for developers." 
                      : "Follow Webhook setups listed in Bots: An introduction for developers guide website."}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Activation pipeline steps */}
        <div className="p-5 rounded-2xl bg-[#0B0F19]/60 border border-zinc-800/80 space-y-4 text-xs">
          <h4 className="font-bold text-zinc-200">
            {isAr ? "⚡ كيف تعمل دورة الاستقبال والتحليل الذكي؟" : "⚡ How does the smart reception & analysis pipeline work?"}
          </h4>
          <ol className="list-decimal list-inside space-y-3 text-zinc-400 leading-relaxed">
            <li>
              <strong>{isAr ? "تفعيل Webhooks وتطبيق المطورين:" : "Activate Developer App & Webhooks:"}</strong>{" "}
              {isAr 
                ? "قم بإنشاء حساب مطور على منصة Meta وقفل إرسال الرسائل لعنوان Webhook التابع لخادمك لاستقبال محتوى الدردشات فورياً بتنسيق JSON." 
                : "Register a developer account, create an App, and configure Webhook subscriptions to receive incoming chat messages in JSON format."}
            </li>
            <li>
              <strong>{isAr ? "التوجيه لذكاء المنصة (AI Mapping):" : "Routing to Platform AI (AI Mapping):"}</strong>{" "}
              {isAr 
                ? "بشكل آلي، يتم تمرير نص الرسالة المُستقبلة إلى وحدة التحليل الذكي (Gemini API) على السيرفر لتحديد الاسم والمدينة ورقم هاتف العميل فوراً." 
                : "Once received, messages are automatically routed server-side to our AI engine (Gemini API) to perform extraction of name, city, and phone."}
            </li>
            <li>
              <strong>{isAr ? "تأكيد واستخراج الشحنة:" : "Confirm and Manifest Shipment:"}</strong>{" "}
              {isAr 
                ? "بمجرد الفرز، تظهر البيانات مباشرة بقائمة الانتظار لتأكيدها وتجهيز كود الشحن مع Yalidine أو ZR Express أو شركات الشحن الأخرى المدعومة بلمسة واحدة." 
                : "Extracted data appears directly in your pending queue for review and single-click shipping manifest generation via your preferred courier."}
            </li>
          </ol>
        </div>
      </div>
    </motion.div>
  );
}
