// app/api/summary/stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { TransactionStatus, VtuType, WalletTransactionType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all"; // all, week, month, year

    // Date filter
    let dateFilter = {};
    if (period !== "all") {
      const now = new Date();
      let startDate = new Date();
      switch (period) {
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      dateFilter = { createdAt: { gte: startDate } };
    }

    const whereClause = {
      userId: sessionUser.id,
      ...dateFilter,
    };

    // Get all stats in parallel
    const [
      totalTransactions,
      successfulTransactions,
      pendingTransactions,
      failedTransactions,
      totalVolume,
      byType,
      byNetwork,
      byStatus,
      walletStats,
    ] = await Promise.all([
      prisma.vtuTransaction.count({ where: whereClause }),
      prisma.vtuTransaction.count({
        where: { ...whereClause, status: TransactionStatus.SUCCESS },
      }),
      prisma.vtuTransaction.count({
        where: { ...whereClause, status: TransactionStatus.PENDING },
      }),
      prisma.vtuTransaction.count({
        where: { ...whereClause, status: TransactionStatus.FAILED },
      }),
      prisma.vtuTransaction.aggregate({
        where: { ...whereClause, status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
      }),
      prisma.vtuTransaction.groupBy({
        by: ['transactionType'],
        where: { ...whereClause, status: TransactionStatus.SUCCESS },
        _count: { transactionType: true },
        _sum: { amount: true },
      }),
      prisma.vtuTransaction.groupBy({
        by: ['network'],
        where: { ...whereClause, status: TransactionStatus.SUCCESS },
        _count: { network: true },
        _sum: { amount: true },
      }),
      prisma.vtuTransaction.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true },
      }),
      // Wallet transactions summary
      prisma.walletTransaction.aggregate({
        where: {
          userId: sessionUser.id,
          status: TransactionStatus.SUCCESS,
          ...dateFilter,
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Format by type
    const typeStats = byType.map(t => ({
      type: t.transactionType,
      count: t._count.transactionType,
      amount: Number(t._sum.amount || 0),
      label: getTypeLabel(t.transactionType),
    }));

    // Format by network
    const networkStats = byNetwork.map(n => ({
      network: n.network,
      count: n._count.network,
      amount: Number(n._sum.amount || 0),
    }));

    // Format by status
    const statusStats = byStatus.map(s => ({
      status: s.status,
      count: s._count.status,
    }));

    // Get recent transactions (last 10)
    const recentTransactions = await prisma.vtuTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        transactionType: true,
        amount: true,
        totalDebited: true,
        status: true,
        product: true,
        phoneNumber: true,
        network: true,
        createdAt: true,
        deliveredAt: true,
        vendor: true,
        vendorReference: true,
      },
    });

    const formattedRecent = recentTransactions.map(t => ({
      ...t,
      amount: Number(t.amount),
      totalDebited: Number(t.totalDebited),
      createdAt: t.createdAt.toISOString(),
      deliveredAt: t.deliveredAt?.toISOString(),
    }));

    // Get wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: sessionUser.id },
      select: { walletBalance: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        total: totalTransactions,
        successful: successfulTransactions,
        pending: pendingTransactions,
        failed: failedTransactions,
        totalVolume: Number(totalVolume._sum.amount || 0),
        byType: typeStats,
        byNetwork: networkStats,
        byStatus: statusStats,
        period,
        recentTransactions: formattedRecent,
        walletBalance: Number(wallet?.walletBalance || 0),
        walletStats: {
          totalVolume: Number(walletStats._sum.amount || 0),
          totalCount: Number(walletStats._count.id || 0),
        },
      },
    });
  } catch (error: any) {
    console.error("❌ [SUMMARY STATS] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch summary stats",
    }, { status: 500 });
  }
}

function getTypeLabel(type: VtuType): string {
  const labels: Record<VtuType, string> = {
    AIRTIME: "Airtime",
    DATA: "Data",
    ELECTRICITY_INSTANT: "Electricity",
    ELECTRICITY_PREORDER: "Electricity (Pre-order)",
    CABLE_TV: "Cable TV",
    EDUCATION: "Education",
    INSURANCE: "Insurance",
  };
  return labels[type] || type;
}