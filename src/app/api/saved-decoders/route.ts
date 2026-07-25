// app/api/saved-decoders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const body = await request.json();
    const { decoderNumber, provider, name, package: pkg, isDefault } = body;

    console.log(`📺 [SAVE DECODER] Request:`, { decoderNumber, provider, name, pkg, isDefault });

    if (!decoderNumber || !provider) {
      return NextResponse.json({
        success: false,
        error: "Decoder number and provider are required",
      }, { status: 400 });
    }

    // If setting as default, unset others
    if (isDefault) {
      await prisma.savedDecoder.updateMany({
        where: { userId: sessionUser.id },
        data: { isDefault: false },
      });
    }

    const savedDecoder = await prisma.savedDecoder.create({
      data: {
        userId: sessionUser.id,
        decoderNumber,
        provider,
        name: name || `${provider} Decoder`,
        package: pkg || "Standard",
        isDefault: isDefault || false,
      },
    });

    console.log(`✅ [SAVE DECODER] Saved: ${savedDecoder.id} - ${savedDecoder.decoderNumber}`);

    return NextResponse.json({
      success: true,
      data: savedDecoder,
    });
  } catch (error: any) {
    console.error("❌ Save decoder error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to save decoder",
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    
    const decoders = await prisma.savedDecoder.findMany({
      where: { userId: sessionUser.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    console.log(`📺 [GET DECODERS] Found ${decoders.length} decoders for user ${sessionUser.id}`);
    console.log(`📺 [GET DECODERS] Decoders:`, decoders.map(d => ({ 
      id: d.id, 
      decoderNumber: d.decoderNumber, 
      provider: d.provider,
      name: d.name,
      package: d.package
    })));

    return NextResponse.json({
      success: true,
      data: decoders,
    });
  } catch (error: any) {
    console.error("❌ Fetch decoders error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch decoders",
    }, { status: 500 });
  }
}