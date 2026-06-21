import { Router } from 'express';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, PLAN_LIMITS } from '../config.js';

const router = Router();

// Store client brand information query
router.get('/store/:merchantId/info', async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    // First, try to fetch from merchant_public_configs (allows unauthenticated public reads)
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

// Store catalogs/products listings
router.get('/store/:merchantId/products', async (req, res) => {
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

// Algerian shipping dynamic cost breakdown
router.get('/store/shipping-cost', async (req, res) => {
  try {
    const { wilaya, deliveryType } = req.query;
    if (!wilaya) return res.status(400).json({ error: 'Wilaya query parameter is required' });

    const wStr = String(wilaya).toLowerCase();
    const isDesk = String(deliveryType) === 'desk';
    
    let fee = isDesk ? 400 : 700; // default Algerian logistics standard pricing

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

// Store purchase checkout conversion pipeline
router.post('/store/create-order', async (req, res) => {
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
      console.log("Unauthenticated users collection increment bypassed:", err.message);
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

export default router;
