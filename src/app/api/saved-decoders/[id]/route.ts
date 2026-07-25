// app/api/saved-decoders/[id]/route.ts

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
    const { decoderNumber, provider, name, package: pkg, isDefault } = body;

    const existing = await prisma.savedDecoder.findFirst({
      where: { id, userId: sessionUser.id },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: "Decoder not found",
      }, { status: 404 });
    }

    if (isDefault) {
      await prisma.savedDecoder.updateMany({
        where: { userId: sessionUser.id },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.savedDecoder.update({
      where: { id },
      data: {
        decoderNumber: decoderNumber || existing.decoderNumber,
        provider: provider || existing.provider,
        name: name || existing.name,
        package: pkg || existing.package,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("❌ Update decoder error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to update decoder",
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

    const existing = await prisma.savedDecoder.findFirst({
      where: { id, userId: sessionUser.id },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: "Decoder not found",
      }, { status: 404 });
    }

    await prisma.savedDecoder.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Decoder deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Delete decoder error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to delete decoder",
    }, { status: 500 });
  }
}