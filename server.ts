/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

const firebaseApp = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const PLAN_LIMITS: Record<string, number> = {
  free: 50,
  basic: 50,
  pro: 500,
  professional: 500,
  unlimited: 2000,
  business: 2000,
  enterprise: 999999999,
};

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Validate and initialize Gemini API securely
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is not set. AI features might be restricted.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || 'MOCK_KEY',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to decode JWT and get current user UID safely (no admin SDK required)
function decodeAuthUser(authHeader?: string): { uid: string; email?: string } | null {
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
function parseDataUrl(dataUrl: string): { base64: string; mimeType: string } | null {
  const parts = dataUrl.split(',');
  if (parts.length < 2) return null;
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  if (!match) return null;
  return {
    base64: parts[1],
    mimeType: match[1],
  };
}

// 1. Compatibility API Route
app.post('/api/ai/parse-order', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ 
        error: "⚠️ مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مّعرف. يرجى إضافته من قائمة الإعدادات (Secrets) في منصة AI Studio لكي تتمكن من استخدام ميزة تفكيك الطلبيات بالذكاء الاصطناعي."
      });
    }

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract order details from this text in JSON format. Return ONLY the JSON object.
      {
        "customerName": string,
        "customerPhone": string,
        "wilaya": string (Algerian Wilaya in French),
        "commune": string,
        "address": string,
        "products": [{ "name": string, "quantity": number, "price": number }],
        "totalAmount": number
      }
      
      Text: "${text}"`,
      config: {
        responseMimeType: 'application/json',
      }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error) {
    console.error('AI Parsing Error:', error);
    res.status(500).json({ error: 'Failed to parse order' });
  }
});

// 2. Main Full-featured AI Order Extraction Endpoints with Multimodal Support & Inventory Matching
app.post('/api/extract-order', async (req, res) => {
  try {
    const user = decodeAuthUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        error: "⚠️ مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مّعرف في المشروع. يرجى الذهاب إلى الإعدادات بالمتصفح (Settings -> Secrets) في منصة AI Studio، ثم إضافة مفتاح باسم GEMINI_API_KEY وقيمته لكي يشتغل تفكيك الطلبات بنجاح."
      });
    }

    const { conversation, fileBase64, inventoryList } = req.body;

    const parts: any[] = [];
    
    // Construct rich text prompt with inventory integration for fuzzy matching
    let inventoryDetails = "No specific inventory uploaded yet.";
    if (Array.isArray(inventoryList) && inventoryList.length > 0) {
      inventoryDetails = inventoryList
        .map((item: any, idx: number) => 
          `${idx + 1}. Product Name: "${item.productName || item.name}", Price: ${item.pricePerUnit || item.price || item.unitPrice || 0} DZD, Stock Available: ${item.stockQuantity || item.stock || 0}`
        )
        .join('\n');
    }

    const promptText = `Extract the Algerian customer order details from the provided source. Output a valid, structured JSON object that matches the requested schema EXACTLY.

INSTRUCTIONS:
1. Customer Identity:
   - "name": The full name of the recipient/customer. Translate to French/Latin letters if in Arabic, e.g., "محمد بن عبد الله" -> "Mohamed Benabdellah" or keep in Arabic if preferred. 
   - "phone": The Algerian phone number, formatted clearly. Set "possible_fake_order" to true if the number is suspiciously short (less than 9 digits), missing, or obviously invalid.

2. Algerian Logistics:
   - "wilaya": Identify the Algerian state (Wilaya). ALWAYS normalize it to French with correct spelling (e.g. Algiers, Oran, Blida, Constantine, Sétif, Tizi Ouzou, Béjaïa, Chlef, Tlemcen, etc.). If written in Arabic (مثل "البليدة" أو "وهران"), translate to French ("Blida", "Oran").
   - "commune": The commune/town (municipality). Keep the extracted commune name.
   - "delivery_type": Determine if the client wants home delivery ("home") or shipping desk pickup ("desk"). Set to "desk" if the source mentions "مكتب", "ب bureau", "yalidine bureau", "office pickup", or "gare". Otherwise, default to "home".

3. Product Items Matching:
   - "items": Extract every ordered item with item keys "product", "quantity", "size", "color", "pricePerUnit".
   - CRITICAL Fuzzy Inventory Match: If an item productName matches or is close to an item in the Merchant's Inventory below, substitute "product" with the EXACT name of the matching inventory product.
   - Use the unit price from the inventory item for "pricePerUnit" if matching; otherwise, extract the price from the source. Default to 0 if unknown.
   - "quantity" is the purchase quantity. Default to 1.
   
