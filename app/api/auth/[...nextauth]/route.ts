import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db";

const handler = NextAuth({
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: "smartyDB",
    collections: {
      Users: "users",
      Accounts: "accounts",
      Sessions: "sessions",
      VerificationTokens: "verification_tokens",
    },
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      // إضافة تاريخ الإنشاء للمستخدم الجديد فقط
      const db = (await clientPromise).db("smartyDB");
      const usersCollection = db.collection("users");
      
      const existingUser = await usersCollection.findOne({ email: user.email });
      if (!existingUser) {
        await usersCollection.updateOne(
          { email: user.email },
          { 
            $setOnInsert: { 
              createdAt: new Date(),
              updatedAt: new Date()
            } 
          },
          { upsert: true }
        );
        console.log(`✅ تم إنشاء مستخدم جديد: ${user.email} في ${new Date().toISOString()}`);
      }
      return true;
    },
    async session({ session, token, user }) {
      // إضافة userId إلى جلسة المستخدم لتسهيل التعامل مع التذكيرات
      if (session.user) {
        session.user.id = token.sub || user?.id;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
