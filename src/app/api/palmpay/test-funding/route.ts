// app/api/palmpay/test-funding/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPalmPayService } from '~/lib/palmpay/palmpay.service';
import { prisma } from '~/lib/db';
import { WalletFundingStatus } from '@prisma/client';

function getAppUrl(): string {
  const url = process.env.NEXTAUTH_URL || 
              process.env.NEXT_PUBLIC_APP_URL || 
              process.env.APP_URL ||
              'http://localhost:3000';
  return url.replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { virtualAccountNo, amount, payerName, payerBank, userId } = body;

    if (!virtualAccountNo || !amount) {
      return NextResponse.json({
        success: false,
        error: 'virtualAccountNo and amount are required',
      }, { status: 400 });
    }

    // ✅ Find the user by virtual account number
    const wallet = await prisma.wallet.findFirst({
      where: { accountNumber: virtualAccountNo },
      include: { user: true },
    });

    if (!wallet || !wallet.user) {
      return NextResponse.json({
        success: false,
        error: 'Wallet not found for this virtual account',
      }, { status: 404 });
    }

    const user = wallet.user;

    // ✅ Build a realistic webhook payload (matching PalmPay format)
    const payload = {
      orderNo: `PAY${Date.now()}`,
      virtualAccountNo: virtualAccountNo,
      orderAmount: amount * 100, // Convert to cent (PalmPay uses cent)
      payerAccountName: payerName || 'Test Customer',
      payerAccountNo: `012${Math.floor(10000000 + Math.random() * 90000000)}`,
      payerBankName: payerBank || 'GTBank',
      sessionId: `SESS_${Date.now()}`,
      orderId: `ORD_${Date.now()}`,
      createdTime: Date.now(),
      completedTime: Date.now(),
      orderStatus: 1, // 1 = SUCCESS
    };

    console.log(`🧪 [TEST] Simulating funding for user ${user.id}: ₦${amount}`);

    // ✅ Process the funding directly (bypass webhook)
    const currentBalance = Number(wallet.walletBalance);

    await prisma.$transaction([
      // Update wallet
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          walletBalance: { increment: amount },
        },
      }),
      // Create wallet transaction
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: user.id,
          type: "CREDIT",
          amount: amount,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + amount,
          reference: payload.orderNo,
          description: `Wallet funding via PalmPay from ${payload.payerAccountName}`,
          status: "SUCCESS",
          category: "FUNDING",
          metadata: {
            source: "palmpay_test",
            payload: payload,
          },
        },
      }),
      // Create funding record
      prisma.walletFunding.create({
        data: {
          walletId: wallet.id,
          amount: amount,
          reference: payload.orderNo,
          provider: "PALMPAY",
          providerReference: payload.orderNo,
          status: WalletFundingStatus.SUCCESS,
          completedAt: new Date(),
          metadata: {
            source: "palmpay_test",
            payload: payload,
          },
        },
      }),
    ]);

    console.log(`✅ [TEST] Credited ₦${amount} to user ${user.id}`);

    // ✅ Trigger referral bonus (1% of first deposit)
    let referralBonus = 0;
    let referralMessage = '';

    try {
      const webhookUrl = `${getAppUrl()}/api/webhooks/wallet-funding`;
      
      console.log(`📤 [TEST] Triggering referral bonus webhook`);

      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          amount: amount,
          reference: payload.orderNo,
          status: "SUCCESS",
        }),
      });

      const webhookResult = await webhookResponse.json();
      
      if (webhookResult.success) {
        referralBonus = webhookResult.bonusAmount || 0;
        referralMessage = webhookResult.message || 'Referral bonus processed';
        console.log(`✅ [TEST] Referral bonus: ₦${referralBonus}`);
      } else {
        referralMessage = webhookResult.message || 'No referral bonus';
      }
    } catch (error) {
      console.error("❌ [TEST] Referral webhook error:", error);
      referralMessage = 'Failed to process referral bonus';
    }

    return NextResponse.json({
      success: true,
      message: `Wallet funded successfully with ₦${amount}`,
      data: {
        userId: user.id,
        amount: amount,
        newBalance: currentBalance + amount,
        referralBonus: referralBonus,
        referralMessage: referralMessage,
        payload: payload,
      },
    });

  } catch (error: any) {
    console.error('❌ Test funding error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}