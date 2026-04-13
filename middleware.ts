// middleware.ts
import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnProtectedRoute = req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/smart-voice");
  
  if (isOnProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
