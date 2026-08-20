// bilscore-app/app/api/admin/analytics/transactions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { TransactionStatus, VtuType } from "@prisma/client";

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

function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
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

    console.log(`📊 [ANALYTICS API] Fetching transaction analytics...`);

    const searchParams = new URL(request.url).searchParams;
    const period = searchParams.get("period") || "30d";
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    // Date filter
    let dateFilter = {};
    if (period !== "all") {
      const days = parseInt(period) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter = { createdAt: { gte: startDate } };
    }

    const where: any = { ...dateFilter };
    if (type && type !== "all") where.transactionType = type;
    if (status && status !== "all") where.status = status;

    // Fetch all analytics in parallel
    const [
      totalTransactions,
      statusBreakdown,
      typeBreakdown,
      dailyRevenue,
      monthlyRevenue,
      topProducts,
      topUsers,
      vendorPerformance,
      totalVolume,
      successRate,
      networkBreakdown,
    ] = await Promise.all([
      // Total transactions
      prisma.vtuTransaction.count({ where }),
      
      // Status breakdown
      prisma.vtuTransaction.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
        _sum: { amount: true },
      }),
      
      // Type breakdown
      prisma.vtuTransaction.groupBy({
        by: ['transactionType'],
        where: { ...where, status: TransactionStatus.SUCCESS },
        _count: { transactionType: true },
        _sum: { amount: true },
      }),
      
      // Daily revenue (last 30 days)
      prisma.vtuTransaction.groupBy({
        by: ['createdAt'],
        where: { ...where, status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
      
      // Monthly revenue
      prisma.vtuTransaction.groupBy({
        by: ['createdAt'],
        where: { ...where, status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
      
      // Top products
      prisma.vtuTransaction.groupBy({
        by: ['product'],
        where: { ...where, status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),
      
      // Top users
      prisma.vtuTransaction.groupBy({
        by: ['userId'],
        where: { ...where, status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),
      
      // Vendor performance
      prisma.vtuTransaction.groupBy({
        by: ['vendor'],
        where: { ...where },
        _count: { id: true },
        _sum: { amount: true },
      }),
      
      // Total volume
      prisma.vtuTransaction.aggregate({
        where,
        _sum: { amount: true },
      }),
      
      // Success rate
      prisma.vtuTransaction.aggregate({
        where: { ...where, status: TransactionStatus.SUCCESS },
        _count: { id: true },
      }),
      
      // Network breakdown
      prisma.vtuTransaction.groupBy({
        by: ['network'],
        where: { ...where, status: TransactionStatus.SUCCESS },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    // Calculate success rate
    const totalCount = statusBreakdown.reduce((sum, s) => sum + s._count.status, 0);
    const successCount = successRate._count.id || 0;
    const successRatePercentage = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

    // Format daily data for chart
    const dailyChartData = dailyRevenue.map(item => ({
      date: item.createdAt.toISOString().split('T')[0],
      amount: Number(item._sum.amount || 0),
      count: item._count.id,
    }));

    // Format monthly data
    const monthlyChartData = monthlyRevenue.reduce((acc: any[], item) => {
      const month = item.createdAt.toISOString().substring(0, 7);
      const existing = acc.find(d => d.month === month);
      if (existing) {
        existing.amount += Number(item._sum.amount || 0);
        existing.count += item._count.id;
      } else {
        acc.push({
          month,
          amount: Number(item._sum.amount || 0),
          count: item._count.id,
        });
      }
      return acc;
    }, []);

    // Get user details for top users
    const topUserIds = topUsers.map(t => t.userId);
    const userDetails = await prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      },
    });

    const userMap = Object.fromEntries(userDetails.map(u => [u.id, u]));

    const formattedTopUsers = topUsers.map(t => ({
      user: userMap[t.userId] || null,
      totalSpent: Number(t._sum.amount || 0),
      transactionCount: t._count.id,
    }));

    const response = addCorsHeaders(
      NextResponse.json({
        success: true,
        data: {
          summary: {
            totalTransactions,
            totalVolume: Number(totalVolume._sum.amount || 0),
            successRate: successRatePercentage,
            averageTransactionValue: totalCount > 0 ? Number(totalVolume._sum.amount || 0) / totalCount : 0,
          },
          breakdown: {
            byStatus: statusBreakdown.map(s => ({
              status: s.status,
              count: s._count.status,
              amount: Number(s._sum.amount || 0),
            })),
            byType: typeBreakdown.map(t => ({
              type: t.transactionType,
              count: t._count.transactionType,
              amount: Number(t._sum.amount || 0),
            })),
            byNetwork: networkBreakdown.map(n => ({
              network: n.network,
              count: n._count.id,
              amount: Number(n._sum.amount || 0),
            })),
            byVendor: vendorPerformance.map(v => ({
              vendor: v.vendor || 'Unknown',
              count: v._count.id,
              amount: Number(v._sum.amount || 0),
            })),
          },
          charts: {
            daily: dailyChartData,
            monthly: monthlyChartData,
          },
          top: {
            products: topProducts.map(p => ({
              product: p.product,
              count: p._count.id,
              revenue: Number(p._sum.amount || 0),
            })),
            users: formattedTopUsers,
          },
        },
      })
    );

    return response;

  } catch (error: any) {
    console.error("💥 [ANALYTICS API] Error:", error);
    return addCorsHeaders(
      NextResponse.json({
        success: false,
        error: error.message || "Failed to fetch analytics",
      }, { status: 500 })
    );
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}