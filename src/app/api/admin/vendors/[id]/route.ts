// bilscore-app/app/api/admin/vendors/[id]/route.ts

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

// ============================================================
// GET - Fetch vendor details
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const { id } = params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        services: true,
        endpoints: true,
        transformers: true,
        failoverRules: true,
        circuitBreakers: true,
        healthChecks: {
          take: 10,
          orderBy: { checkedAt: "desc" },
        },
        dailyMetrics: {
          take: 30,
          orderBy: { date: "desc" },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({
        success: false,
        error: "Vendor not found",
      }, { status: 404 });
    }

    const response = NextResponse.json({
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
        endpoints: vendor.endpoints,
        transformers: vendor.transformers,
        failoverRules: vendor.failoverRules,
        circuitBreakers: vendor.circuitBreakers,
        healthChecks: vendor.healthChecks.map((h) => ({
          id: h.id,
          status: h.status,
          responseTime: h.responseTime,
          isSuccess: h.isSuccess,
          errorMessage: h.errorMessage,
          uptimePercentage: Number(h.uptimePercentage || 0),
          errorRate: Number(h.errorRate || 0),
          avgResponseTime: h.avgResponseTime,
          checkedAt: h.checkedAt.toISOString(),
        })),
        dailyMetrics: vendor.dailyMetrics.map((m) => ({
          date: m.date.toISOString(),
          totalRequests: m.totalRequests,
          successfulRequests: m.successfulRequests,
          failedRequests: m.failedRequests,
          totalRevenue: Number(m.totalRevenue || 0),
          avgResponseTime: m.avgResponseTime,
          availability: Number(m.availability || 0),
        })),
      },
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN VENDOR API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch vendor",
    }, { status: 500 });
  }
}

// ============================================================
// PATCH - Update vendor
// ============================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingVendor) {
      return NextResponse.json({
        success: false,
        error: "Vendor not found",
      }, { status: 404 });
    }

    // Update vendor
    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        status: body.status as VendorStatus,
        priority: body.priority,
        apiBaseUrl: body.apiBaseUrl,
        authConfig: body.authConfig,
        successRate: body.successRate,
        avgResponseTime: body.avgResponseTime,
      },
      include: {
        services: true,
      },
    });

    const response = NextResponse.json({
      success: true,
      data: vendor,
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN VENDOR API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to update vendor",
    }, { status: 500 });
  }
}