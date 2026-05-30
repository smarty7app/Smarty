# SmartyAi order AI ⚡

**SmartyAi order** هو مساعدك الذكي المتكامل لإدارة وتفكيك طلبات انستغرام وشبكات التواصل الاجتماعي باستخدام الذكاء الاصطناعي، مصمم خصيصاً للتجار والمنصات التجارية في الجزائر. يحل مشكلة نسخ ولصق التفاصيل المتعددة ويسرّع وتيرة العمل اليومي بفعالية احترافية.

---

## 🚀 ما هو SmartyAi order؟
يقوم التطبيق بتحويل رسائل الزبائن العشوائية (حتى المكتوبة بالدارجة الجزائرية) إلى بيانات منظمة ومفصلة وجاهزة للشحن في ثوانٍ معدودة. يساعدك على:
- **توفير الوقت**: يقلل وقت معالجة الطلب الواحد من 3 دقائق من النسخ واللصق اليدوي للتفاصيل الخمسة (الاسم، الهاتف، الولاية، البلدية، والمنتج) إلى ثانيتين فحسب.
- **التمرير السلس اللانهائي (Infinite Scrolling)**: تصفح سلس وسريع لتاريخ الطلبيات الطويل، والطلبات المصفاة، وقائمة أرشيف الملصقات الحية بفضل نظام التمرير اللانهائي المعتمد على تقنية `IntersectionObserver` الحديثة، مما يتيح تصفح آلاف السجلات بكفاءة وسرعة فائقة دون تجميد الواجهة.
- **التحذير الاستباقي المتكامل**: نظام ذكي يحذرك مسبقاً من الأرقام الخاطئة، والولايات الخاطئة، والبلديات غير المتطابقة، وحتى معلومات الطلبية الناقصة أو المفقودة، مما يقلل نسبة الأخطاء البشرية بالولايات بنسبة تقارب 99%.
- **التحقق الصارم من رقم الهاتف (Strict Phone Validation)**: نظام حماية ذكي في استمارة الزبون العامة يمنع إرسال النموذج إذا كان رقم الهاتف لا يتكون من 10 أرقام تماماً أو لا يبدأ بـ (05 أو 06 أو 07)، مع إظهار رسالة خطأ ديناميكية تفاعلية لمنع الطلبيات الوهمية أو المدخلة بشكل خاطئ.
- **تخصيص وتتبع لحظي لوقت الطلب (Chrono-Order Tracking)**: إطار زمني دقيق لكل طلبية بالدقيقة والثانية مع إمكانية تعديله بدقة لتسهيل تخطيط وجدولة تواصل الشحن والطلبات. تظهر الساعة والتاريخ منسقة تلقائياً حسب تفضيل لغة واجهتك.
- **تحسين وتوافق كامل مع شاشات الحاسوب واللوحيات (Desktop-Optimized Fluid UI)**: واجهة مستخدم تفاعلية متطورة للغاية على الشاشات الكبيرة مقسمة بنظام البطاقات المنبثقة Bento-style وأعمدة الشحن الثنائية جنبًا إلى جنب، لتصفح مريح وأكثر فاعلية للمهام اليومية المتكررة.
- **الفرز الجغرافي الذكي (68 ولاية)**: نظام مدمج وقوي يقوم بالتعرف وتصحيح أسماء الولايات بمختلف أشكال كتابتها (مثل *Oran, وهران, ohran, Djelfa, جلفة, jalfa*) وربطها تلقائياً بالترميز الإداري الرسمي والبلديات لمتابعة إحصائيات المبيعات، نسب التسليم والجاهزية الجغرافية بدقة مع تحويل العناوين بشكل ديناميكي لتتوافق مع معايير الـ API الخاصة بشركات التوصيل.
- **الفلترة والتصفية التفاعلية**: واجهة تفاعلية تمكنك بمجرد النقر على أي بطاقة إحصائية في لوحة التحكم (المعلقة، المستلمة، المرتجعة، إلخ) من استعراض كافة الطلبات المرتبطة بها فوراً والبحث المباشر داخلها.
- **مرونة ومزامنة الشركات المتعددة (Multi-Carrier Bulk Dispatcher)**: لوحة شحن جماعية مدمجة ومتقدمة تمكّن التاجر من تحديد حزمة طلبيات معلقة واختيار شركة التوصيل المستهدفة (مثل Yalidine, ZR Express, Maystro, EcoTrack, Anderson) عبر قائمة منسدلة ديناميكية، ليتم إرسالها وإقرانها بضغطة زر واحدة.
- **جلب ديناميكي آمن لمفاتيح الـ Live API**: يقوم نظام الخادم في الخلفية تلقائياً بقراءة ومطابقة مفاتيح الـ API المشفرة والمؤمنة الخاصة بالشركة المحددة لكل تاجر من وثيقة الإعدادات الخاصة به في Firestore عند معالجة الشحن، مِمَّا يضمن خصوصية مطلقة وأماناً متناهياً.
- **معالجة الحزم المقاومة للفشل (Fail-Safe Batching)**: يتعامل الخادم مع كل طلبية في دفعة الشحن بشكل فردي ومستقل تماماً؛ حيث يتم تأكيد الطلبيات الناجحة وتزويدها بتتبع حقيقي فوري، بينما تبقى الطلبيات الفاشلة معلّقة (Pending) مع توضيح وعرض تفصيلي لسبب الفشل (Dispatch Error) مباشرة بجانب الطلبية في واجهة التاجر لتمكينه من تعديل التنسيقات وإعادة المحاولة بيسر.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

