import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { 
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
  DisCo,
  VtuVendor,
  CustomerType,
  RefundStatus,
} from "@prisma/client";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { compare } from "bcrypt";
import { CacheService } from "~/lib/cache/cache.service";

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
// HELPERS
// ============================================================

function mapDiscoCode(discoCode: string | null | undefined): DisCo | null {
  if (!discoCode) return null;
  
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
  };
  
  const normalized = discoCode.toUpperCase().trim();
  return discoMap[normalized] || null;
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
// REFUND HELPER
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
          description: `Refund for failed subscription: ${reason}`,
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
        message: `Your refund of ₦${amount} for subscription has been processed.`,
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
// MAIN API ROUTE - OPTIMIZED
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const body = await request.json();
    const { meterNumber, discoCode, amount, deliveryDate, pin } = body;

    // ============================================================
    // VALIDATION
    // ============================================================

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

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    const selectedDate = new Date(deliveryDate);
    
    if (selectedDate < minDate) {
      return NextResponse.json({
        success: false,
        error: "Delivery date must be at least 3 days from today",
      }, { status: 400 });
    }

    if (!meterNumber) {
      return NextResponse.json({
        success: false,
        error: "Meter number is required",
      }, { status: 400 });
    }

    if (!discoCode) {
      return NextResponse.json({
        success: false,
        error: "DisCo is required",
      }, { status: 400 });
    }

    if (!pin || pin.length < 4) {
      return NextResponse.json({
        success: false,
        error: "Please enter your 4-6 digit transaction PIN",
      }, { status: 400 });
    }

    // ============================================================
    // PARALLEL FETCH: user + customer + balance
    // ============================================================
    const userId = sessionUser.id;

    const [cachedUser, cachedCustomer, cachedBalance] = await Promise.all([
      CacheService.getUser(userId).catch(() => null),
      CacheService.getCustomer(userId, sessionUser.phone).catch(() => null),
      CacheService.getBalance(userId).catch(() => null),
    ]);

    let user = cachedUser;
    let customer = cachedCustomer;
    let walletBalance = cachedBalance?.balance;

    // Fallback to database if cache misses
    if (!user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          pinHash: true,
          pinAttempts: true,
          pinLockedUntil: true,
          hasWallet: true,
          fullName: true,
          email: true,
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
        email: dbUser.email,
        phone: dbUser.phone,
        wallet: dbUser.wallet || null,
      };

      CacheService.setUser(userId, user).catch(() => {});
    }

    if (!customer) {
      customer = await prisma.customer.findUnique({
        where: {
          userId_phone: {
            userId: user.id,
            phone: user.phone,
          },
        },
      });

      if (!customer) {
        customer = await CacheService.createCustomer({
          userId: user.id,
          phone: user.phone,
          fullName: user.fullName || null,
          email: user.email || null,
          customerType: CustomerType.REGULAR,
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        });
      } else {
        CacheService.setCustomer(user.id, user.phone, customer).catch(() => {});
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
    // PIN VERIFICATION
    // ============================================================

    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json({
        success: false,
        error: `Account locked. Please try again in ${remainingMinutes} minute(s).`,
      }, { status: 403 });
    }

    if (!user.pinHash) {
      return NextResponse.json({
        success: false,
        error: "You don't have a transaction PIN set. Please set one in your profile.",
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

      return NextResponse.json({
        success: false,
        error: errorMessage,
        attemptsLeft,
      }, { status: statusCode });
    }

    // Reset PIN attempts on success
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
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}`,
      }, { status: 400 });
    }

    const discoEnum = mapDiscoCode(discoCode);
    if (!discoEnum) {
      return NextResponse.json({
        success: false,
        error: "Invalid DisCo selected",
      }, { status: 400 });
    }

    const walletId = user.wallet.id;

    // ============================================================
    // PURCHASE TOKEN WITH TIMEOUT
    // ============================================================

    let token = null;
    let tokenSaved = false;
    let vendorReference = null;
    let deliveryStatus = "SCHEDULED";
    let vtuTransactionId = null;
    let tokenVaultId = null;
    let vendorId: string | null = null;
    let vendorEnum: VtuVendor | null = null;
    let wasDebited = false;
    
    let vendorCommission: number | null = null;
    let vendorTotalAmount: number | null = null;
    let commissionRate: number | null = null;
    let commissionType: string | null = null;
    let commissionDetails: any = null;
    let costPrice: number | null = null;
    let grossProfit: number | null = null;
    let profitMargin: number | null = null;
    let platformCommission: number | null = null;

    try {
      const vendorService = getVendorService();

      const TIMEOUT_MS = 25000;
      const vendorPromise = vendorService.buyElectricity(
        {
          meterNumber: meterNumber,
          amount: amount,
          discoCode: discoCode,
          meterType: "Prepaid",
          phone: user.phone,
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
        }
        
        costPrice = vendorTotalAmount ?? amount;
        grossProfit = amount - costPrice;
        profitMargin = amount > 0 ? (grossProfit / amount) * 100 : 0;
        platformCommission = grossProfit;
      }

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

      if (result.success && result.data?.token) {
        token = result.data.token;
        vendorReference = result.vendorReference;
        tokenSaved = true;
        wasDebited = true;
        deliveryStatus = "TOKEN_PURCHASED";
        log('info', `Token purchased for ${meterNumber}`);
      } else {
        log('warn', `Token purchase failed: ${result.error}`);
        deliveryStatus = "PENDING_PURCHASE";
      }
    } catch (error: any) {
      log('error', `Token purchase error: ${error.message}`);
      deliveryStatus = "PENDING_PURCHASE";
    }

    // ============================================================
    // CREATE PREORDER
    // ============================================================

    const preOrder = await prisma.preOrder.create({
      data: {
        userId: user.id,
        disCo: discoEnum,
        meterNumber: meterNumber,
        meterType: MeterType.HOME,
        meterName: `${discoCode} Meter`,
        amount: amount,
        serviceFee: 0,
        totalDebited: 0,
        deliveryDate: selectedDate,
        status: tokenSaved ? PreOrderStatus.PURCHASED : PreOrderStatus.PENDING,
        isCancelled: false,
        channel: ChannelType.MOBILE_APP,
        metadata: {
          serviceType: "electricity",
          isSubscription: true,
          isReserved: true,
          reservedAmount: amount,
          scheduledDate: deliveryDate,
          tokenPurchased: tokenSaved,
          token: token,
          walletId: walletId,
          paymentPending: true,
          source: "SubscriptionAPI",
          wasDebited: wasDebited,
          commission: {
            vendorCommission,
            vendorTotalAmount,
            commissionRate,
            platformProfit: platformCommission,
          },
        },
      },
    });

    // ============================================================
    // IF TOKEN PURCHASED, CREATE VTU TRANSACTION AND TOKEN VAULT
    // ============================================================

    if (tokenSaved && token) {
      const vtuTransaction = await prisma.vtuTransaction.create({
        data: {
          userId: user.id,
          transactionType: VtuType.ELECTRICITY_PREORDER,
          product: discoCode || "ELECTRICITY",
          amount: amount,
          totalDebited: amount,
          meterNumber: meterNumber,
          status: TransactionStatus.PENDING,
          vendor: vendorEnum,
          vendorReference: vendorReference,
          vendorId: vendorId || undefined,
          token: token,
          scheduledFor: selectedDate,
          channel: ChannelType.MOBILE_APP,
          preOrder: { connect: { id: preOrder.id } },
          vendorCommission: vendorCommission,
          vendorTotalAmount: vendorTotalAmount,
          commissionRate: commissionRate,
          commissionType: commissionType,
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
          metadata: {
            preOrderId: preOrder.id,
            deliveryDate: deliveryDate,
            vendorReference: vendorReference,
            serviceType: "electricity",
            isSubscription: true,
            isScheduled: true,
            tokenPurchased: true,
            paymentPending: true,
            source: "SubscriptionAPI",
            wasDebited: true,
            commission: {
              vendorCommission,
              vendorTotalAmount,
              commissionRate,
              commissionType,
              commissionDetails: commissionDetails,
              platformCommission: platformCommission,
              grossProfit: grossProfit,
              profitMargin: profitMargin,
              costPrice: costPrice,
              sellingPrice: amount,
            },
          },
        },
      });

      vtuTransactionId = vtuTransaction.id;

      await prisma.preOrder.update({
        where: { id: preOrder.id },
        data: { transactionId: vtuTransaction.id },
      });

      const tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 30);

      const tokenVault = await prisma.tokenVault.create({
        data: {
          userId: user.id,
          transactionId: vtuTransaction.id,
          token: token,
          tokenType: TokenType.ELECTRICITY,
          meterNumber: meterNumber,
          disCo: discoEnum,
          amount: amount,
          validFrom: new Date(),
          validUntil: tokenExpiry,
          status: TokenStatus.STORED,
          scheduledFor: selectedDate,
          deliveryChannel: DeliveryChannel.MOBILE_PUSH,
          isRefunded: false,
          metadata: {
            vendorReference: vendorReference,
            preOrderId: preOrder.id,
            deliveryDate: deliveryDate,
            serviceType: "electricity",
            isScheduled: true,
            paymentPending: true,
            source: "SubscriptionAPI",
            wasDebited: true,
            commission: {
              vendorCommission,
              vendorTotalAmount,
              commissionRate,
              platformProfit: platformCommission,
            },
          },
        },
      });

      tokenVaultId = tokenVault.id;

      await prisma.preOrder.update({
        where: { id: preOrder.id },
        data: { tokenVaultId: tokenVault.id },
      });
    }

    // ============================================================
    // RESERVE AMOUNT
    // ============================================================

    const reserveTransaction = await prisma.walletTransaction.create({
      data: {
        walletId: user.wallet.id,
        userId: user.id,
        type: WalletTransactionType.SYSTEM,
        amount: amount,
        balanceBefore: walletBalance,
        balanceAfter: walletBalance,
        reference: `RESERVE_${preOrder.id}`,
        description: tokenSaved 
          ? `🔒 Token purchased & reserved for delivery on ${new Date(deliveryDate).toLocaleDateString()}`
          : `🔒 Reserved for electricity delivery on ${new Date(deliveryDate).toLocaleDateString()}`,
        status: TransactionStatus.PENDING,
        category: WalletCategory.ELECTRICITY,
        channel: ChannelType.MOBILE_APP,
        metadata: {
          preOrderId: preOrder.id,
          deliveryDate: deliveryDate,
          serviceType: "electricity",
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
          source: "SubscriptionAPI",
          wasDebited: wasDebited,
          commission: {
            vendorCommission,
            vendorTotalAmount,
            commissionRate,
            platformProfit: platformCommission,
          },
        },
      },
    });

    // ============================================================
    // SCHEDULE DELIVERY JOB
    // ============================================================

    await prisma.job.create({
      data: {
        type: JobType.SUBSCRIPTION_PROCESSING,
        status: JobStatus.PENDING,
        payload: {
          preOrderId: preOrder.id,
          userId: user.id,
          serviceType: "electricity",
          amount: amount,
          deliveryDate: deliveryDate,
          walletId: walletId,
          reserveTransactionId: reserveTransaction.id,
          tokenVaultId: tokenVaultId,
          vtuTransactionId: vtuTransactionId,
          token: token,
          tokenPurchased: tokenSaved,
          wasDebited: wasDebited,
          meterNumber: meterNumber,
          discoCode: discoCode,
          source: "SubscriptionAPI",
          commission: {
            vendorCommission,
            vendorTotalAmount,
            commissionRate,
            platformProfit: platformCommission,
          },
        },
        priority: 5,
        maxAttempts: 3,
        scheduledFor: selectedDate,
      },
    });

    // ============================================================
    // INVALIDATE CACHE
    // ============================================================

    await Promise.all([
      CacheService.invalidateWallet(user.id),
      CacheService.invalidateUser(user.id),
      CacheService.invalidateCustomer(user.id, user.phone),
      CacheService.invalidateSavedMeters(user.id),
    ]);

    const totalTime = Date.now() - startTime;
    log('info', `Subscription created in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        id: preOrder.id,
        type: "electricity",
        amount: Number(preOrder.amount),
        scheduledDate: deliveryDate,
        deliveryStatus: deliveryStatus,
        tokenPurchased: tokenSaved,
        token: token,
        tokenVaultId: tokenVaultId,
        vtuTransactionId: vtuTransactionId,
        amountReserved: amount,
        walletBalance: walletBalance,
        reservedAmount: amount,
        walletId: walletId,
        wasDebited: wasDebited,
        commission: {
          vendorCommission: vendorCommission,
          vendorTotalAmount: vendorTotalAmount,
          commissionRate: commissionRate,
          platformProfit: platformCommission,
          grossProfit: grossProfit,
          profitMargin: profitMargin,
        },
        message: tokenSaved 
          ? "✅ Token purchased and reserved! Balance will be deducted on delivery date."
          : "📅 Subscription created! Token purchase will be completed before delivery date.",
      },
    }, { status: 201 });

  } catch (error: any) {
    log('error', 'Subscription creation failed', error.message);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to create subscription",
    }, { status: 500 });
  }
}