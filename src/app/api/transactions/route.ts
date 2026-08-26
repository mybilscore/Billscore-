// app/api/transactions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { TransactionStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const channelDisplay = searchParams.get("channelDisplay");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { userId: sessionUser.id };

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

    if (channelDisplay && channelDisplay !== "all") {
      where.channelDisplay = channelDisplay;
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
          walletTransaction: {
            select: {
              balanceBefore: true,
              balanceAfter: true,
              reference: true,
              description: true,
            },
          },
        },
      }),
      prisma.vtuTransaction.count({ where }),
    ]);

    // ✅ Format transactions - INCLUDE channelDisplay and all fields
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      type: tx.transactionType,
      product: tx.product,
      amount: Number(tx.amount),
      totalDebited: Number(tx.totalDebited),
      status: tx.status,
      phoneNumber: tx.phoneNumber,
      network: tx.network,
      networkPlan: tx.networkPlan,
      meterNumber: tx.meterNumber,
      meterType: tx.meterType,
      token: tx.token,
      vendor: tx.vendor,
      vendorReference: tx.vendorReference,
      vendorCommission: tx.vendorCommission ? Number(tx.vendorCommission) : null,
      channel: tx.channel,
      channelDisplay: tx.channelDisplay, // ✅ CRITICAL FIX - include channelDisplay
      isBulkPurchase: tx.isBulkPurchase,
      bulkQuantity: tx.bulkQuantity,
      scheduledFor: tx.scheduledFor?.toISOString() || null,
      deliveredAt: tx.deliveredAt?.toISOString() || null,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
      user: tx.user,
      balanceBefore: tx.walletTransaction?.balanceBefore ? Number(tx.walletTransaction.balanceBefore) : null,
      balanceAfter: tx.walletTransaction?.balanceAfter ? Number(tx.walletTransaction.balanceAfter) : null,
      walletReference: tx.walletTransaction?.reference || null,
      walletDescription: tx.walletTransaction?.description || null,
      hasWalletTransaction: !!tx.walletTransaction,
    }));

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
    console.error("❌ Error fetching transactions:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch transactions",
    }, { status: 500 });
  }
}