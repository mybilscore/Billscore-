// app/api/saved-meters/[id]/default/route.ts

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

    const existing = await prisma.savedMeter.findFirst({
      where: { id, userId: sessionUser.id },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: "Meter not found",
      }, { status: 404 });
    }

    // Unset all defaults for this user
    await prisma.savedMeter.updateMany({
      where: { userId: sessionUser.id },
      data: { isDefault: false },
    });

    // Set this as default
    const updated = await prisma.savedMeter.update({
      where: { id },
      data: { isDefault: true },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("❌ Set default meter error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to set default",
    }, { status: 500 });
  }
}