import { MongoClient, ServerApiVersion } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in environment variables');
}

const uri = process.env.MONGODB_URI;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// إعدادات متقدمة لجعل الاتصال أكثر قوة
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // يمنع التطبيق من الانتظار إلى ما لا نهاية إذا تعذر الاتصال
  serverSelectionTimeoutMS: 5000, // المهلة: 5 ثوانٍ
  connectTimeoutMS: 5000,
  // يحدد عدد الاتصالات المتزامنة المسموح بها، مما يمنع إجهاد الخادم
  maxPoolSize: 10,
};

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
