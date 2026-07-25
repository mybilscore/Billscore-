// src/app/api/referral/validate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { valid: false, error: "Referral code is required" },
        { status: 400 }
      );
    }

    // Validate format
    const referralRegex = /^BIL-[A-Z0-9]{6}$/;
    if (!referralRegex.test(code)) {
      return NextResponse.json(
        { valid: false, error: "Invalid referral code format" },
        { status: 400 }
      );
    }

    // Check if code exists
    const user = await prisma.user.findFirst({
      where: { referralCode: code },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { valid: false, error: "Referral code not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      referrer: {
        id: user.id,
        name: user.fullName,
        email: user.email,
      },
      bonus: 50, // ₦50 bonus for referrer
    });
  } catch (error) {
    console.error("Referral validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}