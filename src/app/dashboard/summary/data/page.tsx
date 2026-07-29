// app/dashboard/summary/data/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { DataSummaryClient } from "./page.client";
import { TransactionStatus, VtuType, NetworkProvider } from "@prisma/client";

export default async function DataSummaryPage() {
  console.log("📊 [DATA SUMMARY] Loading...");

  const sessionUser = await requireAuth("/auth/sign-in");

  const [transactions, stats] = await Promise.all([
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
        createdAt: true,
        deliveredAt: true,
        vendor: true,
        vendorReference: true,
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
  ]);

  const formattedTransactions = transactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    totalDebited: Number(t.totalDebited),
    createdAt: t.createdAt.toISOString(),
    deliveredAt: t.deliveredAt?.toISOString(),
  }));

  const totalSpent = Number(stats._sum.amount || 0);
  const totalCount = Number(stats._count.id || 0);

  // Network breakdown
  const networkStats = await prisma.vtuTransaction.groupBy({
    by: ['network'],
    where: {
      userId: sessionUser.id,
      transactionType: VtuType.DATA,
      status: TransactionStatus.SUCCESS,
    },
    _count: { network: true },
    _sum: { amount: true },
  });

  const networkBreakdown = networkStats.map(ns => ({
    network: ns.network,
    count: ns._count.network,
    amount: Number(ns._sum.amount || 0),
  }));

  return (
    <DataSummaryClient
      transactions={formattedTransactions}
      totalSpent={totalSpent}
      totalCount={totalCount}
      networkBreakdown={networkBreakdown}
    />
  );
}