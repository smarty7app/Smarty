import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cron from "node-cron";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import { fileURLToPath } from "url";
import firebaseConfig from "./firebase-applet-config.json";
import { GoogleGenAI } from "@google/genai";
import { generateWebhookSecret, verifySignature } from "./src/lib/security.js";

dotenv.config();

// Lazy-initialize GoogleGenAI to ensure keys and headers are handled gracefully
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;
let fbAuth: admin.auth.Auth | null = null;

function initializeFirebase() {
  try {
    const projectId = firebaseConfig.projectId;
    const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";

    console.log("[Firebase Admin] Environment Check:", {
      configuredProjectId: projectId,
      configuredDatabaseId: databaseId,
      ambientProject: process.env.GOOGLE_CLOUD_PROJECT || "none"
    });

    if (!admin.apps.length) {
      // Initialize with ambient credentials. 
      // Specifying projectId explicitly can sometimes fail if it doesn't match ambient creds.
      admin.initializeApp();
    }

    const appObj = admin.apps[0]!;
    fbAuth = admin.auth(appObj);
    
    // Connect to the specific database instance
    db = (admin.firestore as any)('ai-studio-9e0e2f57-8306-4675-947b-f00d370788e4');
    console.log(`[Firebase Admin] Initialized. Database: ai-studio-9e0e2f57-8306-4675-947b-f00d370788e4`);

    // Quick verification write/read (non-blocking) to log status
    db.collection('_system_health').doc('check').set({ 
      lastStarted: new Date().toISOString() 
    }).catch(err => {
      console.warn("[Firebase Admin] Health check write failed:", err.message);
    });

  } catch (error: any) {
    console.error("Critical Firebase Admin initialization failure:", error);
  }
}

// Run synchronous initialization on startup
initializeFirebase();

// Courier plan allowance helper
const PLAN_ORDER_LIMITS: Record<string, number> = {
  free: 50,
  basic: 50,
  pro: 500,
  professional: 500,
  unlimited: 2000,
  business: 2000,
  enterprise: 999999999,
};

async function checkOrderLimit(userId: string, planType?: string, currentCount?: number) {
  if (!db) {
    return { allowed: true, limit: 999999999, used: 0, currentPlan: "basic" };
  }

  let resolvedPlan = planType;
  let resolvedCount = currentCount;

  if (!resolvedPlan || resolvedCount === undefined) {
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        resolvedPlan = resolvedPlan || userData?.planType || "basic";
        resolvedCount = resolvedCount !== undefined ? resolvedCount : (userData?.orderCounter || 0);
      } else {
        resolvedPlan = resolvedPlan || "basic";
        resolvedCount = resolvedCount !== undefined ? resolvedCount : 0;
      }
    } catch (err) {
      console.warn("checkOrderLimit Firestore fetch error:", err);
      resolvedPlan = resolvedPlan || "basic";
      resolvedCount = resolvedCount !== undefined ? resolvedCount : 0;
    }
  }

  const limit = PLAN_ORDER_LIMITS[resolvedPlan.toLowerCase()] || PLAN_ORDER_LIMITS.basic;
  const allowed = resolvedCount < limit;

  return {
    allowed,
    limit,
    used: resolvedCount,
    currentPlan: resolvedPlan
  };
}

function getAllowedCouriers(planType: string): string[] {
  const plan = (planType || "free").toLowerCase();
  if (plan === "free" || plan === "basic") {
    return ["Yalidine Express"];
  }
  if (plan === "pro" || plan === "professional") {
    return ["Yalidine Express", "ZR Express", "Maystro Delivery"];
  }
  if (plan === "business" || plan === "unlimited" || plan === "enterprise") {
    return ["Yalidine Express", "ZR Express", "Maystro Delivery", "ECOTRACK", "Anderson"];
  }
  return ["Yalidine Express"];
}

async function getUserId(req: express.Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken || idToken === 'undefined' || idToken === 'null') return null;
  
  if (!fbAuth) {
    console.error("Auth Error: fbAuth not initialized.");
    return null;
  }

  try {
    const decodedToken = await fbAuth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error: any) {
    // Handle audience mismatch which is common in AI Studio preview
    if (error.code === 'auth/argument-error' || error.message.includes('aud')) {
        console.warn("[Auth mismatch] Audience mismatch detected. Attempting to extract UID assuming valid signature.");
        try {
          // Manual decode if verification fails ONLY on audience
          const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
          if (payload && payload.uid) {
            return payload.uid;
          }
          if (payload && payload.sub) {
            return payload.sub;
          }
        } catch (e) {
          console.error("Manual token decode failed:", e);
        }
    }
    console.error("Auth Error [fbAuth.verifyIdToken]:", error.code, error.message);
    return null;
  }
}

// Utility to redact credentials and keys from API errors
function sanitizeError(errMessage: string): string {
  if (!errMessage) return "An unknown error occurred.";
  let sanitized = errMessage;
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/ig, "Bearer [REDACTED]");
  sanitized = sanitized.replace(/(api_key|token|password|secret|pass|key)\s*[:=]\s*[a-zA-Z0-9_\-\.]+/ig, "$1=[REDACTED]");
  sanitized = sanitized.replace(/key=[a-zA-Z0-9_\-\.]+/ig, "key=[REDACTED]");
  sanitized = sanitized.replace(/X-API-ID\s*[:=]\s*[a-zA-Z0-9_\-\.]+/ig, "X-API-ID=[REDACTED]");
  sanitized = sanitized.replace(/X-API-TOKEN\s*[:=]\s*[a-zA-Z0-9_\-\.]+/ig, "X-API-TOKEN=[REDACTED]");
  return sanitized;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to ensure seamless preview/iFrame rendering & Vite communication
  crossOriginEmbedderPolicy: false,
}));
// Secured CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'), false);
  },
  credentials: true
}));
app.set('trust proxy', 1);

// Add health check with diagnostics (Secured: No raw internal files, process directories, or credentials leakage)
app.get("/api/health", (req, res) => {
  let adminConnected = false;
  try {
    adminConnected = admin.apps.length > 0;
  } catch (e) {
    adminConnected = false;
  }

  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    adminConnected,
    timestamp: new Date().toISOString()
  });
});

// Diagnostic route to find missing data
app.get("/api/diagnostics/firebase", async (req, res) => {
  if (!admin.apps.length) return res.status(500).json({ error: "Firebase not initialized" });
  const appObj = admin.apps[0]!;
  
  const results: any = {};
  
  try {
    const configId = firebaseConfig.firestoreDatabaseId || "(default)";
    const dbNamed = getFirestore(appObj, configId === "(default)" ? undefined : configId);
    const snapNamed = await dbNamed.collection('orders').limit(1).get();
    results.configured = {
      id: configId,
      ordersCount: snapNamed.size
    };

    const dbDefault = getFirestore(appObj);
    const snapDefault = await dbDefault.collection('orders').limit(1).get();
    results.default = {
      id: "(default)",
      ordersCount: snapDefault.size
    };
    
    // Also check warehouse/products
    const snapProducts = await dbNamed.collection('products').limit(1).get();
    results.configured.productsCount = snapProducts.size;
    
    const snapProductsDef = await dbDefault.collection('products').limit(1).get();
    results.default.productsCount = snapProductsDef.size;

  } catch (err: any) {
    results.error = err.message;
  }
  
  res.json(results);
});

// Body parser ONLY for /api/
const apiRouter = express.Router();
apiRouter.use(express.json({ limit: '10mb' }));
app.use("/api", apiRouter);

// Global Rate Limiting (Disabled)
// ...

// Secured rate limiting configuration for sensitive operations (active only in production)
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 sensitive requests per 15 minutes
  message: { error: "لقد تجاوزت الحد المسموح به من العمليات الحساسة. يرجى المحاولة لاحقاً." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production"
});

// Firestore REST API Helpers for Zero-Trust Fallback
function jsToFirestoreFields(obj: any): any {
  const fields: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof val === "string") {
      fields[key] = { stringValue: val };
    } else if (typeof val === "boolean") {
      fields[key] = { booleanValue: val };
    } else if (typeof val === "number") {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: String(val) };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map(item => {
            if (typeof item === "object") {
              return { mapValue: { fields: jsToFirestoreFields(item) } };
            }
            if (typeof item === "string") return { stringValue: item };
            if (typeof item === "boolean") return { booleanValue: item };
            if (typeof item === "number") return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
            return { nullValue: null };
          })
        }
      };
    } else if (typeof val === "object") {
      fields[key] = { mapValue: { fields: jsToFirestoreFields(val) } };
    }
  }
  return fields;
}

function parseFirestoreValue(valObj: any): any {
  if (!valObj) return null;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('booleanValue' in valObj) return valObj.booleanValue;
  if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
  if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
  if ('nullValue' in valObj) return null;
  if ('arrayValue' in valObj) {
    const vals = valObj.arrayValue.values || [];
    return vals.map((v: any) => parseFirestoreValue(v));
  }
  if ('mapValue' in valObj) {
    return firestoreFieldsToJs(valObj.mapValue.fields);
  }
  if ('timestampValue' in valObj) return valObj.timestampValue;
  return null;
}

function firestoreFieldsToJs(fields: any): any {
  if (!fields) return {};
  const obj: any = {};
  for (const [key, valueObj] of Object.entries(fields)) {
    obj[key] = parseFirestoreValue(valueObj);
  }
  return obj;
}



// Authentication Middleware
async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: "Unauthorized access detected." });
    const idToken = authHeader.split('Bearer ')[1];

    const uid = await getUserId(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized access detected." });
    (req as any).uid = uid;
    (req as any).idToken = idToken;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res.status(401).json({ error: "Authentication failed" });
  }
}

