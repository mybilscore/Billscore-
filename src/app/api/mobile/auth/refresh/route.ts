// src/app/api/mobile/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verify, sign, JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Verify the existing token
    try {
      const decoded = verify(token, JWT_SECRET) as any;
      
      console.log("🔄 Refreshing token for user:", decoded.email);
      console.log("User slug:", decoded.slug);
      
      // Check if token is about to expire (within 1 day)
      const currentTime = Math.floor(Date.now() / 1000);
      const isExpiringSoon = decoded.exp && (decoded.exp - currentTime) < 86400; // 1 day
      
      // Only refresh if token is valid and not expired
      if (!isExpiringSoon) {
        // Token is still fresh, no need to refresh
        return NextResponse.json({
          accessToken: token,
          refreshToken: token,
          expiresIn: "7d",
          message: "Token still valid"
        });
      }
      
      // Generate new token with same user data (including slug)
      const newToken = sign(
        {
          userId: decoded.userId,
          partyId: decoded.partyId,
          email: decoded.email,
          role: decoded.role,
          slug: decoded.slug,  // Include the slug in the new token
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      console.log("✅ Token refreshed successfully for user:", decoded.email);
      
      return NextResponse.json({
        accessToken: newToken,
        refreshToken: newToken,
        expiresIn: "7d",
      });
      
    } catch (err) {
      // Handle specific JWT errors
      if (err instanceof TokenExpiredError) {
        console.error("❌ Token expired:", err.message);
        return NextResponse.json(
          { error: "Token expired. Please login again." },
          { status: 401 }
        );
      }
      
      if (err instanceof JsonWebTokenError) {
        console.error("❌ Invalid token:", err.message);
        return NextResponse.json(
          { error: "Invalid token. Please login again." },
          { status: 401 }
        );
      }
      
      console.error("❌ Token verification failed:", err);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}