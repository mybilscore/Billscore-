// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define allowed origins for CORS
const ALLOWED_ORIGINS = ['http://localhost:3001', 'http://localhost:3000'];
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = ['Content-Type', 'x-api-key', 'Authorization', 'Accept'];

// ✅ List of public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth',
  '/qr/display',
  '/qr',
  '/buy-now',
  '/documentation',
  '/',
];

// ✅ Check if a path is public
const isPublicRoute = (path: string) => {
  return PUBLIC_ROUTES.some(route => path.startsWith(route));
};

export default withAuth(
  async function middleware(req: NextRequest) {
    const token = req.nextauth?.token;
    const path = req.nextUrl.pathname;
    const origin = req.headers.get('origin') || '';

    console.log("========== BILSCORE MIDDLEWARE ==========");
    console.log(" Path:", path);
    console.log(" Token exists:", !!token);
    if (token) {
      console.log(" Token role:", token.role);
    }

    // ========== HANDLE OPTIONS PREFLIGHT ==========
    if (req.method === "OPTIONS") {
      console.log(" Handling OPTIONS preflight request");
      const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
          'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(', '),
          'Access-Control-Max-Age': '86400',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }

    // ========== PUBLIC ROUTES - Allow without authentication ==========
    if (isPublicRoute(path)) {
      console.log(`✅ Public route: ${path} - allowing access`);
      return NextResponse.next();
    }

    // ========== API ROUTES ==========
    if (path.startsWith("/api")) {
      console.log(" API route - adding CORS headers");
      const response = NextResponse.next();
      const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
      response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }

    // ========== STATIC ASSETS ==========
    if (path.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)) {
      console.log(" Static asset - allowing");
      return NextResponse.next();
    }

    // ========== ROOT REDIRECT ==========
    if (path === "/") {
      if (token) {
        console.log(" User at root, redirecting to /dashboard");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      console.log(" No token at root, allowing to landing page");
      return NextResponse.next();
    }

    // ========== PROTECTED ROUTES ==========
    // If no token, redirect to sign-in
    if (!token) {
      console.log(" No token, redirecting to sign-in");
      const signInUrl = new URL("/auth/sign-in", req.url);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    // ========== ROLE-BASED ACCESS ==========
    if (path.startsWith("/admin")) {
      if (token.role !== "ADMIN" && token.role !== "SUPER_ADMIN") {
        console.log(" User not authorized for admin, redirecting to /dashboard");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      console.log(" Admin access granted");
      return NextResponse.next();
    }

    // ========== DASHBOARD AND OTHER PROTECTED ROUTES ==========
    console.log(" Allowing access to protected route");
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // ✅ Always return true to let the middleware logic handle authorization
        // The actual authorization is handled in the middleware function above
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};