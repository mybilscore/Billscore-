// src/app/api/mobile/pin/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { verify } from "jsonwebtoken";
import { compare } from "bcrypt";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

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
    console.error("❌ [MOBILE PIN VERIFY] Token verification failed:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  console.log("🔐 [MOBILE PIN VERIFY] PIN verification requested");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`🔐 [MOBILE PIN VERIFY] User: ${userId}`);

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

    // Get user with PIN
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pinHash: true,
        pinAttempts: true,
        pinLockedUntil: true,
      },
    });

    if (!user) {
      console.error(`❌ [MOBILE PIN VERIFY] User not found: ${userId}`);
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    if (!user.pinHash) {
      return NextResponse.json({
        success: false,
        error: "No PIN set for this user",
      }, { status: 400 });
    }

    // Check if PIN is locked
    if (user.pinLockedUntil && new Date(user.pinLockedUntil) > new Date()) {
      const remainingMs = new Date(user.pinLockedUntil).getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return NextResponse.json({
        success: false,
        error: `PIN is locked. Try again in ${remainingMinutes} minute(s).`,
        isLocked: true,
        lockedUntil: user.pinLockedUntil,
      }, { status: 400 });
    }

    // Verify PIN
    const isPinValid = await compare(pin, user.pinHash);
    
    // If invalid, increment attempts
    if (!isPinValid) {
      const newAttempts = (user.pinAttempts || 0) + 1;
      const updateData: any = {
        pinAttempts: newAttempts,
        updatedAt: new Date(),
      };

      let isLocked = false;
      if (newAttempts >= MAX_PIN_ATTEMPTS) {
        updateData.pinLockedUntil = new Date(Date.now() + PIN_LOCK_DURATION_MS);
        isLocked = true;
        console.warn(`🔐 [MOBILE PIN VERIFY] PIN locked for user: ${userId}`);
        
        await prisma.securityEvent.create({
          data: {
            userId: userId,
            eventType: "PIN_VERIFICATION",
            ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
            userAgent: request.headers.get("user-agent") || undefined,
            details: { action: "pin_locked_verification", attempts: newAttempts },
            isBlocked: true,
            blockedReason: "BRUTE_FORCE",
            blockedUntil: updateData.pinLockedUntil,
          },
        });
      }

      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      const remainingAttempts = MAX_PIN_ATTEMPTS - newAttempts;
      return NextResponse.json({
        success: false,
        error: `Invalid PIN. ${remainingAttempts} attempt(s) remaining.`,
        attemptsLeft: remainingAttempts,
        isLocked: isLocked,
      }, { status: 400 });
    }

    // PIN is valid - reset attempts
    await prisma.user.update({
      where: { id: userId },
      data: {
        pinAttempts: 0,
        pinLockedUntil: null,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ [MOBILE PIN VERIFY] PIN verified for user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: "PIN verified successfully",
    });

  } catch (error: any) {
    console.error("❌ [MOBILE PIN VERIFY] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to verify PIN",
    }, { status: 500 });
  }
}