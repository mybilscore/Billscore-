// bilscore-app/app/api/vendors/plans/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { NetworkProvider, PlanStatus, VtuType } from "@prisma/client";

// ✅ Get active vendor for a specific service
async function getActiveVendor(serviceType: string) {
  const vendorService = await prisma.vendorService.findFirst({
    where: {
      serviceType: serviceType as VtuType,
      isActive: true,
    },
    include: {
      vendor: true,
    },
    orderBy: {
      priority: 'asc',
    },
  });

  return vendorService;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const network = searchParams.get("network") as NetworkProvider | null;
    const serviceType = searchParams.get("serviceType") || "DATA";

    console.log(`📊 [VENDOR PLANS API] Fetching plans for ${serviceType}${network ? ` (${network})` : ''}`);

    // ✅ Get the active vendor for this service
    const vendorService = await getActiveVendor(serviceType);

    if (!vendorService) {
      console.log(`⚠️ [VENDOR PLANS API] No active vendor found for ${serviceType}`);
      return NextResponse.json({
        success: false,
        error: `No active vendor found for ${serviceType}`,
        data: {
          plans: [],
          networks: [],
          vendor: null,
        },
      }, { status: 200 });
    }

    console.log(`✅ [VENDOR PLANS API] Active vendor: ${vendorService.vendor.name} (${vendorService.vendor.code})`);

    // ✅ Build where clause
    const where: any = {
      vendorId: vendorService.vendorId,
      isActive: true,
      status: PlanStatus.ACTIVE,
    };

    if (network) {
      where.network = network;
    }

    // ✅ Fetch plans from database
    const plans = await prisma.dataPlan.findMany({
      where,
      orderBy: [
        { network: 'asc' },
        { planType: 'asc' },
        { amountMB: 'asc' },
      ],
      include: {
        networkConfig: true,
      },
    });

    console.log(`📊 [VENDOR PLANS API] Found ${plans.length} plans`);

    // ✅ Get all networks for filter
    const networks = await prisma.networkConfig.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    // ✅ Group plans by network
    const groupedByNetwork: Record<string, any> = {};

    for (const plan of plans) {
      const networkKey = plan.network;
      if (!groupedByNetwork[networkKey]) {
        groupedByNetwork[networkKey] = {
          id: networkKey.toLowerCase(),
          name: plan.networkConfig?.displayName || networkKey,
          code: plan.networkConfig?.code || networkKey,
          color: plan.networkConfig?.color || '#000000',
          iconPath: plan.networkConfig?.logo || `/networks/${networkKey.toLowerCase()}.jpg`,
          categories: {},
        };
      }

      const planTypeKey = plan.planType;
      if (!groupedByNetwork[networkKey].categories[planTypeKey]) {
        groupedByNetwork[networkKey].categories[planTypeKey] = {
          id: planTypeKey.toLowerCase(),
          name: planTypeKey,
          plans: [],
        };
      }

      groupedByNetwork[networkKey].categories[planTypeKey].plans.push({
        id: plan.id,
        name: plan.name,
        data: plan.amountMB >= 1024 
          ? `${(plan.amountMB / 1024).toFixed(1)}GB` 
          : `${plan.amountMB}MB`,
        price: Number(plan.ourPrice),
        validity: `${plan.validity} ${plan.validityUnit}`.toLowerCase(),
        planCode: plan.vendorPlanId,
        vendorPrice: Number(plan.vendorPrice),
        description: plan.description,
        amountMB: plan.amountMB,
      });
    }

    // ✅ Convert grouped data to array format matching frontend expectations
    const formattedPlans = Object.keys(groupedByNetwork).map((networkKey) => ({
      ...groupedByNetwork[networkKey],
      categories: Object.keys(groupedByNetwork[networkKey].categories).map((catKey) => ({
        id: catKey.toLowerCase(),
        name: catKey,
        plans: groupedByNetwork[networkKey].categories[catKey].plans,
      })),
    }));

    console.log(`📊 [VENDOR PLANS API] Formatted ${formattedPlans.length} providers`);

    const response = NextResponse.json({
      success: true,
      data: {
        vendor: {
          id: vendorService.vendor.id,
          name: vendorService.vendor.name,
          code: vendorService.vendor.code,
        },
        networks: networks.map(n => ({
          id: n.id,
          name: n.displayName,
          code: n.code,
          color: n.color,
          logo: n.logo,
          network: n.network,
        })),
        plans: formattedPlans,
        totalPlans: plans.length,
        serviceType,
      },
    });

    // ✅ CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;

  } catch (error: any) {
    console.error("💥 [VENDOR PLANS API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch plans",
      data: {
        plans: [],
        networks: [],
        vendor: null,
      },
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}