// bilscore-app/app/api/admin/dashboard/stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { TransactionStatus } from "@prisma/client";

// ✅ Validate API Key (NOT session)
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
    console.log(`❌ [ADMIN DASHBOARD API] Invalid API key: ${apiKey.substring(0, 10)}...`);
    console.log(`✅ [ADMIN DASHBOARD API] Valid keys:`, validApiKeys.map(k => k?.substring(0, 10) + '...'));
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true };
}

export async function GET(request: NextRequest) {
  try {
    // ✅ Validate API key (NOT session)
    const auth = validateApiKey(request);
    if (!auth.valid) {
      console.log(`❌ [ADMIN DASHBOARD API] ${auth.error}`);
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    console.log(`📊 [ADMIN DASHBOARD API] Authenticated via API key`);

    const searchParams = new URL(request.url).searchParams;
    const period = searchParams.get("period") || "7d";

    // Date filter
    let dateFilter = {};
    if (period !== "all") {
      const days = parseInt(period) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter = { createdAt: { gte: startDate } };
    }

    // Fetch all stats in parallel
    const [
      totalUsers,
      userRoleBreakdown,
      totalTransactions,
      transactionStatusBreakdown,
      transactionTypeBreakdown,
      totalRevenue,
      dailyRevenue,
      totalVendors,
      vendorStatusBreakdown,
      walletStats,
      recentTransactions,
      totalCustomers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      prisma.vtuTransaction.count({ where: dateFilter }),
      prisma.vtuTransaction.groupBy({
        by: ['status'],
        where: dateFilter,
        _count: { status: true },
        _sum: { amount: true },
      }),
      prisma.vtuTransaction.groupBy({
        by: ['transactionType'],
        where: { ...dateFilter, status: TransactionStatus.SUCCESS },
        _count: { transactionType: true },
        _sum: { amount: true },
      }),
      prisma.vtuTransaction.aggregate({
        where: { ...dateFilter, status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
      }),
      prisma.vtuTransaction.groupBy({
        by: ['createdAt'],
        where: { ...dateFilter, status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.vendor.count(),
      prisma.vendor.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.wallet.aggregate({
        _sum: { walletBalance: true },
      }),
      prisma.vtuTransaction.findMany({
        where: dateFilter,
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.customer.count(),
    ]);

    // Format daily data for chart
    const dailyChartData = dailyRevenue.map(item => ({
      date: item.createdAt.toISOString().split('T')[0],
      amount: Number(item._sum.amount || 0),
      count: item._count.id,
    }));

    // Calculate success rate
    const successCount = transactionStatusBreakdown.find(
      t => t.status === TransactionStatus.SUCCESS
    )?._count.status || 0;
    const totalCount = transactionStatusBreakdown.reduce(
      (sum, t) => sum + t._count.status,
      0
    );
    const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

    // Format status breakdown
    const statusBreakdown = transactionStatusBreakdown.map(t => ({
      status: t.status,
      count: t._count.status,
      amount: Number(t._sum.amount || 0),
    }));

    // Format type breakdown
    const typeBreakdown = transactionTypeBreakdown.map(t => ({
      type: t.transactionType,
      count: t._count.transactionType,
      amount: Number(t._sum.amount || 0),
    }));

    // Format role breakdown
    const roleBreakdown = userRoleBreakdown.map(r => ({
      role: r.role,
      count: r._count.role,
    }));

    // Format vendor breakdown
    const vendorBreakdown = vendorStatusBreakdown.map(v => ({
      status: v.status,
      count: v._count.status,
    }));

    // Format recent transactions
    const formattedRecent = recentTransactions.map(t => ({
      id: t.id,
      type: t.transactionType,
      product: t.product,
      amount: Number(t.amount),
      status: t.status,
      phoneNumber: t.phoneNumber,
      createdAt: t.createdAt.toISOString(),
      user: t.user,
    }));

    // ✅ Add CORS headers for admin app
    const response = NextResponse.json({
      success: true,
      data: {
        period,
        stats: {
          totalUsers,
          totalTransactions: totalCount,
          totalRevenue: Number(totalRevenue._sum.amount || 0),
          totalVendors,
          totalWalletBalance: Number(walletStats._sum.walletBalance || 0),
          totalCustomers,
          successRate,
        },
        breakdown: {
          byRole: roleBreakdown,
          byStatus: statusBreakdown,
          byType: typeBreakdown,
          byVendorStatus: vendorBreakdown,
        },
        dailyChart: dailyChartData,
        recentTransactions: formattedRecent,
      },
    });

    // ✅ Set CORS headers
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN DASHBOARD API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch dashboard stats",
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}