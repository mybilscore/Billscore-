// app/api/vendors/education/purchase/route.ts - COMPLETE UPDATED WITH CORRECT VTpass CODES

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { 
  TransactionStatus, 
  VtuType,
  ChannelType,
  CustomerType,
  VtuVendor,
  WalletCategory,
  WalletTransactionType,
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
// VTpass Education Service ID & Variation Code Mapping
// ============================================================

// ✅ VTpass Service IDs
const VTpassServiceIDs: Record<string, string> = {
  'waec': 'waec',
  'waec-result': 'waec',
  'waec-registration': 'waec-registration',
  'neco': 'neco',
  'jamb': 'jamb',
};

// ✅ VTpass Variation Codes (with the typo fix for WAEC Registration)
const VTpassVariationCodes: Record<string, string> = {
  'waec': 'waec',
  'waec-result': 'waec',
  // ✅ FIX: VTpass uses "registraion" (typo) not "registration"
  'waec-registration': 'waec-registraion',
  'neco': 'neco',
  'jamb': 'jamb',
};

// ✅ Get the correct service ID for VTpass
function getVTPassServiceID(serviceId: string): string {
  return VTpassServiceIDs[serviceId] || serviceId;
}

// ✅ Get the correct variation code for VTpass
function getVTPassVariationCode(serviceId: string): string {
  return VTpassVariationCodes[serviceId] || serviceId;
}

// ============================================================
// HELPERS
// ============================================================

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
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
          description: `Refund for failed education purchase: ${reason}`,
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
        message: `Your refund of ₦${amount} for education purchase has been processed.`,
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
// CREATE FAILED TRANSACTION HELPER
// ============================================================

async function createFailedEducationTransaction(
  userId: string,
  serviceId: string,
  variationCode: string,
  quantity: number,
  amount: number,
  errorMessage: string,
  failureReason: string,
  metadata: any = {}
) {
  try {
    let customer = await prisma.customer.findFirst({
      where: { userId: userId },
    });

    if (!customer) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, fullName: true, email: true },
      });

      customer = await prisma.customer.create({
        data: {
          userId: userId,
          phone: user?.phone || 'unknown',
          fullName: user?.fullName || null,
          email: user?.email || null,
          customerType: CustomerType.REGULAR,
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        },
      });
    }

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: userId,
        transactionType: VtuType.EDUCATION,
        product: serviceId,
        amount: amount || 0,
        totalDebited: 0,
        phoneNumber: 'unknown',
        network: null,
        networkPlan: variationCode,
        status: TransactionStatus.FAILED,
        refundStatus: RefundStatus.NONE,
        channel: ChannelType.WEB_APP,
        channelDisplay: "WEB_APP",
        isBulkPurchase: quantity > 1,
        bulkQuantity: quantity > 1 ? quantity : undefined,
        metadata: {
          source: "EducationAPI",
          serviceId: serviceId,
          variationCode: variationCode,
          quantity: quantity,
          error: errorMessage,
          failureReason: failureReason,
          failedAt: new Date().toISOString(),
          wasDebited: false,
          requiresRefund: false,
          channel: "WEB_APP",
          channelDisplay: "WEB_APP",
          ...metadata,
        },
      },
    });

    await prisma.customerTransaction.create({
      data: {
        customerId: customer.id,
        userId: userId,
        vtuTransactionId: transaction.id,
        transactionType: VtuType.EDUCATION,
        amount: amount || 0,
        totalAmount: amount || 0,
        product: serviceId,
        phoneNumber: 'unknown',
        network: null,
        planName: variationCode,
        status: TransactionStatus.FAILED,
        notes: `Education purchase failed: ${errorMessage}`,
        metadata: {
          serviceId: serviceId,
          variationCode: variationCode,
          quantity: quantity,
          failureReason: failureReason,
          failedAt: new Date().toISOString(),
          source: "EducationAPI",
          ...metadata,
        },
      },
    });

    return transaction;
  } catch (err) {
    console.error("❌ [EDUCATION] Failed to create failed transaction record:", err);
    return null;
  }
}

