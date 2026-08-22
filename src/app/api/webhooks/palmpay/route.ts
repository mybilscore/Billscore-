// app/api/webhooks/palmpay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { WalletFundingStatus } from "@prisma/client";

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
    console.log(`📊 [PalmPay Webhook] Received:`, JSON.stringify(body, null, 2));

    // ✅ Extract webhook data
    const {
      orderNo,
      virtualAccountNo,
      orderAmount,
      payerAccountName,
      payerAccountNo,
      payerBankName,
      orderStatus,
    } = body;

    // Only process successful payments (orderStatus: 1 = SUCCESS)
    if (orderStatus !== 1) {
      console.log(`ℹ️ [PalmPay Webhook] Ignoring order with status: ${orderStatus}`);
      return NextResponse.json({ success: true, message: "Ignored" });
    }

    const amount = orderAmount / 100; // Convert from cent to Naira

    // Find the user by virtual account number
    const wallet = await prisma.wallet.findFirst({
      where: { accountNumber: virtualAccountNo },
      include: { user: true },
    });

    if (!wallet || !wallet.user) {
      console.error(`❌ Wallet not found: ${virtualAccountNo}`);
      return NextResponse.json({ success: false, error: "Wallet not found" });
    }

    // Check for duplicate
    const existing = await prisma.walletTransaction.findFirst({
      where: { reference: orderNo },
    });

    if (existing) {
      console.log(`ℹ️ Duplicate transaction: ${orderNo}`);
      return NextResponse.json({ success: true, message: "Duplicate" });
    }

    const currentBalance = Number(wallet.walletBalance);

    // Process funding
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { walletBalance: { increment: amount } },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: wallet.user.id,
          type: "CREDIT",
          amount: amount,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + amount,
          reference: orderNo,
          description: `Wallet funding via PalmPay from ${payerAccountName || 'Unknown'}`,
          status: "SUCCESS",
          category: "FUNDING",
          metadata: { source: "palmpay_webhook", body },
        },
      }),
      prisma.walletFunding.create({
        data: {
          walletId: wallet.id,
          amount: amount,
          reference: orderNo,
          provider: "PALMPAY",
          providerReference: orderNo,
          status: WalletFundingStatus.SUCCESS,
          completedAt: new Date(),
        },
      }),
    ]);

    console.log(`✅ Credited ₦${amount} to user ${wallet.user.id}`);

    // ✅ Trigger referral bonus
    try {
      const webhookUrl = `${getAppUrl()}/api/webhooks/wallet-funding`;
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: wallet.user.id,
          amount: amount,
          reference: orderNo,
          status: "SUCCESS",
        }),
      });
    } catch (error) {
      console.error("Referral webhook error:", error);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("PalmPay webhook error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}