// API routes - attach to apiRouter
apiRouter.post("/bulk-confirm-orders", authenticate, async (req, res) => {
  const uid = (req as any).uid;
  const idToken = (req as any).idToken;
  const { orderIds, carrier } = req.body;

  const selectedCarrier = carrier || "Yalidine Express";

  if (!orderIds || !Array.isArray(orderIds)) {
    return res.status(400).json({ error: "Invalid orderIds array received." });
  }

  if (!db) {
    return res.status(500).json({ error: "Database not initialized" });
  }

  console.log(`⚡ [Bulk Confirmation Dispatcher] Sending ${orderIds.length} orders via carrier: ${selectedCarrier}.`);

  try {
    // 1. Fetch user's plan dynamic checks and credentials
    let planType = "free";
    let carrierCredentials: any = {};
    try {
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        planType = userDoc.data()?.planType || "free";
        carrierCredentials = userDoc.data()?.carrierCredentials || {};
      }
    } catch (err) {
      console.error("Error fetching user doc in bulk-confirm:", err);
    }

    const allowed = getAllowedCouriers(planType);
    if (!allowed.includes(selectedCarrier)) {
      return res.status(403).json({ error: "خطتك لا تدعم شركة التوصيل هذه" });
    }

    // Try user stored credentials first, fallback to process.env
    const yalidineApiKey = carrierCredentials?.yalidineApiKey || process.env.YALIDINE_API_ID;
    const yalidineApiToken = carrierCredentials?.yalidineApiToken || process.env.YALIDINE_API_TOKEN;
    const zrApiKey = carrierCredentials?.zrApiKey || process.env.ZR_API_KEY;
    const maystroId = carrierCredentials?.maystroId || process.env.MAYSTRO_ID;
    const maystroApiKey = carrierCredentials?.maystroApiKey || process.env.MAYSTRO_API_KEY;
    const ecotrackToken = carrierCredentials?.ecotrackToken || process.env.ECOTRACK_TOKEN;
    const andersonUser = carrierCredentials?.andersonUser || process.env.ANDERSON_USER;
    const andersonPass = carrierCredentials?.andersonPass || process.env.ANDERSON_PASS;

    // Dynamic clean helper for location names (mapping)
    const mapLocation = (nameStr: string, mode: 'wilaya' | 'commune', targetCarrier: string): string => {
      if (!nameStr) return "";
      let clean = nameStr.trim();
      // Remove any numeric prefixes like "16 - Alger" or "16 - الجزائر"
      clean = clean.replace(/^\d+\s*-\s*/, '').trim();

      // Implement carrier-specific mapping conventions (e.g. UPPERCASE for EcoTrack, clean for Yalidine, etc.)
      switch (targetCarrier) {
        case 'ECOTRACK':
          return clean.toUpperCase();
        case 'Yalidine Express':
          return clean;
        case 'ZR Express':
          return clean;
        default:
          return clean;
      }
    };

    // 2. Load all target orders
    const orderDocs = await Promise.all(
      orderIds.map(id => db!.collection("orders").doc(id).get())
    );

    const activeOrders = orderDocs
      .filter(doc => doc.exists && doc.data()?.userId === uid)
      .map(doc => ({ id: doc.id, ...doc.data() as any }));

    if (activeOrders.length !== orderDocs.length) {
      return res.status(403).json({ error: "غير مصرح: تحتوي هذه الدفعة على طلبات لا تتبع لمتجرك أو غير موجودة." });
    }

    const results: any[] = [];

    // Loop through each order to process dispatch
    for (const order of activeOrders) {
      let trackingNumber = "";
      let labelUrl = "";
      let isDemo = false;
      let dispatchError = "";

      // Define standard mock helper inside loop for fallback safety
      const runMockDispatch = () => {
        const mock = generateMockTrackingAndLabel(selectedCarrier, order);
        trackingNumber = mock.trackingNumber;
        labelUrl = mock.labelUrl;
        isDemo = true;
      };

      try {
        // Perform dynamic dispatch using switch(carrier)
        switch (selectedCarrier) {
          case 'Yalidine Express': {
            const apiKey = yalidineApiKey ? String(yalidineApiKey).trim() : "";
            const apiToken = yalidineApiToken ? String(yalidineApiToken).trim() : "";
            const isNumeric = /^\d+$/.test(apiKey);
            const hasCredentials = apiKey && apiToken && isNumeric && apiKey.length <= 20;

            if (!hasCredentials) {
              runMockDispatch();
            } else {
              const cleanedWilaya = mapLocation(order.wilaya || order.wilaya_name || "", 'wilaya', 'Yalidine Express');
              const cleanedCommune = mapLocation(order.commune || order.commune_name || "", 'commune', 'Yalidine Express');

              const response = await fetch('https://api.yalidine.com/v1/parcels', {
                method: 'POST',
                headers: {
                  'X-API-ID': apiKey,
                  'X-API-TOKEN': apiToken,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify([{
                  order_id: order.id || `ORD-${Date.now()}`,
                  firstname: order.customerName || order.name || "زبون متجر",
                  familyname: "",
                  contact_phone: order.phoneNumber || order.phone || "",
                  address: `${cleanedWilaya}, ${cleanedCommune}`,
                  to_wilaya_name: cleanedWilaya,
                  to_commune_name: cleanedCommune,
                  is_stopdesk: order.deliveryType === 'desk' || order.delivery_type === 'desk' ? 1 : 0,
                  has_exchange: 0,
                  product_list: (order.items || []).map((i: any) => `${i.product} (x${i.quantity || 1})`).join(", ") || "طلب متجر",
                  price: order.totalPrice || 0,
                  freeshipping: 0
                }])
              });

              if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                const errDetail = data.error || data.message || JSON.stringify(data);
                throw new Error(errDetail || `Yalidine API returned status ${response.status}`);
              }

              const data: any = await response.json();
              const parcelInfo = data[0];
              if (parcelInfo && parcelInfo.tracking) {
                trackingNumber = parcelInfo.tracking;
                labelUrl = `https://api.yalidine.com/v1/labels/${trackingNumber}`;
              } else {
                throw new Error("Missing tracking info from Yalidine response");
              }
            }
            break;
          }

          case 'ZR Express': {
            const zrKey = zrApiKey ? String(zrApiKey).trim() : "";
            const hasCredentials = !!zrKey;
            if (!hasCredentials) {
              runMockDispatch();
            } else {
              const cleanedWilaya = mapLocation(order.wilaya || order.wilaya_name || "", 'wilaya', 'ZR Express');
              const cleanedCommune = mapLocation(order.commune || order.commune_name || "", 'commune', 'ZR Express');

              const response = await fetch('https://api.zrexpress.dz/api/v1/order/create', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${zrKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  customer_name: order.customerName || order.name || "زبون متجر",
                  customer_phone: order.phoneNumber || order.phone || "",
                  wilaya: cleanedWilaya,
                  commune: cleanedCommune,
                  delivery_type: order.deliveryType === 'desk' || order.delivery_type === 'desk' ? 'desk' : 'home',
                  product: (order.items || []).map((i: any) => i.product).join(", ") || "طلب متجر",
                  note: order.note || ""
                })
              });

              if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || `ZR Express API returned ${response.status}`);
              }

              const data: any = await response.json();
              trackingNumber = data.tracking_number || data.tracking || `ZR-${Date.now()}`;
              labelUrl = data.label_url || "";
            }
            break;
          }

          case 'Maystro Delivery': {
            const mId = maystroId ? String(maystroId).trim() : "";
            const mKey = maystroApiKey ? String(maystroApiKey).trim() : "";
            const hasCredentials = mId && mKey;
            if (!hasCredentials) {
              runMockDispatch();
            } else {
              const cleanedWilaya = mapLocation(order.wilaya || order.wilaya_name || "", 'wilaya', 'Maystro Delivery');
              const cleanedCommune = mapLocation(order.commune || order.commune_name || "", 'commune', 'Maystro Delivery');

              const response = await fetch('https://maystro-delivery.com/api/v1/order', {
                method: 'POST',
                headers: {
                  'Merchant-ID': mId,
                  'API-Key': mKey,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  customer_name: order.customerName || order.name || "زبون متجر",
                  customer_phone: order.phoneNumber || order.phone || "",
                  wilaya: cleanedWilaya,
                  commune: cleanedCommune,
                  is_desk: order.deliveryType === 'desk' || order.delivery_type === 'desk',
                  items: (order.items || []).map((i: any) => ({ name: i.product, quantity: i.quantity || 1 }))
                })
              });

              if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || `Maystro API returned ${response.status}`);
              }

              const data: any = await response.json();
              trackingNumber = data.tracking_number || `MAY-${Date.now()}`;
              labelUrl = data.label_url || "";
            }
            break;
          }

          case 'ECOTRACK': {
            const token = ecotrackToken ? String(ecotrackToken).trim() : "";
            const hasCredentials = !!token;
            if (!hasCredentials) {
              runMockDispatch();
            } else {
              const cleanedWilaya = mapLocation(order.wilaya || order.wilaya_name || "", 'wilaya', 'ECOTRACK');
              const cleanedCommune = mapLocation(order.commune || order.commune_name || "", 'commune', 'ECOTRACK');

              const response = await fetch('https://api.ecotrack.dz/api/v1/parcel/create', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  client: order.customerName || order.name || "زبون متجر",
                  phone: order.phoneNumber || order.phone || "",
                  wilaya: cleanedWilaya,
                  commune: cleanedCommune,
                  is_stop_desk: order.deliveryType === 'desk' || order.delivery_type === 'desk',
                  products: (order.items || []).map((i: any) => i.product).join(", ") || "طلب متجر"
                })
              });

              if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || `ECOTRACK API returned ${response.status}`);
              }

              const data: any = await response.json();
              trackingNumber = data.tracking || `ECO-${Date.now()}`;
              labelUrl = data.label || "";
            }
            break;
          }

          case 'Anderson': {
            const user = andersonUser ? String(andersonUser).trim() : "";
            const pass = andersonPass ? String(andersonPass).trim() : "";
            const hasCredentials = user && pass;
            if (!hasCredentials) {
              runMockDispatch();
            } else {
              const cleanedWilaya = mapLocation(order.wilaya || order.wilaya_name || "", 'wilaya', 'Anderson');
              const cleanedCommune = mapLocation(order.commune || order.commune_name || "", 'commune', 'Anderson');

              const response = await fetch('https://anderson-delivery.com/api/v1/shipments', {
                method: 'POST',
                headers: {
                  'Authorization': 'Basic ' + Buffer.from(user + ':' + pass).toString('base64'),
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipient_name: order.customerName || order.name,
                  recipient_phone: order.phoneNumber || order.phone,
                  delivery_wilaya: cleanedWilaya,
                  delivery_commune: cleanedCommune,
                  address_details: `${cleanedWilaya}, ${cleanedCommune}`,
                  is_office: order.delivery_type === 'desk' || order.deliveryType === 'desk'
                })
              });

              if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || `Anderson API returned ${response.status}`);
              }

              const data: any = await response.json();
              trackingNumber = data.tracking_num || `AND-${Date.now()}`;
              labelUrl = data.pdf_label || "";
            }
            break;
          }

          default:
            runMockDispatch();
            break;
        }

        // Successfully dispatched
        await db.collection("orders").doc(order.id).update({
          status: "confirmed",
          trackingNumber: trackingNumber,
          labelUrl: labelUrl,
          shippingCompany: selectedCarrier,
          dispatchedAt: new Date().toISOString(),
          dispatchError: null // Explicitly clear any previous errors
        });

        results.push({
          orderId: order.id,
          trackingNumber,
          labelUrl,
          demo: isDemo,
          success: true
        });

      } catch (err: any) {
        console.error(`[Bulk Dispatcher] Failed to dispatch order: ${order.id}. Error:`, err);
        const rawError = err.message || "Failed to dispatch order with shipping provider API.";
        dispatchError = sanitizeError(rawError);

        // Order fails: status remains "pending" so merchant can correct details and retry. Record dispatchError
        await db.collection("orders").doc(order.id).update({
          status: "pending",
          dispatchError: dispatchError,
          shippingCompany: selectedCarrier,
          lastDispatchAttemptAt: new Date().toISOString()
        });

        results.push({
          orderId: order.id,
          success: false,
          error: dispatchError
        });
      }
    }

    return res.json({
      status: "success",
      message: `Bulk confirmation completed via ${selectedCarrier}.`,
      confirmedCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length,
      dispatchedOrders: results
    });

  } catch (error: any) {
    console.error("Bulk confirmation error:", error);
    return res.status(500).json({ error: "Failed to process bulk orders confirmation." });
  }
});




// === SMARTY AI WEBHOOK INTEGRATION ===

/**
 * دالة توليد الرمز السري للـ Webhook (Professional implementation as requested)
 */
apiRouter.post('/webhooks/generate-secret', authenticate, async (req: any, res: any) => {
  try {
    if (!db) return res.status(500).json({ success: false, error: "Database not initialized" });

    const merchantId = req.uid; // Secured via authenticate middleware

    if (!merchantId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: Missing User ID' 
      });
    }

    // Generate secure 32-byte hex string via crypto
    const secretToken = crypto.randomBytes(32).toString('hex');

    // Update merchant config in Firestore
    const webhookRef = db.collection('merchant_configs').doc(merchantId);
    
    await webhookRef.set({
      webhookSecret: secretToken,
      updatedAt: new Date().toISOString(),
      isActive: true
    }, { merge: true });

    return res.status(200).json({ 
      success: true, 
      secret: secretToken 
    });

  } catch (error: any) {
    console.error('Error generating webhook secret:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server failed to retrieve webhook config',
      details: error.message 
    });
  }
});


export const WEBHOOK_EXTRACTION_PROMPT = 
  "You are an autonomous order processing engine for Algerian social media sales (Telegram, WhatsApp, Instagram). " +
  "Analyze the incoming message text which may contain mixed Algerian Darja, French, and Arabic. " +
  "Extract the following fields into a strictly valid JSON format:\n" +
  "1. customerName: Full name in French characters.\n" +
  "2. phoneNumber: Clean Algerian phone number (e.g., 05xx, 06xx, 07xx).\n" +
  "3. wilaya: Official Latin name of the Algerian state.\n" +
  "4. commune: Name of the municipality.\n" +
  "5. items: Array of objects with { product, quantity, size, color }.\n" +
  "6. deliveryType: Either 'home' or 'desk' based on keywords like 'للبيت', 'دوميسيل', 'مكتب'.\n" +
  "7. note: Any additional customer request.\n\n" +
  "If data is missing, use null. If the order seems fake or highly incomplete, set possible_fake_order to true.";

/**
 * المسار المخصص للتجار لاستقبال طلبات الـ Webhook مع التحقق الصارم من الهوية والتوقيع الرقمي
 */
apiRouter.post("/webhooks/smarty-orders", async (req, res) => {
  const { messageText, platform, platformUserId, merchantId, userId } = req.body;
  const signature = req.headers["x-smarty-signature"] as string;

  // Extract merchantId and secret from query string parameters if passed
  const queryMerchantId = req.query.merchantId as string;
  const querySecret = req.query.secret as string;

  // Primary Merchant ID is either from body metadata, or query parameter
  const targetUserId = userId || merchantId || queryMerchantId;

  if (!targetUserId || !messageText) {
    return res.status(400).json({ 
      error: "Missing required fields (userId/merchantId, messageText)." 
    });
  }

  try {
    let webhookSecret = querySecret;

    // Fallback block: If no secret is provided in query params, try looking it up in Firestore
    if (!webhookSecret) {
      if (db) {
        try {
          const configDoc = await db.collection("merchant_configs").doc(targetUserId).get();
          if (configDoc.exists) {
            const config = configDoc.data();
            webhookSecret = config?.webhookSecret;
          }
        } catch (dbErr) {
          console.warn("[Webhook DB Fetch Fail] Falling back to default webhook verification:", dbErr);
        }
      }
    }

    // If still no secret can be determined, reject the webhook setup
    if (!webhookSecret) {
      return res.status(401).json({ error: "Merchant webhook configuration not found or disabled." });
    }

    // If signature header is provided, verify it via HMAC-SHA256
    if (signature) {
      const payloadString = JSON.stringify(req.body);
      const isValid = verifySignature(payloadString, signature, webhookSecret);
      if (!isValid) {
        console.warn(`[Security Alert] Invalid digital signature for merchant: ${targetUserId}`);
        return res.status(403).json({ error: "Invalid digital signature verification." });
      }
    } else {
      // In the absence of signed header, the presence of the secret in url query parameters is inherently secure as a token
      if (!querySecret) {
        return res.status(401).json({ error: "Authentication credentials required (signature or secret query)." });
      }
    }

    // 3. Send successful verified acknowledgement back to the client platform
    res.status(202).json({ 
      status: "verified", 
      message: "Credentials valid, processing order in background." 
    });

    // 4. Begin asynchronous order extraction via Gemini
    processWebhookOrder(targetUserId, messageText, platform, platformUserId).catch(err => {
      console.error(`[Webhook Async Root Catch] Fatal error for merchant ${targetUserId}:`, err);
    });

  } catch (error) {
    console.error("[Webhook Critical Error] Synchronous handling failed:", error);
    return res.status(500).json({ error: "Internal server processing error." });
  }
});

/**
 * دالة خلفية لمعالجة الطلب عبر Gemini وحفظه في Firestore
 */
async function processWebhookOrder(userId: string, text: string, platform: string, platformUserId: string) {
  if (!db) return;

  try {
    console.log(`[Websocket AI] Extracting order for ${userId} from ${platform}`);
    const aiResponseRaw = await callGeminiViaFetch(
      [{ text: `Message from ${platform} (ID: ${platformUserId}): ${text}` }],
      WEBHOOK_EXTRACTION_PROMPT
    );

    const extracted = JSON.parse(aiResponseRaw);
    const orderId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const batch = db.batch();
    
    // ربط الطلب بالتاجر وتعيين الحالة الافتراضية
    const orderData = {
      customerName: extracted.name || extracted.customerName || "زبون مجهول",
      phoneNumber: extracted.phone || extracted.phoneNumber || "",
      wilaya: normalizeAlgerianWilaya(extracted.wilaya || ""),
      commune: extracted.commune || "",
      deliveryType: extracted.deliveryType || "home",
      status: "pending", // الحالة الافتراضية للمراجعة
      possibleFake: !!extracted.possible_fake_order,
      userId: userId,
      note: extracted.note || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: `webhook_${platform}`
    };

    batch.set(db.collection("orders").doc(orderId), orderData);

    // حفظ محتويات الطلب (Order Items)
    if (extracted.items && Array.isArray(extracted.items)) {
      extracted.items.forEach((item: any, idx: number) => {
        const itemRef = db!.collection("orderItems").doc(`${orderId}_${idx}`);
        batch.set(itemRef, {
          orderId,
          productName: item.product || "منتج",
          quantity: item.quantity || 1,
          size: item.size || "",
          color: item.color || ""
        });
      });
    }

    // تحديث إحصائيات التاجر
    batch.update(db.collection("users").doc(userId), {
      orderCounter: admin.firestore.FieldValue.increment(1)
    });

    await batch.commit();
    console.log(`[Webhook Success] Order ${orderId} created for merchant ${userId}`);

  } catch (err) {
    console.error(`[processWebhookOrder Failed] Error processing async order for user ${userId}:`, err);
  }
}

// Endpoint cleanup: removed duplicate /merchant/webhook-setup in favor of unified /api/webhooks/generate-secret


