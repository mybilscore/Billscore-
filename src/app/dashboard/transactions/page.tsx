// app/dashboard/transactions/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { TransactionsClient } from "./page.client";
import { TransactionStatus, VtuType } from "@prisma/client";

export default async function TransactionsPage() {
  console.log("📊 [TRANSACTIONS] Starting transactions page load...");
  
  // Get authenticated user from session
  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [TRANSACTIONS] User authenticated: ${sessionUser.id}`);

  // Fetch user data
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      hasWallet: true,
      wallet: {
        select: {
          walletBalance: true,
        },
      },
    },
  });

  if (!user) {
    console.error("❌ [TRANSACTIONS] User not found!");
    return null;
  }

  // Fetch transactions with pagination
  const page = 1;
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [transactions, totalTransactions, stats] = await Promise.all([
    prisma.vtuTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: skip,
      include: {
        user: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
    }),
    prisma.vtuTransaction.count({
      where: { userId: user.id },
    }),
    prisma.vtuTransaction.aggregate({
      where: { 
        userId: user.id,
        status: TransactionStatus.SUCCESS,
      },
      _sum: {
        amount: true,
        totalDebited: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  // Get transaction counts by status
  const statusCounts = await prisma.vtuTransaction.groupBy({
    by: ['status'],
    where: { userId: user.id },
    _count: {
      status: true,
    },
  });

  // Get transaction counts by type
  const typeCounts = await prisma.vtuTransaction.groupBy({
    by: ['transactionType'],
    where: { userId: user.id },
    _count: {
      transactionType: true,
    },
  });

  // Format transactions for the client
  const formattedTransactions = transactions.map((tx) => ({
    id: tx.id,
    type: tx.transactionType,
    product: tx.product,
    amount: Number(tx.amount),
    totalDebited: Number(tx.totalDebited),
    status: tx.status,
    phoneNumber: tx.phoneNumber,
    network: tx.network,
    vendorReference: tx.vendorReference,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    deliveredAt: tx.deliveredAt?.toISOString(),
    user: tx.user,
  }));

  // Prepare stats
  const transactionStats = {
    total: totalTransactions,
    totalAmount: Number(stats._sum.totalDebited || 0),
    totalTransactions: Number(stats._count.id || 0),
    successCount: statusCounts.find((s) => s.status === TransactionStatus.SUCCESS)?._count.status || 0,
    pendingCount: statusCounts.find((s) => s.status === TransactionStatus.PENDING)?._count.status || 0,
    failedCount: statusCounts.find((s) => s.status === TransactionStatus.FAILED)?._count.status || 0,
    processingCount: statusCounts.find((s) => s.status === TransactionStatus.PROCESSING)?._count.status || 0,
  };

  // Prepare type breakdown
  const typeBreakdown = typeCounts.map((t) => ({
    type: t.transactionType,
    count: t._count.transactionType,
  }));

  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email || "",
    phone: user.phone,
    role: user.role,
    hasWallet: user.hasWallet,
    walletBalance: Number(user.wallet?.walletBalance || 0),
  };

  console.log(`📊 [TRANSACTIONS] Found ${transactions.length} transactions, total: ${totalTransactions}`);
  console.log(`📊 [TRANSACTIONS] Stats:`, transactionStats);

  return (
    <TransactionsClient
      user={userData}
      initialTransactions={formattedTransactions}
      totalTransactions={totalTransactions}
      stats={transactionStats}
      typeBreakdown={typeBreakdown}
    />
  );
}