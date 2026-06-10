import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingBag, Shield, CheckCircle2, ShoppingCart, RefreshCw, X, Plus, Minus, ChevronDown, User, Phone, MapPin, Smartphone, Truck 
} from "lucide-react";
import { ALGERIA_68_WILAYAS } from "./WilayasList";
import Storefront from "./Storefront";
import StorefrontCart from "./StorefrontCart";
import { safeStorage } from "../lib/utils";

export const WILAYA_COMMUNES: Record<string, string[]> = {
  "01": ["Adrar", "Reggane", "Timimoun", "Aoulef", "Fenoughil", "Tsabit", "Zaouiet Kounta"],
  "02": ["Chlef", "Oued Fodda", "Boukadir", "Ténès", "Ouled Fares", "Chettia", "El Karimia"],
  "03": ["Laghouat", "Aflou", "Hassi R'Mel", "Ain Madhi", "Ksar El Hirane", "Oued Morra"],
  "04": ["Oum El Bouaghi", "Aïn Beïda", "Aïn M'lila", "Aïn Fakroun", "F'kirina", "Souk Naamane"],
  "05": ["Batna", "Arris", "Barika", "Merouana", "Aïn Touta", "Timgad", "N'Gaous"],
  "06": ["Béjaïa", "Akbou", "El Kseur", "Sidi Aïch", "Amizour", "Kherrata", "Tichy"],
  "07": ["Biskra", "Tolga", "Ouled Djellal", "Sidi Okba", "El Kantara", "M'Chouneche"],
  "08": ["Béchar", "Kenadsa", "Abadla", "Taghit", "Beni Abbes", "Lahmar", "Tabelbala"],
  "09": ["Blida", "Boufarik", "Ouled Yaïch", "Beni Mered", "Chebli", "El Affroun", "Larbaa"],
  "10": ["Bouira", "Lakhdaria", "Sour El Ghozlane", "Aïn Bessem", "M'Chedallah", "Bechloul"],
  "11": ["Tamanrasset", "In Salah", "In Amguel", "Idles", "Tazrouk", "Abalessa"],
  "12": ["Tébessa", "Bir El Ater", "Cheria", "Ouenza", "El Ma Labiodh", "Negrine"],
  "13": ["Tlemcen", "Maghnia", "Ghazaouet", "Remchi", "Sebdou", "Nedroma", "Hennaya"],
  "14": ["Tiaret", "Sougueur", "Frenda", "Ksar Chellala", "Rahouia", "Aïn Deheb", "Mahdia"],
  "15": ["Tizi Ouzou", "Larbâa Nath Irathen", "Azazga", "Tigzirt", "Azeffoun", "Draâ El Mizan", "Boghni"],
  "16": ["Sidi M'Hamed", "Alger Centre", "Bab El Oued", "El Harrach", "Hydra", "Kouba", "Dar El Beïda", "Rouïba", "Cheraga", "Zeralda", "Dely Ibrahim", "Bir Mourad Raïs"],
  "17": ["Djelfa", "Hassi Bahbah", "Ain Maabed", "Messaad", "Dar Chioukh", "Charef", "Birine"],
  "18": ["Jijel", "Taher", "El Milia", "Texenna", "Ziouama Mansouriah", "Sidi Abdelaziz"],
  "19": ["Sétif", "El Eulma", "Aïn Arnat", "Aïn Oulmene", "Amoucha", "Bougaa", "Salah Bey"],
  "20": ["Saïda", "Aïn El Hadjar", "Youb", "Sidi Boubekeur", "Hassasna"],
  "21": ["Skikda", "Collo", "Azzaba", "El Harrouch", "Tamalous", "Filfila"],
  "22": ["Sidi Bel Abbès", "Sfisef", "Telagh", "Sidi Ali Benyoub", "Mostefa Ben Brahim"],
  "23": ["Annaba", "El Bouni", "Seraïdi", "Berrahal", "El Hadjar", "Sidi Amar"],
  "24": ["Guelma", "Bouchegouf", "Héliopolis", "Oued Zenati", "Hammame Debagh"],
  "25": ["Constantine", "El Khroub", "Hamma Bouziane", "Didouche Mourad", "Zighoud Youcef"],
  "26": ["Médéa", "Ksar El Boukhari", "Beriaghane", "Tablat", "Berrouaghia", "Ouzera"],
  "27": ["Mostaganem", "Aïn Tédelès", "Sidi Ali", "Bouguirat", "Hassi Mameche"],
  "28": ["M'Sila", "Boussaâda", "Maadid", "Sidi Aïssa", "Aïn El Hadjel", "M'Tarfa"],
  "29": ["Mascara", "Sig", "Mohammadia", "Ghriss", "Tighennif", "Bou Hanifia"],
  "30": ["Ouargla", "Hassi Messaoud", "Touggourt", "N'Goussa", "Rouissat", "Sidi Khouiled"],
  "31": ["Oran", "Es Sénia", "Bir El Djir", "Arzew", "Gdyel", "Bethioua", "Mers El Kébir", "Aïn El Turk"],
  "32": ["El Bayadh", "Rogassa", "Bougtoub", "Brezina", "Asla", "El Abiodh Sidi Cheikh"],
  "33": ["Illizi", "Djanet", "In Amenas", "Bordj Omar Driss"],
  "34": ["Bordj Bou Arréridj", "Ras El Oued", "Mansoura", "Medjana", "Bordj Ghdir"],
  "35": ["Boumerdès", "Dellys", "Boudouaou", "Khemis El Khechna", "Baghlia", "Zemmouri"],
  "36": ["El Tarf", "El Kala", "Drean", "Besbes", "Bouhadjar"],
  "37": ["Tindouf", "Oum El Assel"],
  "38": ["Tissemsilt", "Theniet El Had", "Lardjem", "Khemisti"],
  "39": ["El Oued", "Guemar", "Hassi Khalifa", "Robbah", "M'Ghair", "Djamaa"],
  "40": ["Khenchela", "Kais", "Chechar", "Bouhmama", "Aïn Touila"],
  "41": ["Souk Ahras", "M'Daourouch", "Sedrata", "Taoura", "Haddada"],
  "42": ["Tipaza", "Cherchell", "Kolea", "Bou Ismail", "Hadout", "Gouraya"],
  "43": ["Mila", "Chelghoum Laïd", "Grarem Gouga", "Ferdjioua", "Teleghma", "Oued Athmanea"],
  "44": ["Aïn Defla", "Khemis Miliana", "Miliana", "El Attaf", "Djelida", "Rouina"],
  "45": ["Naâma", "Aïn Séfra", "Mécheria", "Moghrar", "Tiout"],
  "46": ["Aïn Témouchent", "Beni Saf", "Hammam Bou Hadjar", "El Amria", "Aïn Kihal"],
  "47": ["Ghardaïا", "Metlili", "El Guerrara", "Bounoura", "Zelfana"],
  "48": ["Relizane", "Oued Rhiou", "Mazouna", "Ammi Moussa", "Yellel"],
  "49": ["El M'Ghair", "Djamaa", "Oum Touyour", "Sidi Amrane"],
  "50": ["El Meniaa", "Hassi Gara", "Hassi El Gara"],
  "51": ["Ouled Djellal", "Sidi Khaled", "Besbes", "Chaïba"],
  "52": ["Bordj Baji Mokhtar", "Timiaouine"],
  "53": ["Béni Abbès", "Kerzaz", "Tabelbala", "Ouled Khoudir"],
  "54": ["Timimoun", "Aougrout", "Charouine", "Ksar Kaddour"],
  "55": ["Touggourt", "Temacine", "Nezla", "Tebesbest"],
  "56": ["Djanet", "Bordj El Haouas"],
  "57": ["In Salah", "Foggaret Ezzaouia", "In Ghar"],
  "58": ["In Guezzam", "Tin Zaouatine"],
  "59": ["Aflou", "Oued Morra", "Sidi Bouzid"],
  "60": ["Barika", "M'doukel", "Bitam"],
  "61": ["Ksar Chellala", "Zmalet El Emir Abdelkader"],
  "62": ["Messaad", "Delat", "Damene"],
  "63": ["El Eulma", "Bazer Sakhra", "Guelta Zerka"],
  "64": ["Boussaâda", "El Hamel", "Oultene"],
  "65": ["Tolga", "Foughala", "Shaïba"],
  "66": ["Ain Oussera", "Guernini", "Boughezoul"],
  "67": ["Tazmalt", "Ait M'likesh", "Boudjellil"],
  "68": ["Chelghoum Laïd", "Oued Athmanea", "Teleghma"]
};

