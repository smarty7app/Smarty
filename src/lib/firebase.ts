import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const isPlaceholder = (val?: string) => !val || val === '' || val.startsWith('YOUR_') || val.startsWith('MY_');
const getVal = (configVal?: string, envVal?: string) => {
  return isPlaceholder(configVal) ? envVal : configVal;
};

// Use the built-in json config primarily to stay in sync with server-side AI Studio expectations.
// Environment variables remain as secondary overrides for specialized local dev.
const config = {
  apiKey: getVal(firebaseConfig?.apiKey, import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: getVal(firebaseConfig?.authDomain, import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: getVal(firebaseConfig?.projectId, import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: getVal(firebaseConfig?.storageBucket, import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: getVal(firebaseConfig?.messagingSenderId, import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: getVal(firebaseConfig?.appId, import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: getVal(firebaseConfig?.measurementId, import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
};

console.log("[Firebase Frontend Init] Active Project ID:", config.projectId);

const databaseId = getVal(firebaseConfig?.firestoreDatabaseId, import.meta.env.VITE_FIREBASE_DATABASE_ID || import.meta.env.VITE_FIRESTORE_DATABASE_ID) || 'ai-studio-64ffac1e-c7a5-4b17-a837-7b1e29c3c8c8';

const app = initializeApp(config);
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
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
