import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut, onIdTokenChanged, getRedirectResult } from 'firebase/auth';
import { auth } from "../lib/firebase";

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
    // Check for redirect result on load
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
        }
      })
      .catch((error) => {
        console.error("Redirect sign-in error:", error);
      });

    // onIdTokenChanged triggers on sign-in, sign-out, or token change
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        try {
          // Safe background token refresh to prevent redundant triggers and potential infinite loops
          const lastRefresh = sessionStorage.getItem("last_token_refresh");
          const now = Date.now();
          if (!lastRefresh || now - parseInt(lastRefresh) > 15 * 60 * 1000) {
            try {
              await currentUser.getIdToken(true);
              sessionStorage.setItem("last_token_refresh", now.toString());
            } catch (e) {
              console.error("Token background refresh failure:", e);
            }
          }
        } catch (storageError) {
          console.warn("sessionStorage is blocked or unavailable in this sandboxed environment:", storageError);
        }
      }
    });
    return () => unsubscribe();
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
