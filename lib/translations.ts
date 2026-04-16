export type LanguageCode = 'ar' | 'en' | 'fr' | 'zh';

export interface Translations {
  // General
  app_name: string;
  settings: string;
  dark_mode: string;
  language: string;
  save: string;
  cancel: string;
  back: string;
  about: string;
  version: string;
  
  // Languages names
  arabic: string;
  english: string;
  french: string;
  chinese: string;
  
  // Messages
  language_changed: string;
  
  // Reminders
  add_reminder: string;
  active_reminders: string;
  no_active_reminders: string;
  completed_recently: string;
  clear_all: string;
  new_reminder: string;
  what_to_remember: string;
  save_reminder: string;
  search_placeholder: string;
  search_reminders_placeholder: string;
  all_alerts: string;
  snooze: string;
  location: string;
  event_time: string;
  remind_before: string;
  next_alert: string;
  
  // Smart features
  smart_suggestions: string;
  smart_completion: string;
  smart_analysis: string;
  smart_analysis_desc: string;
  suggested_message: string;
  confidence: string;
  details: string;
  
  // Priority
  priority: string;
  priority_low: string;
  priority_medium: string;
  priority_high: string;
  priority_critical: string;
  
  // Recurring
  recurring: string;
  once: string;
  hourly: string;
  daily: string;
  weekly: string;
  
  // Reminder info
  remind_at: string;
  
  // Settings sections
  system_preferences: string;
  notifications: string;
  privacy_security: string;
  
  // Voice & Assistant
  tap_to_speak: string;
  voice_listen_success: string;
  premium_assistant: string;
  logout: string;
  
  // Footer
  footer_copyright: string;
}

