// src/app/api/mobile/user/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

async function authenticateMobile(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    console.error("❌ [MOBILE PROFILE] Token verification failed:", error);
    return null;
  }
}

// ✅ GET - Fetch profile (YOUR EXISTING CODE - UNCHANGED)
export async function GET(request: NextRequest) {
  console.log("👤 [MOBILE PROFILE] Profile fetch requested");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`👤 [MOBILE PROFILE] Fetching user: ${userId}`);

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
      },
    });

    if (!userData) {
      console.error(`❌ [MOBILE PROFILE] User not found: ${userId}`);
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    console.log(`👤 [MOBILE PROFILE] User found:`, {
      id: userData.id,
      fullName: userData.fullName,
      username: userData.username,
      email: userData.email,
      hasWallet: !!userData.wallet,
    });

    const profile = {
      id: userData.id,
      email: userData.email || "",
      username: userData.username || "",
      fullName: userData.fullName || userData.username || userData.email?.split('@')[0] || "User",
      name: userData.fullName || userData.username || userData.email?.split('@')[0] || "User",
      phone: userData.phone || "",
      role: userData.role || "END_USER",
      isVerified: userData.isVerified || false,
      hasWallet: !!userData.wallet || userData.hasWallet || false,
      walletBalance: userData.wallet ? Number(userData.wallet.walletBalance) : Number(userData.walletBalance || 0),
      referralCode: userData.referralCode || null,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      wallet: userData.wallet ? {
        id: userData.wallet.id,
        accountNumber: userData.wallet.accountNumber,
        bankName: userData.wallet.bankName,
        accountName: userData.wallet.accountName,
        walletBalance: Number(userData.wallet.walletBalance),
        ledgerBalance: Number(userData.wallet.ledgerBalance),
        isActive: userData.wallet.isActive,
        isFrozen: userData.wallet.isFrozen,
      } : null,
    };

    console.log(`👤 [MOBILE PROFILE] Sending profile:`, {
      id: profile.id,
      fullName: profile.fullName,
      username: profile.username,
    });

    return NextResponse.json({
      success: true,
      data: profile,
    });

  } catch (error: any) {
    console.error("❌ [MOBILE PROFILE] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch profile",
    }, { status: 500 });
  }
}

// ✅ PUT - Update profile (NEW - ADDED)
export async function PUT(request: NextRequest) {
  console.log("👤 [MOBILE PROFILE] Profile update requested");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`👤 [MOBILE PROFILE] Updating user: ${userId}`);

    const body = await request.json();
    const { fullName, phone, username } = body;

    // Validate input
    if (!fullName && !phone && !username) {
      return NextResponse.json({
        success: false,
        error: "At least one field is required to update",
      }, { status: 400 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (fullName) {
      updateData.fullName = fullName.trim();
    }

    if (phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone: phone.trim(),
          id: { not: userId },
        },
      });

      if (existingUser) {
        return NextResponse.json({
          success: false,
          error: "Phone number is already in use",
        }, { status: 400 });
      }

      updateData.phone = phone.trim();
    }

    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: username.trim(),
          id: { not: userId },
        },
      });

      if (existingUser) {
        return NextResponse.json({
          success: false,
          error: "Username is already taken",
        }, { status: 400 });
      }

      updateData.username = username.trim();
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        wallet: true,
      },
    });

    console.log(`✅ [MOBILE PROFILE] Profile updated for user: ${userId}`);

    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: "PROFILE_UPDATED",
        entityType: "User",
        entityId: userId,
        newValues: updateData,
        metadata: { 
          channel: "MOBILE_APP", 
          updatedFields: Object.keys(updateData).filter(k => k !== 'updatedAt') 
        },
      },
    });

    const profile = {
      id: updatedUser.id,
      email: updatedUser.email || "",
      username: updatedUser.username || "",
      fullName: updatedUser.fullName || "",
      name: updatedUser.fullName || "",
      phone: updatedUser.phone || "",
      role: updatedUser.role || "END_USER",
      isVerified: updatedUser.isVerified || false,
      hasWallet: !!updatedUser.wallet || updatedUser.hasWallet || false,
      walletBalance: updatedUser.wallet ? Number(updatedUser.wallet.walletBalance) : Number(updatedUser.walletBalance || 0),
      referralCode: updatedUser.referralCode || null,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      wallet: updatedUser.wallet ? {
        id: updatedUser.wallet.id,
        accountNumber: updatedUser.wallet.accountNumber,
        bankName: updatedUser.wallet.bankName,
        accountName: updatedUser.wallet.accountName,
        walletBalance: Number(updatedUser.wallet.walletBalance),
        ledgerBalance: Number(updatedUser.wallet.ledgerBalance),
        isActive: updatedUser.wallet.isActive,
        isFrozen: updatedUser.wallet.isFrozen,
      } : null,
    };

    return NextResponse.json({
      success: true,
      data: profile,
      message: "Profile updated successfully",
    });

  } catch (error: any) {
    console.error("❌ [MOBILE PROFILE] Update error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to update profile",
    }, { status: 500 });
  }
}