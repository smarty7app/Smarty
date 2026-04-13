// auth.config.ts
import type { NextAuthConfig } from "next-auth";
 
export const authConfig = {
  providers: [], // نضيفها في الملف الرئيسي
  pages: {
    signIn: "/login", // سيتم توجيه المستخدمين غير المسجلين إلى هذه الصفحة
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname === '/';
      if (isOnProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // إعادة التوجيه إلى صفحة تسجيل الدخول
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
