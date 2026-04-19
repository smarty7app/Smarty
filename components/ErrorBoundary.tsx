'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode; // اختياري: يمكن تمرير مكون بديل إذا أردت
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // ✅ تسجيل التفاصيل التقنية في وحدة التحكم (تظهر للمطور فقط)
    console.group('🚨 خطأ تم التقاطه بواسطة ErrorBoundary (للمطور فقط)');
    console.error('الخطأ:', error);
    console.error('مكونات Stack:', errorInfo.componentStack);
    console.groupEnd();

    // ✅ (اختياري) حفظ الخطأ في localStorage للتشخيص لاحقًا (للمطور فقط)
    try {
      const logs = JSON.parse(localStorage.getItem('smarty_error_logs') || '[]');
      logs.push({
        id: Date.now(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
      if (logs.length > 20) logs.shift();
      localStorage.setItem('smarty_error_logs', JSON.stringify(logs));
    } catch (e) {
      // تجاهل أخطاء التخزين
    }

    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // يمكنك إعادة تحميل الصفحة أو إعادة تعيين الحالة حسب احتياجك
    // window.location.reload(); // اختياري
  };

  render() {
    if (this.state.hasError) {
      // إذا تم تمرير fallback مخصص، استخدمه
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // ✅ رسالة عامة للمستخدم (بدون أي تفاصيل تقنية أو زر إظهار التفاصيل)
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
                {/* ❌ تم إزالة زر "عرض التفاصيل" وجميع التفاصيل التقنية */}
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