import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ====================================================
// تهيئة Firebase من متغيرات البيئة (VITE_FIREBASE_*)
// ====================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// التحقق من إعداد Firebase - وضع demo إذا لم يكن مُهيَّأ
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

if (!isFirebaseConfigured) {
  console.warn(
    "⚠️ Firebase غير مُهيَّأ. المصادقة وقاعدة البيانات ستعمل في وضع Demo (بدون تخزين سحابي).\n" +
    "لتفعيل Firebase أضف متغيرات VITE_FIREBASE_* في ملف .env"
  );
}

// تجنب إعادة التهيئة عند Hot Reload
const app = isFirebaseConfigured
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : initializeApp({ apiKey: "demo", projectId: "demo-project", appId: "demo" }, "demo");

export const auth = getAuth(app);
export const db = getFirestore(app);
export { isFirebaseConfigured };
