// app/api/user/change-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { compare, hash } from "bcrypt";
import { authOptions } from "~/lib/auth";
import { prisma } from "~/lib/db";
import * as z from "zod";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  console.log("🔐 [CHANGE PASSWORD] Password change requested");
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = passwordSchema.parse(body);

    console.log(`🔐 [CHANGE PASSWORD] User: ${session.user.id}`);

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      console.error(`❌ [CHANGE PASSWORD] User not found: ${session.user.id}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "No password set for this account" },
        { status: 400 }
      );
    }

    // Verify current password
    const isPasswordValid = await compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      console.warn(`⚠️ [CHANGE PASSWORD] Invalid current password for user: ${user.id}`);
      
      // Log security event
      await prisma.securityEvent.create({
        data: {
          userId: user.id,
          eventType: "PASSWORD_RESET",
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
          userAgent: req.headers.get("user-agent") || undefined,
          details: { action: "failed_password_change", reason: "incorrect_current_password" },
          isBlocked: false,
        },
      });

      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 10);

    // Update password and track change
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        lastPasswordChangeAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`✅ [CHANGE PASSWORD] Password changed for user: ${user.id}`);

    // Log the activity
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_CHANGED",
        entityType: "User",
        entityId: user.id,
        metadata: { channel: "WEB_APP", timestamp: new Date().toISOString() },
      },
    });

    // Log security event
    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        eventType: "PASSWORD_RESET",
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
        userAgent: req.headers.get("user-agent") || undefined,
        details: { action: "successful_password_change" },
        isBlocked: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });

  } catch (error: any) {
    console.error("❌ [CHANGE PASSWORD] Error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to change password" },
      { status: 500 }
    );
  }
}