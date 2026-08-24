// app/api/saved-meters/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const body = await request.json();
    const { 
      meterNumber, 
      disco, 
      name, 
      meterType, 
      isDefault,
      customerName,
      customerAddress,
      customerPhone,
      customerEmail,
      meterStatus,
      lastVerified
    } = body;

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

    const savedMeter = await prisma.savedMeter.upsert({
      where: {
        userId_meterNumber: {
          userId: sessionUser.id,
          meterNumber: meterNumber,
        },
      },
      update: {
        disco,
        name: name || `${disco} Meter`,
        meterType: meterType || "Prepaid",
        customerName: customerName || null,
        customerAddress: customerAddress || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        meterStatus: meterStatus || null,
        lastVerified: lastVerified ? new Date(lastVerified) : new Date(),
        isDefault: isDefault || false,
      },
      create: {
        userId: sessionUser.id,
        meterNumber,
        disco,
        name: name || `${disco} Meter`,
        meterType: meterType || "Prepaid",
        customerName: customerName || null,
        customerAddress: customerAddress || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        meterStatus: meterStatus || null,
        lastVerified: lastVerified ? new Date(lastVerified) : new Date(),
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
      select: {
        id: true,
        meterNumber: true,
        disco: true,
        name: true,
        meterType: true,
        isDefault: true,
        createdAt: true,
        customerName: true,
        customerAddress: true,
        customerPhone: true,
        customerEmail: true,
        meterStatus: true,
        lastVerified: true,
      },
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

export async function DELETE(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({
        success: false,
        error: "Meter ID is required",
      }, { status: 400 });
    }

    const meter = await prisma.savedMeter.findFirst({
      where: { id, userId: sessionUser.id },
    });

    if (!meter) {
      return NextResponse.json({
        success: false,
        error: "Meter not found",
      }, { status: 404 });
    }

    await prisma.savedMeter.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Meter deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Delete meter error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to delete meter",
    }, { status: 500 });
  }
}