// app/api/vendors/data/purchase/route.ts - COMPLETE FIXED WITH PROPER PLAN MAPPING

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { CacheService } from "~/lib/cache/cache.service";
import { TransactionStatus, VtuType, CustomerType, NetworkProvider, VtuVendor, RefundStatus, ChannelType } from "@prisma/client";
import { compare } from "bcrypt";

// ============================================================
// MINIMAL LOGGING
// ============================================================

const isDev = process.env.NODE_ENV === 'development';
const isDebug = process.env.DEBUG === 'true';

function log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  if (level === 'error') {
    console.error(`❌ ${message}`, data || '');
    return;
  }
  if (level === 'warn') {
    console.warn(`⚠️ ${message}`, data || '');
    return;
  }
  if (!isDev && !isDebug) return;
  console.log(`✅ ${message}`, data || '');
}

// ============================================================
// NETWORK MAPPING
// ============================================================

const networkMap: Record<string, NetworkProvider> = {
  'MTN': NetworkProvider.MTN,
  'mtn': NetworkProvider.MTN,
  'GLO': NetworkProvider.GLO,
  'glo': NetworkProvider.GLO,
  'AIRTEL': NetworkProvider.AIRTEL,
  'airtel': NetworkProvider.AIRTEL,
  '9MOBILE': NetworkProvider.NINEMOBILE,
  '9mobile': NetworkProvider.NINEMOBILE,
  'NINEMOBILE': NetworkProvider.NINEMOBILE,
  'ninemobile': NetworkProvider.NINEMOBILE,
  'ETISALAT': NetworkProvider.NINEMOBILE,
  'etisalat': NetworkProvider.NINEMOBILE,
};

function mapNetwork(networkInput: string): NetworkProvider {
  const normalized = networkInput?.trim() || '';
  const mapped = networkMap[normalized];
  if (!mapped) {
    log('warn', `Unknown network: "${networkInput}", defaulting to MTN`);
    return NetworkProvider.MTN;
  }
  return mapped;
}

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.substring(3);
  }
  if (cleaned.length < 10) {
    cleaned = cleaned.padStart(10, '0');
  }
  if (cleaned.length > 11) {
    cleaned = cleaned.substring(0, 11);
  }
  return cleaned;
}

function mapVendorToEnum(vendorCode: string | undefined): VtuVendor | null {
  if (!vendorCode) return null;
  
  const normalized = vendorCode.toUpperCase();
  const vendorMap: Record<string, VtuVendor> = {
    'VTPASS': VtuVendor.VTPASS,
    'GIDIGITAL': VtuVendor.GIDIGITAL,
    'MONIEPOINT': VtuVendor.MONIEPOINT,
    'FLUTTERWAVE_VTU': VtuVendor.FLUTTERWAVE_VTU,
    'QUICKTELLER': VtuVendor.QUICKTELLER,
    'BILAL_SADA': VtuVendor.BILAL_SADA,
    'LEGITDATAWAY': VtuVendor.VTPASS,
    'BILALSADA': VtuVendor.BILAL_SADA,
  };
  
  return vendorMap[normalized] || null;
}

// ============================================================
// HELPER: Get data amount from plan
// ============================================================

