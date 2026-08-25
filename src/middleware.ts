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

// ✅ API routes that use API key authentication (no session required)
const API_KEY_ROUTES = [
  '/api/admin',
  '/api/vendors',
  '/api/public',
];

// ✅ Check if a path is public
const isPublicRoute = (path: string) => {
  return PUBLIC_ROUTES.some(route => path.startsWith(route));
};

// ✅ Check if a path uses API key authentication
const isApiKeyRoute = (path: string) => {
  return API_KEY_ROUTES.some(route => path.startsWith(route));
};

export default withAuth(
  async function middleware(req: NextRequest) {
    const token = req.nextauth?.token;
    const path = req.nextUrl.pathname;
    const origin = req.headers.get('origin') || '';
    const method = req.method;

    console.log("========== BILSCORE MIDDLEWARE ==========");
    console.log(" Path:", path);
    console.log(" Method:", method);
    console.log(" Token exists:", !!token);
    if (token) {
      console.log(" Token role:", token.role);
    }

    // ========== HANDLE OPTIONS PREFLIGHT ==========
    if (method === "OPTIONS") {
      console.log(" 🔄 Handling OPTIONS preflight request");
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

    // ========== API KEY ROUTES - Skip authentication check ==========
    if (isApiKeyRoute(path)) {
      console.log(`🔑 API Key route: ${path} - allowing access (authentication handled by route)`);
      const response = NextResponse.next();
      const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
      response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }

    // ========== PUBLIC ROUTES - Allow without authentication ==========
    if (isPublicRoute(path)) {
      console.log(`✅ Public route: ${path} - allowing access`);
      return NextResponse.next();
    }

    // ========== API ROUTES (non-API-key routes) ==========
    if (path.startsWith("/api")) {
      console.log(" 🔌 API route - checking authentication");
      
      // Check if there's a valid token or API key
      const apiKey = req.headers.get('x-api-key');
      
      // If there's an API key, allow access (the route will validate it)
      if (apiKey) {
        console.log(" 🔑 API key present in request, allowing access");
        const response = NextResponse.next();
        const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
        response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
        response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        return response;
      }
      
      // If no token and no API key, return 401
      if (!token) {
        console.log(" ❌ No token and no API key, returning 401");
        return new NextResponse(
          JSON.stringify({ error: "Authentication required" }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
              'Access-Control-Allow-Credentials': 'true',
            },
          }
        );
      }
      
      console.log(" ✅ Token present, allowing API access");
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
      console.log(" 📁 Static asset - allowing");
      return NextResponse.next();
    }

    // ========== ROOT REDIRECT ==========
    if (path === "/") {
      if (token) {
        console.log(" 👤 User at root, redirecting to /dashboard");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      console.log(" 🌐 No token at root, allowing to landing page");
      return NextResponse.next();
    }

    // ========== PROTECTED ROUTES ==========
    // If no token, redirect to sign-in
    if (!token) {
      console.log(" 🔒 No token, redirecting to sign-in");
      const signInUrl = new URL("/auth/sign-in", req.url);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    // ========== ROLE-BASED ACCESS ==========
    if (path.startsWith("/admin")) {
      if (token.role !== "ADMIN" && token.role !== "SUPER_ADMIN") {
        console.log(" ⛔ User not authorized for admin, redirecting to /dashboard");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      console.log(" ✅ Admin access granted");
      return NextResponse.next();
    }

    // ========== DASHBOARD AND OTHER PROTECTED ROUTES ==========
    console.log(" ✅ Allowing access to protected route");
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // ✅ Always return true to let the middleware logic handle authorization
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