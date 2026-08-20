// bilscore-app/app/api/admin/vendors/services/bulk/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VtuType } from "@prisma/client";

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

function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return addCorsHeaders(
        NextResponse.json({ error: auth.error }, { status: 401 })
      );
    }

    const body = await request.json();
    const { serviceType, vendorId } = body;

    if (!serviceType || !vendorId) {
      return addCorsHeaders(
        NextResponse.json({
          success: false,
          error: "serviceType and vendorId are required",
        }, { status: 400 })
      );
    }

    // Validate service type
    const validServices = Object.values(VtuType);
    if (!validServices.includes(serviceType)) {
      return addCorsHeaders(
        NextResponse.json({
          success: false,
          error: `Invalid service type. Must be one of: ${validServices.join(', ')}`,
        }, { status: 400 })
      );
    }

    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, name: true, code: true },
    });

    if (!vendor) {
      return addCorsHeaders(
        NextResponse.json({
          success: false,
          error: "Vendor not found",
        }, { status: 404 })
      );
    }

    // Check if vendor has this service
    const vendorService = await prisma.vendorService.findFirst({
      where: {
        vendorId,
        serviceType,
      },
    });

    if (!vendorService) {
      return addCorsHeaders(
        NextResponse.json({
          success: false,
          error: `Vendor does not support ${serviceType}`,
        }, { status: 404 })
      );
    }

    // Deactivate this service for all vendors
    await prisma.vendorService.updateMany({
      where: {
        serviceType,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Activate for the selected vendor
    await prisma.vendorService.update({
      where: { id: vendorService.id },
      data: {
        isActive: true,
      },
    });

    const response = addCorsHeaders(
      NextResponse.json({
        success: true,
        message: `${serviceType} service now active for ${vendor.name}`,
        data: {
          serviceType,
          vendor: {
            id: vendor.id,
            name: vendor.name,
            code: vendor.code,
          },
          status: 'ACTIVE',
        },
      })
    );

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN BULK SERVICES] Error:", error);
    return addCorsHeaders(
      NextResponse.json({
        success: false,
        error: error.message || "Failed to update services",
      }, { status: 500 })
    );
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}