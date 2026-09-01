// src/app/api/mobile/vendors/education/purchase/route.ts
// UPDATED - User-friendly error messages

import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
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

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}

// ✅ User-friendly error message mapper
function getUserFriendlyError(error: any): string {
  const message = typeof error === 'string' ? error : error?.message || '';
  const lowerMessage = message.toLowerCase();

  // Vendor balance errors
  if (lowerMessage.includes('insufficient wallet balance') || 
      lowerMessage.includes('insufficient balance') ||
      lowerMessage.includes('wallet balance')) {
    return 'The service provider is currently unable to process your request. Please try again later.';
  }

  // Authentication errors
  if (lowerMessage.includes('token invalid') || 
      lowerMessage.includes('authentication failed') ||
      lowerMessage.includes('auth error') ||
      lowerMessage.includes('unauthorized')) {
    return 'Service provider authentication failed. Please try again later.';
  }

  // Network/connection errors
  if (lowerMessage.includes('timeout') || 
      lowerMessage.includes('network') ||
      lowerMessage.includes('connection')) {
    return 'Network timeout. Please check your connection and try again.';
  }

  // All vendors failed
  if (lowerMessage.includes('all vendors failed') || 
      lowerMessage.includes('no vendors available')) {
    return 'All service providers are currently unavailable. Please try again later.';
  }

  // Service specific errors
  if (lowerMessage.includes('does not support')) {
    return 'This service is currently not available. Please try another option.';
  }

  // JAMB specific
  if (lowerMessage.includes('jamb') || lowerMessage.includes('profile')) {
    return 'Unable to verify JAMB profile. Please check your Profile ID and try again.';
  }

  // Default fallback - generic friendly message
  return 'Unable to complete your purchase at this time. Please try again later.';
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
// MAIN API ROUTE - OPTIMIZED
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let sessionUser: any = null;
  let user: any = null;
  
  try {
    // 1. Authenticate mobile user
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    sessionUser = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
    };

    // 2. Parse request body
    const body = await request.json();
    const { serviceId, variationCode, amount, quantity, phone, billersCode, pin } = body;

    // ============================================================
    // STATIC CHANNEL - Always MOBILE_APP for mobile routes
    // ============================================================
    const CHANNEL_DISPLAY = "MOBILE_APP";

    // 3. Validate request
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
    // 4. PARALLEL FETCH: user + customer + balance
    // ============================================================

    const userId = sessionUser.id;
    const customerPhone = phone || decoded.phone || '';

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
    // 5. PIN VERIFICATION
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
    // 6. Check balance
    // ============================================================

    const totalAmount = amount || 0;

    if (walletBalance < (totalAmount || 100)) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Your balance is ${formatCurrency(walletBalance)}`,
      }, { status: 400 });
    }

    // ============================================================
    // 7. CREATE TRANSACTION RECORD - channelDisplay = "MOBILE_APP"
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
        channel: ChannelType.MOBILE_APP,
        channelDisplay: CHANNEL_DISPLAY,
        isBulkPurchase: quantity > 1,
        bulkQuantity: quantity > 1 ? quantity : undefined,
        metadata: {
          source: "MobileEducationAPI",
          serviceId: serviceId,
          variationCode: variationCode,
          quantity: quantity,
          billersCode: billersCode,
          pinVerified: true,
          wasDebited: false,
          channel: "MOBILE_APP",
          channelDisplay: CHANNEL_DISPLAY,
        },
      },
    });

    // ============================================================
    // 8. VENDOR PURCHASE
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

      const requestData: any = {
        serviceId: serviceId,
        variationCode: variationCode,
        phone: phone || user.phone,
        quantity: quantity || 1,
      };

      if (serviceId === 'jamb' && billersCode) {
        requestData.billersCode = billersCode;
      }

      if (totalAmount > 0) {
        requestData.amount = totalAmount;
      }

      // 🔥 For sandbox, don't use timeout - let it complete naturally
      const isSandbox = process.env.VT_PASS_ENV === 'sandbox' || !process.env.VT_PASS_ENV;
      
      let result;
      if (isSandbox) {
        // No timeout for sandbox - it's slow
        result = await vendorService.buyEducation(requestData, user.id);
        log('info', 'Sandbox vendor call completed without timeout');
      } else {
        // Production - use timeout
        const TIMEOUT_MS = 30000;
        const vendorPromise = vendorService.buyEducation(requestData, user.id);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Vendor timeout after 30 seconds')), TIMEOUT_MS);
        });
        result = await Promise.race([vendorPromise, timeoutPromise]) as any;
      }

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
      // 9. SUCCESS - Complete transaction
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
              channel: "MOBILE_APP",
              channelDisplay: CHANNEL_DISPLAY,
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
              source: "MobileEducationAPI",
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
      } else {
        message = quantity > 1 
          ? `✅ ${quantity} ${serviceId} PINs purchased successfully!`
          : `✅ ${serviceId} PIN purchased successfully!`;
      }

      const totalTime = Date.now() - startTime;
      log('info', `Mobile education transaction ${transaction.id} completed in ${totalTime}ms`);

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
      // ✅ Extract the original error message for logging
      const originalError = vendorError.message || 'Unknown vendor error';
      log('error', 'Mobile education purchase failed', originalError);
      
      // ✅ Get user-friendly error message
      const userFriendlyError = getUserFriendlyError(vendorError);
      
      // Log the mapping for debugging
      log('info', `Mapped error: "${originalError}" -> "${userFriendlyError}"`);

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
            error: originalError,
            userFriendlyError: userFriendlyError,
            failedAt: new Date().toISOString(),
            wasDebited: false,
            channel: "MOBILE_APP",
            channelDisplay: CHANNEL_DISPLAY,
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
          notes: `Failed: ${userFriendlyError}`,
          metadata: {
            serviceId: serviceId,
            variationCode: variationCode,
            quantity: quantity,
            billersCode: billersCode,
            source: "MobileEducationAPI",
            wasDebited: false,
            originalError: originalError,
            userFriendlyError: userFriendlyError,
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

      // ✅ Return user-friendly error to the mobile app
      return NextResponse.json({
        success: false,
        error: userFriendlyError,
        transactionId: transaction.id,
      }, { status: 500 });
    }

  } catch (error: any) {
    log('error', 'Top-level error', error.message);
    
    // ✅ Get user-friendly error for unexpected errors
    const userFriendlyError = getUserFriendlyError(error);
    
    return NextResponse.json({
      success: false,
      error: userFriendlyError,
    }, { status: 500 });
  }
}

// ✅ Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}