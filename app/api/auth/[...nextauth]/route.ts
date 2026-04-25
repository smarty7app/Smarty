import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // استيراد من الملف الجديد
import GoogleProvider from "next-auth/providers/google";
import clientPromise from "@/lib/mongodb";

// ✅ تصدير authOptions ليتم استيراده في chat/route.ts
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      try {
        const client = await clientPromise;
        const db = client.db("smartyDB");
        const usersCollection = db.collection("users");

        const existingUser = await usersCollection.findOne({ email: user.email });
        if (!existingUser) {
          const result = await usersCollection.insertOne({
            email: user.email,
            name: user.name,
            image: user.image,
            createdAt: new Date(),
          });
          user.id = result.insertedId.toString();
        } else {
          user.id = existingUser._id.toString();
        }
      } catch (error) {
        console.error("خطأ في حفظ المستخدم:", error);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
