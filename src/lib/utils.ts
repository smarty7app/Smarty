import { auth } from "./firebase";
import { OperationType } from "../types";

const isStorageAvailable = (type: 'localStorage' | 'sessionStorage') => {
  try {
    if (typeof window === 'undefined') return false;
    const storage = window[type];
    if (!storage) return false;
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return false;
  }
};

const memoryLocalStorage: Record<string, string> = {};
const memorySessionStorage: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && isStorageAvailable('localStorage')) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.warn("localStorage is not accessible:", e);
    }
    return memoryLocalStorage[key] !== undefined ? memoryLocalStorage[key] : null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && isStorageAvailable('localStorage')) {
        localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn("localStorage could not be set:", e);
    }
    memoryLocalStorage[key] = value;
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && isStorageAvailable('localStorage')) {
        localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn("localStorage could not be removed:", e);
    }
    delete memoryLocalStorage[key];
  }
};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && isStorageAvailable('sessionStorage')) {
        return sessionStorage.getItem(key);
      }
    } catch (e) {
      console.warn("sessionStorage is not accessible:", e);
    }
    return memorySessionStorage[key] !== undefined ? memorySessionStorage[key] : null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && isStorageAvailable('sessionStorage')) {
        sessionStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn("sessionStorage could not be set:", e);
    }
    memorySessionStorage[key] = value;
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && isStorageAvailable('sessionStorage')) {
        sessionStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn("sessionStorage could not be removed:", e);
    }
    delete memorySessionStorage[key];
  }
};

export function handleFirestoreError(error: any, operationType: OperationType, path: string) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
