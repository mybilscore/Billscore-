// bilscore-app/app/api/admin/vendors/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VendorStatus, VendorAuthType, VtuVendor, VtuType } from "@prisma/client";

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
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true };
}

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { type: { contains: search } },
      ];
    }

    if (status && status !== "all") {
      where.status = status as VendorStatus;
    }

    // Fetch vendors
    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        orderBy: { priority: "asc" },
        take: limit,
        skip: skip,
        include: {
          services: true,
          healthChecks: {
            take: 1,
            orderBy: { checkedAt: "desc" },
          },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    const response = NextResponse.json({
      success: true,
      data: {
        vendors: vendors.map((vendor) => ({
          id: vendor.id,
          name: vendor.name,
          code: vendor.code,
          type: vendor.type,
          apiBaseUrl: vendor.apiBaseUrl,
          authType: vendor.authType,
          status: vendor.status,
          priority: vendor.priority,
          successRate: Number(vendor.successRate || 0),
          avgResponseTime: vendor.avgResponseTime,
          failureCount: vendor.failureCount,
          consecutiveFailures: vendor.consecutiveFailures,
          lastCheckAt: vendor.lastCheckAt?.toISOString(),
          lastSuccessAt: vendor.lastSuccessAt?.toISOString(),
          lastFailureAt: vendor.lastFailureAt?.toISOString(),
          createdAt: vendor.createdAt.toISOString(),
          updatedAt: vendor.updatedAt.toISOString(),
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
          health: vendor.healthChecks[0] ? {
            status: vendor.healthChecks[0].status,
            responseTime: vendor.healthChecks[0].responseTime,
            isSuccess: vendor.healthChecks[0].isSuccess,
            checkedAt: vendor.healthChecks[0].checkedAt.toISOString(),
          } : null,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN VENDORS API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch vendors",
    }, { status: 500 });
  }
}

// ✅ Handle OPTIONS for CORS preflight
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