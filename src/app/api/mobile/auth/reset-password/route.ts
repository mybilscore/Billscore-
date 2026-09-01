// app/api/mobile/auth/reset-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { hash } from "bcrypt";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword } = await req.json();

    // Validate required fields
    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { 
          success: false,
          error: "Email, OTP, and new password are required" 
        },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return NextResponse.json(
        { 
          success: false,
          error: "Password must be at least 6 characters" 
        },
        { status: 400 }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { 
          success: false,
          error: "OTP must be 6 digits" 
        },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
      },
    });

    if (!user) {
      console.log(`❌ [MOBILE] No user found for email: ${email}`);
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid or expired reset code" 
        },
        { status: 400 }
      );
    }

    // Find the password reset record
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        token: otp,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!resetRecord) {
      console.log(`❌ [MOBILE] Invalid or expired OTP for user: ${user.email}`);
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid or expired reset code" 
        },
        { status: 400 }
      );
    }

    console.log(`✅ [MOBILE] Valid OTP found for user: ${user.email}`);

    // Hash the new password
    const hashedPassword = await hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash: hashedPassword,
      },
    });

    console.log(`✅ [MOBILE] Password updated for user: ${user.email}`);

    // Mark the reset record as used
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    // Delete any other unused reset records for this user
    await prisma.passwordReset.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
        id: { not: resetRecord.id },
      },
    });

    console.log(`✅ [MOBILE] Password reset successful for user: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Password reset successful",
      data: {
        email: user.email,
        resetAt: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error("❌ [MOBILE] Reset password error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "An unexpected error occurred" 
      },
      { status: 500 }
    );
  }
}