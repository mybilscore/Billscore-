// app/api/user/balance/route.ts

import { NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { TransactionStatus, WalletTransactionType } from "@prisma/client";

export async function GET() {
  console.log("💰 [BALANCE API] Balance check requested");
  
  try {
    const user = await requireAuth("/auth/sign-in");
    console.log(`👤 [BALANCE API] User authenticated: ${user.id}`);

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: { wallet: true },
    });

    if (!userData) {
      console.error("❌ [BALANCE API] User not found");
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    let balance = 0;
    let reservedAmount = 0;
    let availableBalance = 0;
    let hasWallet = false;

    if (userData.wallet) {
      balance = Number(userData.wallet.walletBalance) || 0;
      hasWallet = true;
      console.log(`💰 [BALANCE API] Wallet balance: ${balance}`);

      // ✅ FIXED: Calculate reserved amount from PENDING SYSTEM transactions
      // Using JSON_EXTRACT or simple filtering without path
      const allPendingSystemTx = await prisma.walletTransaction.findMany({
        where: {
          userId: user.id,
          walletId: userData.wallet.id,
          type: WalletTransactionType.SYSTEM,
          status: TransactionStatus.PENDING,
        },
      });

      // Filter in JavaScript instead of using path in Prisma
      const reservedTransactions = allPendingSystemTx.filter((tx) => {
        const metadata = tx.metadata as any;
        return metadata?.isReserved === true;
      });

      reservedAmount = reservedTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
      availableBalance = balance - reservedAmount;
      
      console.log(`🔒 [BALANCE API] Reserved: ${reservedAmount}, Available: ${availableBalance}`);
    } else if (userData.hasWallet) {
      balance = Number(userData.walletBalance) || 0;
      hasWallet = true;
      console.log(`💰 [BALANCE API] Using user.walletBalance: ${balance}`);
    } else {
      console.log(`⚠️ [BALANCE API] No wallet found for user`);
    }

    console.log(`📤 [BALANCE API] Returning: hasWallet=${hasWallet}, balance=${balance}, reserved=${reservedAmount}, available=${availableBalance}`);

    return NextResponse.json({
      success: true,
      balance,
      reservedAmount,
      availableBalance,
      hasWallet,
    });

  } catch (error: any) {
    console.error("❌ [BALANCE API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch balance",
    }, { status: 500 });
  }
}