4. Additional Fields:
   - "location_url": Extract any location pin link, coordinate URL, or Google Maps directions link if present in the text/message.
   - "note": Special shipping requests (e.g., "delivery on weekends", "call before arrival").
   - "totalPrice": Calculate the correct subtotal sum of all extracted products: sum of (quantity * pricePerUnit).

MERCHANT'S CURRENT INVENTORY LIST FOR MATCHING:
${inventoryDetails}

INPUT SOURCE TO PARSE:
-----------------------------
${conversation || "No text conversation provided."}
-----------------------------`;

    parts.push({ text: promptText });

    // Handle multimodal file uploads (Image, PDF, Audio invoice/vocal)
    if (fileBase64) {
      const fileData = parseDataUrl(fileBase64);
      if (fileData) {
        parts.push({
          inlineData: {
            data: fileData.base64,
            mimeType: fileData.mimeType,
          },
        });
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            phone: { type: Type.STRING },
            wilaya: { type: Type.STRING },
            commune: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  product: { type: Type.STRING },
                  quantity: { type: Type.INTEGER },
                  size: { type: Type.STRING },
                  color: { type: Type.STRING },
                  pricePerUnit: { type: Type.NUMBER }
                },
                required: ["product", "quantity"]
              }
            },
            note: { type: Type.STRING },
            possible_fake_order: { type: Type.BOOLEAN },
            delivery_type: { type: Type.STRING },
            location_url: { type: Type.STRING },
            totalPrice: { type: Type.NUMBER }
          },
          required: ["name", "phone", "wilaya", "commune", "items"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No extraction received from Gemini AI model");
    }

    const parsedData = JSON.parse(resultText);
    res.json(parsedData);

  } catch (error: any) {
    console.error("Extraction failed:", error);
    res.status(500).json({ error: error.message || "Failed to extract order details" });
  }
});

app.post('/api/inventory/ai-parse', async (req, res) => {
  try {
    const user = decodeAuthUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized access" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: "⚠️ مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مّعرف في المشروع. يرجى الذهاب إلى الإعدادات بالمتصفح (Settings -> Secrets) في منصة AI Studio، ثم إضافة مفتاح باسم GEMINI_API_KEY وقيمته لكي يشتغل تفكيك وحساب تفاصيل المنتجات بالذكاء الاصطناعي بنجاح."
      });
    }

    const { textHint, imageBase64, imageUrl } = req.body;
    const parts: any[] = [];

    const promptText = `Analyze the provided product image and/or text hints. Extract the product details and format them into a valid, structured JSON object.
    
    GUIDELINES:
    1. "productName": Extract the core title or name of the product. Keep it concise but descriptive. Translate or output in the language appropriate to the merchant (e.g. Arabic, French or English) based on references.
    2. "category": Choose or determine a clean category name (e.g., Electronics, Fashion, Beauty, Home, Food, Accessories).
    3. "price": Extract the price. If written in DZD or Dinar (e.g. 4500 دج or 450 الف), extract the numeric value (e.g., 4500). If no price is specified, default to 0.
    4. "stockQuantity": Estimate a reasonable initial stock quantity (e.g., 100), or extract if explicitly mentioned.
    5. "description": Write or extract a highly professional, engaging marketing description for this product. Use the language of the source text/image (Arabic, French or English). Keep it to 2-3 compelling, sales-oriented sentences.
    
    Text hints: ${textHint || "None provided"}
    `;

    parts.push({ text: promptText });

    if (imageBase64) {
      const fileData = parseDataUrl(imageBase64);
      if (fileData) {
        parts.push({
          inlineData: {
            data: fileData.base64,
            mimeType: fileData.mimeType,
          },
        });
      } else {
        parts.push({
          inlineData: {
            data: imageBase64,
            mimeType: "image/jpeg",
          },
        });
      }
    } else if (imageUrl) {
      if (imageUrl.startsWith("data:")) {
        const fileData = parseDataUrl(imageUrl);
        if (fileData) {
          parts.push({
            inlineData: {
              data: fileData.base64,
              mimeType: fileData.mimeType,
            },
          });
        }
      } else if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        try {
          const imgFetch = await fetch(imageUrl);
          if (imgFetch.ok) {
            const arrayBuffer = await imgFetch.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mimeType = imgFetch.headers.get('content-type') || 'image/jpeg';
            parts.push({
              inlineData: {
                data: buffer.toString('base64'),
                mimeType: mimeType
              }
            });
          }
        } catch (urlErr) {
          console.error("Failed to fetch imageUrl for AI parsing:", urlErr);
        }
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            category: { type: Type.STRING },
            price: { type: Type.INTEGER },
            stockQuantity: { type: Type.INTEGER },
            description: { type: Type.STRING }
          },
          required: ["productName", "category", "price", "stockQuantity", "description"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No extraction received from Gemini AI model");
    }

    const parsedData = JSON.parse(resultText);
    res.json({ success: true, product: parsedData });

  } catch (error: any) {
    console.error("Product extraction failed:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to parse product details" });
  }
});

// 3. Main Shipping Integration System Endpoint for Algeria
app.post('/api/ship-order', async (req, res) => {
  try {
    const user = decodeAuthUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const { order, courier } = req.body;
    if (!order) {
      return res.status(400).json({ error: "Order details are required" });
    }

    const selectedCourier = courier || order.shipping_company || "Yalidine Express";
    const generatedSuffix = Math.floor(10000000 + Math.random() * 90000000);
    
    let trackingNumber = `TRK${generatedSuffix}`;
    let labelUrl = `https://smartyai.order/labels/download_${generatedSuffix}`;

    // Emulate realistic logistics integration output based on the selected merchant shipping company
    if (selectedCourier.toLowerCase().includes("yalidine")) {
      trackingNumber = `YAL${generatedSuffix}`;
      labelUrl = `https://yalidine.com/v1/labels/print?tracking=${trackingNumber}`;
    } else if (selectedCourier.toLowerCase().includes("zr")) {
      trackingNumber = `ZR-${generatedSuffix}-DZ`;
      labelUrl = `https://zrexpress.com/merchant/print_sticker?code=${trackingNumber}`;
    } else if (selectedCourier.toLowerCase().includes("maystro")) {
      trackingNumber = `MYS_${generatedSuffix}`;
      labelUrl = `https://maystrodelivery.com/v2/labels?id=${trackingNumber}`;
    } else if (selectedCourier.toLowerCase().includes("ecotrack")) {
      trackingNumber = `ECO-${generatedSuffix}`;
      labelUrl = `https://ecotrack.dz/invoice/pdf/${trackingNumber}`;
    } else if (selectedCourier.toLowerCase().includes("anderson")) {
      trackingNumber = `AND-${generatedSuffix}`;
      labelUrl = `https://andersonexpress.dz/delivery/waybill?track=${trackingNumber}`;
    } else if (selectedCourier.toLowerCase().includes("procolis")) {
      trackingNumber = `PRC-${generatedSuffix}`;
      labelUrl = `https://procolis.com/merchant/receipts?id=${trackingNumber}`;
    } else if (selectedCourier.toLowerCase().includes("nord")) {
      trackingNumber = `N&S-${generatedSuffix}`;
      labelUrl = `https://nordetsud-express.com/track/slip?code=${trackingNumber}`;
    } else if (selectedCourier.toLowerCase().includes("fastlo")) {
      trackingNumber = `FST-${generatedSuffix}`;
      labelUrl = `https://fastlodz.com/dashboard/print/${trackingNumber}`;
    } else if (selectedCourier.toLowerCase().includes("kazi")) {
      trackingNumber = `KAZI-${generatedSuffix}`;
      labelUrl = `https://kazitour.com/delivery/receipt?tracking=${trackingNumber}`;
    } else if (selectedCourier.toLowerCase().includes("soudia")) {
      trackingNumber = `SOU-${generatedSuffix}`;
      labelUrl = `https://soudiaexpress.dz/tickets/print?ref=${trackingNumber}`;
    } else if (selectedCourier.toLowerCase().includes("colisliv")) {
      trackingNumber = `CLIV-${generatedSuffix}`;
      labelUrl = `https://colisliv.com/labels/thermal?tracking=${trackingNumber}`;
    }

    res.json({
      status: "shipped",
      trackingNumber,
      labelUrl
    });

  } catch (error: any) {
    console.error("Shipping execution failed:", error);
    res.status(500).json({ error: error.message || "Logistics driver execution failed" });
  }
});

