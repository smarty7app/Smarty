import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string; // <--- نضيف حقل id
    } & DefaultSession["user"];
  }

  interface User {
    id: string; // <--- نؤكد أن User model يحتوي على id
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string; // <--- نضيف id إلى الـ JWT token
  }
}
