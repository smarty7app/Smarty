import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut, onIdTokenChanged, getRedirectResult } from 'firebase/auth';
import { auth } from "../lib/firebase";
import { safeSessionStorage } from "../lib/utils";

interface UserContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  isSigningIn: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // Proactive timeout to satisfy the app's watchdog and prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("⏳ [Firebase Provider] Initialization timed out after 6s. Forcing loading state to false.");
        setLoading(false);
      }
    }, 6000); // Trigger slightly before the 8s watchdog in App.tsx

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
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('🔒 [Security/Login Diagnostic] Sign-in error occurred:', error);
        console.warn(
          "⚠️ [Authentication Failure Watchdog] The application was unable to complete the OAuth popup flow. " +
          "If you are using this app inside an iframe (e.g. AI Studio Preview window), " +
          "third-party cookies or popups might be blocked by browser security restrictions.\n" +
          "👉 ACTION REQUIRED: To bypass this constraint and successfully load your dashboard, please open the application in a new dedicated browser tab by clicking the 'Open in new tab' button at the top right of the screen."
        );
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <UserContext.Provider value={{ user, loading, signIn, logout, isSigningIn }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error('useUser must be used within a FirebaseProvider');
  return context;
};
