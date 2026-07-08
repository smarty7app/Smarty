import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Users, 
  CreditCard, 
  Check, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  ExternalLink,
  Search,
  Filter,
  Eye,
  Copy,
  Ban,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  where,
  deleteDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";

export default function AdminDashboard({ t, isRtl, setScreen }: any) {
  const [activeTab, setActiveTab] = useState<"users" | "requests" | "support">("requests");
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [selectedAttachmentUrl, setSelectedAttachmentUrl] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Custom visual feedback states for iframe compatibility
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string, onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    // Automatically dismiss toast after 4s
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => {
      setCopiedEmail(null);
    }, 2000);
  };

  const getUserDetails = (userObj: any, fallbackName?: string, fallbackEmail?: string) => {
    const email = userObj?.email || fallbackEmail || "";
    const name = userObj?.displayName || userObj?.storeSettings?.storeName || userObj?.name || fallbackName || email.split('@')[0] || "User";
    const photo = userObj?.photoURL || userObj?.storeSettings?.storeLogo || "";
    return { name, email, photo };
  };

  useEffect(() => {
    const qUsers = query(collection(db, "users"));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const mapped = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      mapped.sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.lastBillingDate ? new Date(a.lastBillingDate).getTime() : 0);
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.lastBillingDate ? new Date(b.lastBillingDate).getTime() : 0);
        return timeB - timeA;
      });
      setUsers(mapped);
    }, (error) => {
      console.error("Users listener permission error:", error);
    });

    const qReqs = query(collection(db, "subscription_requests"), orderBy("createdAt", "desc"));
    const unsubReqs = onSnapshot(qReqs, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Requests listener permission error:", error);
      setLoading(false);
    });

    const qSupport = query(collection(db, "support_messages"), orderBy("createdAt", "desc"));
    const unsubSupport = onSnapshot(qSupport, (snap) => {
      setSupportMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Support listener permission error:", error);
    });

    return () => {
      unsubUsers();
      unsubReqs();
      unsubSupport();
    };
  }, []);

  const handleDeleteMessage = (messageId: string) => {
    setConfirmModal({
      message: isRtl ? "هل أنت متأكد من حذف هذه الرسالة؟" : "Are you sure you want to delete this message?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "support_messages", messageId));
          showToast(isRtl ? "تم حذف الرسالة بنجاح" : "Message deleted successfully", "success");
        } catch (err) {
          console.error("Error deleting message:", err);
          showToast(isRtl ? "خلل أثناء محاولة الحذف" : "Error deleting message", "error");
        }
      }
    });
  };

  const handleApprove = async (request: any) => {
    try {
      await updateDoc(doc(db, "subscription_requests", request.id), {
        status: "approved",
        approvedAt: new Date()
      });
      await updateDoc(doc(db, "users", request.userId), {
        planType: request.requestedPlan,
        subscriptionStatus: "active"
      });
      showToast(t.admin_approve_success || "Request approved and plan updated!", "success");
    } catch (err) {
      showToast(t.admin_approve_error || "Error approving request", "error");
    }
  };

  const handleReject = async (request: any) => {
    try {
      await updateDoc(doc(db, "subscription_requests", request.id), {
        status: "rejected",
        rejectedAt: new Date()
      });
      await updateDoc(doc(db, "users", request.userId), {
        subscriptionStatus: "active" // Reset status
      });
      showToast(t.admin_reject_success || "Request rejected.", "info");
    } catch (err) {
      showToast(t.admin_reject_error || "Error rejecting request", "error");
    }
  };

  const handleChangePlan = async (userId: string, newPlan: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        planType: newPlan,
        subscriptionStatus: "active"
      });
      
      // Also automatically approve any pending subscription requests for this user if they exist
      const pendingUserReqs = requests.filter(r => r.userId === userId && r.status === 'pending');
      for (const req of pendingUserReqs) {
        await updateDoc(doc(db, "subscription_requests", req.id), {
          status: "approved",
          approvedAt: new Date()
        });
      }

      showToast(t.admin_update_success || "Plan updated successfully!", "success");
    } catch (err) {
      showToast(t.admin_update_error || "Error updating plan", "error");
    }
  };

  const handleToggleBan = (userId: string, currentBannedStatus: boolean, userEmail: string) => {
    if (userEmail === "12benabdallah@gmail.com" || userEmail === "smarty7.app@gmail.com") {
      showToast(isRtl ? "لا يمكن حظر حساب المشرف الرئيسي" : "Cannot ban primary admin account", "error");
      return;
    }
    const message = currentBannedStatus 
      ? (isRtl ? `هل أنت متأكد من إلغاء حظر المستخدم ${userEmail}؟` : `Are you sure you want to unban user ${userEmail}?`)
      : (isRtl ? `هل أنت متأكد من حظر المستخدم ${userEmail} من دخول التطبيق؟` : `Are you sure you want to ban user ${userEmail} from accessing the app?`);
    
    setConfirmModal({
      message,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, "users", userId), {
            isBanned: !currentBannedStatus
          });
          showToast(isRtl ? "تم تحديث حالة الحظر بنجاح" : "Ban status updated successfully!", "success");
        } catch (err) {
          console.error("Error updating ban status:", err);
          showToast(isRtl ? "حدث خطأ أثناء تعديل حالة الحظر" : "Error changing ban status", "error");
        }
      }
    });
  };

  const filteredUsers = users.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen("dashboard")} className={`p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800 transition-all cursor-pointer ${isRtl ? 'rotate-180' : ''}`}>
            <ArrowRight className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="text-blue-500 animate-pulse" /> {t.admin_title}
          </h2>
        </div>
      </div>

      <div className="flex gap-1.5 p-1.5 bg-zinc-950/80 border border-zinc-900 rounded-2xl w-fit backdrop-blur-md">
        <button 
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'requests' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/15' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <CreditCard className="w-4 h-4" /> {t.admin_requests} ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button 
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'users' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/15' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Users className="w-4 h-4" /> {t.admin_users} ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab("support")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'support' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/15' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Filter className="w-4 h-4" /> {isRtl ? "الدعم التقني" : "Tech Support"} ({supportMessages.length})
        </button>
      </div>

      <div className="glass-panel rounded-[2rem] overflow-hidden min-h-[400px]">
        {activeTab === "requests" ? (
          <div className="divide-y divide-zinc-800/50">
            {requests.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">No requests found</div>
            ) : (
              requests.map(req => {
                const reqUser = users.find(u => u.id === req.userId || u.email?.toLowerCase() === req.userEmail?.toLowerCase());
                const { name: userName, email: userEmail, photo: userPhoto } = getUserDetails(reqUser, "", req.userEmail);
                return (
                  <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-zinc-850 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                          {userPhoto ? (
                            <img src={userPhoto} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="font-bold text-zinc-400 uppercase text-lg">
                              {userName?.[0] || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <p className="font-extrabold text-sm text-white leading-none">{userName}</p>
                            <div className="flex items-center gap-1.5">
                              <p className="font-mono text-xs leading-none text-zinc-400">{userEmail}</p>
                              <button
                                onClick={() => handleCopyEmail(userEmail)}
                                className="p-1 rounded bg-zinc-800/40 hover:bg-zinc-700/60 text-zinc-500 hover:text-white transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                                title={isRtl ? "نسخ البريد الإلكتروني" : "Copy email"}
                              >
                                {copiedEmail === userEmail ? (
                                  <Check className="w-3 h-3 text-green-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                            {req.createdAt?.toDate?.().toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                         <span className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                           {req.requestedPlan}
                         </span>
                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                           req.status === 'approved' ? 'bg-green-500/10 text-green-500' : 
                           req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
                         }`}>
                           {req.status}
                         </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {req.receiptUrl && (
                        <div 
                          onClick={() => setSelectedReceiptUrl(req.receiptUrl)} 
                          className="w-14 h-14 rounded-2xl border border-zinc-800 overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all bg-black/40 flex items-center justify-center shrink-0 group relative shadow-md"
                          title={isRtl ? "انقر لعرض الملصق" : "Click to view receipt"}
                        >
                          {req.receiptUrl.startsWith("data:image/") || !req.receiptUrl.includes("placeholder-receipt.com") ? (
                            <>
                              <img src={req.receiptUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-350" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </>
                          ) : (
                            <span className="text-[9px] text-zinc-500 font-bold uppercase">CCP</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {req.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleReject(req)}
                              className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <X className="w-4 h-4" /> {t.admin_reject}
                            </button>
                            <button 
                              onClick={() => handleApprove(req)}
                              className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <Check className="w-4 h-4" /> {t.admin_approve}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : activeTab === "users" ? (
          <div className="p-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search users..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-3">
              {filteredUsers.map(user => {
                const { name: userName, email: userEmail, photo: userPhoto } = getUserDetails(user);
                return (
                  <div key={user.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-zinc-850 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                          {userPhoto ? (
                            <img src={userPhoto} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="font-bold text-zinc-400 uppercase text-lg">
                              {userName?.[0] || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <p className="font-extrabold text-sm text-white leading-none">{userName}</p>
                            <div className="flex items-center gap-1.5">
                              <p className="font-mono text-xs leading-none text-zinc-400">{userEmail}</p>
                              <button
                                onClick={() => handleCopyEmail(userEmail)}
                                className="p-1 rounded bg-zinc-800/40 hover:bg-zinc-700/60 text-zinc-500 hover:text-white transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                                title={isRtl ? "نسخ البريد الإلكتروني" : "Copy email"}
                              >
                                {copiedEmail === userEmail ? (
                                  <Check className="w-3 h-3 text-green-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-550 uppercase tracking-widest mt-1.5">{user.planType} • {user.orderCounter} orders</p>
                        </div>
                     </div>

                     <div className="flex flex-wrap items-center gap-2">
                       <div className="flex gap-1 bg-zinc-900/60 p-1 rounded-xl border border-white/5">
                         {['free', 'basic', 'professional', 'business', 'enterprise'].map(p => (
                           <button 
                             key={p}
                             onClick={() => handleChangePlan(user.id, p)}
                             className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${user.planType === p ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
                           >
                             {p}
                           </button>
                         ))}
                       </div>

                       <button
                         onClick={() => handleToggleBan(user.id, !!user.isBanned, userEmail)}
                         className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                           user.isBanned 
                             ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20' 
                             : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                         }`}
                         title={user.isBanned ? (isRtl ? "إلغاء الحظر" : "Unban") : (isRtl ? "حظر" : "Ban")}
                       >
                         <Ban className="w-3.5 h-3.5" />
                         <span>{user.isBanned ? (isRtl ? "إلغاء الحظر" : "Unban") : (isRtl ? "حظر" : "Ban")}</span>
                       </button>
                     </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 divide-y divide-zinc-800/50">
            {supportMessages.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 font-semibold text-sm">
                {isRtl ? "لا توجد رسائل دعم فني حالياً" : "No support messages found"}
              </div>
            ) : (
              supportMessages.map(msg => {
                const msgUser = users.find(u => u.email?.toLowerCase() === msg.email?.toLowerCase());
                const { name: userName, email: userEmail, photo: userPhoto } = getUserDetails(msgUser, msg.name, msg.email);
                return (
                  <div key={msg.id} className="py-6 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:bg-white/[0.005] transition-colors rounded-2xl p-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-850 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                          {userPhoto ? (
                            <img src={userPhoto} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="font-bold text-zinc-400 uppercase text-sm">
                              {userName?.[0] || 'S'}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-sm leading-none">{userName}</p>
                            <span className="text-[9px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-bold uppercase tracking-widest">
                              {isRtl ? "تذكرة نشطة" : "Active Ticket"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <p className="text-xs text-zinc-500 font-mono leading-none">{userEmail}</p>
                            <button
                              onClick={() => handleCopyEmail(userEmail)}
                              className="p-1 rounded bg-zinc-800/40 hover:bg-zinc-700/60 text-zinc-500 hover:text-white transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                              title={isRtl ? "نسخ البريد الإلكتروني" : "Copy email"}
                            >
                              {copiedEmail === userEmail ? (
                                  <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                  <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl whitespace-pre-line text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed font-sans select-text max-w-ful border-white/5">
                        {msg.message}
                      </div>

                      {msg.attachment && (
                        <div className="mt-2.5">
                          <p className="text-[10px] text-zinc-550 uppercase tracking-widest font-bold mb-1.5">{isRtl ? "الصورة المرفقة" : "Attached Image"}</p>
                          <div 
                            onClick={() => setSelectedAttachmentUrl(msg.attachment)}
                            className="relative inline-block overflow-hidden rounded-xl border border-white/5 bg-black/40 hover:border-blue-500/50 cursor-pointer transition-all group max-w-xs"
                          >
                            <img 
                              src={msg.attachment} 
                              alt="Support Attachment" 
                              className="max-h-36 object-contain rounded-xl hover:scale-105 transition-all duration-300"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                              <span className="text-xs text-white font-bold tracking-wide">{isRtl ? "اضغط للتكبير" : "Click to enlarge"}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                         <span className="text-[10px] text-zinc-500 font-mono">
                           {msg.createdAt?.toDate?.() ? msg.createdAt.toDate().toLocaleString() : new Date().toLocaleString()}
                         </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-start">
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="px-3.5 py-2 bg-red-500/10 text-red-500 border border-red-500/25 rounded-xl font-bold text-xs hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                        title={isRtl ? "حذف التذكرة" : "Delete Ticket"}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{isRtl ? "حذف" : "Delete"}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Receipt Modal Viewer */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in text-right" dir={isRtl ? "rtl" : "ltr"}>
          <div className="relative max-w-2xl w-full bg-zinc-950 border border-zinc-850 rounded-[2.5rem] p-6 flex flex-col max-h-[90vh] shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
              <h3 className="font-bold text-lg text-white">
                {isRtl ? "ملصق الدفع / إيصال التحويل" : "Payment Receipt / CCP Voucher"}
              </h3>
              <button 
                onClick={() => setSelectedReceiptUrl(null)}
                className="p-2 bg-zinc-900 border border-zinc-850 hover:border-zinc-700 rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/20 rounded-2xl mt-4">
              {selectedReceiptUrl.startsWith("data:image/") || !selectedReceiptUrl.includes("placeholder-receipt.com") ? (
                <img 
                  src={selectedReceiptUrl} 
                  alt="Receipt" 
                  className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-8 text-zinc-500 font-mono">
                  <p className="font-bold">{isRtl ? "الملصق التجريبي لإيصال التحويل:" : "Demo placeholder transfer receipt:"}</p>
                  <p className="text-xs break-all text-blue-400 mt-2">{selectedReceiptUrl}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900 mt-4">
              <a 
                href={selectedReceiptUrl}
                download="payment_receipt.png"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl font-bold text-xs transition-all border border-zinc-800 flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isRtl ? "فتح في نافذة جديدة" : "Open in New Tab"}</span>
              </a>
              <button 
                onClick={() => setSelectedReceiptUrl(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                {isRtl ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Message Attachment Viewer */}
      {selectedAttachmentUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in text-right" dir={isRtl ? "rtl" : "ltr"}>
          <div className="relative max-w-2xl w-full bg-zinc-950 border border-zinc-850 rounded-[2.5rem] p-6 flex flex-col max-h-[90vh] shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
              <h3 className="font-bold text-lg text-white">
                {isRtl ? "الصورة المرفقة مع تذكرة الدعم" : "Attached Support Screenshot"}
              </h3>
              <button 
                onClick={() => setSelectedAttachmentUrl(null)}
                className="p-2 bg-zinc-900 border border-zinc-850 hover:border-zinc-700 rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/20 rounded-2xl mt-4">
              <img 
                src={selectedAttachmentUrl} 
                alt="Support Attachment Full" 
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900 mt-4">
              <a 
                href={selectedAttachmentUrl}
                download="support_screenshot.png"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl font-bold text-xs transition-all border border-zinc-800 flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isRtl ? "فتح في نافذة جديدة" : "Open in New Tab"}</span>
              </a>
              <button 
                onClick={() => setSelectedAttachmentUrl(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                {isRtl ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Alert Overlay */}
      {toast && (
        <div className={`fixed bottom-6 ${isRtl ? 'left-6' : 'right-6'} z-[100] max-w-sm w-full bg-slate-950/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center gap-3`} dir={isRtl ? "rtl" : "ltr"}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
            toast.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> :
             toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </div>
          <p className="text-xs font-semibold text-white flex-1">{toast.message}</p>
          <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-white transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Custom Non-blocking Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm text-center" dir={isRtl ? "rtl" : "ltr"}>
          <div className="max-w-sm w-full bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-white/5 flex items-center justify-center mx-auto text-blue-400 mb-4 animate-pulse">
              <Info className="w-6 h-6" />
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed mb-6">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-red-600/10"
              >
                {isRtl ? "تأكيد" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
