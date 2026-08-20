// src/lib/services/plan.service.ts

import { prisma } from "~/lib/db";
import { NetworkProvider, PlanType, ValidityUnit, PlanStatus } from "@prisma/client";

export interface PlanFilters {
  network?: NetworkProvider;
  planType?: PlanType;
  vendorId?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export class PlanService {
  
  /**
   * Get plans with filters
   */
  async getPlans(filters: PlanFilters = {}, limit: number = 100, offset: number = 0) {
    const where: any = {};

    if (filters.network) where.network = filters.network;
    if (filters.planType) where.planType = filters.planType;
    if (filters.vendorId) where.vendorId = filters.vendorId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.ourPrice = {};
      if (filters.minPrice !== undefined) where.ourPrice.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.ourPrice.lte = filters.maxPrice;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
        { vendorPlanId: { contains: filters.search } },
      ];
    }

    const [plans, total] = await Promise.all([
      prisma.dataPlan.findMany({
        where,
        include: {
          networkConfig: true,
          vendor: true,
          priceHistory: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: [
          { network: 'asc' },
          { planType: 'asc' },
          { amountMB: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.dataPlan.count({ where }),
    ]);

    return { plans, total, limit, offset };
  }

  /**
   * Get plans by network
   */
  async getPlansByNetwork(network: NetworkProvider) {
    return prisma.dataPlan.findMany({
      where: {
        network,
        isActive: true,
        status: PlanStatus.ACTIVE,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { planType: 'asc' },
        { amountMB: 'asc' },
      ],
    });
  }

  /**
   * Get a single plan by ID
   */
  async getPlanById(id: string) {
    return prisma.dataPlan.findUnique({
      where: { id },
      include: {
        networkConfig: true,
        vendor: true,
        priceHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Get plan by vendor plan ID
   */
  async getPlanByVendorId(vendorId: string, vendorPlanId: string) {
    return prisma.dataPlan.findFirst({
      where: {
        vendorId,
        vendorPlanId,
      },
      include: {
        networkConfig: true,
        vendor: true,
      },
    });
  }

  /**
   * Update plan price
   */
  async updatePrice(
    planId: string,
    newPrice: number,
    userId: string,
    reason?: string
  ) {
    const plan = await prisma.dataPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    // Create price history
    await prisma.planPriceHistory.create({
      data: {
        dataPlanId: planId,
        oldPrice: plan.ourPrice,
        newPrice,
        changedBy: userId,
        changeReason: reason,
      },
    });

    // Update plan
    return prisma.dataPlan.update({
      where: { id: planId },
      data: {
        ourPrice: newPrice,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    });
  }

  /**
   * Bulk update prices
   */
  async bulkUpdatePrices(
    updates: Array<{ planId: string; newPrice: number }>,
    userId: string,
    reason?: string
  ) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const update of updates) {
      try {
        await this.updatePrice(update.planId, update.newPrice, userId, reason);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to update ${update.planId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Toggle plan active status
   */
  async toggleStatus(planId: string, isActive: boolean) {
    return prisma.dataPlan.update({
      where: { id: planId },
      data: {
        isActive,
        status: isActive ? PlanStatus.ACTIVE : PlanStatus.INACTIVE,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get plans by vendor
   */
  async getPlansByVendor(vendorId: string) {
    return prisma.dataPlan.findMany({
      where: {
        vendorId,
        isActive: true,
      },
      include: {
        networkConfig: true,
      },
      orderBy: [
        { network: 'asc' },
        { amountMB: 'asc' },
      ],
    });
  }

  /**
   * Get plan statistics
   */
  async getStats() {
    const [total, byNetwork, byPlanType, activeCount] = await Promise.all([
      prisma.dataPlan.count(),
      prisma.dataPlan.groupBy({
        by: ['network'],
        _count: true,
        _sum: {
          ourPrice: true,
        },
      }),
      prisma.dataPlan.groupBy({
        by: ['planType'],
        _count: true,
      }),
      prisma.dataPlan.count({
        where: { isActive: true },
      }),
    ]);

    return {
      total,
      active: activeCount,
      inactive: total - activeCount,
      byNetwork: byNetwork.map(n => ({
        network: n.network,
        count: n._count,
        totalValue: n._sum.ourPrice || 0,
      })),
      byPlanType: byPlanType.map(p => ({
        planType: p.planType,
        count: p._count,
      })),
    };
  }

  /**
   * Search plans
   */
  async searchPlans(query: string, limit: number = 20) {
    return prisma.dataPlan.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { vendorPlanId: { contains: query } },
        ],
        isActive: true,
      },
      include: {
        networkConfig: true,
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      take: limit,
    });
  }
}