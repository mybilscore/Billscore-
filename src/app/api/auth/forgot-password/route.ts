import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { sendPasswordResetEmail } from "~/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Find user by email with party information
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        party: {
          include: {
            individual: true,
            organization: true,
            community: true,
          },
        },
      },
    });

    console.log(`🔍 Password reset requested for email: ${email}`);
    console.log(`📊 User found: ${!!user}`);

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

      console.log(`✅ Password reset record created with ID: ${passwordReset.id}`);
      console.log(`🔑 OTP: ${otp} (will expire at ${expiresAt})`);

      // Get user's name
      let userName = user.email?.split('@')[0] || "User";
      if (user.party) {
        if (user.party.individual) {
          userName = `${user.party.individual.first_name} ${user.party.individual.last_name}`;
        } else if (user.party.organization) {
          userName = user.party.organization.name;
        } else if (user.party.community) {
          userName = user.party.community.name;
        }
      }

      console.log(`📧 Sending password reset email to: ${user.email}`);
      console.log(`👤 User name: ${userName}`);
      
      // Send email with OTP
      const emailSent = await sendPasswordResetEmail(
        user.email,
        userName,
        otp,
        `${process.env.NEXT_PUBLIC_APP_URL}/auth?reset=true`
      );

      if (emailSent) {
        console.log(`✅ Password reset email sent successfully to ${user.email}`);
      } else {
        console.error(`❌ Failed to send password reset email to ${user.email}`);
        console.error(`📧 Check: RESEND_API_KEY=${!!process.env.RESEND_API_KEY}, EMAIL_FROM=${process.env.EMAIL_FROM}`);
      }
    } else {
      console.log(`❌ No user found for email: ${email}`);
    }

    // Always return success to prevent user enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset code has been sent.",
    });

  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}