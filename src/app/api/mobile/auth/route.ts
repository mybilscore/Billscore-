// src/app/api/mobile/auth/route.ts

import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcrypt";
import { prisma } from "~/lib/db";
import { sign } from "jsonwebtoken";
import { createHash } from "crypto";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getUserDisplayName(user: any): string {
  return user.fullName || user.username || user.email || "User";
}

function getUserPhone(user: any): string {
  return user.phone || "";
}

async function getUserBusinesses(userId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (wallet) {
    return [{
      bussinesId: wallet.id,
      bussines_name: `${wallet.accountName}'s Wallet`,
      link: `/wallet/${wallet.id}`,
      type: "WALLET",
      address: wallet.bankName || "No location",
      aboutBusiness: `Balance: ₦${Number(wallet.walletBalance).toLocaleString()}`,
      link_name: wallet.accountName.toLowerCase().replace(/\s/g, '-'),
      whatsapp: null,
      logo: null,
      logo_public_id: null,
    }];
  }

  return [];
}

async function getUserSubscriptionStatus(userId: string): Promise<number> {
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      isActive: true,
      isPaused: false,
    },
  });

  return activeSubscription ? 1 : 0;
}

// ============================================================
// MAIN AUTH ROUTE
// ============================================================

export async function POST(request: NextRequest) {
  console.log("========================================");
  console.log("📱 [MOBILE AUTH] Request received!");
  console.log("📅 Time:", new Date().toISOString());

  try {
    const body = await request.json();
    const { email, username, password } = body;

    // Support both email and username
    const identifier = email || username;
    
    console.log("📱 [MOBILE AUTH] Login attempt for:", identifier);

    if (!identifier || !password) {
      console.log("❌ [MOBILE AUTH] Missing identifier or password");
      return NextResponse.json(
        { error: "Email/Username and password are required" },
        { status: 400 }
      );
    }

    // ============================================================
    // 1. FIND USER BY EMAIL OR USERNAME
    // ============================================================
    
    const isEmail = identifier.includes("@") && identifier.includes(".");
    console.log(`🔍 [MOBILE AUTH] Looking up user by ${isEmail ? 'email' : 'username'}:`, identifier);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
        ],
      },
      include: {
        wallet: {
          select: {
            id: true,
            walletBalance: true,
            accountNumber: true,
            bankName: true,
            accountName: true,
            isActive: true,
            isFrozen: true,
          },
        },
      },
    });

    if (!user) {
      console.log("❌ [MOBILE AUTH] User not found for identifier:", identifier);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log("✅ [MOBILE AUTH] User found:", user.id);
    console.log("✅ [MOBILE AUTH] User email:", user.email);
    console.log("✅ [MOBILE AUTH] User username:", user.username);

    // ============================================================
    // 2. CHECK USER STATUS
    // ============================================================

    if (user.isLocked) {
      console.log("🔒 [MOBILE AUTH] Account locked:", user.email);
      return NextResponse.json(
        { error: "Account is locked. Please contact support." },
        { status: 403 }
      );
    }

    // ============================================================
    // 3. VERIFY PASSWORD
    // ============================================================

    let isValid = false;

    if (user.passwordHash) {
      try {
        isValid = await compare(password, user.passwordHash);
        console.log(`🔐 [MOBILE AUTH] Password valid: ${isValid}`);
      } catch (compareError) {
        console.error("❌ [MOBILE AUTH] Password comparison error:", compareError);
        return NextResponse.json(
          { error: "Authentication error. Please try again." },
          { status: 500 }
        );
      }
    } else {
      console.log("❌ [MOBILE AUTH] No password hash found for user");
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!isValid) {
      console.log("❌ [MOBILE AUTH] Invalid password for:", user.email);

      // Update login attempts
      const newAttempts = (user.loginAttempts || 0) + 1;
      const shouldLock = newAttempts >= 5;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: newAttempts,
          isLocked: shouldLock,
          lockedAt: shouldLock ? new Date() : undefined,
          lockedReason: shouldLock ? "Too many failed login attempts" : undefined,
        },
      });

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ============================================================
    // 4. UPDATE LAST LOGIN & RESET ATTEMPTS
    // ============================================================

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIP: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        lastLoginUserAgent: request.headers.get("user-agent"),
        loginAttempts: 0,
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
      },
    });

    // ============================================================
    // 5. GET USER BUSINESSES
    // ============================================================

    const businesses = await getUserBusinesses(user.id);

    // ============================================================
    // 6. GET SUBSCRIPTION STATUS
    // ============================================================

    const subsStat = await getUserSubscriptionStatus(user.id);

    // ============================================================
    // 7. GENERATE JWT TOKEN
    // ============================================================

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const token = sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });
    console.log("✅ [MOBILE AUTH] Token generated, length:", token.length);

    // ============================================================
    // 8. CREATE USER SESSION - FIXED for MySQL
    // ============================================================

    try {
      // Hash the token for indexing (shorter and indexable)
      const tokenHash = hashToken(token);
      
      await prisma.session.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash,  // Indexed field
          token: token,          // Full token stored as Text
          deviceInfo: request.headers.get("user-agent") || "Mobile Device",
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
          userAgent: request.headers.get("user-agent"),
          channel: "MOBILE_APP",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });
      console.log("✅ [MOBILE AUTH] Session created successfully");
    } catch (sessionError: any) {
      console.error("⚠️ [MOBILE AUTH] Session creation failed:", sessionError.message);
      // Don't return error - the user can still login
    }

    // ============================================================
    // 9. BUILD MOBILE USER RESPONSE
    // ============================================================

    const roleString = user.role?.toString() || "END_USER";
    const primaryBusinessId = businesses[0]?.bussinesId || "";

    const mobileUser = {
      id: user.id,
      email: user.email || "",
      name: getUserDisplayName(user),
      phone: getUserPhone(user),
      pkey: user.username || user.id,
      slug: user.username || user.id,
      referal: user.referralCode || "",
      rf_link: user.referralCode ? `/refer/${user.referralCode}` : "",
      subs_stat: subsStat,
      role: roleString,
      bussiness: businesses,
      bussinesId: primaryBusinessId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      wallet: user.wallet ? {
        id: user.wallet.id,
        balance: Number(user.wallet.walletBalance),
        accountNumber: user.wallet.accountNumber,
        bankName: user.wallet.bankName,
        accountName: user.wallet.accountName,
        isActive: user.wallet.isActive,
        isFrozen: user.wallet.isFrozen,
      } : null,
      isVerified: user.isVerified,
      hasWallet: user.hasWallet,
      username: user.username,
    };

    // ============================================================
    // 10. RETURN SUCCESS RESPONSE
    // ============================================================

    console.log("✅ [MOBILE AUTH] Login successful for:", user.email || user.username);
    console.log("========================================");

    return NextResponse.json({
      message: "Login successful",
      token,
      expiresIn: "7d",
      user: mobileUser,
    });

  } catch (error: any) {
    console.error("❌ [MOBILE AUTH] Login error:", error);
    console.error("❌ [MOBILE AUTH] Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
    });
    console.log("========================================");

    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        code: error.code || "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// OPTIONS: Handle CORS
// ============================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}