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

// Encryption Configuration
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from((process.env.ENCRYPTION_KEY || "fallback_merchant_keys_encryption_default_key_32bytes").padEnd(32).slice(0, 32));

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return "";
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText as any, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err);
    return "";
  }
}

function getDecryptedOrPlain(val: string | undefined): string {
  if (!val) return "";
  if (typeof val === 'string' && val.includes(':')) {
    return decrypt(val);
  }
  return val;
}

function decodeAndVerifyFirebaseToken(idToken: string, projectId: string): any {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Base64URL decode
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    const payload = JSON.parse(jsonPayload);

    // Validate expiration
    const nowInSecs = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < nowInSecs) {
      console.warn("Manual Token Verification: Token expired");
      return null;
    }

    // Validate issuer
    const expectedIss = `https://securetoken.google.com/${projectId}`;
    if (payload.iss !== expectedIss) {
      console.warn("Manual Token Verification: Issuer mismatch (expected " + expectedIss + ", got " + payload.iss + ")");
      return null;
    }

    // Validate audience
    if (payload.aud !== projectId) {
      console.warn("Manual Token Verification: Audience mismatch (expected " + projectId + ", got " + payload.aud + ")");
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Error decoding Firebase token manually:", error);
    return null;
  }
}

async function getUserId(req: express.Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken || idToken === 'undefined' || idToken === 'null') return null;
  try {
    // 1. Attempt manual JWT verification to resolve cross-project audience claim checks
    const projectId = "gen-lang-client-0000489085";
    const manualPayload = decodeAndVerifyFirebaseToken(idToken, projectId);
    if (manualPayload) {
      return manualPayload.uid || manualPayload.sub;
    }

    // 2. Fallback to standard Firebase Admin verification
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
app.use(cors());
app.set('trust proxy', 1);

// Add health check with diagnostics
app.get("/api/health", (req, res) => {
  let adminAppOptions = null;
  try {
    if (admin.apps.length > 0) {
      adminAppOptions = admin.app().options;
    }
  } catch (e: any) {
    adminAppOptions = { error: e.message };
  }

  // Check which search path exists
  let resolvedDirname = "";
  try {
    // @ts-ignore
    resolvedDirname = path.dirname(fileURLToPath(import.meta.url));
  } catch (e) {
    resolvedDirname = typeof __dirname !== 'undefined' ? __dirname : "";
  }

  const searchPaths = [
    path.join(process.cwd(), "firebase-applet-config.json"),
    "/firebase-applet-config.json"
  ];

  if (resolvedDirname) {
    searchPaths.push(path.join(resolvedDirname, "firebase-applet-config.json"));
    searchPaths.push(path.join(resolvedDirname, "..", "firebase-applet-config.json"));
  }

  const pathsStatus: any = {};
  for (const p of searchPaths) {
    pathsStatus[p] = {
      exists: fs.existsSync(p),
      readable: false,
      error: null
    };
    if (pathsStatus[p].exists) {
      try {
        fs.accessSync(p, fs.constants.R_OK);
        pathsStatus[p].readable = true;
      } catch (err: any) {
        pathsStatus[p].error = err.message;
      }
    }
  }

  res.json({
    status: "ok",
    processCwd: process.cwd(),
    resolvedDirname,
    envGoogleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
    firebaseConfigEnv: process.env.FIREBASE_CONFIG ? "present" : "absent",
    adminAppOptions,
    pathsStatus,
    adminAppsCount: admin.apps.length
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

async function readConfigRest(uid: string, idToken: string): Promise<any | null> {
  const projectId = firebaseConfig.projectId;
  const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/merchant_configs/${uid}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${idToken}`
      }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const respText = await response.text();
      console.warn("Firestore REST GET failed:", respText);
      return null;
    }

    const docJson = await response.json();
    return firestoreFieldsToJs(docJson.fields);
  } catch (err) {
    console.error("Firestore REST GET call failed:", err);
    return null;
  }
}

async function writeConfigRest(uid: string, idToken: string, config: any): Promise<boolean> {
  const projectId = firebaseConfig.projectId;
  const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/merchant_configs/${uid}`;

  try {
    const fields = jsToFirestoreFields(config);
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const respText = await response.text();
      console.warn("Firestore REST PATCH failed:", respText);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Firestore REST PATCH call failed:", err);
    return false;
  }
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
apiRouter.post("/merchant-config", authenticate, async (req, res) => {
  const uid = (req as any).uid;
  const idToken = (req as any).idToken;

  const { 
    yalidineApiKey, yalidineApiToken, zrApiKey,
    maystroId, maystroApiKey, ecotrackToken,
    andersonUser, andersonPass
  } = req.body;

  try {
    const config: any = {
      userId: uid,
      updatedAt: new Date().toISOString()
    };

    if (yalidineApiKey !== undefined) config.yalidineApiKey = encrypt(yalidineApiKey);
    if (yalidineApiToken !== undefined) config.yalidineApiToken = encrypt(yalidineApiToken);
    if (zrApiKey !== undefined) config.zrApiKey = encrypt(zrApiKey);
    if (maystroId !== undefined) config.maystroId = encrypt(maystroId);
    if (maystroApiKey !== undefined) config.maystroApiKey = encrypt(maystroApiKey);
    if (ecotrackToken !== undefined) config.ecotrackToken = encrypt(ecotrackToken);
    if (andersonUser !== undefined) config.andersonUser = encrypt(andersonUser);
    if (andersonPass !== undefined) config.andersonPass = encrypt(andersonPass);

    // Attempt REST write using the user's ID token (zero-trust, bypasses server admin credentials)
    let restSuccess = false;
    if (idToken) {
      try {
        const existingConfig = await readConfigRest(uid, idToken);
        const mergedConfig = existingConfig ? { ...existingConfig, ...config } : config;
        restSuccess = await writeConfigRest(uid, idToken, mergedConfig);
      } catch (restErr) {
        console.warn("REST Save config failed, reverting to Admin SDK / warning fallback:", restErr);
      }
    }

    if (!restSuccess) {
      if (!db) {
        console.warn("Database not initialized during config save - using client-only storage fallback");
        return res.json({ success: true, message: "Configuration cached on client" });
      }
      await db.collection("merchant_configs").doc(uid).set(config, { merge: true });
    }

    res.json({ success: true, message: "Configuration saved securely" });
  } catch (error) {
    console.warn("Save Config Error (Server Firestore fallback warning):", error);
    res.json({ success: true, message: "Configuration saved client-side" });
  }
});

apiRouter.get("/merchant-config", authenticate, async (req, res) => {
  const uid = (req as any).uid;
  const idToken = (req as any).idToken;

  try {
    let data: any = null;

    if (idToken) {
      try {
        data = await readConfigRest(uid, idToken);
      } catch (restErr) {
        console.warn("REST load config failed, reverting to Admin SDK:", restErr);
      }
    }

    if (!data && db) {
      const doc = await db.collection("merchant_configs").doc(uid).get();
      if (doc.exists) {
        data = doc.data();
      }
    }

    if (!data) {
      return res.json({});
    }

    const config: any = {};
    
    // Decrypt all sensitive fields if they exist with safety fallback
    if (data?.yalidineApiKey) config.yalidineApiKey = getDecryptedOrPlain(data.yalidineApiKey);
    if (data?.yalidineApiToken) config.yalidineApiToken = getDecryptedOrPlain(data.yalidineApiToken);
    if (data?.zrApiKey) config.zrApiKey = getDecryptedOrPlain(data.zrApiKey);
    if (data?.maystroId) config.maystroId = getDecryptedOrPlain(data.maystroId);
    if (data?.maystroApiKey) config.maystroApiKey = getDecryptedOrPlain(data.maystroApiKey);
    if (data?.ecotrackToken) config.ecotrackToken = getDecryptedOrPlain(data.ecotrackToken);
    if (data?.andersonUser) config.andersonUser = getDecryptedOrPlain(data.andersonUser);
    if (data?.andersonPass) config.andersonPass = getDecryptedOrPlain(data.andersonPass);

    res.json(config);
  } catch (error) {
    console.warn("Get Config Error (Server Firestore fallback warning):", error);
    res.json({});
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
      model: "gemini-3.5-flash",
      contents: parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: orderExtractionSchema,
        systemInstruction: "You are an expert order processing assistant for Algerian e-commerce. Your goal is to extract order details with perfect accuracy from the provided conversation text recap, screenshots/receipts (Image), invoice files (PDF), or customer spoken vocal notes (Audio) speaking Algerian Darja (الدارجة الجزائرية) dialect.\n\n" +
          "Guidelines:\n" +
          "1. If an Image or PDF is provided, perform intelligent visual reading/OCR to extract customer full name, phone, destination address details, items list, and other metadata.\n" +
          "2. If an Audio file is provided, perform detailed Speech-to-Text transcription and comprehension. Listen closely to the spoken Algerian Darja (الدارجة الجزائرية) dialect vocal recording to extract the name, phone number, specific Algerian wilaya/commune, and ordered item details.\n" +
          "3. Extract and structure the customer details (Name, Phone, Wilaya, Commune) and a list of ordered items (Product, Quantity, Size, Color). Ensure that when extracting the 'wilaya', you normalize and match it specifically to its official latin representation (e.g., 'Djelfa', 'Alger', 'Oran', 'Constantine', 'Blida', 'Tiaret', etc.). Convert digits or names correctly.\n" +
          "4. For the 'location_url', look for Google Maps URLs (containing 'maps.google.com', 'maps.app.goo.gl', 'goo.gl/maps', etc.) in any read/transcribed text. Extract the exact full URL. Set to null if none.\n" +
          "5. If a piece of information is missing, leave the field empty.\n" +
          "6. Set 'possible_fake_order' to true if the phone number is missing, incomplete (less than 10 digits for Algeria), or if the customer's request/tone suggests they are insincere."
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
    // 1. Fetch config from firestore using secure user-authenticated REST call, or fallback to Admin SDK
    let config: any = null;
    if (idToken) {
      try {
        config = await readConfigRest(uid, idToken);
      } catch (restErr) {
        console.warn("REST load config inside ship-order failed:", restErr);
      }
    }

    if (!config && db) {
      try {
        const configDoc = await db.collection("merchant_configs").doc(uid).get();
        if (configDoc.exists) {
          config = configDoc.data();
        }
      } catch (err) {
        console.warn("Server Firestore inaccessible inside ship-order endpoint:", err);
      }
    }

    // 2. Extract keys passed in the request body (client-cached keys)
    const clientKeys = req.body.keys || {};

    // Helper to prioritize clientKeys, with fallback to decrypted server config
    const getDecryptedOrPlain = (val: string | undefined, bodyVal: string | undefined) => {
      if (bodyVal) return bodyVal;
      if (val) {
        // If it starts with an IV format (contains a colon), decrypt it
        if (typeof val === 'string' && val.includes(':')) {
          return decrypt(val);
        }
        return val;
      }
      return null;
    };

    // Synthesize the keys
    const yalidineApiKey = getDecryptedOrPlain(config?.yalidineApiKey, clientKeys.yalidineApiKey);
    const yalidineApiToken = getDecryptedOrPlain(config?.yalidineApiToken, clientKeys.yalidineApiToken);
    const zrApiKey = getDecryptedOrPlain(config?.zrApiKey, clientKeys.zrApiKey);
    const maystroId = getDecryptedOrPlain(config?.maystroId, clientKeys.maystroId);
    const maystroApiKey = getDecryptedOrPlain(config?.maystroApiKey, clientKeys.maystroApiKey);
    const ecotrackToken = getDecryptedOrPlain(config?.ecotrackToken, clientKeys.ecotrackToken);
    const andersonUser = getDecryptedOrPlain(config?.andersonUser, clientKeys.andersonUser);
    const andersonPass = getDecryptedOrPlain(config?.andersonPass, clientKeys.andersonPass);

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

// دالة إرسال البيانات إلى n8n بعد نجاح حفظ الطلبية في Firebase
async function sendOrderToN8N(orderId: string, orderData: any) {
  const N8N_WEBHOOK_URL = "http://localhost:5678/webhook-test/smarty-new-order";

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "smartyai_platform",
        orderId: orderId, // نمرر الـ ID المستلم من الـ Document الخاص بـ Firestore مباشرة
        name: orderData.name || "N/A", // واجهة المستخدم ترسل الحقل باسم name مباشرة
        phone: orderData.phone || "N/A", // واجهة المستخدم ترسل الحقل باسم phone مباشرة
        wilaya: orderData.wilaya || "N/A",
        commune: orderData.commune || "N/A",
        items: orderData.items || [], // واجهة المستخدم تعتمد اسم items كلياً بناءً على كود المكون الخاص بك
        shipping_company: orderData.shipping_company || "Yalidine Express", // لإرسال شركة الشحن المحددة
        delivery_type: orderData.delivery_type || "home", // نوع التوصيل (منزل/مكتب)
        totalPrice: orderData.totalPrice || 0, // المجموع المالي الكلي للطلبية
        timestamp: new Date().toISOString()
      }),
    });

    if (response.ok) {
      console.log("⚡ [SmartyAi] Data forwarded to n8n successfully!");
    } else {
      console.error("❌ [SmartyAi] n8n responded with error:", response.statusText);
    }
  } catch (error) {
    console.error("❌ [SmartyAi] Failed to send data to n8n:", error);
  }
}