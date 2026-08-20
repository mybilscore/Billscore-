// app/dashboard/bill-schedule/transactions/page.tsx - UPDATED

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { BillScheduleTransactionsClient } from "./page.client";
import { TransactionStatus, SubscriptionType, PreOrderStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export default async function BillScheduleTransactionsPage() {
  console.log("📊 [BILL SCHEDULE TRANSACTIONS] Loading...");

  const sessionUser = await requireAuth("/auth/sign-in");

  // ✅ Helper function to safely convert Decimal to number
  const toNumber = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    if (value instanceof Decimal) return value.toNumber();
    if (typeof value === 'number') return value;
    const num = Number(value);
    return isNaN(num) ? null : num;
  };

  // Fetch all pre-order transactions only (no subscriptions)
  const preOrderTransactions = await prisma.vtuTransaction.findMany({
    where: {
      userId: sessionUser.id,
      preOrder: { isNot: null },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      preOrder: {
        select: {
          id: true,
          meterNumber: true,
          disCo: true,
          amount: true,
          deliveryDate: true,
          status: true,
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
  });

  // Fetch pre-order stats
  const preOrderStats = await prisma.preOrder.aggregate({
    where: { userId: sessionUser.id },
    _count: { id: true },
    _sum: { amount: true },
  });

  // Format pre-order transactions
  const formattedPreOrderTx = preOrderTransactions.map(tx => {
    // Check if token should be visible (only on or after delivery date)
    const shouldShowToken = tx.scheduledFor && new Date(tx.scheduledFor) <= new Date();
    const isDelivered = tx.status === TransactionStatus.SUCCESS && tx.deliveredAt;
    const isPreOrderDelivered = tx.preOrder?.status === PreOrderStatus.DELIVERED;

    return {
      id: tx.id,
      transactionType: tx.transactionType,
      amount: Number(tx.amount),
      totalDebited: Number(tx.totalDebited),
      status: tx.status,
      product: tx.product,
      phoneNumber: tx.phoneNumber,
      meterNumber: tx.meterNumber,
      meterType: tx.meterType,
      network: tx.network,
      token: (shouldShowToken || isDelivered || isPreOrderDelivered) ? tx.token : null,
      vendor: tx.vendor,
      vendorReference: tx.vendorReference,
      vendorCommission: toNumber(tx.vendorCommission),
      commissionRate: toNumber(tx.commissionRate),
      channel: tx.channel,
      createdAt: tx.createdAt.toISOString(),
      deliveredAt: tx.deliveredAt?.toISOString(),
      scheduledFor: tx.scheduledFor?.toISOString(),
      balanceBefore: tx.walletTransaction?.balanceBefore ? toNumber(tx.walletTransaction.balanceBefore) : null,
      balanceAfter: tx.walletTransaction?.balanceAfter ? toNumber(tx.walletTransaction.balanceAfter) : null,
      walletReference: tx.walletTransaction?.reference || null,
      walletDescription: tx.walletTransaction?.description || null,
      preOrder: tx.preOrder ? {
        id: tx.preOrder.id,
        meterNumber: tx.preOrder.meterNumber,
        disCo: tx.preOrder.disCo,
        amount: Number(tx.preOrder.amount),
        deliveryDate: tx.preOrder.deliveryDate.toISOString(),
        status: tx.preOrder.status,
      } : null,
    };
  });

  // Sort by date (newest first)
  const allTransactions = formattedPreOrderTx.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Stats
  const stats = {
    totalPreOrders: preOrderStats._count.id || 0,
    totalPreOrderSpent: Number(preOrderStats._sum.amount || 0),
    totalTransactions: allTransactions.length,
    pendingCount: allTransactions.filter(t => t.status === TransactionStatus.PENDING).length,
    successCount: allTransactions.filter(t => t.status === TransactionStatus.SUCCESS).length,
    failedCount: allTransactions.filter(t => t.status === TransactionStatus.FAILED).length,
    processingCount: allTransactions.filter(t => t.status === TransactionStatus.PROCESSING).length,
  };

  // Get user wallet balance
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      wallet: {
        select: {
          walletBalance: true,
        },
      },
    },
  });

  const walletBalance = Number(user?.wallet?.walletBalance || 0);

  return (
    <BillScheduleTransactionsClient
      transactions={allTransactions}
      stats={stats}
      walletBalance={walletBalance}
    />
  );
}