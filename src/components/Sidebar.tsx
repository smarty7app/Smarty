import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, CreditCard, Settings as SettingsIcon, LogOut, User, Globe, ShieldCheck } from "lucide-react";
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
          <motion.div initial={{ x: isRtl ? 300 : -300 }} animate={{ x: 0 }} exit={{ x: isRtl ? 300 : -300 }} className={`relative w-72 bg-zinc-900 border-zinc-800 h-full p-6 flex flex-col ${isRtl ? 'ml-auto border-r' : 'mr-auto border-l'}`}>
            {/* Brand Logo & Name */}
            <div className="mb-8 flex items-center gap-3 px-1">
              <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center crystal-button p-1.5 border border-zinc-700">
                <Logo className="w-full h-full text-blue-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight glow-text leading-none">{t.title}</h1>
                <p className="text-zinc-600 text-[8px] uppercase tracking-widest mt-0.5">Premium Dashboard</p>
              </div>
            </div>

            <div className="mb-10 flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 overflow-hidden shrink-0">
                {user?.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="text-zinc-400 w-6 h-6" />}
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold truncate text-sm">{user?.displayName}</h3>
                <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                <div className="mt-1"><span className="text-[8px] text-blue-400 uppercase tracking-widest font-bold bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-500/20">{userData?.planType || 'free'} {t.plan_label}</span></div>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <button onClick={() => { setScreen("dashboard"); setShowSidebar(false); }} className={`w-full flex items-center gap-3 p-3 rounded-2xl ${screen === 'dashboard' ? 'bg-white text-black' : 'text-zinc-400 hover:bg-zinc-800'}`}><LayoutDashboard className="w-5 h-5" /> <span className="font-medium text-sm">{t.nav_dashboard}</span></button>
              <button onClick={() => { setScreen("subscription"); setShowSidebar(false); }} className={`w-full flex items-center gap-3 p-3 rounded-2xl ${screen === 'subscription' ? 'bg-white text-black' : 'text-zinc-400 hover:bg-zinc-800'}`}><CreditCard className="w-5 h-5" /> <span className="font-medium text-sm">{t.sub_upgrade}</span></button>
              <button onClick={() => { setScreen("settings"); setShowSidebar(false); }} className={`w-full flex items-center gap-3 p-3 rounded-2xl ${screen === 'settings' ? 'bg-white text-black' : 'text-zinc-400 hover:bg-zinc-800'}`}><SettingsIcon className="w-5 h-5" /> <span className="font-medium text-sm">{t.settings_courier_config}</span></button>
              {user?.email === "12benabdallah@gmail.com" && (
                <button onClick={() => { setScreen("admin"); setShowSidebar(false); }} className={`w-full flex items-center gap-3 p-3 rounded-2xl ${screen === 'admin' ? 'bg-white text-black' : 'text-zinc-400 hover:bg-zinc-800'}`}>
                  <ShieldCheck className="w-5 h-5" /> 
                  <span className="font-medium text-sm">{t.admin_title}</span>
                </button>
              )}
            </div>
            
            {/* Language Selection in Sidebar */}
            <div className="mt-auto pt-6 border-t border-zinc-800 mb-4">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Globe className="w-4 h-4 text-zinc-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t.settings_language}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {languages.map((l) => (
                  <button 
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${lang === l.code ? 'bg-white text-black border-white' : 'bg-black/30 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
                  >
                    {l.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => { setShowSidebar(false); setShowLogoutConfirm(true); }} className="w-full flex items-center gap-3 p-3 rounded-2xl text-red-500 hover:bg-red-500/10 font-bold"><LogOut className="w-5 h-5" /> <span className="text-sm">{t.logout_button}</span></button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
