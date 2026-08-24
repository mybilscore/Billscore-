// app/api/saved-decoders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const body = await request.json();
    const { 
      decoderNumber, 
      provider, 
      name, 
      package: pkg, 
      isDefault,
      customerName,
      customerAddress,
      customerPhone,
      customerEmail,
      decoderStatus,
      lastVerified
    } = body;

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

    const savedDecoder = await prisma.savedDecoder.upsert({
      where: {
        userId_decoderNumber: {
          userId: sessionUser.id,
          decoderNumber: decoderNumber,
        },
      },
      update: {
        provider,
        name: name || `${provider} Decoder`,
        package: pkg || "Standard",
        customerName: customerName || null,
        customerAddress: customerAddress || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        decoderStatus: decoderStatus || null,
        lastVerified: lastVerified || new Date(),
        isDefault: isDefault || false,
      },
      create: {
        userId: sessionUser.id,
        decoderNumber,
        provider,
        name: name || `${provider} Decoder`,
        package: pkg || "Standard",
        customerName: customerName || null,
        customerAddress: customerAddress || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        decoderStatus: decoderStatus || null,
        lastVerified: lastVerified || new Date(),
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
      select: {
        id: true,
        decoderNumber: true,
        provider: true,
        name: true,
        package: true,
        isDefault: true,
        createdAt: true,
        customerName: true,
        customerAddress: true,
        customerPhone: true,
        customerEmail: true,
        decoderStatus: true,
        lastVerified: true,
      },
    });

    console.log(`📺 [GET DECODERS] Found ${decoders.length} decoders for user ${sessionUser.id}`);

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

export async function DELETE(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({
        success: false,
        error: "Decoder ID is required",
      }, { status: 400 });
    }

    const decoder = await prisma.savedDecoder.findFirst({
      where: { id, userId: sessionUser.id },
    });

    if (!decoder) {
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