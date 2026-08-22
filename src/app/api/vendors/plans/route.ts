// bilscore-app/app/api/vendors/plans/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { NetworkProvider, PlanStatus, VtuType } from "@prisma/client";

// ✅ Map plan to category based on validity
function getPlanCategory(plan: any): string {
  // If plan has explicit category, use it
  if (plan.category) {
    return plan.category;
  }

  // If planType is SME, keep as SME
  if (plan.planType?.toUpperCase() === 'SME') {
    return 'SME';
  }

  // For GIFTING or other types, determine by validity
  const validity = plan.validity || 0;
  const unit = plan.validityUnit?.toUpperCase() || 'DAYS';

  // Map based on validity duration
  if (unit === 'HOURS' || unit === 'MINUTES') {
    return 'Hourly';
  }
  
  if (unit === 'DAYS') {
    if (validity <= 1) return 'Daily';
    if (validity <= 7) return 'Weekly';
    if (validity <= 30) return 'Monthly';
    if (validity <= 60) return '2 Monthly';
    if (validity <= 365) return 'Yearly';
    return 'Monthly'; // default fallback
  }
  
  if (unit === 'MONTHS') {
    if (validity <= 1) return 'Monthly';
    if (validity <= 2) return '2 Monthly';
    if (validity <= 12) return 'Yearly';
    return 'Monthly';
  }
  
  if (unit === 'YEARS') {
    if (validity <= 1) return 'Yearly';
    return 'Yearly';
  }

  // Default fallback
  return 'Monthly';
}

// ✅ Sort categories in specific order
function sortCategories(categories: any[]) {
  const order: Record<string, number> = {
    'SME': 0,
    'Daily': 1,
    'Weekly': 2,
    'Monthly': 3,
    '2 Monthly': 4,
    'Yearly': 5,
    'Gifting': 6,
    'Hourly': 7,
  };

  return categories.sort((a, b) => {
    const aOrder = order[a.name] ?? 99;
    const bOrder = order[b.name] ?? 99;
    return aOrder - bOrder;
  });
}

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

      // ✅ Determine category based on plan attributes
      const categoryName = getPlanCategory(plan);
      
      if (!groupedByNetwork[networkKey].categories[categoryName]) {
        groupedByNetwork[networkKey].categories[categoryName] = {
          id: categoryName.toLowerCase().replace(/\s+/g, '_'),
          name: categoryName,
          plans: [],
        };
      }

      // Get validity display
      let validityDisplay = '';
      if (plan.validity && plan.validityUnit) {
        const unit = plan.validityUnit.toLowerCase();
        const val = plan.validity;
        if (val === 1) {
          validityDisplay = `1 ${unit.slice(0, -1)}`; // Remove 's' for singular
        } else {
          validityDisplay = `${val} ${unit}`;
        }
      }

      groupedByNetwork[networkKey].categories[categoryName].plans.push({
        id: plan.id,
        name: plan.name,
        data: plan.amountMB >= 1024 
          ? `${(plan.amountMB / 1024).toFixed(1)}GB` 
          : `${plan.amountMB}MB`,
        price: Number(plan.ourPrice),
        validity: validityDisplay || `${plan.validity} ${plan.validityUnit}`.toLowerCase(),
        planCode: plan.vendorPlanId,
        vendorPrice: Number(plan.vendorPrice),
        description: plan.description,
        amountMB: plan.amountMB,
        planType: plan.planType,
      });
    }

    // ✅ Convert grouped data to array format with sorted categories
    const formattedPlans = Object.keys(groupedByNetwork).map((networkKey) => ({
      ...groupedByNetwork[networkKey],
      categories: sortCategories(
        Object.keys(groupedByNetwork[networkKey].categories).map((catKey) => ({
          id: groupedByNetwork[networkKey].categories[catKey].id,
          name: catKey,
          plans: groupedByNetwork[networkKey].categories[catKey].plans,
        }))
      ),
    }));

    console.log(`📊 [VENDOR PLANS API] Formatted ${formattedPlans.length} providers`);
    console.log(`📊 [VENDOR PLANS API] Categories:`, formattedPlans.map(p => 
      p.categories.map((c: any) => c.name).join(', ')
    ));

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