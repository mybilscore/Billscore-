// src/app/api/mobile/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { sendPasswordResetEmail } from "~/lib/email";

// ✅ Make sure this is a named export, not default
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { 
          success: false,
          error: "Email is required" 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false,
          error: "Please enter a valid email address" 
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
      },
    });

    console.log(`🔍 [MOBILE] Password reset requested for email: ${email}`);
    console.log(`📊 [MOBILE] User found: ${!!user}`);

    // If user exists, send reset code
    if (user) {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in database with expiration (10 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Delete any existing OTP for this user
      await prisma.passwordReset.deleteMany({
        where: { userId: user.id },
      });

      // Create new OTP record
      const passwordReset = await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: otp,
          expiresAt,
        },
      });

      console.log(`✅ [MOBILE] Password reset record created with ID: ${passwordReset.id}`);
      console.log(`🔑 [MOBILE] OTP: ${otp} (will expire at ${expiresAt})`);

      const userName = user.fullName || user.email?.split('@')[0] || "User";

      console.log(`📧 [MOBILE] Sending password reset email to: ${user.email}`);
      console.log(`👤 [MOBILE] User name: ${userName}`);
      
      // Send email with OTP
      const emailSent = await sendPasswordResetEmail(
        user.email,
        userName,
        otp,
        `${process.env.NEXT_PUBLIC_APP_URL}/auth?reset=true`
      );

      if (emailSent) {
        console.log(`✅ [MOBILE] Password reset email sent successfully to ${user.email}`);
      } else {
        console.error(`❌ [MOBILE] Failed to send password reset email to ${user.email}`);
      }
    } else {
      console.log(`❌ [MOBILE] No user found for email: ${email}`);
    }

    // Always return success to prevent user enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset code has been sent.",
      data: {
        email: email,
        otpSent: !!user,
      }
    });

  } catch (error) {
    console.error("❌ [MOBILE] Forgot password error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "An unexpected error occurred. Please try again later." 
      },
      { status: 500 }
    );
  }
}

// ✅ Add OPTIONS handler
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}