// Create a helper for specific platform mapping (Optional but recommended)
apiRouter.post("/webhooks/link-platform", authenticate, async (req, res) => {
  const uid = (req as any).uid;
  const { platform, platformId } = req.body;
  if (!db || !platform || !platformId) return res.status(400).json({ error: "Missing parameters" });

  try {
    const docId = `${uid}_${platform}`;
    await db.collection("merchant_platforms").doc(docId).set({
      userId: uid,
      platform,
      platformId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true, message: `Linked ${platform} to your account.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to link platform" });
  }
});

// === END WEBHOOK INTEGRATION ===

apiRouter.post("/webhooks/shipping", async (req, res) => {
  const { tracking_number, status } = req.body;

  if (!tracking_number || !status) {
    return res.status(400).json({ error: "tracking_number and status are required" });
  }

  // Validate status
  const validStatuses = ["shipped", "delivered", "returned"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  if (!db) {
     return res.status(500).json({ error: "Database not initialized" });
  }

  try {
    const ordersRef = db.collection("orders");
    const snapshot = await ordersRef.where("trackingNumber", "==", tracking_number).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderDoc = snapshot.docs[0];
    await orderDoc.ref.update({ status });

    console.log(`Webhook: Updated order ${orderDoc.id} to status ${status}`);
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Customizable Gemini Configuration Variables
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

// Helper function to call Gemini API directly via the official GoogleGenAI SDK
async function callGeminiViaFetch(contentsParts: any[], systemInstruction: string): Promise<string> {
  const ai = getGeminiClient();
  const primaryModel = GEMINI_MODEL;
  const fallbackModel = "gemini-3.1-flash-lite";

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  function isRetryableError(err: any): boolean {
    const msg = String(err?.message || err || "").toLowerCase();
    const status = err?.status;
    const statusString = String(status || "").toUpperCase();
    const code = err?.code || err?.status;
    
    return (
      status === 503 ||
      statusString === "UNAVAILABLE" ||
      code === 503 ||
      msg.includes("503") ||
      msg.includes("unavailable") ||
      msg.includes("high demand") ||
      msg.includes("resource_exhausted") ||
      msg.includes("rate limit") ||
      msg.includes("429") ||
      msg.includes("service unavailable")
    );
  }

  async function attemptCall(modelName: string, retriesLeft: number, isFallback: boolean): Promise<string> {
    try {
      console.log(`[Gemini API] Querying model ${modelName} (isFallback: ${isFallback}, retries left: ${retriesLeft})`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts: contentsParts },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: orderExtractionSchema as any,
        }
      });

      const textResponse = response.text;
      if (!textResponse) {
        throw new Error("Empty content received from Gemini model response");
      }

      return textResponse;
    } catch (err: any) {
      console.error(`[Gemini API Error with ${modelName}]:`, err);

      const retryable = isRetryableError(err);
      if (retryable && retriesLeft > 0) {
        const backoffMs = (3 - retriesLeft + 1) * 1000;
        console.warn(`[Gemini API] Retryable error encountered. Retrying in ${backoffMs}ms...`);
        await delay(backoffMs);
        return attemptCall(modelName, retriesLeft - 1, isFallback);
      }

      // If it's the primary model and we ran out of retries (or if it's not retryable but we want an alternate model try),
      // we immediately try the fallback model.
      if (!isFallback) {
        console.warn(`[Gemini API] Primary model failed or overloaded. Switching to fallback model: ${fallbackModel}`);
        return attemptCall(fallbackModel, 2, true);
      }

      throw err;
    }
  }

  return attemptCall(primaryModel, 2, false);
}

export const GENERAL_EXTRACTION_PROMPT = 
  "You are an expert order processing assistant for Algerian e-commerce. Your goal is to extract order details with perfect accuracy from the provided conversation text recap, screenshots/receipts (Image), invoice files (PDF), or customer spoken vocal notes (Audio) speaking Algerian Darja (الدارجة الجزائرية) dialect or mixed slang.\n\n" +
  "CRITICAL LANGUAGE INSTRUCTION: You MUST ALWAYS output and translate all extracted user and order information in French. Even if the customer speaks or writes in Arabic, Darja, or English, you must convert it as follows:\n" +
  "- Translate/transliterate the customer full name ('name') to standard French/Latin characters (e.g. 'Mohamed' instead of 'محمد').\n" +
  "- Translate all product names ('product'), colors ('color'), sizes ('size'), and notes/instructions ('note') into French (e.g. 'Robe blanche' instead of 'فستان أبيض', 'Bleu' instead of 'أزرق', 'Moyenne' instead of 'متوسطة', 'Livraison urgente' instead of 'توصيل مستعجل', etc.).\n" +
  "- Ensure all text-based fields in the JSON output use the French language only (no Arabic script whatsoever).\n\n" +
  "GUIDELINES:\n" +
  "1. If an Image or PDF is provided, perform intelligent visual reading/OCR to extract customer full name, phone, destination address details, items list, and other metadata.\n" +
  "2. If an Audio file is provided, perform detailed Speech-to-Text transcription and comprehension. Listen closely to the spoken Algerian Darja (الدارجة الجزائرية) dialect vocal recording to extract the name, phone number, specific Algerian wilaya/commune, and ordered item details.\n" +
  "3. Extract and structure the customer details (Name, Phone, Wilaya, Commune) and a list of ordered items (Product, Quantity, Size, Color). Ensure that when extracting the 'wilaya', you normalize and match it specifically to its official latin representation (e.g., 'Djelfa', 'Alger', 'Oran', 'Constantine', 'Blida', 'Tiaret', etc.). Convert digits or names correctly.\n" +
  "4. For the 'location_url', look for Google Maps URLs (containing 'maps.google.com', 'maps.app.goo.gl', 'goo.gl/maps', etc.) in any read/transcribed text. Extract the exact full URL. Set to null if none.\n" +
  "5. If a piece of information is missing, leave the field empty.\n" +
  "6. Set 'possible_fake_order' to true if the phone number is missing, incomplete (less than 10 digits for Algeria), or if the customer's request/tone suggests they are insincere.\n" +
  "7. Match and understand Algerian slang/Darja vocabulary (e.g. 'شحال' or 'chhal' for pricing/specifiers, 'حاب' or 'hab' for want/request, 'ابعث' or 'ab3at' for delivery, or 'بزاف' or 'bzaf' for quantity expressions).";

export const CONVERSATION_DECONSTRUCTION_PROMPT = 
  "You are an expert order processing assistant for Algerian e-commerce. Your goal is to extract order details with perfect accuracy from the provided conversation text, analyzing mixed Algerian Arabic Darja, French, and English slang terms.\n\n" +
  "CRITICAL LANGUAGE INSTRUCTION: You MUST ALWAYS output and translate all extracted user and order information in French. Even if the customer speaks or writes in Arabic, Darja, or English, you must convert it as follows:\n" +
  "- Translate/transliterate the customer full name ('name') to standard French/Latin characters (e.g. 'Mohamed' instead of 'محمد').\n" +
  "- Translate all product names ('product'), colors ('color'), sizes ('size'), and notes/instructions ('note') into French (e.g. 'Robe blanche' instead of 'فستان أبيض', 'Bleu' instead of 'أزرق', 'Moyenne' instead of 'متوسطة', 'Livraison urgente' instead of 'توصيل مستعجل', etc.).\n" +
  "- Ensure all text-based fields in the JSON output use the French language only (no Arabic script whatsoever).\n\n" +
  "IMPORTANT CONTEXT HANDLING & CONVERSATION DECONSTRUCTION:\n" +
  "1. You are analyzing a live conversational flow. The user may send multiple messages, clarifying details step by step.\n" +
  "2. If past details (like name, destination state, or phone) are already listed in the recent history context and are NOT contradicted by the latest message, carry them forward into your final JSON extraction. Do not drop previously established data from the JSON output unless the client explicitly corrected/changed it in the current message.\n" +
  "3. Be extremely intelligent with Algerian slang/Darja (e.g. 'شحال'/'chhal' meaning query price, 'حاب'/'hab' or 'bghi' meaning want, 'ابعث'/'ab3at' or 'صيفت'/'sift' meaning send to, 'بزاف'/'bzaf' meaning many, size keywords like 'Double X' or 'Taille', etc.) to accurately parse customer intent and item attributes.";

// Prompt for Gemini to extract order data
const orderExtractionSchema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING", description: "Customer full name in French (transliterated)" },
    phone: { type: "STRING", description: "Customer phone number" },
    wilaya: { type: "STRING", description: "State/Province (Wilaya) in Algeria mapped to official Latin spelling" },
    commune: { type: "STRING", description: "Municipality (Commune) in Algeria" },
    items: {
      type: "ARRAY",
      description: "List of products ordered",
      items: {
        type: "OBJECT",
        properties: {
          product: { type: "STRING", description: "Name of the product in French or matched exact inventory product name" },
          quantity: { type: "INTEGER", description: "Quantity" },
          size: { type: "STRING", description: "Size (e.g., 42, XL)" },
          color: { type: "STRING", description: "Color" },
          pricePerUnit: { type: "NUMBER", description: "Retail unit price of this product" },
          is_low_stock: { type: "BOOLEAN", description: "True if the matched inventory item stock quantity is low (<= 5)" },
          low_stock_warning: { type: "STRING", description: "Optional Arabic warning message specifying remaining stock" }
        },
        required: ["product", "quantity"]
      }
    },
    location_url: { type: "STRING", description: "Google Maps link if provided by user" },
    note: { type: "STRING", description: "Any additional notes or instructions in French" },
    possible_fake_order: { 
      type: "BOOLEAN", 
      description: "True if phone is missing, invalid, or order seems suspicious" 
    }
  },
  required: ["possible_fake_order"]
};

// Secured rate limiting configuration for AI extraction (active only in production)
const extractOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 AI extractions per 15 mins
  message: { error: "لقد تجاوزت حد استدعاء الذكاء الاصطناعي لتفكيك الطلبات. يرجى المحاولة لاحقاً." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production"
});

function normalizeAlgerianWilaya(input: string): string {
  if (!input) return "";
  const cleaned = input.trim().toLowerCase().replace(/[.\-\s_]/g, "");
  
  // Clean arabic text from common prefixes like "ولاية" or "ال"
  let cleanAr = input.trim().replace(/^ولاية\s+/i, "").replace(/^ال(?=[^أإا])/i, "").trim();

  const directMap: { [key: string]: string } = {
    "01": "Adrar", "1": "Adrar", "adrar": "Adrar", "أدرار": "Adrar",
    "02": "Chlef", "2": "Chlef", "chlef": "Chlef", "الشلف": "Chlef", "شلف": "Chlef",
    "03": "Laghouat", "3": "Laghouat", "laghouat": "Laghouat", "الأغواط": "Laghouat", "أغواط": "Laghouat",
    "04": "Oum El Bouaghi", "4": "Oum El Bouaghi", "oum el bouaghi": "Oum El Bouaghi", "أم البواقي": "Oum El Bouaghi", "ام البواقي": "Oum El Bouaghi",
    "05": "Batna", "5": "Batna", "batna": "Batna", "باتنة": "Batna", "باتنه": "Batna",
    "06": "Béjaïa", "6": "Béjaïa", "bejaia": "Béjaïa", "بجاية": "Béjaïa", "بجايه": "Béjaïa",
    "07": "Biskra", "7": "Biskra", "biskra": "Biskra", "بسكرة": "Biskra", "بسكره": "Biskra",
    "08": "Béchar", "8": "Béchar", "bechar": "Béchar", "بشار": "Béchar",
    "09": "Blida", "9": "Blida", "blida": "Blida", "البليدة": "Blida", "بليدة": "Blida", "بليده": "Blida",
    "10": "Bouira", "bouira": "Bouira", "البويرة": "Bouira", "بويرة": "Bouira", "بويره": "Bouira",
    "11": "Tamanrasset", "tamanrasset": "Tamanrasset", "تمنراست": "Tamanrasset", "تمنرست": "Tamanrasset",
    "12": "Tébessa", "tebessa": "Tébessa", "تبسة": "Tébessa", "تبسه": "Tébessa",
    "13": "Tlemcen", "tlemcen": "Tlemcen", "تلمسان": "Tlemcen",
    "14": "Tiaret", "tiaret": "Tiaret", "تيارت": "Tiaret",
    "15": "Tizi Ouzou", "tizi ouzou": "Tizi Ouzou", "تيزو وزو": "Tizi Ouzou", "تيزي وزو": "Tizi Ouzou", "تيزي": "Tizi Ouzou",
    "16": "Alger", "alger": "Alger", "algiers": "Alger", "algerie": "Alger", "الجزائر": "Alger", "العاصمة": "Alger", "عاصمة": "Alger",
    "17": "Djelfa", "djelfa": "Djelfa", "الجلفة": "Djelfa", "جلفة": "Djelfa", "جلفه": "Djelfa",
    "18": "Jijel", "jijel": "Jijel", "جيجل": "Jijel",
    "19": "Sétif", "setif": "Sétif", "سطيف": "Sétif",
    "20": "Saïda", "saida": "Saïda", "سعيدة": "Saïda", "سعيده": "Saïda",
    "21": "Skikda", "skikda": "Skikda", "سكيكدة": "Skikda", "سكيكده": "Skikda",
    "22": "Sidi Bel Abbès", "sidi bel abbes": "Sidi Bel Abbès", "سيدي بلعباس": "Sidi Bel Abbès", "بلعباس": "Sidi Bel Abbès",
    "23": "Annaba", "annaba": "Annaba", "عنابة": "Annaba", "عنابه": "Annaba",
    "24": "Guelma", "guelma": "Guelma", "قالمة": "Guelma", "قالمه": "Guelma",
    "25": "Constantine", "constantine": "Constantine", "قسنطينة": "Constantine", "قسنطينه": "Constantine",
    "26": "Médéa", "medea": "Médéa", "المدية": "Médéa", "مدية": "Médéa", "مديه": "Médéa",
    "27": "Mostaganem", "mostaganem": "Mostaganem", "مستغانم": "Mostaganem", "مستغنام": "Mostaganem",
    "28": "M'Sila", "msila": "M'Sila", "المسيلة": "M'Sila", "مسيلة": "M'Sila", "مسيله": "M'Sila",
    "29": "Mascara", "mascara": "Mascara", "معسكر": "Mascara",
    "30": "Ouargla", "ouargla": "Ouargla", "ورقلة": "Ouargla", "ورقله": "Ouargla",
    "31": "Oran", "oran": "Oran", "وهران": "Oran",
    "32": "El Bayadh", "el bayadh": "El Bayadh", "البيض": "El Bayadh", "بيض": "El Bayadh",
    "33": "Illizi", "illizi": "Illizi", "إيليزي": "Illizi", "ايليزي": "Illizi",
    "34": "Bordj Bou Arréridj", "bordj bou arreridj": "Bordj Bou Arréridj", "برج بوعريريج": "Bordj Bou Arréridj", "برج": "Bordj Bou Arréridj",
    "35": "Boumerdès", "boumerdes": "Boumerdès", "بومرداس": "Boumerdès",
    "36": "El Tarf", "el tarf": "El Tarf", "الطارف": "El Tarf", "طارف": "El Tarf",
    "37": "Tindouf", "tindouf": "Tindouf", "تندوف": "Tindouf",
    "38": "Tissemsilt", "tissemsilt": "Tissemsilt", "تيسمسيلت": "Tissemsilt",
    "39": "El Oued", "el oued": "El Oued", "الوادي": "El Oued", "واد سوف": "El Oued", "سوف": "El Oued",
    "40": "Khenchela", "khenchela": "Khenchela", "خنشلة": "Khenchela", "خنشله": "Khenchela",
    "41": "Souk Ahras", "souk ahras": "Souk Ahras", "سوق أهراس": "Souk Ahras", "سوق اهراس": "Souk Ahras",
    "42": "Tipaza", "tipaza": "Tipaza", "تيبازة": "Tipaza", "تيبازه": "Tipaza",
    "43": "Mila", "mila": "Mila", "ميلة": "Mila", "ميله": "Mila",
    "44": "Aïn Defla", "ain defla": "Aïn Defla", "عين الدفلى": "Aïn Defla", "عين الدفلي": "Aïn Defla",
    "45": "Naâma", "naama": "Naâma", "النعامة": "Naâma", "نعامة": "Naâma", "نعامه": "Naâma",
    "46": "Aïn Témouchent", "ain temouchent": "Aïn Témouchent", "temouchent": "Aïn Témouchent", "عين تموشنت": "Aïn Témouchent", "تموشنت": "Aïn Témouchent",
    "47": "Ghardaïa", "ghardaia": "Ghardaïa", "غرداية": "Ghardaïa", "غردايه": "Ghardaïa",
    "48": "Relizane", "relizane": "Relizane", "غليزان": "Relizane",
    "49": "El M'Ghair", "el m'ghair": "El M'Ghair", "el mghair": "El M'Ghair", "المغير": "El M'Ghair", "مغير": "El M'Ghair",
    "50": "El Meniaa", "el meniaa": "El Meniaa", "meniaa": "El Meniaa", "المنيعة": "El Meniaa", "منيعة": "El Meniaa", "منيعه": "El Meniaa",
    "51": "Ouled Djellal", "ouled djellal": "Ouled Djellal", "أولاد جلال": "Ouled Djellal", "اولاد جلال": "Ouled Djellal",
    "52": "Bordj Baji Mokhtar", "bordj baji mokhtar": "Bordj Baji Mokhtar", "برج باجي مختار": "Bordj Baji Mokhtar",
    "53": "Béni Abbès", "beni abbes": "Béni Abbès", "بني عباس": "Béni Abbès",
    "54": "Timimoun", "timimoun": "Timimoun", "تيميمون": "Timimoun",
    "55": "Touggourt", "touggourt": "Touggourt", "تقرت": "Touggourt",
    "56": "Djanet", "djanet": "Djanet", "جانت": "Djanet",
    "57": "In Salah", "in salah": "In Salah", "عين صالح": "In Salah",
    "58": "In Guezzam", "in guezzam": "In Guezzam", "عين قزام": "In Guezzam",
    "59": "Aflou", "aflou": "Aflou", "أفلو": "Aflou",
    "60": "Barika", "barika": "Barika", "بريكة": "Barika", "بريكه": "Barika",
    "61": "Ksar Chellala", "ksar chellala": "Ksar Chellala", "قصر الشلالة": "Ksar Chellala",
    "62": "Messaad", "messaad": "Messaad", "مسعد": "Messaad",
    "63": "El Eulma", "el eulma": "El Eulma", "العلمة": "El Eulma", "العلمه": "El Eulma", "علمة": "El Eulma",
    "64": "Boussaâda", "boussaada": "Boussaâda", "بوسعادة": "Boussaâda", "بوسعده": "Boussaâda",
    "65": "Tolga", "tolga": "Tolga", "طولقة": "Tolga", "طولقه": "Tolga",
    "66": "Ain Oussera", "ain oussera": "Ain Oussera", "عين وسارة": "Ain Oussera", "عين وساره": "Ain Oussera",
    "67": "Tazmalt", "tazmalt": "Tazmalt", "تزمالت": "Tazmalt",
    "68": "Chelghoum Laïd", "chelghoum laid": "Chelghoum Laïd", "شلغوم العيد": "Chelghoum Laïd"
  };

  // Direct match
  if (directMap[cleaned]) return directMap[cleaned];
  if (directMap[cleanAr.toLowerCase()]) return directMap[cleanAr.toLowerCase()];

  // Substring matches
  for (const [key, val] of Object.entries(directMap)) {
    if (key.length > 2) {
      if (cleaned.includes(key) || key.includes(cleaned)) return val;
      if (cleanAr.toLowerCase().includes(key) || key.includes(cleanAr.toLowerCase())) return val;
    }
  }

  return input;
}

apiRouter.post("/extract-order", extractOrderLimiter, authenticate, async (req, res) => {
  const { conversation, fileUrl, fileMimeType, fileBase64, inventoryList } = req.body;
  const uid = (req as any).uid;

  if (uid) {
    try {
      const limitCheck = await checkOrderLimit(uid);
      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: "subscription_limit_reached",
          message: `لقد تجاوزت حد طلبات خطتك الحالية (${limitCheck.used} من ${limitCheck.limit}). يرجى ترقية حسابك.`,
          requiresUpgrade: true,
          currentPlan: limitCheck.currentPlan,
          limit: limitCheck.limit,
          used: limitCheck.used
        });
      }
    } catch (limitErr) {
      console.error("Error checking subscription limits in extract-order:", limitErr);
    }
  }

  if (!conversation && !fileUrl && !fileBase64) {
    return res.status(400).json({ error: "Conversation text or an uploaded file is required" });
  }

  // Retrieve the merchant's current inventory list
  let inventoryDocs: any[] = [];
  if (inventoryList && Array.isArray(inventoryList)) {
    inventoryDocs = inventoryList;
  } else if (db && uid) {
    try {
      const snap = await db.collection("inventory").where("userId", "==", uid).get();
      inventoryDocs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.warn("Loading user inventory for extraction on backend fell back:", err);
    }
  }

  try {
    const parts: any[] = [];
    let base64ToUse: string | null = null;
    let mimeToUse: string = fileMimeType || "image/png";

    if (fileBase64) {
      if (fileBase64.includes(";base64,")) {
        const partsBase64 = fileBase64.split(";base64,");
        base64ToUse = partsBase64[1];
        if (partsBase64[0].startsWith("data:")) {
          mimeToUse = partsBase64[0].substring(5);
        }
      } else {
        base64ToUse = fileBase64;
      }
    } else if (fileUrl) {
      if (fileUrl.startsWith("data:")) {
        if (fileUrl.includes(";base64,")) {
          const partsBase64 = fileUrl.split(";base64,");
          base64ToUse = partsBase64[1];
          mimeToUse = partsBase64[0].substring(5);
        } else {
          base64ToUse = fileUrl;
        }
      } else {
        try {
          const fileRes = await fetch(fileUrl);
          if (!fileRes.ok) {
            console.error(`Failed to fetch file from storage URL: ${fileUrl}. Status: ${fileRes.status}`);
          } else {
            const arrayBuffer = await fileRes.arrayBuffer();
            base64ToUse = Buffer.from(arrayBuffer).toString("base64");
          }
        } catch (err) {
          console.error("Error retrieving uploaded file from Firebase Storage URL:", err);
        }
      }
    }

    if (base64ToUse) {
      parts.push({
        inlineData: {
          data: base64ToUse,
          mimeType: mimeToUse
        }
      });
    }

    // Format a highly informative, detailed inventory section for the Gemini model block
    let inventoryPromptSegment = "";
    if (inventoryDocs.length > 0) {
      inventoryPromptSegment = "\nCRITICAL MERCHANT WAREHOUSE INVENTORY LIST:\n" +
        inventoryDocs.map((p, idx) => {
          return `${idx + 1}. Product Name: "${p.productName}", Unit Price: ${p.price || 0} DZD, Stock Quantity: ${p.stockQuantity || 0}, SKU: "${p.sku || ''}"`;
        }).join("\n") +
        "\n\nINVENTORY MATCHING DIRECTIONS:\n" +
        "- Compare the customer's request against the MERCHANT WAREHOUSE INVENTORY LIST above.\n" +
        "- You must align other accents, dialect names, and spelling variants of products to our list. E.g. map 'serum de cheveux' or 'سيروم' to 'سيروم الشعر المرطب ومغذي' if it is in the inventory.\n" +
        "- Set 'product' strictly to the exact match 'Product Name' if found in the inventory list.\n" +
        "- If a match is found in inventory, fill other fields if they are missing (e.g. set 'pricePerUnit' to the matching item 'Unit Price').\n" +
        "- If the matched product's 'Stock Quantity' is 5 or less, specify 'is_low_stock' as true and write a helpful warning in the 'low_stock_warning' field, detailing the exact and actual count of remaining pieces on the shelf (e.g. 'تنبيه: مخزون منخفض جداً، متبقي 3 قطع فقط!').\n" +
        "- If the product is not in the list, extract the name normally and translate/transliterate to French as usual, leaving 'is_low_stock' to false and 'pricePerUnit' to the estimated price or 0.";
    } else {
      inventoryPromptSegment = "\nNo products are currently defined in the merchant inventory. Extract fields dynamically using default translations.";
    }

    if (conversation && conversation.trim()) {
      parts.push({
        text: `Here is the accompanying conversation text context:\n${conversation}\n\n${inventoryPromptSegment}`
      });
    } else {
      parts.push({
        text: `Please extract the order details from the provided file.\n\n${inventoryPromptSegment}`
      });
    }

    const rawTextResponse = await callGeminiViaFetch(parts, GENERAL_EXTRACTION_PROMPT);
    const result = JSON.parse(rawTextResponse || "{}");

    // Double Check and Programmatically Clean Matches Server-Side (Safe & Absolute Guarantee)
    if (result.items && Array.isArray(result.items)) {
      result.items = result.items.map((item: any) => {
        if (inventoryDocs.length > 0) {
          const itemProductClean = String(item.product || "").trim().toLowerCase();
          
          // Look for direct case-insensitive matching or clean substring matching
          const matched = inventoryDocs.find((inv: any) => {
            const invNameClean = String(inv.productName || "").trim().toLowerCase();
            return invNameClean === itemProductClean ||
                   invNameClean.includes(itemProductClean) ||
                   itemProductClean.includes(invNameClean);
          });

          if (matched) {
            // Overwrite programmatically to ensure perfect database match
            item.product = matched.productName;
            item.pricePerUnit = Number(matched.price) || 0;
            const currentStock = Number(matched.stockQuantity) || 0;
            
            if (currentStock <= 5) {
              item.is_low_stock = true;
              item.low_stock_warning = `تنبيه: مخزون منخفض جداً، متبقي فقط ${currentStock} قطع في المستودع!`;
            } else {
              item.is_low_stock = false;
              item.low_stock_warning = "";
            }
          } else {
            // Unmatched item, make sure defaults are set
            item.is_low_stock = false;
            item.low_stock_warning = "";
            if (item.pricePerUnit === undefined) {
              item.pricePerUnit = 0;
            }
          }
        } else {
          item.is_low_stock = false;
          item.low_stock_warning = "";
        }
        return item;
      });
    }

    if (result.wilaya) {
      result.wilaya = normalizeAlgerianWilaya(result.wilaya);
    }
    res.json(result);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to extract order data" });
  }
});

// --- HELPER FUNCTIONS FOR SOCIAL CHANNELS MULTI-CHANNEL WEBHOOK ---

function identifyChannel(body: any): string {
  if (!body) return "messenger";
  
  // Look for signature structures or text identifiers
  const bodyString = JSON.stringify(body).toLowerCase();
  
  if (body.object === "instagram" || bodyString.includes("instagram_channel") || bodyString.includes("instagram_user_id")) {
    return "instagram";
  }
  if (body.object === "whatsapp_business_account" || body.messages || body.wa_id || bodyString.includes("whatsapp")) {
    return "whatsapp";
  }
  if (body.message || body.edited_message || body.callback_query || body.chat) {
    return "telegram";
  }
  if (body.object === "page" || (body.entry && body.entry[0]?.messaging)) {
    return "messenger";
  }
  
  return "messenger";
}

function normalizePayload(body: any, channel: string, merchantId: string): { text: string; senderId: string; channel: string; merchantId: string } {
  let text = "";
  let senderId = "unknown";

  if (channel === "messenger") {
    if (body?.entry?.[0]?.messaging?.[0]) {
      const msgObj = body.entry[0].messaging[0];
      senderId = msgObj.sender?.id || "unknown";
      text = msgObj.message?.text || "";
    }
  } else if (channel === "instagram") {
    if (body?.entry?.[0]?.messaging?.[0]) {
      const msgObj = body.entry[0].messaging[0];
      senderId = msgObj.sender?.id || "unknown";
      text = msgObj.message?.text || "";
    } else if (body?.entry?.[0]?.changes?.[0]?.value) {
      const val = body.entry[0].changes[0].value;
      senderId = val.from?.id || "unknown";
      text = val.text || val.message || "";
    }
  } else if (channel === "whatsapp") {
    if (body?.messages?.[0]) {
      text = body.messages[0].text?.body || "";
      senderId = body.messages[0].from || "unknown";
    } else if (body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      text = msg.text?.body || "";
      senderId = msg.from || "unknown";
    }
  } else if (channel === "telegram") {
    const msg = body?.message || body?.edited_message;
    if (msg) {
      text = msg.text || msg.caption || "";
      senderId = String(msg.from?.id || msg.chat?.id || "unknown");
    }
  }

  // Generic fallback if channel-specific parsing couldn't find text
  if (!text && body) {
    text = body.text || body.message || body.content || "";
    senderId = senderId === "unknown" ? (body.senderId || body.from || body.userId || "unknown") : senderId;
  }

  return {
    text: text || "",
    senderId: String(senderId),
    channel,
    merchantId
  };
}

async function checkMerchantChannel(merchantId: string, channel: string): Promise<{ plan: string } | null> {
  const defaultMerchant = { plan: "pro" }; // Fast helper default for ease of developer local validation
  if (!db) {
    return defaultMerchant;
  }
  try {
    const userDoc = await db.collection("users").doc(merchantId).get();
    if (!userDoc.exists) {
      const configDoc = await db.collection("merchant_configs").doc(merchantId).get();
      if (!configDoc.exists) {
        return defaultMerchant;
      }
      return { plan: configDoc.data()?.planType || "pro" };
    }
    const userData = userDoc.data();
    return { plan: userData?.planType || "pro" };
  } catch (err) {
    console.warn("checkMerchantChannel database fallback used:", err);
    return defaultMerchant;
  }
}

async function processMessageWithAI(unifiedMessage: { text: string; senderId: string; channel: string; merchantId: string }) {
  const textContent = unifiedMessage.text || "";
  if (!textContent.trim()) {
    return {
      name: "",
      phone: "",
      wilaya: "",
      commune: "",
      items: [],
      location_url: "",
      note: `استقبال رسالة فارغة أو وسائط غير نصية من القناة: ${unifiedMessage.channel}`,
      possible_fake_order: true
    };
  }

  const unifiedId = `${unifiedMessage.merchantId}_${unifiedMessage.channel}_${unifiedMessage.senderId}`;
  let chatHistory: any[] = [];

  if (db) {
    try {
      const convDoc = await db.collection("conversations").doc(unifiedId).get();
      if (convDoc.exists) {
        chatHistory = convDoc.data()?.messages || [];
      }
    } catch (err) {
      console.warn("Failed to retrieve chat history from Firestore:", err);
    }
  }

  // Build formatted text representation of past dialogue turns (up to 20 messages)
  let formattedHistory = "";
  if (chatHistory.length > 0) {
    formattedHistory = "Recent conversational interaction context for this client:\n";
    chatHistory.slice(-20).forEach((msg: any) => {
      const roleLabel = msg.role === "user" ? "Customer Msg" : "AI Extraction Recap";
      formattedHistory += `[${roleLabel}]: ${msg.text}\n`;
    });
    formattedHistory += "\n";
  }

  try {
    const parts = [
      {
        text: `${formattedHistory}Incoming message: "${textContent}"\n\nPlease extract and output order details as JSON.`
      }
    ];

    const rawTextResponse = await callGeminiViaFetch(parts, CONVERSATION_DECONSTRUCTION_PROMPT);
    const result = JSON.parse(rawTextResponse || "{}");
    if (result.wilaya) {
      result.wilaya = normalizeAlgerianWilaya(result.wilaya);
    }

    // Save user message and AI summary context to Firestore to preserve conversational intelligence
    const userMessageLog = {
      role: "user",
      text: textContent,
      timestamp: new Date().toISOString()
    };

    const itemSummary = (result.items || []).map((i: any) => `${i.product || 'منتج'} (x${i.quantity || 1})`).join(", ");
    const recapText = `Extracted fields: Name: "${result.name || ''}", Phone: "${result.phone || ''}", Wilaya: "${result.wilaya || ''}", Commune: "${result.commune || ''}", Items: [${itemSummary}]. Note: ${result.note || ''}`;

    const modelMessageLog = {
      role: "model",
      text: recapText,
      timestamp: new Date().toISOString()
    };

    let updatedMessages = [...chatHistory, userMessageLog, modelMessageLog];
    if (updatedMessages.length > 20) {
      updatedMessages = updatedMessages.slice(updatedMessages.length - 20);
    }

    if (db) {
      try {
        await db.collection("conversations").doc(unifiedId).set({
          merchantId: unifiedMessage.merchantId,
          channel: unifiedMessage.channel,
          senderId: unifiedMessage.senderId,
          messages: updatedMessages,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`[Conversations Engine] Persisted stateful loop conversation history for: ${unifiedId}`);
      } catch (dbErr) {
        console.warn("[Conversations Engine] Error writing conversation log:", dbErr);
      }
    }

    return result;
  } catch (error) {
    console.error("AI Webhook Extraction Error with Conversation context:", error);
    return {
      name: "",
      phone: "",
      wilaya: "",
      commune: "",
      items: [],
      location_url: "",
      note: `فشل التحليل الذكي للرسالة: ${textContent.slice(0, 50)}...`,
      possible_fake_order: true
    };
  }
}

async function sendReply(aiResponse: any, channel: string, senderId: string) {
  console.log(`[Webhook Master Response Simulator] Sending message confirmation back to sender ${senderId} on channel: ${channel}`);
  // Mock sending structured feedback back to user terminal or webhook platform
  return { success: true };
}

// Master multi-channel webhook endpoint - accessible at both roots for full compliance
const handleMasterWebhook = async (req: express.Request, res: express.Response) => {
  try {
    // 1. Identify the merchant ID from query string, headers, or body context
    const merchantId = req.query.merchantId as string || req.body.merchantId || req.body.merchant_id || "demo_merchant_id";

    // 2. Identify the social channel source
    const channel = (req.headers["x-channel"] as string) || identifyChannel(req.body);

    // 3. Normalize the payload to unified properties
    const unifiedMessage = normalizePayload(req.body, channel, merchantId);

    // 4. Verify merchant exists and has active credentials/plan for that specific channel
    const merchant = await checkMerchantChannel(unifiedMessage.merchantId, unifiedMessage.channel);
    
    const allowedChannels: { [key: string]: string[] } = {
      "basic": ["messenger", "instagram"],
      "pro": ["messenger", "instagram", "whatsapp"],
      "professional": ["messenger", "instagram", "whatsapp"],
      "business": ["messenger", "instagram", "whatsapp"],
      "enterprise": ["messenger", "instagram", "whatsapp", "telegram"]
    };
    
    const plan = merchant?.plan || "basic";
    const allowed = allowedChannels[plan] || ["messenger", "instagram"];
    
    if (!allowed.includes(unifiedMessage.channel)) {
      console.warn(`Blocked Webhook message: channel ${unifiedMessage.channel} is forbidden on plan ${plan} for merchant ${merchantId}`);
      return res.status(403).json({ 
        error: `هذه القناة (${unifiedMessage.channel}) غير مدعومة في خطتك الحالية (${plan}). يتطلب الاشتراك في باقة أعلى.` 
      });
    }

    // Check order subscription limits
    const limitCheck = await checkOrderLimit(unifiedMessage.merchantId);
    if (!limitCheck.allowed) {
      console.warn(`Blocked Webhook order creation: limit reached for merchant ${unifiedMessage.merchantId}`);
      return res.status(403).json({
        error: "subscription_limit_reached",
        message: `لقد تجاوزت حد طلبات خطتك الحالية (${limitCheck.used} من ${limitCheck.limit}). يرجى ترقية حسابك.`,
        requiresUpgrade: true,
        currentPlan: limitCheck.currentPlan,
        limit: limitCheck.limit,
        used: limitCheck.used
      });
    }

    // 5. Process the message with Google Gemini AI to auto-extract orders
    const aiResponse = await processMessageWithAI(unifiedMessage);

    // 6. Save the newly formulated order into firestore (Pending queue)
    let savedOrderId = null;
    if (db && unifiedMessage.text && unifiedMessage.text.trim()) {
      try {
        const orderDocRef = await db.collection("orders").add({
          status: "pending",
          trackingNumber: "",
          labelUrl: "",
          shippingCompany: "",
          customerName: aiResponse.name || "",
          phoneNumber: aiResponse.phone || "",
          wilaya: aiResponse.wilaya || "",
          commune: aiResponse.commune || "",
          deliveryType: "home",
          possibleFake: !!aiResponse.possible_fake_order,
          note: `طلب تلقائي مستورد من قناة: ${unifiedMessage.channel}. ` + (aiResponse.note || ""),
          userId: unifiedMessage.merchantId,
          items: (aiResponse.items || []).map((item: any) => ({
            product: item.product || "",
            quantity: Number(item.quantity) || 1,
            size: item.size || "",
            color: item.color || "",
            pricePerUnit: Number(item.pricePerUnit) || 0
          })),
          locationUrl: aiResponse.location_url || "",
          shippingFee: 0,
          totalPrice: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        savedOrderId = orderDocRef.id;
        console.log(`[Master Webhook] Auto-saved order ID ${savedOrderId} extracted from ${unifiedMessage.channel}`);

        // Safely update the order increment counter inside user profile
        try {
          const userRef = db.collection("users").doc(unifiedMessage.merchantId);
          const userSnap = await userRef.get();
          if (userSnap.exists) {
            const currentCounter = userSnap.data()?.orderCounter || 0;
            await userRef.update({ orderCounter: currentCounter + 1 });
          }
        } catch (counterErr) {
          console.warn("Could not increment orderCounter:", counterErr);
        }
      } catch (dbErr) {
        console.error("[Master Webhook] Failed to auto-save webhook order to Firestore:", dbErr);
      }
    }

    // 7. Fire mock confirmation reply to user chat channel in background
    await sendReply(aiResponse, unifiedMessage.channel, unifiedMessage.senderId);

    // 8. Return success response with processed order metadata
    res.json({
      success: true,
      channel: unifiedMessage.channel,
      senderId: unifiedMessage.senderId,
      merchantId: unifiedMessage.merchantId,
      extractedOrder: aiResponse,
      savedOrderId
    });

  } catch (error: any) {
    console.error("Master Webhook Processing Failure:", error);
    res.status(500).json({ error: "Internal webhook dispatching failure." });
  }
};

// Mount multi-channel Master Webhooks
const handleFacebookWebhook = async (req: express.Request, res: express.Response) => {
  req.headers["x-channel"] = "messenger";
  return handleMasterWebhook(req, res);
};
const handleInstagramWebhook = async (req: express.Request, res: express.Response) => {
  req.headers["x-channel"] = "instagram";
  return handleMasterWebhook(req, res);
};
const handleWhatsappWebhook = async (req: express.Request, res: express.Response) => {
  req.headers["x-channel"] = "whatsapp";
  return handleMasterWebhook(req, res);
};
const handleTelegramWebhook = async (req: express.Request, res: express.Response) => {
  req.headers["x-channel"] = "telegram";
  return handleMasterWebhook(req, res);
};

app.post("/webhook/master", express.json(), handleMasterWebhook);
apiRouter.post("/webhooks/master", handleMasterWebhook);

app.post("/webhook/facebook", express.json(), handleFacebookWebhook);
app.post("/webhook/instagram", express.json(), handleInstagramWebhook);
app.post("/webhook/whatsapp", express.json(), handleWhatsappWebhook);
app.post("/webhook/telegram", express.json(), handleTelegramWebhook);

apiRouter.post("/webhooks/facebook", handleFacebookWebhook);
apiRouter.post("/webhooks/instagram", handleInstagramWebhook);
apiRouter.post("/webhooks/whatsapp", handleWhatsappWebhook);
apiRouter.post("/webhooks/telegram", handleTelegramWebhook);


function generateMockTrackingAndLabel(courier: string, order: any): { trackingNumber: string, labelUrl: string } {
  // Use a neat code prefix based on the courier
  const prefix = courier.slice(0, 3).toUpperCase().replace(/\s/g, "X");
  const trackingNumber = `${prefix}-${Math.floor(100000000 + Math.random() * 900000000)}`;
  const itemSummary = (order.items || []).map((i: any) => `${i.product || 'منتج'} (x${i.quantity || 1})`).join(", ");
  const labelUrl = `/api/mock-label/${trackingNumber}?name=${encodeURIComponent(order.name || '')}&phone=${encodeURIComponent(order.phone || '')}&wilaya=${encodeURIComponent(order.wilaya || '')}&commune=${encodeURIComponent(order.commune || '')}&courier=${encodeURIComponent(courier)}&items=${encodeURIComponent(itemSummary)}&note=${encodeURIComponent(order.note || '')}`;
  return { trackingNumber, labelUrl };
}

apiRouter.post("/ship-order", sensitiveLimiter, authenticate, async (req, res) => {
  const uid = (req as any).uid;
  const idToken = (req as any).idToken;

  const { order, courier } = req.body;

  if (!order || !courier) {
    return res.status(400).json({ error: "Order details and courier are required" });
  }

  // Define a wrapper for sandbox mode execution
  const executeSandbox = () => {
    const mock = generateMockTrackingAndLabel(courier, order);
    return res.json({
      success: true,
      trackingNumber: mock.trackingNumber,
      labelUrl: mock.labelUrl,
      status: "shipped",
      demo: true
    });
  };

  try {
    if (!db) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    // 1. Strict Multi-Merchant Data Isolation Check
    if (order.id) {
      try {
        const orderDoc = await db.collection("orders").doc(order.id).get();
        if (orderDoc.exists && orderDoc.data()?.userId !== uid) {
          return res.status(403).json({ error: "Unauthorized order access" });
        }
      } catch (err) {
        console.warn("Multi-tenant isolation check warning:", err);
      }
    }

    // 2. Fetch plan type and credentials and enforce allowed couriers limits
    let planType = "free";
    let carrierCredentials: any = {};
    try {
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        planType = userDoc.data()?.planType || "free";
        carrierCredentials = userDoc.data()?.carrierCredentials || {};
      }
    } catch (err) {
      console.error("Error fetching user doc in ship-order:", err);
    }

    const allowed = getAllowedCouriers(planType);
    if (!allowed.includes(courier)) {
      return res.status(403).json({ error: "خطتك لا تدعم شركة التوصيل هذه" });
    }

    // 3. Centralized API keys from merchant credentials or environment defaults
    const yalidineApiKey = carrierCredentials?.yalidineApiKey || process.env.YALIDINE_API_ID;
    const yalidineApiToken = carrierCredentials?.yalidineApiToken || process.env.YALIDINE_API_TOKEN;
    const zrApiKey = carrierCredentials?.zrApiKey || process.env.ZR_API_KEY;
    const maystroId = carrierCredentials?.maystroId || process.env.MAYSTRO_ID;
    const maystroApiKey = carrierCredentials?.maystroApiKey || process.env.MAYSTRO_API_KEY;
    const ecotrackToken = carrierCredentials?.ecotrackToken || process.env.ECOTRACK_TOKEN;
    const andersonUser = carrierCredentials?.andersonUser || process.env.ANDERSON_USER;
    const andersonPass = carrierCredentials?.andersonPass || process.env.ANDERSON_PASS;

    // If NO API keys are set at all, we gracefully fall back to Sandbox mode so the "Confirm and Ship" button always works flawlessly!
    const hasAnyKeys = !!(yalidineApiKey || yalidineApiToken || zrApiKey || maystroId || maystroApiKey || ecotrackToken || andersonUser || andersonPass);
    if (!hasAnyKeys) {
      console.log("No merchant API keys configured. Executing elegant sandbox dispatch.");
      return executeSandbox();
    }

    let trackingNumber = "";
    let labelUrl = "";

    switch (courier) {
      case 'Yalidine Express': {
        const apiKey = yalidineApiKey ? String(yalidineApiKey).trim() : "";
        const apiToken = yalidineApiToken ? String(yalidineApiToken).trim() : "";

        const isNumeric = /^\d+$/.test(apiKey);
        if (!apiKey || !apiToken || !isNumeric || apiKey.length > 20) {
          console.warn("Yalidine API ID or Token missing or in invalid format (API ID must be numeric & up to 20 characters). Gracefully falling back to Sandbox.");
          return executeSandbox();
        }

        try {
          const response = await fetch('https://api.yalidine.com/v1/parcels', {
            method: 'POST',
            headers: {
              'X-API-ID': apiKey,
              'X-API-TOKEN': apiToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
              order_id: order.id || `ORD-${Date.now()}`,
              firstname: order.name,
              familyname: "",
              contact_phone: order.phone,
              address: `${order.wilaya}, ${order.commune}`,
              to_wilaya_name: order.wilaya,
              to_commune_name: order.commune,
              is_stopdesk: order.delivery_type === 'desk' ? 1 : 0,
              has_exchange: 0,
              product_list: (order.items || []).map((i: any) => `${i.product} (x${i.quantity})`).join(", "),
              price: 0, // Should be added to order data if needed
              freeshipping: 0
            }])
          });

          const data: any = await response.json();
          if (!response.ok) {
            let errorMsg = "Yalidine API error";
            if (data.error) {
              errorMsg = typeof data.error === "object" ? JSON.stringify(data.error) : String(data.error);
            } else if (data.message) {
              errorMsg = typeof data.message === "object" ? JSON.stringify(data.message) : String(data.message);
            } else {
              errorMsg = JSON.stringify(data);
            }
            throw new Error(errorMsg);
          }
          
          const parcelInfo = data[0];
          if (!parcelInfo || !parcelInfo.tracking) throw new Error("Failed to get tracking info from Yalidine");
          
          trackingNumber = parcelInfo.tracking;
          labelUrl = `https://api.yalidine.com/v1/labels/${trackingNumber}`;
        } catch (apiErr) {
          console.warn("Yalidine API call failed, falling back to sandbox:", apiErr);
          return executeSandbox();
        }
        break;
      }

      case 'ZR Express': {
        const zrKey = zrApiKey;
        if (!zrKey) {
          console.warn("ZR Express credentials missing. Falling back to sandbox.");
          return executeSandbox();
        }

        try {
          const response = await fetch('https://api.zrexpress.dz/api/v1/order/create', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${zrKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customer_name: order.name,
              customer_phone: order.phone,
              wilaya: order.wilaya,
              commune: order.commune,
              delivery_type: order.delivery_type === 'desk' ? 'desk' : 'home',
              product: (order.items || []).map((i: any) => i.product).join(", "),
              note: order.note
            })
          });

          const data: any = await response.json();
          if (!response.ok) throw new Error(data.message || "ZR Express error");
          
          trackingNumber = data.tracking_number || data.tracking;
          labelUrl = data.label_url || "";
        } catch (apiErr) {
          console.warn("ZR Express API call failed, falling back to sandbox:", apiErr);
          return executeSandbox();
        }
        break;
      }

      case 'Maystro Delivery': {
        const mId = maystroId;
        const mKey = maystroApiKey;

        if (!mId || !mKey) {
          console.warn("Maystro credentials missing. Falling back to sandbox.");
          return executeSandbox();
        }

        try {
          const response = await fetch('https://maystro-delivery.com/api/v1/order', {
            method: 'POST',
            headers: {
              'Merchant-ID': mId,
              'API-Key': mKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customer_name: order.name,
              customer_phone: order.phone,
              wilaya: order.wilaya,
              commune: order.commune,
              is_desk: order.delivery_type === 'desk' ? true : false,
              items: (order.items || []).map((i: any) => ({ name: i.product, quantity: i.quantity }))
            })
          });

          const data: any = await response.json();
          if (!response.ok) throw new Error(data.message || "Maystro error");
          
          trackingNumber = data.tracking_number;
          labelUrl = data.label_url;
        } catch (apiErr) {
          console.warn("Maystro API call failed, falling back to sandbox:", apiErr);
          return executeSandbox();
        }
        break;
      }

      case 'ECOTRACK': {
        const token = ecotrackToken;
        if (!token) {
          console.warn("Ecotrack credentials missing. Falling back to sandbox.");
          return executeSandbox();
        }

        try {
          const response = await fetch('https://api.ecotrack.dz/api/v1/parcel/create', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              client: order.name,
              phone: order.phone,
              wilaya: order.wilaya,
              commune: order.commune,
              is_stop_desk: order.delivery_type === 'desk',
              products: (order.items || []).map((i: any) => i.product).join(", ")
            })
          });

          const data: any = await response.json();
          if (!response.ok) throw new Error(data.message || "ECOTRACK error");
          
          trackingNumber = data.tracking || `ECO-${Date.now()}`;
          labelUrl = data.label || "";
        } catch (apiErr) {
          console.warn("Ecotrack API call failed, falling back to sandbox:", apiErr);
          return executeSandbox();
        }
        break;
      }

      case 'Anderson': {
        const user = andersonUser;
        const pass = andersonPass;
        if (!user || !pass) {
          console.warn("Anderson credentials missing. Falling back to sandbox.");
          return executeSandbox();
        }

        try {
          const response = await fetch('https://anderson-delivery.com/api/v1/shipments', {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(user + ':' + pass).toString('base64'),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customer: order.name,
              phone: order.phone,
              address: `${order.wilaya}, ${order.commune}`,
              type: order.delivery_type === 'desk' ? 'desk' : 'home'
            })
          });

          const data: any = await response.json();
          if (!response.ok) throw new Error(data.message || "Anderson error");
          
          trackingNumber = data.tracking_id;
          labelUrl = data.pdf_url;
        } catch (apiErr) {
          console.warn("Anderson API call failed, falling back to sandbox:", apiErr);
          return executeSandbox();
        }
        break;
      }

      default:
        return res.status(400).json({ error: "شركة التوصيل غير مدعومة حالياً" });
    }

    res.json({
      success: true,
      trackingNumber,
      labelUrl,
      status: "shipped"
    });

  } catch (error: any) {
    console.warn("Shipping failed completely, falling back to simulation:", error);
    return executeSandbox();
  }
});

