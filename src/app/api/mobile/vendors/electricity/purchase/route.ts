// src/app/api/mobile/vendors/electricity/purchase/route.ts
// UPDATED - Increased timeout, better error handling, customer data support

import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { CacheService } from "~/lib/cache/cache.service";
import { TransactionStatus, VtuType, CustomerType, MeterType, VtuVendor, RefundStatus, ChannelType } from "@prisma/client";
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

function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
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
    console.error("❌ [MOBILE ELECTRICITY PURCHASE] Token verification failed:", error);
    return null;
  }
}

// ============================================================
// SAVE METER HELPER (UPDATED WITH COMPLETE INFO)
// ============================================================

async function saveMeterAsync(
  userId: string, 
  meterNumber: string, 
  disco: string, 
  meterType: string,
  customerName?: string,
  customerAddress?: string,
  customerPhone?: string,
  customerEmail?: string,
  meterStatus?: string,
  lastVerified?: Date
) {
  try {
    const existing = await prisma.savedMeter.findFirst({
      where: { userId, meterNumber },
    });

    const data = {
      userId,
      meterNumber,
      disco,
      meterType: meterType || "Prepaid",
      customerName: customerName || null,
      customerAddress: customerAddress || null,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      meterStatus: meterStatus || null,
      lastVerified: lastVerified || new Date(),
      isDefault: existing?.isDefault || false,
    };

    if (existing) {
      await prisma.savedMeter.update({
        where: { id: existing.id },
        data: {
          disco,
          meterType: meterType || "Prepaid",
          customerName: customerName || existing.customerName,
          customerAddress: customerAddress || existing.customerAddress,
          customerPhone: customerPhone || existing.customerPhone,
          customerEmail: customerEmail || existing.customerEmail,
          meterStatus: meterStatus || existing.meterStatus,
          lastVerified: lastVerified || new Date(),
        },
      });
      log('debug', `✅ Meter updated with customer info: ${meterNumber} - ${customerName || 'No name'}`);
    } else {
      await prisma.savedMeter.create({ data });
      log('debug', `✅ Meter saved with customer info: ${meterNumber} - ${customerName || 'No name'}`);
    }

    await CacheService.invalidateSavedMeters(userId).catch(() => {});
  } catch (error) {
    log('error', '❌ Failed to save meter:', error);
  }
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
          description: `Refund for failed electricity purchase: ${reason}`,
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
        message: `Your refund of ₦${amount} for electricity purchase has been processed.`,
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
// MAIN API ROUTE - UPDATED WITH INCREASED TIMEOUT
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

    // 2. Parse request body
    const body = await request.json();
    let { 
      meterNumber, 
      meterType, 
      amount, 
      discoCode, 
      phone, 
      pin,
      customerName,
      customerAddress,
      customerPhone: customerPhoneFromFrontend,
      customerEmail,
      meterStatus,
    } = body;

    // Log customer data if provided
    if (customerName) {
      log('info', `📝 Customer data received: ${customerName} (${meterNumber})`);
    }

    // 3. Validate request
    if (!meterNumber || meterNumber.length < 7) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid meter number (minimum 7 digits)",
      }, { status: 400 });
    }

    if (!amount || amount < 100) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid amount (minimum ₦100)",
      }, { status: 400 });
    }

    if (!discoCode) {
      return NextResponse.json({
        success: false,
        error: "Please select a DisCo",
      }, { status: 400 });
    }

    if (!pin || pin.length < 4) {
      return NextResponse.json({
        success: false,
        error: "Please enter your 4-6 digit transaction PIN",
      }, { status: 400 });
    }

    // ============================================================
    // STATIC CHANNEL - Always MOBILE_APP for mobile routes
    // ============================================================
    const CHANNEL_ENUM = ChannelType.MOBILE_APP;
    const CHANNEL_DISPLAY = "MOBILE_APP";

    // ============================================================
    // 4. PARALLEL FETCH: user + customer + balance
    // ============================================================

    const userPhone = phone || decoded.phone || '';
    const normalizedPhone = normalizePhoneNumber(userPhone);

    const [cachedUser, cachedCustomer, cachedBalance] = await Promise.all([
      CacheService.getUser(userId).catch(() => null),
      CacheService.getCustomer(userId, normalizedPhone).catch(() => null),
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
            phone: normalizedPhone || user.phone,
          },
        },
      });

      if (!customer) {
        customer = await CacheService.createCustomer({
          userId: user.id,
          phone: normalizedPhone || user.phone,
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
        CacheService.setCustomer(user.id, normalizedPhone || user.phone, customer).catch(() => {});
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
    // 5. CREATE TRANSACTION RECORD - channelDisplay = "MOBILE_APP"
    // ============================================================

    const meterTypeEnum = meterType?.toLowerCase() === 'prepaid' 
      ? MeterType.HOME 
      : MeterType.OFFICE;

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.ELECTRICITY_INSTANT,
        product: discoCode,
        amount: amount,
        totalDebited: 0,
        meterNumber: meterNumber,
        meterType: meterTypeEnum,
        status: TransactionStatus.PENDING,
        channel: CHANNEL_ENUM,
        channelDisplay: CHANNEL_DISPLAY,
        metadata: {
          source: "MobileElectricityAPI",
          timestamp: new Date().toISOString(),
          discoCode: discoCode,
          meterType: meterType,
          customerId: customer.id,
          pinVerified: false,
          wasDebited: false,
          channel: "MOBILE_APP",
          channelDisplay: CHANNEL_DISPLAY,
          customerData: {
            name: customerName || null,
            address: customerAddress || null,
            phone: customerPhoneFromFrontend || null,
            email: customerEmail || null,
            status: meterStatus || null,
          },
        },
      },
    });

    // ============================================================
    // 6. PIN VERIFICATION
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
            wasDebited: false,
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
            wasDebited: false,
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
            wasDebited: false,
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
    // 7. Check balance
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

      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}`,
        transactionId: transaction.id,
      }, { status: 400 });
    }

    // ============================================================
    // 8. SAVE METER WITH CUSTOMER DATA (non-blocking)
    // ============================================================

    saveMeterAsync(
      user.id, 
      meterNumber, 
      discoCode, 
      meterType || 'Prepaid',
      customerName || null,
      customerAddress || null,
      customerPhoneFromFrontend || null,
      customerEmail || null,
      meterStatus || null,
      new Date()
    ).catch(() => {});

    // ============================================================
    // 9. VENDOR PURCHASE - INCREASED TIMEOUT TO 60 SECONDS
    // ============================================================

    let vendorId: string | null = null;
    let vendorEnum: VtuVendor | null = null;
    let vendorCommission: number | null = null;
    let vendorTotalAmount: number | null = null;
    let commissionRate: number | null = null;
    let commissionType: string | null = null;
    let commissionDetails: any = null;
    let costPrice: number | null = null;
    let grossProfit: number | null = null;
    let profitMargin: number | null = null;
    let platformCommission: number | null = null;
    let vendorResult = null;

    try {
      const vendorService = getVendorService();

      // ✅ INCREASED TIMEOUT TO 60 SECONDS (matching web)
      const TIMEOUT_MS = 60000;
      
      const vendorPromise = vendorService.buyElectricity(
        {
          meterNumber: meterNumber,
          amount: amount,
          discoCode: discoCode,
          meterType: meterType || 'Prepaid',
          phone: normalizedPhone || user.phone,
        },
        user.id
      );

      // Race with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Vendor timeout after 60 seconds')), TIMEOUT_MS);
      });

      const result = await Promise.race([vendorPromise, timeoutPromise]) as any;
      vendorResult = result;

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
              description: `Electricity purchase for ${meterNumber} (${discoCode})`,
              status: TransactionStatus.SUCCESS,
              category: "ELECTRICITY",
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
              // channelDisplay already set on creation
              metadata: {
                ...transaction.metadata,
                vendorResponse: result.data,
                vendorName: result.vendor,
                vendorReference: result.vendorReference,
                vendorSwitched: result.vendorSwitched,
                switchedFrom: result.switchedFrom,
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
              transactionType: VtuType.ELECTRICITY_INSTANT,
              amount: amount,
              totalAmount: amount,
              product: discoCode,
              meterNumber: meterNumber,
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
                token: result.data?.token,
                meterType: meterType,
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
                customerData: {
                  name: customerName || null,
                  address: customerAddress || null,
                  phone: customerPhoneFromFrontend || null,
                  email: customerEmail || null,
                  status: meterStatus || null,
                },
              },
            },
          }),
        ]);

        // ============================================================
        // SAVE METER WITH CUSTOMER DATA FROM FRONTEND (already done above)
        // ============================================================

        log('info', `📝 Customer data saved for meter ${meterNumber}: ${customerName || 'No name'}`);

        // Invalidate cache
        await Promise.all([
          CacheService.invalidateWallet(user.id),
          CacheService.invalidateUser(user.id),
          CacheService.invalidateCustomer(user.id, normalizedPhone || user.phone),
          CacheService.invalidateSavedMeters(user.id),
        ]);

        const totalTime = Date.now() - startTime;
        log('info', `Mobile electricity transaction ${transaction.id} completed in ${totalTime}ms`);

        return NextResponse.json({
          success: true,
          data: {
            transactionId: transaction.id,
            reference: transaction.id,
            vendorReference: result.vendorReference,
            amount: amount,
            discoCode: discoCode,
            meterNumber: meterNumber,
            token: result.data?.token,
            customerId: customer.id,
            isNewCustomer: customer.totalTransactions === 0,
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
            customerInfo: {
              name: customerName,
              address: customerAddress,
              phone: customerPhoneFromFrontend,
              email: customerEmail,
              status: meterStatus,
            },
            ...result.data,
          },
        });
      } else {
        // Vendor failed - no debit
        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            totalDebited: 0,
            vendor: vendorEnum,
            vendorReference: result.vendorReference || null,
            selectedVendorId: vendorId,
            failedVendors: result.vendorErrors || [],
            // channelDisplay already set on creation
            metadata: {
              ...transaction.metadata,
              error: result.error || "Vendor transaction failed",
              vendor: result.vendor,
              vendorErrors: result.vendorErrors || [],
              vendorSwitched: result.vendorSwitched || false,
              switchedFrom: result.switchedFrom || [],
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
            transactionType: VtuType.ELECTRICITY_INSTANT,
            amount: amount,
            totalAmount: amount,
            product: discoCode,
            meterNumber: meterNumber,
            status: TransactionStatus.FAILED,
            notes: `Vendor failure: ${result.error || "Unknown error"}`,
            metadata: {
              vendorName: result.vendor || 'unknown',
              vendorReference: result.vendorReference || '',
              failureReason: result.error,
              vendorErrors: result.vendorErrors || [],
              meterType: meterType,
              failedAt: new Date().toISOString(),
              customerData: {
                name: customerName || null,
                address: customerAddress || null,
                phone: customerPhoneFromFrontend || null,
                email: customerEmail || null,
                status: meterStatus || null,
              },
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
        }, { status: 500 });
      }
    } catch (error: any) {
      // Check if this was a timeout error but we might have a successful result
      if (error.message?.includes('timeout') && vendorResult) {
        log('warn', 'Vendor request timed out but we have a result - processing anyway');
        
        // If we have a vendorResult, process it as success
        if (vendorResult.success) {
          // Process the successful result quickly
          log('info', `Processing timed-out vendor result for transaction ${transaction.id}`);
          
          // We'll return a success response with the vendor data
          return NextResponse.json({
            success: true,
            data: {
              transactionId: transaction.id,
              reference: transaction.id,
              vendorReference: vendorResult.vendorReference,
              amount: amount,
              discoCode: discoCode,
              meterNumber: meterNumber,
              token: vendorResult.data?.token || "TOKEN_GENERATED",
              channel: CHANNEL_DISPLAY,
              warning: "Request timed out but vendor transaction succeeded",
              customerInfo: {
                name: customerName,
                address: customerAddress,
                phone: customerPhoneFromFrontend,
                email: customerEmail,
                status: meterStatus,
              },
              ...vendorResult.data,
            },
          });
        }
      }

      // Unexpected error
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          totalDebited: 0,
          vendor: vendorEnum || VtuVendor.VTPASS,
          selectedVendorId: vendorId,
          // channelDisplay already set on creation
          metadata: {
            ...transaction.metadata,
            error: error.message || "Unknown error",
            failedAt: new Date().toISOString(),
            pinVerified: true,
            errorType: error.name || 'UnknownError',
            wasDebited: false,
          },
        },
      });

      await prisma.customerTransaction.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          vtuTransactionId: transaction.id,
          transactionType: VtuType.ELECTRICITY_INSTANT,
          amount: amount,
          totalAmount: amount,
          product: discoCode,
          meterNumber: meterNumber,
          status: TransactionStatus.FAILED,
          notes: `System Error: ${error.message || 'Unknown error'}`,
          metadata: {
            pinVerified: true,
            failureReason: error.message,
            errorType: error.name,
            meterType: meterType,
            failedAt: new Date().toISOString(),
            customerData: {
              name: customerName || null,
              address: customerAddress || null,
              phone: customerPhoneFromFrontend || null,
              email: customerEmail || null,
              status: meterStatus || null,
            },
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

      log('error', 'Mobile electricity purchase failed', error.message);

      return NextResponse.json({
        success: false,
        error: error.message || "Purchase failed. Please try again.",
        transactionId: transaction.id,
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