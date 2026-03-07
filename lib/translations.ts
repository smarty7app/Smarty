
export type LanguageCode = 'ar' | 'en' | 'fr' | 'zh';

export interface Translations {
  app_name: string;
  add_reminder: string;
  settings: string;
  dark_mode: string;
  language: string;
  save: string;
  cancel: string;
  arabic: string;
  english: string;
  french: string;
  chinese: string;
  language_changed: string;
  // Additional UI strings that might be needed
  active_reminders: string;
  no_active_reminders: string;
  completed_recently: string;
  clear_all: string;
  new_reminder: string;
  what_to_remember: string;
  smart_suggestions: string;
  smart_completion: string;
  smart_analysis: string;
  remind_at: string;
  priority: string;
  priority_low: string;
  priority_medium: string;
  priority_high: string;
  priority_critical: string;
  recurring: string;
  once: string;
  hourly: string;
  daily: string;
  weekly: string;
  save_reminder: string;
  search_placeholder: string;
  about: string;
  version: string;
  system_preferences: string;
  notifications: string;
  privacy_security: string;
  smart_analysis_desc: string;
  back: string;
  snooze: string;
  location: string;
  confidence: string;
  event_time: string;
  remind_before: string;
  suggested_message: string;
  details: string;
  next_alert: string;
  all_alerts: string;
}

