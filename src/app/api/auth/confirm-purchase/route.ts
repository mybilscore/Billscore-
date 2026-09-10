// app/api/auth/confirm-purchase/route.ts - ALIGNED WITH PROCESSOR

import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcrypt";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { sendWhatsAppMessage } from "~/lib/twilio"; 
import { 
  TransactionStatus, 
  VtuType, 
  ChannelType,
  NetworkProvider,
  WalletCategory,
  MeterType,
  VtuVendor,
} from "@prisma/client";

// ============================================================
// HELPERS
// ============================================================

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

// ✅ Network resolver — must match processor
function resolveNetworkEnum(input: string | undefined | null): string {
  const normalized = String(input || '').toUpperCase().trim();
  if (normalized.includes('MTN')) return 'MTN';
  if (normalized.includes('AIRTEL')) return 'AIRTEL';
  if (normalized.includes('GLO')) return 'GLO';
  if (normalized.includes('9MOBILE') || normalized.includes('NINEMOBILE') || normalized.includes('ETISALAT')) {
    return 'NINEMOBILE';
  }
  return 'MTN';  // default
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
        const dataDisplay = data.metadata?.displayData || data.metadata?.planData?.data || data.networkPlan || 'N/A';
        message = `✅ Data Purchase Confirmed!

Phone: ${data.phoneNumber || 'N/A'}
Plan: ${dataDisplay}
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

    await sendWhatsAppMessage(phoneNumber, message);
    return true;

  } catch (error) {
    console.error("❌ [WhatsApp] Error sending confirmation:", error);
    return false;
  }
}

// ============================================================
// HELPER: Process Different Service Types (ALIGNED WITH PROCESSOR)
// ============================================================

async function processServicePurchase(
  transaction: any,
  user: any,
  pin: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const vendorService = getVendorService();

  try {
    const isValidPin = await compare(pin, user.pinHash);
    if (!isValidPin) {
      return { success: false, error: "Invalid PIN" };
    }

    const metadata = (transaction.metadata || {}) as any;
    const amount = Number(transaction.amount);

    // ✅ Normalize network (mirrors job processor)
    const network = resolveNetworkEnum(
      metadata.network ||
      metadata.detectedNetwork ||
      metadata.planData?.network ||
      transaction.product
    );

    let result;

    switch (transaction.transactionType) {
      // ============================================================
      // AIRTIME
      // ============================================================
      case "AIRTIME":
        result = await vendorService.buyAirtime(
          {
            phoneNumber: transaction.phoneNumber || user.phone,
            amount: amount,
            network: network,                    // ✅ enum string, never product
          },
          user.id
        );
        break;

      // ============================================================
      // DATA — CRITICAL FIX
      // ============================================================
      case "DATA": {
        const planData = metadata.planData || {};
        
        // ✅ Resolve finalPlanCode — mirror processor's priority order
        // Priority: finalPlanCode → vendorPlanId → planId → planCode
        // NEVER fall back to planData.data (that's display-only)
        let finalPlanCode = String(
          metadata.finalPlanCode ||
          metadata.vendorPlanId ||
          metadata.planId ||
          planData.vendorPlanId ||
          planData.planCode ||
          ''
        ).trim();
        
        if (!finalPlanCode) {
          return {
            success: false,
            error: "Missing vendorPlanId in transaction metadata — cannot route to vendor",
          };
        }
        
        console.log(`[Confirm Purchase][DATA] Resolved:`, {
          transactionId: transaction.id,
          network,
          finalPlanCode,                        // "194"
          vendorPlanId: planData.vendorPlanId,
          displayData: planData.data,           // "1.0GB" (never sent to vendor)
        });
        
        result = await vendorService.buyData(
          {
            phoneNumber: transaction.phoneNumber || user.phone,
            
            // ✅ Vendor-facing ID
            planCode: finalPlanCode,            // "194"
            vendorPlanId: planData.vendorPlanId,
            
            // ✅ Network enum
            network: network,                   // "MTN"
            
            amount: amount,
            
            // ✅ Full plan object (mirrors web-app route + processor)
            dataPlan: {
              id: planData.dbId,
              name: planData.data,
              network: network,
              amountMB: planData.amountMB,
              vendorPlanId: planData.vendorPlanId,
              vendorNetworkCode: planData.vendorNetworkCode,
              vendorPlanType: planData.vendorPlanType,
            },
          },
          user.id
        );
        
        if (result.success) {
          result.data = {
            ...result.data,
            planData: planData,
          };
        }
        break;
      }

      // ============================================================
      // ELECTRICITY — consistent discoCode (enum name, not service ID)
      // ============================================================
      case "ELECTRICITY_INSTANT":
      case "ELECTRICITY_PREORDER": {
        // ✅ Read from metadata first (webhook stores it there), fall back to product
        // Match the processor: send the enum name like "IKEJA", not "ikeja-electric"
        const discoCode = String(
          metadata.discoCode ||
          transaction.product ||
          ''
        ).toUpperCase().trim();
        
        if (!discoCode) {
          return { success: false, error: "Missing discoCode for electricity purchase" };
        }
        
        console.log(`[Confirm Purchase][ELECTRICITY] Sending discoCode: ${discoCode}`);
        
        result = await vendorService.buyElectricity(
          {
            meterNumber: transaction.meterNumber || "",
            amount: amount,
            discoCode: discoCode,               // "IKEJA" — matches processor
            meterType: transaction.meterType || "Prepaid",
            phone: user.phone,
          },
          user.id
        );
        break;
      }

      // ============================================================
      // CABLE TV — read package from metadata.packageCode
      // ============================================================
      case "CABLE_TV": {
        const packageCode = String(
          metadata.packageCode ||
          transaction.networkPlan ||
          ''
        ).trim();
        
        const decoderNumber = String(
          metadata.decoderNumber ||
          metadata.smartCardNumber ||
          transaction.phoneNumber ||
          ''
        ).trim();
        
        result = await vendorService.buyCableTV(
          {
            decoderNumber: decoderNumber,
            packageCode: packageCode,           // ✅ from metadata.packageCode
            provider: transaction.product || "DSTV",
            amount: amount,
            phone: user.phone,
          },
          user.id
        );
        break;
      }

      // ============================================================
      // EDUCATION
      // ============================================================
      case "EDUCATION": {
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
      }

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
// MAIN API ROUTE (unchanged flow — only uses processServicePurchase)
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

    let transaction = await prisma.vtuTransaction.findFirst({
      where: {
        status: "PENDING",
        metadata: {
          path: "$.validationToken",
          equals: token,
        },
      },
    });

    if (!transaction) {
      const pendingTransactions = await prisma.vtuTransaction.findMany({
        where: { status: "PENDING" },
        take: 50,
      });
      
      const found = pendingTransactions.find((tx: any) => {
        return tx.metadata?.validationToken === token;
      });
      
      if (found) {
        transaction = found;
      }
    }

    if (!transaction) {
      return NextResponse.json({
        success: false,
        error: "Invalid or expired validation link",
      }, { status: 404 });
    }

    console.log(`✅ [Confirm Purchase] Found transaction: ${transaction.id}`);
    console.log(`📋 [Confirm Purchase] Type: ${transaction.transactionType}`);

    const validationExpiry = transaction.metadata?.validationExpiry;
    if (validationExpiry && new Date(validationExpiry) < new Date()) {
      return NextResponse.json({
        success: false,
        error: "Validation link has expired",
      }, { status: 410 });
    }

    if (transaction.metadata?.processed === true) {
      return NextResponse.json({
        success: false,
        error: "This transaction has already been processed",
      }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: transaction.userId },
      include: { wallet: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (!user.pinHash) {
      return NextResponse.json({
        success: false,
        error: "Transaction PIN not set. Please set your PIN first.",
      }, { status: 400 });
    }

    const isValidPin = await compare(pin, user.pinHash);
    if (!isValidPin) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { pinAttempts: { increment: 1 } },
      });

      const attempts = updatedUser.pinAttempts;
      if (attempts >= 5) {
        await prisma.user.update({
          where: { id: user.id },
          data: { pinLockedUntil: new Date(Date.now() + 15 * 60 * 1000) },
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

    await prisma.user.update({
      where: { id: user.id },
      data: { pinAttempts: 0, pinLockedUntil: null },
    });

    const wallet = user.wallet;
    if (!wallet) {
      return NextResponse.json({ success: false, error: "Wallet not found" }, { status: 404 });
    }

    const amount = Number(transaction.amount);
    const currentBalance = Number(wallet.walletBalance);
    
    if (currentBalance < amount) {
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

      try {
        await sendWhatsAppMessage(
          user.phone,
          `❌ ${transaction.transactionType} Purchase Failed!\n\nAmount: NGN ${amount.toFixed(2)}\nError: Insufficient balance. You have NGN ${currentBalance.toFixed(2)}.\n\nPlease fund your wallet and try again.`
        );
      } catch (e) {
        console.error("❌ [WhatsApp] Failed to send failure message:", e);
      }

      return NextResponse.json({
        success: false,
        error: `Insufficient balance. You have NGN ${currentBalance.toFixed(2)}.`,
      }, { status: 400 });
    }

    const purchaseResult = await processServicePurchase(transaction, user, pin);

    if (!purchaseResult.success) {
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

      try {
        await sendWhatsAppMessage(
          user.phone,
          `❌ ${transaction.transactionType} Purchase Failed!\n\nAmount: NGN ${amount.toFixed(2)}\nError: ${purchaseResult.error || "Purchase failed"}\n\nPlease try again or contact support.`
        );
      } catch (e) {
        console.error("❌ [WhatsApp] Failed to send failure message:", e);
      }

      return NextResponse.json({
        success: false,
        error: purchaseResult.error || "Purchase failed",
      }, { status: 500 });
    }

    const vendorData = purchaseResult.data;

    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { walletBalance: { decrement: amount } },
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

    const serviceData: any = {
      transactionType: transaction.transactionType,
      amount: transaction.amount,
      transactionId: transaction.id,
      phoneNumber: transaction.phoneNumber || user.phone,
      network: transaction.metadata?.network,           // ← enum, not product
      networkPlan: transaction.networkPlan,
      meterNumber: transaction.meterNumber,
      disco: transaction.metadata?.discoCode || transaction.product,
      provider: transaction.product,
      packageName: transaction.metadata?.packageName,
      decoderNumber: transaction.metadata?.decoderNumber || transaction.metadata?.smartCardNumber,
      token: vendorData.token || vendorData.purchased_code || null,
      tokens: vendorData.tokens || [],
      cards: vendorData.cards || [],
      vendorReference: vendorData.vendorReference,
      quantity: transaction.bulkQuantity || 1,
      product: transaction.product,
      metadata: transaction.metadata,
    };

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
    
    try {
      const body = await request.json().catch(() => null);
      const token = body?.token;
      if (token) {
        const tx = await prisma.vtuTransaction.findFirst({
          where: {
            metadata: { path: "$.validationToken", equals: token },
          },
          include: { user: true },
        });
        
        if (tx?.user?.phone) {
          await sendWhatsAppMessage(
            tx.user.phone,
            `❌ Purchase Failed!\n\nError: ${error.message || "Unknown error"}\n\nPlease try again or contact support.`
          );
        }
      }
    } catch (e) {
      console.error("❌ Failed to send error WhatsApp:", e);
    }

    return NextResponse.json({
      success: false,
      error: error.message || "Failed to confirm purchase",
    }, { status: 500 });
  }
}