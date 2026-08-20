// src/app/api/mobile/user/change-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { verify } from "jsonwebtoken";
import { compare, hash } from "bcrypt";

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
    console.error("❌ [MOBILE CHANGE PASSWORD] Token verification failed:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  console.log("🔐 [MOBILE CHANGE PASSWORD] Password change requested");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`🔐 [MOBILE CHANGE PASSWORD] User: ${userId}`);

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        success: false,
        error: "Current password and new password are required",
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({
        success: false,
        error: "New password must be at least 6 characters",
      }, { status: 400 });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      console.error(`❌ [MOBILE CHANGE PASSWORD] User not found: ${userId}`);
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    if (!user.passwordHash) {
      return NextResponse.json({
        success: false,
        error: "No password set for this account",
      }, { status: 400 });
    }

    // Verify current password
    const isPasswordValid = await compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      console.warn(`⚠️ [MOBILE CHANGE PASSWORD] Invalid current password for user: ${userId}`);
      
      // Log security event
      await prisma.securityEvent.create({
        data: {
          userId: userId,
          eventType: "PASSWORD_RESET",
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
          userAgent: request.headers.get("user-agent") || undefined,
          details: { action: "failed_password_change", reason: "incorrect_current_password" },
          isBlocked: false,
        },
      });

      return NextResponse.json({
        success: false,
        error: "Current password is incorrect",
      }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 10);

    // Update password and track change
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        lastPasswordChangeAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`✅ [MOBILE CHANGE PASSWORD] Password changed for user: ${userId}`);

    // Log the activity
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: "PASSWORD_CHANGED",
        entityType: "User",
        entityId: userId,
        metadata: { channel: "MOBILE_APP", timestamp: new Date().toISOString() },
      },
    });

    // Log security event
    await prisma.securityEvent.create({
      data: {
        userId: userId,
        eventType: "PASSWORD_RESET",
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || undefined,
        details: { action: "successful_password_change" },
        isBlocked: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });

  } catch (error: any) {
    console.error("❌ [MOBILE CHANGE PASSWORD] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to change password",
    }, { status: 500 });
  }
}