export const translations: Record<LanguageCode, Translations> = {
  ar: {
    // General
    app_name: "Smarty",
    settings: "الإعدادات",
    dark_mode: "الوضع الليلي",
    language: "اللغة",
    save: "حفظ",
    cancel: "إلغاء",
    back: "رجوع",
    about: "عن التطبيق",
    version: "الإصدار",
    
    // Languages names
    arabic: "العربية",
    english: "الإنجليزية",
    french: "الفرنسية",
    chinese: "الصينية",
    
    // Messages
    language_changed: "تم تغيير اللغة",
        
    // Reminders
    add_reminder: "إضافة تذكير",
    active_reminders: "التذكيرات النشطة",
    no_active_reminders: "لا توجد تذكيرات نشطة",
    completed_recently: "المنتهية مؤخراً",
    clear_all: "مسح الكل",
    new_reminder: "تذكير جديد",
    what_to_remember: "ماذا تريد أن نتذكر؟ (مثلاً: موعد الطبيب غداً)",
    save_reminder: "حفظ التذكير",
    search_placeholder: "البحث في التذكيرات...",
    search_reminders_placeholder: "بحث في التذكيرات...",
    all_alerts: "جميع التنبيهات",
    snooze: "غفوة",
    location: "الموقع",
    event_time: "وقت الحدث",
    remind_before: "تذكير قبل",
    next_alert: "التنبيه القادم",
    
    // Smart features
    smart_suggestions: "اقتراحات ذكية",
    smart_completion: "إكمال ذكي",
    smart_analysis: "تحليل ذكي",
    smart_analysis_desc: "تحليل النصوص لتحديد الوقت تلقائياً",
    suggested_message: "رسالة مقترحة",
    confidence: "مستوى الثقة",
    details: "تفاصيل",
    
    // Priority
    priority: "أولوية",
    priority_low: "منخفضة",
    priority_medium: "متوسطة",
    priority_high: "عالية",
    priority_critical: "حرجة",
    
    // Recurring
    recurring: "التكرار",
    once: "مرة واحدة فقط",
    hourly: "كل ساعة",
    daily: "يومياً",
    weekly: "أسبوعياً",
    
    // Reminder info
    remind_at: "سيتم تذكيرك في:",
    
    // Settings sections
    system_preferences: "تفضيلات النظام",
    notifications: "الإشعارات",
    privacy_security: "الخصوصية والأمان",
    
    // Voice & Assistant
    tap_to_speak: "اضغط للتحدث مع المساعد الذكي",
    voice_listen_success: "✅ تم الاستماع: \"{{text}}\"\n(سيتم ربطه بالذكاء الاصطناعي قريباً)",
    premium_assistant: "Premium Assistant",
    logout: 'تسجيل الخروج',
    // Footer
    footer_copyright: "Smarty AI Reminder"
  },
  
  en: {
    // General
    app_name: "Smarty",
    settings: "Settings",
    dark_mode: "Dark Mode",
    language: "Language",
    save: "Save",
    cancel: "Cancel",
    back: "Back",
    about: "About",
    version: "Version",
    
    // Languages names
    arabic: "Arabic",
    english: "English",
    french: "French",
    chinese: "Chinese",
    
    // Messages
    language_changed: "Language changed, please restart the app",
    
    // Reminders
    add_reminder: "Add Reminder",
    active_reminders: "Active Reminders",
    no_active_reminders: "No active reminders",
    completed_recently: "Recently Completed",
    clear_all: "Clear All",
    new_reminder: "New Reminder",
    what_to_remember: "What do you want to remember? (e.g., Doctor appointment tomorrow)",
    save_reminder: "Save Reminder",
    search_placeholder: "Search reminders...",
    search_reminders_placeholder: "Search reminders...",
    all_alerts: "All Alerts",
    snooze: "Snooze",
    location: "Location",
    event_time: "Event Time",
    remind_before: "Remind Before",
    next_alert: "Next Alert",
    
    // Smart features
    smart_suggestions: "Smart Suggestions",
    smart_completion: "Smart Completion",
    smart_analysis: "Smart Analysis",
    smart_analysis_desc: "Analyze text to set time automatically",
    suggested_message: "Suggested Message",
    confidence: "Confidence",
    details: "Details",
    
    // Priority
    priority: "Priority",
    priority_low: "Low",
    priority_medium: "Medium",
    priority_high: "High",
    priority_critical: "Critical",
    
    // Recurring
    recurring: "Recurring",
    once: "Once only",
    hourly: "Hourly",
    daily: "Daily",
    weekly: "Weekly",
    
    // Reminder info
    remind_at: "You will be reminded at:",
    
    // Settings sections
    system_preferences: "System Preferences",
    notifications: "Notifications",
    privacy_security: "Privacy & Security",
    
    // Voice & Assistant
    tap_to_speak: "Tap to speak with smart assistant",
    voice_listen_success: "✅ Heard: \"{{text}}\"\n(Will be connected to AI soon)",
    premium_assistant: "Premium Assistant",
    logout: 'Logout', 
    // Footer
    footer_copyright: "Smarty AI Reminder"
  },
  
  fr: {
    // General
    app_name: "Smarty",
    settings: "Paramètres",
    dark_mode: "Mode sombre",
    language: "Langue",
    save: "Enregistrer",
    cancel: "Annuler",
    back: "Retour",
    about: "À propos",
    version: "Version",
    
    // Languages names
    arabic: "Arabe",
    english: "Anglais",
    french: "Français",
    chinese: "Chinois",
    
    // Messages
    language_changed: "Langue modifiée, veuillez redémarrer l'application",
    
    // Reminders
    add_reminder: "Ajouter un rappel",
    active_reminders: "Rappels actifs",
    no_active_reminders: "Aucun rappel actif",
    completed_recently: "Récemment terminés",
    clear_all: "Tout effacer",
    new_reminder: "Nouveau rappel",
    what_to_remember: "Que voulez-vous retenir ? (ex: RDV médecin demain)",
    save_reminder: "Enregistrer le rappel",
    search_placeholder: "Rechercher des rappels...",
    search_reminders_placeholder: "Rechercher des rappels...",
    all_alerts: "Toutes les alertes",
    snooze: "Rappel plus tard",
    location: "Emplacement",
    event_time: "Heure de l'événement",
    remind_before: "Rappeler avant",
    next_alert: "Prochaine alerte",
    
    // Smart features
    smart_suggestions: "Suggestions intelligentes",
    smart_completion: "Complétion intelligente",
    smart_analysis: "Analyse intelligente",
    smart_analysis_desc: "Analyser le texte pour régler l'heure automatiquement",
    suggested_message: "Message suggéré",
    confidence: "Confiance",
    details: "Détails",
    
    // Priority
    priority: "Priorité",
    priority_low: "Basse",
    priority_medium: "Moyenne",
    priority_high: "Haute",
    priority_critical: "Critique",
    
    // Recurring
    recurring: "Récurrence",
    once: "Une seule fois",
    hourly: "Toutes les heures",
    daily: "Quotidiennement",
    weekly: "Hebdomadairement",
    
    // Reminder info
    remind_at: "Vous serez rappelé à :",
    
    // Settings sections
    system_preferences: "Préférences système",
    notifications: "Notifications",
    privacy_security: "Confidentialité et sécurité",
    
    // Voice & Assistant
    tap_to_speak: "Appuyez pour parler à l'assistant intelligent",
    voice_listen_success: "✅ Écoute : \"{{text}}\"\n(Bientôt connecté à l'IA)",
    premium_assistant: "Assistant Premium",
    logout: 'Déconnexion',
    // Footer
    footer_copyright: "Smarty AI Rappel"
  },
  
  zh: {
    // General
    app_name: "Smarty",
    settings: "设置",
    dark_mode: "夜间模式",
    language: "语言",
    save: "保存",
    cancel: "取消",
    back: "返回",
    about: "关于",
    version: "版本",
    
    // Languages names
    arabic: "阿拉伯语",
    english: "英语",
    french: "法语",
    chinese: "中文",
    
    // Messages
    language_changed: "语言已更改，请重启应用",
    
    // Reminders
    add_reminder: "添加提醒",
    active_reminders: "活跃提醒",
    no_active_reminders: "没有活跃的提醒",
    completed_recently: "最近完成",
    clear_all: "全部清除",
    new_reminder: "新提醒",
    what_to_remember: "你想记住什么？（例如：明天看医生）",
    save_reminder: "保存提醒",
    search_placeholder: "搜索提醒...",
    search_reminders_placeholder: "搜索提醒...",
    all_alerts: "所有提醒",
    snooze: "稍后提醒",
    location: "地点",
    event_time: "活动时间",
    remind_before: "提前提醒",
    next_alert: "下次提醒",
    
    // Smart features
    smart_suggestions: "智能建议",
    smart_completion: "智能完成",
    smart_analysis: "智能分析",
    smart_analysis_desc: "分析文本以自动设置时间",
    suggested_message: "建议消息",
    confidence: "置信度",
    details: "详情",
    
    // Priority
    priority: "优先级",
    priority_low: "低",
    priority_medium: "中",
    priority_high: "高",
    priority_critical: "紧急",
    
    // Recurring
    recurring: "重复",
    once: "仅一次",
    hourly: "每小时",
    daily: "每天",
    weekly: "每周",
    
    // Reminder info
    remind_at: "您将在以下时间收到提醒：",
    
    // Settings sections
    system_preferences: "系统偏好设置",
    notifications: "通知",
    privacy_security: "隐私与安全",
    
    // Voice & Assistant
    tap_to_speak: "点击与智能助手对话",
    voice_listen_success: "✅ 已听到：\"{{text}}\"\n(即将连接人工智能)",
    premium_assistant: "高级助手",
    logout: '退出',
    
    // Footer
    footer_copyright: "Smarty AI 提醒"
  }
};
