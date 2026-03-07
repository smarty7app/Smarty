'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';

interface ErrorHandlerContextType {
  onError: (error: Error | any) => void;
}

const ErrorHandlerContext = createContext<ErrorHandlerContextType | null>(null);

/**
 * Hook to access the global error handler
 * mimics the LocalErrorHandler.current pattern in Compose
 */
export const useErrorHandler = () => {
  const context = useContext(ErrorHandlerContext);
  
  // If we're not inside a provider, we'll just throw the error normally
  // which might be caught by a parent ErrorBoundary if it's during render
  const [_, setError] = useState();
  
  const triggerError = useCallback((error: Error | any) => {
    if (context) {
      context.onError(error);
    } else {
      // Standard React trick to trigger ErrorBoundary from event handlers
      setError(() => {
        throw error instanceof Error ? error : new Error(String(error));
      });
    }
  }, [context]);

  return { onError: triggerError };
};

export const ErrorHandlerProvider = ({ 
  children, 
  onError 
}: { 
  children: React.ReactNode; 
  onError: (error: Error | any) => void;
}) => {
  return (
    <ErrorHandlerContext.Provider value={{ onError }}>
      {children}
    </ErrorHandlerContext.Provider>
  );
};
