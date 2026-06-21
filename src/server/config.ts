import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import firebaseConfig from '../../firebase-applet-config.json';

dotenv.config();

// Initialize Firebase Client
const isPlaceholder = (val?: string) => !val || val === '' || val.startsWith('YOUR_') || val.startsWith('MY_');
const getVal = (configVal?: string, envVal?: string) => {
  return isPlaceholder(configVal) ? envVal : configVal;
};

const firebaseApiKey = getVal(firebaseConfig?.apiKey, process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY);
const authDomain = getVal(firebaseConfig?.authDomain, process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN);
const projectId = getVal(firebaseConfig?.projectId, process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID);
const storageBucket = getVal(firebaseConfig?.storageBucket, process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET);
const messagingSenderId = getVal(firebaseConfig?.messagingSenderId, process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID);
const appId = getVal(firebaseConfig?.appId, process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID);
const databaseId = getVal(firebaseConfig?.firestoreDatabaseId, process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIRESTORE_DATABASE_ID || process.env.FIRESTORE_DATABASE_ID) || 'ai-studio-64ffac1e-c7a5-4b17-a837-7b1e29c3c8c8';

export const firebaseApp = initializeApp({
  apiKey: firebaseApiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
});

export const db = getFirestore(firebaseApp, databaseId);

export const PLAN_LIMITS: Record<string, number> = {
  free: 50,
  basic: 50,
  pro: 500,
  professional: 500,
  unlimited: 2000,
  business: 2000,
  enterprise: 999999999,
};

// Validate and initialize Gemini API securely
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is not set. AI features might be restricted.");
}

export const ai = new GoogleGenAI({
  apiKey: apiKey || 'MOCK_KEY',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to decode JWT and get current user UID safely (no admin SDK required)
export function decodeAuthUser(authHeader?: string): { uid: string; email?: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      return {
        uid: payload.user_id || payload.sub,
        email: payload.email,
      };
    }
  } catch (err) {
    console.error("Token decoding failed:", err);
  }
  return null;
}

// Helper to partition base64 data URLs
export function parseDataUrl(dataUrl: string): { base64: string; mimeType: string } | null {
  const parts = dataUrl.split(',');
  if (parts.length < 2) return null;
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  if (!match) return null;
  return {
    base64: parts[1],
    mimeType: match[1],
  };
}

// Resilient helper to execute model calls with retry and model fallback support
export async function generateContentWithRetry(params: {
  contents: any[];
  config?: any;
  preferredModel?: string;
}) {
  const models = [
    params.preferredModel || 'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro'
  ];
  
  // Clean empty or invalid strings and deduplicate
  const uniqueModels = [...new Set(models.filter(Boolean))];
  
  let lastError: any = null;
  
  for (const modelName of uniqueModels) {
    let retries = 3;
    let delay = 1000; // 1s initial delay
    
    while (retries > 0) {
      try {
        console.log(`[Gemini SDK Wrapper] Attempting call with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.error(`[Gemini SDK Wrapper] Model: ${modelName} failed. Remaining retries: ${retries - 1}. Error:`, err.message || err);
        
        // Retrieve error code or status
        const status = err.status || (err.error && err.error.code);
        // Retry on 503, 429, or temporary server timeouts
        const isRetryable = status === 503 || status === 429 || !status;
        
        if (isRetryable && retries > 1) {
          retries--;
          console.log(`[Gemini SDK Wrapper] Backing off for ${delay}ms before next retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
        } else {
          break; // break retry loop to try next model fallback
        }
      }
    }
  }
  
  throw lastError || new Error("All model options and retries failed to execute successfully.");
}
