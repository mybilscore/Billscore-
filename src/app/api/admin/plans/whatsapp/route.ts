// bilscore-app/app/api/admin/plans/whatsapp/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";

// ============================================================
// Helper: Validate API Key
// ============================================================

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

// ============================================================
// Helper: Add CORS headers to response
// ============================================================

function addCorsHeaders(response: NextResponse, origin?: string | null) {
  const allowedOrigins = ['http://localhost:3001', 'http://localhost:3000'];
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
  return response;
}

// ============================================================
// PATCH - Toggle individual plan for WhatsApp
// ============================================================

export async function PATCH(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    
    // ✅ Validate API key
    const auth = validateApiKey(request);
    if (!auth.valid) {
      const response = NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
      return addCorsHeaders(response, origin);
    }

    const body = await request.json().catch(() => ({}));
    const { planId, activate, priority } = body;

    console.log(`📱 [WHATSAPP API] Toggling plan ${planId} to ${activate}`);

    // ✅ Validate required fields
    if (!planId) {
      const response = NextResponse.json(
        { success: false, error: "Plan ID is required" },
        { status: 400 }
      );
      return addCorsHeaders(response, origin);
    }

    // ✅ Check if plan exists
    const existingPlan = await prisma.dataPlan.findUnique({
      where: { id: planId },
    });

    if (!existingPlan) {
      const response = NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
      return addCorsHeaders(response, origin);
    }

    // ✅ Build update data
    const updateData: any = {
      isActiveForWhatsApp: activate !== undefined ? activate : true,
      updatedAt: new Date(),
      updatedBy: "admin",
    };

    // ✅ Only update priority if provided
    if (priority !== undefined && priority !== null) {
      updateData.whatsappPriority = priority;
    }

    // ✅ Update plan for WhatsApp
    const updatedPlan = await prisma.dataPlan.update({
      where: { id: planId },
      data: updateData,
      include: {
        networkConfig: true,
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // ✅ Calculate margin for response
    const margin = Number(updatedPlan.ourPrice) - Number(updatedPlan.vendorPrice);
    const marginPercentage = Number(updatedPlan.vendorPrice) > 0 
      ? (margin / Number(updatedPlan.vendorPrice)) * 100 
      : 0;

    // ✅ Build response with proper structure
    const planWithMargin = {
      id: updatedPlan.id,
      network: updatedPlan.network,
      planType: updatedPlan.planType,
      planCategory: updatedPlan.planCategory,
      name: updatedPlan.name,
      amountMB: updatedPlan.amountMB,
      description: updatedPlan.description,
      ourPrice: Number(updatedPlan.ourPrice),
      vendorPrice: Number(updatedPlan.vendorPrice),
      margin,
      marginPercentage,
      validity: updatedPlan.validity,
      validityUnit: updatedPlan.validityUnit,
      isActive: updatedPlan.isActive,
      status: updatedPlan.status,
      isActiveForWhatsApp: updatedPlan.isActiveForWhatsApp ?? false,
      whatsappPriority: updatedPlan.whatsappPriority ?? 0,
      vendorId: updatedPlan.vendorId,
      vendorPlanId: updatedPlan.vendorPlanId,
      vendorNetworkCode: updatedPlan.vendorNetworkCode,
      vendorPlanType: updatedPlan.vendorPlanType,
      vendorMetadata: updatedPlan.vendorMetadata,
      importBatch: updatedPlan.importBatch,
      lastSyncedAt: updatedPlan.lastSyncedAt,
      createdBy: updatedPlan.createdBy,
      updatedBy: updatedPlan.updatedBy,
      createdAt: updatedPlan.createdAt,
      updatedAt: updatedPlan.updatedAt,
      networkConfig: updatedPlan.networkConfig,
      vendor: updatedPlan.vendor,
    };

    console.log(`✅ [WHATSAPP API] Plan ${planId} updated: isActiveForWhatsApp=${updatedPlan.isActiveForWhatsApp}`);

    const response = NextResponse.json({
      success: true,
      data: planWithMargin,
      message: `Plan ${updatedPlan.isActiveForWhatsApp ? 'activated' : 'deactivated'} for WhatsApp successfully`,
    });

    return addCorsHeaders(response, origin);

  } catch (error: any) {
    console.error("💥 [WHATSAPP API] Error:", error);
    
    const origin = request.headers.get('origin');
    
    if (error.code === "P2025") {
      const response = NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
      return addCorsHeaders(response, origin);
    }

    const response = NextResponse.json(
      { success: false, error: error.message || "Failed to update plan" },
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

// ============================================================
// GET - Fetch plans with WhatsApp status
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    
    // ✅ Validate API key
    const auth = validateApiKey(request);
    if (!auth.valid) {
      const response = NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
      return addCorsHeaders(response, origin);
    }

    const searchParams = new URL(request.url).searchParams;
    const network = searchParams.get("network");
    const isActiveForWhatsApp = searchParams.get("whatsapp") === "true" ? true : 
                                searchParams.get("whatsapp") === "false" ? false : undefined;

    const where: any = {};
    
    if (network) where.network = network;
    if (isActiveForWhatsApp !== undefined) where.isActiveForWhatsApp = isActiveForWhatsApp;
    where.isActive = true; // Only return active plans

    const plans = await prisma.dataPlan.findMany({
      where,
      orderBy: [
        { network: 'asc' },
        { whatsappPriority: 'asc' },
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
      },
    });

    // ✅ Calculate margin for each plan
    const plansWithMargin = plans.map(plan => {
      const margin = Number(plan.ourPrice) - Number(plan.vendorPrice);
      const marginPercentage = Number(plan.vendorPrice) > 0 
        ? (margin / Number(plan.vendorPrice)) * 100 
        : 0;
      return {
        ...plan,
        margin,
        marginPercentage,
        ourPrice: Number(plan.ourPrice),
        vendorPrice: Number(plan.vendorPrice),
        isActiveForWhatsApp: plan.isActiveForWhatsApp ?? false,
        whatsappPriority: plan.whatsappPriority ?? 0,
      };
    });

    // Group by network
    const groupedPlans: Record<string, any> = {};
    for (const plan of plansWithMargin) {
      const networkKey = plan.network;
      if (!groupedPlans[networkKey]) {
        groupedPlans[networkKey] = {
          network: plan.network,
          displayName: plan.networkConfig?.displayName || plan.network,
          color: plan.networkConfig?.color || '#000000',
          totalPlans: 0,
          whatsappActive: 0,
          plans: [],
        };
      }
      groupedPlans[networkKey].plans.push(plan);
      groupedPlans[networkKey].totalPlans++;
      if (plan.isActiveForWhatsApp) {
        groupedPlans[networkKey].whatsappActive++;
      }
    }

    const response = NextResponse.json({
      success: true,
      data: {
        plans: plansWithMargin,
        grouped: Object.values(groupedPlans),
        total: plans.length,
        whatsappActive: plansWithMargin.filter(p => p.isActiveForWhatsApp).length,
      },
    });

    return addCorsHeaders(response, origin);

  } catch (error: any) {
    console.error("💥 [WHATSAPP API] Error fetching:", error);
    const origin = request.headers.get('origin');
    const response = NextResponse.json(
      { success: false, error: error.message || "Failed to fetch plans" },
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

// ============================================================
// PUT - Batch update plans for WhatsApp
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    
    // ✅ Validate API key
    const auth = validateApiKey(request);
    if (!auth.valid) {
      const response = NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
      return addCorsHeaders(response, origin);
    }

    const body = await request.json().catch(() => ({}));
    const { planIds, activate, network, planType } = body;

    // Build where clause
    const where: any = {};
    
    if (planIds && Array.isArray(planIds) && planIds.length > 0) {
      where.id = { in: planIds };
    }
    
    if (network) {
      where.network = network;
    }
    
    if (planType) {
      where.planType = planType;
    }

    if (Object.keys(where).length === 0) {
      const response = NextResponse.json(
        { success: false, error: "No filters provided" },
        { status: 400 }
      );
      return addCorsHeaders(response, origin);
    }

    // Update all matching plans
    const updatedPlans = await prisma.dataPlan.updateMany({
      where,
      data: {
        isActiveForWhatsApp: activate !== undefined ? activate : true,
        updatedAt: new Date(),
        updatedBy: "admin",
      },
    });

    console.log(`📝 [WHATSAPP API] Bulk updated ${updatedPlans.count} plans`);

    const response = NextResponse.json({
      success: true,
      data: {
        updatedCount: updatedPlans.count,
      },
      message: `${updatedPlans.count} plans ${activate ? 'activated' : 'deactivated'} for WhatsApp successfully`,
    });

    return addCorsHeaders(response, origin);

  } catch (error: any) {
    console.error("💥 [WHATSAPP API] Batch error:", error);
    const origin = request.headers.get('origin');
    const response = NextResponse.json(
      { success: false, error: error.message || "Failed to update plans" },
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

// ============================================================
// OPTIONS - CORS preflight
// ============================================================

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = ['http://localhost:3001', 'http://localhost:3000'];
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}