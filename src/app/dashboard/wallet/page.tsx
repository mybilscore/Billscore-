// app/dashboard/wallet/transactions/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { WalletTransactionsClient } from "./page.client";
import { TransactionStatus, WalletTransactionType } from "@prisma/client";

export default async function WalletTransactionsPage() {
  console.log("💳 [WALLET TRANSACTIONS] Loading...");

  const sessionUser = await requireAuth("/auth/sign-in");

  const [user, transactions, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        wallet: {
          select: {
            id: true,
            walletBalance: true,
          },
        },
      },
    }),
    prisma.walletTransaction.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        reference: true,
        description: true,
        status: true,
        category: true,
        channel: true,
        metadata: true,
        createdAt: true,
        vtuTransaction: {
          select: {
            id: true,
            transactionType: true,
            product: true,
            phoneNumber: true,
            status: true,
          },
        },
        walletFunding: {
          select: {
            id: true,
            reference: true,
            provider: true,
            status: true,
          },
        },
      },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        userId: sessionUser.id,
        status: TransactionStatus.SUCCESS,
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  if (!user || !user.wallet) {
    console.error("❌ [WALLET TRANSACTIONS] User or wallet not found");
    return null;
  }

  const formattedTransactions = transactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    balanceBefore: Number(t.balanceBefore),
    balanceAfter: Number(t.balanceAfter),
    createdAt: t.createdAt.toISOString(),
    vtuTransaction: t.vtuTransaction ? {
      ...t.vtuTransaction,
    } : null,
  }));

  // Group by type
  const typeStats = await prisma.walletTransaction.groupBy({
    by: ['type'],
    where: {
      userId: sessionUser.id,
      status: TransactionStatus.SUCCESS,
    },
    _count: { type: true },
    _sum: { amount: true },
  });

  const formattedTypeStats = typeStats.map(ts => ({
    type: ts.type,
    count: ts._count.type,
    amount: Number(ts._sum.amount || 0),
  }));

  // Group by category
  const categoryStats = await prisma.walletTransaction.groupBy({
    by: ['category'],
    where: {
      userId: sessionUser.id,
      status: TransactionStatus.SUCCESS,
    },
    _count: { category: true },
    _sum: { amount: true },
  });

  const formattedCategoryStats = categoryStats.map(cs => ({
    category: cs.category,
    count: cs._count.category,
    amount: Number(cs._sum.amount || 0),
  }));

  const totalVolume = Number(stats._sum.amount || 0);
  const totalCount = Number(stats._count.id || 0);

  // Get credit vs debit totals
  const creditTotal = formattedTypeStats.find(t => t.type === "CREDIT")?.amount || 0;
  const debitTotal = formattedTypeStats.find(t => t.type === "DEBIT")?.amount || 0;

  return (
    <WalletTransactionsClient
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email || "",
        phone: user.phone,
      }}
      wallet={{
        id: user.wallet.id,
        balance: Number(user.wallet.walletBalance),
      }}
      transactions={formattedTransactions}
      stats={{
        totalVolume,
        totalCount,
        creditTotal,
        debitTotal,
        typeStats: formattedTypeStats,
        categoryStats: formattedCategoryStats,
      }}
    />
  );
}