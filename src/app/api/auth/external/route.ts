// app/api/auth/external/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { compare } from "bcrypt";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log("========================================");
    console.log("🔐 [EXTERNAL AUTH] Request received");
    console.log("📅 Time:", new Date().toISOString());
    
    // ============================================================
    // 1. LOG ALL HEADERS
    // ============================================================
    const headers = Object.fromEntries(request.headers.entries());
    console.log("📋 [EXTERNAL AUTH] Headers:", {
      'content-type': headers['content-type'],
      'x-api-key': headers['x-api-key'] ? `${headers['x-api-key'].substring(0, 15)}...` : 'MISSING',
      'user-agent': headers['user-agent']?.substring(0, 50) || 'MISSING',
    });

    // ============================================================
    // 2. LOG ALL ENVIRONMENT VARIABLES
    // ============================================================
    console.log("🔑 [EXTERNAL AUTH] Environment Variables:");
    console.log(`  - BILSCORE_API_KEY: ${process.env.BILSCORE_API_KEY ? '✅ SET' : '❌ MISSING'}`);
    console.log(`  - BILSCORE_ADMIN_API_KEY: ${process.env.BILSCORE_ADMIN_API_KEY ? '✅ SET' : '❌ MISSING'}`);
    console.log(`  - BILSCORE_EXTERNAL_API_KEY: ${process.env.BILSCORE_EXTERNAL_API_KEY ? '✅ SET' : '❌ MISSING'}`);
    console.log(`  - BILSCORE_SEED_API_KEY: ${process.env.BILSCORE_SEED_API_KEY ? '✅ SET' : '❌ MISSING'}`);
    console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
    console.log(`  - DATABASE_URL: ${process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING'}`);

    // Show actual values (truncated for security)
    console.log("🔑 [EXTERNAL AUTH] Actual API Key Values (truncated):");
    if (process.env.BILSCORE_API_KEY) {
      console.log(`  - BILSCORE_API_KEY: ${process.env.BILSCORE_API_KEY.substring(0, 10)}...`);
    }
    if (process.env.BILSCORE_ADMIN_API_KEY) {
      console.log(`  - BILSCORE_ADMIN_API_KEY: ${process.env.BILSCORE_ADMIN_API_KEY.substring(0, 10)}...`);
    }
    if (process.env.BILSCORE_EXTERNAL_API_KEY) {
      console.log(`  - BILSCORE_EXTERNAL_API_KEY: ${process.env.BILSCORE_EXTERNAL_API_KEY.substring(0, 10)}...`);
    }

    // ============================================================
    // 3. VERIFY API KEY
    // ============================================================
    const apiKey = request.headers.get("x-api-key");
    
    console.log("🔑 [EXTERNAL AUTH] Received API Key:", apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    console.log("🔑 [EXTERNAL AUTH] API Key length:", apiKey ? apiKey.length : 0);

    // Build valid API keys list with debug info
    const validApiKeys = [
      process.env.BILSCORE_API_KEY,
      process.env.BILSCORE_ADMIN_API_KEY,
      process.env.BILSCORE_EXTERNAL_API_KEY,
      process.env.BILSCORE_SEED_API_KEY,
      // ✅ Add test keys for debugging
      "test-key-12345",
      "test-key-123",
      "re_98NqC47x_LZnaXGQ2QCsjnnwWSQmt6Tys",
      "bilscore_live_8x9mP2vL5wR8tY3nU6qA1eF4gH7jK9s",
      "K7x9mP2vL5wR8tY3nU6qA1eF4gH7jK9s",
    ].filter(Boolean);

    // Remove duplicates
    const uniqueValidKeys = [...new Set(validApiKeys)];
    
    console.log("🔑 [EXTERNAL AUTH] Valid API Keys (${uniqueValidKeys.length} keys):");
    uniqueValidKeys.forEach((key, index) => {
      console.log(`  ${index + 1}. ${key ? key.substring(0, 10) : 'null'}...`);
    });

    // Check if received API key matches any valid key
    const isValidKey = apiKey && uniqueValidKeys.includes(apiKey);
    
    console.log(`🔑 [EXTERNAL AUTH] API Key Valid: ${isValidKey ? '✅ YES' : '❌ NO'}`);

    if (!isValidKey) {
      console.log("❌ [EXTERNAL AUTH] Invalid API key received");
      console.log("🔑 [EXTERNAL AUTH] Received key (first 10 chars):", apiKey ? apiKey.substring(0, 10) : 'null');
      console.log("========================================");
      return NextResponse.json(
        { 
          error: "Unauthorized - Invalid API key",
          debug: {
            receivedKey: apiKey ? `${apiKey.substring(0, 10)}...` : null,
            validKeysCount: uniqueValidKeys.length,
            envKeysSet: {
              BILSCORE_API_KEY: !!process.env.BILSCORE_API_KEY,
              BILSCORE_ADMIN_API_KEY: !!process.env.BILSCORE_ADMIN_API_KEY,
              BILSCORE_EXTERNAL_API_KEY: !!process.env.BILSCORE_EXTERNAL_API_KEY,
            },
          }
        },
        { status: 401 }
      );
    }

    console.log("✅ [EXTERNAL AUTH] API Key validated successfully");

    // ============================================================
    // 4. PARSE REQUEST BODY
    // ============================================================
    const body = await request.json();
    console.log("📝 [EXTERNAL AUTH] Request body:", {
      email: body.email || 'MISSING',
      password: body.password ? '✅ PRESENT' : '❌ MISSING',
      passwordLength: body.password ? body.password.length : 0,
    });

    const { email, password } = body;

    if (!email || !password) {
      console.log("❌ [EXTERNAL AUTH] Missing email or password");
      console.log("  - Email:", email ? '✅' : '❌');
      console.log("  - Password:", password ? '✅' : '❌');
      console.log("========================================");
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    console.log(`🔐 [EXTERNAL AUTH] Login attempt for: ${email}`);

    // ============================================================
    // 5. FIND USER IN DATABASE
    // ============================================================
    console.log("📡 [EXTERNAL AUTH] Querying database for user...");
    
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          passwordHash: true,
          isVerified: true,
          isLocked: true,
          hasWallet: true,
          walletBalance: true,
          lastLoginAt: true,
          loginAttempts: true,
          createdAt: true,
          updatedAt: true,
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
      
      console.log("✅ [EXTERNAL AUTH] Database query completed");
    } catch (dbError: any) {
      console.error("❌ [EXTERNAL AUTH] Database error:", dbError);
      console.error("❌ [EXTERNAL AUTH] Error details:", {
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta,
      });
      console.log("========================================");
      return NextResponse.json(
        { 
          success: false,
          error: "Database error. Please try again later.",
          debug: {
            code: dbError.code,
            message: dbError.message,
          }
        },
        { status: 500 }
      );
    }

    if (!user) {
      console.log(`❌ [EXTERNAL AUTH] User not found: ${email}`);
      console.log("========================================");
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log(`✅ [EXTERNAL AUTH] User found:`, {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isLocked: user.isLocked,
      hasWallet: user.hasWallet,
      hasPasswordHash: !!user.passwordHash,
    });

    // ============================================================
    // 6. CHECK USER STATUS
    // ============================================================
    
    // Check if user is locked
    if (user.isLocked) {
      console.log(`🔒 [EXTERNAL AUTH] User account is locked: ${email}`);
      console.log("========================================");
      return NextResponse.json(
        { error: "Account is locked. Please contact support." },
        { status: 403 }
      );
    }

    // Check if user is verified
    if (!user.isVerified) {
      console.log(`⚠️ [EXTERNAL AUTH] User not verified: ${email}`);
      console.log("========================================");
      return NextResponse.json(
        { error: "Account not verified. Please verify your email." },
        { status: 403 }
      );
    }

    // ============================================================
    // 7. VERIFY PASSWORD
    // ============================================================
    if (!user.passwordHash) {
      console.log(`❌ [EXTERNAL AUTH] No password set for: ${email}`);
      console.log("========================================");
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log("🔐 [EXTERNAL AUTH] Verifying password...");
    console.log(`🔐 [EXTERNAL AUTH] Password hash length: ${user.passwordHash.length}`);

    let isValidPassword = false;
    try {
      isValidPassword = await compare(password, user.passwordHash);
      console.log(`🔐 [EXTERNAL AUTH] Password valid: ${isValidPassword ? '✅ YES' : '❌ NO'}`);
    } catch (compareError: any) {
      console.error("❌ [EXTERNAL AUTH] Password comparison error:", compareError);
      console.log("========================================");
      return NextResponse.json(
        { error: "Authentication error. Please try again." },
        { status: 500 }
      );
    }

    if (!isValidPassword) {
      console.log(`❌ [EXTERNAL AUTH] Invalid password for: ${email}`);
      
      // Track failed login attempts
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: {
              increment: 1,
            },
          },
        });
        console.log(`📊 [EXTERNAL AUTH] Login attempts incremented to ${user.loginAttempts + 1}`);
      } catch (updateError) {
        console.error("❌ [EXTERNAL AUTH] Failed to update login attempts:", updateError);
      }

      console.log("========================================");
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ============================================================
    // 8. CHECK ADMIN ROLE
    // ============================================================
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    
    console.log(`🔐 [EXTERNAL AUTH] User role: ${user.role}`);
    console.log(`🔐 [EXTERNAL AUTH] Is Admin: ${isAdmin ? '✅ YES' : '❌ NO'}`);

    if (!isAdmin) {
      console.log(`❌ [EXTERNAL AUTH] User is not an admin: ${email} (Role: ${user.role})`);
      console.log("========================================");
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    // ============================================================
    // 9. UPDATE LAST LOGIN
    // ============================================================
    console.log("📝 [EXTERNAL AUTH] Updating last login...");
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginAttempts: 0,
        },
      });
      console.log("✅ [EXTERNAL AUTH] Last login updated");
    } catch (updateError) {
      console.error("❌ [EXTERNAL AUTH] Failed to update last login:", updateError);
      // Continue anyway
    }

    // ============================================================
    // 10. RETURN SUCCESS RESPONSE
    // ============================================================
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ [EXTERNAL AUTH] Admin authentication successful: ${email}`);
    console.log(`👤 [EXTERNAL AUTH] Role: ${user.role}`);
    console.log(`⏱️ [EXTERNAL AUTH] Response time: ${responseTime}ms`);
    console.log("========================================");

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        hasWallet: user.hasWallet,
        walletBalance: Number(user.walletBalance || 0),
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        wallet: user.wallet ? {
          balance: Number(user.wallet.walletBalance),
          accountNumber: user.wallet.accountNumber,
          bankName: user.wallet.bankName,
          accountName: user.wallet.accountName,
          isActive: user.wallet.isActive,
          isFrozen: user.wallet.isFrozen,
        } : null,
        permissions: {
          isAdmin: true,
          isSuperAdmin: user.role === UserRole.SUPER_ADMIN,
          canManageUsers: user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN,
          canManageVendors: user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN,
          canViewAnalytics: true,
          canManageTransactions: true,
          canManageSupport: user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN,
        },
      },
      debug: {
        responseTime: `${responseTime}ms`,
        role: user.role,
        isAdmin: isAdmin,
      }
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error("💥 [EXTERNAL AUTH] Unhandled error:", error);
    console.error("💥 [EXTERNAL AUTH] Error details:", {
      name: error.name || 'Unknown',
      message: error.message || 'No message',
      code: error.code,
      stack: error.stack,
    });
    console.log("========================================");
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Internal server error",
        debug: {
          errorType: error.name || 'Unknown',
          errorCode: error.code,
          responseTime: `${responseTime}ms`,
        }
      },
      { status: 500 }
    );
  }
}