// bilscore-app/app/api/admin/vendors/health/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VendorStatus } from "@prisma/client";

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

    const vendors = await prisma.vendor.findMany({
      where: { status: { not: VendorStatus.INACTIVE } },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        successRate: true,
        avgResponseTime: true,
        consecutiveFailures: true,
        lastCheckAt: true,
        lastSuccessAt: true,
        lastFailureAt: true,
        healthChecks: {
          take: 1,
          orderBy: { checkedAt: "desc" },
          select: {
            status: true,
            responseTime: true,
            isSuccess: true,
            errorMessage: true,
            uptimePercentage: true,
            errorRate: true,
            checkedAt: true,
          },
        },
      },
      orderBy: { priority: "asc" },
    });

    const response = NextResponse.json({
      success: true,
      data: vendors.map((v) => ({
        vendorId: v.id,
        vendorName: v.name,
        vendorCode: v.code,
        status: v.status,
        successRate: Number(v.successRate || 0),
        avgResponseTime: v.avgResponseTime,
        consecutiveFailures: v.consecutiveFailures,
        lastCheckAt: v.lastCheckAt?.toISOString(),
        lastSuccessAt: v.lastSuccessAt?.toISOString(),
        lastFailureAt: v.lastFailureAt?.toISOString(),
        health: v.healthChecks[0] ? {
          status: v.healthChecks[0].status,
          responseTime: v.healthChecks[0].responseTime,
          isSuccess: v.healthChecks[0].isSuccess,
          errorMessage: v.healthChecks[0].errorMessage,
          uptimePercentage: Number(v.healthChecks[0].uptimePercentage || 0),
          errorRate: Number(v.healthChecks[0].errorRate || 0),
          checkedAt: v.healthChecks[0].checkedAt.toISOString(),
        } : null,
      })),
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN VENDOR HEALTH API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch vendor health",
    }, { status: 500 });
  }
}

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