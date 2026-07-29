// app/api/vendors/airtime/purchase/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { CacheService } from "~/lib/cache/cache.service";
import { TransactionStatus, VtuType, CustomerType, NetworkProvider, VtuVendor } from "@prisma/client";
import { compare } from "bcrypt";

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
    console.warn(`⚠️ Unknown network: "${networkInput}", defaulting to MTN`);
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
    console.warn(`⚠️ Phone number too short: ${phone}, padding with zeros`);
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
// MAIN API ROUTE
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate user
    const sessionUser = await requireAuth("/auth/sign-in");
    console.log(`👤 [AIRTIME API] User authenticated: ${sessionUser.id}`);

    // 2. Parse request body
    const body = await request.json();
    let { phoneNumber, amount, network, pin } = body;

    // 3. Validate request
    if (!phoneNumber || phoneNumber.length < 10) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid phone number",
      }, { status: 400 });
    }

    phoneNumber = normalizePhoneNumber(phoneNumber);

    if (!amount || amount < 50) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid amount (minimum ₦50)",
      }, { status: 400 });
    }

    if (!network) {
      return NextResponse.json({
        success: false,
        error: "Please select a network provider",
      }, { status: 400 });
    }

    const networkEnum = mapNetwork(network);
    console.log(`📡 [AIRTIME API] Network mapped: ${network} → ${networkEnum}`);

    if (!pin || pin.length < 4) {
      return NextResponse.json({
        success: false,
        error: "Please enter your 4-6 digit transaction PIN",
      }, { status: 400 });
    }

    // ✅ 4. Get user with cache
    const userStart = Date.now();
    let user = await CacheService.getUser(sessionUser.id);
    
    if (!user || !user.wallet) {
      console.log(`📡 [AIRTIME API] User not in cache, fetching from DB...`);
      user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: { wallet: true },
      });
    }
    console.log(`⏱️ [AIRTIME API] User fetch took ${Date.now() - userStart}ms`);

    if (!user || !user.wallet) {
      return NextResponse.json({
        success: false,
        error: "User or wallet not found",
      }, { status: 404 });
    }

    // ✅ 5. Get balance from cache
    const balanceStart = Date.now();
    const cachedBalance = await CacheService.getBalance(sessionUser.id);
    const walletBalance = cachedBalance?.balance ?? Number(user.wallet.walletBalance || 0);
    console.log(`⏱️ [AIRTIME API] Balance check took ${Date.now() - balanceStart}ms`);

    // Check PIN is locked
    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json({
        success: false,
        error: `Account locked due to multiple failed PIN attempts. Please try again in ${remainingMinutes} minute(s).`,
      }, { status: 403 });
    }

    // Verify PIN
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
      
      if (attemptsLeft <= 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            pinLockedUntil: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
        return NextResponse.json({
          success: false,
          error: "Too many failed PIN attempts. Your account is locked for 15 minutes.",
        }, { status: 403 });
      }

      return NextResponse.json({
        success: false,
        error: `Invalid PIN. ${attemptsLeft} attempt(s) remaining.`,
      }, { status: 401 });
    }

    // Reset PIN attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    if (walletBalance < amount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}, Required: ₦${amount.toFixed(2)}`,
      }, { status: 400 });
    }

    // ✅ 6. Get customer with cache
    const customerStart = Date.now();
    let customer = await CacheService.getCustomer(user.id, phoneNumber);
    
    if (!customer) {
      console.log(`📡 [AIRTIME API] Customer not in cache, checking DB...`);
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
        console.log(`👤 [AIRTIME API] New customer created: ${customer.id}`);
      }
    }
    console.log(`⏱️ [AIRTIME API] Customer fetch took ${Date.now() - customerStart}ms`);

    // 7. Create transaction record
    const transactionStart = Date.now();
    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.AIRTIME,
        product: network,
        amount: amount,
        totalDebited: amount,
        phoneNumber: phoneNumber,
        network: networkEnum,
        status: TransactionStatus.PENDING,
        channel: "MOBILE_APP",
        metadata: {
          source: "AirtimeAPI",
          service: "AIRTIME",
          timestamp: new Date().toISOString(),
          network: network,
          networkEnum: networkEnum,
          customerId: customer.id,
          pinVerified: true,
        },
      },
    });
    console.log(`⏱️ [AIRTIME API] Transaction creation took ${Date.now() - transactionStart}ms`);

    console.log(`📝 [AIRTIME API] Transaction created: ${transaction.id}`);

    try {
      // 8. Get vendor service and purchase
      const vendorStart = Date.now();
      const vendorService = getVendorService();
      console.log(`🔄 [AIRTIME API] Calling vendor service for airtime purchase...`);

      const result = await vendorService.buyAirtime(
        {
          phoneNumber: phoneNumber,
          amount: amount,
          network: network,
        },
        user.id
      );

      console.log(`⏱️ [AIRTIME API] Vendor call took ${Date.now() - vendorStart}ms`);

      console.log(`📊 [AIRTIME API] Vendor result:`, {
        success: result.success,
        error: result.error,
        vendor: result.vendor,
        vendorReference: result.vendorReference,
        vendorSwitched: result.vendorSwitched,
        switchedFrom: result.switchedFrom,
      });

      if (result.success) {
        let vendorId: string | null = null;
        let vendorEnum = mapVendorToEnum(result.vendor);
        
        if (!vendorEnum) {
          console.warn(`⚠️ Unknown vendor: ${result.vendor}, defaulting to VTPASS`);
          vendorEnum = VtuVendor.VTPASS;
        }

        if (result.vendor) {
          const vendorRecord = await prisma.vendor.findFirst({
            where: { code: result.vendor as string },
            select: { id: true },
          });
          if (vendorRecord) {
            vendorId = vendorRecord.id;
          }
        }

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
              description: `Airtime purchase for ${phoneNumber} (${network})`,
              status: TransactionStatus.SUCCESS,
              category: "AIRTIME",
            },
          }),
          prisma.vtuTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.SUCCESS,
              vendorReference: result.vendorReference,
              vendorId: vendorId || undefined,
              vendor: vendorEnum,
              token: result.data?.token,
              deliveredAt: new Date(),
              metadata: {
                ...transaction.metadata,
                vendorResponse: result.data,
                vendorName: result.vendor,
                vendorReference: result.vendorReference,
                vendorSwitched: result.vendorSwitched,
                switchedFrom: result.switchedFrom,
                responseDescription: result.data?.responseDescription,
                success: true,
                pinVerified: true,
              },
            },
          }),
          prisma.customerTransaction.create({
            data: {
              customerId: customer.id,
              userId: user.id,
              vtuTransactionId: transaction.id,
              transactionType: VtuType.AIRTIME,
              amount: amount,
              totalAmount: amount,
              product: network,
              phoneNumber: phoneNumber,
              network: networkEnum,
              status: TransactionStatus.SUCCESS,
              metadata: {
                vendorName: result.vendor || 'unknown',
                vendorReference: result.vendorReference || '',
                vendorSwitched: result.vendorSwitched || false,
                switchedFrom: result.switchedFrom || [],
                pinVerified: true,
              },
            },
          }),
        ]);
        console.log(`⏱️ [AIRTIME API] Database transaction took ${Date.now() - dbStart}ms`);

        // ✅ Invalidate cache
        await Promise.all([
          CacheService.invalidateWallet(user.id),
          CacheService.invalidateUser(user.id),
          CacheService.invalidateCustomer(user.id, phoneNumber),
        ]);

        const totalTime = Date.now() - startTime;
        console.log(`✅ [AIRTIME API] Transaction completed successfully in ${totalTime}ms`);

        return NextResponse.json({
          success: true,
          data: {
            transactionId: transaction.id,
            reference: transaction.id,
            vendorReference: result.vendorReference,
            amount: amount,
            network: network,
            phoneNumber: phoneNumber,
            customerId: customer.id,
            isNewCustomer: customer.totalTransactions === 0,
            customerName: customer.fullName,
            vendor: result.vendor,
            vendorSwitched: result.vendorSwitched,
            switchedFrom: result.switchedFrom,
            totalTime: totalTime,
            ...result.data,
          },
        });
      } else {
        // 11. Mark transaction as failed
        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            metadata: {
              ...transaction.metadata,
              error: result.error,
              vendor: result.vendor,
              vendorErrors: result.vendorErrors,
              failedAt: new Date().toISOString(),
              pinVerified: true,
            },
          },
        });

        console.error(`❌ [AIRTIME API] Vendor purchase failed: ${result.error}`);

        return NextResponse.json({
          success: false,
          error: result.error || "Vendor transaction failed",
        }, { status: 500 });
      }
    } catch (error: any) {
      console.error(`❌ [AIRTIME API] Error during purchase:`, error);

      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...transaction.metadata,
            error: error.message || "Unknown error",
            errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            failedAt: new Date().toISOString(),
            pinVerified: true,
          },
        },
      });

      return NextResponse.json({
        success: false,
        error: error.message || "Purchase failed. Please try again.",
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error(`❌ [AIRTIME API] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred",
    }, { status: 500 });
  }
}