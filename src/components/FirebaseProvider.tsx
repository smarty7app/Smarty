import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut, onIdTokenChanged } from 'firebase/auth';
import { auth } from "../lib/firebase";

interface UserContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onIdTokenChanged triggers on sign-in, sign-out, or token change
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
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
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Sign-in error:', error);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <UserContext.Provider value={{ user, loading, signIn, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error('useUser must be used within a FirebaseProvider');
  return context;
};
