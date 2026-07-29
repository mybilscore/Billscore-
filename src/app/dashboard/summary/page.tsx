// app/dashboard/summary/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { SummaryClient } from "./page.client";
import { TransactionStatus, VtuType } from "@prisma/client";

export default async function SummaryPage() {
  console.log("📊 [SUMMARY] Starting summary page load...");

  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [SUMMARY] User authenticated: ${sessionUser.id}`);

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
    console.error("❌ [SUMMARY] User not found!");
    return null;
  }

  // Fetch all transactions for stats
  const [transactions, transactionCounts] = await Promise.all([
    prisma.vtuTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        transactionType: true,
        amount: true,
        totalDebited: true,
        status: true,
        product: true,
        phoneNumber: true,
        network: true,
        createdAt: true,
        deliveredAt: true,
        vendor: true,
        vendorReference: true,
      },
    }),
    prisma.vtuTransaction.groupBy({
      by: ['transactionType'],
      where: { userId: user.id },
      _count: {
        transactionType: true,
      },
    }),
  ]);

  // Calculate stats
  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const successCount = transactions.filter(t => t.status === TransactionStatus.SUCCESS).length;
  const pendingCount = transactions.filter(t => t.status === TransactionStatus.PENDING).length;
  const failedCount = transactions.filter(t => t.status === TransactionStatus.FAILED).length;

  // Group by type
  const typeStats = transactionCounts.map(tc => ({
    type: tc.transactionType,
    count: tc._count.transactionType,
    label: getTypeLabel(tc.transactionType),
    icon: getTypeIcon(tc.transactionType),
  }));

  // Recent transactions (last 10)
  const recentTransactions = transactions.slice(0, 10).map(t => ({
    ...t,
    amount: Number(t.amount),
    totalDebited: Number(t.totalDebited),
    createdAt: t.createdAt.toISOString(),
    deliveredAt: t.deliveredAt?.toISOString(),
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

  const stats = {
    total: totalTransactions,
    totalAmount,
    successRate: totalTransactions > 0 ? Math.round((successCount / totalTransactions) * 100) : 0,
    successCount,
    pendingCount,
    failedCount,
  };

  console.log(`📊 [SUMMARY] Found ${totalTransactions} transactions, total: ${totalAmount}`);

  return (
    <SummaryClient
      user={userData}
      stats={stats}
      recentTransactions={recentTransactions}
      typeStats={typeStats}
    />
  );
}

// Helper functions
function getTypeLabel(type: VtuType): string {
  const labels: Record<VtuType, string> = {
    AIRTIME: "Airtime",
    DATA: "Data",
    ELECTRICITY_INSTANT: "Electricity",
    ELECTRICITY_PREORDER: "Electricity (Pre-order)",
    CABLE_TV: "Cable TV",
    EDUCATION: "Education",
    INSURANCE: "Insurance",
  };
  return labels[type] || type;
}

function getTypeIcon(type: VtuType): string {
  const icons: Record<VtuType, string> = {
    AIRTIME: "Phone",
    DATA: "Wifi",
    ELECTRICITY_INSTANT: "Zap",
    ELECTRICITY_PREORDER: "Clock",
    CABLE_TV: "Tv",
    EDUCATION: "GraduationCap",
    INSURANCE: "Shield",
  };
  return icons[type] || "CreditCard";
}