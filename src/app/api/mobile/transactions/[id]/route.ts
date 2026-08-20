// src/app/api/mobile/transactions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/db";

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`📱 [MOBILE TRANSACTION] Fetching transaction: ${params.id}`);
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;

    const transaction = await prisma.vtuTransaction.findFirst({
      where: {
        id: params.id,
        userId,
      },
      include: {
        user: {
          select: {
            fullName: true,
            phone: true,
            email: true,
          },
        },
        subscription: {
          select: {
            id: true,
            type: true,
            meterNumber: true,
            decoderNumber: true,
            amount: true,
            nextRenewalDate: true,
          },
        },
        walletTransaction: {
          select: {
            id: true,
            amount: true,
            type: true,
            balanceBefore: true,
            balanceAfter: true,
            status: true,
            description: true,
            category: true,
            createdAt: true,
          },
        },
        customerTransaction: {
          include: {
            customer: {
              select: {
                fullName: true,
                phone: true,
                email: true,
                customerType: true,
                totalTransactions: true,
                totalSpent: true,
              },
            },
          },
        },
        attempts: {
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({
        success: false,
        error: "Transaction not found",
      }, { status: 404 });
    }

    const formattedTransaction = {
      id: transaction.id,
      type: transaction.transactionType,
      product: transaction.product,
      amount: Number(transaction.amount),
      serviceFee: Number(transaction.serviceFee),
      totalDebited: Number(transaction.totalDebited),
      status: transaction.status,
      phoneNumber: transaction.phoneNumber,
      network: transaction.network,
      meterNumber: transaction.meterNumber,
      meterType: transaction.meterType,
      networkPlan: transaction.networkPlan,
      vendorReference: transaction.vendorReference,
      vendor: transaction.vendor,
      token: transaction.token,
      tokenValidUntil: transaction.tokenValidUntil?.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      deliveredAt: transaction.deliveredAt?.toISOString(),
      scheduledFor: transaction.scheduledFor?.toISOString(),
      isBulkPurchase: transaction.isBulkPurchase,
      bulkQuantity: transaction.bulkQuantity,
      channel: transaction.channel,
      metadata: transaction.metadata,
      user: transaction.user,
      subscription: transaction.subscription,
      walletTransaction: transaction.walletTransaction,
      customerTransaction: transaction.customerTransaction,
      attempts: transaction.attempts,
      // Failed vendor attempts
      failedVendors: transaction.metadata?.vendorErrors || [],
      fallbackAttempts: transaction.fallbackAttempts,
    };

    console.log(`✅ [MOBILE TRANSACTION] Found transaction: ${params.id}`);

    return NextResponse.json({
      success: true,
      data: formattedTransaction,
    });
  } catch (error: any) {
    console.error("❌ [MOBILE TRANSACTION] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch transaction",
    }, { status: 500 });
  }
}