# 🤖 Smarty AI Assistant

مساعد ذكاء اصطناعي متكامل مبني على Gemini AI لإنشاء المحتوى التسويقي.

## ✅ الإصلاحات المُطبَّقة

| المشكلة | الحل |
|---------|------|
| `vite.config.ts` لا يقرأ متغيرات `.env` في وضع التطوير | إضافة `loadEnv` من Vite لقراءة الملف بشكل صحيح |
| نموذج `gemini-2.0-flash-exp` غير مستقر | إضافة fallback تلقائي بين النماذج: `gemini-2.0-flash` → `gemini-2.0-flash-exp` → `gemini-1.5-pro` |
| نموذج Imagen يفشل بصمت | إضافة fallback بين `imagen-3.0-generate-002` و `imagen-3.0-generate-001` |
| Firebase يتعطل إذا لم تكن متغيراته موجودة | التطبيق يعمل الآن في "وضع Demo" تلقائياً بدون Firebase |
| لا يوجد طريقة لإدخال مفتاح API من الواجهة | إضافة نافذة لإدخال مفتاح Gemini مباشرة من الإعدادات |
| المستخدم محاصر في شاشة تسجيل الدخول | إضافة خيار "المتابعة كضيف" بدون تسجيل دخول |
| `.env.example` غير مكتمل | إضافة جميع المتغيرات المطلوبة مع شرح |
| خطأ Firebase عند إعادة التهيئة (HMR) | إضافة `getApps().length > 0` لتجنب التهيئة المزدوجة |

## 🚀 التشغيل السريع

### 1. المتطلبات
- Node.js 18+
- مفتاح Gemini API من [aistudio.google.com](https://aistudio.google.com/apikey) (مجاني)

### 2. التثبيت
```bash
git clone https://github.com/smarty7app/Smarty.git
cd Smarty
npm install
```

### 3. إعداد المتغيرات
```bash
cp .env.example .env
```

ثم افتح `.env` وأضف مفتاح Gemini:
```
VITE_GEMINI_API_KEY=AIza_your_key_here
```

### 4. التشغيل
```bash
npm run dev
```

افتح `http://localhost:3000` في المتصفح.

## 🔑 مفتاح API

التطبيق يبحث عن المفتاح بهذا الترتيب:
1. متغير `VITE_GEMINI_API_KEY` في ملف `.env`
2. متغير `GEMINI_API_KEY` في ملف `.env`  
3. المفتاح المُدخَل يدوياً من واجهة الإعدادات (يُحفظ في localStorage)

## 🔥 Firebase (اختياري)

إذا لم تُضف متغيرات Firebase، يعمل التطبيق في **وضع Demo** مع:
- حفظ المحادثات في localStorage (محلياً)
- خيار "المتابعة كضيف" بدون تسجيل دخول
- جميع وظائف AI تعمل بشكل كامل

لتفعيل Firebase (للمصادقة والتخزين السحابي):
1. اذهب إلى [console.firebase.google.com](https://console.firebase.google.com)
2. أنشئ مشروعاً جديداً
3. فعّل **Authentication** (Google Provider)
4. فعّل **Firestore Database**
5. أضف متغيرات `VITE_FIREBASE_*` في ملف `.env`

## 📦 النشر على Vercel

```bash
npm run build
```

في Vercel، أضف متغير البيئة:
- `GEMINI_API_KEY` = مفتاح Gemini الخاص بك

## 🏗️ هيكل المشروع

```
src/
├── App.tsx              # المكوّن الرئيسي (مُصلَح بالكامل)
├── lib/
│   ├── gemini.ts        # تكامل Gemini AI (مُصلَح + fallback)
│   └── firebase.ts      # تهيئة Firebase (مُصلَح + وضع Demo)
└── components/
    ├── ChatInput.tsx    # حقل الإدخال
    ├── ChatMessage.tsx  # عرض الرسائل
    ├── LandingPage.tsx  # الصفحة الترحيبية
    └── ...
```