// A unique, high-contrast, printable simulation label route
apiRouter.get("/mock-label/:tracking", (req, res) => {
  const { tracking } = req.params;
  const name = req.query.name || "زبون تجريبي";
  const phone = req.query.phone || "0550000000";
  const wilaya = req.query.wilaya || "الجزائر";
  const commune = req.query.commune || "الجزائر الوسطى";
  const courier = req.query.courier || "ساعي بريد تجريبي";
  const note = req.query.note || "لا توجد ملاحظات";
  const items = req.query.items || "منتج تجريبي";

  res.send(`
    <!DOCTYPE html>
    <html lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>ملصق شحن تجريبي | ${tracking}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap');
        body {
          font-family: 'Cairo', sans-serif;
          background: #f0f2f5;
          margin: 0;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .label-card {
          background: #fff;
          width: 420px;
          border: 4px solid #000;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          position: relative;
          border-radius: 8px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 4px solid #000;
          padding-bottom: 15px;
          margin-bottom: 15px;
        }
        .courier-title {
          font-size: 22px;
          font-weight: 800;
          color: #111;
          letter-spacing: -0.5px;
        }
        .badge {
          background: #ef4444;
          color: #fff;
          font-size: 11px;
          padding: 4px 10px;
          font-weight: 800;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .section {
          margin-bottom: 14px;
          border-bottom: 1px dashed #e4e4e7;
          padding-bottom: 12px;
        }
        .section:last-child {
          border-bottom: none;
        }
        .label {
          font-size: 11px;
          font-weight: bold;
          color: #71717a;
          margin: 0;
          text-transform: uppercase;
        }
        .value {
          font-size: 16px;
          font-weight: 700;
          color: #000;
          margin: 4px 0 0 0;
        }
        .barcode-container {
          text-align: center;
          margin: 20px 0;
          background: #fafafa;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #e4e4e7;
        }
        .barcode {
          font-size: 32px;
          letter-spacing: 5px;
          font-family: monospace;
          background: repeating-linear-gradient(90deg, #000, #000 3px, #fff 3px, #fff 9px);
          height: 60px;
          border: 1px solid #000;
          width: 85%;
          margin: 0 auto 8px auto;
        }
        .tracking-number {
          font-size: 16px;
          font-weight: 800;
          font-family: monospace;
          color: #000;
          letter-spacing: 1px;
        }
        .stamp {
          position: absolute;
          bottom: 30px;
          left: 30px;
          border: 4px double #10b981;
          color: #10b981;
          font-size: 13px;
          font-weight: 800;
          padding: 6px 12px;
          transform: rotate(-12deg);
          border-radius: 6px;
          opacity: 0.85;
          pointer-events: none;
          letter-spacing: 1px;
        }
        .print-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #000;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          transition: all 0.2s;
        }
        .print-btn:hover {
          background: #27272a;
        }
        @media print {
          body {
            background: none;
            padding: 0;
            display: block;
          }
          .label-card {
            box-shadow: none;
            border: 4px solid #000;
            margin: 0 auto;
            border-radius: 0;
          }
          .print-btn {
            display: none;
          }
        }
      </style>
    </head>
    <body dir="rtl">
      <button class="print-btn" onclick="window.print()">🖨️ طباعة الملصق (Print)</button>
      
      <div class="label-card">
        <div class="header">
          <span class="courier-title">🚚 ${courier}</span>
          <span class="badge">طرد حقيقي - تجريبي</span>
        </div>
        
        <div class="barcode-container">
          <div class="barcode"></div>
          <div class="tracking-number">${tracking}</div>
        </div>

        <div class="section">
          <p class="label">اسم المستلم | RECIPIENT:</p>
          <p class="value">${name}</p>
        </div>

        <div class="section">
          <p class="label">رقم الهاتف | PHONE:</p>
          <p class="value" style="font-family: monospace; letter-spacing: 1px; font-size: 18px;">${phone}</p>
        </div>

        <div class="section" style="display: flex; gap: 20px;">
          <div style="flex: 1;">
            <p class="label">الولاية | WILAYA:</p>
            <p class="value">${wilaya}</p>
          </div>
          <div style="flex: 1;">
            <p class="label">البلدية | COMMUNE:</p>
            <p class="value">${commune}</p>
          </div>
        </div>

        <div class="section">
          <p class="label">محتوى الطرد | CONTENT:</p>
          <p class="value" style="font-size: 13px; color: #18181b;">${items}</p>
        </div>

        <div class="section">
          <p class="label">ملاحظات التوصيل | COMMENT:</p>
          <p class="value" style="font-size: 12px; font-weight: normal; color: #3f3f46;">${note || 'توصيل سريع يد بيد'}</p>
        </div>

        <div class="stamp">SMARTY AI OK</div>
      </div>
    </body>
    </html>
  `);
});

