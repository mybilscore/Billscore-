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

    // Get admin details from request or use defaults
    const body = await request.json();
    
    const adminEmail = body.email || process.env.ADMIN_EMAIL || "admin@bilscore.com";
    const adminPassword = body.password || process.env.ADMIN_PASSWORD || "Admin@123456";
    const adminPhone = body.phone || process.env.ADMIN_PHONE || "08012345678";
    const adminFullName = body.fullName || process.env.ADMIN_FULL_NAME || "Bilscore Admin";
    const adminRole = body.role || process.env.ADMIN_ROLE || "SUPER_ADMIN";

    console.log("🔐 [ADMIN SEED] Creating admin user...");
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`👤 Role: ${adminRole}`);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      console.log(`✅ [ADMIN SEED] Admin user already exists: ${adminEmail}`);
      return NextResponse.json({
        success: true,
        message: "Admin user already exists",
        data: {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
          isVerified: existingUser.isVerified,
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
    if (adminRole === "SUPER_ADMIN") {
      role = UserRole.SUPER_ADMIN;
    } else if (adminRole === "ADMIN") {
      role = UserRole.ADMIN;
    } else {
      role = UserRole.SUPER_ADMIN; // Default to SUPER_ADMIN
    }

    // Create admin user with wallet
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: adminFullName,
        phone: adminPhone,
        role: role,
        passwordHash: passwordHash,
        isVerified: true,
        hasWallet: true,
        walletBalance: 0,
        wallet: {
          create: {
            accountNumber: generateVirtualAccountNumber(),
            bankName: "PALMPAY",
            accountName: adminFullName,
            walletBalance: 0,
            ledgerBalance: 0,
            isActive: true,
          },
        },
      },
    });

    console.log(`✅ [ADMIN SEED] Admin user created successfully!`);
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👤 Role: ${admin.role}`);

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
      },
      credentials: {
        email: admin.email,
        password: adminPassword,
      },
    });

  } catch (error: any) {
    console.error("💥 [ADMIN SEED] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to create admin user",
    }, { status: 500 });
  }
}