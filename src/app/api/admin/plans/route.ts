// app/api/admin/plans/route.ts - FIXED

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

    // Calculate all margins including agent
    const plansWithMargin = plans.map(plan => {
      const ourPrice = Number(plan.ourPrice);
      const vendorPrice = Number(plan.vendorPrice);
      const agentPrice = Number(plan.agentPrice || 0);
      
      // Retail margin (Your Price - Vendor Price)
      const margin = ourPrice - vendorPrice;
      const marginPercentage = vendorPrice > 0 ? (margin / vendorPrice) * 100 : 0;
      
      // Agent margin (Your Price - Agent Price) - what agents earn
      const agentMargin = ourPrice - agentPrice;
      const agentMarginPercentage = agentPrice > 0 ? (agentMargin / agentPrice) * 100 : 0;
      
      // Vendor to Agent margin (Agent Price - Vendor Price) - platform's cut
      const vendorToAgentMargin = agentPrice - vendorPrice;
      const vendorToAgentMarginPercentage = vendorPrice > 0 ? (vendorToAgentMargin / vendorPrice) * 100 : 0;
      
      return {
        ...plan,
        ourPrice,
        vendorPrice,
        agentPrice,
        margin,
        marginPercentage,
        agentMargin,
        agentMarginPercentage,
        vendorToAgentMargin,
        vendorToAgentMarginPercentage,
      };
    });

    const stats = await prisma.dataPlan.groupBy({
      by: ['network'],
      where,
      _count: true,
      _sum: {
        ourPrice: true,
        vendorPrice: true,
        agentPrice: true,
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
          totalVendorValue: s._sum.vendorPrice || 0,
          totalAgentValue: s._sum.agentPrice || 0,
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
    const { action, planId, newPrice, agentPrice, isActive, isActiveForWhatsApp, whatsappPriority, reason, updates, planIds } = body;

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

      // ✅ UPDATE AGENT PRICE - Fixed audit log
      case "updateAgentPrice":
        if (!planId) {
          return NextResponse.json({
            success: false,
            error: "planId is required",
          }, { status: 400 });
        }
        if (agentPrice === undefined || agentPrice < 0) {
          return NextResponse.json({
            success: false,
            error: "valid agentPrice is required",
          }, { status: 400 });
        }
        
        // Update agent price
        const updatedAgentPlan = await prisma.dataPlan.update({
          where: { id: planId },
          data: {
            agentPrice,
            updatedBy: "admin",
            updatedAt: new Date(),
          },
          include: {
            networkConfig: true,
            vendor: true,
          },
        });

        // ✅ FIXED: Create audit log without userId foreign key constraint
        // Option 1: Skip audit log for now
        // Option 2: Use a system user ID if one exists
        try {
          // Try to find a system user or use a valid user ID
          const systemUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
            select: { id: true },
          });

          if (systemUser) {
            await prisma.auditLog.create({
              data: {
                userId: systemUser.id,
                action: "AGENT_PRICE_UPDATE",
                entityType: "DataPlan",
                entityId: planId,
                metadata: {
                  planId,
                  oldAgentPrice: updatedAgentPlan.agentPrice,
                  newAgentPrice: agentPrice,
                  planName: updatedAgentPlan.name,
                  network: updatedAgentPlan.network,
                  reason: reason || "Manual agent price update",
                  timestamp: new Date().toISOString(),
                },
              },
            });
          }
        } catch (auditError) {
          // Log but don't fail the request if audit fails
          console.warn("⚠️ Audit log creation failed:", auditError);
        }

        result = updatedAgentPlan;
        break;

      // ✅ BULK UPDATE AGENT PRICE - Fixed audit log
      case "bulkUpdateAgentPrice":
        if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
          return NextResponse.json({
            success: false,
            error: "planIds array is required",
          }, { status: 400 });
        }
        if (agentPrice === undefined || agentPrice < 0) {
          return NextResponse.json({
            success: false,
            error: "valid agentPrice is required",
          }, { status: 400 });
        }

        const bulkAgentResult = await prisma.$transaction(
          planIds.map((id: string) =>
            prisma.dataPlan.update({
              where: { id },
              data: {
                agentPrice,
                updatedBy: "admin",
                updatedAt: new Date(),
              },
            })
          )
        );

        // ✅ FIXED: Try to create audit log without failing
        try {
          const systemUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
            select: { id: true },
          });

          if (systemUser) {
            await prisma.auditLog.create({
              data: {
                userId: systemUser.id,
                action: "BULK_AGENT_PRICE_UPDATE",
                entityType: "DataPlan",
                entityId: "bulk",
                metadata: {
                  planIds,
                  agentPrice,
                  count: bulkAgentResult.length,
                  reason: reason || "Bulk agent price update",
                  timestamp: new Date().toISOString(),
                },
              },
            });
          }
        } catch (auditError) {
          console.warn("⚠️ Audit log creation failed:", auditError);
        }

        result = {
          updatedCount: bulkAgentResult.length,
          plans: bulkAgentResult,
        };
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

        try {
          const systemUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
            select: { id: true },
          });

          if (systemUser) {
            await prisma.auditLog.create({
              data: {
                userId: systemUser.id,
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
          }
        } catch (auditError) {
          console.warn("⚠️ Audit log creation failed:", auditError);
        }

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

        try {
          const systemUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
            select: { id: true },
          });

          if (systemUser) {
            await prisma.auditLog.create({
              data: {
                userId: systemUser.id,
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
          }
        } catch (auditError) {
          console.warn("⚠️ Audit log creation failed:", auditError);
        }

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
          error: "Invalid action. Valid actions: updatePrice, updateAgentPrice, bulkUpdateAgentPrice, toggleStatus, toggleWhatsApp, bulkWhatsApp, bulkUpdate",
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
      agentPrice,
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
        agentPrice: agentPrice || vendorPrice,
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

    try {
      const systemUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (systemUser) {
        await prisma.auditLog.create({
          data: {
            userId: systemUser.id,
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
              agentPrice: plan.agentPrice,
              isActiveForWhatsApp: plan.isActiveForWhatsApp,
              timestamp: new Date().toISOString(),
            },
          },
        });
      }
    } catch (auditError) {
      console.warn("⚠️ Audit log creation failed:", auditError);
    }

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

    try {
      const systemUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (systemUser) {
        await prisma.auditLog.create({
          data: {
            userId: systemUser.id,
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
      }
    } catch (auditError) {
      console.warn("⚠️ Audit log creation failed:", auditError);
    }

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

    try {
      const systemUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (systemUser) {
        await prisma.auditLog.create({
          data: {
            userId: systemUser.id,
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
      }
    } catch (auditError) {
      console.warn("⚠️ Audit log creation failed:", auditError);
    }

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