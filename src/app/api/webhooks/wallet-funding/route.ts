// app/api/webhooks/wallet-funding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";

// Helper function for currency formatting
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, reference, status } = body;

    console.log(`📊 [Wallet Funding] Webhook received:`, { userId, amount, reference, status });

    if (!userId || !amount || !reference) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields",
      }, { status: 400 });
    }

    // Only process successful deposits
    if (status !== "SUCCESS" && status !== "COMPLETED") {
      return NextResponse.json({
        success: false,
        message: "Deposit not successful, skipping referral bonus",
      });
    }

    // Get user with referral info and full name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referredBy: true,
        fullName: true,
        referralCode: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    // Check if this is the user's first deposit (and they have a referrer)
    if (!user.referredBy) {
      console.log(`ℹ️ [Wallet Funding] User ${userId} has no referrer, skipping bonus`);
      return NextResponse.json({
        success: true,
        message: "No referrer found, skipping bonus",
      });
    }

    // Check if user already has any successful wallet transactions (excluding welcome bonus)
    const existingWalletTx = await prisma.walletTransaction.findFirst({
      where: {
        userId: userId,
        type: "CREDIT",
        category: "FUNDING",
        status: "SUCCESS",
      },
    });

    if (existingWalletTx) {
      console.log(`ℹ️ [Wallet Funding] User ${userId} already has previous deposits, skipping bonus`);
      return NextResponse.json({
        success: true,
        message: "Not first deposit, skipping bonus",
      });
    }

    // Check if a referral bonus has already been given for this user
    const existingReferralBonus = await prisma.walletTransaction.findFirst({
      where: {
        userId: user.referredBy,
        description: { contains: "Referral bonus" },
        metadata: {
          path: "$.refereeId",
          equals: userId,
        },
      },
    });

    if (existingReferralBonus) {
      console.log(`ℹ️ [Wallet Funding] Referral bonus already given for user ${userId}`);
      return NextResponse.json({
        success: true,
        message: "Referral bonus already given",
      });
    }

    // Calculate 1% bonus
    const bonusAmount = amount * 0.01; // 1% of deposit
    const referrerId = user.referredBy;

    console.log(`💰 [Wallet Funding] Calculating referral bonus: ₦${bonusAmount} (1% of ₦${amount})`);

    // Get referrer's wallet
    const referrer = await prisma.user.findUnique({
      where: { id: referrerId },
      include: { wallet: true },
    });

    if (!referrer || !referrer.wallet) {
      console.error(`❌ [Wallet Funding] Referrer wallet not found: ${referrerId}`);
      return NextResponse.json({
        success: false,
        error: "Referrer wallet not found",
      }, { status: 404 });
    }

    // Credit 1% bonus to referrer
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: referrer.wallet.id },
        data: {
          walletBalance: {
            increment: bonusAmount,
          },
        },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: referrer.wallet.id,
          userId: referrerId,
          type: "CREDIT",
          amount: bonusAmount,
          balanceBefore: Number(referrer.wallet.walletBalance),
          balanceAfter: Number(referrer.wallet.walletBalance) + bonusAmount,
          reference: `REFERRAL_BONUS_${userId}`,
          description: `Referral bonus (1% of ${formatCurrency(amount)}) for ${user.fullName || 'new user'}`,
          status: "SUCCESS",
          category: "SYSTEM",
          metadata: {
            refereeId: userId,
            depositAmount: amount,
            bonusPercentage: 1,
            source: "wallet_funding_webhook",
          },
        },
      }),
      // Update referral record
      prisma.referral.updateMany({
        where: {
          referrerId: referrerId,
          refereeId: userId,
        },
        data: {
          status: "COMPLETED",
          rewardAmount: bonusAmount,
          rewardPaid: true,
          rewardPaidAt: new Date(),
        },
      }),
    ]);

    console.log(`✅ [Wallet Funding] Referral bonus of ₦${bonusAmount} credited to ${referrerId}`);

    return NextResponse.json({
      success: true,
      message: "Referral bonus credited",
      bonusAmount,
      referrerId,
    });

  } catch (error: any) {
    console.error("❌ [Wallet Funding] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to process referral bonus",
    }, { status: 500 });
  }
}