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
  Filter
} from "lucide-react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  where 
} from "firebase/firestore";
import { db } from "../lib/firebase";

export default function AdminDashboard({ t, isRtl, setScreen }: any) {
  const [activeTab, setActiveTab] = useState<"users" | "requests">("requests");
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const qUsers = query(collection(db, "users"), orderBy("email", "asc"));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

    return () => {
      unsubUsers();
      unsubReqs();
    };
  }, []);

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
      alert(t.admin_approve_success || "Request approved and plan updated!");
    } catch (err) {
      alert(t.admin_approve_error || "Error approving request");
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
      alert(t.admin_reject_success || "Request rejected.");
    } catch (err) {
      alert(t.admin_reject_error || "Error rejecting request");
    }
  };

  const handleChangePlan = async (userId: string, newPlan: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        planType: newPlan
      });
      alert(t.admin_update_success || "Plan updated successfully!");
    } catch (err) {
      alert(t.admin_update_error || "Error updating plan");
    }
  };

  const filteredUsers = users.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 pb-20 w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen("dashboard")} className={`p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 ${isRtl ? 'rotate-180' : ''}`}>
            <ArrowRight className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-blue-500" /> {t.admin_title}
          </h2>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <CreditCard className="w-4 h-4" /> {t.admin_requests} ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button 
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Users className="w-4 h-4" /> {t.admin_users} ({users.length})
        </button>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2rem] overflow-hidden min-h-[400px]">
        {activeTab === "requests" ? (
          <div className="divide-y divide-zinc-800/50">
            {requests.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">No requests found</div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600/20 to-purple-600/20 border border-white/5 flex items-center justify-center font-bold text-blue-400 capitalize">
                         {req.userEmail?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-white">{req.userEmail}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
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

                  <div className="flex items-center gap-3">
                    <a 
                      href={req.receiptUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all flex items-center gap-2"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                    
                    {req.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleReject(req)}
                          className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                        >
                          <X className="w-4 h-4" /> {t.admin_reject}
                        </button>
                        <button 
                          onClick={() => handleApprove(req)}
                          className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" /> {t.admin_approve}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
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
              {filteredUsers.map(user => (
                <div key={user.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-400">
                        {user.email?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-200">{user.email}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{user.planType} • {user.orderCounter} orders</p>
                      </div>
                   </div>

                   <div className="flex gap-2">
                     {['free', 'basic', 'professional', 'business', 'enterprise'].map(p => (
                       <button 
                         key={p}
                         onClick={() => handleChangePlan(user.id, p)}
                         className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${user.planType === p ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                       >
                         {p}
                       </button>
                     ))}
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
