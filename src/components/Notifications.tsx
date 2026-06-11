import { useState, useEffect } from "react";
import { Bell, X, Info, CheckCircle2, AlertTriangle, AlertCircle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  limit,
  serverTimestamp
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: any;
  actionUrl?: string;
  userId: string;
}

export function NotificationBell({ t, isRtl }: { t: any, isRtl: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(docs);
    });

    return () => unsubscribe();
  }, []);

  const markAllAsRead = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const unread = notifications.filter(n => !n.read);
    const promises = unread.map(n => 
      updateDoc(doc(db, "notifications", n.id), { read: true })
    );
    await Promise.all(promises);
  };

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "error": return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            // Optional: mark all as read when opening? 
            // Better to let user click or mark individually
          }
        }}
        className="p-2.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-all relative group"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bounce-subtle' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-4 ring-black shadow-lg">
            {unreadCount > 9 ? "+9" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`absolute top-full mt-3 w-80 sm:w-96 glass-panel overflow-hidden z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${isRtl ? 'left-0' : 'right-0'}`}
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-400" />
                  {t.notifications_title}
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
                    >
                      {t.mark_as_read}
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center text-zinc-600">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-10" />
                    <p className="text-xs">{t.no_notifications}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={`p-4 hover:bg-white/[0.02] transition-colors cursor-default relative group ${!notif.read ? 'bg-purple-500/[0.03]' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${
                            notif.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
                            notif.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                            notif.type === 'error' ? 'bg-rose-500/10 border-rose-500/20' :
                            'bg-blue-500/10 border-blue-500/20'
                          }`}>
                            {getTypeIcon(notif.type)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-xs font-bold ${notif.read ? 'text-zinc-300' : 'text-white'}`}>
                                {notif.title}
                              </h4>
                              {!notif.read && (
                                <button 
                                  onClick={() => markAsRead(notif.notifId || notif.id)}
                                  className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1 cursor-pointer"
                                  title="Mark as read"
                                />
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-relaxed">
                              {notif.message}
                            </p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[9px] text-zinc-600 font-mono">
                                {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString() : new Date().toLocaleString()}
                              </span>
                              {notif.actionUrl && (
                                <a 
                                  href={notif.actionUrl}
                                  className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold"
                                >
                                  {isRtl ? 'عرض المصدر' : 'View Source'}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
