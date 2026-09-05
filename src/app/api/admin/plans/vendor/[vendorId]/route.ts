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
  { params }: { params: Promise<{ vendorId: string }> | { vendorId: string } }
) {
  try {
    console.log("=".repeat(80));
    console.log("🔍 [VENDOR PLANS API] Request received");
    console.log("=".repeat(80));

    const auth = validateApiKey(request);
    if (!auth.valid) {
      console.log("❌ Authentication failed:", auth.error);
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    console.log("✅ Authentication successful");

    const resolvedParams = await params;
    const { vendorId } = resolvedParams;
    console.log(`📋 Vendor ID: ${vendorId}`);

    const searchParams = new URL(request.url).searchParams;
    const network = searchParams.get("network");
    const isActiveParam = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "1000"); // Default to 1000 to get all
    
    console.log(`📊 Query Parameters:`);
    console.log(`   - Network: ${network || "ALL"}`);
    console.log(`   - isActive: ${isActiveParam || "ALL"}`);
    console.log(`   - Page: ${page}`);
    console.log(`   - Limit: ${limit}`);
    console.log("-".repeat(80));

    // 🔍 DEBUG: Get ALL plans count first
    const totalAllPlans = await prisma.dataPlan.count({
      where: { vendorId },
    });
    console.log(`📊 TOTAL PLANS IN DATABASE FOR VENDOR: ${totalAllPlans}`);

    // 🔍 DEBUG: Get counts by status
    const activeCount = await prisma.dataPlan.count({
      where: { 
        vendorId,
        isActive: true,
      },
    });
    const inactiveCount = await prisma.dataPlan.count({
      where: { 
        vendorId,
        isActive: false,
      },
    });
    console.log(`   - Active: ${activeCount}`);
    console.log(`   - Inactive: ${inactiveCount}`);
    console.log(`   - Total: ${activeCount + inactiveCount}`);

    // 🔍 DEBUG: Get counts by network
    const networkCounts = await prisma.dataPlan.groupBy({
      by: ['network'],
      where: { vendorId },
      _count: true,
    });
    console.log(`📊 Plans by network:`);
    networkCounts.forEach(n => {
      console.log(`   - ${n.network}: ${n._count}`);
    });

    // 🔍 DEBUG: Check for duplicate vendorPlanIds
    const allVendorIds = await prisma.dataPlan.findMany({
      where: { vendorId },
      select: { vendorPlanId: true, name: true, network: true, isActive: true },
      orderBy: { vendorPlanId: 'asc' },
    });
    
    const uniqueVendorIds = new Set(allVendorIds.map(p => p.vendorPlanId));
    console.log(`📊 Vendor Plan IDs:`);
    console.log(`   - Total records: ${allVendorIds.length}`);
    console.log(`   - Unique vendorPlanIds: ${uniqueVendorIds.size}`);
    
    if (allVendorIds.length !== uniqueVendorIds.size) {
      console.log(`⚠️ DUPLICATES FOUND! ${allVendorIds.length - uniqueVendorIds.size} duplicates detected`);
      
      // Find duplicates
      const seen = new Set();
      const duplicates = allVendorIds.filter(p => {
        if (seen.has(p.vendorPlanId)) return true;
        seen.add(p.vendorPlanId);
        return false;
      });
      console.log(`   - Duplicate entries:`, duplicates.map(d => d.vendorPlanId).join(', '));
    }

    // Build where clause
    const where: any = {
      vendorId,
    };

    if (isActiveParam !== null) {
      where.isActive = isActiveParam !== "false";
      console.log(`🔍 Filtering by isActive: ${where.isActive}`);
    } else {
      console.log(`🔍 No isActive filter - showing ALL plans`);
    }

    if (network) {
      where.network = network;
      console.log(`🔍 Filtering by network: ${network}`);
    }

    // Get total with filters
    const total = await prisma.dataPlan.count({ where });
    console.log(`📊 Total after filters: ${total}`);

    // Get plans with pagination
    const skip = (page - 1) * limit;
    console.log(`📄 Pagination: skip=${skip}, take=${limit}`);

    const plans = await prisma.dataPlan.findMany({
      where,
      orderBy: [
        { network: 'asc' },
        { isActiveForWhatsApp: 'desc' },
        { whatsappPriority: 'asc' },
        { planType: 'asc' },
        { amountMB: 'asc' },
      ],
      skip,
      take: limit,
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

    console.log(`✅ Returned ${plans.length} plans in this page`);
    console.log("=".repeat(80));

    // Calculate margins
    const plansWithMargin = plans.map(plan => ({
      ...plan,
      margin: Number(plan.ourPrice) - Number(plan.vendorPrice),
      marginPercentage: Number(plan.vendorPrice) > 0 
        ? ((Number(plan.ourPrice) - Number(plan.vendorPrice)) / Number(plan.vendorPrice)) * 100 
        : 0,
      agentMargin: Number(plan.ourPrice) - Number(plan.agentPrice),
      agentMarginPercentage: Number(plan.agentPrice) > 0 
        ? ((Number(plan.ourPrice) - Number(plan.agentPrice)) / Number(plan.agentPrice)) * 100 
        : 0,
      vendorToAgentMargin: Number(plan.agentPrice) - Number(plan.vendorPrice),
      vendorToAgentMarginPercentage: Number(plan.vendorPrice) > 0 
        ? ((Number(plan.agentPrice) - Number(plan.vendorPrice)) / Number(plan.vendorPrice)) * 100 
        : 0,
      ourPrice: Number(plan.ourPrice),
      vendorPrice: Number(plan.vendorPrice),
      agentPrice: Number(plan.agentPrice),
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
        vendorPrice: true,
        agentPrice: true,
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
          totalVendorValue: s._sum.vendorPrice || 0,
          totalAgentValue: s._sum.agentPrice || 0,
        })),
        total,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        // ✅ Add debug info to response
        debug: {
          totalAllPlans,
          activeCount,
          inactiveCount,
          networkCounts: networkCounts.map(n => ({
            network: n.network,
            count: n._count,
          })),
          uniqueVendorIds: uniqueVendorIds.size,
          duplicateCount: allVendorIds.length - uniqueVendorIds.size,
        },
      },
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN VENDOR PLANS API] Error:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch vendor plans",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}