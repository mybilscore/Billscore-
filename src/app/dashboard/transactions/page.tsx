// app/dashboard/transactions/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { TransactionsClient } from "./page.client";
import { TransactionStatus, VtuType, ChannelType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export default async function TransactionsPage() {
  console.log("📊 [TRANSACTIONS] Starting transactions page load...");
  
  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [TRANSACTIONS] User authenticated: ${sessionUser.id}`);

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

  const page = 1;
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [transactions, totalTransactions, stats, statusCounts, typeCounts] = await Promise.all([
    prisma.vtuTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: skip,
      select: {
        id: true,
        transactionType: true,
        product: true,
        amount: true,
        totalDebited: true,
        status: true,
        phoneNumber: true,
        network: true,
        networkPlan: true,
        meterNumber: true,
        meterType: true,
        token: true,
        vendor: true,
        vendorReference: true,
        vendorCommission: true,
        scheduledFor: true,
        deliveredAt: true,
        createdAt: true,
        updatedAt: true,
        channel: true,
        isBulkPurchase: true,
        bulkQuantity: true,
        user: {
          select: {
            fullName: true,
            phone: true,
          },
        },
        walletTransaction: {
          select: {
            balanceBefore: true,
            balanceAfter: true,
            reference: true,
            description: true,
            id: true,
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
    prisma.vtuTransaction.groupBy({
      by: ['status'],
      where: { userId: user.id },
      _count: {
        status: true,
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

  // Helper function to safely convert Decimal to number
  const toNumber = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    
    if (value instanceof Decimal) {
      return value.toNumber();
    }
    
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    
    const num = Number(value);
    return isNaN(num) ? null : num;
  };

  // ✅ UPDATED: Proper channel conversion matching Prisma enum exactly
  const getChannelString = (channel: any): string | null => {
    if (!channel) return null;
    
    // If it's already a string
    if (typeof channel === 'string') {
      const validChannels = ['WHATSAPP', 'MOBILE_APP', 'WEB_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API'];
      if (validChannels.includes(channel)) {
        return channel;
      }
      return null;
    }
    
    // If it's a number (Prisma enum stored as number)
    if (typeof channel === 'number') {
      // ✅ EXACT ORDER MATCHING YOUR PRISMA ENUM
      const channelMap: Record<number, string> = {
        0: 'WHATSAPP',
        1: 'MOBILE_APP',
        2: 'USSD',
        3: 'SMS',
        4: 'TELEGRAM',
        5: 'MESSENGER',
        6: 'API',
        7: 'WEB_APP',
      };
      return channelMap[channel] || null;
    }
    
    // If it's an object with toString
    if (channel && typeof channel.toString === 'function') {
      const str = channel.toString();
      const validChannels = ['WHATSAPP', 'MOBILE_APP', 'WEB_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API'];
      if (validChannels.includes(str)) {
        return str;
      }
    }
    
    // Log for debugging
    console.log('🔍 [TRANSACTIONS] Unhandled channel value:', channel, 'type:', typeof channel);
    
    return null;
  };

  // Format transactions with all useful fields
  const formattedTransactions = transactions.map((tx) => {
    const hasWalletTx = tx.walletTransaction !== null;
    
    let balanceBefore: number | null = null;
    let balanceAfter: number | null = null;
    
    if (hasWalletTx) {
      const wt = tx.walletTransaction!;
      balanceBefore = toNumber(wt.balanceBefore);
      balanceAfter = toNumber(wt.balanceAfter);
    }
    
    // Get channel string with proper conversion
    const channelStr = getChannelString(tx.channel);
    
    // Debug log for channel
    if (tx.channel !== undefined && tx.channel !== null) {
      console.log(`🔍 [TRANSACTIONS] Channel raw: ${tx.channel}, converted: ${channelStr}, type: ${typeof tx.channel}`);
    }
    
    return {
      id: tx.id,
      type: tx.transactionType,
      product: tx.product,
      amount: toNumber(tx.amount) || 0,
      totalDebited: toNumber(tx.totalDebited) || 0,
      status: tx.status,
      phoneNumber: tx.phoneNumber,
      network: tx.network,
      networkPlan: tx.networkPlan,
      meterNumber: tx.meterNumber,
      meterType: tx.meterType,
      token: tx.token,
      vendor: tx.vendor,
      vendorReference: tx.vendorReference,
      vendorCommission: toNumber(tx.vendorCommission),
      scheduledFor: tx.scheduledFor?.toISOString() || null,
      deliveredAt: tx.deliveredAt?.toISOString() || null,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
      channel: channelStr,
      isBulkPurchase: tx.isBulkPurchase || false,
      bulkQuantity: tx.bulkQuantity || null,
      user: tx.user,
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      walletReference: tx.walletTransaction?.reference || null,
      walletDescription: tx.walletTransaction?.description || null,
      hasWalletTransaction: hasWalletTx,
    };
  });

  const transactionStats = {
    total: totalTransactions,
    totalAmount: toNumber(stats._sum.totalDebited) || 0,
    totalTransactions: Number(stats._count.id || 0),
    successCount: statusCounts.find((s) => s.status === TransactionStatus.SUCCESS)?._count.status || 0,
    pendingCount: statusCounts.find((s) => s.status === TransactionStatus.PENDING)?._count.status || 0,
    failedCount: statusCounts.find((s) => s.status === TransactionStatus.FAILED)?._count.status || 0,
    processingCount: statusCounts.find((s) => s.status === TransactionStatus.PROCESSING)?._count.status || 0,
  };

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
    walletBalance: toNumber(user.wallet?.walletBalance) || 0,
  };

  console.log(`📊 [TRANSACTIONS] Found ${transactions.length} transactions, total: ${totalTransactions}`);
  console.log(`📊 [TRANSACTIONS] Channels found: ${formattedTransactions.map(t => t.channel).filter(Boolean).join(', ')}`);

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