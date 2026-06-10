import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, CreditCard, LogOut, User, Globe, ShieldCheck, ChevronDown, ChevronUp, Package } from "lucide-react";
import { Logo } from "./CommonUI";

export default function Sidebar({ 
  showSidebar, 
  setShowSidebar, 
  user, 
  userData, 
  screen, 
  setScreen, 
  setShowLogoutConfirm, 
  t, 
  isRtl,
  lang,
  setLang
}: any) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const languages = [
    { code: "ar", label: "العربية" },
    { code: "fr", label: "Français" },
    { code: "en", label: "English" }
  ];

  return (
    <AnimatePresence>
      {showSidebar && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSidebar(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div initial={{ x: isRtl ? 300 : -300 }} animate={{ x: 0 }} exit={{ x: isRtl ? 300 : -300 }} className={`relative w-72 bg-zinc-950/90 backdrop-blur-2xl border-zinc-900 h-full p-6 flex flex-col shadow-2xl ${isRtl ? 'ml-auto border-r' : 'mr-auto border-l'}`}>
            {/* Brand Logo & Name */}
            <div className="mb-8 flex items-center gap-3 px-1 select-none" dir="ltr">
              <div className="w-10 h-10 bg-gradient-to-tr from-purple-600/20 to-pink-600/20 rounded-full flex items-center justify-center overflow-hidden border border-purple-500/30 p-0 shrink-0 select-none shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                <Logo className="w-full h-full object-cover rounded-full select-none" />
              </div>
              <div className="text-left select-none">
                <h1 className="font-bold tracking-tight leading-none flex flex-col select-none">
                  <span className="text-base select-none font-sans text-white">Smarty<span className="inline-block bg-gradient-to-r from-purple-400 via-pink-400 to-fuchsia-500 bg-clip-text text-transparent font-extrabold select-none">Ai</span></span>
                  <span className="text-[11px] text-zinc-400 font-semibold tracking-wider uppercase mt-1 select-none font-mono">Order</span>
                </h1>
                <p className="text-zinc-500 text-[8px] uppercase tracking-widest mt-1 select-none">Premium SaaS Ecosystem</p>
              </div>
            </div>

            {/* Interactive User Dropdown Button */}
            <div className="relative mb-6">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)} 
                className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-zinc-850 hover:bg-white/[0.04] hover:border-zinc-800 transition-all text-start backdrop-blur-md cursor-pointer"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800/80 overflow-hidden shrink-0">
                    {user?.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="text-zinc-400 w-5 h-5" />}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-extrabold truncate text-xs text-white leading-tight">{user?.displayName || "User"}</h3>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">{user?.email}</p>
                    <div className="mt-1"><span className="text-[8px] text-purple-405 uppercase tracking-widest font-black bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/15">{userData?.planType || 'free'} {t.plan_label}</span></div>
                  </div>
                </div>
                {dropdownOpen ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 mt-2 z-20 bg-zinc-950/95 border border-zinc-850 rounded-2xl p-4 shadow-2xl space-y-4 backdrop-blur-2xl"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2.5 px-1">
                        <Globe className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{t.settings_language}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {languages.map((l) => (
                          <button 
                            key={l.code}
                            onClick={() => { setLang(l.code); }}
                            className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${lang === l.code ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500/30 shadow-md' : 'bg-black/30 text-zinc-500 border-zinc-900 hover:border-zinc-800 hover:text-zinc-350'}`}
                          >
                            {l.code.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-zinc-900" />

                    <button 
                      onClick={() => { 
                        setDropdownOpen(false);
                        setShowSidebar(false); 
                        setShowLogoutConfirm(true); 
                      }} 
                      className="w-full flex items-center justify-center gap-2.5 p-3 rounded-2xl text-red-500 hover:bg-red-500/10 active:bg-red-500/20 font-bold transition-all text-xs cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> 
                      <span>{t.logout_button}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1 space-y-1.5">
              <button 
                onClick={() => { setScreen("dashboard"); setShowSidebar(false); }} 
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer border ${
                  screen === 'dashboard' 
                    ? 'bg-gradient-to-r from-purple-600/15 to-indigo-600/15 border-purple-550/30 text-white font-extrabold shadow-[0_0_20px_rgba(168,85,247,0.1)]' 
                    : 'border-transparent text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 animate-pulse" /> 
                <span className="text-sm font-bold">{t.nav_dashboard}</span>
              </button>

              <button 
                onClick={() => { setScreen("products"); setShowSidebar(false); }} 
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer border ${
                  screen === 'products' 
                    ? 'bg-gradient-to-r from-purple-600/15 to-indigo-600/15 border-purple-550/30 text-white font-extrabold shadow-[0_0_20px_rgba(168,85,247,0.1)]' 
                    : 'border-transparent text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200'
                }`}
              >
                <Package className="w-5 h-5" /> 
                <span className="text-sm font-bold">{t.nav_inventory}</span>
              </button>

              <button 
                onClick={() => { setScreen("subscription"); setShowSidebar(false); }} 
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer border ${
                  screen === 'subscription' 
                    ? 'bg-gradient-to-r from-purple-600/15 to-indigo-600/15 border-purple-550/30 text-white font-extrabold shadow-[0_0_20px_rgba(168,85,247,0.1)]' 
                    : 'border-transparent text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200'
                }`}
              >
                <CreditCard className="w-5 h-5" /> 
                <span className="text-sm font-bold">{t.sub_upgrade}</span>
              </button>

              {user?.email === "12benabdallah@gmail.com" && (
                <button 
                  onClick={() => { setScreen("admin"); setShowSidebar(false); }} 
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer border ${
                    screen === 'admin' 
                      ? 'bg-gradient-to-r from-purple-600/15 to-indigo-600/15 border-purple-550/30 text-white font-extrabold shadow-[0_0_20px_rgba(168,85,247,0.1)]' 
                      : 'border-transparent text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" /> 
                  <span className="text-sm font-bold">{t.admin_title}</span>
                </button>
              )}
            </div>
            
            {/* Elegant empty footer design to balance layout spacing */}
            <div className="mt-auto pt-6 text-center">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">
                SmartyAi Order &copy; 2026
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
