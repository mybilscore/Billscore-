// app/api/saved-meters/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ Make params a Promise
) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const { id } = await params; // ✅ Await params
    const body = await request.json();
    const { meterNumber, disco, name, meterType, isDefault } = body;

    const existing = await prisma.savedMeter.findFirst({
      where: { id, userId: sessionUser.id },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: "Meter not found",
      }, { status: 404 });
    }

    if (isDefault) {
      await prisma.savedMeter.updateMany({
        where: { userId: sessionUser.id },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.savedMeter.update({
      where: { id },
      data: {
        meterNumber: meterNumber || existing.meterNumber,
        disco: disco || existing.disco,
        name: name || existing.name,
        meterType: meterType || existing.meterType,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("❌ Update meter error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to update meter",
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ Make params a Promise
) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const { id } = await params; // ✅ Await params

    const existing = await prisma.savedMeter.findFirst({
      where: { id, userId: sessionUser.id },
    });

    if (!existing) {
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