export const translations: Record<LanguageCode, Translations> = {
  ar: {
    app_name: "Smatry",
    add_reminder: "إضافة تذكير",
    settings: "الإعدادات",
    dark_mode: "الوضع الليلي",
    language: "اللغة",
    save: "حفظ",
    cancel: "إلغاء",
    arabic: "العربية",
    english: "الإنجليزية",
    french: "الفرنسية",
    chinese: "الصينية",
    language_changed: "تم تغيير اللغة، يرجى إعادة تشغيل التطبيق",
    active_reminders: "قائمة التذكيرات",
    no_active_reminders: "لا توجد تذكيرات نشطة",
    completed_recently: "المنتهية مؤخراً",
    clear_all: "مسح الكل",
    new_reminder: "تذكير جديد",
    what_to_remember: "ماذا تريد أن نتذكر؟ (مثلاً: موعد الطبيب غداً)",
    smart_suggestions: "اقتراحات ذكية",
    smart_completion: "إكمال ذكي",
    smart_analysis: "تحليل ذكي",
    remind_at: "سيتم تذكيرك في:",
    priority: "أولوية",
    priority_low: "منخفضة",
    priority_medium: "متوسطة",
    priority_high: "عالية",
    priority_critical: "حرجة",
    recurring: "التكرار",
    once: "مرة واحدة فقط",
    hourly: "كل ساعة",
    daily: "يومياً",
    weekly: "أسبوعياً",
    save_reminder: "حفظ التذكير",
    search_placeholder: "البحث في التذكيرات...",
    about: "عن التطبيق",
    version: "الإصدار",
    system_preferences: "تفضيلات النظام",
    notifications: "الإشعارات",
    privacy_security: "الخصوصية والأمان",
    smart_analysis_desc: "تحليل النصوص لتحديد الوقت تلقائياً",
    back: "رجوع",
    snooze: "غفوة",
    location: "الموقع",
    confidence: "مستوى الثقة",
    event_time: "وقت الحدث",
    remind_before: "تذكير قبل",
    suggested_message: "رسالة مقترحة",
    details: "تفاصيل",
    next_alert: "التنبيه القادم",
    all_alerts: "جميع التنبيهات"
  },
  en: {
    app_name: "Smatry",
    add_reminder: "Add Reminder",
    settings: "Settings",
    dark_mode: "Dark Mode",
    language: "Language",
    save: "Save",
    cancel: "Cancel",
    arabic: "Arabic",
    english: "English",
    french: "French",
    chinese: "Chinese",
    language_changed: "Language changed, please restart the app",
    active_reminders: "Reminders List",
    no_active_reminders: "No active reminders",
    completed_recently: "Recently Completed",
    clear_all: "Clear All",
    new_reminder: "New Reminder",
    what_to_remember: "What do you want to remember? (e.g., Doctor appointment tomorrow)",
    smart_suggestions: "Smart Suggestions",
    smart_completion: "Smart Completion",
    smart_analysis: "Smart Analysis",
    remind_at: "You will be reminded at:",
    priority: "Priority",
    priority_low: "Low",
    priority_medium: "Medium",
    priority_high: "High",
    priority_critical: "Critical",
    recurring: "Recurring",
    once: "Once only",
    hourly: "Hourly",
    daily: "Daily",
    weekly: "Weekly",
    save_reminder: "Save Reminder",
    search_placeholder: "Search reminders...",
    about: "About",
    version: "Version",
    system_preferences: "System Preferences",
    notifications: "Notifications",
    privacy_security: "Privacy & Security",
    smart_analysis_desc: "Analyze text to set time automatically",
    back: "Back",
    snooze: "Snooze",
    location: "Location",
    confidence: "Confidence",
    event_time: "Event Time",
    remind_before: "Remind Before",
    suggested_message: "Suggested Message",
    details: "Details",
    next_alert: "Next Alert",
    all_alerts: "All Alerts"
  },
  fr: {
    app_name: "Smatry",
    add_reminder: "Ajouter un rappel",
    settings: "Paramètres",
    dark_mode: "Mode sombre",
    language: "Langue",
    save: "Enregistrer",
    cancel: "Annuler",
    arabic: "Arabe",
    english: "Anglais",
    french: "Français",
    chinese: "Chinois",
    language_changed: "Langue modifiée, veuillez redémarrer l'application",
    active_reminders: "Liste des rappels",
    no_active_reminders: "Aucun rappel actif",
    completed_recently: "Récemment terminés",
    clear_all: "Tout effacer",
    new_reminder: "Nouveau rappel",
    what_to_remember: "Que voulez-vous retenir ? (ex: RDV médecin demain)",
    smart_suggestions: "Suggestions intelligentes",
    smart_completion: "Complétion intelligente",
    smart_analysis: "Analyse intelligente",
    remind_at: "Vous serez rappelé à :",
    priority: "Priorité",
    priority_low: "Basse",
    priority_medium: "Moyenne",
    priority_high: "Haute",
    priority_critical: "Critique",
    recurring: "Récurrence",
    once: "Une seule fois",
    hourly: "Toutes les heures",
    daily: "Quotidiennement",
    weekly: "Hebdomadairement",
    save_reminder: "Enregistrer le rappel",
    search_placeholder: "Rechercher des rappels...",
    about: "À propos",
    version: "Version",
    system_preferences: "Préférences système",
    notifications: "Notifications",
    privacy_security: "Confidentialité et sécurité",
    smart_analysis_desc: "Analyser le texte pour régler l'heure automatiquement",
    back: "Retour",
    snooze: "Rappel plus tard",
    location: "Emplacement",
    confidence: "Confiance",
    event_time: "Heure de l'événement",
    remind_before: "Rappeler avant",
    suggested_message: "Message suggéré",
    details: "Détails",
    next_alert: "Prochaine alerte",
    all_alerts: "Toutes les alertes"
  },
  zh: {
    app_name: "Smatry",
    add_reminder: "添加提醒",
    settings: "设置",
    dark_mode: "夜间模式",
    language: "语言",
    save: "保存",
    cancel: "取消",
    arabic: "阿拉伯语",
    english: "英语",
    french: "法语",
    chinese: "中文",
    language_changed: "语言已更改，请重启应用",
    active_reminders: "提醒列表",
    no_active_reminders: "没有活动的提醒",
    completed_recently: "最近完成",
    clear_all: "全部清除",
    new_reminder: "新提醒",
    what_to_remember: "你想记住什么？（例如：明天看医生）",
    smart_suggestions: "智能建议",
    smart_completion: "智能完成",
    smart_analysis: "智能分析",
    remind_at: "您将在以下时间收到提醒：",
    priority: "优先级",
    priority_low: "低",
    priority_medium: "中",
    priority_high: "高",
    priority_critical: "紧急",
    recurring: "重复",
    once: "仅一次",
    hourly: "每小时",
    daily: "每天",
    weekly: "每周",
    save_reminder: "保存提醒",
    search_placeholder: "搜索提醒...",
    about: "关于",
    version: "版本",
    system_preferences: "系统偏好设置",
    notifications: "通知",
    privacy_security: "隐私与安全",
    smart_analysis_desc: "分析文本以自动设置时间",
    back: "返回",
    snooze: "稍后提醒",
    location: "地点",
    confidence: "置信度",
    event_time: "活动时间",
    remind_before: "提前提醒",
    suggested_message: "建议消息",
    details: "详情",
    next_alert: "下次提醒",
    all_alerts: "所有提醒"
  }
};
