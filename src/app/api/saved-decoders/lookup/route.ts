// app/api/saved-decoders/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const decoderNumber = searchParams.get("decoderNumber");

  if (!decoderNumber) {
    return NextResponse.json(
      { error: "Decoder number required" },
      { status: 400 }
    );
  }

  try {
    // Use findFirst since decoderNumber might not be unique by itself
    const decoder = await prisma.savedDecoder.findFirst({
      where: { 
        decoderNumber: decoderNumber 
      },
    });

    if (!decoder) {
      return NextResponse.json(
        { error: "Decoder not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: decoder });
  } catch (error) {
    console.error("❌ Lookup decoder error:", error);
    return NextResponse.json(
      { error: "Failed to fetch decoder" },
      { status: 500 }
    );
  }
}