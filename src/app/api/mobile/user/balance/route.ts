// src/app/api/mobile/user/balance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { verify } from "jsonwebtoken";

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
  console.log("💰 [MOBILE BALANCE] Balance check requested");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!userData) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    let balance = 0;
    let hasWallet = false;
    let walletId = null;
    let accountNumber = null;
    let accountName = null;
    let bankName = null;
    let ledgerBalance = 0;
    let isActive = true;
    let isFrozen = false;

    if (userData.wallet) {
      balance = Number(userData.wallet.walletBalance) || 0;
      ledgerBalance = Number(userData.wallet.ledgerBalance) || 0;
      hasWallet = true;
      walletId = userData.wallet.id;
      accountNumber = userData.wallet.accountNumber;
      accountName = userData.wallet.accountName;
      bankName = userData.wallet.bankName;
      isActive = userData.wallet.isActive;
      isFrozen = userData.wallet.isFrozen;
      console.log(`💰 [MOBILE BALANCE] Wallet balance: ${balance}`);
    } else if (userData.hasWallet) {
      balance = Number(userData.walletBalance) || 0;
      hasWallet = true;
      console.log(`💰 [MOBILE BALANCE] Using user.walletBalance: ${balance}`);
    }

    return NextResponse.json({
      success: true,
      balance,
      hasWallet,
      walletId,
      accountNumber,
      accountName,
      bankName,
      ledgerBalance,
      isActive,
      isFrozen,
      fromCache: false,
    });

  } catch (error: any) {
    console.error("❌ [MOBILE BALANCE] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch balance",
    }, { status: 500 });
  }
}