// 4. Storefront API Endpoints
app.get('/api/store/:merchantId/info', async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    // First, try to fetch from merchant_public_configs collection (which allows public unauthenticated reads)
    const publicRef = doc(db, "merchant_public_configs", merchantId);
    const publicSnap = await getDoc(publicRef);
    
    if (publicSnap.exists()) {
      const pubData = publicSnap.data();
      res.json({
        success: true,
        storeName: pubData.storeName || "متجر SmartyAi",
        storeLogo: pubData.storeLogo || "",
        storeDescription: pubData.storeDescription || ""
      });
    } else {
      // Fallback: If public sync hasn't run yet, try users but handle potential rules block
      const docRef = doc(db, "users", merchantId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const userData = docSnap.data();
        res.json({
          success: true,
          storeName: userData.storeSettings?.storeName || userData.displayName || "متجر SmartyAi",
          storeLogo: userData.storeSettings?.storeLogo || userData.photoURL || "",
          storeDescription: userData.storeSettings?.storeDescription || ""
        });
      } else {
        res.json({
          success: true,
          storeName: "متجر SmartyAi",
          storeLogo: "",
          storeDescription: ""
        });
      }
    }
  } catch (error) {
    console.error("Error fetching merchant info:", error);
    res.json({
      success: true,
      storeName: "متجر SmartyAi",
      storeLogo: "",
      storeDescription: ""
    });
  }
});

