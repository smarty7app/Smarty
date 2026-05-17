/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Download, Send, ImagePlus, Loader2, User as UserIcon, 
  X, Menu, Settings, MessageSquare, Plus, MoreVertical, Pencil, 
  Trash, Globe, Sun, Moon, Check, LogOut, Copy, CheckCheck, 
  AlertCircle, Info, WifiOff 
} from "lucide-react";
import { SmartyLogo } from "./components/SmartyLogo";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import LandingPage from "./components/LandingPage";
import SubscriptionModal from "./components/SubscriptionModal";
import PaymentModal from "./components/PaymentModal";
import { sendMessageStream, Message } from "./lib/gemini";
import { auth, db } from "./lib/firebase";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User 
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";

type Language = 'ar' | 'en' | 'fr';

// ==================== الترجمات ====================
const translations = {
  ar: {
    newChat: "محادثة جديدة",
    recentHistory: "السجل الأخير",
    noHistory: "لا توجد محادثات سابقة بعد",
    settings: "الإعدادات",
    editName: "تعديل الاسم",
    delete: "حذف",
    deleteConfirm: "هل أنت متأكد من حذف هذه المحادثة؟",
    cancel: "إلغاء",
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
    generatingImage: "جاري العمل على صورتك...",
    quotaError: "لقد تجاوزت حد الاستخدام المسموح به. يرجى المحاولة لاحقاً.",
    limitError: "لقد استهلكت جميع محاولات إنتاج الصور المجانية (4). يرجى الاشتراك للمتابعة.",
    logout: "تسجيل الخروج",
    profile: "الملف الشخصي",
    aiPowered: "ذكاء مدعوم بالذكاء الاصطناعي",
    copy: "نسخ",
    copied: "تم النسخ!",
    connectionError: "خطأ في الاتصال. تأكد من اتصالك بالإنترنت.",
    sessionLoaded: "تم تحميل المحادثة",
    sessionDeleted: "تم حذف المحادثة",
    sessionRenamed: "تم تعديل الاسم",
    upgradeSuccess: "تم الترقية بنجاح!",
    confirmDelete: "تأكيد الحذف"
  },
  en: {
    newChat: "New Chat",
    recentHistory: "Recent History",
    noHistory: "No previous chats yet",
    settings: "Settings",
    editName: "Edit Name",
    delete: "Delete",
    deleteConfirm: "Are you sure you want to delete this chat?",
    cancel: "Cancel",
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
    limitError: "You have consumed all your free image generation attempts (4). Please subscribe to continue.",
    logout: "Logout",
    profile: "Profile",
    aiPowered: "AI Powered Intelligence",
    copy: "Copy",
    copied: "Copied!",
    connectionError: "Connection error. Please check your internet.",
    sessionLoaded: "Chat loaded",
    sessionDeleted: "Chat deleted",
    sessionRenamed: "Name updated",
    upgradeSuccess: "Upgrade successful!",
    confirmDelete: "Confirm Delete"
  },
  fr: {
    newChat: "Nouvelle discussion",
    recentHistory: "Historique récent",
    noHistory: "Pas encore de discussions",
    settings: "Paramètres",
    editName: "Modifier le nom",
    delete: "Supprimer",
    deleteConfirm: "Voulez-vous vraiment supprimer cette discussion ?",
    cancel: "Annuler",
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
    language: "Langue",
    zoom: "Zoom",
    download: "Télécharger",
    theme: "Thème",
    dark: "Sombre",
    light: "Clair",
    thinking: "Réflexion...",
    generatingImage: "Création de votre image...",
    quotaError: "Vous avez dépassé votre limite d'utilisation. Veuillez réessayer plus tard.",
    limitError: "Vous avez consommé toutes vos tentatives de génération d'images gratuites (4). Veuillez vous abonner pour continuer.",
    logout: "Déconnexion",
    profile: "Profil",
    aiPowered: "Intelligence Propulsée par l'IA",
    copy: "Copier",
    copied: "Copié !",
    connectionError: "Erreur de connexion. Vérifiez votre internet.",
    sessionLoaded: "Discussion chargée",
    sessionDeleted: "Discussion supprimée",
    sessionRenamed: "Nom modifié",
    upgradeSuccess: "Abonnement réussi !",
    confirmDelete: "Confirmer la suppression"
  }
};

