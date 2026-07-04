import { Router } from 'express';
import { Type } from '@google/genai';
import {
  db,
  decodeAuthUser,
  parseDataUrl,
  generateContentWithRetry,
  trackMerchantUsage
} from '../config.js';

const router = Router();

// 1. Core Simple Order Parser Compatible Route
router.post('/parse-order', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ 
        error: "⚠️ مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مّعرف. يرجى إضافته من قائمة الإعدادات (Secrets) في منصة AI Studio لكي تتمكن من استخدام ميزة تفكيك الطلبيات بالذكاء الاصطناعي."
      });
    }

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const response = await generateContentWithRetry({
      preferredModel: 'gemini-3.5-flash',
      contents: [{
        text: `Extract order details from this text in JSON format. Return ONLY the JSON object.
        {
          "customerName": string,
          "customerPhone": string,
          "wilaya": string (Algerian Wilaya in French),
          "commune": string,
          "address": string,
          "products": [{ "name": string, "quantity": number, "price": number }],
          "totalAmount": number
        }
        
        Text: "${text}"`
      }],
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

// 2. Multimodal extract-order (handles conversation, vocal, receipt snapshots)
router.post('/extract-order', async (req, res) => {
  try {
    const user = await decodeAuthUser(req.headers.authorization);
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

    const response = await generateContentWithRetry({
      preferredModel: 'gemini-3.5-flash',
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

    // Centrally track tokens used and AI cost
    const promptTokens = response.usageMetadata?.promptTokenCount || Math.ceil(promptText.length / 4);
    const candidatesTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil((resultText || "").length / 4);
    const totalTokens = promptTokens + candidatesTokens;
    const modelCostRate = 0.00000015; // standard flash model average rate
    const cost = totalTokens * modelCostRate;

    trackMerchantUsage(user.uid, {
      tokensUsed: totalTokens,
      aiCost: cost
    }).catch(err => console.error("Failed to update merchant usage in background:", err));

    const parsedData = JSON.parse(resultText);
    res.json(parsedData);

  } catch (error: any) {
    console.error("Extraction failed:", error);
    res.status(500).json({ error: error.message || "Failed to extract order details" });
  }
});

// 3. Inventory AI Parsing
router.post('/inventory/ai-parse', async (req, res) => {
  try {
    const user = await decodeAuthUser(req.headers.authorization);
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

    const response = await generateContentWithRetry({
      preferredModel: 'gemini-3.5-flash',
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

    // Centrally track tokens used and AI cost
    const promptTokens = response.usageMetadata?.promptTokenCount || Math.ceil(promptText.length / 4);
    const candidatesTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil((resultText || "").length / 4);
    const totalTokens = promptTokens + candidatesTokens;
    const modelCostRate = 0.00000015; // standard flash model average rate
    const cost = totalTokens * modelCostRate;

    trackMerchantUsage(user.uid, {
      tokensUsed: totalTokens,
      aiCost: cost
    }).catch(err => console.error("Failed to update merchant usage in background:", err));

    const parsedData = JSON.parse(resultText);
    res.json({ success: true, product: parsedData });

  } catch (error: any) {
    console.error("Product extraction failed:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to parse product details" });
  }
});

export default router;
