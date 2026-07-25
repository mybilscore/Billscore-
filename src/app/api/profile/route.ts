// app/api/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        wallet: true,
        channels: true,
        customerAnalytics: true,
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
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
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

    const successCount = await prisma.vtuTransaction.count({
      where: { 
        userId: user.id,
        status: "SUCCESS",
      },
    });

    const totalTransactions = transactionStats._count.id || 0;

    const response = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
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
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      preferredChannel: user.preferredChannel,
      preferredLanguage: user.preferredLanguage,
      stats: {
        totalCustomers: user._count.customers || 0,
        totalTransactions: user._count.vtuTransactions || 0,
        totalSubscriptions: user._count.subscriptions || 0,
        totalPreOrders: user._count.preOrders || 0,
        totalSpent: Number(transactionStats._sum.totalDebited || 0),
        successRate: totalTransactions > 0 
          ? Math.round((successCount / totalTransactions) * 100) 
          : 0,
        successCount,
        totalFailed: totalTransactions - successCount,
      },
      channels: user.channels || [],
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error("❌ Get profile error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch profile",
    }, { status: 500 });
  }
}