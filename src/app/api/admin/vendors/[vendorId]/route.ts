// bilscore-app/app/api/admin/vendors/[vendorId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";

// ✅ Validate API Key
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
    console.log(`❌ [ADMIN VENDOR DETAIL] Invalid API key`);
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true };
}

// ✅ Add CORS headers helper
function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  return response;
}

// ✅ FIXED: Await params for Next.js 15
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> | { vendorId: string } }
) {
  try {
    console.log(`📊 [ADMIN VENDOR DETAIL] GET request received`);
    
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return addCorsHeaders(
        NextResponse.json({ error: auth.error }, { status: 401 })
      );
    }

    // ✅ Await params
    const resolvedParams = await params;
    const { vendorId } = resolvedParams;
    
    console.log(`📊 [ADMIN VENDOR DETAIL] Fetching vendor: ${vendorId}`);

    // Get vendor with services and plans
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        services: {
          orderBy: { priority: 'asc' },
        },
        _count: {
          select: {
            dataPlans: true,
          },
        },
      },
    });

    if (!vendor) {
      return addCorsHeaders(
        NextResponse.json({
          success: false,
          error: "Vendor not found",
        }, { status: 404 })
      );
    }

    // Get plans for this vendor
    const plans = await prisma.dataPlan.findMany({
      where: {
        vendorId: vendorId,
        isActive: true,
      },
      select: {
        id: true,
        network: true,
        planType: true,
        name: true,
        amountMB: true,
        ourPrice: true,
        vendorPrice: true,
        validity: true,
        validityUnit: true,
        isActive: true,
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const response = addCorsHeaders(
      NextResponse.json({
        success: true,
        data: {
          id: vendor.id,
          name: vendor.name,
          code: vendor.code,
          type: vendor.type,
          apiBaseUrl: vendor.apiBaseUrl,
          authType: vendor.authType,
          authConfig: vendor.authConfig,
          status: vendor.status,
          priority: vendor.priority,
          successRate: Number(vendor.successRate || 0),
          avgResponseTime: vendor.avgResponseTime,
          failureCount: vendor.failureCount,
          consecutiveFailures: vendor.consecutiveFailures,
          lastCheckAt: vendor.lastCheckAt,
          lastSuccessAt: vendor.lastSuccessAt,
          lastFailureAt: vendor.lastFailureAt,
          createdAt: vendor.createdAt,
          updatedAt: vendor.updatedAt,
          metadata: vendor.metadata,
          services: vendor.services.map((s) => ({
            id: s.id,
            serviceType: s.serviceType,
            isActive: s.isActive,
            priority: s.priority,
            basePrice: Number(s.basePrice || 0),
            markup: Number(s.markup || 0),
            minAmount: Number(s.minAmount || 0),
            maxAmount: Number(s.maxAmount || 0),
          })),
          plans: plans,
          totalPlans: vendor._count.dataPlans,
        },
      })
    );

    console.log(`✅ [ADMIN VENDOR DETAIL] Successfully fetched vendor: ${vendor.name}`);
    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN VENDOR DETAIL] Error:", error);
    return addCorsHeaders(
      NextResponse.json({
        success: false,
        error: error.message || "Failed to fetch vendor",
      }, { status: 500 })
    );
  }
}

// ✅ FIXED: Await params for Next.js 15
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> | { vendorId: string } }
) {
  try {
    console.log(`📊 [ADMIN VENDOR DETAIL] PUT request received`);
    
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return addCorsHeaders(
        NextResponse.json({ error: auth.error }, { status: 401 })
      );
    }

    // ✅ Await params
    const resolvedParams = await params;
    const { vendorId } = resolvedParams;
    
    const body = await request.json();
    
    console.log(`📊 [ADMIN VENDOR DETAIL] Updating vendor: ${vendorId}`);

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!existingVendor) {
      return addCorsHeaders(
        NextResponse.json({
          success: false,
          error: "Vendor not found",
        }, { status: 404 })
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.apiBaseUrl !== undefined) updateData.apiBaseUrl = body.apiBaseUrl;
    if (body.authType !== undefined) updateData.authType = body.authType;
    if (body.authConfig !== undefined) updateData.authConfig = body.authConfig;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;

    // Update the vendor
    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data: updateData,
      include: {
        services: {
          orderBy: { priority: 'asc' },
        },
      },
    });

    console.log(`✅ [ADMIN VENDOR DETAIL] Successfully updated vendor: ${updated.name}`);

    const response = addCorsHeaders(
      NextResponse.json({
        success: true,
        message: "Vendor updated successfully",
        data: {
          id: updated.id,
          name: updated.name,
          code: updated.code,
          type: updated.type,
          apiBaseUrl: updated.apiBaseUrl,
          authType: updated.authType,
          status: updated.status,
          priority: updated.priority,
          successRate: Number(updated.successRate || 0),
          avgResponseTime: updated.avgResponseTime,
          failureCount: updated.failureCount,
          consecutiveFailures: updated.consecutiveFailures,
          services: updated.services.map((s) => ({
            id: s.id,
            serviceType: s.serviceType,
            isActive: s.isActive,
            priority: s.priority,
            basePrice: Number(s.basePrice || 0),
            markup: Number(s.markup || 0),
            minAmount: Number(s.minAmount || 0),
            maxAmount: Number(s.maxAmount || 0),
          })),
        },
      })
    );

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN VENDOR DETAIL] PUT error:", error);
    return addCorsHeaders(
      NextResponse.json({
        success: false,
        error: error.message || "Failed to update vendor",
      }, { status: 500 })
    );
  }
}

// ✅ FIXED: Await params for Next.js 15
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> | { vendorId: string } }
) {
  try {
    console.log(`📊 [ADMIN VENDOR DETAIL] DELETE request received`);
    
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return addCorsHeaders(
        NextResponse.json({ error: auth.error }, { status: 401 })
      );
    }

    // ✅ Await params
    const resolvedParams = await params;
    const { vendorId } = resolvedParams;
    
    console.log(`📊 [ADMIN VENDOR DETAIL] Deleting vendor: ${vendorId}`);

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!existingVendor) {
      return addCorsHeaders(
        NextResponse.json({
          success: false,
          error: "Vendor not found",
        }, { status: 404 })
      );
    }

    // Delete vendor (cascade will handle related records)
    await prisma.vendor.delete({
      where: { id: vendorId },
    });

    console.log(`✅ [ADMIN VENDOR DETAIL] Successfully deleted vendor: ${existingVendor.name}`);

    const response = addCorsHeaders(
      NextResponse.json({
        success: true,
        message: "Vendor deleted successfully",
      })
    );

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN VENDOR DETAIL] DELETE error:", error);
    return addCorsHeaders(
      NextResponse.json({
        success: false,
        error: error.message || "Failed to delete vendor",
      }, { status: 500 })
    );
  }
}

// ✅ Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}