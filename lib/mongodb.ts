import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI as string;
if (!uri) {
  // في بيئة التطوير، أعط رسالة واضحة. في الإنتاج، اكتفِ بخطأ عام.
  if (process.env.NODE_ENV === "development") {
    throw new Error("❌ Please define MONGODB_URI in .env.local");
  } else {
    throw new Error("Database connection string missing");
  }
}

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 45000, // أغلق الاتصالات المعلقة بعد 45 ثانية
};

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (!global._mongoClientPromise) {
  const client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect().catch((err) => {
    // سجل الخطأ وأعده حتى تتمكن الأجزاء الأخرى من التعامل معه
    console.error("❌ MongoDB initial connection failed:", err);
    throw err;
  });
}
clientPromise = global._mongoClientPromise;

export default clientPromise;
