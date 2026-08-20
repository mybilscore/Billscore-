// bilscore-app/app/api/admin/vendors/[vendorId]/services/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VtuType, VendorStatus } from "@prisma/client";

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
    console.log(`❌ [ADMIN VENDOR SERVICES] Invalid API key: ${apiKey?.substring(0, 10)}...`);
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

export async function GET(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    console.log(`📊 [ADMIN VENDOR SERVICES] GET request received`);
    
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return addCorsHeaders(
        NextResponse.json({ error: auth.error }, { status: 401 })
      );
    }

    const { vendorId } = params;
    console.log(`📊 [ADMIN VENDOR SERVICES] Fetching services for vendor: ${vendorId}`);

    // Get vendor with services
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        services: {
          orderBy: { priority: 'asc' },
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

    // Get all active vendors for comparison
    const allVendors = await prisma.vendor.findMany({
      where: { status: VendorStatus.ACTIVE },
      include: {
        services: {
          where: { isActive: true },
        },
      },
    });

    // Check which services are already covered by other vendors
    const serviceCoverage: Record<string, { vendorId: string; vendorName: string }[]> = {};
    
    for (const v of allVendors) {
      for (const service of v.services) {
        if (!serviceCoverage[service.serviceType]) {
          serviceCoverage[service.serviceType] = [];
        }
        serviceCoverage[service.serviceType].push({
          vendorId: v.id,
          vendorName: v.name,
        });
      }
    }

    const response = addCorsHeaders(
      NextResponse.json({
        success: true,
        data: {
          vendor: {
            id: vendor.id,
            name: vendor.name,
            code: vendor.code,
            status: vendor.status,
            priority: vendor.priority,
          },
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
          coverage: serviceCoverage,
          allVendors: allVendors.map(v => ({
            id: v.id,
            name: v.name,
            code: v.code,
            services: v.services.map(s => s.serviceType),
          })),
        },
      })
    );

    console.log(`✅ [ADMIN VENDOR SERVICES] Successfully fetched ${vendor.services.length} services`);
    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN VENDOR SERVICES] Error:", error);
    return addCorsHeaders(
      NextResponse.json({
        success: false,
        error: error.message || "Failed to fetch vendor services",
      }, { status: 500 })
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    console.log(`📊 [ADMIN VENDOR SERVICES] PUT request received`);
    
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return addCorsHeaders(
        NextResponse.json({ error: auth.error }, { status: 401 })
      );
    }

    const { vendorId } = params;
    const body = await request.json();
    const { serviceId, isActive, priority, basePrice, markup, minAmount, maxAmount } = body;

    console.log(`📊 [ADMIN VENDOR SERVICES] Updating service ${serviceId} for vendor ${vendorId}`);

    // Get the vendor service
    const vendorService = await prisma.vendorService.findUnique({
      where: { id: serviceId },
      include: { vendor: true },
    });

    if (!vendorService || vendorService.vendorId !== vendorId) {
      return addCorsHeaders(
        NextResponse.json({
          success: false,
          error: "Service not found for this vendor",
        }, { status: 404 })
      );
    }

    // If activating this service, check if another vendor already provides it
    if (isActive === true) {
      const existingActive = await prisma.vendorService.findFirst({
        where: {
          serviceType: vendorService.serviceType,
          isActive: true,
          vendorId: { not: vendorId },
        },
        include: {
          vendor: true,
        },
      });

      if (existingActive) {
        return addCorsHeaders(
          NextResponse.json({
            success: false,
            error: `Service ${vendorService.serviceType} is already active for ${existingActive.vendor.name}. You can only have one active vendor per service.`,
            data: {
              existingVendor: {
                id: existingActive.vendor.id,
                name: existingActive.vendor.name,
                code: existingActive.vendor.code,
              },
            },
          }, { status: 409 })
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (priority !== undefined) updateData.priority = priority;
    if (basePrice !== undefined) updateData.basePrice = basePrice;
    if (markup !== undefined) updateData.markup = markup;
    if (minAmount !== undefined) updateData.minAmount = minAmount;
    if (maxAmount !== undefined) updateData.maxAmount = maxAmount;

    // Update the service
    const updated = await prisma.vendorService.update({
      where: { id: serviceId },
      data: updateData,
      include: {
        vendor: true,
      },
    });

    // If this service was activated, deactivate the same service for all other vendors
    if (isActive === true) {
      await prisma.vendorService.updateMany({
        where: {
          serviceType: vendorService.serviceType,
          vendorId: { not: vendorId },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    }

    console.log(`✅ [ADMIN VENDOR SERVICES] Service ${updated.serviceType} ${isActive ? 'activated' : 'deactivated'}`);

    const response = addCorsHeaders(
      NextResponse.json({
        success: true,
        message: `Service ${updated.serviceType} ${isActive ? 'activated' : 'deactivated'} for ${updated.vendor.name}`,
        data: {
          service: {
            id: updated.id,
            serviceType: updated.serviceType,
            isActive: updated.isActive,
            priority: updated.priority,
            basePrice: Number(updated.basePrice || 0),
            markup: Number(updated.markup || 0),
            minAmount: Number(updated.minAmount || 0),
            maxAmount: Number(updated.maxAmount || 0),
          },
          vendor: {
            id: updated.vendor.id,
            name: updated.vendor.name,
            code: updated.vendor.code,
          },
        },
      })
    );

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN VENDOR SERVICES] PUT error:", error);
    return addCorsHeaders(
      NextResponse.json({
        success: false,
        error: error.message || "Failed to update vendor service",
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