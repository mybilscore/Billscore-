// app/dashboard/summary/electricity/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { ElectricitySummaryClient } from "./page.client";
import { TransactionStatus, VtuType } from "@prisma/client";

export default async function ElectricitySummaryPage() {
  console.log("⚡ [ELECTRICITY SUMMARY] Loading...");

  const sessionUser = await requireAuth("/auth/sign-in");

  const [transactions, stats] = await Promise.all([
    prisma.vtuTransaction.findMany({
      where: {
        userId: sessionUser.id,
        transactionType: {
          in: [VtuType.ELECTRICITY_INSTANT, VtuType.ELECTRICITY_PREORDER],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        transactionType: true,
        amount: true,
        totalDebited: true,
        status: true,
        product: true,
        meterNumber: true,
        meterType: true,
        token: true,
        createdAt: true,
        deliveredAt: true,
        vendor: true,
        vendorReference: true,
        scheduledFor: true,
      },
    }),
    prisma.vtuTransaction.aggregate({
      where: {
        userId: sessionUser.id,
        transactionType: {
          in: [VtuType.ELECTRICITY_INSTANT, VtuType.ELECTRICITY_PREORDER],
        },
        status: TransactionStatus.SUCCESS,
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const formattedTransactions = transactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    totalDebited: Number(t.totalDebited),
    createdAt: t.createdAt.toISOString(),
    deliveredAt: t.deliveredAt?.toISOString(),
    scheduledFor: t.scheduledFor?.toISOString(),
  }));

  const totalSpent = Number(stats._sum.amount || 0);
  const totalCount = Number(stats._count.id || 0);

  // DisCo breakdown
  const discoStats = await prisma.vtuTransaction.groupBy({
    by: ['product'],
    where: {
      userId: sessionUser.id,
      transactionType: {
        in: [VtuType.ELECTRICITY_INSTANT, VtuType.ELECTRICITY_PREORDER],
      },
      status: TransactionStatus.SUCCESS,
    },
    _count: { product: true },
    _sum: { amount: true },
  });

  const discoBreakdown = discoStats.map(ds => ({
    disco: ds.product,
    count: ds._count.product,
    amount: Number(ds._sum.amount || 0),
  }));

  return (
    <ElectricitySummaryClient
      transactions={formattedTransactions}
      totalSpent={totalSpent}
      totalCount={totalCount}
      discoBreakdown={discoBreakdown}
    />
  );
}