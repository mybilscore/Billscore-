// src/app/api/mobile/pin/change/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { verify } from "jsonwebtoken";
import { compare, hash } from "bcrypt";

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
    console.error("❌ [MOBILE PIN CHANGE] Token verification failed:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  console.log("🔐 [MOBILE PIN CHANGE] PIN change requested");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`🔐 [MOBILE PIN CHANGE] User: ${userId}`);

    const body = await request.json();
    const { oldPin, newPin } = body;

    // Validate input
    if (!oldPin || !newPin) {
      return NextResponse.json({
        success: false,
        error: "Old PIN and new PIN are required",
      }, { status: 400 });
    }

    if (newPin.length < 4 || newPin.length > 6) {
      return NextResponse.json({
        success: false,
        error: "PIN must be 4-6 digits",
      }, { status: 400 });
    }

    if (!/^\d+$/.test(newPin)) {
      return NextResponse.json({
        success: false,
        error: "PIN must contain only numbers",
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
      console.error(`❌ [MOBILE PIN CHANGE] User not found: ${userId}`);
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    if (!user.pinHash) {
      return NextResponse.json({
        success: false,
        error: "No PIN set. Please set a PIN first.",
      }, { status: 400 });
    }

    // Check if PIN is locked
    if (user.pinLockedUntil && new Date(user.pinLockedUntil) > new Date()) {
      const remainingMs = new Date(user.pinLockedUntil).getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return NextResponse.json({
        success: false,
        error: `PIN is locked. Try again in ${remainingMinutes} minute(s).`,
      }, { status: 400 });
    }

    // Verify old PIN
    const isPinValid = await compare(oldPin, user.pinHash);
    
    // If invalid, increment attempts
    if (!isPinValid) {
      const newAttempts = (user.pinAttempts || 0) + 1;
      const updateData: any = {
        pinAttempts: newAttempts,
        updatedAt: new Date(),
      };

      // Lock if max attempts exceeded
      if (newAttempts >= MAX_PIN_ATTEMPTS) {
        updateData.pinLockedUntil = new Date(Date.now() + PIN_LOCK_DURATION_MS);
        console.warn(`🔐 [MOBILE PIN CHANGE] PIN locked for user: ${userId}`);
        
        await prisma.securityEvent.create({
          data: {
            userId: userId,
            eventType: "PIN_VERIFICATION",
            ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
            userAgent: request.headers.get("user-agent") || undefined,
            details: { action: "pin_locked", attempts: newAttempts },
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
      }, { status: 400 });
    }

    // PIN is valid - reset attempts and update
    const hashedPin = await hash(newPin, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        pinHash: hashedPin,
        pinAttempts: 0,
        pinLockedUntil: null,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ [MOBILE PIN CHANGE] PIN changed for user: ${userId}`);

    // Log the activity
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: "PIN_CHANGED",
        entityType: "User",
        entityId: userId,
        metadata: { channel: "MOBILE_APP" },
      },
    });

    return NextResponse.json({
      success: true,
      message: "PIN changed successfully",
    });

  } catch (error: any) {
    console.error("❌ [MOBILE PIN CHANGE] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to change PIN",
    }, { status: 500 });
  }
}