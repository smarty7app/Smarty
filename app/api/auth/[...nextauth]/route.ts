import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
// ✅ التصحيح: نستورد default export وهو clientPromise
import clientPromise from "@/lib/mongodb";

const handler = NextAuth({
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
        // ✅ استخدم clientPromise مباشرة
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
          // ✅ تعيين معرف قاعدة البيانات للمستخدم الجديد
          user.id = result.insertedId.toString();
        } else {
          // ✅ تعيين معرف قاعدة البيانات للمستخدم الموجود
          user.id = existingUser._id.toString();
        }
      } catch (error) {
        console.error("خطأ في حفظ المستخدم:", error);
        // في حالة الفشل، نسمح بتسجيل الدخول لكن قد لا يعمل `id`
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
});

export { handler as GET, handler as POST };
