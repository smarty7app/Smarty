// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // يسمح فقط إذا كان هناك رمز (token)
    },
  }
);

// تحديد المسارات التي تحتاج إلى حماية
export const config = {
  matcher: [
    "/",              // الصفحة الرئيسية
    "/smart-voice",   // صفحة الذكاء الاصطناعي الصوتي
  ],
};
