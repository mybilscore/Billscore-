// bilscore-app/app/api/admin/dashboard/stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { TransactionStatus } from "@prisma/client";

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
    console.log(`❌ [ADMIN DASHBOARD API] Invalid API key`);
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true };
}

function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return addCorsHeaders(
        NextResponse.json({ error: auth.error }, { status: 401 })
      );
    }

    console.log(`📊 [ADMIN DASHBOARD API] Authenticated via API key`);

    const searchParams = new URL(request.url).searchParams;
    const period = searchParams.get("period") || "7";

    // ✅ Fix: Parse period correctly - support both "7d" and "7"
    let days = 7;
    if (period === "all") {
      days = 0; // No date filter
    } else {
      const numMatch = period.match(/\d+/);
      if (numMatch) {
        days = parseInt(numMatch[0]) || 7;
      }
    }

    console.log(`📊 [ADMIN DASHBOARD API] Period: ${period}, Days: ${days}`);

    // Date filter
    let dateFilter = {};
    if (days > 0) {
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
      // Total users
      prisma.user.count(),
      
      // User role breakdown
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      
      // Total transactions in period
      prisma.vtuTransaction.count({ where: dateFilter }),
      
      // Transaction status breakdown
      prisma.vtuTransaction.groupBy({
        by: ['status'],
        where: dateFilter,
        _count: { status: true },
        _sum: { amount: true },
      }),
      
      // Transaction type breakdown (only successful)
      prisma.vtuTransaction.groupBy({
        by: ['transactionType'],
        where: { ...dateFilter, status: TransactionStatus.SUCCESS },
        _count: { transactionType: true },
        _sum: { amount: true },
      }),
      
      // Total revenue (only successful)
      prisma.vtuTransaction.aggregate({
        where: { ...dateFilter, status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
      }),
      
      // Daily revenue chart
      prisma.vtuTransaction.groupBy({
        by: ['createdAt'],
        where: { ...dateFilter, status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
      
      // Total vendors
      prisma.vendor.count(),
      
      // Vendor status breakdown
      prisma.vendor.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      
      // Wallet stats (only active wallets)
      prisma.wallet.aggregate({
        where: { isActive: true },
        _sum: { walletBalance: true },
      }),
      
      // Recent transactions
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
      
      // Total customers
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

    const response = addCorsHeaders(
      NextResponse.json({
        success: true,
        data: {
          period: period,
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
      })
    );

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN DASHBOARD API] Error:", error);
    return addCorsHeaders(
      NextResponse.json({
        success: false,
        error: error.message || "Failed to fetch dashboard stats",
      }, { status: 500 })
    );
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}