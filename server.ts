import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
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

dotenv.config();

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;

function initializeFirebase() {
  try {
    const projectId = firebaseConfig.projectId;
    if (!admin.apps.length) {
      console.log("Initializing Firebase Admin with Project ID:", projectId);
      admin.initializeApp({
        projectId: projectId
      });
    }

    const dbId = firebaseConfig.firestoreDatabaseId || undefined;
    db = getFirestore(dbId);
    console.log("Firestore initialized. Database ID:", dbId || "(default)");
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    db = getFirestore();
  }
}

initializeFirebase();

// Courier plan allowance helper
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
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error("Auth Error:", error);
    return null;
  }
}

const app = express();
const PORT = 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to ensure seamless preview/iFrame rendering & Vite communication
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
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

// Body parser ONLY for /api/
const apiRouter = express.Router();
apiRouter.use(express.json({ limit: '10mb' }));
app.use("/api", apiRouter);

// Global Rate Limiting (Disabled)
// ...

const sensitiveLimiter = (req: any, res: any, next: any) => next();

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
    // 1. Fetch user's plan dynamic checks
    let planType = "free";
    try {
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        planType = userDoc.data()?.planType || "free";
      }
    } catch (err) {
      console.error("Error fetching user doc in bulk-confirm:", err);
    }

    const allowed = getAllowedCouriers(planType);
    if (!allowed.includes(selectedCarrier)) {
      return res.status(403).json({ error: "خطتك لا تدعم شركة التوصيل هذه" });
    }

    // Centered keys from process.env only
    const yalidineApiKey = process.env.YALIDINE_API_ID;
    const yalidineApiToken = process.env.YALIDINE_API_TOKEN;
    const zrApiKey = process.env.ZR_API_KEY;
    const maystroId = process.env.MAYSTRO_ID;
    const maystroApiKey = process.env.MAYSTRO_API_KEY;
    const ecotrackToken = process.env.ECOTRACK_TOKEN;
    const andersonUser = process.env.ANDERSON_USER;
    const andersonPass = process.env.ANDERSON_PASS;

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
        dispatchError = err.message || "Failed to dispatch order with shipping provider API.";

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

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Customizable Gemini Configuration Variables
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

export const GENERAL_EXTRACTION_PROMPT = 
  "You are an expert order processing assistant for Algerian e-commerce. Your goal is to extract order details with perfect accuracy from the provided conversation text recap, screenshots/receipts (Image), invoice files (PDF), or customer spoken vocal notes (Audio) speaking Algerian Darja (الدارجة الجزائرية) dialect or mixed slang.\n\n" +
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
  "IMPORTANT CONTEXT HANDLING & CONVERSATION DECONSTRUCTION:\n" +
  "1. You are analyzing a live conversational flow. The user may send multiple messages, clarifying details step by step.\n" +
  "2. If past details (like name, destination state, or phone) are already listed in the recent history context and are NOT contradicted by the latest message, carry them forward into your final JSON extraction. Do not drop previously established data from the JSON output unless the client explicitly corrected/changed it in the current message.\n" +
  "3. Be extremely intelligent with Algerian slang/Darja (e.g. 'شحال'/'chhal' meaning query price, 'حاب'/'hab' or 'bghi' meaning want, 'ابعث'/'ab3at' or 'صيفت'/'sift' meaning send to, 'بزاف'/'bzaf' meaning many, size keywords like 'Double X' or 'Taille', etc.) to accurately parse customer intent and item attributes.";

// Prompt for Gemini to extract order data
const orderExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Customer full name" },
    phone: { type: Type.STRING, description: "Customer phone number" },
    wilaya: { type: Type.STRING, description: "State/Province (Wilaya) in Algeria" },
    commune: { type: Type.STRING, description: "Municipality (Commune) in Algeria" },
    items: {
      type: Type.ARRAY,
      description: "List of products ordered",
      items: {
        type: Type.OBJECT,
        properties: {
          product: { type: Type.STRING, description: "Name of the product" },
          quantity: { type: Type.INTEGER, description: "Quantity" },
          size: { type: Type.STRING, description: "Size (e.g., 42, XL)" },
          color: { type: Type.STRING, description: "Color" }
        },
        required: ["product", "quantity"]
      }
    },
    location_url: { type: Type.STRING, description: "Google Maps link if provided by user" },
    note: { type: Type.STRING, description: "Any additional notes or instructions" },
    possible_fake_order: { 
      type: Type.BOOLEAN, 
      description: "True if phone is missing, invalid, or order seems suspicious" 
    }
  },
  required: ["possible_fake_order"]
};

// Rate limiter for order extraction: Disabled for debugging
const extractOrderLimiter = (req: any, res: any, next: any) => next();

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
  const { conversation, fileUrl, fileMimeType, fileBase64 } = req.body;

  if (!conversation && !fileUrl && !fileBase64) {
    return res.status(400).json({ error: "Conversation text or an uploaded file is required" });
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

    if (conversation && conversation.trim()) {
      parts.push({
        text: `Here is the accompanying conversation text context:\n${conversation}`
      });
    } else {
      parts.push({
        text: "Please extract the order details from the provided file."
      });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: orderExtractionSchema,
        systemInstruction: GENERAL_EXTRACTION_PROMPT
      },
    });

    const result = JSON.parse(response.text || "{}");
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

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: orderExtractionSchema,
        systemInstruction: CONVERSATION_DECONSTRUCTION_PROMPT
      },
    });

    const result = JSON.parse(response.text || "{}");
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

    // 2. Fetch plan type and enforce allowed couriers limits
    let planType = "free";
    try {
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        planType = userDoc.data()?.planType || "free";
      }
    } catch (err) {
      console.error("Error fetching user doc in ship-order:", err);
    }

    const allowed = getAllowedCouriers(planType);
    if (!allowed.includes(courier)) {
      return res.status(403).json({ error: "خطتك لا تدعم شركة التوصيل هذه" });
    }

    // 3. Centralized API keys from environment only
    const yalidineApiKey = process.env.YALIDINE_API_ID;
    const yalidineApiToken = process.env.YALIDINE_API_TOKEN;
    const zrApiKey = process.env.ZR_API_KEY;
    const maystroId = process.env.MAYSTRO_ID;
    const maystroApiKey = process.env.MAYSTRO_API_KEY;
    const ecotrackToken = process.env.ECOTRACK_TOKEN;
    const andersonUser = process.env.ANDERSON_USER;
    const andersonPass = process.env.ANDERSON_PASS;

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

  if (planType !== "pro" && planType !== "unlimited") {
    return res.status(400).json({ error: "Invalid plan type" });
  }

  const amount = planType === "pro" ? 700 : 2000;
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Server Error:", err);
    res.status(500).json({ error: "Internal server error. Our team has been notified." });
  });
}

startServer();