interface PublicCheckoutFormProps {
  merchantId: string;
}

interface CartItem {
  cartItemId: string;
  id: string;
  productName: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  size: string;
  color: string;
}

export default function PublicCheckoutForm({ merchantId }: PublicCheckoutFormProps) {
  // Merchant details loaded from unified secure endpoint GET /api/store/:merchantId/info
  const [storeInfo, setStoreInfo] = useState({
    storeName: "متجر SmartyAi",
    storeLogo: "",
    storeDescription: "أهلاً بك في متجرنا الإلكتروني المتميز. تسوق أفضل المنتجات بأفضل الأسعار مع توصيل سريع لجميع الولايات."
  });
  const [loadingMerchant, setLoadingMerchant] = useState<boolean>(true);

  // Products state fetched from GET /api/store/:merchantId/products
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // Filter & Search store state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Cart & Screen transition
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = safeStorage.getItem(`smarty_cart_${merchantId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState<"store" | "checkout">("store");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Customization choices
  const [tempQty, setTempQty] = useState<number>(1);
  const [tempSize, setTempSize] = useState<string>("");
  const [tempColor, setTempColor] = useState<string>("");

  // Toast indicator
  const [showAddedToast, setShowAddedToast] = useState<boolean>(false);

  // Floating Social Proof active notification info
  const [activeNotification, setActiveNotification] = useState<{
    customerName: string;
    wilaya: string;
    productName: string;
    timeSpan: string;
  } | null>(null);

  useEffect(() => {
    if (products.length === 0 || activeTab !== "store") {
      setActiveNotification(null);
      return;
    }

    const firstNames = ["عبد القادر", "سارة", "محمد", "ياسمين", "أحمد", "شيماء", "بلال", "إيمان", "عفراء", "مريم", "حمزة", "أنيسة", "بلقاسم", "أسامة", "منال", "إلياس", "فاطمة", "سفيان", "خديجة", "أيوب"];
    const algerianWilayas = ["الجزائر العاصمة", "وهران", "قسنطينة", "سطيف", "تلمسان", "باتنة", "عنابة", "البويرة", "بجاية", "البليدة", "الشلف", "تيزي وزو", "سكيكدة", "بسكرة", "جيجل", "المسيلة", "سيدي بلعباس"];
    const relativeTimes = ["قبل دقيقة فقط", "قبل دقيقتين", "قبل 5 دقائق", "قبل 12 دقيقة", "قبل 20 دقيقة", "قبل نصف ساعة"];

    const triggerNotification = () => {
      // Pick random parameters
      const randomName = firstNames[Math.floor(Math.random() * firstNames.length)] + " " + (Math.floor(Math.random() * 2) === 0 ? "ب." : "م.");
      const randomWilaya = algerianWilayas[Math.floor(Math.random() * algerianWilayas.length)];
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const randomTime = relativeTimes[Math.floor(Math.random() * relativeTimes.length)];

      if (randomProduct && randomProduct.productName) {
        setActiveNotification({
          customerName: randomName,
          wilaya: randomWilaya,
          productName: randomProduct.productName,
          timeSpan: randomTime
        });

        // Hide notification after 5.5 seconds
        setTimeout(() => {
          setActiveNotification(null);
        }, 5500);
      }
    };

    // First trigger after 4 seconds
    const initialTimer = setTimeout(triggerNotification, 4000);

    // Repeat every 16 seconds
    const intervalId = setInterval(triggerNotification, 16000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [products, activeTab]);

  // Persist cart items uniquely for merchant
  useEffect(() => {
    safeStorage.setItem(`smarty_cart_${merchantId}`, JSON.stringify(cart));
  }, [cart, merchantId]);

  // 1. Fetch Store metadata
  useEffect(() => {
    async function fetchStoreMetadata() {
      try {
        setLoadingMerchant(true);
        const res = await fetch(`/api/store/${merchantId}/info`);
        const data = await res.json();
        if (data.success) {
          setStoreInfo({
            storeName: data.storeName,
            storeLogo: data.storeLogo,
            storeDescription: data.storeDescription
          });
        }
      } catch (err) {
        console.error("Failed to load storefront metrics:", err);
      } finally {
        setLoadingMerchant(false);
      }
    }
    fetchStoreMetadata();
  }, [merchantId]);

  // 2. Fetch Store catalog (reacts to category choice, keyword searches and page transitions)
  useEffect(() => {
    async function loadStoreCatalog() {
      try {
        setLoadingProducts(true);
        const selectedCatParam = selectedCategory !== "all" ? encodeURIComponent(selectedCategory) : "";
        const searchParam = searchQuery ? encodeURIComponent(searchQuery) : "";

        const res = await fetch(
          `/api/store/${merchantId}/products?category=${selectedCatParam}&search=${searchParam}&page=${currentPage}&limit=20`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setProducts(data.products || []);
            setCategories(data.categories || []);
            setTotalPages(data.pagination?.totalPages || 1);
          }
        }
      } catch (e) {
        console.error("Error setting products:", e);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadStoreCatalog();
  }, [merchantId, selectedCategory, searchQuery, currentPage]);

  const handleOpenProduct = (prod: any) => {
    setSelectedProduct(prod);
    setTempQty(1);
    setTempSize("");
    setTempColor("");
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const cartItemId = `${selectedProduct.id}-${tempSize}-${tempColor}`;
    setCart(prev => {
      const idx = prev.findIndex(item => item.cartItemId === cartItemId);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx].quantity += tempQty;
        return updated;
      } else {
        return [...prev, {
          cartItemId,
          id: selectedProduct.id,
          productName: selectedProduct.productName,
          price: Number(selectedProduct.price) || 0,
          imageUrl: selectedProduct.imageUrl || "",
          quantity: tempQty,
          size: tempSize,
          color: tempColor
        }];
      }
    });

    setSelectedProduct(null);
    setShowAddedToast(true);
    setTimeout(() => {
      setShowAddedToast(false);
    }, 2500);
  };

  const handleUpdateQty = (cartItemId: string, amount: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const next = item.quantity + amount;
        return next > 0 ? { ...item, quantity: next } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center select-none font-sans" dir="rtl">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {showAddedToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-4 left-4 md:left-auto md:right-8 z-50 bg-emerald-500 text-black font-black text-xs px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4 shrink-0 animate-bounce" />
            <span>تم إضافة المنتج إلى سلة الشراء بنجاح! 🛒</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container Core */}
      <div className="w-full max-w-5xl px-4 py-6 md:py-10 flex-grow pb-32">
        {activeTab === "store" ? (
          <Storefront
            merchantId={merchantId}
            storeName={storeInfo.storeName}
            storeLogo={storeInfo.storeLogo}
            storeDescription={storeInfo.storeDescription}
            products={products}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={(cat) => {
              setSelectedCategory(cat);
              setCurrentPage(1);
            }}
            searchQuery={searchQuery}
            setSearchQuery={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            cartCount={cart.reduce((sum, i) => sum + i.quantity, 0)}
            onOpenProduct={handleOpenProduct}
            onGoToCart={() => setActiveTab("checkout")}
            loadingProducts={loadingProducts}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        ) : (
          <StorefrontCart
            merchantId={merchantId}
            merchantName={storeInfo.storeName}
            cart={cart}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onBackToStore={() => setActiveTab("store")}
            onClearCart={() => setCart([])}
          />
        )}
      </div>

      {/* Product Details Customization Popup */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="w-full max-w-lg bg-zinc-950 border-t md:border border-zinc-850 rounded-t-[2rem] md:rounded-3xl overflow-hidden shadow-2xl overflow-y-auto max-h-[92vh]"
            >
              <div className="p-6 md:p-8 space-y-5 text-right" dir="rtl">
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <h3 className="text-sm font-extrabold text-white tracking-tight">تخصيص وإضافة المنتج للسلة</h3>
                </div>

                {/* Product Detail Banner */}
                <div className="flex gap-4 items-start bg-zinc-900/20 p-4 rounded-2xl border border-zinc-900/80">
                  <div className="w-20 h-20 rounded-xl bg-black overflow-hidden shrink-0 border border-zinc-900 relative">
                    {selectedProduct.imageUrl ? (
                      <img src={selectedProduct.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-805 bg-zinc-950">
                        <ShoppingBag className="w-8 h-8 text-zinc-800" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow space-y-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      {selectedProduct.category || "المنتجات والمخزون"}
                    </span>
                    <h4 className="text-sm font-extrabold text-white leading-snug">{selectedProduct.productName}</h4>
                    <p className="text-sm font-black text-emerald-400 font-mono">{(Number(selectedProduct.price) || 0).toLocaleString()} DA</p>
                    <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{selectedProduct.description || "لا يوجد وصف إضافي متاح لهذا المنتج مسبقاً."}</p>
                  </div>
                </div>

                {/* Custom Options config */}
                <div className="space-y-4 py-1">
                  {/* Option: Size Selection */}
                  <div className="space-y-2">
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">حدد المقاس المطلوب (أو اكتبه تلقائياً)</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {["S", "M", "L", "XL", "XXL", "38", "39", "40", "41", "42", "43"].map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setTempSize(sz)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                            tempSize === sz 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-500/5" 
                              : "bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-900"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                    <input 
                      type="text" 
                      placeholder="أو اكتب مقاس مخصص هنا..."
                      value={tempSize}
                      onChange={(e) => setTempSize(e.target.value)}
                      className="w-full mt-2 bg-black border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-zinc-800 transition-colors"
                    />
                  </div>

                  {/* Option: Color Selection */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">حدد اللون المطلوب (أو اكتبه تلقائياً)</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {["أسود", "أبيض", "أحمر", "أزرق", "رمادي", "بني", "ذهبي"].map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setTempColor(col)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            tempColor === col 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-500/5" 
                              : "bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-900"
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                    <input 
                      type="text" 
                      placeholder="أو اكتب لون مخصص هنا..."
                      value={tempColor}
                      onChange={(e) => setTempColor(e.target.value)}
                      className="w-full mt-2 bg-black border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-zinc-800 transition-colors"
                    />
                  </div>

                  {/* Option: Quantity Selectors */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-900 select-none">
                    <span className="text-xs font-bold text-zinc-400">الكمية المطلوبة لتوصيل الطرد:</span>
                    <div className="flex items-center bg-zinc-900/60 rounded-xl border border-zinc-850 p-1 divide-zinc-800 gap-1 leading-none">
                      <button 
                        type="button"
                        onClick={() => setTempQty(prev => Math.max(1, prev - 1))}
                        className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-mono font-bold w-10 text-center text-zinc-200">{tempQty}</span>
                      <button 
                        type="button"
                        onClick={() => setTempQty(prev => prev + 1)}
                        className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Confirm control - Sleek Radiant Emerald Dynamic Button */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs tracking-wider rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 hover:scale-[1.01]"
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  <span>تأكيد الإضافة ومتابعة الشراء 🛒</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Security Footer */}
      <div className="w-full bg-zinc-950/20 py-8 border-t border-zinc-905 flex flex-col items-center justify-center gap-2.5 mt-20 px-4 md:px-8">
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 max-w-sm bg-zinc-950/40 px-4 py-2 rounded-full border border-zinc-900 text-center">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>حماية وتأمين طلبك من خلال تشفير البيانات وضمان تسليم Yalidine Express موثق.</span>
        </div>
        <p className="text-[9px] text-zinc-600 tracking-wider">SMARTYAI SECURE CLIENT STOREFRONT ENGINE • VERSION 2.0</p>
      </div>

      {/* Dynamic Social Proof Floating Notification for global high-conversion standard */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed bottom-6 right-6 left-6 md:left-6 md:right-auto z-50 max-w-sm bg-neutral-950/95 border border-zinc-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center gap-3.5"
            dir="rtl"
          >
            {/* Minimal pulse ring visual indicator */}
            <div className="relative flex h-3.5 w-3.5 shrink-0 align-middle items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </div>
            
            <div className="text-right space-y-0.5 select-none pr-1">
              <p className="text-[10px] text-zinc-400 font-bold leading-tight">
                طلب حجز جديد متميز! 🎉
              </p>
              <p className="text-xs font-normal text-zinc-300">
                قام <strong className="font-extrabold text-white">{activeNotification.customerName}</strong> من ولاية <strong className="font-bold text-zinc-200">{activeNotification.wilaya}</strong> بشراء <span className="font-extrabold underline decoration-emerald-500/40 text-emerald-400">{activeNotification.productName}</span>
              </p>
              <p className="text-[9px] text-zinc-500 font-mono">
                {activeNotification.timeSpan}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
