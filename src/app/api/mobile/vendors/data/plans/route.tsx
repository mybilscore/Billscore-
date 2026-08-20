// src/app/api/mobile/vendors/data/plans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { verify } from "jsonwebtoken";
import { NetworkProvider, PlanStatus, VtuType } from "@prisma/client";

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
    console.error("❌ [MOBILE DATA PLANS] Token verification failed:", error);
    return null;
  }
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
  console.log("📊 [MOBILE DATA PLANS] Plans fetch requested");
  const startTime = Date.now();

  try {
    // 1. Authenticate mobile user
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      console.log("❌ [MOBILE DATA PLANS] Authentication failed");
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
        message: "Please login to access data plans",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`👤 [MOBILE DATA PLANS] User authenticated: ${userId}`);

    // 2. Get query parameters
    const searchParams = new URL(request.url).searchParams;
    const network = searchParams.get("network") as NetworkProvider | null;
    const serviceType = searchParams.get("serviceType") || "DATA";
    const format = searchParams.get("format") || "mobile";

    console.log(`📊 [MOBILE DATA PLANS] Fetching plans for ${serviceType}${network ? ` (${network})` : ''}`);

    // 3. Get the active vendor for this service
    const vendorService = await getActiveVendor(serviceType);

    if (!vendorService) {
      console.log(`⚠️ [MOBILE DATA PLANS] No active vendor found for ${serviceType}`);
      return NextResponse.json({
        success: false,
        error: "No active vendor found for data services",
        data: {
          plans: [],
          networks: [],
          vendor: null,
        },
      }, { status: 200 });
    }

    console.log(`✅ [MOBILE DATA PLANS] Active vendor: ${vendorService.vendor.name} (${vendorService.vendor.code})`);

    // 4. Build where clause
    const where: any = {
      vendorId: vendorService.vendorId,
      isActive: true,
      status: PlanStatus.ACTIVE,
    };

    if (network) {
      where.network = network;
    }

    // 5. Fetch plans from database
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

    console.log(`📊 [MOBILE DATA PLANS] Found ${plans.length} plans`);

    // 6. Get all networks for filter
    const networks = await prisma.networkConfig.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    // 7. Format response for mobile
    let responseData;

    if (format === 'mobile') {
      // ✅ Mobile-optimized format (flatter structure, less nesting)
      const formattedPlans = plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        network: plan.network,
        networkDisplayName: plan.networkConfig?.displayName || plan.network,
        networkColor: plan.networkConfig?.color || '#000000',
        networkLogo: plan.networkConfig?.logo || `/networks/${plan.network.toLowerCase()}.jpg`,
        planType: plan.planType,
        amountMB: plan.amountMB,
        dataDisplay: plan.amountMB >= 1024 
          ? `${(plan.amountMB / 1024).toFixed(1)}GB` 
          : `${plan.amountMB}MB`,
        price: Number(plan.ourPrice),
        vendorPrice: Number(plan.vendorPrice),
        validity: `${plan.validity} ${plan.validityUnit}`.toLowerCase(),
        validityDays: plan.validityUnit === 'DAY' ? plan.validity : plan.validity * 7,
        planCode: plan.vendorPlanId,
        description: plan.description,
        isPopular: plan.amountMB === 1000 || plan.amountMB === 2000 || plan.amountMB === 5000,
        isBestValue: (plan.amountMB / Number(plan.ourPrice)) > 0.5,
      }));

      // Group by network for mobile
      const groupedByNetwork: Record<string, any> = {};
      
      for (const plan of formattedPlans) {
        if (!groupedByNetwork[plan.network]) {
          groupedByNetwork[plan.network] = {
            id: plan.network.toLowerCase(),
            name: plan.networkDisplayName,
            code: plan.network,
            color: plan.networkColor,
            logo: plan.networkLogo,
            plans: [],
          };
        }
        groupedByNetwork[plan.network].plans.push(plan);
      }

      // Group by plan type within each network (for mobile UX)
      for (const networkKey in groupedByNetwork) {
        const network = groupedByNetwork[networkKey];
        const categories: Record<string, any> = {};
        
        for (const plan of network.plans) {
          if (!categories[plan.planType]) {
            categories[plan.planType] = {
              id: plan.planType.toLowerCase(),
              name: plan.planType,
              plans: [],
            };
          }
          categories[plan.planType].plans.push(plan);
        }
        
        network.categories = Object.values(categories);
      }

      responseData = {
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
        providers: Object.values(groupedByNetwork),
        totalPlans: plans.length,
        serviceType,
        // Mobile-specific metadata
        meta: {
          lastUpdated: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          format: 'mobile',
          totalNetworks: networks.length,
        },
      };
    } else {
      // ✅ Web-optimized format (nested structure for web)
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

      // Convert to array format
      const formattedProviders = Object.keys(groupedByNetwork).map((networkKey) => ({
        ...groupedByNetwork[networkKey],
        categories: Object.keys(groupedByNetwork[networkKey].categories).map((catKey) => ({
          id: catKey.toLowerCase(),
          name: catKey,
          plans: groupedByNetwork[networkKey].categories[catKey].plans,
        })),
      }));

      responseData = {
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
        plans: formattedProviders,
        totalPlans: plans.length,
        serviceType,
      };
    }

    const responseTime = Date.now() - startTime;
    console.log(`✅ [MOBILE DATA PLANS] Response prepared in ${responseTime}ms`);

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error: any) {
    console.error("💥 [MOBILE DATA PLANS] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch data plans",
      data: {
        plans: [],
        networks: [],
        vendor: null,
      },
    }, { status: 500 });
  }
}

// ✅ Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}