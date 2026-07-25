// app/api/saved-meters/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const body = await request.json();
    const { meterNumber, disco, name, meterType, isDefault } = body;

    if (!meterNumber || !disco) {
      return NextResponse.json({
        success: false,
        error: "Meter number and DisCo are required",
      }, { status: 400 });
    }

    // If setting as default, unset others
    if (isDefault) {
      await prisma.savedMeter.updateMany({
        where: { userId: sessionUser.id },
        data: { isDefault: false },
      });
    }

    const savedMeter = await prisma.savedMeter.create({
      data: {
        userId: sessionUser.id,
        meterNumber,
        disco,
        name: name || `${disco} Meter`,
        meterType: meterType || "Prepaid",
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json({
      success: true,
      data: savedMeter,
    });
  } catch (error: any) {
    console.error("❌ Save meter error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to save meter",
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    
    const meters = await prisma.savedMeter.findMany({
      where: { userId: sessionUser.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      data: meters,
    });
  } catch (error: any) {
    console.error("❌ Fetch meters error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch meters",
    }, { status: 500 });
  }
}