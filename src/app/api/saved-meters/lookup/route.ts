// app/api/saved-meters/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const meterNumber = searchParams.get("meterNumber");

  if (!meterNumber) {
    return NextResponse.json(
      { error: "Meter number required" },
      { status: 400 }
    );
  }

  try {
    // Use findFirst instead of findUnique since meterNumber is not unique by itself
    const meter = await prisma.savedMeter.findFirst({
      where: { 
        meterNumber: meterNumber 
      },
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