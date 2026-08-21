// app/api/auth/confirm-purchase/route.ts
import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcrypt";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { 
  TransactionStatus, 
  VtuType, 
  ChannelType,
  NetworkProvider,
  WalletCategory,
  MeterType,
  VtuVendor,
} from "@prisma/client";

function getAppUrl(): string {
  const url = process.env.NEXTAUTH_URL || 
              process.env.NEXT_PUBLIC_APP_URL || 
              process.env.APP_URL ||
              process.env.VERCEL_URL ||
              'https://app.bilscore.com';
  
  const cleanUrl = url.replace(/\/$/, '');
  
  if (url === process.env.VERCEL_URL && !url.startsWith('http')) {
    return `https://${cleanUrl}`;
  }
  
  return cleanUrl;
}

// ============================================================
// HELPER: Send Token to WhatsApp
// ============================================================

async function sendTokenToWhatsApp(phoneNumber: string, data: any): Promise<boolean> {
  try {
    let message = "";

    switch (data.transactionType) {
      case "AIRTIME":
        message = `✅ Airtime Purchase Confirmed!

Phone: ${data.phoneNumber || 'N/A'}
Amount: NGN ${Number(data.amount).toFixed(2)}
Network: ${data.network || 'N/A'}
Reference: ${data.transactionId?.substring(0, 10) || 'N/A'}

Thank you for using Bilscore!`;
        break;

      case "DATA":
        message = `✅ Data Purchase Confirmed!

Phone: ${data.phoneNumber || 'N/A'}
Plan: ${data.networkPlan || 'N/A'}
Amount: NGN ${Number(data.amount).toFixed(2)}
Network: ${data.network || 'N/A'}
Reference: ${data.transactionId?.substring(0, 10) || 'N/A'}

Thank you for using Bilscore!`;
        break;

      case "ELECTRICITY_INSTANT":
      case "ELECTRICITY_PREORDER":
        message = `✅ Electricity Purchase Confirmed!

Meter: ${data.meterNumber || 'N/A'}
DisCo: ${data.disco || 'N/A'}
Amount: NGN ${Number(data.amount).toFixed(2)}
Token: ${data.token || 'N/A'}
Reference: ${data.transactionId?.substring(0, 10) || 'N/A'}

Please use this token to recharge your meter.
Thank you for using Bilscore!`;
        break;

      case "CABLE_TV":
        message = `✅ Cable TV Subscription Confirmed!

Decoder: ${data.decoderNumber || 'N/A'}
Provider: ${data.provider || 'N/A'}
Package: ${data.packageName || 'N/A'}
Amount: NGN ${Number(data.amount).toFixed(2)}
Reference: ${data.transactionId?.substring(0, 10) || 'N/A'}

Your subscription has been activated. Enjoy!`;
        break;

      case "EDUCATION":
        const tokens = data.tokens || [];
        const cards = data.cards || [];
        let pinDetails = '';
        if (cards.length > 0) {
          pinDetails = `Card: ${cards[0]?.Serial || ''} - ${cards[0]?.Pin || ''}`;
          if (cards.length > 1) {
            pinDetails += ` (+${cards.length - 1} more)`;
          }
        } else if (tokens.length > 0) {
          pinDetails = `PIN: ${tokens[0]}`;
          if (tokens.length > 1) {
            pinDetails += ` (+${tokens.length - 1} more)`;
          }
        } else if (data.token) {
          pinDetails = `PIN: ${data.token}`;
        }
        
        message = `✅ Education Purchase Confirmed! 🎓

Product: ${data.product || 'N/A'}
Quantity: ${data.quantity || 1}
Amount: NGN ${Number(data.amount).toFixed(2)}
${pinDetails}
Reference: ${data.transactionId?.substring(0, 10) || 'N/A'}

Thank you for using Bilscore!`;
        break;

      default:
        message = `✅ Purchase Confirmed!

Amount: NGN ${Number(data.amount).toFixed(2)}
Reference: ${data.transactionId?.substring(0, 10) || 'N/A'}

Thank you for using Bilscore!`;
    }

    console.log(`📤 [WhatsApp] Sending confirmation to ${phoneNumber}`);

    const response = await fetch(`${getAppUrl()}/api/twilio/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
      }),
    });

    if (!response.ok) {
      console.error("❌ [WhatsApp] Failed to send message");
      return false;
    }

    console.log(`✅ [WhatsApp] Message sent successfully`);
    return true;

  } catch (error) {
    console.error("❌ [WhatsApp] Error sending confirmation:", error);
    return false;
  }
}

// ============================================================
// HELPER: Process Different Service Types
// ============================================================

async function processServicePurchase(
  transaction: any,
  user: any,
  pin: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const vendorService = getVendorService();

  try {
    // Validate PIN again for security
    const isValidPin = await compare(pin, user.pinHash);
    if (!isValidPin) {
      return { success: false, error: "Invalid PIN" };
    }

    let result;
    const amount = Number(transaction.amount);

    switch (transaction.transactionType) {
      case "AIRTIME":
        result = await vendorService.buyAirtime(
          {
            phoneNumber: transaction.phoneNumber || user.phone,
            amount: amount,
            network: transaction.product || "MTN",
          },
          user.id
        );
        break;

      case "DATA":
        result = await vendorService.buyData(
          {
            phoneNumber: transaction.phoneNumber || user.phone,
            planCode: transaction.networkPlan || "",
            network: transaction.product || "MTN",
            amount: amount,
          },
          user.id
        );
        break;

      case "ELECTRICITY_INSTANT":
      case "ELECTRICITY_PREORDER":
        result = await vendorService.buyElectricity(
          {
            meterNumber: transaction.meterNumber || "",
            amount: amount,
            discoCode: transaction.product || "",
            meterType: transaction.meterType || "Prepaid",
            phone: user.phone,
          },
          user.id
        );
        break;

      case "CABLE_TV":
        result = await vendorService.buyCableTV(
          {
            decoderNumber: transaction.metadata?.smartCardNumber || transaction.phoneNumber || "",
            packageCode: transaction.networkPlan || "",
            provider: transaction.product || "DSTV",
            amount: amount,
            phone: user.phone,
          },
          user.id
        );
        break;

      case "EDUCATION":
        result = await vendorService.buyEducation(
          {
            serviceId: transaction.product || "",
            variationCode: transaction.networkPlan || "",
            phone: user.phone,
            quantity: transaction.bulkQuantity || 1,
          },
          user.id
        );
        break;

      default:
        return { success: false, error: `Unsupported service: ${transaction.transactionType}` };
    }

    if (!result || !result.success) {
      return { 
        success: false, 
        error: result?.error || "Vendor purchase failed" 
      };
    }

    return {
      success: true,
      data: {
        ...result.data,
        vendorReference: result.vendorReference,
        vendor: result.vendor,
        token: result.data?.token || result.data?.purchased_code || null,
        tokens: result.data?.tokens || [],
        cards: result.data?.cards || [],
      },
    };

  } catch (error: any) {
    console.error("❌ Service purchase error:", error);
    return { 
      success: false, 
      error: error.message || "Purchase failed" 
    };
  }
}

// ============================================================
// MAIN API ROUTE
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, pin } = body;

    if (!token || !pin) {
      return NextResponse.json({
        success: false,
        error: "Token and PIN are required",
      }, { status: 400 });
    }

    console.log(`🔍 [Confirm Purchase] Looking for token: ${token}`);

    // Find transaction by validation token
    let transaction = await prisma.vtuTransaction.findFirst({
      where: {
        status: "PENDING",
        metadata: {
          path: "$.validationToken",
          equals: token,
        },
      },
    });

    // Fallback: manual filter
    if (!transaction) {
      console.log(`🔍 [Confirm Purchase] Fallback search...`);
      const pendingTransactions = await prisma.vtuTransaction.findMany({
        where: { status: "PENDING" },
        take: 50,
      });
      
      const found = pendingTransactions.find((tx: any) => {
        return tx.metadata?.validationToken === token;
      });
      
      if (found) {
        transaction = found;
        console.log(`✅ [Confirm Purchase] Found via fallback: ${transaction.id}`);
      }
    }

    if (!transaction) {
      console.log(`❌ [Confirm Purchase] No transaction found`);
      return NextResponse.json({
        success: false,
        error: "Invalid or expired validation link",
      }, { status: 404 });
    }

    console.log(`✅ [Confirm Purchase] Found transaction: ${transaction.id}`);
    console.log(`📋 [Confirm Purchase] Type: ${transaction.transactionType}`);

    // Check if expired
    const validationExpiry = transaction.metadata?.validationExpiry;
    if (validationExpiry && new Date(validationExpiry) < new Date()) {
      return NextResponse.json({
        success: false,
        error: "Validation link has expired",
      }, { status: 410 });
    }

    // Check if already processed
    if (transaction.metadata?.processed === true) {
      return NextResponse.json({
        success: false,
        error: "This transaction has already been processed",
      }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: transaction.userId },
      include: { wallet: true },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    if (!user.pinHash) {
      return NextResponse.json({
        success: false,
        error: "Transaction PIN not set. Please set your PIN first.",
      }, { status: 400 });
    }

    // Verify PIN
    const isValidPin = await compare(pin, user.pinHash);
    if (!isValidPin) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          pinAttempts: { increment: 1 },
        },
      });

      const attempts = updatedUser.pinAttempts;
      if (attempts >= 5) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            pinLockedUntil: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
        return NextResponse.json({
          success: false,
          error: "Too many failed attempts. Account locked for 15 minutes.",
        }, { status: 403 });
      }

      return NextResponse.json({
        success: false,
        error: `Invalid PIN. ${5 - attempts} attempts remaining.`,
        attemptsLeft: 5 - attempts,
      }, { status: 401 });
    }

    // Reset PIN attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    // Check wallet balance
    const wallet = user.wallet;
    if (!wallet) {
      return NextResponse.json({
        success: false,
        error: "Wallet not found",
      }, { status: 404 });
    }

    const amount = Number(transaction.amount);
    const currentBalance = Number(wallet.walletBalance);
    
    if (currentBalance < amount) {
      // Update transaction as failed
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          metadata: {
            ...transaction.metadata,
            processed: true,
            failureReason: "INSUFFICIENT_BALANCE",
            failedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: false,
        error: `Insufficient balance. You have NGN ${currentBalance.toFixed(2)}.`,
      }, { status: 400 });
    }

    // Process the purchase
    const purchaseResult = await processServicePurchase(transaction, user, pin);

    if (!purchaseResult.success) {
      // Update transaction as failed
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          metadata: {
            ...transaction.metadata,
            processed: true,
            failureReason: purchaseResult.error || "Purchase failed",
            failedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: false,
        error: purchaseResult.error || "Purchase failed",
      }, { status: 500 });
    }

    const vendorData = purchaseResult.data;

    // Debit wallet and update transaction
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          walletBalance: {
            decrement: amount,
          },
        },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: user.id,
          type: "DEBIT",
          amount: amount,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance - amount,
          reference: `VTU_${transaction.id}`,
          description: `${transaction.transactionType} purchase`,
          status: "SUCCESS",
          category: transaction.transactionType as WalletCategory,
        },
      }),
      prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "SUCCESS",
          totalDebited: amount,
          token: vendorData.token || null,
          vendorReference: vendorData.vendorReference || null,
          vendor: vendorData.vendor as VtuVendor || null,
          deliveredAt: new Date(),
          metadata: {
            ...transaction.metadata,
            processed: true,
            vendorResponse: vendorData,
            completedAt: new Date().toISOString(),
          },
        },
      }),
    ]);

    // Update pending wallet transaction to SUCCESS
    await prisma.walletTransaction.updateMany({
      where: {
        reference: `PENDING_${transaction.id}`,
        status: "PENDING",
      },
      data: {
        status: "SUCCESS",
        description: `✅ ${transaction.transactionType} purchase completed`,
      },
    });

    // Extract data for WhatsApp message based on transaction type
    let serviceData: any = {
      transactionType: transaction.transactionType,
      amount: transaction.amount,
      transactionId: transaction.id,
      phoneNumber: transaction.phoneNumber || user.phone,
      network: transaction.product,
      networkPlan: transaction.networkPlan,
      meterNumber: transaction.meterNumber,
      disco: transaction.product,
      provider: transaction.product,
      packageName: transaction.metadata?.packageName,
      decoderNumber: transaction.metadata?.smartCardNumber || transaction.phoneNumber,
      token: vendorData.token || vendorData.purchased_code || null,
      tokens: vendorData.tokens || [],
      cards: vendorData.cards || [],
      vendorReference: vendorData.vendorReference,
      quantity: transaction.bulkQuantity || 1,
      product: transaction.product,
    };

    // Send confirmation via WhatsApp
    const messageSent = await sendTokenToWhatsApp(user.phone, serviceData);

    return NextResponse.json({
      success: true,
      message: "Purchase confirmed successfully!",
      transactionId: transaction.id,
      token: vendorData.token || vendorData.purchased_code || null,
      serviceType: transaction.transactionType,
      amount: Number(transaction.amount),
      recipient: transaction.phoneNumber || transaction.meterNumber || "N/A",
      whatsappSent: messageSent,
      vendorReference: vendorData.vendorReference,
    });

  } catch (error: any) {
    console.error("❌ [Confirm Purchase] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to confirm purchase",
    }, { status: 500 });
  }
}