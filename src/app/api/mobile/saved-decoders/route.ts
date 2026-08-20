// src/app/api/mobile/saved-decoders/route.ts
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

export async function POST(request: NextRequest) {
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    const body = await request.json();
    const { decoderNumber, provider, name, package: pkg, isDefault } = body;

    console.log(`📺 [MOBILE SAVE DECODER] Request:`, { decoderNumber, provider, name, pkg, isDefault });

    if (!decoderNumber || !provider) {
      return NextResponse.json({
        success: false,
        error: "Decoder number and provider are required",
      }, { status: 400 });
    }

    // If setting as default, unset others
    if (isDefault) {
      await prisma.savedDecoder.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const savedDecoder = await prisma.savedDecoder.create({
      data: {
        userId,
        decoderNumber,
        provider,
        name: name || `${provider} Decoder`,
        package: pkg || "Standard",
        isDefault: isDefault || false,
      },
    });

    console.log(`✅ [MOBILE SAVE DECODER] Saved: ${savedDecoder.id} - ${savedDecoder.decoderNumber}`);

    return NextResponse.json({
      success: true,
      data: savedDecoder,
    }, { status: 201 });
  } catch (error: any) {
    console.error("❌ [MOBILE SAVE DECODER] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to save decoder",
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;

    const decoders = await prisma.savedDecoder.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    console.log(`📺 [MOBILE GET DECODERS] Found ${decoders.length} decoders for user ${userId}`);

    return NextResponse.json({
      success: true,
      data: decoders,
    });
  } catch (error: any) {
    console.error("❌ [MOBILE GET DECODERS] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch decoders",
    }, { status: 500 });
  }
}