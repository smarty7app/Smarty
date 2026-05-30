import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingBag, MapPin, Phone, User, FileText, CheckCircle2, 
  HelpCircle, RefreshCw, Smartphone, Package, Shield, Truck, ChevronDown
} from "lucide-react";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ALGERIA_68_WILAYAS } from "./WilayasList";

// Map of major realistic communes for each of the 68 Algerian wilayas for Yalidine/shipping alignment
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
  "47": ["Ghardaïa", "Metlili", "El Guerrara", "Bounoura", "Zelfana"],
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

export default function PublicCheckoutForm({ merchantId }: PublicCheckoutFormProps) {
  const [merchantName, setMerchantName] = useState<string>("");
  const [loadingMerchant, setLoadingMerchant] = useState<boolean>(true);
  
  // Form State
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("");
  const [selectedCommune, setSelectedCommune] = useState("");
  const [deliveryType, setDeliveryType] = useState<"home" | "desk">("home");
  const [note, setNote] = useState("");
  
  // Simple order contents state
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [productSize, setProductSize] = useState("");
  const [productColor, setProductColor] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Merchant user configuration from Firestore to dynamically load store info
  useEffect(() => {
    async function loadMerchantInfo() {
      try {
        const docRef = doc(db, "users", merchantId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMerchantName(data.displayName || `التاجر #${merchantId.slice(0, 6)}`);
        } else {
          setMerchantName("متجر SmartyAi");
        }
      } catch (err) {
        console.error("Error loading merchant details", err);
        setMerchantName("متجر SmartyAi");
      } finally {
        setLoadingMerchant(false);
      }
    }
    loadMerchantInfo();
  }, [merchantId]);

  // Handle auto-reset commune when wilaya changes
  const handleWilayaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedWilaya(val);
    setSelectedCommune("");
  };

  // Find wilaya code from name or selection to pull communes
  const activeWilayaObj = ALGERIA_68_WILAYAS.find(w => `${w.code} - ${w.nameAr}` === selectedWilaya || w.code === selectedWilaya);
  const activeWilayaCode = activeWilayaObj?.code || "";
  const communesList = activeWilayaCode ? WILAYA_COMMUNES[activeWilayaCode] || [] : [];

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phoneNumber.trim()) {
      setErrorMsg("يرجى ملء الاسم الكامل ورقم الهاتف بشكل صحيح.");
      return;
    }

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, "");
    const phoneRegex = /^(05|06|07)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setErrorMsg("الرجاء إدخال رقم هاتف جزائري صحيح ومفعّل يتكون من 10 أرقام ويبدأ بـ (05 أو 06 أو 07).");
      return;
    }
    if (!selectedWilaya) {
      setErrorMsg("يرجى اختيار ولاية التوصيل.");
      return;
    }
    if (!selectedCommune) {
      setErrorMsg("يرجى اختيار بلدية التوصيل.");
      return;
    }
    if (!productName.trim()) {
      setErrorMsg("يرجى إدخال اسم المنتج أو الطلبية المطلوبة.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      // Structure the exact payload compatible with Firestore orders collection template
      const payload = {
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        wilaya: activeWilayaObj ? `${activeWilayaObj.code} - ${activeWilayaObj.nameAr}` : selectedWilaya,
        commune: selectedCommune,
        deliveryType: deliveryType,
        status: "pending",               // Must be pending as requested
        possibleFake: false,
        note: note.trim(),
        userId: merchantId,              // Linked directly to the merchant ID
        items: [
          {
            product: productName.trim(),
            quantity: Number(quantity) || 1,
            size: productSize.trim() || "",
            color: productColor.trim() || "",
            pricePerUnit: 0 // Optional / free pricing for customer placement
          }
        ],
        shippingCompany: "Yalidine Express", // Fallback Default
        trackingNumber: "",
        labelUrl: "",
        locationUrl: "",
        shippingFee: 0,
        totalPrice: 0,
        createdAt: serverTimestamp()     // Saved with timestamp
      };

      const docRef = await addDoc(collection(db, "orders"), payload);
      setSubmittedId(docRef.id);
    } catch (err: any) {
      console.error("Failed to submit client order", err);
      setErrorMsg(err?.message || "حدث خطأ غير متوقع أثناء إرسال طلبك. يرجى المحاولة لاحقاً.");
    } finally {
      setSubmitting(false);
    }
  };

  // If successfully submitted, render an elegant localized confirmation screen
  if (submittedId) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 select-none" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900/40 border border-zinc-805/60 p-8 rounded-3xl text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          
          <h2 className="text-xl font-bold text-zinc-100 mb-2">تم استلام طلبك بنجاح!</h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            شكراً لتسوقك معنا، تم تسجيل الطلب لدى <span className="text-yellow-500 font-bold">{merchantName}</span> بنجاح. سيتواصل معك فريق الدعم قريباً لتأكيد الشحن والتوصيل.
          </p>

          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 text-right space-y-2.5 mb-6 text-xs">
            <div className="flex justify-between border-b border-zinc-900/40 pb-2">
              <span className="text-zinc-500">منفذ الطلب:</span>
              <span className="text-zinc-200 font-bold">{customerName}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900/40 pb-2">
              <span className="text-zinc-500">رقم الهاتف:</span>
              <span className="text-zinc-200 font-mono font-bold">{phoneNumber}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900/40 pb-2">
              <span className="text-zinc-500">الولاية والبلدية:</span>
              <span className="text-zinc-200 font-bold">
                {activeWilayaObj?.nameAr || selectedWilaya} • {selectedCommune}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">رقم تتبع الطلب:</span>
              <span className="text-yellow-500/90 font-mono font-bold">Pending-{submittedId.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>

          <button 
            onClick={() => {
              setSubmittedId(null);
              setCustomerName("");
              setPhoneNumber("");
              setSelectedWilaya("");
              setSelectedCommune("");
              setProductName("");
              setNote("");
            }}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-750 font-bold rounded-xl text-zinc-200 text-xs transition-colors cursor-pointer"
          >
            تقديم طلب جديد
          </button>
        </motion.div>

        <p className="text-[10px] text-zinc-600 mt-8 tracking-widest uppercase font-mono">
          Powered by SmartyAi • Secure Checkout
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-4 pt-8 md:pt-16 select-none font-sans" dir="rtl">
      
      {/* Dynamic Merchant/Store Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center mb-6"
      >
        <div className="w-12 h-12 bg-zinc-90 w-fit mx-auto rounded-2xl flex items-center justify-center border border-zinc-800/40 shadow-inner mb-3">
          <ShoppingBag className="w-6 h-6 text-yellow-500" />
        </div>
        <h1 className="text-base font-black text-zinc-100 flex items-center justify-center gap-1.5 leading-none">
          {loadingMerchant ? (
            <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
          ) : (
            merchantName
          )}
        </h1>
        <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">إستمارة تأكيد وتأمين طلبيتك</p>
      </motion.div>

      {/* Main Form Container - Highly mobile optimized */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md bg-zinc-900/20 border border-zinc-850/50 p-5 md:p-6 rounded-3xl shadow-xl space-y-5"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {/* Diagnostic messages */}
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-bold">
              {errorMsg}
            </div>
          )}

          {/* Section: Client Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-yellow-500" />
              1. معلومات الزبون
            </h3>

            <div>
              <label className="block text-[10px] text-zinc-500 font-bold mb-1 px-1">الاسم الكامل للزبون *</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="الاسم واللقب"
                  required
                  className="w-full pl-3 pr-10 py-3 bg-zinc-950/50 border border-zinc-850 rounded-xl text-zinc-100 text-xs focus:border-yellow-500/50 focus:outline-none transition-colors"
                />
                <User className="absolute right-3.5 top-3 w-4 h-4 text-zinc-500" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-500 font-bold mb-1 px-1">رقم الهاتف *</label>
              <div className="relative">
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="06XXXXXXXX أو 07XXXXXXXX"
                  required
                  className="w-full pl-3 pr-10 py-3 bg-zinc-950/50 border border-zinc-850 rounded-xl text-zinc-100 text-xs font-mono text-left focus:border-yellow-500/50 focus:outline-none transition-colors"
                  dir="ltr"
                />
                <Phone className="absolute right-3.5 top-3 w-4 h-4 text-zinc-500" />
              </div>
            </div>
          </div>

          <hr className="border-zinc-900" />

          {/* Section: Product Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-yellow-500" />
              2. تفاصيل الطلبية
            </h3>

            <div>
              <label className="block text-[10px] text-zinc-500 font-bold mb-1 px-1">المنتج المطلوب *</label>
              <input 
                type="text" 
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="اسم المنتج أو الطرد المطلوب"
                required
                className="w-full px-3.5 py-3 bg-zinc-950/50 border border-zinc-850 rounded-xl text-zinc-100 text-xs focus:border-yellow-500/50 focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[10px] text-zinc-500 font-bold mb-1 px-1">الكمية</label>
                <input 
                  type="number" 
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  required
                  className="w-full px-3 py-3 bg-zinc-950/50 border border-zinc-850 rounded-xl text-zinc-100 text-xs text-center font-mono focus:border-yellow-500/50 focus:outline-none transition-colors"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] text-zinc-500 font-bold mb-1 px-1">المقاس</label>
                <input 
                  type="text" 
                  value={productSize}
                  onChange={(e) => setProductSize(e.target.value)}
                  placeholder="مثال: XL"
                  className="w-full px-3 py-3 bg-zinc-950/50 border border-zinc-850 rounded-xl text-zinc-100 text-xs text-center focus:border-yellow-500/50 focus:outline-none transition-colors"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] text-zinc-500 font-bold mb-1 px-1">اللون</label>
                <input 
                  type="text" 
                  value={productColor}
                  onChange={(e) => setProductColor(e.target.value)}
                  placeholder="مثال: أسود"
                  className="w-full px-3 py-3 bg-zinc-950/50 border border-zinc-850 rounded-xl text-zinc-100 text-xs text-center focus:border-yellow-500/50 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <hr className="border-zinc-900" />

          {/* Section: Geographical dropdown block aligned with Yalidine */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-yellow-500" />
              3. عنوان الشحن والولاية
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-zinc-500 font-bold mb-1 px-1">الولاية *</label>
                <div className="relative">
                  <select 
                    value={selectedWilaya}
                    onChange={handleWilayaChange}
                    required
                    className="w-full pl-8 pr-3 py-3 bg-zinc-950/50 border border-zinc-850 rounded-xl text-zinc-200 text-xs focus:border-yellow-500/50 focus:outline-none transition-colors appearance-none cursor-pointer font-bold"
                  >
                    <option value="" disabled className="text-zinc-650">اختر الولاية</option>
                    {ALGERIA_68_WILAYAS.map(w => (
                      <option key={w.code} value={`${w.code} - ${w.nameAr}`} className="bg-[#050505] text-zinc-100 text-semibold">
                        {w.code} - {w.nameAr}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-2.5 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-500 font-bold mb-1 px-1">البلدية *</label>
                <div className="relative">
                  <select 
                    value={selectedCommune}
                    onChange={(e) => setSelectedCommune(e.target.value)}
                    required
                    disabled={!selectedWilaya}
                    className="w-full pl-8 pr-3 py-3 bg-zinc-950/50 border border-zinc-850 rounded-xl text-zinc-200 text-xs focus:border-yellow-500/50 focus:outline-none transition-colors appearance-none cursor-pointer font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled className="text-zinc-650">اختر البلدية</option>
                    {communesList.map((comm, idx) => (
                      <option key={idx} value={comm} className="bg-[#050505] text-zinc-100">
                        {comm}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-2.5 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Delivery Route Options */}
            <div>
              <label className="block text-[10px] text-zinc-500 font-bold mb-1.5 px-1">طريقة التوصلي المفضلّلة *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType("home")}
                  className={`py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${deliveryType === "home" ? "bg-white text-black border-white shadow-md font-extrabold" : "bg-zinc-950/50 border-zinc-850 text-zinc-400 hover:text-zinc-200"}`}
                >
                  <Smartphone className="w-4 h-4" />
                  شحن للمنزل
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType("desk")}
                  className={`py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${deliveryType === "desk" ? "bg-white text-black border-white shadow-md font-extrabold" : "bg-zinc-950/50 border-zinc-850 text-zinc-400 hover:text-zinc-200"}`}
                >
                  <Truck className="w-4 h-4" />
                  مكتب الشحن Desk
                </button>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-[10px] text-zinc-500 font-bold mb-1 px-1">ملاحظات إضافية للتاجر (اختياري)</label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="أخبرنا بأي متطلبات خاصة بالطلبية أو التوصيل..."
                rows={2}
                className="w-full px-3 py-2.5 bg-zinc-950/50 border border-zinc-850 rounded-xl text-zinc-100 text-xs focus:border-yellow-500/50 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 mt-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-extrabold text-xs tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-yellow-500/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                جاري تسجيل طلبك...
              </>
            ) : (
              <>
                تأكيد وإرسال الطلبية الآن ⚡
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Safety and Assurance Footer elements */}
      <div className="mt-6 flex items-center gap-2 text-[10px] text-zinc-500 max-w-md bg-zinc-950/30 px-4 py-2 rounded-full border border-zinc-950">
        <Shield className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
        <span>تأمين فوري وخاص لطلبيتك من خلال بروتوكول مشفر وحماية من عمليات الاحتيال.</span>
      </div>
    </div>
  );
}