// ============================================================
// MAIN API ROUTE - OPTIMIZED
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let sessionUser: any = null;
  let user: any = null;
  
  try {
    sessionUser = await requireAuth("/auth/sign-in");
    const body = await request.json();
    const { serviceId, variationCode, amount, quantity, phone, billersCode, pin } = body;

    // ============================================================
    // STATIC CHANNEL - Always WEB_APP for web routes
    // ============================================================
    const CHANNEL_DISPLAY = "WEB_APP";

    // ============================================================
    // VALIDATION
    // ============================================================

    if (!serviceId) {
      return NextResponse.json({
        success: false,
        error: "Please select a service",
      }, { status: 400 });
    }

    if (!variationCode) {
      return NextResponse.json({
        success: false,
        error: "Please select a variation",
      }, { status: 400 });
    }

    if (serviceId === 'jamb' && !billersCode) {
      return NextResponse.json({
        success: false,
        error: "JAMB Profile ID is required",
      }, { status: 400 });
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid quantity (minimum 1)",
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
    const customerPhone = phone || sessionUser.phone || '';

    const [cachedUser, cachedCustomer, cachedBalance] = await Promise.all([
      CacheService.getUser(userId).catch(() => null),
      CacheService.getCustomer(userId, customerPhone).catch(() => null),
      CacheService.getBalance(userId).catch(() => null),
    ]);

    user = cachedUser;
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

      try {
        await CacheService.setUser(userId, user);
      } catch (e) {
        // Ignore
      }
    }

    if (!customer) {
      const phoneToUse = customerPhone || user.phone || '';
      customer = await prisma.customer.findUnique({
        where: {
          userId_phone: {
            userId: user.id,
            phone: phoneToUse,
          },
        },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            userId: user.id,
            phone: phoneToUse || 'unknown',
            fullName: user.fullName || null,
            email: user.email || null,
            customerType: CustomerType.REGULAR,
            totalTransactions: 0,
            totalSpent: 0,
            totalCommissionEarned: 0,
            firstTransactionAt: new Date(),
            tags: [],
          },
        });
      }

      try {
        if (phoneToUse) {
          await CacheService.setCustomer(user.id, phoneToUse, customer);
        }
      } catch (e) {
        // Ignore
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

    const totalAmount = amount || 0;

    if (walletBalance < (totalAmount || 100)) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Your balance is ${formatCurrency(walletBalance)}`,
      }, { status: 400 });
    }

    // ============================================================
    // CREATE TRANSACTION RECORD - channelDisplay = "WEB_APP"
    // ============================================================

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.EDUCATION,
        product: serviceId,
        amount: totalAmount || 0,
        totalDebited: 0,
        phoneNumber: phone || user.phone,
        network: null,
        networkPlan: variationCode,
        status: TransactionStatus.PENDING,
        channel: ChannelType.WEB_APP,
        channelDisplay: CHANNEL_DISPLAY,
        isBulkPurchase: quantity > 1,
        bulkQuantity: quantity > 1 ? quantity : undefined,
        metadata: {
          source: "EducationAPI",
          serviceId: serviceId,
          variationCode: variationCode,
          quantity: quantity,
          billersCode: billersCode,
          pinVerified: true,
          wasDebited: false,
          channel: "WEB_APP",
          channelDisplay: CHANNEL_DISPLAY,
        },
      },
    });

    // ============================================================
    // VENDOR PURCHASE
    // ============================================================

    let vendorId: string | null = null;
    let vendorEnum: VtuVendor | null = null;
    let vendorReference: string | null = null;
    let vendorCommission: number | null = null;
    let vendorTotalAmount: number | null = null;
    let commissionRate: number | null = null;
    let token: string | null = null;
    let tokens: string[] = [];
    let cards: Array<{ Serial: string; Pin: string }> = [];

    try {
      const vendorService = getVendorService();

      // ✅ Build request data
      const requestData: any = {
        serviceId: serviceId,
        variationCode: variationCode,
        phone: phone || user.phone,
        quantity: quantity || 1,
      };

      // ✅ Check if using VTpass - apply correct codes
      const isVTpass = process.env.ACTIVE_VENDOR === 'VTPASS' || 
                       vendorService.getVendorInstance?.('VTPASS') !== undefined;

      if (isVTpass || true) {
        // ✅ Use correct VTpass service ID and variation code
        const vtpassServiceId = getVTPassServiceID(serviceId);
        const vtpassVariationCode = getVTPassVariationCode(serviceId);
        
        requestData.serviceId = vtpassServiceId;
        requestData.variationCode = vtpassVariationCode;
        
        log('info', 'Using VTpass service mapping', {
          originalServiceId: serviceId,
          vtpassServiceId,
          vtpassVariationCode,
        });
      }

      if (serviceId === 'jamb' && billersCode) {
        requestData.billersCode = billersCode;
      }

      if (totalAmount > 0) {
        requestData.amount = totalAmount;
      }

      log('info', 'Education purchase request', requestData);

      const result = await vendorService.buyEducation(requestData, user.id);

      // Extract commission data
      if (result.data) {
        vendorCommission = result.data.commission || null;
        vendorTotalAmount = result.data.totalAmount || null;
        
        if (result.metadata?.commissionDetails) {
          commissionRate = result.metadata.commissionDetails.rate ? parseFloat(result.metadata.commissionDetails.rate) : null;
        }
        
        token = result.data?.token || null;
        tokens = result.data?.tokens || [];
        cards = result.data?.cards || [];
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

      if (!result.success) {
        throw new Error(result.error || "Vendor purchase failed");
      }

      vendorReference = result.vendorReference;

      const hasTokens = tokens.length > 0 || cards.length > 0 || token;

      if (!hasTokens) {
        throw new Error("No tokens or cards received from vendor");
      }

      const finalAmount = result.data?.amount || totalAmount || 0;

      // ============================================================
      // SUCCESS - Complete transaction
      // ============================================================

      // Update customer stats
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalTransactions: { increment: 1 },
          totalSpent: { increment: finalAmount },
          lastTransactionAt: new Date(),
        },
      });

      // Complete transaction
      await prisma.$transaction([
        prisma.wallet.update({
          where: { id: user.wallet.id },
          data: {
            walletBalance: {
              decrement: finalAmount,
            },
          },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: user.wallet.id,
            userId: user.id,
            type: WalletTransactionType.DEBIT,
            amount: finalAmount,
            balanceBefore: walletBalance,
            balanceAfter: walletBalance - finalAmount,
            reference: `EDU_${transaction.id}`,
            description: `Education pin purchase (${serviceId} - ${quantity}x)`,
            status: TransactionStatus.SUCCESS,
            category: WalletCategory.EDUCATION,
          },
        }),
        prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.SUCCESS,
            totalDebited: finalAmount,
            vendor: vendorEnum,
            vendorReference: vendorReference,
            vendorId: vendorId || undefined,
            token: token || '',
            deliveredAt: new Date(),
            vendorCommission: vendorCommission,
            vendorTotalAmount: vendorTotalAmount,
            commissionRate: commissionRate,
            costPrice: vendorTotalAmount ?? finalAmount,
            sellingPrice: finalAmount,
            grossProfit: (vendorTotalAmount !== null) ? finalAmount - vendorTotalAmount : 0,
            platformCommission: (vendorTotalAmount !== null) ? finalAmount - vendorTotalAmount : 0,
            platformTotalAmount: finalAmount,
            netProfit: (vendorTotalAmount !== null) ? finalAmount - vendorTotalAmount : 0,
            totalCommission: (vendorCommission || 0) + ((vendorTotalAmount !== null) ? finalAmount - vendorTotalAmount : 0),
            effectiveRate: finalAmount > 0 ? ((vendorCommission || 0) / finalAmount) * 100 : 0,
            channelDisplay: CHANNEL_DISPLAY,
            metadata: {
              ...transaction.metadata,
              vendorName: result.vendor,
              vendorReference: vendorReference,
              serviceId: serviceId,
              variationCode: variationCode,
              quantity: quantity,
              billersCode: billersCode,
              tokens: tokens,
              cards: cards,
              success: true,
              completedAt: new Date().toISOString(),
              wasDebited: true,
              commission: {
                vendorCommission,
                vendorTotalAmount,
                commissionRate,
                platformProfit: (vendorTotalAmount !== null) ? finalAmount - vendorTotalAmount : 0,
              },
            },
          },
        }),
        prisma.customerTransaction.create({
          data: {
            customerId: customer.id,
            userId: user.id,
            vtuTransactionId: transaction.id,
            transactionType: VtuType.EDUCATION,
            amount: finalAmount,
            totalAmount: finalAmount,
            product: serviceId,
            phoneNumber: phone || user.phone,
            planName: variationCode,
            status: TransactionStatus.SUCCESS,
            commissionAmount: vendorCommission || 0,
            commissionRate: commissionRate || 0,
            commissionPaid: true,
            commissionPaidAt: new Date(),
            metadata: {
              vendorName: result.vendor || 'unknown',
              vendorReference: vendorReference || '',
              serviceId: serviceId,
              variationCode: variationCode,
              quantity: quantity,
              billersCode: billersCode,
              tokens: tokens,
              cards: cards,
              source: "EducationAPI",
              commission: {
                vendorCommission,
                vendorTotalAmount,
                commissionRate,
                platformProfit: (vendorTotalAmount !== null) ? finalAmount - vendorTotalAmount : 0,
              },
            },
          },
        }),
      ]);

      // Invalidate cache
      try {
        await Promise.all([
          CacheService.invalidateWallet(user.id),
          CacheService.invalidateUser(user.id),
          CacheService.invalidateCustomer(user.id, user.phone),
        ]);
      } catch (e) {
        // Ignore cache errors
      }

      // Format response message
      let message = '';
      if (serviceId === 'waec' || serviceId === 'waec-result') {
        message = quantity > 1 
          ? `✅ ${quantity} WAEC Result Checker PINs purchased successfully!`
          : `✅ WAEC Result Checker PIN purchased successfully!`;
      } else if (serviceId === 'waec-registration') {
        message = quantity > 1 
          ? `✅ ${quantity} WAEC Registration PINs purchased successfully!`
          : `✅ WAEC Registration PIN purchased successfully!`;
      } else if (serviceId === 'jamb') {
        message = `✅ JAMB PIN purchased successfully!`;
      } else if (serviceId === 'neco') {
        message = `✅ NECO PIN purchased successfully!`;
      } else {
        message = quantity > 1 
          ? `✅ ${quantity} ${serviceId} PINs purchased successfully!`
          : `✅ ${serviceId} PIN purchased successfully!`;
      }

      const totalTime = Date.now() - startTime;
      log('info', `Education transaction ${transaction.id} completed in ${totalTime}ms`);

      return NextResponse.json({
        success: true,
        data: {
          transactionId: transaction.id,
          reference: transaction.id,
          vendorReference: vendorReference,
          amount: finalAmount,
          quantity: quantity,
          serviceId: serviceId,
          variationCode: variationCode,
          vendor: result.vendor,
          token: token,
          tokens: tokens,
          cards: cards,
          channel: CHANNEL_DISPLAY,
          commission: {
            vendorCommission,
            vendorTotalAmount,
            commissionRate,
            platformProfit: (vendorTotalAmount !== null) ? finalAmount - vendorTotalAmount : 0,
          },
          message: message,
        },
      });

    } catch (vendorError: any) {
      // Vendor failed - no debit occurred
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          totalDebited: 0,
          vendor: vendorEnum || VtuVendor.VTPASS,
          vendorId: vendorId || undefined,
          channelDisplay: CHANNEL_DISPLAY,
          metadata: {
            ...transaction.metadata,
            error: vendorError.message,
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
          transactionType: VtuType.EDUCATION,
          amount: totalAmount || 0,
          totalAmount: totalAmount || 0,
          product: serviceId,
          phoneNumber: phone || user.phone,
          planName: variationCode,
          status: TransactionStatus.FAILED,
          notes: `Failed: ${vendorError.message}`,
          metadata: {
            serviceId: serviceId,
            variationCode: variationCode,
            quantity: quantity,
            billersCode: billersCode,
            source: "EducationAPI",
            wasDebited: false,
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

      log('error', 'Education purchase failed', vendorError.message);

      return NextResponse.json({
        success: false,
        error: vendorError.message || "Failed to purchase education pin",
        transactionId: transaction.id,
      }, { status: 500 });
    }

  } catch (error: any) {
    log('error', 'Top-level error', error.message);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to purchase education pin",
    }, { status: 500 });
  }
}