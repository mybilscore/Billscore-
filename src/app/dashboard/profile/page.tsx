// app/dashboard/profile/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { ProfileClient } from "./page.client";

export default async function ProfilePage() {
  console.log("👤 [PROFILE] Starting profile page load...");
  
  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [PROFILE] User authenticated: ${sessionUser.id}`);

  // Fetch user with all relations
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      wallet: true,
      channels: true,
      customerAnalytics: true,
      customers: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          phone: true,
          fullName: true,
          totalTransactions: true,
          totalSpent: true,
          lastTransactionAt: true,
        },
      },
      _count: {
        select: {
          customers: true,
          vtuTransactions: true,
          subscriptions: true,
          preOrders: true,
        },
      },
    },
  });

  if (!user) {
    console.error("❌ [PROFILE] User not found!");
    return null;
  }

  // Get transaction stats
  const transactionStats = await prisma.vtuTransaction.aggregate({
    where: { userId: user.id },
    _sum: {
      amount: true,
      totalDebited: true,
    },
    _count: {
      id: true,
    },
  });

  // Get successful transactions count
  const successCount = await prisma.vtuTransaction.count({
    where: { 
      userId: user.id,
      status: "SUCCESS",
    },
  });

  const totalTransactions = transactionStats._count.id || 0;
  const totalSpent = Number(transactionStats._sum.totalDebited || 0);
  const successRate = totalTransactions > 0 
    ? Math.round((successCount / totalTransactions) * 100) 
    : 0;

  // ✅ Format user data for client - convert all Decimal to Number
  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email || "",
    phone: user.phone,
    role: user.role,
    hasWallet: user.hasWallet,
    walletBalance: Number(user.wallet?.walletBalance || 0),
    accountNumber: user.wallet?.accountNumber || "",
    bankName: user.wallet?.bankName || "PALMPAY",
    accountName: user.wallet?.accountName || user.fullName,
    referralCode: user.referralCode || "",
    isVerified: user.isVerified,
    kycStatus: user.kycStatus,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    preferredChannel: user.preferredChannel,
    preferredLanguage: user.preferredLanguage,
  };

  // ✅ Convert recent customers - Decimal to Number
  const recentCustomers = (user.customers || []).map((customer) => ({
    id: customer.id,
    phone: customer.phone,
    fullName: customer.fullName,
    totalTransactions: customer.totalTransactions,
    totalSpent: Number(customer.totalSpent), // ✅ Convert Decimal to Number
    lastTransactionAt: customer.lastTransactionAt?.toISOString() || null,
  }));

  // ✅ Convert channels
  const channels = (user.channels || []).map((channel) => ({
    id: channel.id,
    channelType: channel.channelType,
    channelIdentifier: channel.channelIdentifier,
    channelUsername: channel.channelUsername,
    isVerified: channel.isVerified,
    linkedAt: channel.linkedAt.toISOString(),
    lastSeen: channel.lastSeen.toISOString(),
  }));

  const profileStats = {
    totalCustomers: user._count.customers || 0,
    totalTransactions: user._count.vtuTransactions || 0,
    totalSubscriptions: user._count.subscriptions || 0,
    totalPreOrders: user._count.preOrders || 0,
    totalSpent: totalSpent,
    successRate: successRate,
    successCount: successCount,
    totalFailed: totalTransactions - successCount,
  };

  console.log(`📤 [PROFILE] Sending data to client: ${userData.fullName}`);
  console.log(`📊 [PROFILE] Stats: ${profileStats.totalTransactions} transactions, ${profileStats.totalCustomers} customers`);

  return (
    <ProfileClient
      user={userData}
      stats={profileStats}
      recentCustomers={recentCustomers}
      channels={channels}
    />
  );
}