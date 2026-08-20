// src/app/api/mobile/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/db";
import { TransactionStatus } from "@prisma/client";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

async function authenticateMobile(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  console.log("📱 [MOBILE TRANSACTIONS] Fetching transactions...");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { userId };

    if (search) {
      where.OR = [
        { phoneNumber: { contains: search } },
        { product: { contains: search } },
        { id: { contains: search } },
        { vendorReference: { contains: search } },
      ];
    }

    if (type && type !== "all") {
      where.transactionType = type;
    }

    if (status && status !== "all") {
      where.status = status as TransactionStatus;
    }

    if (startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(endDate),
      };
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
              fullName: true,
              phone: true,
            },
          },
          subscription: {
            select: {
              id: true,
              type: true,
              meterNumber: true,
              decoderNumber: true,
            },
          },
        },
      }),
      prisma.vtuTransaction.count({ where }),
    ]);

    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      type: tx.transactionType,
      product: tx.product,
      amount: Number(tx.amount),
      serviceFee: Number(tx.serviceFee),
      totalDebited: Number(tx.totalDebited),
      status: tx.status,
      phoneNumber: tx.phoneNumber,
      network: tx.network,
      meterNumber: tx.meterNumber,
      meterType: tx.meterType,
      networkPlan: tx.networkPlan,
      vendorReference: tx.vendorReference,
      vendor: tx.vendor,
      token: tx.token,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
      deliveredAt: tx.deliveredAt?.toISOString(),
      scheduledFor: tx.scheduledFor?.toISOString(),
      isBulkPurchase: tx.isBulkPurchase,
      bulkQuantity: tx.bulkQuantity,
      channel: tx.channel,
      user: tx.user,
      subscription: tx.subscription,
      metadata: tx.metadata,
    }));

    console.log(`✅ [MOBILE TRANSACTIONS] Found ${transactions.length} transactions (total: ${total})`);

    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("❌ [MOBILE TRANSACTIONS] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch transactions",
    }, { status: 500 });
  }
}