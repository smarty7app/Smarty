import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, 
  Plus, 
  Search, 
  Grid, 
  List, 
  Layout, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  Upload, 
  X, 
  FileText, 
  Tag, 
  DollarSign, 
  Layers, 
  Hash, 
  RefreshCw,
  Image as ImageIcon,
  ArrowUpDown,
  Check,
  ChevronRight,
  ChevronLeft,
  Store,
  Link,
  Copy,
  Key,
  Terminal,
  Eye,
  EyeOff
} from "lucide-react";
import { db, auth } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, addDoc, deleteDoc, getDoc } from "firebase/firestore";
import { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { safeStorage } from "../lib/utils";
import { ProductModal } from "./ProductModal";
import { sendNotification } from "../lib/notifications";
import { ALGERIA_68_WILAYAS } from "./WilayasList";

interface MerchantProductsProps {
  user: any;
  userData?: any;
  t: any;
  isRtl: boolean;
}

interface WebhookSetupCardProps {
  user: any;
  isRtl: boolean;
}

function WebhookSetupCard({ user, isRtl }: WebhookSetupCardProps) {
  const [loading, setLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerateSecret = async (action: "get" | "regenerate" = "get") => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // Generate a secure 32-byte hex key cryptographically in the browser
      const arr = new Uint8Array(32);
      window.crypto.getRandomValues(arr);
      const secretToken = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");

      // Write directly to Firestore merchant_configs using the Client SDK
      // This bypasses any server-side database IAM/Permission restrictions under Cloud Run
      const docRef = doc(db, "merchant_configs", user.uid);
      await setDoc(docRef, {
        webhookSecret: secretToken,
        updatedAt: new Date().toISOString(),
        isEnabled: true
      }, { merge: true });

      setSecret(secretToken);
      setIsEnabled(true);
    } catch (err: any) {
      console.warn(`[Webhook Operation Failed]:`, err);
      setErrorMsg(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch to get existing secret if any via Client SDK direct access
    const getInitialConfig = async () => {
      if (!user) return;
      try {
        const docSnap = await getDoc(doc(db, "merchant_configs", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.webhookSecret) {
            setSecret(data.webhookSecret);
            setIsEnabled(data.isEnabled !== false);
          }
        }
      } catch (e) {
        console.log("Initial webhook fetch skipped/failed:", e);
      }
    };
    getInitialConfig();
  }, [user]);

  // Construct a seamless multi-channel webhook dispatcher URL carrying the merchant credentials in parameters, 
  // allowing the express server to do fully stateless, offline signature validation without slow DB database reads.
  const webhookUrl = `${window.location.origin}/api/webhooks/smarty-orders?merchantId=${user?.uid || ""}${secret ? `&secret=${secret}` : ""}`;

  return (
    <div className="bg-[#090909]/40 border border-zinc-900 rounded-3xl p-6 text-right space-y-5 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-bold text-white">
            {isRtl ? "إعدادات المطور والـ Webhook" : "Developer & Webhook Settings"}
          </h3>
        </div>
        <span className="flex items-center gap-1 text-[10px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-zinc-850 font-mono">
          <span className={`w-1.5 h-1.5 rounded-full ${secret ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
          {secret ? (isRtl ? "مفعّل" : "Active") : (isRtl ? "غير مهيأ" : "Not configured")}
        </span>
      </div>

      <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed text-right">
        {isRtl
          ? "رابط الـ Webhook العام المخصص لمتجرك لتلقي طلبات البوتات والمنصات الخارجية مشفراً وآلياً بالكامل:"
          : "Your dedicated public Webhook URL to securely verify and auto-import orders from external platforms:"}
      </p>

      {/* Webhook URL Input */}
      <div className="space-y-1.5">
        <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-2xl flex items-center justify-between gap-1.5">
          <span className="text-[10px] font-mono text-zinc-400 select-all truncate max-w-[190px] text-left" dir="ltr">
            {webhookUrl}
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(webhookUrl);
              setCopiedUrl(true);
              setTimeout(() => setCopiedUrl(false), 2000);
            }}
            className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-350 hover:text-white rounded-xl transition-all shrink-0 cursor-pointer"
            title={isRtl ? "نسخ الرابط" : "Copy webhook URL"}
          >
            {copiedUrl ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Hidden/Masked Webhook Secret Section */}
      <div className="space-y-2 pt-1">
        <label className="text-[10.5px] font-bold text-zinc-350 block text-right">
          {isRtl ? "المفتاح السري الرقمي الخاص بك (Webhook Secret):" : "Your Webhook Secret Token:"}
        </label>

        {secret ? (
          <div className="space-y-2">
            <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-2xl flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-mono text-zinc-350 select-all truncate max-w-[170px] text-left font-black" dir="ltr">
                {showSecret ? secret : "••••••••••••••••••••••••••••••••"}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-350 hover:text-white rounded-xl transition-all cursor-pointer"
                  title={showSecret ? (isRtl ? "إخفاء" : "Hide") : (isRtl ? "إظهار" : "Show")}
                >
                  {showSecret ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(secret);
                    setCopiedSecret(true);
                    setTimeout(() => setCopiedSecret(false), 2000);
                  }}
                  className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-805 text-zinc-350 hover:text-white rounded-xl transition-all cursor-pointer"
                  title={isRtl ? "نسخ المفتاح السري" : "Copy Secret Token"}
                >
                  {copiedSecret ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div className="text-[9px] text-zinc-500 leading-normal text-right flex items-start gap-1 justify-end">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                {isRtl
                  ? "احتفظ بهذا المفتاح بشكل سري للغاية! يتم استخدامه لتأكيد هوية وتوقيع Payload الـ Webhook حماية لك من الاختراقات."
                  : "Keep this key extremely secure. It signs webhook requests to cryptographically guarantee authenticity."}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-950/50 rounded-2xl p-4 border border-dashed border-zinc-850 text-center space-y-1">
            <p className="text-[10px] text-zinc-500">
              {isRtl ? "لم تقم بتوليد مفتاح الـ Webhook السري بعد." : "No webhook secret token generated yet."}
            </p>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-xl text-center">
          {errorMsg}
        </div>
      )}

      {/* Primary Action Button */}
      <button
        type="button"
        disabled={loading}
        onClick={() => handleGenerateSecret(secret ? "regenerate" : "get")}
        className="w-full bg-zinc-900 hover:bg-zinc-850 hover:text-white disabled:bg-zinc-950 disabled:text-zinc-700 text-zinc-300 border border-zinc-800 rounded-xl py-2.5 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        {loading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Key className="w-3.5 h-3.5 text-purple-405" />
        )}
        {secret 
          ? (isRtl ? "إعادة توليد المفتاح السري" : "Regenerate Secret Key")
          : (isRtl ? "توليد مفتاح الـ Webhook السري" : "Generate Webhook Secret")
        }
      </button>
    </div>
  );
}

const PRODUCT_LIMITS: Record<string, number> = {
  free: 50,
  basic: 50,
  pro: 500,
  professional: 500,
  unlimited: 999999999,
  business: 999999999,
  enterprise: 999999999
};

export default function MerchantProducts({ user, userData, t, isRtl }: MerchantProductsProps) {
  const isWarehouse = userData?.role === "warehouse";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // LocalStorage-based template choice (grid, table, kanban)
  const [viewTemplate, setViewTemplate] = useState<"grid" | "table" | "kanban">(() => {
    return (safeStorage.getItem("merchant_products_template") as any) || "grid";
  });

  // Table Sort State
  const [sortField, setSortField] = useState<"price" | "stockQuantity" | "productName">("productName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Multi-select bulk deletion state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);

  // Form State
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("10");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFileBase64, setImageFileBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // Custom Product Options (Sizes, Colors, Labels)
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
  const [colorLabel, setColorLabel] = useState("");

  // Store Settings States
  const [activeTab, setActiveTab] = useState<"products" | "settings">("products");
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [storeLogo, setStoreLogo] = useState("");
  const [logoFileBase64, setLogoFileBase64] = useState<string | null>(null);
  const [shippingCostType, setShippingCostType] = useState<"fixed" | "auto">("auto");
  const [fixedShippingCost, setFixedShippingCost] = useState("600");
  const [merchantWilaya, setMerchantWilaya] = useState("16 - الجزائر");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync states if userData changes
  useEffect(() => {
    let activeSettings: any = null;
    if (userData?.storeSettings) {
      setStoreName(userData.storeSettings.storeName || userData.displayName || "");
      setStoreDescription(userData.storeSettings.storeDescription || "");
      setStoreLogo(userData.storeSettings.storeLogo || userData.photoURL || "");
      setShippingCostType(userData.storeSettings.shippingCostType || "auto");
      setFixedShippingCost(userData.storeSettings.fixedShippingCost?.toString() || "600");
      setMerchantWilaya(userData.storeSettings.merchantWilaya || "16 - الجزائر");
      activeSettings = {
        storeName: userData.storeSettings.storeName || userData.displayName || "",
        storeDescription: userData.storeSettings.storeDescription || "",
        storeLogo: userData.storeSettings.storeLogo || userData.photoURL || "",
        shippingCostType: userData.storeSettings.shippingCostType || "auto",
        fixedShippingCost: Number(userData.storeSettings.fixedShippingCost) || 600,
        merchantWilaya: userData.storeSettings.merchantWilaya || "16 - الجزائر",
        planType: userData.planType || "free",
        orderCounter: userData.orderCounter || 0,
      };
    } else if (userData) {
      const defaultDesc = "أهلاً بك في متجرنا الإلكتروني المتميز. تسوق أفضل المنتجات بأفضل الأسعار مع توصيل سريع لجميع الولايات.";
      setStoreName(userData.displayName || "");
      setStoreLogo(userData.photoURL || "");
      setStoreDescription(defaultDesc);
      setMerchantWilaya("16 - الجزائر");
      activeSettings = {
        storeName: userData.displayName || "",
        storeDescription: defaultDesc,
        storeLogo: userData.photoURL || "",
        shippingCostType: "auto",
        fixedShippingCost: 600,
        merchantWilaya: "16 - الجزائر",
        planType: userData.planType || "free",
        orderCounter: userData.orderCounter || 0,
      };
    }

    if (activeSettings && user?.uid) {
      // Silently sync to merchant_public_configs for seamless public visibility
      const publicRef = doc(db, "merchant_public_configs", user.uid);
      setDoc(publicRef, activeSettings, { merge: true }).catch(err => {
        console.warn("Public config sync error:", err);
      });
    }
  }, [userData, user]);

  // Persistence of template selection
  useEffect(() => {
    safeStorage.setItem("merchant_products_template", viewTemplate);
  }, [viewTemplate]);

  // Real-time Firestore Sync
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    const q = query(
      collection(db, "inventory"), 
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      // Default sorting by creation time descending in memory
      items.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setProducts(items);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to products repository:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Drag-and-Drop Image File Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress as JPEG with 0.7 quality to keep it tiny (usually under 50KB)
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          resolve(compressedBase64);
        };
        img.onerror = () => {
          resolve(event.target?.result as string);
        };
      };
      reader.onerror = () => {
        resolve("");
      };
    });
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert(isRtl ? "يرجى اختيار صورة صالحة فقط!" : "Please provide an image file only!");
      return;
    }
    try {
      const compressedData = await compressImageFile(file);
      setImageFileBase64(compressedData);
    } catch (e) {
      console.error("Compression failed:", e);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // REST API upload helper
  const uploadImageBuffer = async (fallbackBase64: string, pId?: string): Promise<string> => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/inventory/upload-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ base64Data: fallbackBase64, productId: pId })
      });
      if (res.ok) {
        const data = await res.json();
        return data.imageUrl || fallbackBase64;
      }
    } catch (e) {
      console.error("Image uploading failed, fallback to base64 Data URI used:", e);
    }
    return fallbackBase64;
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSettingsSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const publicRef = doc(db, "merchant_public_configs", user.uid);
      
      const payload = {
        storeName: storeName.trim(),
        storeDescription: storeDescription.trim(),
        storeLogo: storeLogo,
        shippingCostType: shippingCostType,
        fixedShippingCost: Number(fixedShippingCost) || 0,
        merchantWilaya: merchantWilaya,
      };

      await setDoc(userRef, {
        storeSettings: payload
      }, { merge: true });

      await setDoc(publicRef, {
        ...payload,
        planType: userData?.planType || "free",
        orderCounter: userData?.orderCounter || 0,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert(isRtl ? "تم حفظ إعدادات المتجر بنجاح!" : "Store settings saved successfully!");
    } catch (err) {
      console.error("Error saving store settings:", err);
      alert(isRtl ? "فشل حفظ الإعدادات، يرجى المحاولة لاحقاً." : "Failed to save settings, please try again.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSettingsSaving(true);
    try {
      const compressedBase64 = await compressImageFile(file);
      setLogoFileBase64(compressedBase64);
      const uploadedUrl = await uploadImageBuffer(compressedBase64);
      setStoreLogo(uploadedUrl);
    } catch (err) {
      console.error("Logo upload error:", err);
    } finally {
      setSettingsSaving(false);
    }
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    if (products.length === 0) return;
    const headers = isRtl 
      ? ["اسم المنتج", "السعر (دج)", "المخزون", "SKU", "الفئة", "الوصف"]
      : ["Product Name", "Price (DA)", "Stock", "SKU", "Category", "Description"];
    
    const rows = products.map(p => [
      p.productName.replace(/"/g, '""'),
      p.price,
      p.stockQuantity,
      p.sku || "",
      p.category || "",
      (p.description || "").replace(/"/g, '""')
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `products_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Product Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;

    // Check Plan product limits
    const plan = userData?.planType || "free";
    const maxAllowedProducts = PRODUCT_LIMITS[plan] || 50;
    if (products.length >= maxAllowedProducts) {
      alert(isRtl 
        ? `عذراً، لقد وصلت للحد الأقصى المسموح به لخيار إضافة المنتجات لخطتك الحالية (${maxAllowedProducts} منتج). يرجى ترقية اشتراكك للاستمرار.`
        : `Sorry, you have reached your plan limit of ${maxAllowedProducts} products. Please promote or upgrade your account to add more products.`
      );
      return;
    }

    setApiLoading(true);
    try {
      let finalImg = imageUrl;
      if (imageFileBase64) {
        finalImg = await uploadImageBuffer(imageFileBase64);
      }

      const generatedSku = sku.trim() || (() => {
        const cleanName = productName.trim().toUpperCase()
          .replace(/[^A-Z0-9\u0600-\u06FF]/g, '')
          .slice(0, 4);
        const cleanCat = (category || "GEN").trim().toUpperCase()
          .replace(/[^A-Z0-9\u0600-\u06FF]/g, '')
          .slice(0, 3);
        const uniqueNum = Math.floor(1000 + Math.random() * 9000);
        return `${cleanCat || "GEN"}-${cleanName || "PRD"}-${uniqueNum}`;
      })();

      if (!user) {
        throw new Error("No user signed in");
      }

      await addDoc(collection(db, "inventory"), {
        productName: productName.trim(),
        description: description ? String(description).trim() : "",
        price: Number(price) || 0,
        stockQuantity: Number(stockQuantity) || 0,
        category: category ? String(category).trim() : "",
        sku: generatedSku,
        imageUrl: finalImg || "",
        userId: user.uid,
        isPublished: isPublished,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sizes: sizes.trim(),
        colors: colors.trim(),
        sizeLabel: sizeLabel.trim(),
        colorLabel: colorLabel.trim()
      });

      setShowAddModal(false);
      resetForm();
      alert(isRtl 
        ? "🎉 تم إضافة منتجك الجديد بنجاح إلى المستودع والمخزن الخاص بك!" 
        : "🎉 Your new product has been successfully added to your inventory!"
      );
    } catch (err: any) {
      console.error("Error adding product:", err);
      alert(isRtl 
        ? "حدث خطأ أثناء إضافة المنتج. تم تسجيل تفاصيل الخطأ في الـ console." 
        : "An error occurred while adding the product. Details have been logged to the console."
      );
    } finally {
      setApiLoading(false);
    }
  };

  // Update Product Submit
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setApiLoading(true);
    try {
      let finalImg = imageUrl;
      if (imageFileBase64) {
        finalImg = await uploadImageBuffer(imageFileBase64, editingProduct.id);
      }

      const generatedSku = sku.trim() || (() => {
        const cleanName = productName.trim().toUpperCase()
          .replace(/[^A-Z0-9\u0600-\u06FF]/g, '')
          .slice(0, 4);
        const cleanCat = (category || "GEN").trim().toUpperCase()
          .replace(/[^A-Z0-9\u0600-\u06FF]/g, '')
          .slice(0, 3);
        const uniqueNum = Math.floor(1000 + Math.random() * 9000);
        return `${cleanCat || "GEN"}-${cleanName || "PRD"}-${uniqueNum}`;
      })();

      const productRef = doc(db, "inventory", editingProduct.id);
      await updateDoc(productRef, {
        productName: productName.trim(),
        description: description ? String(description).trim() : "",
        price: Number(price) || 0,
        stockQuantity: Number(stockQuantity) || 0,
        category: category ? String(category).trim() : "",
        sku: generatedSku,
        imageUrl: finalImg || "",
        isPublished: isPublished,
        updatedAt: new Date().toISOString(),
        sizes: sizes.trim(),
        colors: colors.trim(),
        sizeLabel: sizeLabel.trim(),
        colorLabel: colorLabel.trim()
      });

      setEditingProduct(null);
      resetForm();
      alert(isRtl 
        ? "تم تحديث بيانات ومعلومات منتجك بنجاح!" 
        : "Product details updated successfully!"
      );
    } catch (err: any) {
      console.error("Error updating product:", err);
      alert(isRtl 
        ? "حدث خطأ أثناء تحديث المنتج. تم تسجيل تفاصيل الخطأ في الـ console." 
        : "An error occurred while updating the product. Details have been logged to the console."
      );
    } finally {
      setApiLoading(false);
    }
  };

  // Delete Individual Product
  const handleDeleteProduct = async (id: string) => {
    setApiLoading(true);
    try {
      const productRef = doc(db, "inventory", id);
      await deleteDoc(productRef);

      setShowDeleteConfirm(null);
      setSelectedProductIds(prev => prev.filter(selId => selId !== id));
    } catch (err: any) {
      console.error("Error deleting product:", err);
      alert(isRtl 
        ? "حدث خطأ أثناء حذف المنتج. تم تسجيل تفاصيل الخطأ في الـ console." 
        : "An error occurred while deleting the product. Details have been logged to the console."
      );
    } finally {
      setApiLoading(false);
    }
  };

  // Bulk Delete Selected Products
  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    setApiLoading(true);
    try {
      for (const id of selectedProductIds) {
        const productRef = doc(db, "inventory", id);
        await deleteDoc(productRef);
      }

      setSelectedProductIds([]);
      setIsBulkDeleteConfirm(false);
    } catch (err: any) {
      console.error("Bulk delete error:", err);
      alert(isRtl 
        ? "فشلت بعض عمليات الحذف. تم تسجيل تفاصيل الخطأ في الـ console." 
        : "Some deletions may have failed. Details have been logged to the console."
      );
    } finally {
      setApiLoading(false);
    }
  };

  // Update Stock levels directly via Drag & Drop or quick action buttons in Kanban Board
  const updateStockLevel = async (productId: string, targetStock: number) => {
    try {
      const productRef = doc(db, "inventory", productId);
      await updateDoc(productRef, {
        stockQuantity: targetStock,
        updatedAt: new Date().toISOString()
      });

      // Send notification if stock is critically low
      if (targetStock < 5 && user?.uid) {
        const product = products.find(p => p.id === productId);
        await sendNotification({
          userId: user.uid,
          title: t.notification_low_stock,
          message: `${product?.productName || 'Product'} - ${targetStock} units remaining`,
          type: "warning"
        });
      }
    } catch (err: any) {
      console.error("Error updating stock quantity:", err);
    }
  };

  // Toggle storefront publication
  const handleTogglePublish = async (p: Product) => {
    if (!p.id) return;
    try {
      const currentStatus = p.isPublished === true;
      const productRef = doc(db, "inventory", p.id);
      await updateDoc(productRef, {
        isPublished: !currentStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("Error toggling publication status:", err);
    }
  };

  // Toggle publishing state of a product directly
  const togglePublishProduct = async (product: Product) => {
    try {
      const productRef = doc(db, "inventory", product.id!);
      const nextStatus = !product.isPublished;
      await updateDoc(productRef, {
        isPublished: nextStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("Error toggling product publish status:", err);
    }
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setProductName(p.productName);
    setDescription(p.description || "");
    setPrice(String(p.price));
    setStockQuantity(String(p.stockQuantity));
    setCategory(p.category || "");
    setSku(p.sku || "");
    setImageUrl(p.imageUrl || "");
    setImageFileBase64(null);
    setIsPublished(!!p.isPublished);
    setSizes(p.sizes || "");
    setColors(p.colors || "");
    setSizeLabel(p.sizeLabel || "");
    setColorLabel(p.colorLabel || "");
  };

  const resetForm = () => {
    setProductName("");
    setDescription("");
    setPrice("");
    setStockQuantity("10");
    setCategory("");
    setSku("");
    setImageUrl("");
    setImageFileBase64(null);
    setIsPublished(false);
    setSizes("");
    setColors("");
    setSizeLabel("");
    setColorLabel("");
  };

  // Categories lookup
  const categories = ["all", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Filtering Logic
  let filteredProducts = products.filter(p => {
    const rawName = p.productName || "";
    const matchesSearch = 
      rawName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Table-based sorting
  if (viewTemplate === "table") {
    filteredProducts = [...filteredProducts].sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (field: "price" | "stockQuantity" | "productName") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredProducts.map(p => p.id!).filter(Boolean);
    const allSelected = visibleIds.every(id => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Drag and Drop implementation for HTML5 Kanban column updates
  const handleKanbanDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleKanbanDrop = async (e: React.DragEvent, targetColumn: "low" | "mid" | "high") => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    const matchedProduct = products.find(p => p.id === id);
    if (!matchedProduct) return;

    // Adjust stock values based on target category rules
    // low (<5), mid (5-20), high (>20)
    let finalStock = matchedProduct.stockQuantity;
    if (targetColumn === "low") {
      finalStock = 3; 
    } else if (targetColumn === "mid") {
      finalStock = 12;
    } else if (targetColumn === "high") {
      finalStock = 25;
    }

    // Call update API and optimistic Firestore update trigger
    await updateStockLevel(id, finalStock);
  };

  // Grouping products for Template 3 (Kanban)
  const lowStockProducts = filteredProducts.filter(p => p.stockQuantity < 5);
  const midStockProducts = filteredProducts.filter(p => p.stockQuantity >= 5 && p.stockQuantity <= 20);
  const highStockProducts = filteredProducts.filter(p => p.stockQuantity > 20);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-900">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
            <Package className="w-5 h-5 text-zinc-400" />
            {isRtl ? "منتجاتي" : "My Products"}
          </h2>
          <p className="text-xs text-zinc-500">
            {isRtl 
              ? "مستودع السلع ومقاسات المخزون المتكامل مع عروض وأسعار التاجر." 
              : "Repository of products and physical stock templates matched securely with your sales profile."
            }
          </p>
          
          {/* Plan subscription limit usage bar */}
          {(() => {
            const plan = userData?.planType || "free";
            const maxAllowed = PRODUCT_LIMITS[plan] || 50;
            const pct = Math.min(100, (products.length / maxAllowed) * 100);
            return (
              <div className="pt-1 flex items-center gap-2 max-w-xs">
                <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                  <div className="bg-emerald-505 h-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-zinc-505 font-black font-mono">
                  {products.length} / {maxAllowed === 999999999 ? "∞" : maxAllowed} {isRtl ? "منتج" : "items"}
                </span>
              </div>
            );
          })()}
        </div>
        
        <div className="flex items-center gap-2 self-start md:self-auto">
          {selectedProductIds.length > 0 && !isWarehouse && (
            <button 
              onClick={() => setIsBulkDeleteConfirm(true)}
              className="px-3 py-2 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isRtl ? `حذف المحدد (${selectedProductIds.length})` : `Delete Selected (${selectedProductIds.length})`}
            </button>
          )}

          {/* Export to CSV Trigger */}
          <button 
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title={isRtl ? "تصدير جميع السلع إلى ملف CSV" : "Export all products list to CSV file"}
          >
            <FileText className="w-4 h-4 text-zinc-400" />
            {isRtl ? "تصدير CSV" : "Export CSV"}
          </button>

          {!isWarehouse && (
            <button 
              onClick={() => { setShowAddModal(true); }}
              className="bg-white hover:bg-zinc-100 text-black px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-black"
            >
              <Plus className="w-4 h-4" />
              {isRtl ? "إضافة منتج جديد" : "Add New Product"}
            </button>
          )}
        </div>
      </div>

      {/* Segmented Switcher for Products vs Store Settings */}
      {!isWarehouse && (
        <div className="flex bg-slate-100/80 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-900 p-1.5 rounded-2xl w-full max-w-md backdrop-blur-md shadow-md dark:shadow-2xl transition-all">
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "products"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/15 font-semibold"
                : "text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300 hover:bg-slate-200/50 dark:hover:bg-white/[0.02]"
            }`}
          >
            <Package className="w-4 h-4" />
            {isRtl ? "المستودع وقائمة السلع" : "Warehouse & Products"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "settings"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/15 font-semibold"
                : "text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300 hover:bg-slate-200/50 dark:hover:bg-white/[0.02]"
            }`}
          >
            <Store className="w-4 h-4" />
            {isRtl ? "إعدادات المتجر" : "Store Settings"}
          </button>
        </div>
      )}

      {activeTab === "settings" ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right w-full"
          dir={isRtl ? "rtl" : "ltr"}
        >
          {/* Left Column: Store Profile Form */}
          <div className="lg:col-span-2 bg-white dark:bg-[#090909]/40 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 space-y-6 shadow-md dark:shadow-2xl backdrop-blur-md transition-all">
            <form onSubmit={handleSaveStoreSettings} className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-855 dark:text-white flex items-center justify-start gap-2 border-b border-slate-100 dark:border-zinc-900 pb-3">
                  <Store className="w-4 h-4 text-emerald-500" />
                  {isRtl ? "إعدادات واجهة المتجر الإلكتروني العام" : "Storefront Configuration"}
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  {isRtl
                    ? "قم بإدخال تفاصيل متجرك العام وشعاره الخاص لعرض السلع وقبول الطلبات تلقائياً بالكامل."
                    : "Define your custom logo, description and naming options for the public page."}
                </p>
              </div>

              {/* Store Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                  {isRtl ? "اسم المتجر العام" : "Public Store Name"}
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-purple-500/50 dark:focus:border-purple-500/50 outline-none rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white transition-all"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder={isRtl ? "اسم متجرك الخاص..." : "My Awesome Store..."}
                />
              </div>

              {/* Store Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                  {isRtl ? "وصف المتجر (تظهر في ترويسة المتجر)" : "Store Description & Welcome Text"}
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-purple-500/50 dark:focus:border-purple-500/50 outline-none rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white leading-relaxed resize-none transition-all"
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  placeholder={isRtl ? "اكتب وصفاً جذاباً لمتجرك يظهر للعملاء..." : "Describe your collection..."}
                />
              </div>

              {/* Store Logo Drag & Drop */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                  {isRtl ? "شعار المتجر (Logo)" : "Store Logo / Brand Image"}
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-slate-150 dark:border-zinc-900 transition-all">
                  <div className="relative w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                    {storeLogo ? (
                      <img src={storeLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-6 h-6 text-slate-500 dark:text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <span className="text-[10px] text-slate-600 dark:text-zinc-400 block">
                      {isRtl
                        ? "ارفع صورة مربعة بدقة عالية لشعار متجرك (JPG, PNG الأقصى 2MB)"
                        : "Upload high-quality square brand image file."}
                    </span>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        id="logo-file-input"
                      />
                      <label
                        htmlFor="logo-file-input"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-350 rounded-xl font-bold text-[10px] cursor-pointer transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                        {isRtl ? "اختيار صورة الشعار" : "Choose Logo Image"}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* MERCHANT LOCATION */}
              <div className="space-y-3 pt-3 border-t border-slate-150 dark:border-zinc-900">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-zinc-400 block">
                    📍 {isRtl ? "ولاية مقر المتجر (موقع التاجر)" : "Merchant Store Location (Wilaya)"}
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-205 dark:border-zinc-850 focus:border-purple-500/50 dark:focus:border-yellow-500/50 outline-none rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white"
                    value={merchantWilaya}
                    onChange={(e) => setMerchantWilaya(e.target.value)}
                  >
                    {ALGERIA_68_WILAYAS.map(w => (
                      <option key={w.code} value={`${w.code} - ${isRtl ? w.nameAr : w.nameFr}`}>
                        {w.code} - {isRtl ? w.nameAr : w.nameFr}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-500 leading-normal mt-1">
                    {isRtl
                      ? "سيتم استخدام هذه الولاية كولاية المصدر لحساب تكلفة الشحن لولايات الزبائن تلقائياً حسب أسعار شركة ياليدين."
                      : "This wilaya will be used as the origin location to calculate shipping costs to your customers dynamically based on Yalidine rates."}
                  </p>
                </div>
              </div>

                            {/* SHIPPING OPTIONS */}
              <div className="space-y-3.5 pt-3 border-t border-slate-150 dark:border-zinc-900">
                <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-300 flex items-center justify-start gap-1.5">
                  🚚 {isRtl ? "خيارات ورسوم شحن المتجر" : "Store Delivery Tariffs Settings"}
                </h4>

                {/* Shipping Choice Grid Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShippingCostType("auto")}
                    className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      shippingCostType === "auto"
                        ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                        : "border-slate-200 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-950/30 hover:bg-slate-100/50 dark:hover:bg-zinc-900/30"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[11px] font-black ${shippingCostType === "auto" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-zinc-300"}`}>
                        {isRtl ? "⚡ حساب شحن تلقائي مدمج" : "Smart Automatic Shipping"}
                      </span>
                      <input
                        type="radio"
                        checked={shippingCostType === "auto"}
                        onChange={() => {}}
                        className="accent-emerald-500"
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 dark:text-zinc-500 mt-1.5 leading-normal">
                      {isRtl
                        ? "استخدم خوارزمية التطبيق لتسعير التوصيل لكل ولاية تلقائياً وعرضه للعميل."
                        : "Apply regional shipping cost algorithm per wilaya dynamically."}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShippingCostType("fixed")}
                    className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      shippingCostType === "fixed"
                        ? "border-yellow-500/30 bg-yellow-500/[0.02]"
                        : "border-slate-200 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-950/30 hover:bg-slate-100/50 dark:hover:bg-zinc-900/30"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[11px] font-black ${shippingCostType === "fixed" ? "text-amber-600 dark:text-yellow-400" : "text-slate-700 dark:text-zinc-300"}`}>
                        {isRtl ? "📍 رسوم توصيل ثابتة موحدة" : "Flat Shipping Rate"}
                      </span>
                      <input
                        type="radio"
                        checked={shippingCostType === "fixed"}
                        onChange={() => {}}
                        className="accent-yellow-500"
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 dark:text-zinc-500 mt-1.5 leading-normal">
                      {isRtl
                        ? "حدد رسوم شحن موحدة لكافة ولايات الجزائر بغض النظر عن موقع التوصيل."
                        : "Define a unified flat rate delivery tariff for all domestic endpoints."}
                    </p>
                  </button>
                </div>
                          {/* Fixed shipping value input */}
                <AnimatePresence>
                  {shippingCostType === "fixed" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label className="text-[10px] font-bold text-slate-700 dark:text-zinc-400 block mt-1">
                        {isRtl ? "رسوم التوصيل الثابتة لجميع الولايات (دج)" : "Unified flat rate fee (DZD)"}
                      </label>
                      <div className="relative max-w-xs">
                        <input
                          type="number"
                          min="0"
                          required
                          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-205 dark:border-zinc-850 focus:border-purple-500/50 dark:focus:border-yellow-500/50 outline-none rounded-xl pl-12 pr-4 py-2.5 text-xs text-slate-800 dark:text-white font-mono"
                          value={fixedShippingCost}
                          onChange={(e) => setFixedShippingCost(e.target.value)}
                          placeholder="600"
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500 dark:text-zinc-500 font-bold text-xs font-mono">
                          DZD
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-slate-150 dark:border-zinc-900 flex justify-end">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="bg-purple-600 hover:bg-purple-700 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black hover:scale-98 active:scale-95 px-6 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-550/10 dark:shadow-none"
                >
                  {settingsSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {isRtl ? "جاري الحفظ..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {isRtl ? "حفظ إعدادات المتجر" : "Save Settings"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Share Link & QR Generator */}
          <div className="space-y-5">
            {/* 1. Share URL Card */}
            <div className="bg-white/85 dark:bg-[#090909]/40 border border-slate-205 dark:border-zinc-900 rounded-3xl p-6 text-center space-y-4 shadow-md dark:shadow-xl backdrop-blur-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center mx-auto">
                <Store className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-white text-xs">{isRtl ? "عنوان المتجر الإلكتروني الخاص بك" : "Your Storefront Address"}</h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-500 leading-normal">
                  {isRtl
                    ? "شارك هذا الرابط المباشر في حسابات التواصل وحملات فيسبوك أو انستغرام لتلقي طلبات الشراء تلقائياً."
                    : "Share this URL on social media. Your customers can purchase products in real-time."}
                </p>
              </div>

              {/* Store URL Display & Copy */}
              <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-900 p-3 rounded-2xl flex items-center justify-between gap-1.5 transition-all">
                <span className="text-[10.5px] font-mono text-slate-600 dark:text-zinc-400 select-all truncate max-w-[190px] text-left">
                  {`${window.location.origin}/s/${user?.uid || ""}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/s/${user?.uid || ""}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="p-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-350 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all shrink-0 cursor-pointer"
                  title={isRtl ? "نسخ الرابط" : "Copy storefront link"}
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 2. QR Code Scannable Card */}
            <div className="bg-white/85 dark:bg-[#090909]/40 p-6 border border-slate-205 dark:border-zinc-900 rounded-3xl text-center space-y-5 shadow-md dark:shadow-xl backdrop-blur-md transition-all">
              <h4 className="font-bold text-slate-800 dark:text-white text-xs flex items-center justify-center gap-1.5">
                📱 {isRtl ? "رمز الاستجابة السريعة (QR Code)" : "Public QR Scanner"}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500 leading-normal">
                {isRtl
                  ? "امسح أو نزل الرمز المطبوع لمشاركته كملصق على واجهة المحل أو داخل الطرود."
                  : "Display or print this barcode. Anyone scanning it is routed to your storefront."}
              </p>

              {/* QR Code Container with sleek ambient ring */}
              <div className="relative w-40 h-40 bg-white p-2.5 rounded-2xl mx-auto border border-slate-150 dark:border-zinc-800 shadow-inner flex items-center justify-center transition-all duration-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    `${window.location.origin}/s/${user?.uid || ""}`
                  )}`}
                  alt="Scannable Store Link QR Code"
                  className="w-full h-full"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Action Button for QR */}
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                  `${window.location.origin}/s/${user?.uid || ""}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-1.5 py-2.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-805 text-slate-700 dark:text-zinc-300 rounded-xl font-bold text-xs transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                {isRtl ? "فتح وتنزيل رمز الـ QR بدقة كاملة" : "Download Print-Ready QR"}
              </a>
            </div>

            {/* 3. Developer & Webhook Settings Card */}
            <WebhookSetupCard user={user} isRtl={isRtl} />
          </div>
        </motion.div>
      ) : (
        <>
          {/* Toolbar: Filters & template selections */}
          <div className="flex flex-col lg:flex-row gap-3">
        
        {/* Search */}
        <div className="flex-1 relative bg-zinc-900/30 border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input 
            type="text" 
            placeholder={isRtl ? "ابحث في الاسم أو الرمز SKU..." : "Search product title or stock code..."}
            className="bg-transparent w-full outline-none text-xs text-white placeholder:text-zinc-650"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-zinc-650 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-900/40 border border-zinc-800 py-2.5 px-3 rounded-xl text-xs font-semibold text-zinc-300 outline-none select-none appearance-none cursor-pointer pr-8 pl-3 relative"
            style={{ backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>\')', backgroundPosition: isRtl ? 'left 10px center' : 'right 10px center', backgroundRepeat: 'no-repeat' }}
          >
            <option value="all">{isRtl ? "جميع الفئات" : "All Categories"}</option>
            {categories.filter(c => c !== "all").map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Template View Switcher representing three professional visual templates */}
          <div className="bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60 flex items-center gap-0.5">
            <button 
              onClick={() => setViewTemplate("grid")}
              className={`p-1.5 rounded-lg transition-all ${viewTemplate === "grid" ? "bg-white text-black font-semibold" : "text-zinc-500 hover:text-white"}`}
              title={isRtl ? "الشبكة الحديثة (Template 1)" : "Template 1: Modern Grid Cards"}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewTemplate("table")}
              className={`p-1.5 rounded-lg transition-all ${viewTemplate === "table" ? "bg-white text-black font-semibold" : "text-zinc-500 hover:text-white"}`}
              title={isRtl ? "العرض الجدولي (Template 2)" : "Template 2: Table View"}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewTemplate("kanban")}
              className={`p-1.5 rounded-lg transition-all ${viewTemplate === "kanban" ? "bg-white text-black font-semibold" : "text-zinc-500 hover:text-white"}`}
              title={isRtl ? "لوحة كانبان الذكية (Template 3)" : "Template 3: Interactive Kanban Board"}
            >
              <Layout className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="animate-spin text-zinc-500 w-8 h-8" />
          <span className="text-xs text-zinc-500 font-medium">{isRtl ? "جاري جرد المنتجات والمستودع..." : "Syncing inventory items..."}</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="border border-zinc-900 bg-zinc-950/20 rounded-3xl p-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6 text-zinc-650" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-zinc-300 text-sm">
              {isRtl ? "لم يتم العثور على أي منتج" : "Inventory database is empty"}
            </h4>
            <p className="text-xs text-zinc-650 max-w-sm mx-auto">
              {isRtl ? "ابدأ ريادة مبيعاتك وأضف مظهر صور الأسعار والمنتج والكميات لتسريع إدارة الفواتير." : "Register product titles, active variants, physical catalogs and pricing metadata."}
            </p>
          </div>
        </div>
      ) : (
        <div>
          
          {/* =========================================================================
              TEMPLATE 1: Modern Grid Cards (البطاقات الشبكية ذات تفاعل المرور)
              ========================================================================= */}
          {viewTemplate === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 bg-zinc-950/20 p-1">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    selectedProductIds={selectedProductIds}
                    toggleSelectProduct={toggleSelectProduct}
                    openEditModal={openEditModal}
                    setShowDeleteConfirm={setShowDeleteConfirm}
                    isRtl={isRtl}
                    t={t}
                    enableLazyLoading={filteredProducts.length > 50}
                    onTogglePublish={handleTogglePublish}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* =========================================================================
              TEMPLATE 2: Table View (العرض الجدولي مع دعم فرز وتحديد متعدد لحذف دفعة واحدة)
              ========================================================================= */}
          {viewTemplate === "table" && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="bg-zinc-900/10 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                  <thead>
                    <tr className="bg-zinc-950/30 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-black tracking-wider select-none">
                      {/* Checkbox select all */}
                      <th className="py-3 px-4 w-12 text-center">
                        <button 
                          onClick={toggleSelectAll}
                          className="w-4 h-4 rounded border border-zinc-800 hover:border-zinc-500 bg-zinc-950 flex items-center justify-center mx-auto cursor-pointer"
                        >
                          {filteredProducts.length > 0 && filteredProducts.map(p => p.id!).every(id => selectedProductIds.includes(id)) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4 w-14">{isRtl ? "العرض" : "Preview"}</th>
                      
                      {/* Sortable ProductName Column */}
                      <th 
                        onClick={() => handleSort("productName")}
                        className="py-3 px-4 cursor-pointer hover:bg-zinc-900/40 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{isRtl ? "اسم المنتج" : "Product & SKU"}</span>
                          <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                        </div>
                      </th>
                      <th className="py-3 px-4">{isRtl ? "الفئة" : "Category"}</th>
                      
                      {/* Sortable Stock Column */}
                      <th 
                        onClick={() => handleSort("stockQuantity")}
                        className="py-3 px-4 cursor-pointer hover:bg-zinc-900/40 text-center text-xs transition-colors"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{isRtl ? "المخزون" : "Stock"}</span>
                          <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                        </div>
                      </th>
                      
                      {/* Sortable Price Column */}
                      <th 
                        onClick={() => handleSort("price")}
                        className="py-3 px-4 cursor-pointer hover:bg-zinc-900/40 text-center text-xs transition-colors"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{isRtl ? "سعر البيع" : "DZD Price"}</span>
                          <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-center text-xs">{isRtl ? "معروض بالمتجر" : "On Store"}</th>
                      <th className="py-3 px-4 text-right w-24 pr-6">{isRtl ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p, idx) => {
                      const isOutOfStock = p.stockQuantity <= 0;
                      const isLowStock = p.stockQuantity < 5 && p.stockQuantity > 0;
                      const isSelected = selectedProductIds.includes(p.id!);

                      return (
                        <tr 
                          key={p.id} 
                          className={`border-b border-zinc-850/40 hover:bg-zinc-900/10 transition-colors text-xs ${
                            isSelected ? "bg-zinc-900/20" : idx % 2 === 0 ? "bg-zinc-950/10" : ""
                          }`}
                        >
                          {/* Row Checkbox select */}
                          <td className="py-3 px-4 text-center">
                            <button 
                              onClick={() => toggleSelectProduct(p.id!)}
                              className={`w-4 h-4 rounded border flex items-center justify-center mx-auto cursor-pointer transition-colors ${
                                isSelected ? "bg-white border-white text-black" : "border-zinc-800 bg-zinc-950 hover:border-zinc-650"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[2.5px]" />}
                            </button>
                          </td>

                          {/* Preview column */}
                          <td className="py-3 px-4">
                            <div className="w-9 h-9 rounded-lg bg-zinc-950 flex items-center justify-center overflow-hidden border border-zinc-850">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-zinc-600" />
                              )}
                            </div>
                          </td>

                          {/* ProductName & Code */}
                          <td className="py-3 px-4 font-semibold text-white">
                            <div>
                              <p className="font-extrabold text-white text-sm tracking-wide leading-tight">{p.productName}</p>
                              {p.sku && <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{p.sku}</span>}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4">
                            {p.category ? (
                              <span className="text-[10px] uppercase font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-md px-2 py-0.5">{p.category}</span>
                            ) : (
                              <span className="text-zinc-600">---</span>
                            )}
                          </td>

                          {/* Stock Quantity */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                              isOutOfStock 
                                ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                : isLowStock 
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {isLowStock && <AlertCircle className="w-3 h-3 text-amber-500 inline" />}
                              {p.stockQuantity}
                            </span>
                          </td>

                          {/* Pricing */}
                          <td className="py-3 px-4 text-center font-bold text-emerald-400 text-sm">
                            {p.price.toLocaleString()} {isRtl ? "دج" : "DA"}
                          </td>

                          {/* Storefront visibility status toggle */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleTogglePublish(p)}
                              className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full transition-all cursor-pointer border ${
                                p.isPublished === true
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25"
                                  : "bg-zinc-950 text-zinc-500 border-zinc-850 hover:text-zinc-300 hover:border-zinc-750"
                              }`}
                            >
                              <Store className="w-3.5 h-3.5 shrink-0" />
                              <span>{p.isPublished === true ? (isRtl ? "معروض" : "On Store") : (isRtl ? "في المستودع" : "Backstore")}</span>
                            </button>
                          </td>

                          {/* Action triggers */}
                          <td className="py-3 px-4 pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => openEditModal(p)} 
                                className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer border border-transparent hover:border-zinc-700"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setShowDeleteConfirm(p.id!)} 
                                className="p-1.5 hover:bg-red-500/10 rounded text-zinc-650 hover:text-red-500 transition-colors cursor-pointer border border-transparent hover:border-red-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* =========================================================================
              TEMPLATE 3: Kanban Board (لوحة تتبع المخزون والتبديل التلقائي لمستويات السلع)
              ========================================================================= */}
          {viewTemplate === "kanban" && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="grid grid-cols-1 md:grid-cols-3 gap-5"
            >
              
              {/* Column 1: Low Stock (<5 Items) */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleKanbanDrop(e, "low")}
                className={`bg-zinc-950/20 border rounded-3xl p-4 space-y-4 min-h-[450px] transition-all flex flex-col ${
                  isDragging ? "border-dashed border-zinc-700 bg-zinc-900/20" : "border-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 block" />
                    <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest">
                      {isRtl ? "منخفض المخزون (<5)" : "Low Stock (<5)"}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-550 font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-900">
                    {lowStockProducts.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
                  {lowStockProducts.map(p => (
                    <div 
                      key={p.id}
                      draggable
                      onDragStart={(e) => handleKanbanDragStart(e, p.id!)}
                      className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-red-500/20 rounded-2xl p-3.5 space-y-3 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] shadow"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-xs text-white line-clamp-1">{p.productName}</h4>
                          {p.sku && <span className="text-[9px] text-zinc-500 font-mono tracking-wider block mt-0.5 uppercase">{p.sku}</span>}
                        </div>
                        {p.imageUrl && (
                          <img src={p.imageUrl} alt="" className="w-7 h-7 rounded object-cover border border-zinc-800" referrerPolicy="no-referrer" />
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-900">
                        <span className="text-emerald-400 font-black text-xs font-sans">{p.price.toLocaleString()} DZD</span>
                        <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-0.5">
                          <span className="text-[9px] font-black text-red-400 font-mono">{p.stockQuantity} pcs</span>
                        </div>
                      </div>

                      {/* Manual Quick Modulation support */}
                      <div className="pt-2 flex justify-between items-center select-none border-t border-zinc-950/40">
                        <button 
                          onClick={() => openEditModal(p)}
                          className="flex items-center gap-1 px-2.5 py-1 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white rounded-xl border border-zinc-850 cursor-pointer transition-all"
                          title={isRtl ? "تعديل المنتج" : "Edit product"}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isRtl ? "تعديل" : "Edit"}</span>
                        </button>
                        <button 
                          onClick={() => updateStockLevel(p.id!, p.stockQuantity + 5)}
                          className="px-2 py-1 bg-zinc-850 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white rounded-xl border border-zinc-800 cursor-pointer transition-all"
                        >
                          +5 Stock
                        </button>
                      </div>
                    </div>
                  ))}
                  {lowStockProducts.length === 0 && (
                    <div className="h-28 border border-dashed border-zinc-900 rounded-2xl flex flex-col items-center justify-center opacity-40">
                      <span className="text-[10px] text-zinc-600">{isRtl ? "لا توجد عناصر" : "Empty column"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Medium Stock (5-20 Items) */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleKanbanDrop(e, "mid")}
                className={`bg-zinc-950/20 border rounded-3xl p-4 space-y-4 min-h-[450px] transition-all flex flex-col ${
                  isDragging ? "border-dashed border-zinc-700 bg-zinc-900/20" : "border-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block" />
                    <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest">
                      {isRtl ? "متوسط المخزون (5-20)" : "Medium Stock (5-20)"}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-550 font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-900">
                    {midStockProducts.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
                  {midStockProducts.map(p => (
                    <div 
                      key={p.id}
                      draggable
                      onDragStart={(e) => handleKanbanDragStart(e, p.id!)}
                      className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-amber-500/20 rounded-2xl p-3.5 space-y-3 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] shadow"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-xs text-white line-clamp-1">{p.productName}</h4>
                          {p.sku && <span className="text-[9px] text-zinc-500 font-mono tracking-wider block mt-0.5 uppercase">{p.sku}</span>}
                        </div>
                        {p.imageUrl && (
                          <img src={p.imageUrl} alt="" className="w-7 h-7 rounded object-cover border border-zinc-800" referrerPolicy="no-referrer" />
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-900">
                        <span className="text-emerald-400 font-black text-xs font-sans">{p.price.toLocaleString()} DZD</span>
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-0.5">
                          <span className="text-[9px] font-black text-amber-500 font-mono">{p.stockQuantity} pcs</span>
                        </div>
                      </div>

                      {/* Quick Adjust triggers */}
                      <div className="pt-2 flex justify-between items-center select-none border-t border-zinc-950/40">
                        <button 
                          onClick={() => openEditModal(p)}
                          className="flex items-center gap-1 px-2.5 py-1 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white rounded-xl border border-zinc-850 cursor-pointer transition-all"
                          title={isRtl ? "تعديل المنتج" : "Edit product"}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isRtl ? "تعديل" : "Edit"}</span>
                        </button>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => updateStockLevel(p.id!, Math.max(0, p.stockQuantity - 5))}
                            className="px-2 py-1 bg-zinc-850 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white rounded-xl border border-zinc-800 cursor-pointer transition-all"
                          >
                            -5
                          </button>
                          <button 
                            onClick={() => updateStockLevel(p.id!, p.stockQuantity + 5)}
                            className="px-2 py-1 bg-zinc-850 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white rounded-xl border border-zinc-800 cursor-pointer transition-all"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {midStockProducts.length === 0 && (
                    <div className="h-28 border border-dashed border-zinc-900 rounded-2xl flex flex-col items-center justify-center opacity-40">
                      <span className="text-[10px] text-zinc-600">{isRtl ? "لا توجد عناصر" : "Empty column"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: High Stock (>20 Items) */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleKanbanDrop(e, "high")}
                className={`bg-zinc-950/20 border rounded-3xl p-4 space-y-4 min-h-[450px] transition-all flex flex-col ${
                  isDragging ? "border-dashed border-zinc-700 bg-zinc-900/20" : "border-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block" />
                    <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest">
                      {isRtl ? "مرتفع المخزون (>20)" : "High Stock (>20)"}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-550 font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-900">
                    {highStockProducts.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
                  {highStockProducts.map(p => (
                    <div 
                      key={p.id}
                      draggable
                      onDragStart={(e) => handleKanbanDragStart(e, p.id!)}
                      className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-emerald-500/25 rounded-2xl p-3.5 space-y-3 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] shadow"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-xs text-white line-clamp-1">{p.productName}</h4>
                          {p.sku && <span className="text-[9px] text-zinc-500 font-mono tracking-wider block mt-0.5 uppercase">{p.sku}</span>}
                        </div>
                        {p.imageUrl && (
                          <img src={p.imageUrl} alt="" className="w-7 h-7 rounded object-cover border border-zinc-800" referrerPolicy="no-referrer" />
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-900">
                        <span className="text-emerald-400 font-black text-xs font-sans">{p.price.toLocaleString()} DZD</span>
                        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-0.5">
                          <span className="text-[9px] font-black text-emerald-400 font-mono">{p.stockQuantity} pcs</span>
                        </div>
                      </div>

                      {/* Manual adjust for drag actions falling back to buttons */}
                      <div className="pt-2 flex justify-between items-center select-none border-t border-zinc-950/40">
                        <button 
                          onClick={() => openEditModal(p)}
                          className="flex items-center gap-1 px-2.5 py-1 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white rounded-xl border border-zinc-850 cursor-pointer transition-all"
                          title={isRtl ? "تعديل المنتج" : "Edit product"}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isRtl ? "تعديل" : "Edit"}</span>
                        </button>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => updateStockLevel(p.id!, Math.max(0, p.stockQuantity - 5))}
                            className="px-2 py-1 bg-zinc-850 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white rounded-xl border border-zinc-800 cursor-pointer transition-all"
                          >
                            -5
                          </button>
                          <button 
                            onClick={() => updateStockLevel(p.id!, p.stockQuantity + 5)}
                            className="px-2 py-1 bg-zinc-850 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white rounded-xl border border-zinc-800 cursor-pointer transition-all"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {highStockProducts.length === 0 && (
                    <div className="h-28 border border-dashed border-zinc-900 rounded-2xl flex flex-col items-center justify-center opacity-40">
                      <span className="text-[10px] text-zinc-600">{isRtl ? "لا توجد عناصر" : "Empty column"}</span>
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          )}

        </div>
      )}
    </>
  )}

      {/* 5. ADD/EDIT PRODUCT MODAL (نموذج إضافة/تعديل المنتج الزجاجي الاحترافي) */}
      <AnimatePresence>
        {(showAddModal || editingProduct !== null) && (
          <ProductModal
            isWarehouse={isWarehouse}
            showAddModal={showAddModal}
            editingProduct={editingProduct}
            onClose={() => {
              if (editingProduct) {
                setEditingProduct(null);
                resetForm();
              } else {
                setShowAddModal(false);
              }
            }}
            onCancel={() => {
              if (editingProduct) {
                setEditingProduct(null);
                resetForm();
              } else {
                setShowAddModal(false);
                resetForm();
              }
            }}
            onSubmit={editingProduct ? handleUpdateSubmit : handleAddSubmit}
            productName={productName}
            setProductName={setProductName}
            sku={sku}
            setSku={setSku}
            category={category}
            setCategory={setCategory}
            price={price}
            setPrice={setPrice}
            stockQuantity={stockQuantity}
            setStockQuantity={setStockQuantity}
            description={description}
            setDescription={setDescription}
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            imageFileBase64={imageFileBase64}
            setImageFileBase64={setImageFileBase64}
            isDragging={isDragging}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
            handleImageChange={handleImageChange}
            apiLoading={apiLoading}
            isPublished={isPublished}
            setIsPublished={setIsPublished}
            isRtl={isRtl}
            t={t}
            sizes={sizes}
            setSizes={setSizes}
            colors={colors}
            setColors={setColors}
            sizeLabel={sizeLabel}
            setSizeLabel={setSizeLabel}
            colorLabel={colorLabel}
            setColorLabel={setColorLabel}
          />
        )}
      </AnimatePresence>

      {/* INDIVIDUAL PRODUCT DELETE CONFIRMATION */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
            <div onClick={() => setShowDeleteConfirm(null)} className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-zinc-950 border border-zinc-850 rounded-3xl p-6 w-full max-w-xs text-center space-y-5">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto text-xl">
                🗑️
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{isRtl ? "حذف هذا المنتج؟" : t.single_delete_title || "Confirm deletion"}</h3>
                <p className="text-[11px] text-zinc-550 mt-1 leading-normal">{isRtl ? "سيتم حذف هذا المنتج من قاعدة البيانات نهائيًا!" : t.single_delete_desc || "This product will be permanently deleted from your inventory system."}</p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={() => handleDeleteProduct(showDeleteConfirm)} 
                  disabled={apiLoading}
                  className="w-full py-2.5 bg-red-500 text-white rounded-xl text-xs font-extrabold cursor-pointer hover:bg-red-600 transition-colors"
                >
                  {isRtl ? "تأكيد الحذف" : t.confirm_bulk_del || "Confirm delete"}
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(null)} 
                  className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-305 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isRtl ? "إلغاء والاحتفاظ بالمنتج" : t.keep_products || "Keep product"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BULK DELETE CONFIRMATION */}
      <AnimatePresence>
        {isBulkDeleteConfirm && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
            <div onClick={() => setIsBulkDeleteConfirm(false)} className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-zinc-950 border border-zinc-850 rounded-3xl p-6 w-full max-w-xs text-center space-y-5">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
                ⚠️
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{isRtl ? `حذف ${selectedProductIds.length} منتجات؟` : t.bulk_delete_title || "Delete items?"}</h3>
                <p className="text-[11px] text-zinc-550 mt-1 leading-normal">{isRtl ? "هل أنت متأكد من حذف هذه المنتجات المحددة دفعة واحدة؟" : t.bulk_delete_desc || "Are you absolutely sure you want to perform a batch deletion?"}</p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={handleBulkDelete} 
                  disabled={apiLoading}
                  className="w-full py-2.5 bg-red-500 text-white rounded-xl text-xs font-extrabold cursor-pointer hover:bg-red-600 transition-colors"
                >
                  {isRtl ? "نعم، احذف الكل" : t.confirm_bulk_del || "Yes, delete block"}
                </button>
                <button 
                  onClick={() => setIsBulkDeleteConfirm(false)} 
                  className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-305 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isRtl ? "إلغاء`" : t.keep_products || "Abandon batch"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
