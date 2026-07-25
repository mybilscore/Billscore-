import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { hash } from "bcrypt";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Email, OTP, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        party: {
          include: {
            individual: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset code" },
        { status: 400 }
      );
    }

    // Find the password reset record
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        token: otp,
        expiresAt: { gt: new Date() },
        used: false,
      },
    });

    if (!resetRecord) {
      console.log(`❌ Invalid or expired OTP for user: ${user.email}`);
      return NextResponse.json(
        { error: "Invalid or expired reset code" },
        { status: 400 }
      );
    }

    console.log(`✅ Valid OTP found for user: ${user.email}`);

    // Hash the new password
    const hashedPassword = await hash(newPassword, 10);

    // Update password based on where it's stored
    if (user.party?.individual) {
      // Update individual party password
      await prisma.individual_party.update({
        where: { id: user.party.individual.id },
        data: { password_hash: hashedPassword },
      });
      console.log(`✅ Password updated in individual_party for user: ${user.email}`);
    } else if (user.password !== undefined) {
      // Update user model if it has password field
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      console.log(`✅ Password updated in user model for: ${user.email}`);
    } else {
      console.error(`❌ No password field found for user: ${user.email}`);
      return NextResponse.json(
        { error: "Unable to update password. Please contact support." },
        { status: 500 }
      );
    }

    // Mark the reset record as used
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    // Delete any other reset records for this user
    await prisma.passwordReset.deleteMany({
      where: {
        userId: user.id,
        id: { not: resetRecord.id },
      },
    });

    console.log(`✅ Password reset successful for user: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Password reset successful",
    });

  } catch (error) {
    console.error("❌ Reset password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}