'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { TriangleAlert, RefreshCw, Mail } from 'lucide-react';
import { ErrorLogger } from '@/lib/error-logger';
import { ErrorReporter } from '@/lib/error-reporter';
import { ErrorHandlerProvider } from '@/lib/error-context';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * ماسك الأخطاء الرئيسي - يلف التطبيق بالكامل
 * React Error Boundary implementation inspired by the Android version
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, errorMessage: error.message || 'حدث خطأ غير متوقع' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    ErrorLogger.log(error);
    ErrorReporter.report(error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  private handleManualError = (error: Error | any) => {
    const throwable = error instanceof Error ? error : new Error(String(error));
    this.setState({ hasError: true, errorMessage: throwable.message || 'حدث خطأ غير متوقع' });
    ErrorLogger.log(throwable);
    ErrorReporter.report(throwable);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackScreen 
          message={this.state.errorMessage} 
          onRetry={this.handleRetry} 
        />
      );
    }

    return (
      <ErrorHandlerProvider onError={this.handleManualError}>
        {this.props.children}
      </ErrorHandlerProvider>
    );
  }
}

interface FallbackProps {
  message: string;
  onRetry: () => void;
}

const ErrorFallbackScreen = ({ message, onRetry }: FallbackProps) => {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full flex flex-col items-center"
      >
        <TriangleAlert className="w-16 h-16 text-error mb-4" />
        
        <h2 className="text-2xl font-bold text-error mb-4">عذراً، حدث خطأ غير متوقع</h2>
        
        <div className="w-full bg-error-container p-6 rounded-2xl mb-8 text-right dir-rtl border border-error/10">
          <p className="text-on-error-container font-medium text-sm break-words">
            {message}
          </p>
        </div>

        <div className="flex flex-row gap-4 w-full justify-center mb-6">
          <button
            onClick={onRetry}
            className="flex-1 bg-primary text-on-primary font-bold py-3 px-4 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/10"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
          
          <button
            onClick={() => ErrorReporter.sendEmailReport(message)}
            className="flex-1 bg-surface border border-outline text-on-surface font-bold py-3 px-4 rounded-xl hover:bg-surface-variant/50 transition-all flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            إبلاغ الدعم
          </button>
        </div>

        <p className="text-on-surface-variant text-sm">
          سنحل المشكلة قريباً
        </p>
      </motion.div>
    </div>
  );
};
