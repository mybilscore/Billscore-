// src/app/api/mobile/vendors/cable/purchase/route.ts
// UPDATED VERSION - With customer info saving and channelDisplay

import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { CacheService } from "~/lib/cache/cache.service";
import { TransactionStatus, VtuType, CustomerType, VtuVendor, ChannelType } from "@prisma/client";
import { compare } from "bcrypt";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

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
// SAVE DECODER HELPER (UPDATED WITH COMPLETE INFO)
// ============================================================

async function saveDecoderAsync(
  userId: string, 
  decoderNumber: string, 
  provider: string, 
  packageCode: string,
  customerName?: string,
  customerAddress?: string,
  customerPhone?: string,
  customerEmail?: string,
  decoderStatus?: string,
  lastVerified?: Date
) {
  try {
    const existing = await prisma.savedDecoder.findFirst({
      where: { userId, decoderNumber },
    });

    const data = {
      userId,
      decoderNumber,
      provider: provider,
      name: `${provider} Decoder`,
      package: packageCode || "Standard",
      customerName: customerName || null,
      customerAddress: customerAddress || null,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      decoderStatus: decoderStatus || null,
      lastVerified: lastVerified || new Date(),
      isDefault: existing?.isDefault || false,
    };

    if (existing) {
      await prisma.savedDecoder.update({
        where: { id: existing.id },
        data: {
          provider,
          package: packageCode || "Standard",
          customerName: customerName || existing.customerName,
          customerAddress: customerAddress || existing.customerAddress,
          customerPhone: customerPhone || existing.customerPhone,
          customerEmail: customerEmail || existing.customerEmail,
          decoderStatus: decoderStatus || existing.decoderStatus,
          lastVerified: lastVerified || new Date(),
        },
      });
      console.log(`✅ [MOBILE CABLE API] Decoder updated with customer info: ${decoderNumber}`);
    } else {
      await prisma.savedDecoder.create({ data });
      console.log(`✅ [MOBILE CABLE API] Decoder saved with customer info: ${decoderNumber}`);
    }

    await CacheService.invalidateSavedDecoders(userId).catch(() => {});
  } catch (error) {
    console.error('❌ [MOBILE CABLE API] Failed to save decoder:', error);
  }
}

// ============================================================
// HELPER FUNCTIONS FOR ERROR HANDLING
// ============================================================

async function handleMobileCableVendorFailure(
  transaction: any,
  customer: any,
  user: any,
  smartCardNumber: string,
  provider: string,
  packageCode: string,
  amount: number,
  result: any,
  vendorEnum: VtuVendor | null,
  vendorId: string | null
) {
  console.error(`❌ [MOBILE CABLE API] Vendor purchase failed: ${result.error}`);

  // Mark transaction as failed with complete details
  await prisma.vtuTransaction.update({
    where: { id: transaction.id },
    data: {
      status: TransactionStatus.FAILED,
      vendor: vendorEnum,
      vendorReference: result.vendorReference || null,
      selectedVendorId: vendorId,
      vendorPriorityUsed: result.vendorPriorityUsed || 0,
      fallbackAttempts: {
        increment: 1,
      },
      failedVendors: result.vendorErrors || [],
      channel: ChannelType.MOBILE_APP,
      channelDisplay: "MOBILE_APP",
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
        source: "MobileCableAPI",
        channel: "MOBILE_APP",
        channelDisplay: "MOBILE_APP",
      },
    },
  });

  // Create failed customer transaction
  try {
    await prisma.customerTransaction.create({
      data: {
        customerId: customer.id,
        userId: user.id,
        vtuTransactionId: transaction.id,
        transactionType: VtuType.CABLE_TV,
        amount: amount,
        totalAmount: amount,
        product: `${provider} - ${packageCode}`,
        phoneNumber: user.phone,
        network: null,
        planName: packageCode,
        status: TransactionStatus.FAILED,
        notes: `Failed: ${result.error || 'Vendor transaction failed'}`,
        metadata: {
          vendorName: result.vendor || 'unknown',
          vendorReference: result.vendorReference || '',
          vendorSwitched: result.vendorSwitched || false,
          switchedFrom: result.switchedFrom || [],
          pinVerified: true,
          failureReason: result.error,
          vendorErrors: result.vendorErrors || [],
          smartCardNumber: smartCardNumber,
          provider: provider,
          failedAt: new Date().toISOString(),
          source: "MobileCableAPI",
        },
      },
    });
    console.log(`📝 [MOBILE CABLE API] Failed customer transaction recorded for customer ${customer.id}`);
  } catch (customerError) {
    console.error(`❌ [MOBILE CABLE API] Failed to create customer transaction record:`, customerError);
  }

  // Update customer stats for failed attempt
  try {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalTransactions: { increment: 1 },
        lastTransactionAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`📝 [MOBILE CABLE API] Customer transaction count updated for failed attempt`);
  } catch (customerUpdateError) {
    console.error(`❌ [MOBILE CABLE API] Failed to update customer stats:`, customerUpdateError);
  }

  // Invalidate cache even on failure
  try {
    await Promise.all([
      CacheService.invalidateWallet(user.id),
      CacheService.invalidateUser(user.id),
      CacheService.invalidateCustomer(user.id, user.phone),
      CacheService.invalidateSavedDecoders(user.id),
    ]);
    console.log(`📝 [MOBILE CABLE API] Cache invalidated after failure`);
  } catch (cacheError) {
    console.error(`❌ [MOBILE CABLE API] Failed to invalidate cache:`, cacheError);
  }
}

