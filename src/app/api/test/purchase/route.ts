// src/app/api/test/purchase/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { prisma } from "~/lib/db";
import { TransactionStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  console.log("🧪 [TEST PURCHASE] Starting test purchase...");
  
  try {
    const body = await request.json();
    const { service, phoneNumber, amount, network } = body;
    
    console.log(`📝 [TEST PURCHASE] Request:`, { service, phoneNumber, amount, network });

    // Use a test user - get the first user from database
    let testUser = await prisma.user.findFirst({
      include: { wallet: true },
    });

    if (!testUser) {
      console.error("❌ [TEST PURCHASE] No test user found");
      return NextResponse.json({
        success: false,
        error: "No test user found. Please create a user first.",
      }, { status: 400 });
    }

    console.log(`👤 [TEST PURCHASE] Using test user: ${testUser.id} (${testUser.email})`);

    // Check if user has wallet, create one if not
    let wallet = testUser.wallet;
    
    if (!wallet) {
      console.log("🔧 [TEST PURCHASE] Creating wallet for test user...");
      
      wallet = await prisma.wallet.create({
        data: {
          userId: testUser.id,
          accountNumber: generateVirtualAccountNumber(),
          bankName: "PALMPAY",
          accountName: testUser.fullName,
          walletBalance: 10000, // Give test user ₦10,000
          ledgerBalance: 10000,
          currency: "NGN",
          isActive: true,
          kycLevel: 1,
        },
      });
      
      await prisma.user.update({
        where: { id: testUser.id },
        data: { hasWallet: true },
      });
      
      console.log(`✅ [TEST PURCHASE] Wallet created with balance: ₦10,000`);
    }

    console.log(`💰 [TEST PURCHASE] Wallet balance: ${wallet.walletBalance}`);

    const totalCost = amount + (amount * 0.02);
    if (wallet.walletBalance < totalCost) {
      // Add funds for testing
      console.log(`🔧 [TEST PURCHASE] Adding funds to wallet...`);
      
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          walletBalance: {
            increment: 10000,
          },
          ledgerBalance: {
            increment: 10000,
          },
        },
      });
      
      wallet = await prisma.wallet.findUnique({
        where: { id: wallet.id },
      })!;
      
      console.log(`💰 [TEST PURCHASE] New wallet balance: ${wallet.walletBalance}`);
    }

    // Get vendor service
    const vendorService = getVendorService();

    // Execute purchase
    console.log(`🔄 [TEST PURCHASE] Calling VTpass for ${service}...`);
    
    const result = await vendorService.buyAirtime({
      phoneNumber,
      amount,
      network: network || 'MTN',
    }, testUser.id);
    
    console.log(`📊 [TEST PURCHASE] Vendor result:`, {
      success: result.success,
      error: result.error,
      vendor: result.vendor,
      vendorReference: result.vendorReference,
    });

    if (!result.success) {
      console.error(`❌ [TEST PURCHASE] Vendor transaction failed:`, result.error);
      return NextResponse.json({
        success: false,
        error: result.error || "Vendor transaction failed",
        details: result.metadata,
        vendorResponse: result.rawResponse,
      }, { status: 500 });
    }

    // Deduct from wallet
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          walletBalance: {
            decrement: totalCost,
          },
        },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: testUser.id,
          type: "DEBIT",
          amount: totalCost,
          balanceBefore: wallet.walletBalance,
          balanceAfter: wallet.walletBalance - totalCost,
          reference: result.vendorReference || `TEST-${Date.now()}`,
          description: `Test ${service} purchase`,
          status: TransactionStatus.SUCCESS,
          category: service.toUpperCase(),
        },
      }),
    ]);

    console.log(`✅ [TEST PURCHASE] Purchase successful!`);

    return NextResponse.json({
      success: true,
      message: `Test ${service} purchase successful`,
      data: {
        transactionId: result.data?.transactionId || result.vendorReference,
        reference: result.vendorReference,
        amount: result.data?.amount || amount,
        status: result.data?.status || "SUCCESS",
        vendor: result.vendor,
        user: {
          id: testUser.id,
          email: testUser.email,
        },
      },
    });

  } catch (error: any) {
    console.error("❌ [TEST PURCHASE] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Test purchase failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

// Helper function
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}