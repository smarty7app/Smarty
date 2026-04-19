// middleware.ts (بديل يعمل مع Next.js 15)
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const isLoggedIn = !!token;
  
  // ✅ التحقق من وضع الضيف (عبر cookie أو query parameter)
  const guestCookie = request.cookies.get("guest_mode")?.value === "true";
  const guestParam = request.nextUrl.searchParams.get("guest") === "true";
  const isGuestMode = guestCookie || guestParam;
  
  const isOnProtectedRoute = request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/smart-voice");

  // ✅ إذا كان المستخدم في وضع الضيف، نسمح بالمرور دون مصادقة
  if (isOnProtectedRoute && !isLoggedIn && !isGuestMode) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};