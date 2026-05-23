import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  ArrowLeft, Search, Map, CheckCircle2, MapPin, Percent, AlertTriangle, TrendingUp, Sparkles
} from "lucide-react";

export interface Wilaya {
  code: string;
  nameAr: string;
  nameFr: string;
  isDelegated?: boolean;
}

export const ALGERIA_68_WILAYAS: Wilaya[] = [
  { code: "01", nameAr: "أدرار", nameFr: "Adrar" },
  { code: "02", nameAr: "الشلف", nameFr: "Chlef" },
  { code: "03", nameAr: "الأغواط", nameFr: "Laghouat" },
  { code: "04", nameAr: "أم البواقي", nameFr: "Oum El Bouaghi" },
  { code: "05", nameAr: "باتنة", nameFr: "Batna" },
  { code: "06", nameAr: "بجاية", nameFr: "Béjaïa" },
  { code: "07", nameAr: "بسكرة", nameFr: "Biskra" },
  { code: "08", nameAr: "بشار", nameFr: "Béchar" },
  { code: "09", nameAr: "البليدة", nameFr: "Blida" },
  { code: "10", nameAr: "البويرة", nameFr: "Bouira" },
  { code: "11", nameAr: "تمنراست", nameFr: "Tamanrasset" },
  { code: "12", nameAr: "تبسة", nameFr: "Tébessa" },
  { code: "13", nameAr: "تلمسان", nameFr: "Tlemcen" },
  { code: "14", nameAr: "تيارت", nameFr: "Tiaret" },
  { code: "15", nameAr: "تيزي وزو", nameFr: "Tizi Ouzou" },
  { code: "16", nameAr: "الجزائر", nameFr: "Alger" },
  { code: "17", nameAr: "الجلفة", nameFr: "Djelfa" },
  { code: "18", nameAr: "جيجل", nameFr: "Jijel" },
  { code: "19", nameAr: "سطيف", nameFr: "Sétif" },
  { code: "20", nameAr: "سعيدة", nameFr: "Saïda" },
  { code: "21", nameAr: "سكيكدة", nameFr: "Skikda" },
  { code: "22", nameAr: "سيدي بلعباس", nameFr: "Sidi Bel Abbès" },
  { code: "23", nameAr: "عنابة", nameFr: "Annaba" },
  { code: "24", nameAr: "قالمة", nameFr: "Guelma" },
  { code: "25", nameAr: "قسنطينة", nameFr: "Constantine" },
  { code: "26", nameAr: "المدية", nameFr: "Médéa" },
  { code: "27", nameAr: "مستغانم", nameFr: "Mostaganem" },
  { code: "28", nameAr: "المسيلة", nameFr: "M'Sila" },
  { code: "29", nameAr: "معسكر", nameFr: "Mascara" },
  { code: "30", nameAr: "ورقلة", nameFr: "Ouargla" },
  { code: "31", nameAr: "وهران", nameFr: "Oran" },
  { code: "32", nameAr: "البيض", nameFr: "El Bayadh" },
  { code: "33", nameAr: "إيليزي", nameFr: "Illizi" },
  { code: "34", nameAr: "برج بوعريريج", nameFr: "Bordj Bou Arréridj" },
  { code: "35", nameAr: "بومرداس", nameFr: "Boumerdès" },
  { code: "36", nameAr: "الطارف", nameFr: "El Tarf" },
  { code: "37", nameAr: "تندوف", nameFr: "Tindouf" },
  { code: "38", nameAr: "تيسمسيلت", nameFr: "Tissemsilt" },
  { code: "39", nameAr: "الوادي", nameFr: "El Oued" },
  { code: "40", nameAr: "خنشلة", nameFr: "Khenchela" },
  { code: "41", nameAr: "سوق أهراس", nameFr: "Souk Ahras" },
  { code: "42", nameAr: "تيبازة", nameFr: "Tipaza" },
  { code: "43", nameAr: "ميلة", nameFr: "Mila" },
  { code: "44", nameAr: "عين الدفلى", nameFr: "Aïn Defla" },
  { code: "45", nameAr: "النعامة", nameFr: "Naâma" },
  { code: "46", nameAr: "عين تموشنت", nameFr: "Aïn Témouchent" },
  { code: "47", nameAr: "غرداية", nameFr: "Ghardaïa" },
  { code: "48", nameAr: "غليزان", nameFr: "Relizane" },
  { code: "49", nameAr: "المغير", nameFr: "El M'Ghair" },
  { code: "50", nameAr: "المنيعة", nameFr: "El Meniaa" },
  { code: "51", nameAr: "أولاد جلال", nameFr: "Ouled Djellal" },
  { code: "52", nameAr: "برج باجي مختار", nameFr: "Bordj Baji Mokhtar" },
  { code: "53", nameAr: "بني عباس", nameFr: "Béni Abbès" },
  { code: "54", nameAr: "تيميمون", nameFr: "Timimoun" },
  { code: "55", nameAr: "تقرت", nameFr: "Touggourt" },
  { code: "56", nameAr: "جانت", nameFr: "Djanet" },
  { code: "57", nameAr: "عين صالح", nameFr: "In Salah" },
  { code: "58", nameAr: "عين قزام", nameFr: "In Guezzam" },
  // 10 Delegated Wilayas of standard administrative expansion (making a total of 68)
  { code: "59", nameAr: "أفلو", nameFr: "Aflou", isDelegated: true },
  { code: "60", nameAr: "بريكة", nameFr: "Barika", isDelegated: true },
  { code: "61", nameAr: "قصر الشلالة", nameFr: "Ksar Chellala", isDelegated: true },
  { code: "62", nameAr: "مسعد", nameFr: "Messaad", isDelegated: true },
  { code: "63", nameAr: "العلمة", nameFr: "El Eulma", isDelegated: true },
  { code: "64", nameAr: "بوسعادة", nameFr: "Boussaâda", isDelegated: true },
  { code: "65", nameAr: "طولقة", nameFr: "Tolga", isDelegated: true },
  { code: "66", nameAr: "عين وسارة", nameFr: "Ain Oussera", isDelegated: true },
  { code: "67", nameAr: "تزمالت", nameFr: "Tazmalt", isDelegated: true },
  { code: "68", nameAr: "شلغوم العيد", nameFr: "Chelghoum Laïd", isDelegated: true },
];

