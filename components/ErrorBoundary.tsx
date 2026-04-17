'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TriangleAlert, X, ChevronDown, Mail, RefreshCw } from 'lucide-react';
import { ErrorLogger } from '@/lib/error-logger';
import { ErrorReporter } from '@/lib/error-reporter';
import { ErrorHandlerProvider } from '@/lib/error-context';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack?: string;
  showDetails: boolean;
}

/**
 * ماسك الأخطاء الرئيسي - يعرض إشعاراً منبثقاً بدلاً من شاشة كاملة
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
    errorStack: '',
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      errorMessage: error.message || 'حدث خطأ غير متوقع',
      errorStack: error.stack,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    ErrorLogger.log(error);
    ErrorReporter.report(error);
  }

  private handleDismiss = () => {
    this.setState({ hasError: false, errorMessage: '', errorStack: '', showDetails: false });
  };

  private handleRetry = () => {
    this.handleDismiss();
    // يمكن إعادة تحميل المكون الحالي فقط بدلاً من الصفحة كاملة
    // لكن لتبسيط الأمور سنعيد تحميل الصفحة
    window.location.reload();
  };

  private handleManualError = (error: Error | any) => {
    const throwable = error instanceof Error ? error : new Error(String(error));
    this.setState({
      hasError: true,
      errorMessage: throwable.message || 'حدث خطأ غير متوقع',
      errorStack: throwable.stack,
      showDetails: false,
    });
    ErrorLogger.log(throwable);
    ErrorReporter.report(throwable);
  };

  public render() {
    return (
      <ErrorHandlerProvider onError={this.handleManualError}>
        {this.props.children}
        <AnimatePresence>
          {this.state.hasError && (
            <ErrorNotification
              message={this.state.errorMessage}
              stack={this.state.errorStack}
              onDismiss={this.handleDismiss}
              onRetry={this.handleRetry}
              showDetails={this.state.showDetails}
              onToggleDetails={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
            />
          )}
        </AnimatePresence>
      </ErrorHandlerProvider>
    );
  }
}

interface NotificationProps {
  message: string;
  stack?: string;
  onDismiss: () => void;
  onRetry: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
}

const ErrorNotification = ({
  message,
  stack,
  onDismiss,
  onRetry,
  showDetails,
  onToggleDetails,
}: NotificationProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-4 left-4 right-4 z-[9999] max-w-md mx-auto"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-red-200 dark:border-red-800 overflow-hidden">
        {/* رأس الإشعار */}
        <div className="flex items-start gap-3 p-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <TriangleAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-red-600 dark:text-red-400 mb-1">
              حدث خطأ
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 break-words">
              {message}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-full"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={onToggleDetails}
            className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => ErrorReporter.sendEmailReport(message)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              إبلاغ
            </button>
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#E65100] text-white rounded-lg hover:bg-[#E65100]/90 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              إعادة المحاولة
            </button>
          </div>
        </div>

        {/* تفاصيل الخطأ (اختياري) */}
        <AnimatePresence>
          {showDetails && stack && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
            >
              <pre className="p-4 text-xs text-left dir-ltr bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 overflow-x-auto">
                {stack}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
