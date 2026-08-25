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

// ✅ FIXED: Add async and await for params (Next.js 15)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> | { vendorId: string } }
) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // ✅ Await params for Next.js 15 compatibility
    const resolvedParams = await params;
    const { vendorId } = resolvedParams;
    
    const searchParams = new URL(request.url).searchParams;
    const network = searchParams.get("network");
    const isActiveParam = searchParams.get("isActive");
    
    // Build where clause
    const where: any = {
      vendorId,
    };

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
        { isActiveForWhatsApp: 'desc' },
        { whatsappPriority: 'asc' },
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

    // Calculate margin and include WhatsApp fields
    const plansWithMargin = plans.map(plan => ({
      ...plan,
      margin: Number(plan.ourPrice) - Number(plan.vendorPrice),
      marginPercentage: Number(plan.vendorPrice) > 0 
        ? ((Number(plan.ourPrice) - Number(plan.vendorPrice)) / Number(plan.vendorPrice)) * 100 
        : 0,
      ourPrice: Number(plan.ourPrice),
      vendorPrice: Number(plan.vendorPrice),
      isActiveForWhatsApp: plan.isActiveForWhatsApp ?? false,
      whatsappPriority: plan.whatsappPriority ?? 0,
    }));

    // Calculate stats
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
        plans: plansWithMargin,
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