async function handleMobileCableUnexpectedError(
  transaction: any,
  customer: any,
  user: any,
  smartCardNumber: string,
  provider: string,
  packageCode: string,
  amount: number,
  error: any,
  vendorEnum: VtuVendor | null,
  vendorId: string | null
) {
  console.error(`❌ [MOBILE CABLE API] Unexpected error:`, error);

  // Get vendor info if available from the error
  const errorVendor = error.vendor || error.vendorName || null;
  const errorVendorEnum = errorVendor ? mapVendorToEnum(errorVendor) : vendorEnum || null;
  
  if (errorVendor) {
    try {
      const vendorRecord = await prisma.vendor.findFirst({
        where: { code: errorVendor as string },
        select: { id: true },
      });
      if (vendorRecord) {
        vendorId = vendorRecord.id;
      }
    } catch (vendorLookupError) {
      console.error(`❌ [MOBILE CABLE API] Failed to look up vendor:`, vendorLookupError);
    }
  }

  // Mark transaction as failed with complete error info
  try {
    await prisma.vtuTransaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.FAILED,
        vendor: errorVendorEnum || vendorEnum || VtuVendor.VTPASS,
        selectedVendorId: vendorId,
        fallbackAttempts: {
          increment: 1,
        },
        channel: ChannelType.MOBILE_APP,
        channelDisplay: "MOBILE_APP",
        metadata: {
          ...transaction.metadata,
          error: error.message || "Unknown error",
          errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          failedAt: new Date().toISOString(),
          pinVerified: true,
          errorType: error.name || 'UnknownError',
          errorCode: error.code || null,
          vendor: errorVendor || null,
          source: "MobileCableAPI",
          channel: "MOBILE_APP",
          channelDisplay: "MOBILE_APP",
        },
      },
    });
    console.log(`📝 [MOBILE CABLE API] Transaction marked as failed in database`);
  } catch (updateError) {
    console.error(`❌ [MOBILE CABLE API] Failed to update transaction status:`, updateError);
  }

  // Record failed customer transaction for unexpected errors
  try {
    await prisma.customerTransaction.create({
      data: {
        customerId: customer.id,
        userId: user.id,
        vtuTransactionId: transaction.id,
        transactionType: VtuType.CABLE_TV,
        amount: amount,
        totalAmount: amount,
        product: `${provider} - ${packageCode}`,
        phoneNumber: user.phone,
        network: null,
        planName: packageCode,
        status: TransactionStatus.FAILED,
        notes: `System Error: ${error.message || 'Unknown error'}`,
        metadata: {
          pinVerified: true,
          failureReason: error.message,
          errorType: error.name,
          errorCode: error.code,
          smartCardNumber: smartCardNumber,
          provider: provider,
          failedAt: new Date().toISOString(),
          vendor: errorVendor || null,
          source: "MobileCableAPI",
        },
      },
    });
    console.log(`📝 [MOBILE CABLE API] Failed customer transaction recorded for unexpected error`);
  } catch (customerError) {
    console.error(`❌ [MOBILE CABLE API] Failed to create customer transaction record:`, customerError);
  }

  // Update customer stats for failed attempt
  try {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalTransactions: { increment: 1 },
        lastTransactionAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`📝 [MOBILE CABLE API] Customer stats updated for error case`);
  } catch (customerUpdateError) {
    console.error(`❌ [MOBILE CABLE API] Failed to update customer stats:`, customerUpdateError);
  }

  // Invalidate cache even on error
  try {
    await Promise.all([
      CacheService.invalidateWallet(user.id),
      CacheService.invalidateUser(user.id),
      CacheService.invalidateCustomer(user.id, user.phone),
      CacheService.invalidateSavedDecoders(user.id),
    ]);
    console.log(`📝 [MOBILE CABLE API] Cache invalidated after error`);
  } catch (cacheError) {
    console.error(`❌ [MOBILE CABLE API] Failed to invalidate cache:`, cacheError);
  }
}

