import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db";

const handler = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
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
    // دالة jwt تُستخدم لتخزين البيانات في الـ token
    async jwt({ token, user }) {
      // إذا كان user موجودًا (يعني هذا هو أول تسجيل دخول)، نضيف user.id إلى token
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // دالة session تُستخدم لنقل البيانات من الـ token إلى الـ session
    async session({ session, token }) {
      // نضيف token.id إلى session.user.id لجعله متاحًا في الواجهة الأمامية
      if (token.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
