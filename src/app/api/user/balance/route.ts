// app/api/user/balance/route.ts

import { NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { CacheService } from "~/lib/cache/cache.service";

export async function GET() {
  console.log("💰 [BALANCE API] Balance check requested");
  
  try {
    const user = await requireAuth("/auth/sign-in");
    console.log(`👤 [BALANCE API] User authenticated: ${user.id}`);

    // ✅ Try cache first
    const cachedBalance = await CacheService.getBalance(user.id);

    if (cachedBalance) {
      console.log(`💰 [BALANCE API] From cache - Balance: ${cachedBalance.balance}`);
      return NextResponse.json({
        success: true,
        balance: cachedBalance.balance,
        hasWallet: true,
        fromCache: true,
      });
    }

    // ✅ Cache miss - fetch from database
    console.log(`📡 [BALANCE API] Cache miss, fetching from database...`);
    
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
    let hasWallet = false;

    if (userData.wallet) {
      balance = Number(userData.wallet.walletBalance) || 0;
      hasWallet = true;
      console.log(`💰 [BALANCE API] Wallet balance: ${balance}`);
    } else if (userData.hasWallet) {
      balance = Number(userData.walletBalance) || 0;
      hasWallet = true;
      console.log(`💰 [BALANCE API] Using user.walletBalance: ${balance}`);
    } else {
      console.log(`⚠️ [BALANCE API] No wallet found for user`);
    }

    console.log(`📤 [BALANCE API] Returning: hasWallet=${hasWallet}, balance=${balance}`);

    return NextResponse.json({
      success: true,
      balance,
      hasWallet,
      fromCache: false,
    });

  } catch (error: any) {
    console.error("❌ [BALANCE API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch balance",
    }, { status: 500 });
  }
}