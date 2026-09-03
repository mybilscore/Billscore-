// app/api/saved-meters/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const meterNumber = searchParams.get("meterNumber");
  const userId = searchParams.get("userId");
  const includeUser = searchParams.get("includeUser") === "true";

  if (!meterNumber) {
    return NextResponse.json(
      { error: "Meter number required" },
      { status: 400 }
    );
  }

  try {
    // Build where clause
    const where: any = { 
      meterNumber: meterNumber 
    };
    
    // Filter by userId if provided
    if (userId) {
      where.userId = userId;
    }

    // Use findFirst - meterNumber should be unique per user
    const meter = await prisma.savedMeter.findFirst({
      where: where,
      include: includeUser ? {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            hasWallet: true,
            wallet: {
              select: {
                walletBalance: true,
              },
            },
          },
        },
      } : undefined,
    });

    if (!meter) {
      return NextResponse.json(
        { error: "Meter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: meter });
  } catch (error) {
    console.error("❌ Lookup meter error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meter" },
      { status: 500 }
    );
  }
}