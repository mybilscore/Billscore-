// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Role-based redirects
    if (path.startsWith("/emmp") && token?.role !== "BUYER") {
      return NextResponse.redirect(new URL("/auth/unauthorized", req.url));
    }

    if (path.startsWith("/emaps") && token?.role !== "SUPERVISOR") {
      return NextResponse.redirect(new URL("/auth/unauthorized", req.url));
    }

    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/auth/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/emmp/:path*",
    "/emaps/:path*",
    "/admin/:path*",
    "/profile/:path*",
  ],
};