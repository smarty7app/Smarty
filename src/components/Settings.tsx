import { motion } from "motion/react";
import { ArrowRight, Shield, Globe, Eye, EyeOff, Pencil, CheckCircle2, Trash2 } from "lucide-react";
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
  t, setScreen, isRtl, loading, handleSaveKeys, handleClearKeys, lang, setLang,
  yalidineId, setYalidineId, yalidineToken, setYalidineToken,
  zrKey, setZrKey, maystroId, setMaystroId, maystroKey, setMaystroKey,
  ecotrackToken, setEcotrackToken, andersonUser, setAndersonUser, andersonPass, setAndersonPass,
  procolisToken, setProcolisToken, nordSudKey, setNordSudKey,
  fastloToken, setFastloToken, kaziTourKey, setKaziTourKey,
  soudiaToken, setSoudiaToken, colisLivKey, setColisLivKey
}: any) {
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const backupRef = useRef<any>(null);

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
        andersonPass,
        procolisToken,
        nordSudKey,
        fastloToken,
        kaziTourKey,
        soudiaToken,
        colisLivKey
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
        setProcolisToken(backupRef.current.procolisToken || "");
        setNordSudKey(backupRef.current.nordSudKey || "");
        setFastloToken(backupRef.current.fastloToken || "");
        setKaziTourKey(backupRef.current.kaziTourKey || "");
        setSoudiaToken(backupRef.current.soudiaToken || "");
        setColisLivKey(backupRef.current.colisLivKey || "");
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
        <button onClick={() => setScreen("dashboard")} className={`p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer ${isRtl ? 'rotate-180' : ''}`}>
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

        <div className="space-y-8">
          {/* Yalidine */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-blue-500 pl-3">Yalidine Express</h4>
            <InputField label={t.settings_yalidine_id} value={yalidineId} onChange={setYalidineId} readOnly={!isBulkEditing} />
            <SecureTokenField label={t.settings_yalidine_token || "Yalidine API Token"} value={yalidineToken} onChange={setYalidineToken} isRtl={isRtl} t={t} forceEdit={isBulkEditing} />
          </div>

          {/* ZR Express */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-orange-500 pl-3">ZR Express</h4>
            <SecureTokenField label={t.settings_zr_key} value={zrKey} onChange={setZrKey} isRtl={isRtl} t={t} forceEdit={isBulkEditing} />
          </div>

          {/* Maystro */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-green-500 pl-3">Maystro Delivery</h4>
            <InputField label={t.settings_maystro_id} value={maystroId} onChange={setMaystroId} readOnly={!isBulkEditing} />
            <SecureTokenField label={t.settings_maystro_key} value={maystroKey} onChange={setMaystroKey} isRtl={isRtl} t={t} forceEdit={isBulkEditing} />
          </div>

          {/* ECOTRACK */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-zinc-500 pl-3">ECOTRACK</h4>
            <SecureTokenField label={t.settings_ecotrack_token} value={ecotrackToken} onChange={setEcotrackToken} isRtl={isRtl} t={t} forceEdit={isBulkEditing} />
          </div>

          {/* Anderson */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-zinc-500 pl-3">Anderson</h4>
            <InputField label={t.settings_anderson_user} value={andersonUser} onChange={setAndersonUser} readOnly={!isBulkEditing} />
            <SecureTokenField label={t.settings_anderson_pass} value={andersonPass} onChange={setAndersonPass} isRtl={isRtl} t={t} forceEdit={isBulkEditing} />
          </div>

          {/* Procolis */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-purple-500 pl-3">Procolis</h4>
            <SecureTokenField label={t.settings_procolis_token} value={procolisToken} onChange={setProcolisToken} isRtl={isRtl} t={t} forceEdit={isBulkEditing} />
          </div>

          {/* Nord & Sud */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-emerald-500 pl-3">Nord & Sud Express</h4>
            <SecureTokenField label={t.settings_nordsud_key} value={nordSudKey} onChange={setNordSudKey} isRtl={isRtl} t={t} forceEdit={isBulkEditing} />
          </div>

          {/* Fastlo */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-pink-500 pl-3">Fastlo</h4>
            <SecureTokenField label={t.settings_fastlo_token} value={fastloToken} onChange={setFastloToken} isRtl={isRtl} t={t} forceEdit={isBulkEditing} />
          </div>

          {/* Kazi Tour */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-teal-500 pl-3">Kazi Tour</h4>
            <SecureTokenField label={t.settings_kazitour_key} value={kaziTourKey} onChange={setKaziTourKey} isRtl={isRtl} t={t} forceEdit={isBulkEditing} />
          </div>

          {/* Soudia Express */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-rose-500 pl-3">Soudia Express</h4>
            <SecureTokenField label={t.settings_soudia_token} value={soudiaToken} onChange={setSoudiaToken} isRtl={isRtl} t={t} forceEdit={isBulkEditing} />
          </div>

          {/* ColisLiv */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 border-l-2 border-cyan-500 pl-3">ColisLiv</h4>
            <SecureTokenField label={t.settings_colisliv_key} value={colisLivKey} onChange={setColisLivKey} isRtl={isRtl} t={t} forceEdit={isBulkEditing} />
          </div>
        </div>

        <div className="pt-4 text-center">
          <button 
            onClick={handleSaveKeys} 
            disabled={loading} 
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-xl"
          >
            <Shield className="w-5 h-5" /> {t.settings_save_keys}
          </button>

          <p className="mt-4 text-[10px] text-zinc-600 leading-relaxed max-w-xs mx-auto">
            {t.settings_secure_notice}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
