// src/app/api/mobile/pin/set/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { verify } from "jsonwebtoken";
import { hash } from "bcrypt";

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
    console.error("❌ [MOBILE PIN SET] Token verification failed:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  console.log("🔐 [MOBILE PIN SET] PIN set requested");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`🔐 [MOBILE PIN SET] User: ${userId}`);

    const body = await request.json();
    const { pin } = body;

    // Validate input
    if (!pin) {
      return NextResponse.json({
        success: false,
        error: "PIN is required",
      }, { status: 400 });
    }

    if (pin.length < 4 || pin.length > 6) {
      return NextResponse.json({
        success: false,
        error: "PIN must be 4-6 digits",
      }, { status: 400 });
    }

    if (!/^\d+$/.test(pin)) {
      return NextResponse.json({
        success: false,
        error: "PIN must contain only numbers",
      }, { status: 400 });
    }

    // Check if user already has a PIN
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pinHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    if (user.pinHash) {
      return NextResponse.json({
        success: false,
        error: "User already has a PIN set. Use change PIN endpoint.",
      }, { status: 400 });
    }

    // Hash PIN
    const hashedPin = await hash(pin, 10);

    // Update user with PIN
    await prisma.user.update({
      where: { id: userId },
      data: {
        pinHash: hashedPin,
        pinAttempts: 0,
        pinLockedUntil: null,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ [MOBILE PIN SET] PIN set for user: ${userId}`);

    // Log the activity
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: "PIN_SET",
        entityType: "User",
        entityId: userId,
        metadata: { channel: "MOBILE_APP" },
      },
    });

    // Log security event
    await prisma.securityEvent.create({
      data: {
        userId: userId,
        eventType: "PIN_VERIFICATION",
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || undefined,
        details: { action: "pin_set" },
        isBlocked: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "PIN set successfully",
    });

  } catch (error: any) {
    console.error("❌ [MOBILE PIN SET] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to set PIN",
    }, { status: 500 });
  }
}