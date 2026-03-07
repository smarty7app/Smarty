'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ErrorLogger, ErrorStats } from '@/lib/error-logger';
import { SystemManager, RegistryStatus } from '@/lib/system-manager';
import { AlertTriangle, Clock, Trash2, ChevronLeft, ShieldCheck, Server, Info, Activity } from 'lucide-react';

interface ErrorStatsScreenProps {
  onBack?: () => void;
}

/**
 * شاشة إحصائيات الأخطاء - نسخة الويب المستوحاة من نسخة أندرويد
 * Error Stats Screen - Web version inspired by the Android implementation
 */
export const ErrorStatsScreen: React.FC<ErrorStatsScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'errors' | 'system'>('errors');
  const [stats, setStats] = useState<ErrorStats | null>(() => 
    typeof window !== 'undefined' ? ErrorLogger.getErrorStats() : null
  );
  const [registries, setRegistries] = useState<RegistryStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkRegistries = useCallback(async () => {
    setIsChecking(true);
    const results = await SystemManager.checkRegistryStatus();
    setRegistries(results);
    setIsChecking(false);
  }, []);

  const handleTabChange = (tab: 'errors' | 'system') => {
    setActiveTab(tab);
    if (tab === 'system' && registries.length === 0) {
      checkRegistries();
    }
  };

  const handleClear = () => {
    if (confirm('هل أنت متأكد من مسح جميع السجلات والإحصائيات؟')) {
      ErrorLogger.clearLogs();
      setStats(ErrorLogger.getErrorStats());
    }
  };

  if (!stats) return null;

  // تحويل الإحصائيات إلى قائمة وتصفية وقت آخر خطأ
  const statsList = Object.entries(stats).filter(([key]) => key !== 'last_error_time');
  const lastErrorTime = stats.last_error_time as number;

  return (
    <div className="flex flex-col h-full bg-[#E65100] dark:bg-zinc-950 text-black dark:text-white transition-colors duration-500">
      {/* App Bar */}
      <div className="flex items-center justify-between p-6 bg-black/10 backdrop-blur-sm sticky top-0 z-10 border-b border-white/10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-2xl font-black tracking-tight text-white">إحصائيات النظام</h1>
        </div>
        <button 
          onClick={handleClear}
          className="p-2 text-white hover:bg-red-500/20 rounded-full transition-colors"
          title="مسح الكل"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tabs */}
        <div className="flex bg-black/10 p-1 rounded-2xl mb-4">
          <button 
            onClick={() => handleTabChange('errors')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'errors' ? 'bg-white text-[#E65100] shadow-lg' : 'text-white/50 hover:text-white'}`}
          >
            الأخطاء
          </button>
          <button 
            onClick={() => handleTabChange('system')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'system' ? 'bg-white text-[#E65100] shadow-lg' : 'text-white/50 hover:text-white'}`}
          >
            النظام
          </button>
        </div>

        {activeTab === 'errors' ? (
          <>
            {/* Last Error Time Card */}
            {lastErrorTime > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 p-5 rounded-3xl flex items-center gap-4 shadow-lg border border-black/5 dark:border-white/5"
              >
                <div className="w-12 h-12 bg-[#E65100]/10 text-[#E65100] rounded-2xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">آخر خطأ حدث في</p>
                  <p className="font-bold text-black dark:text-white">{new Date(lastErrorTime).toLocaleString('ar-DZ')}</p>
                </div>
              </motion.div>
            )}

            {/* Stats List */}
            {statsList.length > 0 ? (
              <div className="space-y-3">
                {statsList.map(([errorType, count], index) => (
                  <motion.div
                    key={errorType}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-3xl flex items-center justify-between shadow-lg border border-black/5 dark:border-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-black dark:text-white">{errorType}</span>
                    </div>
                    <div className="bg-[#E65100] text-white px-4 py-2 rounded-2xl text-xs font-black tracking-widest">
                      {count} مرة
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 bg-white/10 rounded-[2.5rem] flex items-center justify-center mb-6">
                  <AlertTriangle className="w-10 h-10 text-white/20" />
                </div>
                <h3 className="text-xl font-black text-white/40 uppercase tracking-widest">لا توجد أخطاء</h3>
                <p className="text-sm text-white/20 mt-2">النظام يعمل بكفاءة عالية</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {/* Registry Status Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  حالة المستودعات
                </h3>
                <button 
                  onClick={checkRegistries}
                  disabled={isChecking}
                  className="text-xs text-white font-black hover:underline uppercase tracking-widest"
                >
                  {isChecking ? 'جاري الفحص...' : 'تحديث'}
                </button>
              </div>
              
              <div className="space-y-3">
                {registries.map((reg, index) => (
                  <motion.div
                    key={reg.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-3xl flex items-center justify-between shadow-lg border border-black/5 dark:border-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${reg.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                      <div>
                        <p className="font-bold text-black dark:text-white">{reg.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono tracking-tighter">{reg.url}</p>
                      </div>
                    </div>
                    {reg.latency && (
                      <div className="text-[10px] font-black bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
                        {reg.latency}ms
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>

            {/* App Info Section */}
            <section className="space-y-4">
              <h3 className="text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-2 px-2">
                <Info className="w-4 h-4" />
                معلومات التطبيق
              </h3>
              <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-lg border border-black/5 dark:border-white/5">
                {Object.entries(SystemManager.getAppMetadata()).map(([key, value], index) => (
                  <div key={key} className={`flex items-center justify-between p-6 ${index !== 0 ? 'border-t border-zinc-50 dark:border-white/5' : ''}`}>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{key}</span>
                    <span className="text-xs font-mono text-[#E65100] font-black tracking-tighter">{String(value)}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Security Status */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-lg border border-black/5 dark:border-white/5">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <p className="text-lg font-black text-black dark:text-white leading-none">بيئة آمنة</p>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-2">تم التحقق من سلامة جميع المستودعات والتبعيات.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
