// auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }: { auth: any; request: any }) {
      const isLoggedIn = !!auth?.user;
      const isOnProtectedRoute = request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/smart-voice");
      
      if (isOnProtectedRoute) {
        if (isLoggedIn) return true;
        return false;
      }
      return true;
    },
  },
  providers: [], // سيتم إضافتها في auth.ts
} satisfies NextAuthConfig;
