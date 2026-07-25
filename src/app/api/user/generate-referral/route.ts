// src/app/api/user/generate-referral/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/app/api/auth/[...nextauth]/route";
import { prisma } from "~/lib/db";

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "BIL-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check if user already has a referral code
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (user?.referralCode) {
      return NextResponse.json({
        success: true,
        referralCode: user.referralCode,
        message: "Existing referral code retrieved",
      });
    }

    // Generate new referral code
    let referralCode = generateReferralCode();
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      const existing = await prisma.user.findFirst({
        where: { referralCode },
      });
      
      if (!existing) {
        exists = false;
      } else {
        referralCode = generateReferralCode();
        attempts++;
      }
    }

    if (exists) {
      return NextResponse.json(
        { success: false, error: "Failed to generate unique referral code" },
        { status: 500 }
      );
    }

    // Update user with referral code
    await prisma.user.update({
      where: { id: userId },
      data: { referralCode },
    });

    return NextResponse.json({
      success: true,
      referralCode,
      message: "Referral code generated successfully",
    });
  } catch (error) {
    console.error("Generate referral error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}