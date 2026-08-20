// src/app/api/mobile/saved-meters/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/db";

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
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    const body = await request.json();
    const { meterNumber, disco, name, meterType, isDefault } = body;

    console.log(`⚡ [MOBILE SAVE METER] Request:`, { meterNumber, disco, name, meterType, isDefault });

    if (!meterNumber || !disco) {
      return NextResponse.json({
        success: false,
        error: "Meter number and DisCo are required",
      }, { status: 400 });
    }

    // If setting as default, unset others
    if (isDefault) {
      await prisma.savedMeter.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const savedMeter = await prisma.savedMeter.create({
      data: {
        userId,
        meterNumber,
        disco,
        name: name || `${disco} Meter`,
        meterType: meterType || "Prepaid",
        isDefault: isDefault || false,
      },
    });

    console.log(`✅ [MOBILE SAVE METER] Saved: ${savedMeter.id} - ${savedMeter.meterNumber}`);

    return NextResponse.json({
      success: true,
      data: savedMeter,
    }, { status: 201 });
  } catch (error: any) {
    console.error("❌ [MOBILE SAVE METER] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to save meter",
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;

    const meters = await prisma.savedMeter.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    console.log(`⚡ [MOBILE GET METERS] Found ${meters.length} meters for user ${userId}`);

    return NextResponse.json({
      success: true,
      data: meters,
    });
  } catch (error: any) {
    console.error("❌ [MOBILE GET METERS] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch meters",
    }, { status: 500 });
  }
}