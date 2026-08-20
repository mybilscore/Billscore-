// bilscore-app/app/api/admin/plans/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { PlanService } from "~/lib/services/plan.service";
import { PlanType, ValidityUnit, PlanStatus } from "@prisma/client";

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

const planService = new PlanService();

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const network = searchParams.get("network");
    const planType = searchParams.get("planType");
    const vendorId = searchParams.get("vendorId");
    const isActive = searchParams.get("isActive") !== "false";
    const minPrice = parseFloat(searchParams.get("minPrice") || "0");
    const maxPrice = parseFloat(searchParams.get("maxPrice") || "9999999");

    const result = await planService.getPlans({
      network: network as any,
      planType: planType as any,
      vendorId: vendorId as any,
      isActive,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      search: search || undefined,
    }, limit, (page - 1) * limit);

    const response = NextResponse.json({
      success: true,
      data: {
        plans: result.plans,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      },
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN PLANS API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch plans",
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { action, planId, newPrice, isActive, reason } = body;

    if (!planId) {
      return NextResponse.json({
        success: false,
        error: "planId is required",
      }, { status: 400 });
    }

    let result;

    switch (action) {
      case "updatePrice":
        if (newPrice === undefined || newPrice < 0) {
          return NextResponse.json({
            success: false,
            error: "valid newPrice is required",
          }, { status: 400 });
        }
        result = await planService.updatePrice(planId, newPrice, "admin", reason);
        break;

      case "toggleStatus":
        if (isActive === undefined) {
          return NextResponse.json({
            success: false,
            error: "isActive is required",
          }, { status: 400 });
        }
        result = await planService.toggleStatus(planId, isActive);
        break;

      case "bulkUpdate":
        const { updates } = body;
        if (!updates || !Array.isArray(updates)) {
          return NextResponse.json({
            success: false,
            error: "updates array is required",
          }, { status: 400 });
        }
        result = await planService.bulkUpdatePrices(updates, "admin", reason);
        break;

      default:
        return NextResponse.json({
          success: false,
          error: "Invalid action. Valid actions: updatePrice, toggleStatus, bulkUpdate",
        }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      data: result,
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN PLANS API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to update plan",
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