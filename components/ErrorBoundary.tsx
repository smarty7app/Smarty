'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode; // اختياري: يمكن تمرير مكون بديل إذا أردت
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // يمكنك هنا إرسال الخطأ إلى خدمة خارجية (مثل Sentry)
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    // يمكنك إعادة تحميل الصفحة أو إعادة تعيين الحالة حسب احتياجك
    // window.location.reload(); // اختياري
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      // إذا تم تمرير fallback مخصص، استخدمه
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // إشعار بسيط في أعلى الصفحة (بدون إغلاق التطبيق)
      return (
        <>
          {/* عرض المحتوى الأصلي (مع إمكانية استمرار التطبيق) */}
          {this.props.children}
          
          {/* الإشعار العائم في أعلى الصفحة */}
          <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto md:left-auto md:right-4 md:left-auto">
            <div className="bg-red-50 dark:bg-red-950/80 border-l-4 border-red-500 rounded-lg shadow-lg p-4 flex items-start gap-3 backdrop-blur-sm">
              <div className="flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-800 dark:text-red-200">
                  حدث خطأ غير متوقع
                </h3>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  يمكنك متابعة استخدام التطبيق، ولكن قد تتأثر بعض الوظائف.
                </p>
                
                {/* زر إظهار التفاصيل */}
                <button
                  onClick={this.toggleDetails}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline mt-2 inline-flex items-center gap-1"
                >
                  {this.state.showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                  {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                
                {this.state.showDetails && this.state.error && (
                  <div className="mt-2 text-xs font-mono bg-red-100 dark:bg-red-900/50 p-2 rounded overflow-auto max-h-32">
                    <p className="font-bold text-red-800 dark:text-red-200">
                      {this.state.error.name}: {this.state.error.message}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="text-red-700 dark:text-red-300 whitespace-pre-wrap mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={this.handleRetry}
                className="flex-shrink-0 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition"
                title="إعادة المحاولة"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      );
    }

    return this.props.children;
  }
}

// تصدير المكون كـ default للاستخدام في layout
export default ErrorBoundary;
