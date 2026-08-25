// app/api/admin/seed/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { hash } from "bcrypt";
import { UserRole } from "@prisma/client";

// Function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

// ✅ Add GET method for easier testing
export async function GET(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get("x-api-key");
    const validApiKeys = [
      process.env.BILSCORE_INTERNAL_API_KEY,
      process.env.BILSCORE_ADMIN_API_KEY,
      process.env.BILSCORE_SEED_API_KEY,
    ].filter(Boolean);
    
    if (!apiKey || !validApiKeys.includes(apiKey)) {
      console.log("❌ [ADMIN SEED] Invalid API key");
      return NextResponse.json(
        { error: "Unauthorized - Invalid API key" },
        { status: 401 }
      );
    }

    // Check if admin exists
    const adminEmail = process.env.ADMIN_EMAIL || "admin@bilscore.com";
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      include: { wallet: true },
    });

    return NextResponse.json({
      success: true,
      exists: !!existingUser,
      admin: existingUser ? {
        id: existingUser.id,
        email: existingUser.email,
        fullName: existingUser.fullName,
        role: existingUser.role,
        isVerified: existingUser.isVerified,
        hasWallet: existingUser.hasWallet,
        walletBalance: Number(existingUser.walletBalance),
        wallet: existingUser.wallet,
      } : null,
    });

  } catch (error: any) {
    console.error("💥 [ADMIN SEED] GET Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to check admin status",
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // ✅ Verify API key for security
    const apiKey = request.headers.get("x-api-key");
    const validApiKeys = [
      process.env.BILSCORE_INTERNAL_API_KEY,
      process.env.BILSCORE_ADMIN_API_KEY,
      process.env.BILSCORE_SEED_API_KEY,
    ].filter(Boolean);
    
    if (!apiKey || !validApiKeys.includes(apiKey)) {
      console.log("❌ [ADMIN SEED] Invalid API key");
      return NextResponse.json(
        { error: "Unauthorized - Invalid API key" },
        { status: 401 }
      );
    }

    // ✅ Handle empty or invalid request body
    let body = {};
    let rawBody = '';
    
    try {
      // Clone the request to read the body safely
      const clonedRequest = request.clone();
      rawBody = await clonedRequest.text();
      
      // Log the raw body for debugging
      console.log("📝 [ADMIN SEED] Raw request body:", rawBody);
      
      // Parse JSON if there's content
      if (rawBody && rawBody.trim().length > 0) {
        body = JSON.parse(rawBody);
        console.log("📝 [ADMIN SEED] Parsed body:", body);
      } else {
        console.log("📝 [ADMIN SEED] Empty body, using defaults");
        body = {};
      }
    } catch (parseError: any) {
      console.error("❌ [ADMIN SEED] Failed to parse JSON:", parseError.message);
      console.error("❌ [ADMIN SEED] Raw body:", rawBody);
      
      // Check if body is empty or malformed
      if (!rawBody || rawBody.trim().length === 0) {
        // Use empty body if empty
        body = {};
      } else {
        // Return error for malformed JSON
        return NextResponse.json({
          success: false,
          error: "Invalid JSON in request body. Please ensure the body is valid JSON.",
          details: {
            rawBody: rawBody.substring(0, 100) + (rawBody.length > 100 ? '...' : ''),
            error: parseError.message,
          },
        }, { status: 400 });
      }
    }

    // ✅ Use environment variables first, then request body, then defaults
    const adminEmail = body.email || process.env.ADMIN_EMAIL || "admin@bilscore.com";
    const adminPassword = body.password || process.env.ADMIN_PASSWORD || "Admin@123456";
    const adminPhone = body.phone || process.env.ADMIN_PHONE || "08012345678";
    const adminFullName = body.fullName || process.env.ADMIN_FULL_NAME || "Bilscore Admin";
    const adminRole = body.role || process.env.ADMIN_ROLE || "SUPER_ADMIN";

    console.log("🔐 [ADMIN SEED] Creating admin user...");
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`👤 Role: ${adminRole}`);
    console.log(`📱 Phone: ${adminPhone}`);
    console.log(`👤 Full Name: ${adminFullName}`);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      include: { wallet: true },
    });

    if (existingUser) {
      console.log(`✅ [ADMIN SEED] Admin user already exists: ${adminEmail}`);
      return NextResponse.json({
        success: true,
        message: "Admin user already exists",
        data: {
          id: existingUser.id,
          email: existingUser.email,
          fullName: existingUser.fullName,
          role: existingUser.role,
          isVerified: existingUser.isVerified,
          hasWallet: existingUser.hasWallet,
          walletBalance: Number(existingUser.walletBalance),
          wallet: existingUser.wallet,
        },
      });
    }

    // Check if email is already used by another user
    const emailExists = await prisma.user.findFirst({
      where: { email: adminEmail },
    });

    if (emailExists) {
      return NextResponse.json({
        success: false,
        error: "Email already in use by another user",
      }, { status: 400 });
    }

    // Hash the password
    const passwordHash = await hash(adminPassword, 10);

    // Validate role
    let role: UserRole;
    const validRoles = ["SUPER_ADMIN", "ADMIN", "DEVELOPER"];
    if (validRoles.includes(adminRole.toUpperCase())) {
      role = adminRole.toUpperCase() as UserRole;
    } else {
      role = UserRole.SUPER_ADMIN; // Default to SUPER_ADMIN
      console.warn(`⚠️ [ADMIN SEED] Invalid role "${adminRole}", defaulting to SUPER_ADMIN`);
    }

    // ✅ Create admin user with wallet in a transaction
    const admin = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          email: adminEmail,
          fullName: adminFullName,
          phone: adminPhone,
          role: role,
          passwordHash: passwordHash,
          isVerified: true,
          hasWallet: true,
          walletBalance: 0,
          referralCode: `BIL-ADMIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        },
      });

      // Create the wallet
      const accountNumber = generateVirtualAccountNumber();
      const wallet = await tx.wallet.create({
        data: {
          userId: user.id,
          accountNumber: accountNumber,
          bankName: "PALMPAY",
          accountName: adminFullName,
          walletBalance: 0,
          ledgerBalance: 0,
          isActive: true,
        },
      });

      // Update user with wallet reference if needed
      await tx.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ADMIN_SEED_CREATED",
          entityType: "User",
          entityId: user.id,
          metadata: {
            createdVia: "seed-script",
            role: role,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return { ...user, wallet };
    });

    console.log(`✅ [ADMIN SEED] Admin user created successfully!`);
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👤 Role: ${admin.role}`);
    console.log(`💰 Wallet: ${admin.wallet.accountNumber}`);

    // ✅ Return success with credentials
    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      data: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        phone: admin.phone,
        role: admin.role,
        isVerified: admin.isVerified,
        hasWallet: admin.hasWallet,
        walletBalance: Number(admin.walletBalance),
        wallet: admin.wallet,
        referralCode: admin.referralCode,
      },
      // Only include credentials in development or if explicitly requested
      credentials: {
        email: admin.email,
        password: adminPassword,
        walletAccount: admin.wallet.accountNumber,
      },
      instructions: {
        login: "Use the credentials above to login at /auth",
        changePassword: "It's recommended to change the password after first login",
      },
    });

  } catch (error: any) {
    console.error("💥 [ADMIN SEED] Error:", error);
    
    // ✅ Handle specific Prisma errors
    if (error.code === "P2002") {
      const target = error.meta?.target || [];
      let field = "Unknown";
      if (target.includes("email")) field = "Email";
      else if (target.includes("phone")) field = "Phone number";
      
      return NextResponse.json({
        success: false,
        error: `${field} already in use`,
        code: "DUPLICATE_USER",
        field: field,
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || "Failed to create admin user",
      code: error.code || "INTERNAL_ERROR",
    }, { status: 500 });
  }
}