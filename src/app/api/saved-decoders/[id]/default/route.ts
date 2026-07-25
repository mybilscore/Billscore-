// app/api/saved-decoders/[id]/default/route.ts

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

    const existing = await prisma.savedDecoder.findFirst({
      where: { id, userId: sessionUser.id },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: "Decoder not found",
      }, { status: 404 });
    }

    await prisma.savedDecoder.updateMany({
      where: { userId: sessionUser.id },
      data: { isDefault: false },
    });

    const updated = await prisma.savedDecoder.update({
      where: { id },
      data: { isDefault: true },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("❌ Set default decoder error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to set default",
    }, { status: 500 });
  }
}