// Robust Normalizer matching misspelled, Arabic or French words dynamically to Algerian Wilaya Codes "01"-"68"
export function getWilayaCode(input: string): string | null {
  if (!input) return null;
  const cleaned = input.trim().toLowerCase().replace(/[.\-\s_']+/g, "");
  
  // Clean prefix "al-" or "el-" if it doesn't break root words
  let cleanAr = input.trim().replace(/^ولاية\s+/i, "").replace(/^ال(?=[^أإا])/i, "").trim();
  const cleanArNoSpace = cleanAr.replace(/\s+/g, "");

  if (/^\d+$/.test(cleaned)) {
    const num = parseInt(cleaned, 10);
    if (num >= 1 && num <= 68) {
      return num.toString().padStart(2, "0");
    }
  }

  const codeMapping: { [key: string]: string[] } = {
    "01": ["adrar", "أدرار", "ادرار"],
    "02": ["chlef", "الشلف", "شلف"],
    "03": ["laghouat", "الأغواط", "أغواط", "الاقواط", "اقواط"],
    "04": ["oumelbouaghi", "أم البواقي", "ام البواقي", "أمبواقي"],
    "05": ["batna", "باتنة", "باتنه"],
    "06": ["bejaia", "بجاية", "بجايه"],
    "07": ["biskra", "بسكرة", "بسكره"],
    "08": ["bechar", "بشار"],
    "09": ["blida", "البليدة", "بليدة", "بليده"],
    "10": ["bouira", "البويرة", "بويرة", "بويره"],
    "11": ["tamanrasset", "تمنراست", "تمنرست"],
    "12": ["tebessa", "تبسة", "تبسه"],
    "13": ["tlemcen", "تلمسان"],
    "14": ["tiaret", "تيارت"],
    "15": ["tiziouzou", "تيزي وزو", "تيزيوزو", "تيزي"],
    "16": ["alger", "algiers", "algerie", "algeria", "الجزائر", "العاصمة", "الجزائر العاصمة"],
    "17": ["djelfa", "jelfa", "jalfa", "الجلفة", "جلفة", "جلفه"],
    "18": ["jijel", "جيجل"],
    "19": ["setif", "سطيف"],
    "20": ["saida", "سعيدة", "سعيده"],
    "21": ["skikda", "سكيكدة", "سكيكده"],
    "22": ["sidibelabbes", "sidibelabbès", "بلعباس", "سيدي بلعباس", "سيدي بلعباس"],
    "23": ["annaba", "عنابة", "عنابه"],
    "24": ["guelma", "قالمة", "قالمه"],
    "25": ["constantine", "قسنطينة", "قسنطينه"],
    "26": ["medea", "المدية", "مدية", "مديه"],
    "27": ["mostaganem", "مستغانم", "مستغنام"],
    "28": ["msila", "المسيلة", "مسيلة", "مسيله"],
    "29": ["mascara", "معسكر"],
    "30": ["ouargla", "ورقلة", "ورقله"],
    "31": ["oran", "ohran", "orane", "وهران", "وهرن"],
    "32": ["elbayadh", "البيض", "بيض"],
    "33": ["illizi", "إيليزي", "ايليزي"],
    "34": ["bordjbouarreridj", "برج بوعريريج", "ببا"],
    "35": ["boumerdes", "بومرداس"],
    "36": ["eltarf", "الطارف", "طارف"],
    "37": ["tindouf", "تندوف"],
    "38": ["tissemsilt", "تيسمسيلت"],
    "39": ["eloued", "الوادي", "واد سوف", "سوف"],
    "40": ["khenchela", "خنشلة", "خنشله"],
    "41": ["soukahras", "سوق أهراس", "سوق اهراس"],
    "42": ["tipaza", "تيبازة", "تيبازه"],
    "43": ["mila", "ميلة", "ميله"],
    "44": ["aindefla", "عين الدفلى", "عين الدفلي"],
    "45": ["naama", "النعامة", "نعامة", "نعامه"],
    "46": ["aintemouchent", "عين تموشنت", "تموشنت"],
    "47": ["ghardaia", "غرداية", "غردايه"],
    "48": ["relizane", "غليزان"],
    "49": ["elmghair", "المغير", "مغير"],
    "50": ["elmeniaa", "المنيعة", "منيعة", "منيعه"],
    "51": ["ouleddjellal", "أولاد جلال", "اولاد جلال"],
    "52": ["bordjbajimokhtar", "برج باجي مختار"],
    "53": ["beniabbes", "بني عباس"],
    "54": ["timimoun", "تيميمون"],
    "55": ["touggourt", "تقرت"],
    "56": ["djanet", "جانت"],
    "57": ["insalah", "عين صالح"],
    "58": ["inguezzam", "عين قزام"],
    "59": ["aflou", "أفلو", "افلو"],
    "60": ["barika", "بريكة", "بريكه"],
    "61": ["ksarchellala", "قصر الشلالة"],
    "62": ["messaad", "مسعد"],
    "63": ["eleulma", "العلمة", "العلمه", "علمة"],
    "64": ["boussaada", "بوسعادة", "بوسعده"],
    "65": ["tolga", "طولقة", "طولقه"],
    "66": ["ainoussera", "عين وسارة", "عين وساره"],
    "67": ["tazmalt", "تزمالت"],
    "68": ["chelghoumlaid", "شلغوم العيد"]
  };

  // Direct exact match
  for (const [code, variants] of Object.entries(codeMapping)) {
    for (const variant of variants) {
      const vCleaned = variant.toLowerCase().replace(/[.\-\s_']+/g, "");
      if (cleaned === vCleaned || cleanArNoSpace === vCleaned || input.trim().toLowerCase() === variant.toLowerCase()) {
        return code;
      }
    }
  }

  // Fallback containing match
  for (const [code, variants] of Object.entries(codeMapping)) {
    for (const variant of variants) {
      const vCleaned = variant.toLowerCase().replace(/[.\-\s_']+/g, "");
      if (cleaned.includes(vCleaned) || vCleaned.includes(cleaned) || cleanArNoSpace.includes(vCleaned) || vCleaned.includes(cleanArNoSpace)) {
        return code;
      }
    }
  }

  return null;
}

export default function WilayasList({ setScreen, t, isRtl, ordersHistory = [] }: any) {
  const [searchQuery, setSearchQuery] = useState("");

  const getLabel = (ar: string, fr: string, en: string) => {
    const isArLang = t.total_orders === "إجمالي الطلبات";
    const isFrLang = t.total_orders === "Total Commandes";
    if (isArLang) return ar;
    if (isFrLang) return fr;
    return en;
  };

  const isAr = t.total_orders === "إجمالي الطلبات";
  const isFr = t.total_orders === "Total Commandes";

  // Aggregate statistics based on robust code mapper
  const totalOrdersCount = ordersHistory.length;
  
  // Map orders to their respective standard Wilaya code
  const statsByCode: { 
    [code: string]: { 
      total: number; 
      delivered: number; 
      returned: number; 
      pending: number; 
      confirmed: number;
    } 
  } = {};

  // Initialize for all 68 codes
  ALGERIA_68_WILAYAS.forEach((w) => {
    statsByCode[w.code] = { total: 0, delivered: 0, returned: 0, pending: 0, confirmed: 0 };
  });

  ordersHistory.forEach((o: any) => {
    const code = getWilayaCode(o.wilaya);
    if (code && statsByCode[code]) {
      statsByCode[code].total += 1;
      if (o.status === "delivered") statsByCode[code].delivered += 1;
      else if (o.status === "returned") statsByCode[code].returned += 1;
      else if (o.status === "pending") statsByCode[code].pending += 1;
      else if (o.status === "confirmed") statsByCode[code].confirmed += 1;
    }
  });

  // Calculate top requested wilayas based on mapped statistics
  const mappedTopWilayasList = Object.entries(statsByCode)
    .filter(([_, data]) => data.total > 0)
    .map(([code, data]) => {
      const wilayaDef = ALGERIA_68_WILAYAS.find((w) => w.code === code);
      return {
        code,
        nameFr: wilayaDef?.nameFr || `Wilaya ${code}`,
        nameAr: wilayaDef?.nameAr || `ولاية ${code}`,
        total: data.total,
        delivered: data.delivered,
        returned: data.returned,
        pending: data.pending,
        successRate: data.total > 0 ? Math.round((data.delivered / data.total) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const filteredWilayas = ALGERIA_68_WILAYAS.filter((w) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      w.code.includes(query) ||
      w.nameAr.includes(query) ||
      w.nameFr.toLowerCase().includes(query)
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6"
    >
      {/* Header section with back button */}
      <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 backdrop-blur-md">
        <button
          onClick={() => setScreen("dashboard")}
          className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors flex items-center justify-center"
        >
          <ArrowLeft className={`w-5 h-5 ${isRtl ? "rotate-180" : ""}`} />
        </button>
        <div className="text-center flex-1">
          <h2 className="text-sm font-bold text-zinc-100 flex items-center justify-center gap-2">
            <Map className="w-4 h-4 text-yellow-500 animate-bounce" />
            {getLabel("تحليل فرز الولايات والجغرافيا (68 ولاية)", "Analyse géographique des 68 Wilayas", "Geographical Analysis of 68 Wilayas")}
          </h2>
          <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
            {getLabel(
              "نظام الفرز التلقائي لجميع الاسماء واللغات المكتوبة في الطلبات وتوجيهها للمكان الصحيح",
              "Système de routage intelligent et normalisation des saisies multilingues de commandes",
              "Smart translation routing & geographical order volume consolidation"
            )}
          </p>
        </div>
      </div>

      {/* TOP GEOGRAPHICAL & PERFORMANCE ANALYTICAL SUMMARY PANEL */}
      {mappedTopWilayasList.length > 0 && (
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h3 className="text-[11px] font-bold text-yellow-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {getLabel("الولايات الأكثر طلباً والفرز التلقائي", "Wilayas les Plus Demandées (Routées)", "Top Consolidated Orders by Wilaya")}
            </h3>
            <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {mappedTopWilayasList.length} {getLabel("نشطة", "actives", "active")}
            </span>
          </div>

          <div className="space-y-3">
            {mappedTopWilayasList.slice(0, 4).map((wil, idx) => {
              const percentageOfAll = totalOrdersCount > 0 ? Math.round((wil.total / totalOrdersCount) * 100) : 0;
              const hasDelivered = wil.delivered > 0;
              
              return (
                <div key={wil.code} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">
                      {idx + 1}. {wil.nameFr} <span className="text-[10px] font-mono text-zinc-500">[{wil.code}]</span>
                    </span>
                    <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-1.5">
                      <span className="font-bold text-zinc-100">{wil.total} {getLabel("طَلَبْ", "CMD", "orders")}</span>
                      <span>({percentageOfAll}%)</span>
                      {hasDelivered && (
                        <span className="text-green-400 font-sans font-semibold">
                          • {wil.successRate}% {getLabel("توصيل ناجح", "livré", "delivered")}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800/50 rounded-full overflow-hidden flex">
                    <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${percentageOfAll}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Intelligent AI Performance Insight widget based on actual mapped orders */}
          <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-3">
            <h4 className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {getLabel("التحليل الذكي للولايات الأكثر طلباً وتصحيح العناوين", "Insight d'analyse & correction géographique auto", "Address Correction & Performance Insights")}
            </h4>
            <p className="text-[10px] text-zinc-400 leading-relaxed font-sans select-text">
              {(() => {
                const topWilaya = mappedTopWilayasList[0];
                const topPct = totalOrdersCount > 0 ? Math.round((topWilaya.total / totalOrdersCount) * 100) : 0;
                const topName = topWilaya.nameFr;

                const hasReturned = mappedTopWilayasList.find((w) => w.returned > 0);

                if (isAr) {
                  let text = `يتعرف النظام بنجاح على التسميات المختلفة (مثل وهران، oran، ohran، جلفة، djelfa) ويوجهها بالكامل للولاية الصحيحة. وتتصدر ولاية ${topName} الصدارة لشركتك بنسبة ${topPct}%. `;
                  if (hasReturned) {
                    text += `تنبيه: تم تسجيل حالات مرتجعات لولاية ${hasReturned.nameFr}. ننصحك بتفعيل تأكيد الطلبية هاتفياً قبل التسليم لشركة الشحن لتقليل نسبة المرتجعات وتفادي الخسائر المادية للجغرافيا المحددة.`;
                  } else {
                    text += `القناة اللوجستية تسجل كفاءة متمتازة وخالية تماماً من المرتجعات في نطاق الولايات النشطة مبيعاً حالياً.`;
                  }
                  return text;
                } else if (isFr) {
                  let text = `Le système regroupe intelligemment les variantes de saisie (oran, ohran, jelfa, jalfa...) vers les codes officiels. La wilaya de ${topName} domine votre activité à ${topPct}%. `;
                  if (hasReturned) {
                    text += `Alerte: Des retours de colis sont signalés à ${hasReturned.nameFr}. Pensez à sécuriser vos envois par double-validation téléphonique afin de maximiser le taux de livraison réussie.`;
                  } else {
                    text += `Vos axes de distribution prioritaires maintiennent des performances saines sans retours notables enregistrés.`;
                  }
                  return text;
                } else {
                  let text = `The system automatically routes varied inputs (including ohran, orane, jalfa, jelfa) to official codes. ${topName} stands as your primary hub, accounting for ${topPct}% of orders. `;
                  if (hasReturned) {
                    text += `Warning: Returns observed in ${hasReturned.nameFr}. Implement phone validations prior to dispatch to safeguard conversion standards.`;
                  } else {
                    text += `Healthy logistics pipeline with absolute zero returns detected across the busiest shipping regions.`;
                  }
                  return text;
                }
              })()}
            </p>
          </div>
        </div>
      )}

      {/* Modern High-contrast search box */}
      <div className="relative">
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={getLabel("البحث باسم الولاية أو رقمها...", "Rechercher une wilaya...", "Search by name or code...")}
          className="w-full h-12 pr-10 pl-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all font-sans"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 hover:text-zinc-300 text-xs"
          >
            {getLabel("مسح", "Effacer", "Clear")}
          </button>
        )}
      </div>

      {/* Responsive Grid list of Wilayas */}
      {filteredWilayas.length === 0 ? (
        <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl py-12 text-center text-zinc-600">
          <Map className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">{getLabel("لم يتم العثور على أي نتائج", "Aucune wilaya trouvée", "No wilayas found")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {filteredWilayas.map((wilaya) => {
            const stats = statsByCode[wilaya.code] || { total: 0, delivered: 0, returned: 0, pending: 0, confirmed: 0 };
            const count = stats.total;
            const percentageOfAll = totalOrdersCount > 0 ? Math.round((count / totalOrdersCount) * 100) : 0;
            const hasstats = count > 0;
            const successRate = count > 0 ? Math.round((stats.delivered / count) * 100) : 0;

            return (
              <motion.div
                layout
                key={wilaya.code}
                className={`border rounded-2xl p-3.5 flex items-center justify-between group transition-all ${
                  hasstats 
                    ? "bg-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/60 shadow-md" 
                    : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-lg border text-xs font-mono font-bold flex items-center justify-center transition-colors ${
                    hasstats 
                      ? "bg-yellow-500/10 border-yellow-500/35 text-yellow-500" 
                      : "bg-zinc-850 border-zinc-800/85 text-zinc-300"
                  }`}>
                    {wilaya.code}
                  </span>
                  <div className="text-left">
                    <span className="block text-sm font-bold text-zinc-100 font-sans tracking-tight">
                      {wilaya.nameFr}
                    </span>
                    <span className="block text-[9px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wider">
                      {wilaya.isDelegated
                        ? getLabel("ولاية منتدبة", "Wilaya Déléguée", "Delegated Wilaya")
                        : getLabel("ولاية رسمية", "Wilaya Officielle", "Official Wilaya")}
                    </span>
                  </div>
                </div>

                {/* Show dynamic compiled order volumes matched directly into their correct places */}
                {hasstats && (
                  <div className="text-right flex flex-col items-end gap-0.5">
                    <span className="text-[11px] font-bold text-yellow-500 font-mono bg-yellow-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <span>{count}</span>
                      <span>{getLabel("طَلَبْ", "CMD", "orders")}</span>
                    </span>
                    {stats.delivered > 0 && (
                      <span className="text-[9px] text-green-400 font-sans font-semibold">
                        {successRate}% {getLabel("نجاح", "livré", "delivered")}
                      </span>
                    )}
                    {stats.returned > 0 && (
                      <span className="text-[9px] text-red-400 font-sans">
                        {stats.returned} {getLabel("مرتجع", "retour", "returned")}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Info footer */}
      <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-4 flex items-start gap-3">
        <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
          {getLabel(
            "ترميز موحد وتقاطعات ذكية: تتبع المنصة خوارزمية جغرافية شاملة لمختلف اللغات واللهجات لضمان الفرز الصحيح لأي اسم ولاية يتم إنتاجه بواسطة الذكاء الاصطناعي وتأمينه إلى الكود الرسمي لتفادي الأخطاء اللوجستية.",
            "Normalisation et indexation multilingue : Le système utilise un algorithme de correspondance phonétique et textuel robuste pour fusionner les saisies divergentes sous les codes officiels des 68 Wilayas d'Algérie.",
            "Multi-language geographical alignment: System normalizes speech and spelling variances automatically into unified standard shipping vectors."
          )}
        </p>
      </div>
    </motion.div>
  );
}