async function getDataAmountFromPlan(planId: string | undefined, planCode: string, provider: string): Promise<{ amountMB: number; display: string; dataPlan: any }> {
  let amountMB = 0;
  let display = planCode || 'Unknown';
  let dataPlan = null;

  // ✅ If planId is provided, get the full plan from database
  if (planId) {
    try {
      // ✅ Only select fields that exist in the model
      dataPlan = await prisma.dataPlan.findUnique({
        where: { id: planId },
        select: {
          id: true,
          name: true,
          network: true,
          planType: true,
          amountMB: true,
          ourPrice: true,
          vendorPrice: true,
          validity: true,
          validityUnit: true,
          vendorPlanId: true,
          vendorNetworkCode: true,
          vendorPlanType: true,
          vendorMetadata: true,
          vendorId: true,
          isActive: true,
          status: true,
          description: true,
        },
      });
      
      if (dataPlan) {
        amountMB = dataPlan.amountMB || 0;
        display = `${dataPlan.amountMB || 0}MB`;
        log('info', `📊 Found data plan: ${dataPlan.name} (${amountMB}MB)`, { vendorPlanId: dataPlan.vendorPlanId });
        return { amountMB, display, dataPlan };
      }
    } catch (error) {
      log('warn', 'Failed to fetch data plan from database', error);
    }
  }

  // Try to extract from planCode
  if (planCode) {
    const match = planCode.match(/(\d+(?:\.\d+)?)\s*(MB|GB|gb|mb)/i);
    if (match) {
      const num = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      amountMB = unit === 'GB' ? num * 1024 : num;
      display = `${num}${unit}`;
      return { amountMB, display, dataPlan };
    }
  }

  // Estimate from amount
  const amt = Number(amount) || 0;
  if (amt <= 50) { amountMB = 25; display = '25MB'; }
  else if (amt <= 100) { amountMB = 50; display = '50MB'; }
  else if (amt <= 200) { amountMB = 100; display = '100MB'; }
  else if (amt <= 300) { amountMB = 200; display = '200MB'; }
  else if (amt <= 500) { amountMB = 350; display = '350MB'; }
  else if (amt <= 1000) { amountMB = 750; display = '750MB'; }
  else if (amt <= 1500) { amountMB = 1024; display = '1GB'; }
  else if (amt <= 2000) { amountMB = 2048; display = '2GB'; }
  else if (amt <= 3000) { amountMB = 3072; display = '3GB'; }
  else if (amt <= 5000) { amountMB = 5120; display = '5GB'; }
  else if (amt <= 10000) { amountMB = 10240; display = '10GB'; }
  else { amountMB = Math.floor(amt / 2); display = `${amountMB}MB`; }
  
  log('info', `📊 Data amount estimated: ${display} (${amountMB}MB)`);
  return { amountMB, display, dataPlan };
}

// ============================================================
// REFUND HELPER - FULL IMPLEMENTATION
// ============================================================

async function processRefund(
  transaction: any,
  user: any,
  amount: number,
  reason: string,
  reasonCode: string = "VENDOR_FAILURE",
  initiatedBy: string = "SYSTEM"
) {
  const existingRefund = await prisma.refund.findFirst({
    where: { 
      transactionId: transaction.id,
      status: { not: 'CANCELLED' }
    }
  });

  if (existingRefund) return existingRefund;

  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });

  if (!wallet) throw new Error("Wallet not found");

  const refundReference = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const refund = await prisma.refund.create({
    data: {
      refundReference,
      transactionId: transaction.id,
      userId: user.id,
      amount: amount,
      fee: 0,
      totalRefunded: amount,
      status: RefundStatus.PROCESSING,
      type: "AUTOMATIC",
      reason: reason,
      reasonCode: reasonCode,
      initiatedBy: initiatedBy,
      walletId: wallet.id,
      initiatedAt: new Date(),
      metadata: {
        originalTransaction: {
          id: transaction.id,
          amount: transaction.amount,
          product: transaction.product,
          createdAt: transaction.createdAt,
        },
      },
    },
  });

  await prisma.refundAuditLog.create({
    data: {
      refundId: refund.id,
      action: 'CREATED',
      performedBy: initiatedBy,
      notes: `Refund initiated for transaction ${transaction.id}`,
    },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          walletBalance: {
            increment: amount,
          },
        },
      });

      const wt = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: user.id,
          type: "CREDIT",
          amount: amount,
          balanceBefore: wallet.walletBalance,
          balanceAfter: wallet.walletBalance + amount,
          reference: refundReference,
          description: `Refund for failed data purchase: ${reason}`,
          status: TransactionStatus.SUCCESS,
          category: "REFUND",
          metadata: {
            refundId: refund.id,
            transactionId: transaction.id,
            refundType: "AUTOMATIC",
          },
        },
      });

      await tx.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          totalRefunded: amount,
          refundStatus: RefundStatus.COMPLETED,
          refundId: refund.id,
          metadata: {
            ...transaction.metadata,
            refund: {
              id: refund.id,
              processedAt: new Date().toISOString(),
              amount: amount,
              reason: reason,
              reasonCode: reasonCode,
            },
          },
        },
      });

      await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.COMPLETED,
          walletTransactionId: wt.id,
          processedBy: initiatedBy,
          processedAt: new Date(),
          completedAt: new Date(),
        },
      });

      await tx.refundAuditLog.create({
        data: {
          refundId: refund.id,
          action: 'COMPLETED',
          performedBy: initiatedBy,
          notes: `Refund completed - amount: ${amount}`,
        },
      });
    });

    await prisma.refundNotification.create({
      data: {
        refundId: refund.id,
        userId: user.id,
        type: "COMPLETED",
        channel: "MOBILE_PUSH",
        message: `Your refund of ₦${amount} for data purchase has been processed.`,
        metadata: {
          refundId: refund.id,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return refund;

  } catch (error: any) {
    log('error', `Refund failed: ${error.message}`);

    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: RefundStatus.FAILED,
        metadata: {
          ...refund.metadata,
          error: error.message,
        },
      },
    });

    throw error;
  }
}

