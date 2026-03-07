'use client';

import React from 'react';
import { useErrorHandler } from '@/lib/error-context';

/**
 * أي Composable يمكن أن يفشل
 * A component that can fail, showing how to use the error handler
 */
export const RiskyComponent = () => {
  const errorHandler = useErrorHandler();
  
  const handleRiskyAction = () => {
    try {
      // كود قد يسبب خطأ
      // riskyOperation()
      throw new Error('فشل العملية الخطيرة!');
    } catch (e: any) {
      errorHandler.onError(e); // يلتقط الخطأ ويعرض الشاشة البديلة
    }
  };

  return (
    <div className="p-4">
      <button 
        onClick={handleRiskyAction}
        className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold shadow-md"
      >
        اضغط هنا (عملية خطيرة)
      </button>
    </div>
  );
};
