import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut, onIdTokenChanged, getRedirectResult } from 'firebase/auth';
import { auth } from "../lib/firebase";
import { safeSessionStorage, safeStorage } from "../lib/utils";


interface UserContextType {
  user: any;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  isSigningIn: boolean;
  authError: any;
  setAuthError: (err: any) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<any>(null);

  useEffect(() => {
    // Proactive timeout to satisfy the app's watchdog and prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("⏳ [Firebase Provider] Initialization timed out after 6s. Forcing loading state to false.");
        setLoading(false);
      }
    }, 6000); 

    // onAuthStateChanged is the primary source of truth for session status
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(timeoutId);
      setUser(currentUser);
      setLoading(false);
    }, (error) => {
      console.error("❌ [Firebase Provider] Auth state change error:", error);
      clearTimeout(timeoutId);
      setLoading(false);
    });
    
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const signIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('🔒 [Security/Login Diagnostic] Sign-in error occurred:', error);
      
      // Map specialized errors for friendly UI display
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError({
          code: 'unauthorized-domain',
          message: 'يرجى إعادة محاولة تسجيل الدخول / Please try logging in again.',
          title: "نطاق بريدي غير مصرح به / Unauthorized Auth Domain",
        });
      } else if (error.code !== 'auth/popup-closed-by-user') {
        setAuthError({
          code: error.code || 'unknown',
          message: 'يرجى إعادة محاولة تسجيل الدخول / Please try logging in again.',
          title: "فشل تسجيل الدخول / Sign-in Failed",
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth).catch(() => {});
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, loading, signIn, logout, isSigningIn, authError, setAuthError }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error('useUser must be used within a FirebaseProvider');
  return context;
};