// ============================================================
// MAIN API ROUTE
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    
    const body = await request.json();
    let { phoneNumber, planCode, provider, amount, pin, planId, variationCode, vendor } = body;

    // Validate request
    if (!phoneNumber || phoneNumber.length < 10) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid phone number",
      }, { status: 400 });
    }

    phoneNumber = normalizePhoneNumber(phoneNumber);

    if (!planCode) {
      return NextResponse.json({
        success: false,
        error: "Please select a data plan",
      }, { status: 400 });
    }

    if (!amount || amount < 50) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid amount (minimum ₦50)",
      }, { status: 400 });
    }

    if (!provider) {
      return NextResponse.json({
        success: false,
        error: "Please select a provider",
      }, { status: 400 });
    }

    const networkEnum = mapNetwork(provider);

    if (!pin || pin.length < 4) {
      return NextResponse.json({
        success: false,
        error: "Please enter your 4-6 digit transaction PIN",
      }, { status: 400 });
    }

    // ============================================================
    // STATIC CHANNEL - Always WEB_APP for web routes
    // ============================================================
    const CHANNEL_DISPLAY = "WEB_APP";

    // ============================================================
    // GET DATA AMOUNT FROM PLAN (with vendorPlanId)
    // ============================================================
    
    const { amountMB: dataAmountMB, display: dataDisplay, dataPlan } = await getDataAmountFromPlan(planId, planCode, provider);
    
    log('info', `📊 Data amount: ${dataDisplay} (${dataAmountMB}MB)`);
    
    // ✅ For BilalSada, we need the vendorPlanId from the data plan
    let finalPlanCode = planCode;
    let isBilalSada = vendor === 'BILAL_SADA' || vendor === 'BILALSADA';
    
    // ✅ If vendor is not specified, try to detect from plan
    if (!vendor && dataPlan && dataPlan.vendorId) {
      const vendorRecord = await prisma.vendor.findUnique({
        where: { id: dataPlan.vendorId },
        select: { code: true },
      });
      if (vendorRecord) {
        vendor = vendorRecord.code;
        isBilalSada = vendor === 'BILAL_SADA' || vendor === 'BILALSADA';
        log('info', `📊 Detected vendor from plan: ${vendor}`);
      }
    }
    
    // ✅ If BilalSada, use vendorPlanId from database
    if (isBilalSada || vendor === 'BILAL_SADA' || vendor === 'BILALSADA') {
      if (dataPlan && dataPlan.vendorPlanId) {
        finalPlanCode = dataPlan.vendorPlanId;
        log('info', `📊 BilalSada using vendorPlanId: ${finalPlanCode} (from ${planCode})`);
      } else {
        log('warn', `⚠️ BilalSada plan missing vendorPlanId, using: ${planCode}`);
      }
    }
    
    // ✅ If VTpass, use variationCode if provided
    if (vendor === 'VTPASS' || vendor === 'VT_PASS') {
      if (variationCode) {
        finalPlanCode = variationCode;
        log('info', `📊 VTpass using variationCode: ${finalPlanCode}`);
      } else if (dataPlan && dataPlan.vendorPlanId) {
        finalPlanCode = dataPlan.vendorPlanId;
        log('info', `📊 VTpass using vendorPlanId: ${finalPlanCode}`);
      }
    }

    // ============================================================
    // PARALLEL FETCH user + customer + balance
    // ============================================================
    const userId = sessionUser.id;

    const [cachedUser, cachedCustomer, cachedBalance] = await Promise.all([
      CacheService.getUser(userId).catch(() => null),
      CacheService.getCustomer(userId, phoneNumber).catch(() => null),
      CacheService.getBalance(userId).catch(() => null),
    ]);

    let user = cachedUser;
    let customer = cachedCustomer;
    let walletBalance = cachedBalance?.balance;

    if (!user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          pinHash: true,
          pinAttempts: true,
          pinLockedUntil: true,
          hasWallet: true,
          wallet: {
            select: {
              id: true,
              walletBalance: true,
            },
          },
        },
      });

      if (!dbUser) {
        return NextResponse.json({
          success: false,
          error: "User not found",
        }, { status: 404 });
      }

      user = {
        id: dbUser.id,
        pinHash: dbUser.pinHash,
        pinAttempts: dbUser.pinAttempts,
        pinLockedUntil: dbUser.pinLockedUntil,
        hasWallet: dbUser.hasWallet,
        wallet: dbUser.wallet || null,
      };

      CacheService.setUser(userId, user).catch(() => {});
    }

    if (!customer) {
      customer = await prisma.customer.findUnique({
        where: {
          userId_phone: {
            userId: user.id,
            phone: phoneNumber,
          },
        },
      });

      if (!customer) {
        customer = await CacheService.createCustomer({
          userId: user.id,
          phone: phoneNumber,
          fullName: null,
          email: null,
          customerType: CustomerType.REGULAR,
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        });
      } else {
        CacheService.setCustomer(user.id, phoneNumber, customer).catch(() => {});
      }
    }

    if (walletBalance === undefined || walletBalance === null) {
      const wallet = user.wallet;
      walletBalance = wallet ? Number(wallet.walletBalance) : 0;
    }

    if (!user.wallet) {
      return NextResponse.json({
        success: false,
        error: "Wallet not found",
      }, { status: 404 });
    }

    // ============================================================
    // CHECK IF PLAN EXISTS IN DATABASE (for BilalSada)
    // ============================================================
    
    let dataPlanId: string | undefined = undefined;
    
    if (planId) {
      const existingPlan = await prisma.dataPlan.findUnique({
        where: { id: planId },
        select: { id: true },
      });
      if (existingPlan) {
        dataPlanId = existingPlan.id;
      } else {
        log('warn', `DataPlan with id ${planId} not found in database - likely VTpass plan`);
      }
    }

    // ============================================================
    // CREATE TRANSACTION RECORD - WITH DATA AMOUNT
    // ============================================================
    
    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.DATA,
        product: `${provider} - ${planCode}`,
        amount: amount,
        totalDebited: 0,
        phoneNumber: phoneNumber,
        network: networkEnum,
        networkPlan: finalPlanCode,
        status: TransactionStatus.PENDING,
        channel: ChannelType.WEB_APP,
        channelDisplay: CHANNEL_DISPLAY,
        dataPlanId: dataPlanId || dataPlan?.id || null,
        dataAmountMB: dataAmountMB,
        dataDisplay: dataDisplay,
        metadata: {
          source: "DataAPI",
          timestamp: new Date().toISOString(),
          provider: provider,
          planCode: planCode,
          finalPlanCode: finalPlanCode,
          customerId: customer.id,
          pinVerified: false,
          channel: "WEB_APP",
          channelDisplay: CHANNEL_DISPLAY,
          vendor: vendor || 'UNKNOWN',
          variationCode: variationCode || planCode,
          isVTpass: vendor === 'VTPASS' || vendor === 'VT_PASS',
          isBilalSada: isBilalSada,
          dataAmountMB: dataAmountMB,
          dataDisplay: dataDisplay,
          vendorPlanId: dataPlan?.vendorPlanId || null,
          vendorNetworkCode: dataPlan?.vendorNetworkCode || null,
          vendorPlanType: dataPlan?.vendorPlanType || null,
        },
      },
    });

    log('info', `📊 Transaction created with data amount: ${dataDisplay} (${dataAmountMB}MB)`);

    // ============================================================
    // PIN VERIFICATION
    // ============================================================

    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
      
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          totalDebited: 0,
          metadata: {
            ...transaction.metadata,
            pinVerified: false,
            failureReason: "ACCOUNT_LOCKED",
            error: `Account locked. Try again in ${remainingMinutes} minutes.`,
            failedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: false,
        error: `Account locked. Please try again in ${remainingMinutes} minute(s).`,
        transactionId: transaction.id,
      }, { status: 403 });
    }

    if (!user.pinHash) {
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          totalDebited: 0,
          metadata: {
            ...transaction.metadata,
            pinVerified: false,
            failureReason: "NO_PIN_SET",
            error: "Transaction PIN not set",
            failedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: false,
        error: "You don't have a transaction PIN set. Please set one in your profile.",
        transactionId: transaction.id,
      }, { status: 400 });
    }

    const isValidPin = await compare(pin, user.pinHash);
    if (!isValidPin) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          pinAttempts: {
            increment: 1,
          },
        },
        select: { pinAttempts: true },
      });

      const attemptsLeft = 5 - (updatedUser.pinAttempts || 0);
      
      let errorMessage = `Invalid PIN. ${attemptsLeft} attempt(s) remaining.`;
      let statusCode = 401;
      
      if (attemptsLeft <= 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            pinLockedUntil: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
        errorMessage = "Too many failed PIN attempts. Account locked for 15 minutes.";
        statusCode = 403;
      }

      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          totalDebited: 0,
          metadata: {
            ...transaction.metadata,
            pinVerified: false,
            failureReason: "INVALID_PIN",
            pinAttempts: updatedUser.pinAttempts,
            attemptsLeft: attemptsLeft,
            error: errorMessage,
            failedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: false,
        error: errorMessage,
        transactionId: transaction.id,
        attemptsLeft: attemptsLeft,
      }, { status: statusCode });
    }

    // PIN verified
    await prisma.vtuTransaction.update({
      where: { id: transaction.id },
      data: {
        metadata: {
          ...transaction.metadata,
          pinVerified: true,
          pinVerifiedAt: new Date().toISOString(),
        },
      },
    });

    // Reset PIN attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    // ============================================================
    // Check balance
    // ============================================================

    if (walletBalance < amount) {
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          totalDebited: 0,
          metadata: {
            ...transaction.metadata,
            pinVerified: true,
            failureReason: "INSUFFICIENT_BALANCE",
            walletBalance: walletBalance,
            requiredAmount: amount,
            error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}`,
            failedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}`,
        transactionId: transaction.id,
      }, { status: 400 });
    }

    // ============================================================
    // VENDOR PURCHASE - WITH CORRECT PLAN CODE
    // ============================================================

    let vendorId: string | null = null;
    let vendorEnum: VtuVendor | null = null;

    try {
      const vendorService = getVendorService();

      // ✅ Build request with the correct plan code
      const requestData: any = {
        phoneNumber: phoneNumber,
        planCode: finalPlanCode,
        network: provider,
        amount: amount,
        vendor: vendor || 'BILAL_SADA',
      };

      // ✅ Add additional data for vendors
      if (dataPlan) {
        requestData.dataPlan = {
          id: dataPlan.id,
          name: dataPlan.name,
          network: dataPlan.network,
          amountMB: dataPlan.amountMB,
          vendorPlanId: dataPlan.vendorPlanId,
          vendorNetworkCode: dataPlan.vendorNetworkCode,
          vendorPlanType: dataPlan.vendorPlanType,
          vendorMetadata: dataPlan.vendorMetadata,
        };
      }

      if (vendor === 'VTPASS' || vendor === 'VT_PASS') {
        requestData.variationCode = variationCode || finalPlanCode;
        requestData.serviceId = dataPlan?.vendorNetworkCode || 'mtn-data';
        log('info', 'Using VTpass vendor for data purchase', { 
          variationCode: requestData.variationCode,
          serviceId: requestData.serviceId 
        });
      }

      if (isBilalSada || vendor === 'BILAL_SADA' || vendor === 'BILALSADA') {
        requestData.vendor = 'BILAL_SADA';
        log('info', 'Using BilalSada vendor for data purchase', { 
          planCode: finalPlanCode,
          vendorPlanId: dataPlan?.vendorPlanId 
        });
      }

      log('info', `📊 Calling vendor service with planCode: ${finalPlanCode}`);

      const result = await vendorService.buyData(requestData, user.id);

      vendorEnum = mapVendorToEnum(result.vendor) || VtuVendor.VTPASS;

      if (result.vendor) {
        const vendorRecord = await prisma.vendor.findFirst({
          where: { code: result.vendor as string },
          select: { id: true },
        });
        if (vendorRecord) {
          vendorId = vendorRecord.id;
        }
      }

      if (result.success) {
        // Update customer stats
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            totalTransactions: { increment: 1 },
            totalSpent: { increment: amount },
            lastTransactionAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Complete transaction
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: user.wallet!.id },
            data: {
              walletBalance: {
                decrement: amount,
              },
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: user.wallet!.id,
              userId: user.id,
              type: "DEBIT",
              amount: amount,
              balanceBefore: walletBalance,
              balanceAfter: walletBalance - amount,
              reference: `VTU_${transaction.id}`,
              description: `Data purchase for ${phoneNumber} (${provider} - ${dataPlan?.name || planCode})`,
              status: TransactionStatus.SUCCESS,
              category: "DATA",
            },
          }),
          prisma.vtuTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.SUCCESS,
              totalDebited: amount,
              vendorReference: result.vendorReference,
              vendorId: vendorId || undefined,
              vendor: vendorEnum,
              token: result.data?.token,
              deliveredAt: new Date(),
              dataAmountMB: dataAmountMB,
              dataDisplay: dataDisplay,
              metadata: {
                ...transaction.metadata,
                vendorName: result.vendor,
                vendorReference: result.vendorReference,
                vendorSwitched: result.vendorSwitched,
                switchedFrom: result.switchedFrom,
                success: true,
                pinVerified: true,
                completedAt: new Date().toISOString(),
                wasDebited: true,
                dataAmountMB: dataAmountMB,
                dataDisplay: dataDisplay,
                finalPlanCode: finalPlanCode,
                vendorPlanIdUsed: dataPlan?.vendorPlanId || null,
              },
            },
          }),
          prisma.customerTransaction.create({
            data: {
              customerId: customer.id,
              userId: user.id,
              vtuTransactionId: transaction.id,
              transactionType: VtuType.DATA,
              amount: amount,
              totalAmount: amount,
              product: `${provider} - ${dataPlan?.name || planCode}`,
              phoneNumber: phoneNumber,
              network: networkEnum,
              planName: dataPlan?.name || planCode,
              status: TransactionStatus.SUCCESS,
              metadata: {
                vendorName: result.vendor || 'unknown',
                vendorReference: result.vendorReference || '',
                vendorSwitched: result.vendorSwitched || false,
                switchedFrom: result.switchedFrom || [],
                pinVerified: true,
                completedAt: new Date().toISOString(),
                dataAmountMB: dataAmountMB,
                dataDisplay: dataDisplay,
                finalPlanCode: finalPlanCode,
              },
            },
          }),
        ]);

        // Invalidate cache
        await Promise.all([
          CacheService.invalidateWallet(user.id),
          CacheService.invalidateUser(user.id),
          CacheService.invalidateCustomer(user.id, phoneNumber),
        ]);

        const totalTime = Date.now() - startTime;
        log('info', `✅ Data transaction ${transaction.id} completed in ${totalTime}ms`);

        return NextResponse.json({
          success: true,
          data: {
            transactionId: transaction.id,
            reference: transaction.id,
            vendorReference: result.vendorReference,
            amount: amount,
            provider: provider,
            planCode: planCode,
            finalPlanCode: finalPlanCode,
            phoneNumber: phoneNumber,
            customerId: customer.id,
            isNewCustomer: customer.totalTransactions === 0,
            customerName: customer.fullName,
            vendor: result.vendor,
            vendorSwitched: result.vendorSwitched,
            switchedFrom: result.switchedFrom,
            totalTime: totalTime,
            channel: CHANNEL_DISPLAY,
            dataAmountMB: dataAmountMB,
            dataDisplay: dataDisplay,
            ...result.data,
          },
        });
      } else {
        // Vendor failed - process refund
        let refundResult = null;
        if (amount > 0) {
          try {
            refundResult = await processRefund(
              transaction,
              user,
              amount,
              result.error || "Vendor transaction failed",
              "VENDOR_FAILURE",
              "SYSTEM"
            );
          } catch (refundError: any) {
            log('error', 'Refund failed', refundError.message);
          }
        }

        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            totalDebited: 0,
            vendor: vendorEnum,
            vendorReference: result.vendorReference || null,
            selectedVendorId: vendorId,
            failedVendors: result.vendorErrors || [],
            metadata: {
              ...transaction.metadata,
              error: result.error || "Vendor transaction failed",
              vendor: result.vendor,
              vendorErrors: result.vendorErrors || [],
              vendorSwitched: result.vendorSwitched || false,
              switchedFrom: result.switchedFrom || [],
              failedAt: new Date().toISOString(),
              wasDebited: false,
              finalPlanCode: finalPlanCode,
              refundId: refundResult?.id || null,
              refundProcessed: !!refundResult,
            },
          },
        });

        await prisma.customerTransaction.create({
          data: {
            customerId: customer.id,
            userId: user.id,
            vtuTransactionId: transaction.id,
            transactionType: VtuType.DATA,
            amount: amount,
            totalAmount: amount,
            product: `${provider} - ${dataPlan?.name || planCode}`,
            phoneNumber: phoneNumber,
            network: networkEnum,
            planName: dataPlan?.name || planCode,
            status: TransactionStatus.FAILED,
            notes: `Vendor failure: ${result.error || "Unknown error"}`,
            metadata: {
              vendorName: result.vendor || 'unknown',
              vendorReference: result.vendorReference || '',
              failureReason: result.error,
              vendorErrors: result.vendorErrors || [],
              failedAt: new Date().toISOString(),
              finalPlanCode: finalPlanCode,
              refundId: refundResult?.id || null,
            },
          },
        });

        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            totalTransactions: { increment: 1 },
            lastTransactionAt: new Date(),
          },
        });

        return NextResponse.json({
          success: false,
          error: result.error || "Vendor transaction failed",
          transactionId: transaction.id,
          refundId: refundResult?.id || null,
          refundProcessed: !!refundResult,
        }, { status: 500 });
      }
    } catch (error: any) {
      // Unexpected error - process refund
      let refundResult = null;
      if (amount > 0) {
        try {
          refundResult = await processRefund(
            transaction,
            user,
            amount,
            error.message || "System error occurred",
            "SYSTEM_ERROR",
            "SYSTEM"
          );
        } catch (refundError: any) {
          log('error', 'Refund failed', refundError.message);
        }
      }

      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          totalDebited: 0,
          vendor: vendorEnum || VtuVendor.VTPASS,
          selectedVendorId: vendorId,
          metadata: {
            ...transaction.metadata,
            error: error.message || "Unknown error",
            failedAt: new Date().toISOString(),
            pinVerified: true,
            errorType: error.name || 'UnknownError',
            wasDebited: false,
            finalPlanCode: finalPlanCode,
            refundId: refundResult?.id || null,
            refundProcessed: !!refundResult,
          },
        },
      });

      await prisma.customerTransaction.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          vtuTransactionId: transaction.id,
          transactionType: VtuType.DATA,
          amount: amount,
          totalAmount: amount,
          product: `${provider} - ${dataPlan?.name || planCode}`,
          phoneNumber: phoneNumber,
          network: networkEnum,
          planName: dataPlan?.name || planCode,
          status: TransactionStatus.FAILED,
          notes: `System Error: ${error.message || 'Unknown error'}`,
          metadata: {
            pinVerified: true,
            failureReason: error.message,
            errorType: error.name,
            failedAt: new Date().toISOString(),
            finalPlanCode: finalPlanCode,
            refundId: refundResult?.id || null,
          },
        },
      });

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalTransactions: { increment: 1 },
          lastTransactionAt: new Date(),
        },
      });

      log('error', 'Data purchase failed', error.message);

      return NextResponse.json({
        success: false,
        error: error.message || "Purchase failed. Please try again.",
        transactionId: transaction.id,
        refundId: refundResult?.id || null,
        refundProcessed: !!refundResult,
      }, { status: 500 });
    }
  } catch (error: any) {
    log('error', 'Top-level error', error.message);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred",
    }, { status: 500 });
  }
}