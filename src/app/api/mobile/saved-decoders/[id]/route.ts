// src/app/api/mobile/saved-decoders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/db";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

async function authenticateMobile(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    const { id } = params;
    const body = await request.json();
    const { decoderNumber, provider, name, package: pkg, isDefault } = body;

    const existing = await prisma.savedDecoder.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: "Decoder not found",
      }, { status: 404 });
    }

    if (isDefault) {
      await prisma.savedDecoder.updateMany({
        where: { userId },
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
    console.error("❌ [MOBILE UPDATE DECODER] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to update decoder",
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    const { id } = params;

    const existing = await prisma.savedDecoder.findFirst({
      where: { id, userId },
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
    console.error("❌ [MOBILE DELETE DECODER] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to delete decoder",
    }, { status: 500 });
  }
}