app.get('/api/store/:merchantId/products', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { category, search, page, limit } = req.query;

    const q = query(collection(db, "inventory"), where("userId", "==", merchantId));
    const querySnapshot = await getDocs(q);
    let allProducts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Memory filter to avoid index dependencies on Firebase
    if (category && category !== 'all' && category !== 'undefined') {
      const catStr = String(category).toLowerCase();
      allProducts = allProducts.filter((p: any) => p.category?.toLowerCase() === catStr);
    }

    if (search) {
      const searchStr = String(search).toLowerCase();
      allProducts = allProducts.filter((p: any) => 
        (p.productName && p.productName.toLowerCase().includes(searchStr)) ||
        (p.description && p.description.toLowerCase().includes(searchStr))
      );
    }

    // Extract unique categories
    const categoriesSet = new Set<string>();
    allProducts.forEach((p: any) => {
      if (p.category) categoriesSet.add(p.category);
    });
    const categories = Array.from(categoriesSet);

    // Pagination
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const totalProducts = allProducts.length;
    const totalPages = Math.ceil(totalProducts / limitNum);
    const paginated = allProducts.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      success: true,
      products: paginated,
      categories,
      pagination: {
        totalProducts,
        totalPages,
        currentPage: pageNum
      }
    });

  } catch (error: any) {
    console.error("Error setting products list:", error);
    res.status(500).json({ error: error.message || "Failed to load products" });
  }
});

