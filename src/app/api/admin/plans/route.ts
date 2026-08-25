// app/api/admin/plans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { PlanService } from "~/lib/services/plan.service";
import { PlanType, ValidityUnit, PlanStatus, NetworkProvider } from "@prisma/client";

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
    const isActiveForWhatsApp = searchParams.get("isActiveForWhatsApp");
    const minPrice = parseFloat(searchParams.get("minPrice") || "0");
    const maxPrice = parseFloat(searchParams.get("maxPrice") || "9999999");

    const where: any = {};

    if (network) where.network = network as NetworkProvider;
    if (planType) where.planType = planType as PlanType;
    if (vendorId) where.vendorId = vendorId;
    if (isActive !== undefined) where.isActive = isActive;
    if (isActiveForWhatsApp !== undefined && isActiveForWhatsApp !== "all") {
      where.isActiveForWhatsApp = isActiveForWhatsApp === "true";
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { vendorPlanId: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (minPrice > 0) where.ourPrice = { gte: minPrice };
    if (maxPrice < 9999999) where.ourPrice = { ...where.ourPrice, lte: maxPrice };

    const total = await prisma.dataPlan.count({ where });

    const plans = await prisma.dataPlan.findMany({
      where,
      orderBy: [
        { network: 'asc' },
        { isActiveForWhatsApp: 'desc' },
        { whatsappPriority: 'asc' },
        { planType: 'asc' },
        { amountMB: 'asc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        networkConfig: true,
        vendor: true,
        priceHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

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
      };
    });

    const stats = await prisma.dataPlan.groupBy({
      by: ['network'],
      where,
      _count: true,
      _sum: {
        ourPrice: true,
      },
    });

    const whatsappStats = await prisma.dataPlan.groupBy({
      by: ['network'],
      where: {
        ...where,
        isActiveForWhatsApp: true,
      },
      _count: true,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        plans: plansWithMargin,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: stats.map(s => ({
          network: s.network,
          count: s._count,
          totalValue: s._sum.ourPrice || 0,
        })),
        whatsappStats: {
          total: plansWithMargin.filter(p => p.isActiveForWhatsApp).length,
          byNetwork: whatsappStats.map(s => ({
            network: s.network,
            count: s._count,
          })),
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
    const { action, planId, newPrice, isActive, isActiveForWhatsApp, whatsappPriority, reason, updates } = body;

    let result;

    switch (action) {
      case "updatePrice":
        if (!planId) {
          return NextResponse.json({
            success: false,
            error: "planId is required",
          }, { status: 400 });
        }
        if (newPrice === undefined || newPrice < 0) {
          return NextResponse.json({
            success: false,
            error: "valid newPrice is required",
          }, { status: 400 });
        }
        result = await planService.updatePrice(planId, newPrice, "admin", reason);
        break;

      case "toggleStatus":
        if (!planId) {
          return NextResponse.json({
            success: false,
            error: "planId is required",
          }, { status: 400 });
        }
        if (isActive === undefined) {
          return NextResponse.json({
            success: false,
            error: "isActive is required",
          }, { status: 400 });
        }
        result = await planService.toggleStatus(planId, isActive);
        break;

      case "toggleWhatsApp":
        if (!planId) {
          return NextResponse.json({
            success: false,
            error: "planId is required",
          }, { status: 400 });
        }
        if (isActiveForWhatsApp === undefined) {
          return NextResponse.json({
            success: false,
            error: "isActiveForWhatsApp is required",
          }, { status: 400 });
        }
        
        const updatedPlan = await prisma.dataPlan.update({
          where: { id: planId },
          data: {
            isActiveForWhatsApp,
            whatsappPriority: whatsappPriority || 0,
          },
          include: {
            networkConfig: true,
            vendor: true,
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: "admin",
            action: "WHATSAPP_PLAN_TOGGLE",
            entityType: "DataPlan",
            entityId: planId,
            metadata: {
              planId,
              isActiveForWhatsApp,
              whatsappPriority: whatsappPriority || 0,
              planName: updatedPlan.name,
              network: updatedPlan.network,
              timestamp: new Date().toISOString(),
            },
          },
        });

        result = updatedPlan;
        break;

      case "bulkWhatsApp":
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
          return NextResponse.json({
            success: false,
            error: "updates array is required",
          }, { status: 400 });
        }

        const bulkResults = await prisma.$transaction(
          updates.map((update: { planId: string; isActiveForWhatsApp: boolean; priority?: number }) =>
            prisma.dataPlan.update({
              where: { id: update.planId },
              data: {
                isActiveForWhatsApp: update.isActiveForWhatsApp,
                whatsappPriority: update.priority || 0,
              },
            })
          )
        );

        await prisma.auditLog.create({
          data: {
            userId: "admin",
            action: "WHATSAPP_PLANS_BULK_UPDATE",
            entityType: "DataPlan",
            entityId: "bulk",
            metadata: {
              count: bulkResults.length,
              updates: updates.map(u => ({
                planId: u.planId,
                isActiveForWhatsApp: u.isActiveForWhatsApp,
              })),
              timestamp: new Date().toISOString(),
            },
          },
        });

        result = bulkResults;
        break;

      case "bulkUpdate":
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
          error: "Invalid action. Valid actions: updatePrice, toggleStatus, toggleWhatsApp, bulkWhatsApp, bulkUpdate",
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

export async function POST(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const {
      network,
      planType,
      planCategory,
      name,
      amountMB,
      description,
      ourPrice,
      vendorPrice,
      validity,
      validityUnit,
      vendorId,
      vendorPlanId,
      vendorNetworkCode,
      vendorPlanType,
      vendorMetadata,
      isActiveForWhatsApp,
      whatsappPriority,
    } = body;

    if (!network || !planType || !name || !ourPrice || !vendorPrice || !validity || !validityUnit) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: network, planType, name, ourPrice, vendorPrice, validity, validityUnit",
      }, { status: 400 });
    }

    const plan = await prisma.dataPlan.create({
      data: {
        network: network as NetworkProvider,
        planType: planType as PlanType,
        planCategory: planCategory || "DATA",
        name,
        amountMB: amountMB || 0,
        description: description || null,
        ourPrice,
        vendorPrice,
        validity,
        validityUnit: validityUnit as ValidityUnit,
        status: PlanStatus.ACTIVE,
        isActive: true,
        vendorId: vendorId || null,
        vendorPlanId: vendorPlanId || null,
        vendorNetworkCode: vendorNetworkCode || null,
        vendorPlanType: vendorPlanType || null,
        vendorMetadata: vendorMetadata || null,
        isActiveForWhatsApp: isActiveForWhatsApp || false,
        whatsappPriority: whatsappPriority || 0,
        createdBy: "admin",
        updatedBy: "admin",
      },
      include: {
        networkConfig: true,
        vendor: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: "admin",
        action: "PLAN_CREATED",
        entityType: "DataPlan",
        entityId: plan.id,
        metadata: {
          planId: plan.id,
          name: plan.name,
          network: plan.network,
          planType: plan.planType,
          ourPrice: plan.ourPrice,
          vendorPrice: plan.vendorPrice,
          isActiveForWhatsApp: plan.isActiveForWhatsApp,
          timestamp: new Date().toISOString(),
        },
      },
    });

    const response = NextResponse.json({
      success: true,
      data: plan,
      message: "Plan created successfully",
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN PLANS API] Error creating plan:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to create plan",
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { planId, ...updateData } = body;

    if (!planId) {
      return NextResponse.json({
        success: false,
        error: "planId is required",
      }, { status: 400 });
    }

    const existingPlan = await prisma.dataPlan.findUnique({
      where: { id: planId },
    });

    if (!existingPlan) {
      return NextResponse.json({
        success: false,
        error: "Plan not found",
      }, { status: 404 });
    }

    const plan = await prisma.dataPlan.update({
      where: { id: planId },
      data: {
        ...updateData,
        updatedBy: "admin",
        updatedAt: new Date(),
      },
      include: {
        networkConfig: true,
        vendor: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: "admin",
        action: "PLAN_UPDATED",
        entityType: "DataPlan",
        entityId: planId,
        metadata: {
          planId,
          updates: updateData,
          timestamp: new Date().toISOString(),
        },
      },
    });

    const response = NextResponse.json({
      success: true,
      data: plan,
      message: "Plan updated successfully",
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN PLANS API] Error updating plan:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to update plan",
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const planId = searchParams.get("planId");

    if (!planId) {
      return NextResponse.json({
        success: false,
        error: "planId is required",
      }, { status: 400 });
    }

    const existingPlan = await prisma.dataPlan.findUnique({
      where: { id: planId },
    });

    if (!existingPlan) {
      return NextResponse.json({
        success: false,
        error: "Plan not found",
      }, { status: 404 });
    }

    const plan = await prisma.dataPlan.update({
      where: { id: planId },
      data: {
        isActive: false,
        status: PlanStatus.INACTIVE,
        updatedBy: "admin",
        updatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: "admin",
        action: "PLAN_DELETED",
        entityType: "DataPlan",
        entityId: planId,
        metadata: {
          planId,
          name: plan.name,
          network: plan.network,
          timestamp: new Date().toISOString(),
        },
      },
    });

    const response = NextResponse.json({
      success: true,
      data: plan,
      message: "Plan deactivated successfully",
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN PLANS API] Error deleting plan:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to delete plan",
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