// app/dashboard/summary/data/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { DataSummaryClient } from "./page.client";
import { TransactionStatus, VtuType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

function formatDataAmount(amountMB: number): string {
  if (amountMB === 0) return "0MB";
  if (amountMB >= 1024) {
    const gb = amountMB / 1024;
    if (gb % 1 === 0) {
      return `${gb}GB`;
    }
    return `${gb.toFixed(1)}GB`;
  }
  return `${Math.round(amountMB)}MB`;
}

const toNumber = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Decimal) return value.toNumber();
  if (typeof value === 'number') return value;
  const num = Number(value);
  return isNaN(num) ? null : num;
};

export default async function DataSummaryPage() {
  console.log("📊 [DATA SUMMARY] Loading...");

  const sessionUser = await requireAuth("/auth/sign-in");
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // ✅ Get today's data purchases using the stored dataAmountMB
  const todayTransactions = await prisma.vtuTransaction.findMany({
    where: {
      userId: sessionUser.id,
      transactionType: VtuType.DATA,
      status: TransactionStatus.SUCCESS,
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
    select: {
      id: true,
      amount: true,
      dataAmountMB: true,
      dataDisplay: true,
      product: true,
      networkPlan: true,
      network: true,
      phoneNumber: true,
      createdAt: true,
    },
  });

  // ✅ Calculate today's total data from stored field
  let todayDataMB = 0;
  for (const tx of todayTransactions) {
    if (tx.dataAmountMB && tx.dataAmountMB > 0) {
      todayDataMB += tx.dataAmountMB;
    } else {
      // Fallback for old transactions
      const amount = Number(tx.amount);
      if (amount <= 100) todayDataMB += 50;
      else if (amount <= 300) todayDataMB += 200;
      else if (amount <= 500) todayDataMB += 350;
      else if (amount <= 1000) todayDataMB += 750;
      else if (amount <= 1500) todayDataMB += 1024;
      else if (amount <= 2000) todayDataMB += 2048;
      else if (amount <= 3000) todayDataMB += 3072;
      else if (amount <= 5000) todayDataMB += 5120;
      else todayDataMB += amount * 2;
    }
  }

  // ✅ Get all-time total data
  const allTransactions = await prisma.vtuTransaction.findMany({
    where: {
      userId: sessionUser.id,
      transactionType: VtuType.DATA,
      status: TransactionStatus.SUCCESS,
    },
    select: {
      amount: true,
      dataAmountMB: true,
    },
  });

  let totalDataMB = 0;
  for (const tx of allTransactions) {
    if (tx.dataAmountMB && tx.dataAmountMB > 0) {
      totalDataMB += tx.dataAmountMB;
    } else {
      // Fallback for old transactions
      const amount = Number(tx.amount);
      if (amount <= 100) totalDataMB += 50;
      else if (amount <= 300) totalDataMB += 200;
      else if (amount <= 500) totalDataMB += 350;
      else if (amount <= 1000) totalDataMB += 750;
      else if (amount <= 1500) totalDataMB += 1024;
      else if (amount <= 2000) totalDataMB += 2048;
      else if (amount <= 3000) totalDataMB += 3072;
      else if (amount <= 5000) totalDataMB += 5120;
      else totalDataMB += amount * 2;
    }
  }

  // Fetch other stats
  const [transactions, stats, networkStats] = await Promise.all([
    prisma.vtuTransaction.findMany({
      where: {
        userId: sessionUser.id,
        transactionType: VtuType.DATA,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        amount: true,
        totalDebited: true,
        status: true,
        product: true,
        phoneNumber: true,
        network: true,
        networkPlan: true,
        dataAmountMB: true,
        dataDisplay: true,
        createdAt: true,
        deliveredAt: true,
        vendor: true,
        vendorReference: true,
        vendorCommission: true,
        vendorTotalAmount: true,
        commissionRate: true,
        commissionType: true,
        channel: true,
        metadata: true,
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
    prisma.vtuTransaction.aggregate({
      where: {
        userId: sessionUser.id,
        transactionType: VtuType.DATA,
        status: TransactionStatus.SUCCESS,
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.vtuTransaction.groupBy({
      by: ['network'],
      where: {
        userId: sessionUser.id,
        transactionType: VtuType.DATA,
        status: TransactionStatus.SUCCESS,
      },
      _count: { network: true },
      _sum: { amount: true },
    }),
  ]);

  const totalSpent = Number(stats._sum.amount || 0);
  const totalCount = Number(stats._count.id || 0);
  const todaySpent = todayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const todayCount = todayTransactions.length;
  const todayDataFormatted = formatDataAmount(todayDataMB);
  const totalDataFormatted = formatDataAmount(totalDataMB);

  // Format transactions
  const formattedTransactions = transactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    totalDebited: Number(t.totalDebited),
    createdAt: t.createdAt.toISOString(),
    deliveredAt: t.deliveredAt?.toISOString(),
    vendorCommission: t.vendorCommission ? Number(t.vendorCommission) : null,
    vendorTotalAmount: t.vendorTotalAmount ? Number(t.vendorTotalAmount) : null,
    commissionRate: t.commissionRate ? Number(t.commissionRate) : null,
    balanceBefore: t.walletTransaction?.balanceBefore ? Number(t.walletTransaction.balanceBefore) : null,
    balanceAfter: t.walletTransaction?.balanceAfter ? Number(t.walletTransaction.balanceAfter) : null,
    walletReference: t.walletTransaction?.reference || null,
    walletDescription: t.walletTransaction?.description || null,
    dataAmountMB: t.dataAmountMB || 0,
    dataDisplay: t.dataDisplay || formatDataAmount(t.dataAmountMB || 0),
  }));

  const networkBreakdown = networkStats.map(ns => ({
    network: ns.network,
    count: ns._count.network,
    amount: Number(ns._sum.amount || 0),
  }));

  console.log(`📊 [DATA SUMMARY] Today: ${todayDataFormatted}, All Time: ${totalDataFormatted}`);

  return (
    <DataSummaryClient
      transactions={formattedTransactions}
      totalSpent={totalSpent}
      totalCount={totalCount}
      networkBreakdown={networkBreakdown}
      todaySpent={todaySpent}
      todayCount={todayCount}
      todayData={todayDataFormatted}
      totalData={totalDataFormatted}
      todayDataMB={todayDataMB}
      totalDataMB={totalDataMB}
    />
  );
}