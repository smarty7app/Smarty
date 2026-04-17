'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // تسجيل الخطأ في وحدة التحكم فقط (للمطور)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      // إذا كان هناك fallback مخصص، استخدمه
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, showDetails } = this.state;

      return (
        <div className="min-h-screen bg-[#E65100] dark:bg-black flex flex-col items-center justify-center p-6 text-center">
          {/* أيقونة الخطأ */}
          <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-12 h-12 text-white" />
          </div>

          {/* العنوان */}
          <h1 className="text-2xl font-black text-white mb-2">عذراً، حدث خطأ</h1>
          
          {/* رسالة ودية */}
          <p className="text-white/80 text-sm mb-6 max-w-xs">
            حدث خطأ غير متوقع. يمكنك محاولة تحديث الصفحة أو العودة لاحقاً.
          </p>

          {/* زر إعادة المحاولة */}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 bg-white text-[#E65100] px-6 py-3 rounded-full font-bold shadow-lg hover:bg-white/90 transition"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>

          {/* زر عرض التفاصيل (للمطور) */}
          <button
            onClick={this.toggleDetails}
            className="mt-4 text-white/50 text-xs flex items-center gap-1 hover:text-white/70 transition"
          >
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </button>

          {/* التفاصيل التقنية (تظهر فقط عند الضغط) */}
          {showDetails && error && (
            <div className="mt-4 p-3 bg-black/30 rounded-xl text-left max-w-md w-full overflow-auto">
              <p className="text-white/60 text-[10px] font-mono break-all">
                {error.message}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
