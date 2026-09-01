// src/app/api/mobile/vendors/data/purchase/route.ts
// UPDATED: channelDisplay = "MOBILE_APP" - Matches web version structure

import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { CacheService } from "~/lib/cache/cache.service";
import { TransactionStatus, VtuType, CustomerType, NetworkProvider, VtuVendor, RefundStatus, ChannelType } from "@prisma/client";
import { compare } from "bcrypt";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

// ============================================================
// LOGGING UTILITY
// ============================================================

const isDev = process.env.NODE_ENV === 'development';
const isDebug = process.env.DEBUG === 'true';

function log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
  if (level === 'error') {
    console.error(`❌ ${message}`, data || '');
    return;
  }
  if (level === 'warn') {
    console.warn(`⚠️ ${message}`, data || '');
    return;
  }
  if (level === 'debug' && !isDebug) return;
  if (!isDev && level === 'info') return;
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

async function authenticateMobile(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// ============================================================
// REFUND HELPER FUNCTIONS
// ============================================================

async function processRefund(
  transaction: any,
  user: any,
  amount: number,
  reason: string,
  reasonCode: string = "VENDOR_FAILURE",
  initiatedBy: string = "SYSTEM"
) {
  log('debug', `Processing refund for transaction ${transaction.id}`);

  const existingRefund = await prisma.refund.findFirst({
    where: { 
      transactionId: transaction.id,
      status: { not: 'CANCELLED' }
    }
  });

  if (existingRefund) {
    log('debug', `Refund already exists for transaction ${transaction.id}`);
    return existingRefund;
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

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

    log('debug', `Refund ${refund.id} completed`);

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

    await prisma.refundAuditLog.create({
      data: {
        refundId: refund.id,
        action: 'FAILED',
        performedBy: 'SYSTEM',
        notes: `Refund failed: ${error.message}`,
      },
    });

    throw error;
  }
}

// ============================================================
// MAIN API ROUTE - OPTIMIZED
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate mobile user
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    const body = await request.json();
    let { phoneNumber, planCode, provider, amount, pin, planId } = body;

    // 2. Validate request
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
    // STATIC CHANNEL CONFIGURATION
    // ============================================================
    const CHANNEL_ENUM = ChannelType.MOBILE_APP;
    const CHANNEL_DISPLAY = "MOBILE_APP";

    // ============================================================
    // OPTIMIZATION: PARALLEL FETCH user + customer + balance
    // ============================================================

    const [cachedUser, cachedCustomer, cachedBalance] = await Promise.all([
      CacheService.getUser(userId).catch(() => null),
      CacheService.getCustomer(userId, phoneNumber).catch(() => null),
      CacheService.getBalance(userId).catch(() => null),
    ]);

    let user = cachedUser;
    let customer = cachedCustomer;
    let walletBalance = cachedBalance?.balance;

    // If user not in cache, fetch from DB with selective fields
    if (!user) {
      log('debug', `Cache miss for user ${userId}, fetching from DB`);
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          pinHash: true,
          pinAttempts: true,
          pinLockedUntil: true,
          hasWallet: true,
          fullName: true,
          phone: true,
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
        fullName: dbUser.fullName,
        phone: dbUser.phone,
        wallet: dbUser.wallet || null,
      };

      CacheService.setUser(userId, user).catch(() => {});
    }

    // If customer not in cache, fetch from DB
    if (!customer) {
      log('debug', `Cache miss for customer ${phoneNumber}, fetching from DB`);
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

    // If balance not in cache, get from wallet
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
    // CREATE TRANSACTION RECORD USING RAW SQL (ensures channelDisplay is inserted)
    // ============================================================

    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Use raw SQL to insert the transaction with channelDisplay
    await prisma.$executeRaw`
      INSERT INTO vtu_transactions (
        id, userId, transactionType, product, amount, totalDebited, 
        phoneNumber, network, networkPlan, status, channel, channelDisplay, 
        dataPlanId, metadata, createdAt, updatedAt
      ) VALUES (
        ${transactionId}, ${user.id}, ${VtuType.DATA}, ${provider + ' - ' + planCode}, 
        ${amount}, 0, ${phoneNumber}, ${networkEnum}, ${planCode}, ${TransactionStatus.PENDING}, 
        ${CHANNEL_ENUM}, ${CHANNEL_DISPLAY}, 
        ${planId || null},
        ${JSON.stringify({
          source: "MobileDataAPI",
          service: "DATA",
          timestamp: new Date().toISOString(),
          provider: provider,
          planCode: planCode,
          planId: planId,
          customerId: customer.id,
          pinVerified: false,
          attemptStage: "INITIALIZED",
          wasDebited: false,
          refundProcessed: false,
          channel: "MOBILE_APP",
          channelDisplay: CHANNEL_DISPLAY,
        })}, 
        ${new Date()}, ${new Date()}
      )
    `;

    // Fetch the created transaction
    const transaction = await prisma.vtuTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error("Failed to create transaction");
    }

    // ============================================================
    // PIN VERIFICATION
    // ============================================================

    // Check PIN lock
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
            wasDebited: false,
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
          product: `${provider} - ${planCode}`,
          phoneNumber: phoneNumber,
          network: networkEnum,
          planName: planCode,
          status: TransactionStatus.FAILED,
          notes: `Account locked: ${remainingMinutes} minutes remaining`,
          metadata: {
            failureReason: "ACCOUNT_LOCKED",
            pinVerified: false,
            remainingMinutes: remainingMinutes,
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

    // Check if PIN is set
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
            wasDebited: false,
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
          product: `${provider} - ${planCode}`,
          phoneNumber: phoneNumber,
          network: networkEnum,
          planName: planCode,
          status: TransactionStatus.FAILED,
          notes: "No transaction PIN set",
          metadata: {
            failureReason: "NO_PIN_SET",
            pinVerified: false,
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

    // Verify PIN
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
            wasDebited: false,
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
          product: `${provider} - ${planCode}`,
          phoneNumber: phoneNumber,
          network: networkEnum,
          planName: planCode,
          status: TransactionStatus.FAILED,
          notes: `Invalid PIN: ${attemptsLeft} attempts remaining`,
          metadata: {
            failureReason: "INVALID_PIN",
            pinVerified: false,
            pinAttempts: updatedUser.pinAttempts,
            attemptsLeft: attemptsLeft,
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

    // PIN verified - update transaction
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
            wasDebited: false,
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
          product: `${provider} - ${planCode}`,
          phoneNumber: phoneNumber,
          network: networkEnum,
          planName: planCode,
          status: TransactionStatus.FAILED,
          notes: `Insufficient balance: ${walletBalance} available, ${amount} required`,
          metadata: {
            failureReason: "INSUFFICIENT_BALANCE",
            pinVerified: true,
            walletBalance: walletBalance,
            requiredAmount: amount,
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
    // PROCEED WITH VENDOR PURCHASE
    // ============================================================

    let vendorId: string | null = null;
    let vendorEnum: VtuVendor | null = null;
    let wasDebited = false;
    
    let vendorCommission: number | null = null;
    let vendorTotalAmount: number | null = null;
    let commissionRate: number | null = null;
    let commissionType: string | null = null;
    let commissionComputation: string | null = null;
    let commissionDetails: any = null;
    let costPrice: number | null = null;
    let grossProfit: number | null = null;
    let profitMargin: number | null = null;
    let platformCommission: number | null = null;

    try {
      const vendorService = getVendorService();

      const TIMEOUT_MS = 25000;
      const vendorPromise = vendorService.buyData(
        {
          phoneNumber: phoneNumber,
          planCode: planCode,
          network: provider,
          amount: amount,
        },
        user.id
      );

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Vendor timeout after 25 seconds')), TIMEOUT_MS);
      });

      const result = await Promise.race([vendorPromise, timeoutPromise]) as any;

      // Extract commission data
      if (result.data) {
        vendorCommission = result.data.commission || null;
        vendorTotalAmount = result.data.totalAmount || null;
        
        if (result.metadata?.commissionDetails) {
          commissionDetails = result.metadata.commissionDetails;
          commissionRate = commissionDetails.rate ? parseFloat(commissionDetails.rate) : null;
          commissionType = commissionDetails.rate_type || null;
          commissionComputation = commissionDetails.computation_type || null;
        }
        
        costPrice = vendorTotalAmount ?? amount;
        grossProfit = amount - costPrice;
        profitMargin = amount > 0 ? (grossProfit / amount) * 100 : 0;
        platformCommission = grossProfit;
      }

      // Map vendor to enum
      vendorEnum = mapVendorToEnum(result.vendor);
      if (!vendorEnum) {
        vendorEnum = VtuVendor.VTPASS;
      }

      // Get vendor ID
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
        wasDebited = true;

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

        // Complete transaction - all in one transaction
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
              description: `Data purchase for ${phoneNumber} (${provider} - ${planCode})`,
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
              vendorCommission: vendorCommission,
              vendorTotalAmount: vendorTotalAmount,
              commissionRate: commissionRate,
              commissionType: commissionType,
              commissionComputation: commissionComputation,
              commissionMetadata: commissionDetails,
              costPrice: costPrice,
              sellingPrice: amount,
              grossProfit: grossProfit,
              profitMargin: profitMargin,
              platformCommission: platformCommission,
              platformTotalAmount: amount,
              netProfit: grossProfit,
              totalCommission: (vendorCommission || 0) + (platformCommission || 0),
              effectiveRate: amount > 0 ? ((vendorCommission || 0) / amount) * 100 : 0,
              // channelDisplay already set from initial creation
              metadata: {
                ...transaction.metadata,
                vendorResponse: result.data,
                vendorName: result.vendor,
                vendorReference: result.vendorReference,
                vendorSwitched: result.vendorSwitched,
                switchedFrom: result.switchedFrom,
                responseDescription: result.data?.responseDescription,
                commission: {
                  vendorCommission,
                  vendorTotalAmount,
                  commissionRate,
                  commissionType,
                  commissionComputation,
                  commissionDetails: commissionDetails,
                  platformCommission: platformCommission,
                  grossProfit: grossProfit,
                  profitMargin: profitMargin,
                  costPrice: costPrice,
                  sellingPrice: amount,
                },
                success: true,
                pinVerified: true,
                completedAt: new Date().toISOString(),
                wasDebited: true,
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
              product: `${provider} - ${planCode}`,
              phoneNumber: phoneNumber,
              network: networkEnum,
              planName: planCode,
              status: TransactionStatus.SUCCESS,
              commissionAmount: vendorCommission || 0,
              commissionRate: commissionRate || 0,
              commissionPaid: true,
              commissionPaidAt: new Date(),
              metadata: {
                vendorName: result.vendor || 'unknown',
                vendorReference: result.vendorReference || '',
                vendorSwitched: result.vendorSwitched || false,
                switchedFrom: result.switchedFrom || [],
                pinVerified: true,
                completedAt: new Date().toISOString(),
                commission: {
                  vendorCommission,
                  vendorTotalAmount,
                  commissionRate,
                  commissionType,
                  platformProfit: platformCommission,
                  grossProfit: grossProfit,
                  profitMargin: profitMargin,
                },
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
        log('info', `Mobile data transaction ${transaction.id} completed in ${totalTime}ms`);

        return NextResponse.json({
          success: true,
          data: {
            transactionId: transaction.id,
            reference: transaction.id,
            vendorReference: result.vendorReference,
            amount: amount,
            provider: provider,
            planCode: planCode,
            phoneNumber: phoneNumber,
            customerId: customer.id,
            isNewCustomer: customer.totalTransactions === 0,
            customerName: customer.fullName,
            vendor: result.vendor,
            vendorSwitched: result.vendorSwitched,
            switchedFrom: result.switchedFrom,
            totalTime: totalTime,
            channel: CHANNEL_DISPLAY,
            commission: {
              vendorCommission: vendorCommission,
              vendorTotalAmount: vendorTotalAmount,
              commissionRate: commissionRate,
              platformProfit: platformCommission,
              grossProfit: grossProfit,
              profitMargin: profitMargin,
            },
            ...result.data,
          },
        });
      } else {
        await handleVendorFailure(transaction, customer, user, provider, networkEnum, phoneNumber, amount, planCode, result, vendorEnum, vendorId);
        
        return NextResponse.json({
          success: false,
          error: result.error || "Vendor transaction failed",
          transactionId: transaction.id,
          vendor: result.vendor,
          vendorReference: result.vendorReference,
        }, { status: 500 });
      }
    } catch (error: any) {
      await handleUnexpectedError(transaction, customer, user, provider, networkEnum, phoneNumber, amount, planCode, error, vendorEnum, vendorId);
      
      return NextResponse.json({
        success: false,
        error: error.message || "Purchase failed. Please try again.",
        transactionId: transaction.id,
      }, { status: 500 });
    }
  } catch (error: any) {
    log('error', `Top-level error: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred",
    }, { status: 500 });
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function handleVendorFailure(
  transaction: any,
  customer: any,
  user: any,
  provider: string,
  networkEnum: NetworkProvider,
  phoneNumber: string,
  amount: number,
  planCode: string,
  result: any,
  vendorEnum: VtuVendor | null,
  vendorId: string | null
) {
  log('error', `Vendor purchase failed: ${result.error}`);

  const wasDebited = transaction.totalDebited > 0;

  await prisma.vtuTransaction.update({
    where: { id: transaction.id },
    data: {
      status: TransactionStatus.FAILED,
      totalDebited: wasDebited ? transaction.totalDebited : 0,
      vendor: vendorEnum,
      vendorReference: result.vendorReference || null,
      selectedVendorId: vendorId,
      vendorPriorityUsed: result.vendorPriorityUsed || 0,
      fallbackAttempts: {
        increment: 1,
      },
      failedVendors: result.vendorErrors || [],
      refundStatus: wasDebited ? RefundStatus.PENDING : RefundStatus.NONE,
      metadata: {
        ...transaction.metadata,
        error: result.error,
        vendor: result.vendor,
        vendorErrors: result.vendorErrors || [],
        vendorSwitched: result.vendorSwitched || false,
        switchedFrom: result.switchedFrom || [],
        failedAt: new Date().toISOString(),
        pinVerified: true,
        vendorAttempts: result.attempts || 1,
        responseData: result.data || null,
        wasDebited: wasDebited,
        requiresRefund: wasDebited,
      },
    },
  });

  if (wasDebited) {
    try {
      await processRefund(
        transaction,
        user,
        transaction.totalDebited,
        `Vendor failure: ${result.error || 'Transaction failed after debit'}`,
        "VENDOR_FAILURE"
      );
    } catch (refundError) {
      log('error', `Refund failed: ${refundError.message}`);
    }
  }

  await prisma.customerTransaction.create({
    data: {
      customerId: customer.id,
      userId: user.id,
      vtuTransactionId: transaction.id,
      transactionType: VtuType.DATA,
      amount: amount,
      totalAmount: amount,
      product: `${provider} - ${planCode}`,
      phoneNumber: phoneNumber,
      network: networkEnum,
      planName: planCode,
      status: TransactionStatus.FAILED,
      notes: `Failed: ${result.error || 'Vendor transaction failed'}${wasDebited ? ' (Refund processed)' : ''}`,
      metadata: {
        vendorName: result.vendor || 'unknown',
        vendorReference: result.vendorReference || '',
        vendorSwitched: result.vendorSwitched || false,
        switchedFrom: result.switchedFrom || [],
        pinVerified: true,
        failureReason: result.error,
        vendorErrors: result.vendorErrors || [],
        failedAt: new Date().toISOString(),
        refundProcessed: wasDebited,
      },
    },
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      totalTransactions: { increment: 1 },
      lastTransactionAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await Promise.all([
    CacheService.invalidateWallet(user.id),
    CacheService.invalidateUser(user.id),
    CacheService.invalidateCustomer(user.id, phoneNumber),
  ]);
}

async function handleUnexpectedError(
  transaction: any,
  customer: any,
  user: any,
  provider: string,
  networkEnum: NetworkProvider,
  phoneNumber: string,
  amount: number,
  planCode: string,
  error: any,
  vendorEnum: VtuVendor | null,
  vendorId: string | null
) {
  log('error', `Unexpected error: ${error.message}`);

  const wasDebited = transaction.totalDebited > 0;

  await prisma.vtuTransaction.update({
    where: { id: transaction.id },
    data: {
      status: TransactionStatus.FAILED,
      totalDebited: wasDebited ? transaction.totalDebited : 0,
      vendor: vendorEnum || VtuVendor.VTPASS,
      selectedVendorId: vendorId,
      fallbackAttempts: {
        increment: 1,
      },
      refundStatus: wasDebited ? RefundStatus.PENDING : RefundStatus.NONE,
      metadata: {
        ...transaction.metadata,
        error: error.message || "Unknown error",
        errorStack: isDev ? error.stack : undefined,
        failedAt: new Date().toISOString(),
        pinVerified: true,
        errorType: error.name || 'UnknownError',
        errorCode: error.code || null,
        wasDebited: wasDebited,
        requiresRefund: wasDebited,
      },
    },
  });

  if (wasDebited) {
    try {
      await processRefund(
        transaction,
        user,
        transaction.totalDebited,
        `System error: ${error.message || 'Unexpected error after debit'}`,
        "SYSTEM_ERROR"
      );
    } catch (refundError) {
      log('error', `Refund failed: ${refundError.message}`);
    }
  }

  await prisma.customerTransaction.create({
    data: {
      customerId: customer.id,
      userId: user.id,
      vtuTransactionId: transaction.id,
      transactionType: VtuType.DATA,
      amount: amount,
      totalAmount: amount,
      product: `${provider} - ${planCode}`,
      phoneNumber: phoneNumber,
      network: networkEnum,
      planName: planCode,
      status: TransactionStatus.FAILED,
      notes: `System Error: ${error.message || 'Unknown error'}${wasDebited ? ' (Refund processed)' : ''}`,
      metadata: {
        pinVerified: true,
        failureReason: error.message,
        errorType: error.name,
        errorCode: error.code,
        failedAt: new Date().toISOString(),
        refundProcessed: wasDebited,
      },
    },
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      totalTransactions: { increment: 1 },
      lastTransactionAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await Promise.all([
    CacheService.invalidateWallet(user.id),
    CacheService.invalidateUser(user.id),
    CacheService.invalidateCustomer(user.id, phoneNumber),
  ]);
}