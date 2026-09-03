// app/api/vendors/qr-buy/route.ts
// COMPLETE FIXED VERSION

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
import { getServerSession } from "next-auth";
import { authOptions } from "~/lib/auth";

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
// SAVE METER HELPER
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
  }
}

// ============================================================
// SAVE DECODER HELPER
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
      userId, // ✅ userId from frontend
    } = body;

    log('info', `QR Buy request: ${serviceType} for ${identifier}, amount: ${amount}, userId: ${userId || 'not specified'}`);

    // ============================================================
    // STATIC CHANNEL - QR_CODE
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

    // ============================================================
    // ✅ FIXED: Verify QR hash with userId
    // ============================================================
    if (qrHash) {
      // Try with userId first (new QR codes)
      let isValidHash = false;
      
      if (userId) {
        isValidHash = verifyQRHash({
          identifier: identifier,
          type: serviceType,
          provider: provider || discoCode || "unknown",
          userId: userId, // ✅ Added userId
          hash: qrHash,
        });
      }
      
      // If that fails and we have a userId from the QR, try without it (backward compatibility)
      if (!isValidHash && userId) {
        // Try without userId (old QR codes)
        isValidHash = verifyQRHash({
          identifier: identifier,
          type: serviceType,
          provider: provider || discoCode || "unknown",
          hash: qrHash,
        });
      }

      if (!isValidHash) {
        return NextResponse.json({
          success: false,
          error: "Invalid QR code",
        }, { status: 400 });
      }
      log('info', 'QR hash verified');
    }

    // ============================================================
    // FIND THE USER
    // ============================================================

    let user = null;
    let isGuest = false;
    let isQrOwner = false;

    // 1. If userId is provided (QR owner), use that
    if (userId) {
      log('info', `Looking up QR owner: ${userId}`);
      user = await prisma.user.findUnique({
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

      if (!user) {
        return NextResponse.json({
          success: false,
          error: "User not found for this QR code",
        }, { status: 404 });
      }

      isQrOwner = true;
      log('info', `QR owner found: ${user.fullName} (${user.id})`);
    } else {
      // 2. Try session user
      try {
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
          user = await prisma.user.findUnique({
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
          log('info', `Session user found: ${user?.fullName}`);
        }
      } catch (error) {
        log('info', 'No user session');
      }

      // 3. Guest mode
      if (!user) {
        isGuest = true;
        log('info', 'Guest purchase mode');
        
        const guestPin = process.env.GUEST_PURCHASE_PIN || "1234";
        const isPinValid = pin === guestPin;
        
        if (!isPinValid) {
          return NextResponse.json({
            success: false,
            error: "Invalid guest PIN. Please check and try again.",
          }, { status: 401 });
        }

        // Create guest user
        const timestamp = Date.now();
        const guestEmail = `guest_${timestamp}@temp.com`;
        const guestPhone = phone ? normalizePhoneNumber(phone) : `GUEST${timestamp.toString().slice(-10)}`;
        
        user = await prisma.user.findFirst({
          where: { email: guestEmail, role: UserRole.GUEST },
        });

        if (!user) {
          let finalPhone = guestPhone;
          let phoneExists = await prisma.user.findFirst({
            where: { phone: finalPhone },
          });
          if (phoneExists) {
            finalPhone = `${guestPhone}_${timestamp.toString().slice(-6)}`;
          }
          
          user = await prisma.user.create({
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
          });
        }
        log('info', `Guest user: ${user.id}`);
      }
    }

    // ============================================================
    // PIN VERIFICATION
    // ============================================================

    if (!isGuest) {
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

      log('info', `Verifying PIN for user: ${user.fullName} (${user.id})`);
      const isValidPin = await compare(pin, user.pinHash);
      log('info', `PIN verification result: ${isValidPin}`);

      if (!isValidPin) {
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
    }

    // ============================================================
    // CHECK WALLET BALANCE (non-guest only)
    // ============================================================

    if (!isGuest) {
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
          tags: isGuest ? ['guest'] : (isQrOwner ? ['qr_owner'] : []),
        });
        log('info', `Created customer: ${customer.id}`);
      }
    }

    // ============================================================
    // CREATE TRANSACTION
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
          isQrOwner: isQrOwner,
          qrHash: qrHash,
          channel: "QR_CODE",
          channelDisplay: CHANNEL_DISPLAY,
          userIdProvided: userId || null,
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

        // Process wallet debit (skip for guests)
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
                description: `QR Purchase: ${serviceType} for ${identifier}${isQrOwner ? ' (QR Owner)' : ''}`,
                status: TransactionStatus.SUCCESS,
                category: serviceType === "electricity" ? "ELECTRICITY" : "CABLE_TV",
                channel: channelType,
                metadata: {
                  channel: "QR_CODE",
                  channelDisplay: CHANNEL_DISPLAY,
                  qrPurchase: true,
                  isQrOwner: isQrOwner,
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
              isQrOwner: isQrOwner,
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
                isQrOwner: isQrOwner,
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

        // Save meter/decoder
        if (serviceType === "electricity") {
          const customerName = result.data?.customerName || result.data?.name || null;
          const customerAddress = result.data?.customerAddress || result.data?.address || null;
          const customerPhoneFromVendor = result.data?.customerPhone || result.data?.phone || null;
          const customerEmailFromVendor = result.data?.customerEmail || result.data?.email || null;
          const meterStatus = result.data?.status || result.data?.meterStatus || null;

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
            isQrOwner: isQrOwner,
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
        // Vendor failed
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
              isQrOwner: isQrOwner,
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
      if (error.message?.includes('timeout') && vendorResult?.success) {
        log('warn', 'Vendor request timed out but we have a result - processing anyway');
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
            isQrOwner: isQrOwner,
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

      // Unexpected error
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
            isQrOwner: isQrOwner,
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