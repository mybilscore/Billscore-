// app/api/webhooks/wallet-funding/route.ts - IMPROVED

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { ReferralStatus } from "@prisma/client";

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
    const { userId, amount, reference, status, source, transactionId, payerName } = body;

    console.log(`📊 [Wallet Funding] Webhook received:`, { 
      userId, 
      amount, 
      reference, 
      status,
      source,
      transactionId 
    });

    // ✅ Validate required fields
    if (!userId || !amount || !reference) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields",
      }, { status: 400 });
    }

    // ✅ Only process successful deposits
    if (status !== "SUCCESS" && status !== "COMPLETED") {
      console.log(`ℹ️ [Wallet Funding] Deposit not successful, skipping referral bonus`);
      return NextResponse.json({
        success: true,
        message: "Deposit not successful, skipping referral bonus",
      });
    }

    // ✅ Get user with referral info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referredBy: true,
        fullName: true,
        referralCode: true,
        email: true,
        phone: true,
      },
    });

    if (!user) {
      console.error(`❌ [Wallet Funding] User not found: ${userId}`);
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    console.log(`📊 [Wallet Funding] User: ${user.fullName} (${user.id})`);

    // ✅ Check if user has a referrer
    if (!user.referredBy) {
      console.log(`ℹ️ [Wallet Funding] User ${userId} has no referrer, skipping bonus`);
      return NextResponse.json({
        success: true,
        message: "No referrer found, skipping bonus",
      });
    }

    // ✅ Check if this is the user's first successful funding
    const existingFunding = await prisma.walletTransaction.findFirst({
      where: {
        userId: userId,
        type: "CREDIT",
        category: "FUNDING",
        status: "SUCCESS",
      },
    });

    if (existingFunding) {
      console.log(`ℹ️ [Wallet Funding] User ${userId} already has previous deposits, skipping bonus`);
      return NextResponse.json({
        success: true,
        message: "Not first deposit, skipping bonus",
      });
    }

    // ✅ Check if referral bonus has already been given
    const existingReferralBonus = await prisma.walletTransaction.findFirst({
      where: {
        userId: user.referredBy,
        type: "CREDIT",
        category: "SYSTEM",
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

    // ✅ Calculate 1% bonus (rounded to 2 decimal places)
    const bonusAmount = Number((amount * 0.01).toFixed(2)); // 1% of deposit
    const referrerId = user.referredBy;

    if (bonusAmount <= 0) {
      console.log(`ℹ️ [Wallet Funding] Bonus amount too small: ₦${bonusAmount}, skipping`);
      return NextResponse.json({
        success: true,
        message: "Bonus amount too small, skipping",
      });
    }

    console.log(`💰 [Wallet Funding] Calculating referral bonus: ₦${bonusAmount} (1% of ₦${amount})`);

    // ✅ Get referrer's wallet
    const referrer = await prisma.user.findUnique({
      where: { id: referrerId },
      include: { 
        wallet: true,
      },
    });

    if (!referrer || !referrer.wallet) {
      console.error(`❌ [Wallet Funding] Referrer wallet not found: ${referrerId}`);
      return NextResponse.json({
        success: false,
        error: "Referrer wallet not found",
      }, { status: 404 });
    }

    const referrerBalance = Number(referrer.wallet.walletBalance) || 0;

    // ✅ Credit 1% bonus to referrer with proper transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update referrer's wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: referrer.wallet.id },
        data: {
          walletBalance: {
            increment: bonusAmount,
          },
          ledgerBalance: {
            increment: bonusAmount,
          },
        },
      });

      // Create wallet transaction for bonus
      const bonusTransaction = await tx.walletTransaction.create({
        data: {
          walletId: referrer.wallet.id,
          userId: referrerId,
          type: "CREDIT",
          amount: bonusAmount,
          balanceBefore: referrerBalance,
          balanceAfter: referrerBalance + bonusAmount,
          reference: `REFERRAL_BONUS_${userId}_${Date.now()}`,
          description: `Referral bonus (1% of ${formatCurrency(amount)}) for ${user.fullName || 'new user'}`,
          status: "SUCCESS",
          category: "SYSTEM",
          metadata: {
            refereeId: userId,
            refereeName: user.fullName,
            depositAmount: amount,
            bonusPercentage: 1,
            source: "wallet_funding_webhook",
            fundingReference: reference,
            fundingSource: source || "PALMPAY",
          },
        },
      });

      // ✅ Update or create referral record
      const existingReferral = await tx.referral.findFirst({
        where: {
          referrerId: referrerId,
          refereeId: userId,
        },
      });

      if (existingReferral) {
        await tx.referral.update({
          where: { id: existingReferral.id },
          data: {
            status: ReferralStatus.COMPLETED,
            rewardAmount: bonusAmount,
            rewardPaid: true,
            rewardPaidAt: new Date(),
            completedAt: new Date(),
          },
        });
      } else {
        // ✅ Create referral record if it doesn't exist
        await tx.referral.create({
          data: {
            referrerId: referrerId,
            refereeId: userId,
            status: ReferralStatus.COMPLETED,
            rewardAmount: bonusAmount,
            rewardPaid: true,
            rewardPaidAt: new Date(),
            completedAt: new Date(),
            metadata: {
              depositAmount: amount,
              bonusPercentage: 1,
              source: "wallet_funding_webhook",
            },
          },
        });
      }

      // ✅ Update referrer's referral stats
      await tx.user.update({
        where: { id: referrerId },
        data: {
          referralEarnings: {
            increment: bonusAmount,
          },
          referralCount: {
            increment: 1,
          },
        },
      });

      return { updatedWallet, bonusTransaction };
    });

    console.log(`✅ [Wallet Funding] Referral bonus of ₦${bonusAmount} credited to ${referrer.fullName || referrerId}`);
    console.log(`✅ [Wallet Funding] Referrer's new balance: ₦${result.updatedWallet.walletBalance}`);

    // ✅ Optional: Send notification to referrer
    try {
      // You can add email/push notification here
      // await sendNotification(referrerId, {
      //   type: "REFERRAL_BONUS",
      //   title: "Referral Bonus Earned! 🎉",
      //   message: `You earned ₦${bonusAmount} from ${user.fullName || 'your referral'}'s first deposit!`,
      // });
    } catch (error) {
      console.error("Notification error:", error);
      // Don't fail the transaction
    }

    return NextResponse.json({
      success: true,
      message: "Referral bonus credited",
      data: {
        referrerId,
        bonusAmount,
        refereeId: userId,
        refereeName: user.fullName,
        newBalance: result.updatedWallet.walletBalance,
      },
    });

  } catch (error: any) {
    console.error("❌ [Wallet Funding] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to process referral bonus",
    }, { status: 500 });
  }
}