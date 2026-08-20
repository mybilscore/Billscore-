// src/app/api/mobile/saved-decoders/[id]/default/route.ts
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

    // Remove default from all decoders
    await prisma.savedDecoder.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set the selected decoder as default
    const decoder = await prisma.savedDecoder.update({
      where: { id, userId },
      data: { isDefault: true },
    });

    return NextResponse.json({
      success: true,
      data: decoder,
    });
  } catch (error: any) {
    console.error("❌ [MOBILE SET DEFAULT DECODER] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to set default decoder",
    }, { status: 500 });
  }
}