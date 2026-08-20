// bilscore-app/app/api/admin/plans/stats/route.ts

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

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const vendorId = searchParams.get("vendorId");

    const where: any = { isActive: true };
    if (vendorId) {
      where.vendorId = vendorId;
    }

    const [total, byNetwork, byPlanType, priceStats, vendorStats] = await Promise.all([
      prisma.dataPlan.count({ where }),
      prisma.dataPlan.groupBy({
        by: ['network'],
        where,
        _count: true,
        _sum: { ourPrice: true },
      }),
      prisma.dataPlan.groupBy({
        by: ['planType'],
        where,
        _count: true,
      }),
      prisma.dataPlan.aggregate({
        where,
        _avg: { ourPrice: true },
        _min: { ourPrice: true },
        _max: { ourPrice: true },
        _sum: { ourPrice: true },
      }),
      prisma.dataPlan.groupBy({
        by: ['vendorId'],
        where,
        _count: true,
        _sum: { ourPrice: true },
      }),
    ]);

    const response = NextResponse.json({
      success: true,
      data: {
        total,
        byNetwork: byNetwork.map(n => ({
          network: n.network,
          count: n._count,
          totalValue: n._sum.ourPrice || 0,
        })),
        byPlanType: byPlanType.map(p => ({
          planType: p.planType,
          count: p._count,
        })),
        priceStats: {
          average: priceStats._avg.ourPrice || 0,
          min: priceStats._min.ourPrice || 0,
          max: priceStats._max.ourPrice || 0,
          total: priceStats._sum.ourPrice || 0,
        },
        vendorStats: await Promise.all(vendorStats.map(async (v) => {
          const vendor = await prisma.vendor.findUnique({
            where: { id: v.vendorId },
            select: { id: true, name: true, code: true },
          });
          return {
            vendorId: v.vendorId,
            vendorName: vendor?.name || 'Unknown',
            vendorCode: vendor?.code || 'Unknown',
            count: v._count,
            totalValue: v._sum.ourPrice || 0,
          };
        })),
      },
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN PLAN STATS API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch plan stats",
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