### الواجهة الأمامية (Frontend)
- **React 19**: لبناء واجهة المستخدم كـ Single Page Application عالية الأداء.
- **Tailwind CSS 4**: للتصميم العصري المتجاوب ذي التفاصيل الدقيقة وحسابات الحشو السلسة.
- **Motion/React**: للتحركات والأنيميشن التفاعلية الصديقة للمستخدم.
- **Lucide React**: لمجموعة الأيقونات الرشيقة والمتسقة بصرياً.
- **Firebase Auth & Firestore**: للمزامنة الفورية وإدارة شؤون الدخول والأمان والمجموعات.

### الخلفية (Backend)
- **Node.js & Express**: خادم خفيف لبناء واجهات الـ APIs والتحكم بطلبات الشحن الجماعي.
- **Google Gemini API (@google/genai)**: العقل المدبر ومحرك تفكيك المحادثات لفهم الدارجة الجزائرية واستخلاص معلومات الزبائن الجغرافية وتصحيحها بدقة متناهية.
- **Firebase Admin SDK**: للتكامل مع قاعدة بيانات السحاب وصيانة الهياكل والتراخيص.
- **Esbuild**: معالج تجميع الخادم وبنائه في حزمة CJS أحادية متكاملة لزيادة الكفاءة والسرعة.

---

## 📖 طريقة الاستخدام

1. **تسجيل الدخول**: استخدم حساب Google الخاص بك للولوج الآمن واللحظي.
2. **لصق الرسالة العشوائية**: انسخ نصوص ورسائل الزبائن مباشرة من Messenger أو Instagram أو WhatsApp والصقها في خانة "طلب جديد".
3. **التفكيك والتحليل الذكي**: بضغط زر واحدة "تفكيك الطلب بالذكاء الاصطناعي ⚡"، يقوم المساعد بفصل الاسم بذكاء، والهاتف، والولاية، والبلدية، والمنتج.
4. **المراجعة والتحقق الجغرافي**: يعالج النظام أسماء الولايات ويقترح البلديات المتطابقة فونيتيكياً لمنع وقوع الشحنات في الوجهات الخاطئة.
5. **لوحة التحكم والتمرير السلس**: تتبع نمو تجارتك في لوحة متكاملة تدعم الفلترة وحملات الشحن مع ميزة **التمرير اللانهائي** التي تغنيك عن التصفح التقليدي البطيء.
6. **الشحن الجماعي بضغطة زر**: اختر الطلبات المرغوبة، اختر شركة التوصيل المحددة، ثم اشحنها في حزمة واحدة وتتبع المستجدات مباشرة.

---

## ⚙️ طريقة التشغيل (للمطورين)

### المتطلبات
- Node.js (إصدار 18 أو أحدث)
- حساب Firebase مهيأ ومفاتيح API لـ Google Gemini.

### خطوات الإعداد والتشغيل
1. **تثبيت الملحقات والاعتمادات**:
   ```bash
   npm install
   ```
2. **إعداد المتغيرات البيئية**: قم بإنشاء ملف `.env` وقم بضبط القيم المطلوبة (متغيرات Firebase الـ Client والـ Admin، ومفتاح Gemini API للذكاء الاصطناعي). انظر `.env.example`.
3. **التشغيل في بيئة التطوير المحلية**:
   ```bash
   npm run dev
   ```
4. **البناء والتجميع للإنتاج**:
   ```bash
   npm run build
   ```