// ============================================================
// MAIN API ROUTE
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
    console.log(`👤 [MOBILE CABLE API] User authenticated: ${userId}`);

    // 2. Parse request body
    const body = await request.json();
    let { smartCardNumber, packageCode, provider, amount, pin } = body;

    // 3. Validate request (basic validation first)
    if (!smartCardNumber || smartCardNumber.length < 10) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid smart card number (minimum 10 digits)",
      }, { status: 400 });
    }

    if (!packageCode) {
      return NextResponse.json({
        success: false,
        error: "Please select a package",
      }, { status: 400 });
    }

    if (!amount || amount < 100) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid amount (minimum ₦100)",
      }, { status: 400 });
    }

    if (!provider) {
      return NextResponse.json({
        success: false,
        error: "Please select a provider",
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
    const CHANNEL_DISPLAY = "MOBILE_APP";

    // ✅ 4. Get user with cache
    let user = await CacheService.getUser(userId);
    
    if (!user || !user.wallet) {
      console.log(`📡 [MOBILE CABLE API] User not in cache, fetching from DB...`);
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });
    }

    if (!user || !user.wallet) {
      return NextResponse.json({
        success: false,
        error: "User or wallet not found",
      }, { status: 404 });
    }

    // ✅ 5. Get or create customer (needed for transaction recording)
    let customer = await CacheService.getCustomer(user.id, user.phone);
    
    if (!customer) {
      console.log(`📡 [MOBILE CABLE API] Customer not in cache, checking DB...`);
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
          fullName: user.fullName,
          email: user.email || null,
          customerType: CustomerType.REGULAR,
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        });
        console.log(`👤 [MOBILE CABLE API] New customer created: ${customer.id}`);
      }
    }

    // ✅ 6. CREATE TRANSACTION RECORD FIRST (BEFORE PIN VERIFICATION)
    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.CABLE_TV,
        product: `${provider} - ${packageCode}`,
        amount: amount,
        totalDebited: amount,
        phoneNumber: user.phone,
        network: null,
        networkPlan: packageCode,
        status: TransactionStatus.PENDING,
        channel: ChannelType.MOBILE_APP,
        channelDisplay: CHANNEL_DISPLAY,
        metadata: {
          source: "MobileCableAPI",
          service: "CABLE_TV",
          timestamp: new Date().toISOString(),
          provider: provider,
          packageCode: packageCode,
          smartCardNumber: smartCardNumber,
          customerId: customer.id,
          pinVerified: false,
          attemptStage: "INITIALIZED",
          channel: "MOBILE_APP",
          channelDisplay: CHANNEL_DISPLAY,
        },
      },
    });
    console.log(`📝 [MOBILE CABLE API] Transaction created: ${transaction.id}`);

    // ✅ 7. Now verify PIN (after transaction is created)
    const cachedBalance = await CacheService.getBalance(userId);
    const walletBalance = cachedBalance?.balance ?? Number(user.wallet.walletBalance || 0);

    // Check PIN is locked
    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
      
      // ✅ Update transaction with PIN error
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          channelDisplay: CHANNEL_DISPLAY,
          metadata: {
            ...transaction.metadata,
            pinVerified: false,
            failureReason: "ACCOUNT_LOCKED",
            error: `Account locked due to multiple failed PIN attempts. Try again in ${remainingMinutes} minutes.`,
            failedAt: new Date().toISOString(),
            remainingMinutes: remainingMinutes,
            source: "MobileCableAPI",
            channel: "MOBILE_APP",
            channelDisplay: CHANNEL_DISPLAY,
          },
        },
      });

      // ✅ Create failed customer transaction
      await prisma.customerTransaction.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          vtuTransactionId: transaction.id,
          transactionType: VtuType.CABLE_TV,
          amount: amount,
          totalAmount: amount,
          product: `${provider} - ${packageCode}`,
          phoneNumber: user.phone,
          network: null,
          planName: packageCode,
          status: TransactionStatus.FAILED,
          notes: `Account locked: ${remainingMinutes} minutes remaining`,
          metadata: {
            failureReason: "ACCOUNT_LOCKED",
            pinVerified: false,
            remainingMinutes: remainingMinutes,
            smartCardNumber: smartCardNumber,
            provider: provider,
            failedAt: new Date().toISOString(),
            source: "MobileCableAPI",
          },
        },
      });

      return NextResponse.json({
        success: false,
        error: `Account locked due to multiple failed PIN attempts. Please try again in ${remainingMinutes} minute(s).`,
        transactionId: transaction.id,
      }, { status: 403 });
    }

    // Verify PIN
    if (!user.pinHash) {
      // ✅ Update transaction with PIN error
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          channelDisplay: CHANNEL_DISPLAY,
          metadata: {
            ...transaction.metadata,
            pinVerified: false,
            failureReason: "NO_PIN_SET",
            error: "Transaction PIN not set",
            failedAt: new Date().toISOString(),
            source: "MobileCableAPI",
            channel: "MOBILE_APP",
            channelDisplay: CHANNEL_DISPLAY,
          },
        },
      });

      // ✅ Create failed customer transaction
      await prisma.customerTransaction.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          vtuTransactionId: transaction.id,
          transactionType: VtuType.CABLE_TV,
          amount: amount,
          totalAmount: amount,
          product: `${provider} - ${packageCode}`,
          phoneNumber: user.phone,
          network: null,
          planName: packageCode,
          status: TransactionStatus.FAILED,
          notes: "No transaction PIN set",
          metadata: {
            failureReason: "NO_PIN_SET",
            pinVerified: false,
            smartCardNumber: smartCardNumber,
            provider: provider,
            failedAt: new Date().toISOString(),
            source: "MobileCableAPI",
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
      // Update pin attempts
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

      // ✅ Update transaction with PIN error
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          channelDisplay: CHANNEL_DISPLAY,
          metadata: {
            ...transaction.metadata,
            pinVerified: false,
            failureReason: "INVALID_PIN",
            pinAttempts: updatedUser.pinAttempts,
            attemptsLeft: attemptsLeft,
            error: errorMessage,
            failedAt: new Date().toISOString(),
            source: "MobileCableAPI",
            channel: "MOBILE_APP",
            channelDisplay: CHANNEL_DISPLAY,
          },
        },
      });

      // ✅ Create failed customer transaction
      await prisma.customerTransaction.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          vtuTransactionId: transaction.id,
          transactionType: VtuType.CABLE_TV,
          amount: amount,
          totalAmount: amount,
          product: `${provider} - ${packageCode}`,
          phoneNumber: user.phone,
          network: null,
          planName: packageCode,
          status: TransactionStatus.FAILED,
          notes: `Invalid PIN: ${attemptsLeft} attempts remaining`,
          metadata: {
            failureReason: "INVALID_PIN",
            pinVerified: false,
            pinAttempts: updatedUser.pinAttempts,
            attemptsLeft: attemptsLeft,
            smartCardNumber: smartCardNumber,
            provider: provider,
            failedAt: new Date().toISOString(),
            source: "MobileCableAPI",
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

    // ✅ PIN verified - update transaction
    await prisma.vtuTransaction.update({
      where: { id: transaction.id },
      data: {
        metadata: {
          ...transaction.metadata,
          pinVerified: true,
          pinVerifiedAt: new Date().toISOString(),
          source: "MobileCableAPI",
          channel: "MOBILE_APP",
          channelDisplay: CHANNEL_DISPLAY,
        },
      },
    });

    // Reset PIN attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    // Check balance (after PIN is verified)
    if (walletBalance < amount) {
      // ✅ Update transaction with balance error
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          channelDisplay: CHANNEL_DISPLAY,
          metadata: {
            ...transaction.metadata,
            pinVerified: true,
            failureReason: "INSUFFICIENT_BALANCE",
            walletBalance: walletBalance,
            requiredAmount: amount,
            error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}, Required: ₦${amount.toFixed(2)}`,
            failedAt: new Date().toISOString(),
            source: "MobileCableAPI",
            channel: "MOBILE_APP",
            channelDisplay: CHANNEL_DISPLAY,
          },
        },
      });

      // ✅ Create failed customer transaction
      await prisma.customerTransaction.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          vtuTransactionId: transaction.id,
          transactionType: VtuType.CABLE_TV,
          amount: amount,
          totalAmount: amount,
          product: `${provider} - ${packageCode}`,
          phoneNumber: user.phone,
          network: null,
          planName: packageCode,
          status: TransactionStatus.FAILED,
          notes: `Insufficient balance: ${walletBalance} available, ${amount} required`,
          metadata: {
            failureReason: "INSUFFICIENT_BALANCE",
            pinVerified: true,
            walletBalance: walletBalance,
            requiredAmount: amount,
            smartCardNumber: smartCardNumber,
            provider: provider,
            failedAt: new Date().toISOString(),
            source: "MobileCableAPI",
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
      // 8. Vendor call
      const vendorStart = Date.now();
      const vendorService = getVendorService();
      console.log(`🔄 [MOBILE CABLE API] Calling vendor service for cable purchase...`);

      const result = await vendorService.buyCableTV(
        {
          decoderNumber: smartCardNumber,
          packageCode: packageCode,
          provider: provider,
          amount: amount,
          phone: user.phone,
        },
        user.id
      );

      console.log(`⏱️ [MOBILE CABLE API] Vendor call took ${Date.now() - vendorStart}ms`);

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

      console.log(`📊 [MOBILE CABLE API] Vendor result:`, {
        success: result.success,
        error: result.error,
        vendor: result.vendor,
        vendorReference: result.vendorReference,
        vendorSwitched: result.vendorSwitched,
        switchedFrom: result.switchedFrom,
      });

      // Map vendor to enum
      vendorEnum = mapVendorToEnum(result.vendor);
      
      if (!vendorEnum) {
        console.warn(`⚠️ Unknown vendor: ${result.vendor}, defaulting to VTPASS`);
        vendorEnum = VtuVendor.VTPASS;
      }

      // Get vendor ID for reference
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
        // 9. Update customer stats
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            totalTransactions: { increment: 1 },
            totalSpent: { increment: amount },
            lastTransactionAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // ============================================================
        // ✅ EXTRACT AND SAVE CUSTOMER INFO
        // ============================================================
        
        // Extract customer info from vendor response
        const customerName = result.data?.customerName || 
                             result.data?.Customer_Name || 
                             result.data?.customer?.name || 
                             null;
        
        const customerAddress = result.data?.customerAddress || 
                                result.data?.Address || 
                                result.data?.customer?.address || 
                                null;
        
        const customerPhoneFromVendor = result.data?.customerPhone || 
                                        result.data?.phone || 
                                        result.data?.customer?.phone || 
                                        null;
        
        const customerEmailFromVendor = result.data?.customerEmail || 
                                        result.data?.email || 
                                        result.data?.customer?.email || 
                                        null;
        
        const decoderStatus = result.data?.status || 
                              result.data?.Status || 
                              "ACTIVE";

        // Save decoder with complete information (non-blocking)
        saveDecoderAsync(
          user.id, 
          smartCardNumber, 
          provider, 
          packageCode || 'STANDARD',
          customerName,
          customerAddress,
          customerPhoneFromVendor,
          customerEmailFromVendor,
          decoderStatus,
          new Date()
        ).catch(() => {});

        console.log(`📝 [MOBILE CABLE API] Customer data saved for decoder ${smartCardNumber}: ${customerName || 'No name'}`);

        // 10. Deduct from wallet, complete transaction, and create customer transaction
        const dbStart = Date.now();
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
              description: `Cable subscription for ${smartCardNumber} (${provider} - ${packageCode})`,
              status: TransactionStatus.SUCCESS,
              category: "CABLE_TV",
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
              channelDisplay: CHANNEL_DISPLAY,
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
                source: "MobileCableAPI",
                channel: "MOBILE_APP",
                channelDisplay: CHANNEL_DISPLAY,
                customerInfo: {
                  name: customerName,
                  address: customerAddress,
                  phone: customerPhoneFromVendor,
                  email: customerEmailFromVendor,
                  status: decoderStatus,
                },
              },
            },
          }),
          prisma.customerTransaction.create({
            data: {
              customerId: customer.id,
              userId: user.id,
              vtuTransactionId: transaction.id,
              transactionType: VtuType.CABLE_TV,
              amount: amount,
              totalAmount: amount,
              product: `${provider} - ${packageCode}`,
              phoneNumber: user.phone,
              network: null,
              planName: packageCode,
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
                smartCardNumber: smartCardNumber,
                provider: provider,
                completedAt: new Date().toISOString(),
                source: "MobileCableAPI",
                commission: {
                  vendorCommission,
                  vendorTotalAmount,
                  commissionRate,
                  commissionType,
                  platformProfit: platformCommission,
                  grossProfit: grossProfit,
                  profitMargin: profitMargin,
                },
                customerInfo: {
                  name: customerName,
                  address: customerAddress,
                  phone: customerPhoneFromVendor,
                  email: customerEmailFromVendor,
                  status: decoderStatus,
                },
              },
            },
          }),
        ]);
        console.log(`⏱️ [MOBILE CABLE API] Database transaction took ${Date.now() - dbStart}ms`);

        // ✅ Invalidate cache
        await Promise.all([
          CacheService.invalidateWallet(user.id),
          CacheService.invalidateUser(user.id),
          CacheService.invalidateCustomer(user.id, user.phone),
          CacheService.invalidateSavedDecoders(user.id),
        ]);

        const totalTime = Date.now() - startTime;
        console.log(`✅ [MOBILE CABLE API] Transaction completed in ${totalTime}ms`);

        return NextResponse.json({
          success: true,
          data: {
            transactionId: transaction.id,
            reference: transaction.id,
            vendorReference: result.vendorReference,
            amount: amount,
            provider: provider,
            packageCode: packageCode,
            smartCardNumber: smartCardNumber,
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
              phone: customerPhoneFromVendor,
              email: customerEmailFromVendor,
              status: decoderStatus,
            },
            ...result.data,
          },
        });
      } else {
        // Vendor failure - record everything
        await handleMobileCableVendorFailure(
          transaction,
          customer,
          user,
          smartCardNumber,
          provider,
          packageCode,
          amount,
          result,
          vendorEnum,
          vendorId
        );

        const totalTime = Date.now() - startTime;
        console.error(`❌ [MOBILE CABLE API] Vendor purchase failed after ${totalTime}ms`);

        return NextResponse.json({
          success: false,
          error: result.error || "Vendor transaction failed",
          transactionId: transaction.id,
          vendor: result.vendor,
          vendorReference: result.vendorReference,
          totalTime: totalTime,
        }, { status: 500 });
      }
    } catch (error: any) {
      // Unexpected error - record everything
      await handleMobileCableUnexpectedError(
        transaction,
        customer,
        user,
        smartCardNumber,
        provider,
        packageCode,
        amount,
        error,
        vendorEnum,
        vendorId
      );

      const totalTime = Date.now() - startTime;
      console.error(`❌ [MOBILE CABLE API] Transaction failed with error after ${totalTime}ms`);

      return NextResponse.json({
        success: false,
        error: error.message || "Purchase failed. Please try again.",
        transactionId: transaction.id,
        totalTime: totalTime,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error(`❌ [MOBILE CABLE API] Unexpected top-level error:`, error);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred",
      errorType: error.name || 'UnknownError',
    }, { status: 500 });
  }
}