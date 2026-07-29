// bilscore-app/app/api/admin/transactions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { TransactionStatus } from "@prisma/client";

// ✅ Use the exact same validation function as other routes
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
    // ✅ Validate API key using the same function as other routes
    const auth = validateApiKey(request);
    if (!auth.valid) {
      console.log(`❌ [TRANSACTIONS API] ${auth.error}`);
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    console.log(`📊 [TRANSACTIONS API] Authenticated via API key`);

    const searchParams = new URL(request.url).searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const period = searchParams.get("period") || "all";

    const skip = (page - 1) * limit;

    // Date filter
    let dateFilter = {};
    if (period !== "all") {
      const days = parseInt(period) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter = { createdAt: { gte: startDate } };
    }

    // Build where clause
    const where: any = { ...dateFilter };

    if (search) {
      where.OR = [
        { product: { contains: search } },
        { phoneNumber: { contains: search } },
        { id: { contains: search } },
        { vendorReference: { contains: search } },
        { user: { fullName: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    if (type && type !== "all") {
      where.transactionType = type;
    }

    if (status && status !== "all") {
      where.status = status as TransactionStatus;
    }

    // Fetch transactions
    const [transactions, total] = await Promise.all([
      prisma.vtuTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          selectedVendor: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      prisma.vtuTransaction.count({ where }),
    ]);

    // Format transactions
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      type: tx.transactionType,
      product: tx.product,
      amount: Number(tx.amount),
      serviceFee: Number(tx.serviceFee || 0),
      totalDebited: Number(tx.totalDebited),
      status: tx.status,
      phoneNumber: tx.phoneNumber,
      meterNumber: tx.meterNumber,
      network: tx.network,
      networkPlan: tx.networkPlan,
      token: tx.token,
      vendorReference: tx.vendorReference,
      vendor: tx.vendor,
      vendorName: tx.selectedVendor?.name || tx.vendor,
      channel: tx.channel,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
      deliveredAt: tx.deliveredAt?.toISOString(),
      scheduledFor: tx.scheduledFor?.toISOString(),
      user: tx.user,
      isBulkPurchase: tx.isBulkPurchase,
      bulkQuantity: tx.bulkQuantity,
    }));

    // ✅ Add CORS headers
    const response = NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN TRANSACTIONS API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch transactions",
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