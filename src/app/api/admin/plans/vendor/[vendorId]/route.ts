// bilscore-app/app/api/admin/plans/vendor/[vendorId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";

function validateApiKey(request: NextRequest): { valid: boolean; error?: string } {
  const apiKey = request.headers.get("x-api-key");
  const validApiKeys = [
    process.env.BILSCORE_API_KEY,
    process.env.BILSCORE_ADMIN_API_KEY,
    process.env.BILSCORE_EXTERNAL_API_KEY,
  ].filter(Boolean);

  if (!apiKey) {
    return { valid: false, error: "API key is required" };
  }

  if (!validApiKeys.includes(apiKey)) {
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { vendorId } = params;
    const searchParams = new URL(request.url).searchParams;
    const network = searchParams.get("network");
    const isActiveParam = searchParams.get("isActive");
    
    // ✅ Build where clause - only filter by isActive if explicitly provided
    const where: any = {
      vendorId,
    };

    // ✅ Only add isActive filter if the param is provided
    if (isActiveParam !== null) {
      where.isActive = isActiveParam !== "false";
    }

    if (network) {
      where.network = network;
    }

    const plans = await prisma.dataPlan.findMany({
      where,
      orderBy: [
        { network: 'asc' },
        { planType: 'asc' },
        { amountMB: 'asc' },
      ],
      include: {
        networkConfig: true,
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        priceHistory: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const stats = await prisma.dataPlan.groupBy({
      by: ['network'],
      where: {
        vendorId,
        isActive: true,
      },
      _count: true,
      _sum: {
        ourPrice: true,
      },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        plans,
        stats: stats.map(s => ({
          network: s.network,
          count: s._count,
          totalValue: s._sum.ourPrice || 0,
        })),
        total: plans.length,
      },
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN VENDOR PLANS API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch vendor plans",
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}