5. **بدء تشغيل السيرفر المجمع**:
   ```bash
   npm start
   ```

---

## 📊 الباقات والاشتراك
- **الباقة المجانية**: 30 طلبية مجانية شهرياً لتجربة المزايا والبدء بالتبسيط.
- **الباقة الاحترافية (Pro)**: 350 طلبية شهرياً مع شراكات وتوصيلات API متكاملة.
- **الباقة غير المحدودة**: طلبات ومعالجات مفتوحة بدعم متواصل وبنية تحتية مخصصة.

---

## 🔒 الأمان وتأمين مفاتيح التوصيل
لحماية خصوصيتك ومنع تسرب بيانات حساباتك، يتم حفظ ومطابقت جميع مفاتيح الـ API الخاصة بشركات الشحن (Yalidine و ZR Express وغيرهما) مشفرة ومحفوظة ضمن قاعدة بيانات Firestore السحابية المؤمنة وتتم معالجتها بالكامل في بيئة الخادم (Server-Side Execution)، مما يمنع تمريرها أو كشفها لمتصفح العميل نهائياً.

---

# SmartyAi order AI ⚡ (English Version)

**SmartyAi order** is your all-in-one suite for managing and extracting Instagram and social media customer inquiries with the speed of AI. Intentionally structured and optimized for Algerian merchant operations, it streamlines messy order chats into ready-to-ship records in milliseconds.

---

## 🚀 Key Features

- **AI-Driven Data Extraction**: Instantly parses freeform chats (including Algerian slang/Darija) into clean structured entries (Name, Phone, Wilaya, Commune, Product) in less than 2 seconds.
- **Infinite Scrolling (Seamless Data Exploration)**: Say goodbye to lagging pagination and high load times. Enjoy smooth, uninterrupted browsing of extensive order histories, active filtered tables, and labels archive via a native performance-centric `IntersectionObserver`-based layout.
- **Integrative Error Warning Engine**: Proactively flags incorrect/misspelled entries, invalid phones, and misaligned address values on setup, cutting manual routing mistakes by over 99%.
- **Strict Phone Validation**: Checks and locks user checkout models to ensure client contact fields consist of exactly 10-digit formats with recognized Algerian carriers (`05`, `06`, or `07`) with real-time reactive field alerts.
- **Chrono-Order Time Tracking**: Customize and offset record times precisely on-screen. Displays beautiful date and time indicators conforming directly to your system's language guidelines (Arabic or French).
- **Desktop-Optimized Layout**: A stunning multi-column Dashboard containing a gorgeous, interactive, bento-inspired stats directory that feels expansive and ergonomic on standard desktop and tablet monitors.
- **Intelligent 68 Wilayas Mapping**: Automatically maps various phonetic expressions and alternate spellings (e.g., *Oran, ohran, Djelfa, jalfa*) to standard administrative state registries for perfect logistics compliance.
- **Interactive Statistical Drill-Downs**: Effortlessly click any statistical counter button (Pending, Delivered, Refunded, Recieved) on the main board to immediately list, search, and manage matching records inside the active frame.
- **Carrier Agnostic Bulk Dispatching**: Batch check several orders to ship, click the carrier dropdown (supporting Yalidine Express, ZR Express, Maystro Delivery, ECOTRACK, and Anderson), and dispatch them simultaneously.
- **Secure Server-Proxied Live Credentials**: Fetches and applies API credentials in the backend directly from Firestore (`merchant_configs`) at run-time, maintaining strict separation of keys from client browsers.
- **Fail-Safe Batch Processing**: Dispatches are fired isolatedly per record inside batches. Successfully processed shipments acquire automated tracking, while failing records stay under `Pending` status highlighting the exact API error details adjacent to the list row for easy corrections.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, Motion/React, Firebase Authentication & Firestore.
- **Backend/Compilation**: Node.js, Express, @google/genai (Gemini Core), Firebase Admin SDK, bundled cleanly using Esbuild.

---

## ⚙️ Project Setup (Development)

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Configure Environment Variables**: Set up a custom `.env` complying with `.env.example` (ensuring your Gemini API key and Firebase specifications are included).
3. **Start Local Hot-Reload Host**:
   ```bash
   npm run dev
   ```
4. **Bundle for Standalone Production**:
   ```bash
   npm run build
   ```
5. **Boot Server Instance**:
   ```bash
   npm start
   ```

---

*SmartyAi order AI • THE LUXURY SUITE FOR ALGERIAN MERCHANTS*
