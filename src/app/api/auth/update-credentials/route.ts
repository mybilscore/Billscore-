// app/api/auth/update-credentials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { hash, compare } from "bcrypt";
import { z } from "zod";

const updateSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password is required"),
  newPin: z.string().min(4, "PIN must be at least 4 digits").max(6, "PIN must be at most 6 digits"),
  confirmPin: z.string().min(4, "Confirm PIN is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => data.newPin === data.confirmPin, {
  message: "PINs do not match",
  path: ["confirmPin"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = updateSchema.parse(body);

    // Find the audit log with this token
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: "WHATSAPP_REGISTRATION",
        metadata: {
          path: "$.changeToken",
          equals: validated.token,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    if (auditLogs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 404 }
      );
    }

    const auditLog = auditLogs[0];
    const metadata = auditLog.metadata as any;
    const expiry = metadata?.changeTokenExpiry;
    
    if (expiry && new Date(expiry) < new Date()) {
      return NextResponse.json(
        { success: false, error: "This link has expired. Please request a new one." },
        { status: 410 }
      );
    }

    // Check if token was already used
    if (metadata?.tokenUsed === true) {
      return NextResponse.json(
        { success: false, error: "This link has already been used. Please request a new one." },
        { status: 410 }
      );
    }

    const userId = auditLog.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        pinHash: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if new password is same as old
    const isSamePassword = await compare(validated.newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { success: false, error: "New password must be different from your current password" },
        { status: 400 }
      );
    }

    // Hash new credentials
    const hashedPassword = await hash(validated.newPassword, 10);
    const hashedPin = await hash(validated.newPin, 10);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        pinHash: hashedPin,
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    // Mark the token as used by updating the audit log
    await prisma.auditLog.update({
      where: { id: auditLog.id },
      data: {
        metadata: {
          ...metadata,
          tokenUsedAt: new Date().toISOString(),
          tokenUsed: true,
        },
      },
    });

    // Log the credential update
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREDENTIALS_UPDATED",
        entityType: "User",
        entityId: user.id,
        metadata: {
          source: "whatsapp_credentials_update",
          timestamp: new Date().toISOString(),
          ipAddress: request.headers.get("x-forwarded-for") || undefined,
          userAgent: request.headers.get("user-agent") || undefined,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password and PIN updated successfully! You can now use your new credentials.",
    });

  } catch (error: any) {
    console.error("Credentials update error:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to update credentials" },
      { status: 500 }
    );
  }
}