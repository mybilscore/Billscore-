// src/app/api/mobile/user/referral/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "BIL-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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
    return null;
  }
}

export async function POST(request: NextRequest) {
  console.log("📱 [MOBILE REFERRAL] Generate referral code requested");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;

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
    console.error("❌ [MOBILE REFERRAL] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}