// app/api/user/pin/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { compare, hash } from "bcrypt";
import { authOptions } from "~/lib/auth";
import { prisma } from "~/lib/db";
import * as z from "zod";

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const pinSchema = z.object({
  pin: z.string().min(4, "PIN must be at least 4 digits").max(6, "PIN must be at most 6 digits").regex(/^\d+$/, "PIN must contain only numbers"),
  currentPin: z.string().min(4, "Current PIN must be at least 4 digits").max(6, "Current PIN must be at most 6 digits").regex(/^\d+$/, "PIN must contain only numbers").optional(),
  mode: z.enum(["create", "change", "verify"]).default("create"),
});

export async function POST(req: NextRequest) {
  console.log("🔐 [WEB PIN] PIN operation requested");
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { pin, currentPin, mode } = pinSchema.parse(body);

    console.log(`🔐 [WEB PIN] Mode: ${mode}, User: ${session.user.id}`);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        pinHash: true,
        pinAttempts: true,
        pinLockedUntil: true,
      },
    });

    if (!user) {
      console.error(`❌ [WEB PIN] User not found: ${session.user.id}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if PIN is locked
    if (user.pinLockedUntil && new Date(user.pinLockedUntil) > new Date()) {
      const remainingMs = new Date(user.pinLockedUntil).getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return NextResponse.json(
        { error: `PIN is locked. Try again in ${remainingMinutes} minute(s).` },
        { status: 403 }
      );
    }

    if (mode === "create") {
      // Check if user already has a PIN
      if (user.pinHash) {
        return NextResponse.json(
          { error: "You already have a PIN. Use change mode to update it." },
          { status: 400 }
        );
      }

      // Hash and save the new PIN
      const hashedPin = await hash(pin, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pinHash: hashedPin,
          pinAttempts: 0,
          pinLockedUntil: null,
        },
      });

      console.log(`✅ [WEB PIN] PIN created for user: ${user.id}`);

      // Log the activity
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "PIN_CREATED",
          entityType: "User",
          entityId: user.id,
          metadata: { channel: "WEB_APP" },
        },
      });

      return NextResponse.json({
        success: true,
        message: "PIN set successfully",
      });
    }

    if (mode === "change") {
      // Verify current PIN exists
      if (!currentPin) {
        return NextResponse.json(
          { error: "Current PIN is required" },
          { status: 400 }
        );
      }

      // Check if user has a PIN
      if (!user.pinHash) {
        return NextResponse.json(
          { error: "You don't have a PIN set. Use create mode to set one." },
          { status: 400 }
        );
      }

      // Verify current PIN
      const isValid = await compare(currentPin, user.pinHash);
      if (!isValid) {
        // Increment failed attempts
        const attempts = (user.pinAttempts || 0) + 1;
        let lockData: any = {
          pinAttempts: attempts,
        };
        
        if (attempts >= MAX_PIN_ATTEMPTS) {
          lockData.pinLockedUntil = new Date(Date.now() + PIN_LOCK_DURATION_MS);
          console.warn(`🔐 [WEB PIN] PIN locked for user: ${user.id}`);
          
          // Log security event
          await prisma.securityEvent.create({
            data: {
              userId: user.id,
              eventType: "PIN_VERIFICATION",
              ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
              userAgent: req.headers.get("user-agent") || undefined,
              details: { action: "pin_locked", attempts },
              isBlocked: true,
              blockedReason: "BRUTE_FORCE",
              blockedUntil: lockData.pinLockedUntil,
            },
          });
        }

        await prisma.user.update({
          where: { id: user.id },
          data: lockData,
        });

        const remaining = MAX_PIN_ATTEMPTS - attempts;
        return NextResponse.json(
          { 
            error: `Invalid PIN. ${remaining > 0 ? `${remaining} attempts remaining` : "Account locked for 30 minutes"}` 
          },
          { status: 403 }
        );
      }

      // Reset attempts on success
      // Hash and save the new PIN
      const hashedPin = await hash(pin, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pinHash: hashedPin,
          pinAttempts: 0,
          pinLockedUntil: null,
        },
      });

      console.log(`✅ [WEB PIN] PIN changed for user: ${user.id}`);

      // Log the activity
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "PIN_CHANGED",
          entityType: "User",
          entityId: user.id,
          metadata: { channel: "WEB_APP" },
        },
      });

      return NextResponse.json({
        success: true,
        message: "PIN changed successfully",
      });
    }

    if (mode === "verify") {
      // Verify PIN
      if (!user.pinHash) {
        return NextResponse.json(
          { error: "You don't have a PIN set" },
          { status: 400 }
        );
      }

      const isValid = await compare(pin, user.pinHash);
      if (!isValid) {
        const attempts = (user.pinAttempts || 0) + 1;
        let lockData: any = {
          pinAttempts: attempts,
        };
        
        if (attempts >= MAX_PIN_ATTEMPTS) {
          lockData.pinLockedUntil = new Date(Date.now() + PIN_LOCK_DURATION_MS);
          console.warn(`🔐 [WEB PIN] PIN locked for user: ${user.id}`);
          
          await prisma.securityEvent.create({
            data: {
              userId: user.id,
              eventType: "PIN_VERIFICATION",
              ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
              userAgent: req.headers.get("user-agent") || undefined,
              details: { action: "pin_locked_verification", attempts },
              isBlocked: true,
              blockedReason: "BRUTE_FORCE",
              blockedUntil: lockData.pinLockedUntil,
            },
          });
        }

        await prisma.user.update({
          where: { id: user.id },
          data: lockData,
        });

        const remaining = MAX_PIN_ATTEMPTS - attempts;
        return NextResponse.json(
          { 
            error: `Invalid PIN. ${remaining > 0 ? `${remaining} attempts remaining` : "Account locked for 30 minutes"}` 
          },
          { status: 403 }
        );
      }

      // Reset attempts on success
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pinAttempts: 0,
          pinLockedUntil: null,
        },
      });

      console.log(`✅ [WEB PIN] PIN verified for user: ${user.id}`);

      return NextResponse.json({
        success: true,
        message: "PIN verified successfully",
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error) {
    console.error("❌ [WEB PIN] Error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process PIN request" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  console.log("🔐 [WEB PIN] PIN removal requested");
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user has a PIN before removing
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        pinHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.pinHash) {
      return NextResponse.json(
        { error: "No PIN set" },
        { status: 400 }
      );
    }

    // Remove the PIN
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinHash: null,
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    console.log(`✅ [WEB PIN] PIN removed for user: ${user.id}`);

    // Log the activity
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PIN_REMOVED",
        entityType: "User",
        entityId: user.id,
        metadata: { channel: "WEB_APP" },
      },
    });

    return NextResponse.json({
      success: true,
      message: "PIN removed successfully",
    });
  } catch (error) {
    console.error("❌ [WEB PIN] Remove error:", error);
    return NextResponse.json(
      { error: "Failed to remove PIN" },
      { status: 500 }
    );
  }
}