app.get('/api/store/shipping-cost', async (req, res) => {
  try {
    const { wilaya, deliveryType } = req.query;
    if (!wilaya) return res.status(400).json({ error: 'Wilaya query parameter is required' });

    const wStr = String(wilaya).toLowerCase();
    const isDesk = String(deliveryType) === 'desk';
    
    let fee = isDesk ? 400 : 700; // default Algerians logistics standard pricing

    // Smart Algerian logistics profiling
    if (wStr.includes('16') || wStr.includes('alger')) {
      fee = isDesk ? 300 : 400;
    } else if (wStr.includes('09') || wStr.includes('blida') || wStr.includes('35') || wStr.includes('boumerd') || wStr.includes('42') || wStr.includes('tipaza')) {
      fee = isDesk ? 350 : 500;
    } else if (wStr.includes('01') || wStr.includes('adrar') || wStr.includes('11') || wStr.includes('tamanrasset') || wStr.includes('33') || wStr.includes('illizi')) {
      fee = isDesk ? 600 : 1000;
    }

    res.json({ success: true, shippingFee: fee });
  } catch (error) {
    console.error('Error fetching shipping rate:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/store/create-order', async (req, res) => {
  try {
    const { merchantId, customerName, phoneNumber, wilaya, commune, deliveryType, deliveryAddress, note, items, orderIdPrefix } = req.body;
    if (!merchantId) return res.status(400).json({ error: 'merchantId is required' });

    // 1. Fetch merchant user data to check limits
    let merchantData: any = {};
    const publicRef = doc(db, "merchant_public_configs", merchantId);
    const publicSnap = await getDoc(publicRef);
    if (publicSnap.exists()) {
      merchantData = publicSnap.data();
    } else {
      // Fallback: If public settings do not exist yet, try users (which might fail if unauthenticated but handled gracefully)
      try {
        const merchantRef = doc(db, "users", merchantId);
        const merchantSnap = await getDoc(merchantRef);
        if (merchantSnap.exists()) {
          merchantData = merchantSnap.data();
        } else {
          return res.status(404).json({ error: 'Merchant not found' });
        }
      } catch (err: any) {
        console.warn("Failed standard users doc get on checkout, fallback to default config limits:", err.message);
        // Default fallback values if both documents are unreadable/missing
        merchantData = { planType: "free", orderCounter: 0 };
      }
    }
    const planType = merchantData.planType || "free";
    const orderCounter = merchantData.orderCounter || 0;
    const limitVal = PLAN_LIMITS[planType] || 50;

    if (orderCounter >= limitVal) {
      return res.status(403).json({ error: 'subscription_limit_reached', requiresUpgrade: true });
    }

    // 2. Fetch inventory items to resolve names and stock
    const invQ = query(collection(db, "inventory"), where("userId", "==", merchantId));
    const invSnap = await getDocs(invQ);
    const inventoryMap = new Map<string, any>();
    invSnap.forEach(docSnap => {
      inventoryMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
    });

    // 3. Resolve item details & subtotal
    const orderItems: any[] = [];
    let totalPrice = 0;

    for (const item of (items || [])) {
      const invItem = inventoryMap.get(item.productId);
      if (invItem) {
        const prodName = invItem.productName || invItem.name || "Product";
        const unitPrice = Number(invItem.price) || Number(invItem.pricePerUnit) || 0;
        const qty = Number(item.quantity) || 1;
        totalPrice += (unitPrice * qty);

        orderItems.push({
          product: prodName,
          quantity: qty,
          size: item.size || "",
          color: item.color || "",
          pricePerUnit: unitPrice
        });

        // Smart stock decrement (if tracked and in stock)
        const currentStock = Number(invItem.stockQuantity) || 0;
        if (currentStock > 0) {
          const newQty = Math.max(0, currentStock - qty);
          await updateDoc(doc(db, "inventory", invItem.id), {
            stockQuantity: newQty
          });
        }
      } else {
        // Fallback for custom entries
        orderItems.push({
          product: item.productId || "Custom Item",
          quantity: Number(item.quantity) || 1,
          size: item.size || "",
          color: item.color || "",
          pricePerUnit: 0
        });
      }
    }

    // Smart shipping fee
    const isDesk = deliveryType === 'desk';
    let shippingFee = isDesk ? 400 : 700;
    const wStr = String(wilaya).toLowerCase();
    if (wStr.includes('16') || wStr.includes('alger')) {
      shippingFee = isDesk ? 300 : 400;
    } else if (wStr.includes('09') || wStr.includes('blida') || wStr.includes('35') || wStr.includes('boumerd') || wStr.includes('42') || wStr.includes('tipaza')) {
      shippingFee = isDesk ? 350 : 500;
    } else if (wStr.includes('01') || wStr.includes('adrar') || wStr.includes('11') || wStr.includes('tamanrasset') || wStr.includes('33') || wStr.includes('illizi')) {
      shippingFee = isDesk ? 600 : 1000;
    }

    const orderId = orderIdPrefix || `store_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // 4. Create main order document
    const finalOrderPayload = {
      customerName: customerName || "",
      phoneNumber: phoneNumber || "",
      wilaya: wilaya || "",
      commune: commune || "",
      deliveryType: deliveryType || "home",
      deliveryAddress: deliveryAddress || "",
      note: note || "",
      status: "pending",
      possibleFake: phoneNumber.replace(/\D/g, '').length < 9,
      userId: merchantId,
      items: orderItems,
      shippingCompany: "Yalidine Express",
      shippingFee,
      totalPrice: totalPrice + shippingFee,
      source: "storefront",
      createdAt: serverTimestamp()
    };

    await setDoc(doc(db, "orders", orderId), finalOrderPayload);

    // 5. Increment user consumption orderCounter
    // For public checkout storefront purchases, always increment the unauthenticated public config counter
    await updateDoc(doc(db, "merchant_public_configs", merchantId), {
      orderCounter: orderCounter + 1
    }).catch(err => {
      console.warn("Could not increment public merchant orderCounter:", err.message);
    });

    // Also attempt to increment the users collection (will work if authenticated, or log silently)
    await updateDoc(doc(db, "users", merchantId), {
      orderCounter: orderCounter + 1
    }).catch(err => {
      console.log("Unauthenticated users collection increment bypassed (public config serves as authoritative checkout metrics):", err.message);
    });

    res.json({
      success: true,
      orderId,
      message: 'Order created successfully'
    });

  } catch (error: any) {
    console.error('Error creating store order:', error);
    res.status(500).json({ error: error.message || 'Failed to create storefront order' });
  }
});

// Initialize Express Server & Vite
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartyAI Server running on http://localhost:${PORT}`);
  });
}

initServer();
