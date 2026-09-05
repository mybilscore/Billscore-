// app/api/webhooks/palmpay/route.ts - USING YOUR EXISTING SIGNATURE VERIFICATION

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { WalletFundingStatus } from "@prisma/client";
import { verifyWebhookSignature } from "~/lib/palmpay/signature";

// Helper function to get app URL
function getAppUrl(): string {
  const url = process.env.NEXTAUTH_URL || 
              process.env.NEXT_PUBLIC_APP_URL || 
              process.env.APP_URL ||
              'http://localhost:3000';
  return url.replace(/\/$/, '');
}

// ✅ Get public key from environment for webhook verification
function getPublicKeyPEM(): string {
  let publicKey = process.env.PALMPAY_PUBLIC_KEY || '';
  if (!publicKey.includes('BEGIN PUBLIC KEY')) {
    publicKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
  }
  return publicKey;
}

export async function POST(request: NextRequest) {
  try {
    // ✅ Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    
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
      sign, // PalmPay sends signature in 'sign' field
      transactionId,
      sessionId,
    } = body;

    // ✅ Verify webhook signature using your existing function
    const publicKeyPEM = getPublicKeyPEM();
    const isVerified = verifyWebhookSignature(body, sign, publicKeyPEM);

    if (!isVerified) {
      console.error(`❌ [PalmPay Webhook] Invalid signature for order ${orderNo}`);
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      );
    }

    console.log(`✅ [PalmPay Webhook] Signature verified for order ${orderNo}`);

    // Only process successful payments (orderStatus: 1 = SUCCESS)
    if (orderStatus !== 1) {
      console.log(`ℹ️ [PalmPay Webhook] Ignoring order with status: ${orderStatus}`);
      return NextResponse.json({ 
        success: true, 
        message: `Order status ${orderStatus} ignored` 
      });
    }

    const amount = orderAmount / 100; // Convert from cents to Naira

    if (amount <= 0) {
      console.error(`❌ [PalmPay Webhook] Invalid amount: ${amount}`);
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // ✅ Find the user by virtual account number
    const wallet = await prisma.wallet.findFirst({
      where: { accountNumber: virtualAccountNo },
      include: { 
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          }
        }
      },
    });

    if (!wallet || !wallet.user) {
      console.error(`❌ [PalmPay Webhook] Wallet not found: ${virtualAccountNo}`);
      return NextResponse.json(
        { success: false, error: "Wallet not found" },
        { status: 404 }
      );
    }

    console.log(`📊 [PalmPay Webhook] Found user: ${wallet.user.fullName} (${wallet.user.id})`);

    // ✅ Check for duplicate transaction
    const existing = await prisma.walletTransaction.findFirst({
      where: { 
        OR: [
          { reference: orderNo },
          { reference: transactionId || orderNo }
        ]
      },
    });

    if (existing) {
      console.log(`ℹ️ [PalmPay Webhook] Duplicate transaction: ${orderNo}`);
      return NextResponse.json({ 
        success: true, 
        message: "Duplicate transaction already processed" 
      });
    }

    const currentBalance = Number(wallet.walletBalance) || 0;

    // ✅ Process funding in a transaction
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { 
          walletBalance: { increment: amount },
          ledgerBalance: { increment: amount },
        },
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
          metadata: { 
            source: "palmpay_webhook",
            payerAccountNo,
            payerBankName,
            transactionId,
            virtualAccountNo,
            sessionId,
            orderNo,
          },
        },
      }),
      prisma.walletFunding.create({
        data: {
          walletId: wallet.id,
          amount: amount,
          reference: orderNo,
          provider: "PALMPAY",
          providerReference: transactionId || orderNo,
          status: WalletFundingStatus.SUCCESS,
          completedAt: new Date(),
          metadata: {
            payerName: payerAccountName,
            payerAccount: payerAccountNo,
            payerBank: payerBankName,
            orderNo,
            sessionId,
          },
        },
      }),
    ]);

    console.log(`✅ [PalmPay Webhook] Credited ₦${amount} to user ${wallet.user.id}`);

    // ✅ Trigger referral bonus (if applicable)
    try {
      const webhookUrl = `${getAppUrl()}/api/webhooks/wallet-funding`;
      console.log(`📊 [PalmPay Webhook] Triggering referral webhook: ${webhookUrl}`);
      
      const referralResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-API-Key": process.env.INTERNAL_API_KEY || '',
        },
        body: JSON.stringify({
          userId: wallet.user.id,
          amount: amount,
          reference: orderNo,
          status: "SUCCESS",
          source: "PALMPAY",
          transactionId: transactionId || orderNo,
          payerName: payerAccountName,
          orderNo: orderNo,
        }),
      });

      if (!referralResponse.ok) {
        console.warn(`⚠️ [PalmPay Webhook] Referral webhook failed: ${referralResponse.status}`);
      } else {
        const result = await referralResponse.json();
        console.log(`✅ [PalmPay Webhook] Referral webhook result:`, result);
      }
    } catch (error) {
      console.error("❌ [PalmPay Webhook] Referral webhook error:", error);
      // Don't fail the main transaction
    }

    return NextResponse.json({ 
      success: true,
      data: {
        userId: wallet.user.id,
        amount: amount,
        reference: orderNo,
      }
    });

  } catch (error: any) {
    console.error("❌ [PalmPay Webhook] Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Webhook processing failed" 
    }, { status: 200 });
  }
}

// ✅ Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "healthy",
    service: "palmpay-webhook",
    timestamp: new Date().toISOString(),
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  });
}