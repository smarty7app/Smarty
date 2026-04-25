import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI as string;
if (!uri) {
  // رسالة خطأ واضحة في التطوير، وعامة في الإنتاج (لا نكشف تفاصيل البيئة)
  if (process.env.NODE_ENV === "development") {
    throw new Error("❌ Please define MONGODB_URI in .env.local");
  } else {
    throw new Error("Database connection string missing");
  }
}

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,            // يمنع أي استعلامات غير مطابقة للـ API
    deprecationErrors: true, // يبلغ عن أي ميزات قديمة
  },
  maxPoolSize: 10,                   // لا يزيد عدد الاتصالات المفتوحة عن 10
  serverSelectionTimeoutMS: 5000,    // 5 ثواني كحد أقصى لاختيار الخادم
  connectTimeoutMS: 5000,            // 5 ثواني للاتصال الأولي
  socketTimeoutMS: 45000,            // 45 ثانية قبل إغلاق الاتصالات المعلقة
};

// نخزن الوعد (Promise) في كائن global لتجنب إنشاء اتصال جديد في كل طلب (مهم جداً في بيئة serverless)
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (!global._mongoClientPromise) {
  const client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect().catch((err) => {
    console.error("❌ MongoDB initial connection failed:", err);
    throw err; // نعيد رمي الخطأ ليتم التعامل معه من قبل التطبيق
  });
}
clientPromise = global._mongoClientPromise;

export default clientPromise;
