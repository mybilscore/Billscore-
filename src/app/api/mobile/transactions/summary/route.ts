// src/app/api/mobile/transactions/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/db";
import { TransactionStatus } from "@prisma/client";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

async function authenticateMobile(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  console.log("📊 [MOBILE TRANSACTIONS SUMMARY] Fetching summary...");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;

    // Get date range for this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    // Fetch all transactions for summary
    const [totalTransactions, totalSpent, thisMonthTransactions, thisWeekTransactions, pendingTransactions, typeBreakdown, statusBreakdown, recentTransactions] = await Promise.all([
      // Total transactions
      prisma.vtuTransaction.count({
        where: { userId },
      }),
      
      // Total spent (successful)
      prisma.vtuTransaction.aggregate({
        where: {
          userId,
          status: TransactionStatus.SUCCESS,
        },
        _sum: {
          totalDebited: true,
        },
      }),
      
      // This month transactions
      prisma.vtuTransaction.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
      }),
      
      // This week transactions
      prisma.vtuTransaction.count({
        where: {
          userId,
          createdAt: { gte: startOfWeek },
        },
      }),
      
      // Pending transactions
      prisma.vtuTransaction.count({
        where: {
          userId,
          status: TransactionStatus.PENDING,
        },
      }),
      
      // Transaction type breakdown
      prisma.vtuTransaction.groupBy({
        by: ['transactionType'],
        where: { userId },
        _count: {
          transactionType: true,
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Status breakdown
      prisma.vtuTransaction.groupBy({
        by: ['status'],
        where: { userId },
        _count: {
          status: true,
        },
      }),
      
      // Last 5 transactions
      prisma.vtuTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          transactionType: true,
          product: true,
          amount: true,
          totalDebited: true,
          status: true,
          createdAt: true,
          phoneNumber: true,
          network: true,
        },
      }),
    ]);

    const summary = {
      totalTransactions: totalTransactions || 0,
      totalSpent: Number(totalSpent._sum.totalDebited || 0),
      thisMonthTransactions: thisMonthTransactions || 0,
      thisWeekTransactions: thisWeekTransactions || 0,
      pendingTransactions: pendingTransactions || 0,
      typeBreakdown: typeBreakdown.map((item) => ({
        type: item.transactionType,
        count: item._count.transactionType,
        amount: Number(item._sum.amount || 0),
      })),
      statusBreakdown: statusBreakdown.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        type: tx.transactionType,
        product: tx.product,
        amount: Number(tx.amount),
        totalDebited: Number(tx.totalDebited),
        status: tx.status,
        createdAt: tx.createdAt.toISOString(),
        phoneNumber: tx.phoneNumber,
        network: tx.network,
      })),
    };

    console.log(`✅ [MOBILE TRANSACTIONS SUMMARY] Summary generated:`, {
      totalTransactions: summary.totalTransactions,
      totalSpent: summary.totalSpent,
      pendingTransactions: summary.pendingTransactions,
    });

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error("❌ [MOBILE TRANSACTIONS SUMMARY] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch transaction summary",
    }, { status: 500 });
  }
}