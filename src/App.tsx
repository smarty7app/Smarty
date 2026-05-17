/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Smarty AI - Fixed Version
 * - يعمل بدون Firebase (وضع Demo)
 * - يعمل مع Gemini API مباشرة
 * - دعم كامل للعربية والإنجليزية والفرنسية
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send, Menu, Settings, MessageSquare, Plus, MoreVertical,
  Pencil, Trash, Sun, Moon, LogOut, Loader2, User as UserIcon,
  AlertCircle, Key, CheckCircle
} from "lucide-react";
import { SmartyLogo } from "./components/SmartyLogo";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import LandingPage from "./components/LandingPage";
import SubscriptionModal from "./components/SubscriptionModal";
import PaymentModal from "./components/PaymentModal";
import { sendMessageStream, Message } from "./lib/gemini";
import { auth, db, isFirebaseConfigured } from "./lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User
} from "firebase/auth";
import {
  doc, getDoc, setDoc, serverTimestamp, updateDoc, increment
} from "firebase/firestore";

type Language = 'ar' | 'en' | 'fr';

const translations = {
  ar: {
    newChat: "محادثة جديدة",
    recentHistory: "السجل الأخير",
    noHistory: "لا توجد محادثات سابقة بعد",
    settings: "الإعدادات",
    editName: "تعديل الاسم",
    delete: "حذف",
    poweredBy: "مدعوم بواسطة Smarty AI Core",
    copyright: "حقوق الطبع والنشر © 2026",
    welcomeTitle: "Smarty AI",
    welcomeSubtitle: "كيف يمكنني مساعدتك ؟",
    placeholder: "أرسل صورة منتجك أو اطلب إعلاناً الآن...",
    prompts: [
      { text: "صمم لي صورة احترافية لمنتجي" },
      { text: "اكتب لي نص إعلاني جذاب لزيادة المبيعات" },
      { text: "حلل لي السوق والمنافسين في قطاعي" },
      { text: "كيف يمكنني تحسين ظهور منتجاتي للعملاء؟" }
    ],
    errorMessage: "عذراً، حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.",
    permissionError: "خطأ في التصريح: يرجى التحقق من مفتاح API في الإعدادات.",
    language: "اللغة",
    zoom: "تكبير",
    download: "تحميل",
    theme: "المظهر",
    dark: "داكن",
    light: "فاتح",
    thinking: "جاري التفكير...",
    generatingImage: "جاري إنشاء صورتك...",
    quotaError: "لقد تجاوزت حد الاستخدام. يرجى المحاولة لاحقاً.",
    limitError: "لقد استهلكت جميع محاولات إنتاج الصور المجانية (4). يرجى الاشتراك للمتابعة.",
    logout: "تسجيل الخروج",
    profile: "الملف الشخصي",
    apiKeyLabel: "مفتاح Gemini API",
    apiKeyPlaceholder: "AIza...",
    apiKeySave: "حفظ المفتاح",
    apiKeyStatus: "حالة المفتاح",
    apiKeySet: "مفتاح مُعيَّن ✓",
    apiKeyNotSet: "لم يُعيَّن بعد",
    apiKeyHelp: "احصل على مفتاحك من",
    demoMode: "وضع Demo (بدون تسجيل دخول)",
    continueAsGuest: "المتابعة كضيف",
  },
  en: {
    newChat: "New Chat",
    recentHistory: "Recent History",
    noHistory: "No previous chats yet",
    settings: "Settings",
    editName: "Edit Name",
    delete: "Delete",
    poweredBy: "Powered by Smarty AI Core",
    copyright: "Copyright © 2026",
    welcomeTitle: "Smarty AI",
    welcomeSubtitle: "How can I help you?",
    placeholder: "Send a product photo or request an ad now...",
    prompts: [
      { text: "Design a pro photo for my product" },
      { text: "Write an engaging ad to boost sales" },
      { text: "Analyze market & competitors in my sector" },
      { text: "How can I improve my product visibility?" }
    ],
    errorMessage: "Sorry, an error occurred. Please try again.",
    permissionError: "Permission Denied: Please check your API key in Settings.",
    language: "Language",
    zoom: "Zoom",
    download: "Download",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    thinking: "Thinking...",
    generatingImage: "Working on your image...",
    quotaError: "You have exceeded your usage limit. Please try again later.",
    limitError: "You have consumed all your free image attempts (4). Please subscribe to continue.",
    logout: "Logout",
    profile: "Profile",
    apiKeyLabel: "Gemini API Key",
    apiKeyPlaceholder: "AIza...",
    apiKeySave: "Save Key",
    apiKeyStatus: "Key Status",
    apiKeySet: "Key Set ✓",
    apiKeyNotSet: "Not set yet",
    apiKeyHelp: "Get your key from",
    demoMode: "Demo Mode (no login)",
    continueAsGuest: "Continue as Guest",
  },
  fr: {
    newChat: "Nouvelle discussion",
    recentHistory: "Historique récent",
    noHistory: "Pas encore de discussions",
    settings: "Paramètres",
    editName: "Modifier le nom",
    delete: "Supprimer",
    poweredBy: "Propulsé par Smarty AI Core",
    copyright: "Droits d'auteur © 2026",
    welcomeTitle: "Smarty AI",
    welcomeSubtitle: "Comment puis-je vous aider ?",
    placeholder: "Envoyez une photo de produit ou demandez une publicité...",
    prompts: [
      { text: "Concevez une photo pro pour mon produit" },
      { text: "Écrivez une pub engageante pour booster les ventes" },
      { text: "Analysez le marché et les concurrents" },
      { text: "Comment améliorer la visibilité de mon produit ?" }
    ],
    errorMessage: "Désolé, une erreur s'est produite. Veuillez réessayer.",
    permissionError: "Accès refusé. Vérifiez votre clé API dans les paramètres.",
    language: "Langue",
    zoom: "Zoom",
    download: "Télécharger",
    theme: "Thème",
    dark: "Sombre",
    light: "Clair",
    thinking: "Réflexion...",
    generatingImage: "Création de votre image...",
    quotaError: "Vous avez dépassé votre limite. Réessayez plus tard.",
    limitError: "Vous avez consommé toutes vos tentatives gratuites (4). Abonnez-vous pour continuer.",
    logout: "Déconnexion",
    profile: "Profil",
    apiKeyLabel: "Clé API Gemini",
    apiKeyPlaceholder: "AIza...",
    apiKeySave: "Enregistrer la clé",
    apiKeyStatus: "Statut de la clé",
    apiKeySet: "Clé définie ✓",
    apiKeyNotSet: "Pas encore définie",
    apiKeyHelp: "Obtenez votre clé sur",
    demoMode: "Mode Démo (sans connexion)",
    continueAsGuest: "Continuer en tant qu'invité",
  }
};

interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
}

// ====================================================
// وضع Demo: مستخدم وهمي عندما لا يوجد Firebase
// ====================================================
const DEMO_USER = {
  uid: 'demo-user',
  displayName: 'ضيف',
  email: 'guest@smarty.ai',
  photoURL: null,
  subscriptionStatus: 'free',
  generationsCount: 0,
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [lang, setLang] = useState<Language>('ar');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<{ id: string; name: string; price: string } | null>(null);

  // إدارة مفتاح API يدوياً من الواجهة
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [manualApiKey, setManualApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  // ====================================================
  // التحقق من وضع PWA
  // ====================================================
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  // ====================================================
  // تحميل الإعدادات من localStorage
  // ====================================================
  useEffect(() => {
    const savedHistory = localStorage.getItem('smarty_chat_history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { /* تجاهل */ }
    }
    const savedLang = localStorage.getItem('smarty_lang') as Language;
    if (savedLang && ['ar', 'en', 'fr'].includes(savedLang)) setLang(savedLang);

    const savedTheme = localStorage.getItem('smarty_theme');
    if (savedTheme === 'dark') setIsDarkMode(true);

    // تحميل مفتاح API المحفوظ
    const savedApiKey = localStorage.getItem('smarty_gemini_key');
    if (savedApiKey) {
      setManualApiKey(savedApiKey);
      setApiKeyInput(savedApiKey);
      // حقن المفتاح في الـ window لاستخدامه في gemini.ts
      (window as any).__GEMINI_KEY__ = savedApiKey;
    }
  }, []);

  // ====================================================
  // مراقبة حالة المصادقة
  // ====================================================
  useEffect(() => {
    if (!isFirebaseConfigured) {
      // وضع Demo: لا نحتاج مصادقة
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const initialData = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              subscriptionStatus: 'free',
              generationsCount: 0,
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, initialData);
            setUserData(initialData);
          } else {
            setUserData(userSnap.data());
          }
        } catch (error) {
          console.error('Firestore error:', error);
          // في حال فشل Firestore، نستمر مع بيانات أساسية
          setUserData({ subscriptionStatus: 'free', generationsCount: 0 });
        }
      } else {
        setUserData(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ====================================================
  // حفظ مفتاح API يدوياً
  // ====================================================
  const saveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      setManualApiKey(trimmed);
      localStorage.setItem('smarty_gemini_key', trimmed);
      (window as any).__GEMINI_KEY__ = trimmed;
    }
    setShowApiKeyInput(false);
  };

  const hasApiKey = !!(
    (import.meta.env.VITE_GEMINI_API_KEY as string) || manualApiKey
  );

  // ====================================================
  // تسجيل الدخول
  // ====================================================
  const handleLogin = async () => {
    if (!isFirebaseConfigured) {
      setIsDemoMode(true);
      setUserData(DEMO_USER);
      return;
    }
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (!['auth/cancelled-popup-request', 'auth/popup-closed-by-user'].includes(error.code)) {
        console.error("Login failed", error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleContinueAsGuest = () => {
    setIsDemoMode(true);
    setUserData({ ...DEMO_USER, generationsCount: 0 });
  };

  const handleLogout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setUserData(null);
      setMessages([]);
      setHistory([]);
      return;
    }
    try {
      await signOut(auth);
      setMessages([]);
      setHistory([]);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // ====================================================
  // إغلاق القوائم عند النقر خارجها
  // ====================================================
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdownId(null);
      setIsSettingsOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // ====================================================
  // حفظ السجل في localStorage
  // ====================================================
  useEffect(() => {
    if (history.length === 0) return;
    const saveHistory = (data: ChatSession[]) => {
      try {
        localStorage.setItem('smarty_chat_history', JSON.stringify(data));
        return true;
      } catch { return false; }
    };
    if (!saveHistory(history)) {
      // ضغط: إزالة الصور من الجلسات القديمة
      const compact = history.map((s, i) => i > 1
        ? { ...s, messages: s.messages.map(m => ({ ...m, image: undefined })) }
        : s
      );
      if (!saveHistory(compact)) {
        saveHistory(history.slice(0, 5).map(s => ({
          ...s, messages: s.messages.map(m => ({ ...m, image: undefined }))
        })));
      }
    }
  }, [history]);

  const changeLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('smarty_lang', l);
  };

  const toggleDarkMode = () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    localStorage.setItem('smarty_theme', newVal ? 'dark' : 'light');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ====================================================
  // تجميع السجل حسب التاريخ
  // ====================================================
  const groupHistory = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const groups: { [k: string]: ChatSession[] } = { Today: [], Yesterday: [], Previous: [] };
    history.forEach(s => {
      if (s.timestamp >= today) groups.Today.push(s);
      else if (s.timestamp >= yesterday) groups.Yesterday.push(s);
      else groups.Previous.push(s);
    });
    return groups;
  };

  const getGroupLabel = (key: string) =>
    lang === 'ar'
      ? key === 'Today' ? 'اليوم' : key === 'Yesterday' ? 'أمس' : 'السابق'
      : key === 'Today' ? 'Today' : key === 'Yesterday' ? 'Yesterday' : 'Previous';

  // ====================================================
  // إرسال رسالة
  // ====================================================
  const handleSend = async (text: string, image?: { data: string; mimeType: string }) => {
    if (!hasApiKey) {
      setShowApiKeyInput(true);
      return;
    }

    // التحقق من حد الصور المجانية
    const imageKeywords = ['صورة', 'صمم', 'أنشئ', 'انشئ', 'image', 'picture', 'generate', 'draw', 'ارسم'];
    const isImageRequest = imageKeywords.some(k => text.toLowerCase().includes(k));
    const currentUser = isDemoMode ? userData : userData;
    if (isImageRequest && currentUser?.subscriptionStatus === 'free' && (currentUser?.generationsCount || 0) >= 4) {
      setIsSubscriptionModalOpen(true);
      return;
    }

    const userMessage: Message = { role: 'user', text, image };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const newId = Date.now().toString();
      currentSessionId = newId;
      const newSession: ChatSession = {
        id: newId,
        title: text.substring(0, 35) + (text.length > 35 ? '...' : ''),
        timestamp: Date.now(),
        messages: [userMessage]
      };
      setHistory(prev => [newSession, ...prev.slice(0, 19)]);
      setActiveSessionId(newId);
    } else {
      setHistory(prev => prev.map(s =>
        s.id === currentSessionId
          ? { ...s, messages: newMessages, timestamp: Date.now() }
          : s
      ));
    }

    try {
      let fullResponse = "";
      let modelImage: any = null;
      let hasIncrementedCount = false;

      setMessages(prev => [...prev, { role: 'model', text: "", status: 'thinking' }]);

      const stream = sendMessageStream(newMessages, text, image);

      for await (const chunk of stream) {
        if (chunk.text) fullResponse += chunk.text;
        if (chunk.image) modelImage = chunk.image;

        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'model') {
            const updated: Message = { ...last, text: fullResponse };
            if (chunk.image) updated.image = chunk.image;
            if (chunk.status) updated.status = chunk.status as any;
            else delete updated.status;
            next[next.length - 1] = updated;
          }
          return next;
        });

        // زيادة عداد الصور (مرة واحدة فقط)
        if (chunk.image && !hasIncrementedCount) {
          hasIncrementedCount = true;
          if (!isDemoMode && user) {
            try {
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, { generationsCount: increment(1) });
            } catch (e) { console.error('Count update error:', e); }
          }
          setUserData((prev: any) => ({
            ...prev,
            generationsCount: (prev?.generationsCount || 0) + 1
          }));
        }
      }

      // تحديث السجل بالرد النهائي
      const finalMsg: Message = { role: 'model', text: fullResponse, image: modelImage };
      setHistory(prev => prev.map(s =>
        s.id === currentSessionId
          ? { ...s, messages: [...newMessages, finalMsg], timestamp: Date.now() }
          : s
      ));
    } catch (error: any) {
      console.error("Send error:", error);
      setMessages(prev => [...prev, { role: 'model', text: t.errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => { setMessages([]); setActiveSessionId(null); setIsSidebarOpen(false); };
  const loadSession = (session: ChatSession) => { setMessages(session.messages); setActiveSessionId(session.id); setIsSidebarOpen(false); };
  const deleteSession = (id: string, e: React.MouseEvent) => { e.stopPropagation(); setHistory(prev => prev.filter(s => s.id !== id)); setActiveDropdownId(null); };
  const startRename = (session: ChatSession, e: React.MouseEvent) => { e.stopPropagation(); setEditingSessionId(session.id); setEditingTitle(session.title); setActiveDropdownId(null); };
  const saveRename = (id: string) => { setHistory(prev => prev.map(s => s.id === id ? { ...s, title: editingTitle || s.title } : s)); setEditingSessionId(null); };

  const handleSelectPlan = (planId: string) => {
    const plans: Record<string, { ar: { name: string; price: string }; en: { name: string; price: string } }> = {
      starter: { ar: { name: 'المبتدئة', price: '400' }, en: { name: 'Starter', price: '400' } },
      pro: { ar: { name: 'الاحترافية', price: '700' }, en: { name: 'Professional', price: '700' } }
    };
    const plan = plans[planId];
    if (plan) {
      const p = lang === 'ar' ? plan.ar : plan.en;
      setSelectedPlanForPayment({ id: planId, name: p.name, price: p.price });
      setIsPaymentModalOpen(true);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!selectedPlanForPayment) return;
    if (!isDemoMode && user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          subscriptionStatus: selectedPlanForPayment.id,
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      } catch (e) { console.error('Payment update error:', e); }
    }
    setUserData((prev: any) => ({ ...prev, subscriptionStatus: selectedPlanForPayment.id }));
    setIsPaymentModalOpen(false);
    setIsSubscriptionModalOpen(false);
    setSelectedPlanForPayment(null);
  };

  // ====================================================
  // حالة التحميل
  // ====================================================
  if (authLoading) {
    return (
      <div className={`h-screen w-full flex items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <Loader2 size={40} className="animate-spin text-orange-500" />
      </div>
    );
  }

  // ====================================================
  // صفحة الترحيب إذا لم يكن هناك مستخدم
  // ====================================================
  if (!user && !isDemoMode) {
    return (
      <LandingPage
        onLogin={handleLogin}
        isLoggingIn={isLoggingIn}
        lang={lang}
        isDarkMode={isDarkMode}
        onInstall={handleInstall}
        showInstall={!isStandalone}
        onLanguageChange={changeLang}
        onContinueAsGuest={handleContinueAsGuest}
      />
    );
  }

  const currentUser = user || (isDemoMode ? DEMO_USER : null);

  // ====================================================
  // الواجهة الرئيسية
  // ====================================================
  return (
    <div
      className={`flex h-screen ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-[#FAFAFA] text-slate-900'} font-sans selection:bg-orange-500/10 transition-all duration-300`}
      dir="rtl"
    >
      {/* ===== Sidebar Overlay ===== */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ===== Sidebar ===== */}
      <motion.aside
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : '100%', width: isSidebarOpen ? '320px' : '0px' }}
        className="fixed lg:relative top-0 right-0 h-full bg-slate-900 text-white z-[70] overflow-hidden flex flex-col border-l border-white/5 shadow-2xl"
      >
        <div className="p-4 flex flex-col h-full w-[300px]">
          {/* Header */}
          <div className="flex items-center gap-2 mb-8 px-2">
            <SmartyLogo size={32} />
            <h1 className="text-xl font-bold select-none">Smarty AI</h1>
          </div>

          {/* New Chat Button */}
          <button
            onClick={startNewChat}
            className="flex items-center justify-center gap-2 w-full p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl transition-all shadow-lg active:scale-95 mb-6"
          >
            <Plus size={20} />
            <span className="font-bold select-none">{t.newChat}</span>
          </button>

          {/* API Key Status */}
          <div className={`mb-4 px-3 py-2.5 rounded-xl border text-xs flex items-center gap-2 ${hasApiKey
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
            }`}>
            {hasApiKey ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            <span className="font-bold">{hasApiKey ? t.apiKeySet : t.apiKeyNotSet}</span>
            {!hasApiKey && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowApiKeyInput(true); }}
                className="mr-auto text-orange-300 underline hover:text-orange-200"
              >
                إضافة
              </button>
            )}
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto px-2 space-y-8 pr-1">
            {history.length === 0 ? (
              <div className="py-20 text-center opacity-20 border-2 border-dashed border-white/10 rounded-[2.5rem]">
                <MessageSquare className="mx-auto mb-4" size={32} />
                <p className="text-[10px] uppercase tracking-[0.2em] font-black">{t.noHistory}</p>
              </div>
            ) : (
              Object.entries(groupHistory()).map(([groupKey, sessions]) =>
                sessions.length > 0 && (
                  <div key={groupKey} className="space-y-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/30 mb-2 px-3">
                      {getGroupLabel(groupKey)}
                    </p>
                    <div className="space-y-2">
                      {sessions.map((session) => (
                        <div key={session.id} className="relative group/session">
                          {editingSessionId === session.id ? (
                            <div className="px-4 py-3 bg-white/5 rounded-2xl border border-white/20">
                              <input
                                autoFocus
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveRename(session.id);
                                  if (e.key === 'Escape') setEditingSessionId(null);
                                }}
                                onBlur={() => saveRename(session.id)}
                                className="w-full bg-transparent text-sm text-white border-none focus:ring-0 p-0 font-medium"
                                dir="auto"
                              />
                            </div>
                          ) : (
                            <div
                              onClick={() => loadSession(session)}
                              className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all cursor-pointer group hover:bg-white/5 ${activeSessionId === session.id ? 'bg-white/10 ring-1 ring-white/10' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${activeSessionId === session.id ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/20 group-hover:bg-white/10'}`}>
                                <MessageSquare size={14} />
                              </div>
                              <span className={`text-[13px] font-bold truncate flex-1 select-none ${activeSessionId === session.id ? 'text-white' : 'text-white/40'} group-hover:text-white`}>
                                {session.title}
                              </span>
                              <div className="relative opacity-0 group-hover/session:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActiveDropdownId(activeDropdownId === session.id ? null : session.id); }}
                                  className="p-2 hover:bg-white/10 rounded-xl text-white/30 hover:text-white"
                                >
                                  <MoreVertical size={14} />
                                </button>
                                <AnimatePresence>
                                  {activeDropdownId === session.id && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                      className="absolute left-0 mt-2 w-44 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                                    >
                                      <button onClick={(e) => startRename(session, e)} className="flex items-center gap-3 w-full px-4 py-3 text-xs font-black uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-white transition-colors">
                                        <Pencil size={12} /> <span>{t.editName}</span>
                                      </button>
                                      <button onClick={(e) => deleteSession(session.id, e)} className="flex items-center gap-3 w-full px-4 py-3 text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                                        <Trash size={12} /> <span>{t.delete}</span>
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )
            )}
          </div>

          {/* User / Settings Footer */}
          <div className="pt-6 border-t border-white/5 mt-auto relative">
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full mb-4 w-full bg-slate-900 border border-white/10 rounded-3xl shadow-2xl z-[80] overflow-hidden p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Language */}
                  <div className="p-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mb-4 px-2">{t.language}</p>
                    <div className="flex gap-2">
                      {(['ar', 'en', 'fr'] as Language[]).map((code) => (
                        <button key={code} onClick={() => changeLang(code)}
                          className={`flex-1 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all border ${lang === code ? 'bg-white border-white text-black' : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}>
                          {code.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-[1px] bg-white/5 my-2 mx-4" />

                  {/* Theme */}
                  <div className="p-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mb-4 px-2">{t.theme}</p>
                    <div className="flex gap-2">
                      <button onClick={() => !isDarkMode && toggleDarkMode()}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black transition-all border ${isDarkMode ? 'bg-white border-white text-black' : 'bg-white/5 border-white/5 text-white/40'}`}>
                        <Moon size={14} /> <span>{t.dark}</span>
                      </button>
                      <button onClick={() => isDarkMode && toggleDarkMode()}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black transition-all border ${!isDarkMode ? 'bg-white border-white text-black' : 'bg-white/5 border-white/5 text-white/40'}`}>
                        <Sun size={14} /> <span>{t.light}</span>
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-white/5 my-2 mx-4" />

                  {/* API Key Manual Input */}
                  <div className="p-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mb-3 px-2">{t.apiKeyLabel}</p>
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={t.apiKeyPlaceholder}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 mb-2"
                      dir="ltr"
                    />
                    <button onClick={saveApiKey}
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black transition-all">
                      {t.apiKeySave}
                    </button>
                    <p className="text-[10px] text-white/30 mt-2 text-center">
                      {t.apiKeyHelp}{' '}
                      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                        className="text-orange-400 underline">aistudio.google.com</a>
                    </p>
                  </div>

                  <div className="h-[1px] bg-white/5 my-2 mx-4" />

                  {/* Logout */}
                  <div className="p-3">
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 w-full p-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all">
                      <LogOut size={14} /> <span>{t.logout}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }}
              className={`flex items-center gap-4 w-full p-4 rounded-[2.5rem] transition-all border border-white/5 ${isSettingsOpen ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
            >
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={20} className="text-white/50" />
                )}
              </div>
              <div className="flex-1 text-right overflow-hidden">
                <p className="text-[13px] font-black truncate leading-none mb-1.5">{currentUser?.displayName || 'ضيف'}</p>
                <p className="text-[9px] opacity-30 font-black uppercase tracking-widest truncate">
                  {isDemoMode ? t.demoMode : currentUser?.email}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isSettingsOpen ? 'bg-white text-black' : 'bg-white/5'}`}>
                <Settings size={14} />
              </div>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ===== Main Chat Area ===== */}
      <div className={`flex-1 flex flex-col h-full relative overflow-hidden ${isDarkMode ? 'bg-slate-950' : 'bg-[#FDFDFD]'}`}>

        {/* Header */}
        <header className={`flex-shrink-0 flex items-center justify-between px-4 h-16 backdrop-blur-md border-b sticky top-0 z-50 transition-colors ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <SmartyLogo size={28} />
              <span className={`font-black text-lg hidden sm:block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Smarty AI</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Upgrade Button */}
            {userData?.subscriptionStatus === 'free' && (
              <button
                onClick={() => setIsSubscriptionModalOpen(true)}
                className="group relative flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 overflow-hidden"
              >
                <span className="relative z-10 select-none">{lang === 'ar' ? 'ترقية' : 'Upgrade'}</span>
                <span className="relative z-10 opacity-70 bg-black/20 px-1.5 py-0.5 rounded-md text-[10px]">
                  {userData?.generationsCount || 0}/4
                </span>
              </button>
            )}

            {/* API Key Status Badge */}
            <div className={`hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 border-white/10 text-white/40' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-400 animate-pulse'}`} />
              <span>{hasApiKey ? 'Gemini AI ●' : 'No API Key'}</span>
            </div>
          </div>
        </header>

        {/* API Key Modal */}
        <AnimatePresence>
          {showApiKeyInput && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowApiKeyInput(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-md rounded-3xl border p-8 shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                    <Key size={24} className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">{t.apiKeyLabel}</h3>
                    <p className="text-sm opacity-50">{lang === 'ar' ? 'مطلوب لتشغيل الذكاء الاصطناعي' : 'Required to use AI'}</p>
                  </div>
                </div>
                <input
                  autoFocus
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
                  placeholder={t.apiKeyPlaceholder}
                  className={`w-full border rounded-2xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-orange-500 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                  dir="ltr"
                />
                <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.apiKeyHelp}{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-orange-500 underline font-bold">
                    aistudio.google.com
                  </a>
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setShowApiKeyInput(false)}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold border transition-colors ${isDarkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button onClick={saveApiKey}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-sm font-black transition-colors">
                    {t.apiKeySave}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Messages */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center text-center py-20 md:py-32"
                >
                  <SmartyLogo size={80} className="mb-8 opacity-90" />
                  <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t.welcomeTitle}
                  </h2>
                  <p className="text-slate-500 text-lg md:text-xl max-w-sm mb-12">{t.welcomeSubtitle}</p>

                  {!hasApiKey && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                      className="mb-8 flex items-center gap-3 px-6 py-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-500 max-w-md"
                    >
                      <AlertCircle size={20} className="shrink-0" />
                      <p className="text-sm font-medium text-right">
                        {lang === 'ar'
                          ? 'يرجى إضافة مفتاح Gemini API من الإعدادات لبدء استخدام الذكاء الاصطناعي'
                          : 'Please add your Gemini API key in settings to start using AI'}
                      </p>
                      <button onClick={(e) => { e.stopPropagation(); setShowApiKeyInput(true); }}
                        className="shrink-0 px-3 py-1.5 bg-orange-500 text-white text-xs font-black rounded-lg hover:bg-orange-600 transition-colors">
                        {lang === 'ar' ? 'إضافة' : 'Add Key'}
                      </button>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                    {t.prompts.map((item, idx) => (
                      <motion.button
                        key={item.text}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + idx * 0.1 }}
                        onClick={() => handleSend(item.text)}
                        className={`p-6 rounded-2xl border text-right transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-orange-500/30' : 'bg-white border-slate-100 hover:shadow-lg'}`}
                      >
                        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.text}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-6 max-w-3xl mx-auto">
                  {messages.map((msg, index) => (
                    <ChatMessage
                      key={index}
                      role={msg.role}
                      text={msg.text}
                      image={msg.image}
                      status={msg.status}
                      t={{ zoom: t.zoom, download: t.download, thinking: t.thinking, generatingImage: t.generatingImage }}
                      isDarkMode={isDarkMode}
                      isLoading={isLoading && index === messages.length - 1 && msg.role === 'model'}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Area */}
        <footer className="flex-shrink-0 w-full max-w-4xl mx-auto p-4 md:p-6">
          <div className="relative group">
            <div className={`absolute -inset-1 rounded-[2rem] blur group-focus-within:opacity-100 opacity-0 transition duration-500 ${isDarkMode ? 'bg-orange-500/20' : 'bg-gradient-to-r from-orange-100 to-amber-100'}`} />
            <div className="relative">
              <ChatInput
                onSend={handleSend}
                isLoading={isLoading}
                t={{ placeholder: t.placeholder, delete: t.delete }}
                lang={lang}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
          <div className={`flex items-center justify-center gap-3 mt-4 text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            <p>{t.poweredBy}</p>
            <span className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-300'}`} />
            <p>{t.copyright}</p>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        lang={lang}
        isDarkMode={isDarkMode}
        onSelectPlan={handleSelectPlan}
        showLimitReachedMessage={userData?.subscriptionStatus === 'free' && (userData?.generationsCount || 0) >= 4}
      />
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        planName={selectedPlanForPayment?.name || ''}
        planPrice={selectedPlanForPayment?.price || ''}
        lang={lang}
        isDarkMode={isDarkMode}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