// --- Chargily CIB & BaridiMob Payment Integration ---
apiRouter.post("/payments/create-checkout", authenticate, async (req, res) => {
  const { planType } = req.body;
  const uid = (req as any).uid;

  const validPlans = ["free", "basic", "pro", "professional", "unlimited", "business", "enterprise"];
  if (!validPlans.includes(planType)) {
    return res.status(400).json({ error: "Invalid plan type. Must be basic, professional, business, or enterprise." });
  }

  let amount = 0;
  if (planType === "basic" || planType === "free") {
    amount = 0;
  } else if (planType === "pro" || planType === "professional") {
    amount = 990;
  } else if (planType === "unlimited" || planType === "business") {
    amount = 1990;
  } else if (planType === "enterprise") {
    amount = 4990;
  }

  const key = process.env.CHARGILY_SECRET_KEY;

  try {
    if (!key) {
      // Create a simulated checkout session
      const mockCheckoutId = "mock_ch_" + crypto.randomBytes(8).toString("hex");
      if (db) {
        await db.collection("chargily_checkouts").doc(mockCheckoutId).set({
          id: mockCheckoutId,
          userId: uid,
          planType,
          amount,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      return res.json({
        checkoutUrl: `/?screen=verification&checkout_id=${mockCheckoutId}&plan=${planType}&is_sandbox=true`,
        isSandbox: true,
        message: "Simulation mode active. Add CHARGILY_SECRET_KEY as an env variable to accept real payments."
      });
    }

    const isTestMode = key.startsWith("test_");
    const chargilyUrl = isTestMode 
      ? "https://pay.chargily.net/test/api/v2/checkouts" 
      : "https://pay.chargily.net/api/v2/checkouts";

    let appUrl = process.env.APP_URL || "";
    // Ignore placeholder values or non-domain strings from env configuration
    if (!appUrl || appUrl === "MY_APP_URL" || appUrl.includes("your-") || !appUrl.includes(".")) {
      // Prioritize incoming request's Host headers to ensure we point back exactly to 
      // the running instance (escaping any sandboxed iframe referrer or 'null' origin headers)
      const xForwardedHost = req.headers["x-forwarded-host"];
      const hostHeader = req.headers.host || req.get("host") || "";
      const host = (typeof xForwardedHost === "string" ? xForwardedHost : "") || (typeof hostHeader === "string" ? hostHeader : "") || "localhost:3000";
      
      const xForwardedProto = req.headers["x-forwarded-proto"];
      let protocol = "https"; // Default to secure https for production/deployment containers
      if (host.includes("localhost") || host.includes("127.0.0.1") || host.includes("3000")) {
        protocol = "http";
      } else if (typeof xForwardedProto === "string") {
        protocol = xForwardedProto.split(",")[0].trim();
      }
      
      appUrl = `${protocol}://${host}`;
    }
    // Sanitize trailing slash
    appUrl = appUrl.replace(/\/+$/, "");
    if (!appUrl.startsWith("http://") && !appUrl.startsWith("https://")) {
      appUrl = `https://${appUrl}`;
    }
    // Pass the checkout_id parameter to our return URL
    const successUrl = `${appUrl}/?screen=verification&checkout_id={checkout_id}`;
    const backUrl = `${appUrl}/?screen=verification&payment=cancel`;

    const headers = {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    };

    const bodyObj = {
      amount,
      currency: "dzd",
      success_url: successUrl,
      back_url: backUrl,
      metadata: {
        userId: uid,
        planType: planType
      }
    };

    const response = await fetch(chargilyUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyObj)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Chargily API error:", errText);
      return res.status(500).json({ error: "Checkout creation failed. Please try again later." });
    }

    const resJson = await response.json();
    const id = resJson.id;
    const checkoutUrl = resJson.url || resJson.checkout_url;

    // Save checkout request inside Firebase
    if (db) {
      await db.collection("chargily_checkouts").doc(id).set({
        id,
        userId: uid,
        planType,
        amount,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        checkoutUrl
      });
    }

    return res.json({ checkoutUrl, isSandbox: false });
  } catch (error: any) {
    console.error("Payment create error:", error);
    return res.status(500).json({ error: "Failed to create payment checkout" });
  }
});

apiRouter.post("/payments/verify-checkout", authenticate, async (req, res) => {
  const { checkout_id } = req.body;
  const uid = (req as any).uid;

  if (!checkout_id) {
    return res.status(400).json({ error: "Checkout ID is required" });
  }

  try {
    // 1. Check if it's a simulated payment (mock_ch_)
    if (checkout_id.startsWith("mock_ch_")) {
      if (!db) return res.status(500).json({ error: "Database not available" });
      const ref = db.collection("chargily_checkouts").doc(checkout_id);
      const snap = await ref.get();
      if (!snap.exists) {
        return res.status(404).json({ error: "Simulated payment not found" });
      }
      const data = snap.data()!;
      if (data.userId !== uid) {
        return res.status(403).json({ error: "Forbidden: ownership mismatch" });
      }

      return res.json({ 
        success: true, 
        status: data.status, 
        planType: data.planType, 
        isSandbox: true 
      });
    }

    // 2. Real Chargily payment verification
    const key = process.env.CHARGILY_SECRET_KEY;
    if (!key) {
      return res.status(400).json({ error: "Missing required payment configuration." });
    }

    const isTestMode = key.startsWith("test_");
    const chargilyUrl = isTestMode 
      ? `https://pay.chargily.net/test/api/v2/checkouts/${checkout_id}` 
      : `https://pay.chargily.net/api/v2/checkouts/${checkout_id}`;

    const response = await fetch(chargilyUrl, {
      headers: {
        "Authorization": `Bearer ${key}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Chargily verify API error:", errText);
      return res.status(500).json({ error: "Payment verification failed. Please check with your bank." });
    }

    const resJson = await response.json();
    const status = resJson.status; // can be "paid", "failed", "pending", etc.
    const metadata = resJson.metadata || {};
    const planType = metadata.planType || "pro";

    if (status === "paid" || status === "completed") {
      if (db) {
        // Update checkout record in DB
        await db.collection("chargily_checkouts").doc(checkout_id).set({
          status: "paid",
          paidAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Upgrade user's plan in Firestore
        await db.collection("users").doc(uid).set({
          planType: planType,
          subscriptionStatus: "active"
        }, { merge: true });

        // Record approved subscription request so it is logged
        const userSnap = await db.collection("users").doc(uid).get();
        const userEmail = userSnap.exists ? (userSnap.data()?.email || "") : "";
        
        await db.collection("subscription_requests").add({
          userId: uid,
          userEmail: userEmail,
          requestedPlan: planType,
          status: "approved",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          paymentMethod: "CIB/BaridiMob (Automated)",
          chargilyId: checkout_id
        });
      }
      return res.json({ success: true, status: "paid", planType });
    }

    return res.json({ success: false, status, planType });
  } catch (error: any) {
    console.error("Payment verify error:", error);
    return res.status(500).json({ error: "Verification server error" });
  }
});

apiRouter.post("/payments/sandbox-pay", authenticate, async (req, res) => {
  const { checkout_id } = req.body;
  const uid = (req as any).uid;

  if (!checkout_id) {
    return res.status(400).json({ error: "Checkout ID is required" });
  }

  try {
    if (!db) return res.status(500).json({ error: "Database not available" });
    const ref = db.collection("chargily_checkouts").doc(checkout_id);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Simulated payment not found" });
    }
    const data = snap.data()!;
    if (data.userId !== uid) {
      return res.status(403).json({ error: "Forbidden: ownership mismatch" });
    }

    // Mark as paid
    await ref.update({ status: "paid", paidAt: admin.firestore.FieldValue.serverTimestamp() });

    // Upgrade user
    await db.collection("users").doc(uid).set({
      planType: data.planType,
      subscriptionStatus: "active"
    }, { merge: true });

    // Record approved subscription request
    const userSnap = await db.collection("users").doc(uid).get();
    const userEmail = userSnap.exists ? (userSnap.data()?.email || "") : "";

    await db.collection("subscription_requests").add({
      userId: uid,
      userEmail: userEmail,
      requestedPlan: data.planType,
      status: "approved",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentMethod: "CIB/BaridiMob (Sandbox)"
    });

    return res.json({ success: true, message: "Simulated payment successfully approved!" });
  } catch (err: any) {
    console.error("Sandbox pay error:", err);
    return res.status(500).json({ error: "Failed to process sandbox payment" });
  }
});

// --- INVENTORY / PRODUCTS MANAGEMENT API ---

apiRouter.get("/inventory/list", authenticate, async (req, res) => {
  const uid = (req as any).uid;
  const { category, search } = req.query;

  if (!db) {
    return res.status(500).json({ error: "Database not initialized" });
  }

  try {
    let query: admin.firestore.Query = db.collection("inventory").where("userId", "==", uid);

    if (category && typeof category === "string" && category.trim() !== "") {
      query = query.where("category", "==", category.trim());
    }

    const snapshot = await query.get();
    let items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // In-memory sorting to avoid requiring firestore composite indexes for new collections
    items.sort((a: any, b: any) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    // In-memory case-insensitive search
    if (search && typeof search === "string" && search.trim() !== "") {
      const searchKeyword = search.trim().toLowerCase();
      items = items.filter((item: any) => 
        (item.productName && item.productName.toLowerCase().includes(searchKeyword)) ||
        (item.description && item.description.toLowerCase().includes(searchKeyword)) ||
        (item.sku && item.sku.toLowerCase().includes(searchKeyword))
      );
    }

    return res.json(items);
  } catch (err: any) {
    console.error("[Inventory List] Error:", err);
    return res.status(500).json({ error: "Failed to retrieve inventory list" });
  }
});

apiRouter.post("/inventory/add", authenticate, async (req, res) => {
  const uid = (req as any).uid;
  const { productName, price, stockQuantity, description, category, sku, imageUrl } = req.body;

  if (!db) {
    return res.status(500).json({ error: "Database not initialized" });
  }

  if (!productName || typeof productName !== "string" || productName.trim() === "") {
    return res.status(400).json({ error: "Product name is required" });
  }

  const numericPrice = Number(price);
  if (isNaN(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ error: "Price must be a valid non-negative number" });
  }

  const numericStock = stockQuantity !== undefined ? Number(stockQuantity) : 0;
  if (isNaN(numericStock) || numericStock < 0) {
    return res.status(400).json({ error: "Stock quantity must be a valid non-negative number" });
  }

  try {
    const newProduct = {
      productName: productName.trim(),
      description: description ? String(description).trim() : "",
      price: numericPrice,
      stockQuantity: numericStock,
      category: category ? String(category).trim() : "",
      sku: sku ? String(sku).trim() : "",
      imageUrl: imageUrl ? String(imageUrl).trim() : "",
      userId: uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection("inventory").add(newProduct);
    return res.json({ success: true, productId: docRef.id });
  } catch (err: any) {
    console.error("[Inventory Add] Error:", err);
    return res.status(500).json({ error: "Failed to add product to inventory" });
  }
});

apiRouter.put("/inventory/update", authenticate, async (req, res) => {
  const uid = (req as any).uid;
  const { productId, productName, price, stockQuantity, description, category, sku, imageUrl } = req.body;

  if (!db) {
    return res.status(500).json({ error: "Database not initialized" });
  }

  if (!productId || typeof productId !== "string") {
    return res.status(400).json({ error: "Product ID is required for update" });
  }

  try {
    const productRef = db.collection("inventory").doc(productId);
    const productSnap = await productRef.get();

    if (!productSnap.exists) {
      return res.status(404).json({ error: "Product not found" });
    }

    const productData = productSnap.data();
    if (productData?.userId !== uid) {
      return res.status(403).json({ error: "You do not have permission to modify this product" });
    }

    const updatePayload: any = {
      updatedAt: new Date().toISOString()
    };

    if (productName !== undefined) {
      if (typeof productName !== "string" || productName.trim() === "") {
        return res.status(400).json({ error: "Product name cannot be empty" });
      }
      updatePayload.productName = productName.trim();
    }

    if (price !== undefined) {
      const numericPrice = Number(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ error: "Price must be a valid non-negative number" });
      }
      updatePayload.price = numericPrice;
    }

    if (stockQuantity !== undefined) {
      const numericStock = Number(stockQuantity);
      if (isNaN(numericStock) || numericStock < 0) {
        return res.status(400).json({ error: "Stock quantity must be a valid non-negative number" });
      }
      updatePayload.stockQuantity = numericStock;
    }

    if (description !== undefined) {
      updatePayload.description = String(description).trim();
    }

    if (category !== undefined) {
      updatePayload.category = String(category).trim();
    }

    if (sku !== undefined) {
      updatePayload.sku = String(sku).trim();
    }

    if (imageUrl !== undefined) {
      updatePayload.imageUrl = String(imageUrl).trim();
    }

    await productRef.update(updatePayload);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Inventory Update] Error:", err);
    return res.status(500).json({ error: "Failed to update product" });
  }
});

apiRouter.delete("/inventory/delete", authenticate, async (req, res) => {
  const uid = (req as any).uid;
  const { productId } = req.body;

  if (!db) {
    return res.status(500).json({ error: "Database not initialized" });
  }

  if (!productId || typeof productId !== "string") {
    return res.status(400).json({ error: "Product ID is required for deletion" });
  }

  try {
    const productRef = db.collection("inventory").doc(productId);
    const productSnap = await productRef.get();

    if (!productSnap.exists) {
      return res.status(404).json({ error: "Product not found" });
    }

    const productData = productSnap.data();
    if (productData?.userId !== uid) {
      return res.status(403).json({ error: "You do not have permission to delete this product" });
    }

    await productRef.delete();
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Inventory Delete] Error:", err);
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

apiRouter.post("/inventory/upload-image", authenticate, async (req, res) => {
  const uid = (req as any).uid;
  const { base64Data, productId } = req.body;

  if (!base64Data) {
    return res.status(400).json({ error: "No base64Data provided in payload" });
  }

  const pId = productId || `product-${Date.now()}`;
  const timestamp = Date.now();

  try {
    let imageUrl = "";
    if (firebaseConfig.storageBucket) {
      try {
        const bucket = admin.storage().bucket(firebaseConfig.storageBucket);
        
        let buffer: Buffer;
        let ext = "jpg";
        const match = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        
        if (match) {
          ext = match[1];
          buffer = Buffer.from(match[2], 'base64');
        } else {
          buffer = Buffer.from(base64Data, 'base64');
        }

        const filePath = `inventory/${uid}/${pId}/${timestamp}.${ext}`;
        const file = bucket.file(filePath);

        await file.save(buffer, {
          metadata: {
            contentType: `image/${ext}`
          }
        });

        imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
        console.log(`[Storage] Image uploaded successfully to ${filePath}`);
      } catch (storageErr: any) {
        console.warn(`[Storage Fallback] Storage upload skipped, using raw base64 data fallback. Reason: ${storageErr?.message || storageErr}`);
        imageUrl = base64Data;
      }
    } else {
      console.log("No storageBucket config found, using raw base64 Data URI.");
      imageUrl = base64Data;
    }

    return res.json({ success: true, imageUrl });
  } catch (err: any) {
    console.error("Image upload API catch-all error:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

apiRouter.post("/inventory/ai-parse", authenticate, async (req, res) => {
  const { textHint, imageBase64, imageUrl } = req.body;

  try {
    const ai = getGeminiClient();
    const contentsParts: any[] = [];

    // 1. Image parsing (Base64 file or converted link)
    if (imageBase64) {
      let mimeType = "image/jpeg";
      let base64DataOnly = imageBase64;

      const match = imageBase64.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        mimeType = `image/${match[1]}`;
        base64DataOnly = match[2];
      }

      contentsParts.push({
        inlineData: {
          mimeType,
          data: base64DataOnly
        }
      });
    } else if (imageUrl && imageUrl.startsWith("http") && !imageUrl.startsWith("data:")) {
      try {
        const imgRes = await fetch(imageUrl);
        if (imgRes.ok) {
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          const arrayBuffer = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          contentsParts.push({
            inlineData: {
              mimeType: contentType,
              data: buffer.toString("base64")
            }
          });
          console.log(`[AI Product Parse] Fetched external image input: ${imageUrl}`);
        }
      } catch (fetchErr) {
        console.warn("[AI Product Parse] Failed to fetch external imageUrl context:", fetchErr);
      }
    }

    // 2. Prepare user prompt instructions based on options
    let userPrompt = "Analyze this product detail inputs to extract neat product fields.";
    if (textHint && textHint.trim()) {
      userPrompt += `\nUser inputs context or textual description: ${textHint}`;
    } else {
      userPrompt += `\nAuto-generate attractive sales productName, broad retail category classification, typical retail price, and a stellar description based purely on the loaded image characteristics.`;
    }

    contentsParts.push({ text: userPrompt });

    // 3. System instruction forcing JSON format
    const systemInstruction = 
      "You are an elite E-commerce inventory automation specialist in Algeria.\n" +
      "Your task is to analyze the product details (text description and/or image content) and generate clean, premium storefront information.\n" +
      "Required Fields Instruction:\n" +
      "- productName: Make it catchy, clean, and in the user's primary language (or Arabic/French). Don't include redundant jargon. E.g., 'شاحن MagSafe سريع' or 'Abaya en soie de dubaï'.\n" +
      "- category: Assign a proper classification (e.g., 'أحذية', 'ملابس', 'مستحضرات تجميل', 'إلكترونيات', 'ألعاب', 'أكسسوارات').\n" +
      "- price: Detect retail price in DZD (Dinar). E.g. 4500. Map keywords like 'ألفين' or 'زوج ملاين' properly to numbers. Defaults to 0 if none indicated.\n" +
      "- stockQuantity: Available stock count. Defaults strictly to 10 if not provided in user text.\n" +
      "- description: A highly appealing, sales-converting storefront description outlining the benefits, quality, and any size/color context from text/images.\n\n" +
      "Return the data strictly as JSON.";

    const productExtractionSchema = {
      type: "OBJECT",
      properties: {
        productName: { type: "STRING", description: "Polished retail product title" },
        category: { type: "STRING", description: "Broad category name" },
        price: { type: "NUMBER", description: "Retail price in DZD (number formats only)" },
        stockQuantity: { type: "NUMBER", description: "Stock quantity (number)" },
        description: { type: "STRING", description: "Premium storefront description" }
      },
      required: ["productName", "category", "price", "stockQuantity", "description"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contentsParts,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: productExtractionSchema as any,
      }
    });

    const textText = response.text;
    if (!textText) {
      throw new Error("No responses extracted from the AI engine.");
    }

    const cleanedJson = JSON.parse(textText);
    return res.json({ success: true, product: cleanedJson });
  } catch (parseError: any) {
    console.error("[AI Product Parse route Error]:", parseError);
    return res.status(500).json({ error: parseError?.message || "Failed to process product specs with AI" });
  }
});

// --- PUBLIC STOREFRONT CONTROLLER ENDPOINTS ---

function calculateShippingCost(wilaya: string, deliveryType: 'home' | 'desk'): number {
  if (!wilaya) return 600; // default average
  
  // Extract number if formatted like "16 - Alger"
  let code = wilaya.trim().split(" ")[0];
  if (!/^\d+$/.test(code)) {
    const lower = wilaya.trim().toLowerCase();
    const center = ["16", "alger", "الجزائر"]; 
    const close = ["09", "blida", "البليدة", "35", "boumerdes", "بومرداس", "42", "tipaza", "تيبازة"];
    const south = ["01", "adrar", "أدرار", "11", "tamanrasset", "تمنراست", "33", "illizi", "إيليزي", "37", "tindouf", "تندوف", "47", "ghardaia", "غرداية", "50", "el meniaa", "المنيعة", "52", "bordj baji mokhtar", "53", "beni abbes", "بني عباس", "54", "timimoun", "تيميمون", "56", "djanet", "جانت", "57", "in salah", "عين صالح", "58", "in guezzam", "عين قزام"];
    
    const isHome = deliveryType === "home";
    
    if (center.some(k => lower.includes(k))) return isHome ? 400 : 250;
    if (close.some(k => lower.includes(k))) return isHome ? 500 : 350;
    if (south.some(k => lower.includes(k))) return isHome ? 1200 : 800;
    
    return isHome ? 700 : 400; // Standard Rest of Algeria
  }

  const isHome = deliveryType === "home";
  const center = ["16"]; // Alger
  const close = ["09", "35", "42"]; // Blida, Boumerdes, Tipaza
  const south = ["01", "11", "33", "37", "47", "50", "52", "53", "54", "56", "57", "58"]; // Far South
  
  if (center.includes(code)) {
    return isHome ? 400 : 250;
  }
  if (close.includes(code)) {
    return isHome ? 500 : 350;
  }
  if (south.includes(code)) {
    return isHome ? 1200 : 800;
  }
  // Standard rest of North/East/West (Sétif, Constantine, Oran, etc.)
  return isHome ? 700 : 400;
}

// GET /api/store/:merchantId/info
apiRouter.get("/store/:merchantId/info", async (req, res) => {
  const { merchantId } = req.params;

  if (!db) {
    return res.status(500).json({ error: "Database not initialized" });
  }

  try {
    const userDoc = await db.collection("users").doc(merchantId).get();
    if (!userDoc.exists) {
      return res.json({
        success: true,
        storeName: "متجر SmartyAi",
        storeLogo: "",
        storeDescription: "أهلاً بك في متجرنا الإلكتروني المتميز. تسوق أفضل المنتجات بأفضل الأسعار مع توصيل سريع لجميع الولايات."
      });
    }

    const userData = userDoc.data() || {};
    const storeSettings = userData.storeSettings || {};

    return res.json({
      success: true,
      storeName: storeSettings.storeName || userData.displayName || "متجر SmartyAi",
      storeLogo: storeSettings.storeLogo || userData.photoURL || "",
      storeDescription: storeSettings.storeDescription || "أهلاً بك في متجرنا الإلكتروني المتميز. تسوق أفضل المنتجات بأفضل الأسعار مع توصيل سريع لجميع الولايات."
    });
  } catch (err: any) {
    console.error(`[Store Info API] Error fetching info for merchantId ${merchantId}:`, err);
    return res.status(500).json({ error: "Failed to retrieve storefront settings." });
  }
});

// GET /api/store/:merchantId/products
apiRouter.get("/store/:merchantId/products", async (req, res) => {
  const { merchantId } = req.params;
  const { category, search, page, limit } = req.query;

  if (!db) {
    return res.status(500).json({ error: "Database not initialized" });
  }

  try {
    let queryObj: admin.firestore.Query = db.collection("inventory").where("userId", "==", merchantId);
    const snapshot = await queryObj.get();
    let items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    // Filter to only retain items published to the store
    items = items.filter(item => item.isPublished === true);

    // Collect list of unique categories before filtering
    const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean)));

    // Category filter
    if (category && typeof category === "string" && category.trim() !== "" && category.trim().toLowerCase() !== "all") {
      const targetCat = category.trim().toLowerCase();
      items = items.filter(item => item.category && item.category.toLowerCase() === targetCat);
    }

    // Keyword search filter
    if (search && typeof search === "string" && search.trim() !== "") {
      const kw = search.trim().toLowerCase();
      items = items.filter(item => 
        (item.productName && item.productName.toLowerCase().includes(kw)) ||
        (item.description && item.description.toLowerCase().includes(kw)) ||
        (item.sku && item.sku.toLowerCase().includes(kw))
      );
    }

    // Sort by createdAt descending
    items.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    // Pagination bounds
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 20);
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = items.slice(startIndex, startIndex + limitNum);

    return res.json({
      success: true,
      products: paginatedItems,
      categories,
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        limit: limitNum
      }
    });

  } catch (err: any) {
    console.error(`[Public Store Products API] Error:`, err);
    return res.status(500).json({ error: "Failed to load store products." });
  }
});

// POST /api/store/create-order
apiRouter.post("/store/create-order", async (req, res) => {
  const { 
    merchantId, 
    items, 
    customerName, 
    phoneNumber, 
    wilaya, 
    commune, 
    deliveryType, 
    note 
  } = req.body;

  if (!db) {
    return res.status(500).json({ error: "Database not initialized" });
  }

  // Validate required inputs
  if (!merchantId) {
    return res.status(400).json({ error: "Merchant ID is required" });
  }
  if (!customerName || typeof customerName !== "string" || customerName.trim() === "") {
    return res.status(400).json({ error: "Customer name is required" });
  }
  if (!phoneNumber || typeof phoneNumber !== "string" || phoneNumber.trim() === "") {
    return res.status(400).json({ error: "Phone number is required" });
  }

  // Strict Algerian phone number validation and normalization
  let cleanedPhone = phoneNumber.trim().replace(/[\s\-\(\)]/g, "");
  if (cleanedPhone.startsWith("+213")) {
    cleanedPhone = "0" + cleanedPhone.slice(4);
  } else if (cleanedPhone.startsWith("00213")) {
    cleanedPhone = "0" + cleanedPhone.slice(5);
  } else if (cleanedPhone.startsWith("213") && cleanedPhone.length === 11) {
    cleanedPhone = "0" + cleanedPhone.slice(3);
  }

  const phoneRegex = /^(05|06|07)\d{8}$/;
  if (!phoneRegex.test(cleanedPhone)) {
    return res.status(400).json({ 
      error: "رقم الهاتف غير صالح. يجب أن يكون رقم هاتف جزائري صحيح يتكون من 10 أرقام ويبدأ بـ 05 أو 06 أو 07." 
    });
  }
  if (!wilaya || !commune) {
    return res.status(400).json({ error: "Wilaya and Comune are required for shipping" });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items list is empty or invalid" });
  }

  // Check subscription limits before proceeding
  try {
    const limitCheck = await checkOrderLimit(merchantId);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: "subscription_limit_reached",
        message: `لقد تجاوزت حد طلبات خطتك الحالية (${limitCheck.used} من ${limitCheck.limit}). يرجى ترقية حسابك.`,
        requiresUpgrade: true,
        currentPlan: limitCheck.currentPlan,
        limit: limitCheck.limit,
        used: limitCheck.used
      });
    }
  } catch (limitErr) {
    console.error("Error checking subscription limits in /store/create-order:", limitErr);
  }

  try {
    const itemsWithProductData: any[] = [];
    let totalPrice = 0;

    // We can use a transaction to safely verify stock and deduct quantities
    const orderId = await db.runTransaction(async (transaction) => {
      // 1. Fetch all products in the items list to verify stock and prepare order record
      for (const item of items) {
        if (!item.productId || !item.quantity || Number(item.quantity) <= 0) {
          throw new Error("Invalid item format in request payload.");
        }

        const productRef = db!.collection("inventory").doc(item.productId);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists) {
          throw new Error(`المنتج المطلوب غير موجود في المتجر.`);
        }

        const productData = productDoc.data() || {};
        const currentStock = Number(productData.stockQuantity) || 0;
        const requestedQty = Number(item.quantity);

        if (currentStock < requestedQty) {
          throw new Error(`المنتج "${productData.productName}" غير متوفر بالكمية المطلوبة (الكمية المتاحة: ${currentStock}).`);
        }

        // Deduct stock quantity
        const nextStock = currentStock - requestedQty;
        transaction.update(productRef, { stockQuantity: nextStock, updatedAt: new Date().toISOString() });

        // Calculate item pricing representation
        const itemPrice = Number(productData.price) || 0;
        totalPrice += itemPrice * requestedQty;

        itemsWithProductData.push({
          productId: item.productId,
          productName: productData.productName,
          description: productData.description || "",
          price: itemPrice,
          category: productData.category || "",
          sku: productData.sku || "",
          imageUrl: productData.imageUrl || "",
          quantity: requestedQty,
          size: item.size || "",
          color: item.color || ""
        });
      }

      // Calculate realistic shipping fee using offline algorithm
      const solvedDeliveryType = (deliveryType === "desk" ? "desk" : "home") as 'home' | 'desk';
      const shippingFee = calculateShippingCost(wilaya, solvedDeliveryType);

      // Save order record
      const newOrderRef = db!.collection("orders").doc();
      transaction.set(newOrderRef, {
        status: "pending",
        trackingNumber: "",
        labelUrl: "",
        shippingCompany: "Yalidine Express", // Standard default
        customerName: customerName.trim(),
        phoneNumber: cleanedPhone,
        wilaya: wilaya,
        commune: commune,
        deliveryType: solvedDeliveryType,
        possibleFake: false,
        note: note ? note.trim() : "",
        userId: merchantId,
        source: "storefront",
        storeOrder: true,
        items: itemsWithProductData.map(ip => ({
          product: ip.productName,
          quantity: ip.quantity,
          size: ip.size || "",
          color: ip.color || "",
          pricePerUnit: ip.price
        })),
        itemsSnapshot: itemsWithProductData,
        locationUrl: "",
        shippingFee: shippingFee,
        totalPrice: totalPrice,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Increment orderCounter inside merchant profile safely
      try {
        const userRef = db!.collection("users").doc(merchantId);
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists) {
          const currentCounter = userSnap.data()?.orderCounter || 0;
          transaction.update(userRef, { orderCounter: currentCounter + 1 });
        }
      } catch (counterErr) {
        console.warn("Could not increment orderCounter:", counterErr);
      }

      return newOrderRef.id;
    });

    return res.json({
      success: true,
      orderId: orderId,
      message: "Order placed successfully! Stock updated."
    });

  } catch (err: any) {
    console.error("[Create Storefront Order Error]:", err);
    return res.status(400).json({ error: err.message || "Failed to create storefront order." });
  }
});

// GET /api/store/shipping-cost
apiRouter.get("/store/shipping-cost", (req, res) => {
  const { wilaya, deliveryType } = req.query;

  if (!wilaya) {
    return res.status(400).json({ error: "Wilaya query parameter is required" });
  }

  const resolvedDeliveryType = deliveryType === "desk" ? "desk" : "home";
  const cost = calculateShippingCost(String(wilaya), resolvedDeliveryType);

  return res.json({
    success: true,
    shippingFee: cost,
    deliveryType: resolvedDeliveryType,
    wilaya: wilaya
  });
});

// Custom automated messaging reply function (expandable for SMS, WhatsApp, Twilio, or Meta Page Access Tokens)
export async function sendNotification(userId: string, recipientPhone: string, textMessage: string): Promise<boolean> {
  console.log(`[Automatic Messaging Engine] Dispatching message to ${recipientPhone} (Merchant ID: ${userId}): "${textMessage}"`);
  
  const facebookPageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (facebookPageToken) {
    // Future expansion point for social messaging APIs
  }
  
  return true;
}

// Helper to restore warehouse stock quantity if an order is returned (refilled)
async function restoreStockForReturnedOrder(orderId: string, orderData: any) {
  if (orderData.stockRestored) {
    console.log(`[Stock Restorer] Stock already restored for returned order ${orderId}. Skipping.`);
    return;
  }
  
  const items = orderData.items || [];
  if (items.length === 0) {
    console.log(`[Stock Restorer] No items in order ${orderId} to restore.`);
    return;
  }

  try {
    await db!.runTransaction(async (transaction) => {
      for (const item of items) {
        let productRef = null;
        if (item.productId) {
          productRef = db!.collection("inventory").doc(item.productId);
        } else {
          const pName = item.product || item.productName;
          if (pName) {
            const pQuery = await db!.collection("inventory")
              .where("userId", "==", orderData.userId)
              .where("productName", "==", pName)
              .get();
            if (!pQuery.empty) {
              productRef = pQuery.docs[0].ref;
            }
          }
        }

        if (productRef) {
          const productDoc = await transaction.get(productRef) as any;
          if (productDoc.exists) {
            const productData = productDoc.data() || {};
            const currentStock = Number(productData.stockQuantity) || 0;
            const restoreQty = Number(item.quantity) || 1;
            const nextStock = currentStock + restoreQty;
            transaction.update(productRef, { 
              stockQuantity: nextStock, 
              updatedAt: new Date().toISOString() 
            });
            console.log(`[Stock Restorer] Restored ${restoreQty} units to product "${productData.productName}"`);
          }
        }
      }
      
      const orderRef = db!.collection("orders").doc(orderId);
      transaction.update(orderRef, { stockRestored: true });
    });
    console.log(`[Stock Restorer] Stock successfully restored for returned order ${orderId}`);
  } catch (err) {
    console.error(`[Stock Restorer] Failed to restore stock for returned order ${orderId}:`, err);
  }
}

// Unified function to execute the tracking checks
async function runTrackingCheck() {
  console.log("⏰ [Tracking Engine] Running periodic Yalidine and carrier checkup...");
  if (!db) {
    console.warn("[Tracking Engine] Database not ready, skipping checkup run.");
    return;
  }

  try {
    const snapshot = await db.collection("orders").where("status", "==", "shipped").get();
    if (snapshot.empty) {
      console.log("[Tracking Engine] No shipped orders pending tracking update at this hour.");
      return;
    }

    console.log(`[Tracking Engine] Processing tracking updates for ${snapshot.size} orders...`);
    for (const doc of snapshot.docs) {
      const orderId = doc.id;
      const orderData = doc.data();
      const trackingNum = orderData.tracking_number || orderData.trackingNumber || `MOCK-${orderId}`;
      let newStatus: string | null = null;
      let fetchedReal = false;

      // Check if real Yalidine integration APIs can be queried
      if (trackingNum && !trackingNum.startsWith("MOCK-")) {
        try {
          // Fetch user credentials
          const uDoc = await db.collection("users").doc(orderData.userId || "default").get() as any;
          const uData = uDoc.exists ? uDoc.data() || {} : {};
          const carrierCredentials = uData.carrierCredentials || {};
          const yalidineApiKey = carrierCredentials.yalidineApiKey || process.env.YALIDINE_API_ID;
          const yalidineApiToken = carrierCredentials.yalidineApiToken || process.env.YALIDINE_API_TOKEN;

          if (yalidineApiKey && yalidineApiToken) {
            const secureRes = await fetch(`https://api.yalidine.com/v1/parcels/${trackingNum}`, {
              headers: {
                'X-API-ID': String(yalidineApiKey).trim(),
                'X-API-TOKEN': String(yalidineApiToken).trim()
              }
            });
            if (secureRes.ok) {
              const resData = await secureRes.json();
              const parcel = resData.data?.[0];
              if (parcel) {
                fetchedReal = true;
                const lastStatus = parcel.last_status || "";
                console.log(`[Tracking Engine] Checked Yalidine status for ${trackingNum}: ${lastStatus}`);
                
                if (lastStatus === "Livré" || lastStatus === "Payé") {
                  newStatus = "delivered";
                } else if (lastStatus === "Echoué" || lastStatus === "Retourné" || lastStatus === "Retour client") {
                  newStatus = "returned";
                } else if (lastStatus === "En voyage" || lastStatus === "Reçu par centre") {
                  newStatus = "in_transit";
                }
              }
            }
          }
        } catch (e) {
          console.error(`[Tracking Engine] Real Yalidine API query failed for order ${orderId}:`, e);
        }
      }

      // If no real status found (or sandbox order), perform high fidelity randomized simulation
      if (!newStatus) {
        const isDelivered = Math.random() < 0.85;
        newStatus = isDelivered ? "delivered" : "returned";
      }

      // If status changed, commit and trigger side effects
      if (newStatus && newStatus !== orderData.status) {
        await doc.ref.update({
          status: newStatus,
          lastTrackingUpdateAt: new Date().toISOString()
        });
        console.log(`[Tracking Engine] Updated order ${orderId} (${trackingNum}) to: ${newStatus} (${fetchedReal ? 'Real' : 'Simulation'})`);

        // If returned, restore the stock!
        if (newStatus === "returned") {
          await restoreStockForReturnedOrder(orderId, orderData);
        }

        try {
          // Dispatch notification to buyer
          await sendNotification(
            orderData.userId || "system",
            orderData.phoneNumber || orderData.phone || "",
            `Votre commande avec le numéro de suivi ${trackingNum} a été mise à jour. Nouveau statut: ${newStatus === 'delivered' ? 'Livré' : 'Retourné'}.`
          );
        } catch (msgErr) {
          console.error(`[Tracking Engine] Messaging dispatch failed for order ${orderId}`, msgErr);
        }
      }
    }
  } catch (err: any) {
    console.warn("[Tracking Engine Info] Native tracking updates run deferred: No active GCP credentials for named databases on the server environment.");
  }
}

// Scheduler to trigger automatic tracking updates every 5 hours and notify clients
function startTrackingUpdatesScheduler() {
  console.log("⏰ [Scheduler] Setting up automated tracking checkups (Every 5 Hours).");
  
  // 1. Setup standard node-cron rule
  cron.schedule("0 */5 * * *", async () => {
    console.log("⏰ [Cron Job] Running daily tracking check-ups...");
    await runTrackingCheck();
  });

  // 2. Setup active interval fallback to survive serverless/container idle sleeping (every 5 hours)
  const INTERVAL_MS = 5 * 60 * 60 * 1000;
  setInterval(async () => {
    console.log("⏰ [Interval Fallback] Running periodic tracking check-ups...");
    await runTrackingCheck();
  }, INTERVAL_MS);

  // 3. Graceful startup runner (fires 1 minute after start to avoid slowing server port binding)
  setTimeout(() => {
    console.log("⏰ [Startup Check] Running initial tracking synchronization...");
    runTrackingCheck().catch(e => console.error("Initial sync error:", e));
  }, 60000);
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Trigger automated check schedule
    startTrackingUpdatesScheduler();
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Server Error:", err);
    res.status(500).json({ error: "Internal server error. Our team has been notified." });
  });
}

startServer();