// ==================== أنواع البيانات ====================
interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

// ==================== مكون الإشعارات ====================
const Toast = ({ message, onClose, isDarkMode }: { message: ToastMessage; onClose: () => void; isDarkMode: boolean }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: isDarkMode ? 'bg-green-600' : 'bg-green-500',
    error: isDarkMode ? 'bg-red-600' : 'bg-red-500',
    info: isDarkMode ? 'bg-blue-600' : 'bg-blue-500',
    warning: isDarkMode ? 'bg-yellow-600' : 'bg-yellow-500'
  }[message.type];

  const Icon = {
    success: CheckCheck,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle
  }[message.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className={`fixed top-20 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl ${bgColor} text-white`}
    >
      <Icon size={20} />
      <span className="text-sm font-medium">{message.text}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100">
        <X size={16} />
      </button>
    </motion.div>
  );
};

// ==================== التطبيق الرئيسي ====================
export default function App() {
  // حالة المستخدم
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // حالة المحادثة
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  
  // حالة الشريط الجانبي
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // حالة الإعدادات
  const [lang, setLang] = useState<Language>('ar');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // حالة الاشتراك والدفع
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<{id: string, name: string, price: string} | null>(null);
  
  // حالة عامة
  const [hasApiKey, setHasApiKey] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const t = translations[lang];

  // ==================== دوال مساعدة ====================
  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, text }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // ==================== PWA ====================
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        showToast("تم تثبيت التطبيق بنجاح", "success");
      }
    }
  };

  // ==================== مراقبة الاتصال ====================
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("تم استعادة الاتصال بالإنترنت", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast(t.connectionError, "error");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [t.connectionError, showToast]);

  // ==================== المصادقة ====================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const initialData = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              subscriptionStatus: 'free',
              subscriptionExpiresAt: null,
              generationsCount: 0,
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, initialData);
            setUserData(initialData);
          } else {
            setUserData(userSnap.data());
          }
        } catch (error) {
          console.error("Firestore error:", error);
          showToast("حدث خطأ في مزامنة البيانات", "error");
        }
      } else {
        setUserData(null);
        setHistory([]);
        setMessages([]);
        setActiveSessionId(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [showToast]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showToast("تم تسجيل الدخول بنجاح", "success");
    } catch (error: any) {
      if (!['auth/cancelled-popup-request', 'auth/popup-closed-by-user'].includes(error.code)) {
        console.error("Login failed", error);
        showToast("فشل تسجيل الدخول، حاول مرة أخرى", "error");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast("تم تسجيل الخروج", "info");
    } catch (error) {
      console.error("Logout failed", error);
      showToast("حدث خطأ أثناء تسجيل الخروج", "error");
    }
  };

  // ==================== إدارة المحادثات المحلية ====================
  useEffect(() => {
    const savedHistory = localStorage.getItem('chat_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }

    const savedLang = localStorage.getItem('chat_lang') as Language;
    if (savedLang && ['ar', 'en', 'fr'].includes(savedLang)) {
      setLang(savedLang);
    }

    const savedTheme = localStorage.getItem('chat_theme');
    if (savedTheme === 'light') setIsDarkMode(false);
    else if (savedTheme === 'dark') setIsDarkMode(true);
  }, []);

  // حفظ المحادثات في localStorage مع ضغط تلقائي
  useEffect(() => {
    if (history.length === 0) return;

    const trySave = (data: ChatSession[]): boolean => {
      try {
        localStorage.setItem('chat_history', JSON.stringify(data));
        return true;
      } catch (e) {
        return false;
      }
    };

    if (!trySave(history)) {
      console.warn("Storage quota exceeded, compacting history...");
      const compacted = history.map(session => ({
        ...session,
        messages: session.messages.map(msg => ({
          ...msg,
          image: undefined,
          file: undefined
        }))
      }));
      if (trySave(compacted)) {
        setHistory(compacted);
      } else {
        const minimal = compacted.slice(0, 10);
        if (trySave(minimal)) setHistory(minimal);
        else localStorage.removeItem('chat_history');
      }
    }
  }, [history]);

  // ==================== دوال الإعدادات ====================
  const changeLang = useCallback((l: Language) => {
    setLang(l);
    localStorage.setItem('chat_lang', l);
    showToast(`اللغة: ${l.toUpperCase()}`, "info");
  }, [showToast]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
    localStorage.setItem('chat_theme', !isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // ==================== إدارة الجلسات ====================
  const groupHistory = useMemo(() => {
    const groups: { [key: string]: ChatSession[] } = { Today: [], Yesterday: [], Previous: [] };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    history.forEach(session => {
      if (session.timestamp >= today) groups.Today.push(session);
      else if (session.timestamp >= yesterday) groups.Yesterday.push(session);
      else groups.Previous.push(session);
    });
    return groups;
  }, [history]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setActiveSessionId(null);
    setIsSidebarOpen(false);
    if (textareaRef.current) textareaRef.current.focus();
  }, []);

  const loadSession = useCallback(async (session: ChatSession) => {
    if (isLoadingSession) return;
    setIsLoadingSession(true);
    setMessages(session.messages);
    setActiveSessionId(session.id);
    setIsSidebarOpen(false);
    setTimeout(() => scrollToBottom(), 100);
    setTimeout(() => setIsLoadingSession(false), 300);
    showToast(t.sessionLoaded, "info");
  }, [scrollToBottom, t.sessionLoaded, showToast, isLoadingSession]);

  const deleteSession = useCallback(async (id: string) => {
    setHistory(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setMessages([]);
      setActiveSessionId(null);
    }
    setActiveDropdownId(null);
    setDeleteConfirmId(null);
    showToast(t.sessionDeleted, "success");
  }, [activeSessionId, t.sessionDeleted, showToast]);

  const startRename = useCallback((session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
    setActiveDropdownId(null);
  }, []);

  const saveRename = useCallback((id: string) => {
    if (editingTitle.trim()) {
      setHistory(prev => prev.map(s => 
        s.id === id ? { ...s, title: editingTitle.trim() } : s
      ));
      showToast(t.sessionRenamed, "success");
    }
    setEditingSessionId(null);
  }, [editingTitle, t.sessionRenamed, showToast]);

  // ==================== إرسال الرسائل ====================
  const handleSendMessageWorkflow = useCallback(async (userMessage: Message) => {
    if (!isOnline) {
      showToast(t.connectionError, "error");
      return;
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const newId = Date.now().toString();
      currentSessionId = newId;
      const newSession: ChatSession = {
        id: newId,
        title: userMessage.text.substring(0, 30) + (userMessage.text.length > 30 ? '...' : ''),
        timestamp: Date.now(),
        messages: [userMessage]
      };
      setHistory(prev => [newSession, ...prev.slice(0, 49)]);
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
      let hasIncremented = false;
      
      setMessages(prev => [...prev, { role: 'model', text: "", status: 'thinking' }]);
      scrollToBottom();
      
      const stream = sendMessageStream(newMessages, userMessage.text, userMessage.image);
      
      for await (const chunk of stream) {
        if (chunk.text) fullResponse += chunk.text;
        if (chunk.image) modelImage = chunk.image;
        
        setMessages(prev => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (next[lastIndex].role === 'model') {
            const updatedMsg = { ...next[lastIndex], text: fullResponse };
            if (chunk.image) updatedMsg.image = chunk.image;
            if (chunk.status) updatedMsg.status = chunk.status as any;
            next[lastIndex] = updatedMsg;
          }
          return next;
        });

        if (chunk.image && user && !hasIncremented) {
          hasIncremented = true;
          const userRef = doc(db, 'users', user.uid);
          updateDoc(userRef, { generationsCount: increment(1) }).catch(err => {
            console.error("Failed to update count:", err);
          });
          setUserData((prev: any) => ({
            ...prev,
            generationsCount: (prev?.generationsCount || 0) + 1
          }));
        }
        scrollToBottom();
      }

      const finalBotMessage: Message = { role: 'model', text: fullResponse, image: modelImage };
      setHistory(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messages: [...newMessages, finalBotMessage], timestamp: Date.now() } 
          : s
      ));
    } catch (error) {
      console.error(error);
      const isQuotaError = error instanceof Error && error.message.toLowerCase().includes('quota');
      const isPermissionError = error instanceof Error && (
        error.message.toLowerCase().includes('permission') || 
        error.message.toLowerCase().includes('403') ||
        error.message.includes('Permission Denied')
      );
      
      let errorMsg = t.errorMessage;
      if (isQuotaError) errorMsg = t.quotaError;
      if (isPermissionError) errorMsg = t.permissionError;

      setMessages(prev => [...prev, { role: 'model', text: errorMsg }]);
      showToast(errorMsg, "error");
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [messages, activeSessionId, user, isOnline, t, showToast, scrollToBottom]);

  const handleSend = useCallback(async (text: string, image?: { data: string; mimeType: string }) => {
    const imageKeywords = ['صورة', 'صمم', 'أنشئ', 'صوره', 'image', 'picture', 'generate', 'draw', 'ارسم'];
    const isLikelyImageRequest = imageKeywords.some(k => text.toLowerCase().includes(k));

    if (isLikelyImageRequest && userData?.subscriptionStatus === 'free' && (userData?.generationsCount || 0) >= 4) {
      setIsSubscriptionModalOpen(true);
      showToast(t.limitError, "warning");
      return;
    }

    const userMessage: Message = { role: 'user', text, image };
    await handleSendMessageWorkflow(userMessage);
  }, [userData, t.limitError, handleSendMessageWorkflow, showToast]);

  const handleSendFile = useCallback(async (text: string, file: { data: string; mimeType: string; name: string }) => {
    const userMessage: Message = { role: 'user', text, file } as Message;
    await handleSendMessageWorkflow(userMessage);
  }, [handleSendMessageWorkflow]);

  // ==================== الاشتراك والدفع ====================
  const handleSelectPlan = useCallback((planId: string) => {
    if (!user) return;
    const planDetails = {
      starter: { ar: { name: 'باقة Pro', price: '400' }, en: { name: 'Pro Plan', price: '400' } },
      pro: { ar: { name: 'باقة Ultra', price: '700' }, en: { name: 'Ultra Plan', price: '700' } }
    }[planId as 'starter' | 'pro'];
    if (planDetails) {
      setSelectedPlanForPayment({
        id: planId,
        name: planDetails[lang === 'ar' ? 'ar' : 'en'].name,
        price: planDetails[lang === 'ar' ? 'ar' : 'en'].price
      });
      setIsPaymentModalOpen(true);
    }
  }, [user, lang]);

  const handlePaymentSuccess = useCallback(async () => {
    if (!user || !selectedPlanForPayment) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        subscriptionStatus: selectedPlanForPayment.id,
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      setUserData((prev: any) => ({ ...prev, subscriptionStatus: selectedPlanForPayment.id }));
      setIsPaymentModalOpen(false);
      setIsSubscriptionModalOpen(false);
      setSelectedPlanForPayment(null);
      showToast(t.upgradeSuccess, "success");
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء الترقية", "error");
    }
  }, [user, selectedPlanForPayment, t.upgradeSuccess, showToast]);

  // ==================== إغلاق القوائم ====================
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdownId(null);
      setIsSettingsOpen(false);
      setDeleteConfirmId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // ==================== التمرير التلقائي ====================
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ==================== حالة التحميل ====================
  if (authLoading) {
    return (
      <div className={`h-screen w-full flex items-center justify-center ${isDarkMode ? 'bg-[#0d0f12]' : 'bg-white'}`}>
        <Loader2 size={40} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <LandingPage 
        onLogin={handleLogin} 
        isLoggingIn={isLoggingIn}
        lang={lang} 
        isDarkMode={isDarkMode} 
        onInstall={handleInstall}
        showInstall={!isStandalone}
        onLanguageChange={changeLang}
      />
    );
  }

  // ==================== عرض التطبيق الرئيسي ====================
  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-[#0d0f12] text-white' : 'bg-[#FAFAFA] text-slate-900'} font-sans selection:bg-orange-500/10 transition-all duration-300 ${isDarkMode ? 'dark' : ''}`} dir="rtl">
      {/* الإشعارات */}
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast} onClose={() => removeToast(toast.id)} isDarkMode={isDarkMode} />
        ))}
      </AnimatePresence>

      {/* مؤشر عدم الاتصال */}
      {!isOnline && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
          <WifiOff size={16} />
          <span>لا يوجد اتصال بالإنترنت</span>
        </div>
      )}

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          x: isSidebarOpen ? 0 : '100%',
          width: isSidebarOpen ? '320px' : '0px'
        }}
        className={`fixed lg:relative top-0 right-0 h-full bg-[#13161c] text-white z-[70] overflow-hidden flex flex-col border-l border-white/[0.06] shadow-2xl transition-colors duration-300`}
      >
        <div className="p-4 flex flex-col h-full w-[300px]">
          <div className="flex items-center gap-2 mb-8 px-2">
            <SmartyLogo size={32} />
            <h1 className="text-xl font-bold select-none">Smarty AI</h1>
          </div>

          <button 
            onClick={startNewChat}
            className="flex items-center justify-center gap-2 w-full p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl transition-all shadow-lg active:scale-95 mb-6"
          >
            <Plus size={20} />
            <span className="font-bold select-none">{t.newChat}</span>
          </button>
          
          <div className="flex-1 overflow-y-auto px-2 space-y-8 custom-scrollbar pr-1">
            {history.length === 0 ? (
              <div className="py-20 text-center opacity-20 border-2 border-dashed border-white/10 rounded-[2.5rem]">
                <MessageSquare className="mx-auto mb-4" size={32} />
                <p className="text-[10px] uppercase tracking-[0.2em] font-black">{t.noHistory}</p>
              </div>
            ) : (
              Object.entries(groupHistory).map(([title, sessions]) => sessions.length > 0 && (
                <div key={title} className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/30 mb-2 px-3">
                    {lang === 'ar' ? (title === 'Today' ? 'اليوم' : title === 'Yesterday' ? 'أمس' : 'السابق') : title}
                  </p>
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div key={session.id} className="relative group/session">
                        {editingSessionId === session.id ? (
                          <div className="px-4 py-3 bg-white/[0.04] rounded-2xl border border-white/20">
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
                            className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all cursor-pointer group hover:bg-white/[0.04] ${activeSessionId === session.id ? 'bg-white/10 ring-1 ring-white/10 shadow-inner' : ''}`}
                            role="button"
                            tabIndex={0}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${activeSessionId === session.id ? 'bg-orange-500 text-white' : 'bg-white/[0.04] text-white/20 group-hover:bg-white/10 group-hover:text-white/40'}`}>
                              <MessageSquare size={14} />
                            </div>
                            <span className={`text-[13px] font-bold truncate flex-1 select-none ${activeSessionId === session.id ? 'text-white' : 'text-white/40'} group-hover:text-white transition-colors`}>
                              {session.title}
                            </span>
                            
                            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === session.id ? null : session.id);
                                }}
                                className="p-2 hover:bg-white/10 rounded-xl text-white/30 hover:text-white transition-colors"
                              >
                                <MoreVertical size={14} />
                              </button>

                              <AnimatePresence>
                                {activeDropdownId === session.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} mt-2 w-44 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-3xl`}
                                  >
                                    <button
                                      onClick={(e) => startRename(session, e)}
                                      className="flex items-center gap-3 w-full px-4 py-3 text-xs font-black uppercase tracking-widest text-white/60 hover:bg-white/[0.04] hover:text-white transition-colors"
                                    >
                                      <Pencil size={12} />
                                      <span>{t.editName}</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(session.id);
                                      }}
                                      className="flex items-center gap-3 w-full px-4 py-3 text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                                    >
                                      <Trash size={12} />
                                      <span>{t.delete}</span>
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        )}
                        
                        {/* نافذة تأكيد الحذف */}
                        <AnimatePresence>
                          {deleteConfirmId === session.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className={`p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                                <h3 className="text-lg font-bold mb-2">{t.confirmDelete}</h3>
                                <p className="text-sm opacity-70 mb-6">{t.deleteConfirm}</p>
                                <div className="flex gap-3 justify-end">
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-medium"
                                  >
                                    {t.cancel}
                                  </button>
                                  <button
                                    onClick={() => deleteSession(session.id)}
                                    className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium"
                                  >
                                    {t.delete}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-6 border-t border-white/[0.06] mt-auto relative">
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={`absolute bottom-full mb-4 w-full ${lang === 'ar' ? 'right-0' : 'left-0'} bg-slate-900 border border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-[80] overflow-hidden p-3 backdrop-blur-3xl`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mb-4 px-2">{t.language}</p>
                    <div className="flex gap-2">
                      {['ar', 'en', 'fr'].map((code) => (
                        <button
                          key={code}
                          onClick={() => changeLang(code as Language)}
                          className={`flex-1 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all border ${
                            lang === code 
                              ? 'bg-white border-white text-black' 
                              : 'bg-white/[0.04] border-white/[0.06] text-white/40 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {code.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-[1px] bg-white/[0.04] my-2 mx-4" />

                  <div className="p-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mb-4 px-2">{t.theme}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => !isDarkMode && toggleDarkMode()}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all border ${
                          isDarkMode 
                            ? 'bg-white border-white text-black' 
                            : 'bg-white/[0.04] border-white/[0.06] text-white/40 hover:text-white'
                        }`}
                      >
                        <Moon size={14} />
                        <span>{t.dark}</span>
                      </button>
                      <button
                        onClick={() => isDarkMode && toggleDarkMode()}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all border ${
                          !isDarkMode 
                            ? 'bg-white border-white text-black' 
                            : 'bg-white/[0.04] border-white/[0.06] text-white/40 hover:text-white'
                        }`}
                      >
                        <Sun size={14} />
                        <span>{t.light}</span>
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-white/[0.04] my-2 mx-4" />
                  
                  <div className="p-3">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full p-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <LogOut size={14} />
                      <span>{t.logout}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsOpen(!isSettingsOpen);
              }}
              className={`flex items-center gap-4 w-full p-4 rounded-[2.5rem] transition-all border border-white/[0.06] ${isSettingsOpen ? 'bg-white/10 text-white' : 'bg-white/[0.04] text-white/40 hover:text-white hover:bg-white/10'}`}
            >
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                <img 
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=f97316&color=fff`} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 text-right overflow-hidden">
                <p className="text-[13px] font-black truncate leading-none mb-1.5">{user?.displayName}</p>
                <p className="text-[9px] opacity-30 font-black uppercase tracking-widest truncate">{user?.email}</p>
              </div>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isSettingsOpen ? 'bg-white text-black' : 'bg-white/[0.04]'}`}>
                <Settings size={14} />
              </div>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Content */}
      <div className={`flex-1 flex flex-col h-full relative overflow-hidden ${isDarkMode ? 'bg-[#0d0f12]' : 'bg-[#FDFDFD]'}`}>
        {/* Header */}
        <header className={`flex-shrink-0 flex items-center justify-between px-4 h-16 backdrop-blur-md border-b sticky top-0 z-50 transition-colors ${isDarkMode ? 'bg-[#13161c]/80 border-white/[0.07]' : 'bg-white/80 border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} lg:hidden`}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
               <SmartyLogo size={32} className="sm:hidden" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {userData?.subscriptionStatus === 'free' && (
               <button 
                 onClick={() => setIsSubscriptionModalOpen(true)}
                 className="group relative flex items-center gap-3 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-[0_15px_30px_rgba(249,115,22,0.3)] transition-all active:scale-95 overflow-hidden"
               >
                 <span className="relative z-10 select-none">{lang === 'ar' ? 'ترقية الخطة' : 'Upgrade Plan'}</span>
                 <span className="relative z-10 opacity-60 font-black ml-1 bg-black/20 px-2 py-1 rounded-lg select-none">{(userData?.generationsCount || 0)}/4</span>
                 <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-white/20 to-orange-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
               </button>
             )}
             <div className={`hidden lg:flex items-center gap-3 px-5 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'bg-white/[0.04] border-white/10 text-white/40' : 'bg-slate-50 border-slate-200 text-slate-400 font-mono'}`}>
                <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-white/20'}`} />
                <span>{hasApiKey ? 'Imagen 4 Ultra' : 'Gemini Flash 3.1'}</span>
             </div>
          </div>
        </header>

        {/* Chat Area */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar ${isDarkMode ? 'scrollbar-color-slate-800' : ''}`}>
          <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center text-center py-20 md:py-32"
                >
                  <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t.welcomeTitle}
                  </h2>
                  <p className="text-slate-500 text-lg md:text-xl max-w-sm mb-12">
                    {t.welcomeSubtitle}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                    {t.prompts.map((item, idx) => (
                      <motion.button
                        key={item.text}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + idx * 0.1 }}
                        onClick={() => handleSend(item.text)}
                        className={`p-6 rounded-2xl border text-right transition-all hover:scale-[1.02] active:scale-[0.98] ${
                          isDarkMode 
                            ? 'bg-slate-900 border-white/[0.07] hover:border-orange-500/30' 
                            : 'bg-white border-slate-100 hover:shadow-lg'
                        }`}
                      >
                        <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.text}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-6 max-w-3xl mx-auto">
                  {isLoadingSession && (
                    <div className="flex justify-center py-4">
                      <Loader2 size={24} className="animate-spin text-orange-500" />
                    </div>
                  )}
                  {messages.map((msg, index) => (
                    <ChatMessage 
                      key={index} 
                      role={msg.role} 
                      text={msg.text} 
                      image={msg.image} 
                      file={msg.file}
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
            <div className={`absolute -inset-1 rounded-[2rem] blur group-focus-within:opacity-100 opacity-0 transition duration-500 ${isDarkMode ? 'bg-orange-500/20' : 'bg-gradient-to-r from-orange-100 to-amber-100'}`}></div>
            <div className="relative">
              <ChatInput 
                onSend={handleSend} 
                onSendFile={handleSendFile}
                isLoading={isLoading} 
                t={{ placeholder: t.placeholder, delete: t.delete }} 
                lang={lang}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
          <div className={`flex items-center justify-center gap-3 mt-4 text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            <p>{t.poweredBy}</p>
            <span className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-300'}`}></span>
            <p>{t.copyright}</p>
          </div>
        </footer>
      </div>
      
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
