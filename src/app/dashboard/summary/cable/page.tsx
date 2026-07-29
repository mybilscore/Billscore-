// app/dashboard/summary/cable/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { CableSummaryClient } from "./page.client";
import { TransactionStatus, VtuType } from "@prisma/client";

export default async function CableSummaryPage() {
  console.log("📺 [CABLE SUMMARY] Loading...");

  const sessionUser = await requireAuth("/auth/sign-in");

  const [transactions, stats] = await Promise.all([
    prisma.vtuTransaction.findMany({
      where: {
        userId: sessionUser.id,
        transactionType: VtuType.CABLE_TV,
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
        networkPlan: true,
        createdAt: true,
        deliveredAt: true,
        vendor: true,
        vendorReference: true,
        metadata: true,
      },
    }),
    prisma.vtuTransaction.aggregate({
      where: {
        userId: sessionUser.id,
        transactionType: VtuType.CABLE_TV,
        status: TransactionStatus.SUCCESS,
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const formattedTransactions = transactions.map(t => {
    const meta = t.metadata as any || {};
    return {
      ...t,
      amount: Number(t.amount),
      totalDebited: Number(t.totalDebited),
      createdAt: t.createdAt.toISOString(),
      deliveredAt: t.deliveredAt?.toISOString(),
      smartCardNumber: meta.smartCardNumber || null,
      provider: meta.provider || null,
      packageName: meta.packageName || null,
    };
  });

  const totalSpent = Number(stats._sum.amount || 0);
  const totalCount = Number(stats._count.id || 0);

  // Provider breakdown
  const providerStats = await prisma.vtuTransaction.groupBy({
    by: ['product'],
    where: {
      userId: sessionUser.id,
      transactionType: VtuType.CABLE_TV,
      status: TransactionStatus.SUCCESS,
    },
    _count: { product: true },
    _sum: { amount: true },
  });

  const providerBreakdown = providerStats.map(ps => ({
    provider: ps.product,
    count: ps._count.product,
    amount: Number(ps._sum.amount || 0),
  }));

  return (
    <CableSummaryClient
      transactions={formattedTransactions}
      totalSpent={totalSpent}
      totalCount={totalCount}
      providerBreakdown={providerBreakdown}
    />
  );
}