// app/api/vendors/qr-buy/route.ts - FIXED

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { CacheService } from "~/lib/cache/cache.service";
import { TransactionStatus, VtuType, CustomerType, MeterType, VtuVendor, RefundStatus } from "@prisma/client";
import { compare } from "bcrypt";

// ============================================================
// HELPERS
// ============================================================

function measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().then(result => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`⚠️ [PERF] ${name}: ${duration}ms (slow)`);
    } else {
      console.log(`✅ [PERF] ${name}: ${duration}ms`);
    }
    return result;
  });
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
  console.log(`💰 [REFUND] Processing refund for transaction ${transaction.id}`);

  const existingRefund = await prisma.refund.findFirst({
    where: { 
      transactionId: transaction.id,
      status: { not: 'CANCELLED' }
    }
  });

  if (existingRefund) {
    console.log(`⚠️ [REFUND] Refund already exists for transaction ${transaction.id}`);
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
      notes: `Refund initiated for transaction ${transaction.id} due to: ${reason}`,
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
          description: `Refund for failed QR purchase: ${reason}`,
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
          notes: `Refund completed successfully - amount: ${amount}`,
        },
      });
    });

    console.log(`✅ [REFUND] Refund ${refund.id} completed successfully`);

    await prisma.refundNotification.create({
      data: {
        refundId: refund.id,
        userId: user.id,
        type: "COMPLETED",
        channel: "MOBILE_PUSH",
        message: `Your refund of ₦${amount} for QR purchase has been processed successfully.`,
        metadata: {
          refundId: refund.id,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return refund;

  } catch (error: any) {
    console.error(`❌ [REFUND] Failed to process refund:`, error);

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
// ERROR HANDLERS
// ============================================================

async function handleQRVendorFailure(
  transaction: any,
  customer: any,
  user: any,
  serviceType: string,
  identifier: string,
  amount: number,
  result: any,
  vendorEnum: VtuVendor | null,
  vendorId: string | null
) {
  console.error(`❌ [QR BUY API] Vendor purchase failed: ${result?.error || 'Unknown error'}`);

  const wasDebited = transaction.totalDebited > 0;

  await prisma.vtuTransaction.update({
    where: { id: transaction.id },
    data: {
      status: TransactionStatus.FAILED,
      totalDebited: wasDebited ? transaction.totalDebited : 0,
      vendor: vendorEnum,
      vendorReference: result?.vendorReference || null,
      selectedVendorId: vendorId,
      fallbackAttempts: {
        increment: 1,
      },
      refundStatus: wasDebited ? RefundStatus.PENDING : RefundStatus.NONE,
      metadata: {
        ...transaction.metadata,
        error: result?.error || 'Unknown error',
        vendor: result?.vendor || null,
        vendorErrors: result?.vendorErrors || [],
        vendorSwitched: result?.vendorSwitched || false,
        switchedFrom: result?.switchedFrom || [],
        failedAt: new Date().toISOString(),
        pinVerified: true,
        vendorAttempts: result?.attempts || 1,
        responseData: result?.data || null,
        source: "QR_BUY_API",
        wasDebited: wasDebited,
        requiresRefund: wasDebited,
      },
    },
  });

  if (wasDebited) {
    console.log(`💰 [REFUND] Processing refund for vendor failure - transaction ${transaction.id}`);
    try {
      await processRefund(
        transaction,
        user,
        transaction.totalDebited,
        `Vendor failure: ${result?.error || 'QR purchase failed after debit'}`,
        "VENDOR_FAILURE"
      );
    } catch (refundError) {
      console.error(`❌ [REFUND] Failed to process refund:`, refundError);
    }
  }

  // ✅ FIX: Check if customer transaction already exists before creating
  try {
    const existingCustomerTx = await prisma.customerTransaction.findFirst({
      where: {
        vtuTransactionId: transaction.id,
      },
    });

    if (!existingCustomerTx) {
      await prisma.customerTransaction.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          vtuTransactionId: transaction.id,
          transactionType: serviceType === "electricity" ? VtuType.ELECTRICITY_INSTANT : VtuType.CABLE_TV,
          amount: amount,
          totalAmount: amount,
          product: serviceType === "electricity" 
            ? (transaction.metadata?.discoCode || "QR") 
            : (transaction.metadata?.provider || "QR"),
          meterNumber: serviceType === "electricity" ? identifier : null,
          phoneNumber: serviceType === "cable" ? user.phone : null,
          status: TransactionStatus.FAILED,
          notes: `Failed: ${result?.error || 'Vendor transaction failed'}${wasDebited ? ' (Refund processed)' : ''}`,
          metadata: {
            vendorName: result?.vendor || 'unknown',
            vendorReference: result?.vendorReference || '',
            vendorSwitched: result?.vendorSwitched || false,
            switchedFrom: result?.switchedFrom || [],
            pinVerified: true,
            failureReason: result?.error || 'Unknown error',
            vendorErrors: result?.vendorErrors || [],
            failedAt: new Date().toISOString(),
            refundProcessed: wasDebited,
            source: "QR_BUY_API",
          },
        },
      });
      console.log(`📝 [QR BUY API] Customer transaction recorded for failure`);
    } else {
      console.log(`⚠️ [QR BUY API] Customer transaction already exists for transaction ${transaction.id}, skipping`);
    }
  } catch (customerError) {
    console.error(`❌ [QR BUY API] Failed to create customer transaction record:`, customerError);
  }

  try {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalTransactions: { increment: 1 },
        lastTransactionAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (customerUpdateError) {
    console.error(`❌ [QR BUY API] Failed to update customer stats:`, customerUpdateError);
  }

  try {
    await Promise.all([
      CacheService.invalidateWallet(user.id),
      CacheService.invalidateUser(user.id),
      CacheService.invalidateCustomer(user.id, user.phone),
    ]);
  } catch (cacheError) {
    console.error(`❌ [QR BUY API] Failed to invalidate cache:`, cacheError);
  }
}

// ============================================================
// MAIN API ROUTE
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    console.log(`👤 [QR BUY API] User authenticated: ${sessionUser.id}`);

    const body = await request.json();
    const { 
      serviceType, 
      identifier, 
      amount, 
      pin,
      discoCode,
      meterType,
      provider,
      packageCode
    } = body;

    console.log(`📝 [QR BUY API] Request:`, JSON.stringify(body, null, 2));

    // Validate required fields
    if (!serviceType || !["electricity", "cable"].includes(serviceType)) {
      return NextResponse.json({
        success: false,
        error: "Service type must be 'electricity' or 'cable'",
      }, { status: 400 });
    }

    if (!identifier || identifier.length < 7) {
      return NextResponse.json({
        success: false,
        error: `Please enter a valid ${serviceType === 'electricity' ? 'meter' : 'decoder'} number (minimum 7 digits)`,
      }, { status: 400 });
    }

    if (!amount || amount < 100) {
      return NextResponse.json({
        success: false,
        error: "Minimum amount is ₦100",
      }, { status: 400 });
    }

    if (!pin || pin.length < 4) {
      return NextResponse.json({
        success: false,
        error: "Please enter your 4-6 digit transaction PIN",
      }, { status: 400 });
    }

    if (serviceType === "electricity" && !discoCode) {
      return NextResponse.json({
        success: false,
        error: "Please select a DisCo",
      }, { status: 400 });
    }

    if (serviceType === "cable" && !provider) {
      return NextResponse.json({
        success: false,
        error: "Please select a cable provider",
      }, { status: 400 });
    }

    // Get user and wallet
    const userData = await measure('User fetch', () => CacheService.getUser(sessionUser.id));
    
    let user = userData;
    if (!user || !user.wallet) {
      console.log(`📡 [QR BUY API] User not in cache, fetching from DB...`);
      user = await measure('User DB fetch', () => prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: { wallet: true },
      }));
    }

    if (!user || !user.wallet) {
      return NextResponse.json({
        success: false,
        error: "User or wallet not found",
      }, { status: 404 });
    }

    const walletBalance = Number(user.wallet.walletBalance);
    console.log(`💰 [QR BUY API] Wallet balance: ${walletBalance}, Amount: ${amount}`);

    // Get or create customer
    let customer = await measure('Customer fetch', () => CacheService.getCustomer(user.id, user.phone));
    
    if (!customer) {
      console.log(`📡 [QR BUY API] Customer not in cache, checking DB...`);
      customer = await measure('Customer DB fetch', async () => {
        const existing = await prisma.customer.findUnique({
          where: {
            userId_phone: {
              userId: user.id,
              phone: user.phone,
            },
          },
        });

        if (!existing) {
          return CacheService.createCustomer({
            userId: user.id,
            phone: user.phone,
            fullName: user.fullName,
            email: user.email || null,
            customerType: CustomerType.REGULAR,
            totalTransactions: 0,
            totalSpent: 0,
            totalCommissionEarned: 0,
            firstTransactionAt: new Date(),
            tags: [],
          });
        }
        return existing;
      });
      console.log(`👤 [QR BUY API] Customer ready: ${customer.id}`);
    }

    // ============================================================
    // CREATE TRANSACTION (totalDebited = 0 initially)
    // ============================================================

    const meterTypeEnum = serviceType === "electricity" 
      ? (meterType?.toLowerCase() === 'prepaid' ? MeterType.HOME : MeterType.OFFICE)
      : undefined;

    const transaction = await measure('Transaction creation', () => prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: serviceType === "electricity" ? VtuType.ELECTRICITY_INSTANT : VtuType.CABLE_TV,
        product: serviceType === "electricity" ? discoCode : provider,
        amount: amount,
        totalDebited: 0, // ✅ Start at 0 - only set on success
        meterNumber: serviceType === "electricity" ? identifier : undefined,
        meterType: meterTypeEnum,
        phoneNumber: serviceType === "cable" ? user.phone : undefined,
        networkPlan: serviceType === "cable" ? packageCode : undefined,
        status: TransactionStatus.PENDING,
        channel: "MOBILE_APP",
        metadata: {
          source: "QR_BUY_API",
          service: serviceType.toUpperCase(),
          timestamp: new Date().toISOString(),
          identifier: identifier,
          discoCode: discoCode,
          meterType: meterType,
          provider: provider,
          packageCode: packageCode,
          customerId: customer.id,
          pinVerified: false,
          attemptStage: "INITIALIZED",
          wasDebited: false,
          refundProcessed: false,
          qrPurchase: true,
        },
      },
    }));

    console.log(`📝 [QR BUY API] Transaction created: ${transaction.id}`);

    // ============================================================
    // VERIFY PIN
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
            error: `Account locked due to multiple failed PIN attempts. Try again in ${remainingMinutes} minutes.`,
            failedAt: new Date().toISOString(),
            wasDebited: false,
          },
        },
      });

      return NextResponse.json({
        success: false,
        error: `Account locked due to multiple failed PIN attempts. Please try again in ${remainingMinutes} minute(s).`,
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
        errorMessage = "Too many failed PIN attempts. Your account is locked for 15 minutes.";
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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    // ============================================================
    // CHECK BALANCE
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
            error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}, Required: ₦${amount.toFixed(2)}`,
            failedAt: new Date().toISOString(),
            wasDebited: false,
          },
        },
      });

      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}, Required: ₦${amount.toFixed(2)}`,
        transactionId: transaction.id,
      }, { status: 400 });
    }

    // ============================================================
    // PROCEED WITH VENDOR PURCHASE
    // ============================================================

    let vendorId: string | null = null;
    let vendorEnum: VtuVendor | null = null;
    let wasDebited = false;
    let vendorResult = null;

    // ✅ FIX: Declare saveMeterPromise at the correct scope
    let saveMeterPromise: Promise<any> | null = null;

    if (serviceType === "electricity") {
      saveMeterPromise = (async () => {
        try {
          const existingMeter = await prisma.savedMeter.findFirst({
            where: {
              userId: user.id,
              meterNumber: identifier,
            },
          });

          if (!existingMeter) {
            await prisma.savedMeter.create({
              data: {
                userId: user.id,
                meterNumber: identifier,
                disco: discoCode || "QR",
                name: `${discoCode || "QR"} Meter`,
                meterType: meterType || "Prepaid",
                isDefault: false,
              },
            });
            await CacheService.invalidateSavedMeters(user.id);
            console.log(`✅ [QR BUY API] Saved meter: ${identifier}`);
          }
        } catch (saveError) {
          console.error("❌ [QR BUY API] Failed to save meter:", saveError);
        }
      })();
    }

    try {
      const vendorService = getVendorService();
      console.log(`🔄 [QR BUY API] Calling vendor service for ${serviceType}...`);

      if (serviceType === "electricity") {
        vendorResult = await vendorService.buyElectricity(
          {
            meterNumber: identifier,
            amount: amount,
            discoCode: discoCode || "ABUJA",
            meterType: meterType || "Prepaid",
            phone: user.phone,
          },
          user.id
        );
      } else if (serviceType === "cable") {
        vendorResult = await vendorService.buyCableTV(
          {
            decoderNumber: identifier,
            packageCode: packageCode || "STANDARD",
            provider: provider || "DSTV",
            amount: amount,
            phone: user.phone,
          },
          user.id
        );
      }

      console.log(`📊 [QR BUY API] Vendor result:`, {
        success: vendorResult?.success,
        error: vendorResult?.error,
        vendor: vendorResult?.vendor,
        vendorReference: vendorResult?.vendorReference,
      });

      vendorEnum = mapVendorToEnum(vendorResult?.vendor);
      if (!vendorEnum) {
        console.warn(`⚠️ [QR BUY API] Unknown vendor: ${vendorResult?.vendor}, defaulting to VTPASS`);
        vendorEnum = VtuVendor.VTPASS;
      }

      if (vendorResult?.vendor) {
        const vendorRecord = await prisma.vendor.findFirst({
          where: { code: vendorResult.vendor as string },
          select: { id: true },
        });
        if (vendorRecord) {
          vendorId = vendorRecord.id;
        }
      }

      if (vendorResult?.success) {
        // ✅ SUCCESS
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

        // Process wallet debit and update transaction
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
              reference: `QR_${transaction.id}`,
              description: `QR Purchase: ${serviceType} for ${identifier}`,
              status: TransactionStatus.SUCCESS,
              category: serviceType === "electricity" ? "ELECTRICITY" : "CABLE_TV",
            },
          }),
          prisma.vtuTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.SUCCESS,
              totalDebited: amount,
              vendorReference: vendorResult.vendorReference,
              vendorId: vendorId || undefined,
              vendor: vendorEnum,
              token: vendorResult.data?.token,
              deliveredAt: new Date(),
              metadata: {
                ...transaction.metadata,
                vendorResponse: vendorResult.data,
                vendorName: vendorResult.vendor,
                vendorReference: vendorResult.vendorReference,
                success: true,
                pinVerified: true,
                completedAt: new Date().toISOString(),
                wasDebited: true,
                qrPurchase: true,
              },
            },
          }),
        ]);

        // ✅ FIX: Check if customer transaction already exists before creating
        const existingCustomerTx = await prisma.customerTransaction.findFirst({
          where: {
            vtuTransactionId: transaction.id,
          },
        });

        if (!existingCustomerTx) {
          await prisma.customerTransaction.create({
            data: {
              customerId: customer.id,
              userId: user.id,
              vtuTransactionId: transaction.id,
              transactionType: serviceType === "electricity" ? VtuType.ELECTRICITY_INSTANT : VtuType.CABLE_TV,
              amount: amount,
              totalAmount: amount,
              product: serviceType === "electricity" ? (discoCode || "QR") : `${provider || "QR"} - ${packageCode || "STANDARD"}`,
              meterNumber: serviceType === "electricity" ? identifier : null,
              phoneNumber: serviceType === "cable" ? user.phone : null,
              planName: serviceType === "cable" ? (packageCode || "STANDARD") : null,
              status: TransactionStatus.SUCCESS,
              metadata: {
                serviceType: serviceType,
                identifier: identifier,
                pinVerified: true,
                qrPurchase: true,
                vendor: vendorResult.vendor,
                vendorReference: vendorResult.vendorReference,
                token: vendorResult.data?.token,
                completedAt: new Date().toISOString(),
                ...(serviceType === "electricity" ? { meterType: meterType } : { provider: provider }),
              },
            },
          });
          console.log(`📝 [QR BUY API] Customer transaction recorded for success`);
        } else {
          console.log(`⚠️ [QR BUY API] Customer transaction already exists for transaction ${transaction.id}, skipping`);
        }

        // ✅ Wait for meter save if applicable
        if (saveMeterPromise) {
          await saveMeterPromise;
        }

        // Invalidate cache
        await Promise.all([
          CacheService.invalidateWallet(user.id),
          CacheService.invalidateUser(user.id),
          CacheService.invalidateCustomer(user.id, user.phone),
        ]);

        const totalTime = Date.now() - startTime;
        console.log(`✅ [QR BUY API] Transaction completed in ${totalTime}ms`);

        return NextResponse.json({
          success: true,
          data: {
            transactionId: transaction.id,
            reference: transaction.id,
            vendorReference: vendorResult.vendorReference,
            amount: amount,
            identifier: identifier,
            serviceType: serviceType,
            token: vendorResult.data?.token || "TOKEN_GENERATED",
            customerId: customer.id,
            isNewCustomer: customer.totalTransactions === 0,
            vendor: vendorResult.vendor,
            ...vendorResult.data,
          },
        });

      } else {
        // ❌ VENDOR FAILURE
        await handleQRVendorFailure(
          transaction,
          customer,
          user,
          serviceType,
          identifier,
          amount,
          vendorResult,
          vendorEnum,
          vendorId
        );

        const totalTime = Date.now() - startTime;
        console.error(`❌ [QR BUY API] Vendor purchase failed after ${totalTime}ms`);

        return NextResponse.json({
          success: false,
          error: vendorResult?.error || "Vendor transaction failed",
          transactionId: transaction.id,
          vendor: vendorResult?.vendor,
          vendorReference: vendorResult?.vendorReference,
        }, { status: 500 });
      }

    } catch (error: any) {
      // ❌ UNEXPECTED ERROR
      await handleQRVendorFailure(
        transaction,
        customer,
        user,
        serviceType,
        identifier,
        amount,
        { error: error.message || "Unknown error" },
        vendorEnum,
        vendorId
      );

      const totalTime = Date.now() - startTime;
      console.error(`❌ [QR BUY API] Transaction failed with error after ${totalTime}ms`);

      return NextResponse.json({
        success: false,
        error: error.message || "Purchase failed. Please try again.",
        transactionId: transaction.id,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error(`❌ [QR BUY API] Unexpected top-level error:`, error);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred",
    }, { status: 500 });
  }
}