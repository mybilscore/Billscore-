// app/api/vendors/subscription/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { 
  SubscriptionType, 
  MeterType, 
  TokenStatus, 
  TransactionStatus, 
  PreOrderStatus, 
  WalletTransactionType, 
  VtuType,
  ChannelType,       
  WalletCategory,    
  TokenType,         
  DeliveryChannel,   
  JobType,           
  JobStatus,
  DisCo, // ✅ Import DisCo enum
} from "@prisma/client";
import { getVendorService } from "~/lib/vendors/vendor.service";

// ✅ Map string to DisCo enum
function mapDiscoCode(discoCode: string): DisCo {
  const discoMap: Record<string, DisCo> = {
    'IKEJA': DisCo.IKEJA,
    'EKO': DisCo.EKO,
    'ABUJA': DisCo.ABUJA,
    'KANO': DisCo.KANO,
    'PHCN': DisCo.PHCN,
    'IBADAN': DisCo.IBADAN,
    'BENIN': DisCo.BENIN,
    'ENUGU': DisCo.ENUGU,
    'JOS': DisCo.JOS,
    'PORT_HARCOURT': DisCo.PORT_HARCOURT,
    'PORTHARCOURT': DisCo.PORT_HARCOURT,
    'KADUNA': DisCo.KADUNA,
  };
  
  const normalized = discoCode?.toUpperCase()?.trim() || '';
  const mapped = discoMap[normalized];
  
  if (!mapped) {
    console.warn(`⚠️ Unknown DisCo: "${discoCode}", defaulting to ABUJA`);
    return DisCo.ABUJA;
  }
  
  return mapped;
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const body = await request.json();
    const { serviceType, meterNumber, decoderNumber, discoCode, provider, amount, deliveryDate } = body;

    console.log(`📝 [SUBSCRIPTION] Creating subscription:`, {
      serviceType,
      meterNumber,
      decoderNumber,
      discoCode,
      provider,
      amount,
      deliveryDate,
      userId: sessionUser.id,
    });

    // Validate required fields
    if (!amount || amount < 100) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid amount (minimum ₦100)",
      }, { status: 400 });
    }

    if (!deliveryDate) {
      return NextResponse.json({
        success: false,
        error: "Please select a delivery date",
      }, { status: 400 });
    }

    // Validate delivery date (minimum 3 days from today)
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    const selectedDate = new Date(deliveryDate);
    
    if (selectedDate < minDate) {
      return NextResponse.json({
        success: false,
        error: "Delivery date must be at least 3 days from today",
      }, { status: 400 });
    }

    // Validate service-specific fields
    if (serviceType === "electricity" && !meterNumber) {
      return NextResponse.json({
        success: false,
        error: "Meter number is required for electricity",
      }, { status: 400 });
    }

    if (serviceType === "cable" && !decoderNumber) {
      return NextResponse.json({
        success: false,
        error: "Decoder number is required for cable TV",
      }, { status: 400 });
    }

    if (serviceType === "electricity" && !discoCode) {
      return NextResponse.json({
        success: false,
        error: "DisCo is required for electricity",
      }, { status: 400 });
    }

    if (serviceType === "cable" && !provider) {
      return NextResponse.json({
        success: false,
        error: "Provider is required for cable TV",
      }, { status: 400 });
    }

    // Get user with wallet
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      return NextResponse.json({
        success: false,
        error: "User or wallet not found",
      }, { status: 404 });
    }

    const walletBalance = Number(user.wallet.walletBalance);
    const walletId = user.wallet.id;

    // ✅ Check if user has sufficient balance
    if (walletBalance < amount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}, Required: ₦${amount.toFixed(2)}`,
      }, { status: 400 });
    }

    let token = null;
    let tokenSaved = false;
    let vendorReference = null;
    let deliveryStatus = "SCHEDULED";
    let vtuTransactionId = null;
    let tokenVaultId = null;

    // ✅ Map discoCode to DisCo enum
    const discoEnum = mapDiscoCode(discoCode);

    // ✅ FOR ELECTRICITY: Purchase token immediately (but don't deduct from wallet yet)
    if (serviceType === "electricity") {
      try {
        console.log(`⚡ [SUBSCRIPTION] Attempting to purchase electricity token for ${meterNumber}...`);
        
        const vendorService = getVendorService();
        const result = await vendorService.buyElectricity(
          {
            meterNumber: meterNumber,
            amount: amount,
            discoCode: discoCode,
            meterType: "Prepaid",
            phone: user.phone,
          },
          user.id
        );

        if (result.success) {
          token = result.data?.token;
          vendorReference = result.vendorReference;
          tokenSaved = true;
          deliveryStatus = "TOKEN_PURCHASED";
          console.log(`✅ [SUBSCRIPTION] Token purchased successfully for ${meterNumber}`);
        } else {
          console.log(`⚠️ [SUBSCRIPTION] Token purchase failed for ${meterNumber}:`, result.error);
          deliveryStatus = "PENDING_PURCHASE";
        }
      } catch (error: any) {
        console.error(`❌ [SUBSCRIPTION] Error purchasing token:`, error);
        deliveryStatus = "PENDING_PURCHASE";
      }
    }

    // ✅ Create subscription with proper DisCo enum
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        type: serviceType === "electricity" ? SubscriptionType.ELECTRICITY : SubscriptionType.CABLE_TV,
        disCo: serviceType === "electricity" ? discoEnum : null, // ✅ Use mapped enum
        meterNumber: serviceType === "electricity" ? meterNumber : null,
        meterType: serviceType === "electricity" ? MeterType.HOME : null,
        meterName: serviceType === "electricity" ? `${discoCode} Meter` : null,
        decoderNumber: serviceType === "cable" ? decoderNumber : null,
        decoderType: serviceType === "cable" ? provider : null,
        packageName: serviceType === "cable" ? "Standard" : null,
        amount: amount,
        serviceFee: 0,
        renewalDay: selectedDate.getDate(),
        isActive: true,
        isPaused: false,
        nextRenewalDate: selectedDate,
        lastRenewalDate: null,
        channel: "MOBILE_APP",
        apiKeyId: null,
      },
    });

    console.log(`✅ [SUBSCRIPTION] Subscription created: ${subscription.id}`);

    // ✅ If token was purchased successfully, create VtuTransaction and TokenVault
    if (tokenSaved && token) {
      // Create VtuTransaction (PENDING since money isn't deducted yet)
      const vtuTransaction = await prisma.vtuTransaction.create({
        data: {
          userId: user.id,
          transactionType: VtuType.ELECTRICITY_PREORDER,
          product: discoCode,
          amount: amount,
          totalDebited: amount,
          meterNumber: meterNumber!,
          meterType: MeterType.HOME,
          status: TransactionStatus.PENDING,
          vendorReference: vendorReference,
          token: token,
          deliveredAt: null,
          scheduledFor: selectedDate,
          channel: ChannelType.MOBILE_APP,
          subscriptionId: subscription.id,
          metadata: {
            subscriptionId: subscription.id,
            deliveryDate: deliveryDate,
            vendorReference: vendorReference,
            serviceType: serviceType,
            isSubscription: true,
            isScheduled: true,
            tokenPurchased: true,
            paymentPending: true,
          },
        },
      });

      vtuTransactionId = vtuTransaction.id;
      console.log(`📝 [SUBSCRIPTION] VtuTransaction created (PENDING): ${vtuTransaction.id}`);

      // Create TokenVault with the token
      const tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 30);

      const tokenVault = await prisma.tokenVault.create({
        data: {
          userId: user.id,
          transactionId: vtuTransaction.id,
          token: token,
          tokenType: TokenType.ELECTRICITY,
          meterNumber: meterNumber!,
          disCo: discoEnum, // ✅ Use mapped enum
          amount: amount,
          validFrom: new Date(),
          validUntil: tokenExpiry,
          status: TokenStatus.STORED,
          scheduledFor: selectedDate,
          deliveryChannel: DeliveryChannel.MOBILE_PUSH,
          isRefunded: false,
          metadata: {
            vendorReference: vendorReference,
            subscriptionId: subscription.id,
            deliveryDate: deliveryDate,
            serviceType: serviceType,
            isScheduled: true,
            paymentPending: true,
          },
        },
      });

      tokenVaultId = tokenVault.id;
      console.log(`💾 [SUBSCRIPTION] Token stored in vault (PENDING): ${tokenVault.id}`);

      // Update VtuTransaction with token vault reference
      await prisma.vtuTransaction.update({
        where: { id: vtuTransaction.id },
        data: {
          tokenVault: {
            connect: { id: tokenVault.id },
          },
        },
      });
    }

    // ✅ RESERVE the amount using SYSTEM transaction (doesn't deduct from wallet)
    const reserveTransaction = await prisma.walletTransaction.create({
      data: {
        walletId: user.wallet.id,
        userId: user.id,
        type: WalletTransactionType.SYSTEM,
        amount: amount,
        balanceBefore: walletBalance,
        balanceAfter: walletBalance, // Balance stays the same!
        reference: `RESERVE_${subscription.id}`,
        description: tokenSaved 
          ? `🔒 Token purchased & reserved for ${serviceType} delivery on ${new Date(deliveryDate).toLocaleDateString()}`
          : `🔒 Reserved for ${serviceType} delivery on ${new Date(deliveryDate).toLocaleDateString()}`,
        status: TransactionStatus.PENDING,
        category: serviceType === "electricity" ? WalletCategory.ELECTRICITY : WalletCategory.CABLE_TV,
        channel: ChannelType.MOBILE_APP,
        metadata: {
          subscriptionId: subscription.id,
          deliveryDate: deliveryDate,
          serviceType: serviceType,
          isReserved: true,
          amountReserved: amount,
          status: "RESERVED",
          scheduledDate: deliveryDate,
          tokenPurchased: tokenSaved,
          tokenVaultId: tokenVaultId,
          vtuTransactionId: vtuTransactionId,
          token: token,
          walletId: walletId,
          paymentPending: true,
        },
      },
    });

    console.log(`🔒 [SUBSCRIPTION] Amount reserved (PENDING): ${amount} (${reserveTransaction.reference})`);

    // ✅ Create PreOrder for tracking
    if (serviceType === "electricity") {
      await prisma.preOrder.create({
        data: {
          userId: user.id,
          disCo: discoEnum, // ✅ Use mapped enum
          meterNumber: meterNumber,
          meterType: MeterType.HOME,
          meterName: `${discoCode} Meter`,
          amount: amount,
          serviceFee: 0,
          totalDebited: 0, // ✅ Not debited yet (0)
          deliveryDate: selectedDate,
          status: tokenSaved ? PreOrderStatus.PURCHASED : PreOrderStatus.PENDING,
          transactionId: vtuTransactionId,
          tokenVaultId: tokenVaultId,
          isCancelled: false,
          channel: ChannelType.MOBILE_APP,
          metadata: {
            subscriptionId: subscription.id,
            isReserved: true,
            reservedAmount: amount,
            scheduledDate: deliveryDate,
            tokenPurchased: tokenSaved,
            token: token,
            walletId: walletId,
            paymentPending: true,
          },
        },
      });
      console.log(`📝 [SUBSCRIPTION] Pre-order created (PENDING)`);
    }

    // ✅ Schedule delivery job
    await prisma.job.create({
      data: {
        type: JobType.SUBSCRIPTION_PROCESSING,
        status: JobStatus.PENDING,
        payload: {
          subscriptionId: subscription.id,
          userId: user.id,
          serviceType: serviceType,
          amount: amount,
          deliveryDate: deliveryDate,
          walletId: walletId,
          reserveTransactionId: reserveTransaction.id,
          tokenVaultId: tokenVaultId,
          vtuTransactionId: vtuTransactionId,
          token: token,
          tokenPurchased: tokenSaved,
          meterNumber: meterNumber,
          decoderNumber: decoderNumber,
          discoCode: discoCode,
          provider: provider,
        },
        priority: 5,
        maxAttempts: 3,
        scheduledFor: selectedDate,
      },
    });

    console.log(`🔄 [SUBSCRIPTION] Delivery job scheduled for ${selectedDate.toISOString()}`);

    // ✅ Return success (wallet balance unchanged)
    return NextResponse.json({
      success: true,
      data: {
        id: subscription.id,
        type: subscription.type,
        amount: Number(subscription.amount),
        renewalDay: subscription.renewalDay,
        nextRenewalDate: subscription.nextRenewalDate,
        scheduledDate: deliveryDate,
        deliveryStatus: deliveryStatus,
        tokenPurchased: tokenSaved,
        token: token,
        tokenVaultId: tokenVaultId,
        vtuTransactionId: vtuTransactionId,
        amountReserved: amount,
        walletBalance: walletBalance, // ✅ Balance unchanged
        reservedAmount: amount,
        walletId: walletId,
        message: tokenSaved 
          ? "✅ Subscription created! Token purchased and reserved. Balance will be deducted on delivery date."
          : "📅 Subscription created! Token will be purchased before delivery date.",
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error("❌ [SUBSCRIPTION] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to create subscription",
    }, { status: 500 });
  }
}