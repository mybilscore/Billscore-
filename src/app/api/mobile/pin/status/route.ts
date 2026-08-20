// src/app/api/mobile/pin/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { verify } from "jsonwebtoken";

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
    console.error("❌ [MOBILE PIN STATUS] Token verification failed:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  console.log("🔐 [MOBILE PIN STATUS] PIN status requested");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`🔐 [MOBILE PIN STATUS] User: ${userId}`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pinHash: true,
        pinAttempts: true,
        pinLockedUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    const hasPin = !!user.pinHash;
    const isLocked = user.pinLockedUntil && new Date(user.pinLockedUntil) > new Date();
    const remainingAttempts = hasPin ? MAX_PIN_ATTEMPTS - (user.pinAttempts || 0) : 0;

    return NextResponse.json({
      success: true,
      data: {
        hasPin,
        isLocked,
        remainingAttempts: Math.max(0, remainingAttempts),
        lockedUntil: isLocked ? user.pinLockedUntil : null,
      },
    });

  } catch (error: any) {
    console.error("❌ [MOBILE PIN STATUS] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to get PIN status",
    }, { status: 500 });
  }
}