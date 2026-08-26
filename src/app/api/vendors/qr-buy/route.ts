// app/api/vendors/qr-buy/route.ts
// COMPLETE UPDATED VERSION - WITH FULL METER INFORMATION SAVING AND QR_CODE channel

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { CacheService } from "~/lib/cache/cache.service";
import { 
  TransactionStatus, 
  VtuType, 
  CustomerType, 
  MeterType, 
  VtuVendor, 
  RefundStatus,
  UserRole,
  ChannelType
} from "@prisma/client";
import { compare } from "bcrypt";
import { verifyQRHash } from "~/lib/qr-hash";

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

// ============================================================
// AUTH HELPERS
// ============================================================

async function getOptionalUser() {
  try {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("~/lib/auth");
    const session = await getServerSession(authOptions);
    
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
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
      return user;
    }
  } catch (error) {
    log('info', 'No user session - guest purchase');
  }
  return null;
}

async function verifyGuestPin(pin: string): Promise<boolean> {
  const guestPin = process.env.GUEST_PURCHASE_PIN || "1234";
  return pin === guestPin;
}

async function getOrCreateGuestUser(phone?: string) {
  const timestamp = Date.now();
  const guestEmail = `guest_${timestamp}@temp.com`;
  const guestPhone = phone ? normalizePhoneNumber(phone) : `GUEST${timestamp.toString().slice(-10)}`;
  
  let guestUser = await prisma.user.findFirst({
    where: {
      email: guestEmail,
      role: UserRole.GUEST,
    },
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

  if (!guestUser) {
    let finalPhone = guestPhone;
    let phoneExists = await prisma.user.findFirst({
      where: { phone: finalPhone },
    });
    
    if (phoneExists) {
      finalPhone = `${guestPhone}_${timestamp.toString().slice(-6)}`;
    }
    
    const created = await prisma.user.create({
      data: {
        fullName: "Guest User",
        email: guestEmail,
        phone: finalPhone,
        role: UserRole.GUEST,
        hasWallet: true,
        wallet: {
          create: {
            accountNumber: `GUEST${timestamp.toString().slice(-10)}`,
            bankName: "BILSCORE",
            accountName: "Guest User",
            walletBalance: 0,
            ledgerBalance: 0,
            currency: "NGN",
            isActive: true,
            kycLevel: 0,
          },
        },
      },
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
    log('info', `Created guest user: ${created.id} with phone: ${finalPhone}`);
    return created;
  }

  return guestUser;
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
    } else {
      await prisma.savedMeter.create({ data });
    }

    await CacheService.invalidateSavedMeters(userId).catch(() => {});
    log('info', `Meter saved/updated: ${meterNumber}`);
  } catch (error) {
    log('error', 'Failed to save meter', error);
    // Non-critical - ignore
  }
}

// ============================================================
// SAVE DECODER HELPER (non-blocking)
// ============================================================

async function saveDecoderAsync(userId: string, smartCardNumber: string, provider: string, packageCode: string) {
  try {
    const existing = await prisma.savedDecoder.findFirst({
      where: { userId, decoderNumber: smartCardNumber },
    });

    if (!existing) {
      await prisma.savedDecoder.create({
        data: {
          userId,
          decoderNumber: smartCardNumber,
          provider: provider,
          name: `${provider} Decoder`,
          package: packageCode,
          isDefault: false,
        },
      });
      await CacheService.invalidateSavedDecoders(userId).catch(() => {});
    }
  } catch (error) {
    // Non-critical - ignore
  }
}

// ============================================================
// MAIN API ROUTE
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Try to get authenticated user, but don't require it
    let user = await getOptionalUser();
    let isGuest = false;

    const body = await request.json();
    const { 
      serviceType, 
      identifier, 
      amount, 
      pin,
      discoCode,
      meterType,
      provider,
      packageCode,
      qrHash,
      phone,
    } = body;

    log('info', `QR Buy request: ${serviceType} for ${identifier}, amount: ${amount}, user: ${user?.id || 'guest'}`);

    // ============================================================
    // STATIC CHANNEL - QR_CODE for QR purchases
    // ============================================================
    const CHANNEL_DISPLAY = "QR_CODE";

    // ============================================================
    // VALIDATION
    // ============================================================

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

    // Verify QR hash if provided
    if (qrHash) {
      const isValidHash = verifyQRHash({
        identifier: identifier,
        type: serviceType,
        provider: provider || discoCode || "unknown",
        hash: qrHash,
      });

      if (!isValidHash) {
        return NextResponse.json({
          success: false,
          error: "Invalid QR code",
        }, { status: 400 });
      }
      log('info', 'QR hash verified');
    }

    // ============================================================
    // HANDLE GUEST VS AUTHENTICATED USER
    // ============================================================

    let isPinValid = false;

    if (!user) {
      // Guest purchase
      isGuest = true;
      log('info', 'Guest purchase mode');

      // Verify guest PIN
      isPinValid = await verifyGuestPin(pin);
      log('info', `Guest PIN verification: ${isPinValid}`);

      if (!isPinValid) {
        return NextResponse.json({
          success: false,
          error: "Invalid guest PIN. Please check and try again.",
        }, { status: 401 });
      }

      // Create guest user for tracking
      user = await getOrCreateGuestUser(phone);
      log('info', `Guest user: ${user.id}`);

      // No guest purchase limit - guests can buy any amount
    } else {
      // Authenticated user - verify their PIN
      if (!user.pinHash) {
        return NextResponse.json({
          success: false,
          error: "You don't have a transaction PIN set. Please set one in your profile.",
        }, { status: 400 });
      }

      if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
        const remainingMinutes = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
        return NextResponse.json({
          success: false,
          error: `Account locked. Please try again in ${remainingMinutes} minute(s).`,
        }, { status: 403 });
      }

      isPinValid = await compare(pin, user.pinHash);
      log('info', `User PIN verification: ${isPinValid}`);

      if (!isPinValid) {
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            pinAttempts: { increment: 1 },
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
          attemptsLeft: attemptsLeft,
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

      // Check wallet balance for authenticated user
      if (!user.wallet) {
        return NextResponse.json({
          success: false,
          error: "No wallet found. Please contact support.",
        }, { status: 400 });
      }

      const walletBalance = Number(user.wallet.walletBalance);
      if (walletBalance < amount) {
        return NextResponse.json({
          success: false,
          error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}`,
        }, { status: 400 });
      }
    }

    // ============================================================
    // GET OR CREATE CUSTOMER
    // ============================================================

    const customerPhone = phone || user.phone;
    let customer = await CacheService.getCustomer(user.id, customerPhone).catch(() => null);

    if (!customer) {
      customer = await prisma.customer.findUnique({
        where: {
          userId_phone: {
            userId: user.id,
            phone: customerPhone,
          },
        },
      });

      if (!customer) {
        customer = await CacheService.createCustomer({
          userId: user.id,
          phone: customerPhone,
          fullName: user.fullName || null,
          email: user.email || null,
          customerType: isGuest ? CustomerType.GUEST : CustomerType.REGULAR,
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: isGuest ? ['guest'] : [],
        });
        log('info', `Created customer: ${customer.id}`);
      }
    }

    // ============================================================
    // CREATE TRANSACTION - channelDisplay = "QR_CODE"
    // ============================================================

    const meterTypeEnum = serviceType === "electricity" 
      ? (meterType?.toLowerCase() === 'prepaid' ? MeterType.HOME : MeterType.OFFICE)
      : undefined;

    const channelType = ChannelType.QR_PAYMENT;

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: serviceType === "electricity" ? VtuType.ELECTRICITY_INSTANT : VtuType.CABLE_TV,
        product: serviceType === "electricity" ? discoCode : provider,
        amount: amount,
        totalDebited: 0,
        meterNumber: serviceType === "electricity" ? identifier : undefined,
        meterType: meterTypeEnum,
        phoneNumber: serviceType === "cable" ? user.phone : undefined,
        networkPlan: serviceType === "cable" ? packageCode : undefined,
        status: TransactionStatus.PENDING,
        channel: channelType,
        channelDisplay: CHANNEL_DISPLAY,
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
          pinVerified: true,
          wasDebited: false,
          qrPurchase: true,
          isGuest: isGuest,
          qrHash: qrHash,
          channel: "QR_CODE",
          channelDisplay: CHANNEL_DISPLAY,
        },
      },
    });

    log('info', `Transaction created: ${transaction.id}`);

    // ============================================================
    // VENDOR PURCHASE
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
      // Increased timeout to 60 seconds
      const TIMEOUT_MS = 60000;
      
      let vendorPromise;
      
      if (serviceType === "electricity") {
        vendorPromise = vendorService.buyElectricity(
          {
            meterNumber: identifier,
            amount: amount,
            discoCode: discoCode,
            meterType: meterType || 'Prepaid',
            phone: customerPhone,
          },
          user.id
        );
      } else {
        vendorPromise = vendorService.buyCableTV(
          {
            decoderNumber: identifier,
            packageCode: packageCode || 'STANDARD',
            provider: provider,
            amount: amount,
            phone: customerPhone,
          },
          user.id
        );
      }

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
        // ============================================================
        // SUCCESS - Complete Transaction
        // ============================================================

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

        // Process wallet debit for authenticated users only
        if (!isGuest && user.wallet) {
          await prisma.$transaction([
            prisma.wallet.update({
              where: { id: user.wallet.id },
              data: {
                walletBalance: {
                  decrement: amount,
                },
              },
            }),
            prisma.walletTransaction.create({
              data: {
                walletId: user.wallet.id,
                userId: user.id,
                type: "DEBIT",
                amount: amount,
                balanceBefore: Number(user.wallet.walletBalance),
                balanceAfter: Number(user.wallet.walletBalance) - amount,
                reference: `QR_${transaction.id}`,
                description: `QR Purchase: ${serviceType} for ${identifier}`,
                status: TransactionStatus.SUCCESS,
                category: serviceType === "electricity" ? "ELECTRICITY" : "CABLE_TV",
                channel: channelType,
                metadata: {
                  channel: "QR_CODE",
                  channelDisplay: CHANNEL_DISPLAY,
                  qrPurchase: true,
                },
              },
            }),
          ]);
        } else {
          log('info', 'Guest purchase - no wallet debit');
        }

        // Update transaction
        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.SUCCESS,
            totalDebited: isGuest ? 0 : amount,
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
              completedAt: new Date().toISOString(),
              wasDebited: !isGuest,
              isGuest: isGuest,
            },
          },
        });

        // Create customer transaction record
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
              commissionAmount: vendorCommission || 0,
              commissionRate: commissionRate || 0,
              commissionPaid: true,
              commissionPaidAt: new Date(),
              metadata: {
                serviceType: serviceType,
                identifier: identifier,
                pinVerified: true,
                qrPurchase: true,
                isGuest: isGuest,
                vendor: result.vendor,
                vendorReference: result.vendorReference,
                token: result.data?.token,
                completedAt: new Date().toISOString(),
                channel: "QR_CODE",
                channelDisplay: CHANNEL_DISPLAY,
                commission: {
                  vendorCommission,
                  vendorTotalAmount,
                  commissionRate,
                  commissionType,
                  platformProfit: platformCommission,
                  grossProfit: grossProfit,
                  profitMargin: profitMargin,
                },
                ...(serviceType === "electricity" ? { meterType: meterType } : { provider: provider }),
              },
            },
          });
          log('info', 'Customer transaction recorded');
        }

        // ============================================================
        // SAVE METER WITH COMPLETE INFO (for electricity only)
        // ============================================================

        if (serviceType === "electricity") {
          // Extract customer info from vendor response
          const customerName = result.data?.customerName || result.data?.name || null;
          const customerAddress = result.data?.customerAddress || result.data?.address || null;
          const customerPhoneFromVendor = result.data?.customerPhone || result.data?.phone || null;
          const customerEmailFromVendor = result.data?.customerEmail || result.data?.email || null;
          const meterStatus = result.data?.status || result.data?.meterStatus || null;

          // Save meter with complete information (non-blocking)
          saveMeterAsync(
            user.id, 
            identifier, 
            discoCode, 
            meterType || 'Prepaid',
            customerName,
            customerAddress,
            customerPhoneFromVendor,
            customerEmailFromVendor,
            meterStatus,
            new Date()
          ).catch(() => {});
        } else if (serviceType === "cable") {
          // Save decoder for cable purchases
          saveDecoderAsync(user.id, identifier, provider, packageCode || 'STANDARD').catch(() => {});
        }

        // Invalidate cache
        await Promise.all([
          CacheService.invalidateWallet(user.id),
          CacheService.invalidateUser(user.id),
          CacheService.invalidateCustomer(user.id, customerPhone),
          CacheService.invalidateSavedMeters(user.id),
          CacheService.invalidateSavedDecoders(user.id),
        ].filter(Boolean));

        const totalTime = Date.now() - startTime;
        log('info', `QR transaction ${transaction.id} completed in ${totalTime}ms`);

        return NextResponse.json({
          success: true,
          data: {
            transactionId: transaction.id,
            reference: transaction.id,
            vendorReference: result.vendorReference,
            amount: amount,
            identifier: identifier,
            serviceType: serviceType,
            token: result.data?.token || "TOKEN_GENERATED",
            customerId: customer.id,
            isNewCustomer: customer.totalTransactions === 0,
            vendor: result.vendor,
            vendorSwitched: result.vendorSwitched,
            switchedFrom: result.switchedFrom,
            isGuest: isGuest,
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
            customerInfo: serviceType === "electricity" ? {
              name: result.data?.customerName || result.data?.name || null,
              address: result.data?.customerAddress || result.data?.address || null,
              phone: result.data?.customerPhone || result.data?.phone || null,
              email: result.data?.customerEmail || result.data?.email || null,
              status: result.data?.status || result.data?.meterStatus || null,
            } : null,
            ...result.data,
          },
        });

      } else {
        // ============================================================
        // VENDOR FAILED - No Debit
        // ============================================================

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
            transactionType: serviceType === "electricity" ? VtuType.ELECTRICITY_INSTANT : VtuType.CABLE_TV,
            amount: amount,
            totalAmount: amount,
            product: serviceType === "electricity" ? (discoCode || "QR") : `${provider || "QR"} - ${packageCode || "STANDARD"}`,
            meterNumber: serviceType === "electricity" ? identifier : null,
            phoneNumber: serviceType === "cable" ? user.phone : null,
            planName: serviceType === "cable" ? (packageCode || "STANDARD") : null,
            status: TransactionStatus.FAILED,
            notes: `Vendor failure: ${result.error || "Unknown error"}`,
            metadata: {
              vendorName: result.vendor || 'unknown',
              vendorReference: result.vendorReference || '',
              failureReason: result.error,
              vendorErrors: result.vendorErrors || [],
              pinVerified: true,
              qrPurchase: true,
              isGuest: isGuest,
              channel: "QR_CODE",
              channelDisplay: CHANNEL_DISPLAY,
              failedAt: new Date().toISOString(),
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
          // Process the successful result (reuse the success logic above)
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
              isGuest: isGuest,
              vendor: vendorResult.vendor,
              channel: CHANNEL_DISPLAY,
              warning: "Request timed out but vendor transaction succeeded",
              customerInfo: serviceType === "electricity" ? {
                name: vendorResult.data?.customerName || vendorResult.data?.name || null,
                address: vendorResult.data?.customerAddress || vendorResult.data?.address || null,
                phone: vendorResult.data?.customerPhone || vendorResult.data?.phone || null,
                email: vendorResult.data?.customerEmail || vendorResult.data?.email || null,
                status: vendorResult.data?.status || vendorResult.data?.meterStatus || null,
              } : null,
            },
          });
        }
      }

      // ============================================================
      // UNEXPECTED ERROR
      // ============================================================

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
          transactionType: serviceType === "electricity" ? VtuType.ELECTRICITY_INSTANT : VtuType.CABLE_TV,
          amount: amount,
          totalAmount: amount,
          product: serviceType === "electricity" ? (discoCode || "QR") : `${provider || "QR"} - ${packageCode || "STANDARD"}`,
          meterNumber: serviceType === "electricity" ? identifier : null,
          phoneNumber: serviceType === "cable" ? user.phone : null,
          planName: serviceType === "cable" ? (packageCode || "STANDARD") : null,
          status: TransactionStatus.FAILED,
          notes: `System Error: ${error.message || 'Unknown error'}`,
          metadata: {
            pinVerified: true,
            failureReason: error.message,
            errorType: error.name,
            qrPurchase: true,
            isGuest: isGuest,
            channel: "QR_CODE",
            channelDisplay: CHANNEL_DISPLAY,
            failedAt: new Date().toISOString(),
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

      log('error', 'QR purchase failed', error.message);

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