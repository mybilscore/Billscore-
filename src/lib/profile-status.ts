// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Skip for auth routes and API routes
    if (path.startsWith("/auth") || path.startsWith("/api")) {
      return NextResponse.next();
    }

    // Check if profile is complete
    if (token?.partyStatus === "PENDING_PROFILE" && path !== "/profile/complete") {
      return NextResponse.redirect(new URL("/profile/complete", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};