# SmartyAi order AI ⚡

**SmartyAi order** هو مساعدك الذكي لإدارة وتفكيك طلبات انستغرام وشبكة التواصل الاجتماعي باستخدام الذكاء الاصطناعي، مصمم خصيصاً للتجار في الجزائر.

---

## 🚀 ما هو SmartyAi order؟
يقوم التطبيق بتحويل رسائل الزبائن (حتى بالدارجة الجزائرية) إلى بيانات منظمة وجاهزة للشحن في ثوانٍ معدودة. يساعدك على:
- **توفير الوقت**: لا مزيد من نقل البيانات يدوياً.
- **تقليل الأخطاء**: كشف تلقائي للهواتف الناقصة والعناوين غير الواضحة.
- **الفرز الجغرافي الذكي (68 ولاية)**: نظام مدمج وقوي يقوم بالتعرف وتصحيح أسماء الولايات بمختلف أشكال كتابتها (مثل *Oran, وهران, ohran, Djelfa, جلفة, jalfa*) وربطها تلقائياً بالترميز الإداري الرسمي والبلديات لمتابعة إحصائيات المبيعات، نسب التسليم والجاهزية الجغرافية بدقة.
- **الفلترة والتصفية التفاعلية**: واجهة تفاعلية تمكنك بمجرد النقر على أي بطاقة إحصائية في لوحة التحكم (المعلقة، المستلمة، المرتجعة، إلخ) من استعراض كافة الطلبات المرتبطة بها فوراً والبحث المباشر داخلها.
- **التوسع والتكامل اللوجستي**: ربط مباشر مع شركات التوصيل الكبرى في الجزائر (Yalidine, ZR Express, etc.) مع نظام متكامل لتتبع المرتجعات تلقائياً.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

### الواجهة الأمامية (Frontend)
- **React 19**: لإطار العمل.
- **Tailwind CSS 4**: للتصميم السريع والمتجاوب.
- **Motion/React**: للتحركات والأنيميشن السلسة.
- **Lucide React**: لمجموعة الأيقونات.
- **Firebase Auth & Firestore**: لإدارة المستخدمين وقاعدة البيانات اللحظية.

### الخلفية (Backend)
- **Node.js & Express**: لبناء الـ API.
- **Google Gemini API (@google/genai)**: العقل المدبر لتفكيك المحادثات وفهم الدارجة وتصحيح العناوين.
- **Firebase Admin SDK**: للعمليات المتقدمة في قاعدة البيانات.
- **Esbuild**: لتجميع وبرمجة الخادم.

---

## 📖 طريقة الاستخدام

1. **تسجيل الدخول**: استخدم حساب Google الخاص بك للولوج.
2. **لصق الرسالة**: انسخ رسالة الزبون من Messenger أو Instagram والصقها في خانة "طلب جديد".
3. **تفكيك الطلب**: اضغط على "تفكيك الطلب بالذكاء الاصطناعي ⚡".
4. **المراجعة والتحقق الجغرافي**: سيقوم التطبيق بملء البيانات وتسمية الولاية الرسمية والمنتدبة تلقائياً بفضل خوارزمية التطابق الفونيتيكي واللفظي.
5. **لوحة التحكم التفاعلية**: اضغط على الإحصائيات (مثل "طلبيات معلقة" أو "مرتجع") لتصفية الطلبات والوصول السريع للمشترين.
6. **الحفظ والشحن**: احفظ الطلب ومتابعة التوصيل بضغط زر في الإعدادات.

---

## ⚙️ طريقة التشغيل (للمطورين)

### المتطلبات
- Node.js (إصدار 18 أو أحدث)
- حساب Firebase ومفاتيح API لـ Google Gemini.

### الخطوات
1. **تثبيت الملحقات**:
   ```bash
   npm install
   ```
2. **إعداد المتغيرات البيئية**: قم بإنشاء ملف `.env` وقم بضبط القيم المطلوبة (Gemini API Key, Firebase Config).
3. **التشغيل في بيئة التطوير**:
   ```bash
   npm run dev
   ```
4. **البناء للإنتاج**:
   ```bash
   npm run build
   ```
5. **التشغيل**:
   ```bash
   npm start
   ```

---

## 📊 الباقات والاشتراك
- **الباقة المجانية**: 30 طلبية مجانية شهرياً.
- **الباقة الاحترافية (Pro)**: 350 طلبية + ربط شركات التوصيل.
- **الباقة غير المحدودة**: طلبات غير محدودة + دعم فني خاص.

---

## 🔒 الأمان
مفاتيح الـ API الخاصة بشركات التوصيل يتم تشفيرها وحفظها في الخادم، ولا يتم عرضها أبداً في المتصفح، مما يضمن أمان حساباتك وتجارتك.

---

## 👨‍💻 البرمجة
تم تطوير هذا التطبيق باستخدام أحدث معايير الويب لضمان السرعة، الأمان، وسهولة التوسع في المستقبل.

---

# SmartyAi order AI ⚡ (English Version)

**SmartyAi order** is your smart assistant for managing and extracting Instagram and social media orders using AI, specifically designed for Algerian merchants.

## 🚀 Features
- **AI Extraction**: Converts customer chat (including Algerian slang) into structured data.
- **Smart 68 Wilayas Alignment**: Automatically translates, detects, and consolidates phonetic/spelling variations (e.g., *Oran, ohran, Djelfa, jalfa*) into standard Algerian administrative codes on a dedicated statistical board.
- **Interactive Drill-Downs**: Click any status counter (Awaiting, Delivered, Pending, Returned) on the main dashboard to immediately display and search targeted orders in-place.
- **Carrier Integration**: Connects with Yalidine, ZR Express, and more with integrated **Returns** pipeline analytics (replacing colloquial slang with clean standard tags).
- **Anti-Fraud & Quality Controls**: Identifies suspicious telephone profiles and incomplete forms.

## 🛠️ Tech Stack
- **Frontend**: React 19, Tailwind CSS 4, Motion, Firebase Auth/Firestore.
- **Backend**: Node.js, Express, Google Gemini AI, Firebase Admin.

## ⚙️ Setup
1. Clone the repo.
2. Run `npm install`.
3. Configure `.env` with Gemini and Firebase keys.
4. Run `npm run dev` to start developing.

---
*SmartyAi order AI • THE LUXURY SUITE*
