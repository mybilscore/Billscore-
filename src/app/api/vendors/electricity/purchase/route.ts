// app/api/vendors/electricity/purchase/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { CacheService } from "~/lib/cache/cache.service";
import { TransactionStatus, VtuType, CustomerType, MeterType } from "@prisma/client";
import { compare } from "bcrypt";

// ✅ Helper to measure performance
function measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().then(result => {
    const duration = Date.now() - start;
    console.log(`⏱️ [PERF] ${name}: ${duration}ms`);
    return result;
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    console.log(`👤 [ELECTRICITY API] User authenticated: ${sessionUser.id}`);

    const body = await request.json();
    const { meterNumber, meterType, amount, discoCode, discoId, phone, pin } = body;

    // Validate request
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

    // ✅ Get user, wallet, and balance in parallel
    const [user, cachedBalance] = await Promise.all([
      measure('User fetch', () => CacheService.getUser(sessionUser.id)),
      measure('Balance fetch', () => CacheService.getBalance(sessionUser.id)),
    ]);

    let userData = user;
    if (!userData || !userData.wallet) {
      console.log(`📡 [ELECTRICITY API] User not in cache, fetching from DB...`);
      userData = await measure('User DB fetch', () => prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: { wallet: true },
      }));
    }

    if (!userData || !userData.wallet) {
      return NextResponse.json({
        success: false,
        error: "User or wallet not found",
      }, { status: 404 });
    }

    const walletBalance = cachedBalance?.balance ?? Number(userData.wallet.walletBalance || 0);

    // Check PIN is locked
    if (userData.pinLockedUntil && userData.pinLockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((userData.pinLockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json({
        success: false,
        error: `Account locked due to multiple failed PIN attempts. Please try again in ${remainingMinutes} minute(s).`,
      }, { status: 403 });
    }

    // Verify PIN
    if (!userData.pinHash) {
      return NextResponse.json({
        success: false,
        error: "You don't have a transaction PIN set. Please set one in your profile.",
      }, { status: 400 });
    }

    const isValidPin = await compare(pin, userData.pinHash);
    if (!isValidPin) {
      const updatedUser = await prisma.user.update({
        where: { id: userData.id },
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
          where: { id: userData.id },
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
      where: { id: userData.id },
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

    // ✅ Get customer with cache
    const customerPhone = phone || userData.phone;
    let customer = await measure('Customer fetch', () => CacheService.getCustomer(userData.id, customerPhone));
    
    if (!customer) {
      console.log(`📡 [ELECTRICITY API] Customer not in cache, checking DB...`);
      customer = await measure('Customer DB fetch', async () => {
        const existing = await prisma.customer.findUnique({
          where: {
            userId_phone: {
              userId: userData.id,
              phone: customerPhone,
            },
          },
        });

        if (!existing) {
          return CacheService.createCustomer({
            userId: userData.id,
            phone: customerPhone,
            fullName: userData.fullName,
            email: userData.email || null,
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
      console.log(`👤 [ELECTRICITY API] Customer ready: ${customer.id}`);
    }

    // Save meter to saved meters (async, don't wait)
    const saveMeterPromise = (async () => {
      try {
        const existingMeter = await prisma.savedMeter.findFirst({
          where: {
            userId: userData.id,
            meterNumber: meterNumber,
          },
        });

        if (!existingMeter) {
          await prisma.savedMeter.create({
            data: {
              userId: userData.id,
              meterNumber: meterNumber,
              disco: discoCode,
              name: `${discoCode} Meter`,
              meterType: meterType || "Prepaid",
              isDefault: false,
            },
          });
          await CacheService.invalidateSavedMeters(userData.id);
          console.log(`✅ [ELECTRICITY API] Saved meter: ${meterNumber}`);
        }
      } catch (saveError) {
        console.error("❌ [ELECTRICITY API] Failed to save meter:", saveError);
      }
    })();

    const meterTypeEnum = meterType?.toLowerCase() === 'prepaid' 
      ? MeterType.HOME 
      : MeterType.OFFICE;

    // ✅ Create transaction record
    const transaction = await measure('Transaction creation', () => prisma.vtuTransaction.create({
      data: {
        userId: userData.id,
        transactionType: VtuType.ELECTRICITY_INSTANT,
        product: discoCode,
        amount: amount,
        totalDebited: amount,
        meterNumber: meterNumber,
        meterType: meterTypeEnum,
        status: TransactionStatus.PENDING,
        channel: "MOBILE_APP",
        metadata: {
          source: "ElectricityAPI",
          service: "ELECTRICITY",
          timestamp: new Date().toISOString(),
          discoCode: discoCode,
          discoId: discoId,
          meterType: meterType,
          customerId: customer.id,
          pinVerified: true,
        },
      },
    }));

    console.log(`📝 [ELECTRICITY API] Transaction created: ${transaction.id}`);

    try {
      // ✅ Vendor call
      const vendorStart = Date.now();
      const vendorService = getVendorService();
      const result = await vendorService.buyElectricity(
        {
          meterNumber: meterNumber,
          amount: amount,
          discoCode: discoCode,
          meterType: meterType as any,
          phone: customerPhone,
        },
        userData.id
      );
      console.log(`⏱️ [ELECTRICITY API] Vendor call took ${Date.now() - vendorStart}ms`);

      if (result.success) {
        let vendorId: string | null = null;
        if (result.vendor) {
          const vendorRecord = await prisma.vendor.findFirst({
            where: { code: result.vendor as string },
            select: { id: true },
          });
          if (vendorRecord) {
            vendorId = vendorRecord.id;
          }
        }

        // ✅ Parallel independent DB operations
        const dbStart = Date.now();
        await Promise.all([
          // Update customer stats
          prisma.customer.update({
            where: { id: customer.id },
            data: {
              totalTransactions: { increment: 1 },
              totalSpent: { increment: amount },
              lastTransactionAt: new Date(),
            },
          }),
          // Update wallet balance
          prisma.wallet.update({
            where: { id: userData.wallet!.id },
            data: {
              walletBalance: {
                decrement: amount,
              },
            },
          }),
          // Create wallet transaction
          prisma.walletTransaction.create({
            data: {
              walletId: userData.wallet!.id,
              userId: userData.id,
              type: "DEBIT",
              amount: amount,
              balanceBefore: walletBalance,
              balanceAfter: walletBalance - amount,
              reference: `VTU_${transaction.id}`,
              description: `Electricity token for ${meterNumber} (${discoCode})`,
              status: TransactionStatus.SUCCESS,
              category: "ELECTRICITY",
            },
          }),
          // Update VTU transaction
          prisma.vtuTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.SUCCESS,
              vendorReference: result.vendorReference,
              vendorId: vendorId || undefined,
              vendor: result.vendor,
              token: result.data?.token,
              deliveredAt: new Date(),
              metadata: {
                ...transaction.metadata,
                vendorResponse: result.data,
                vendorName: result.vendor,
                vendorReference: result.vendorReference,
                success: true,
                token: result.data?.token,
                pinVerified: true,
              },
            },
          }),
          // Create customer transaction
          prisma.customerTransaction.create({
            data: {
              customerId: customer.id,
              userId: userData.id,
              vtuTransactionId: transaction.id,
              transactionType: VtuType.ELECTRICITY_INSTANT,
              amount: amount,
              totalAmount: amount,
              product: discoCode,
              meterNumber: meterNumber,
              status: TransactionStatus.SUCCESS,
              metadata: {
                meterType: meterType,
                token: result.data?.token,
                pinVerified: true,
              },
            },
          }),
        ]);
        console.log(`⏱️ [ELECTRICITY API] Parallel DB operations took ${Date.now() - dbStart}ms`);

        // ✅ Wait for meter save to complete (background)
        await saveMeterPromise;

        // ✅ Invalidate cache in parallel
        const cacheStart = Date.now();
        await Promise.all([
          CacheService.invalidateWallet(userData.id),
          CacheService.invalidateUser(userData.id),
          CacheService.invalidateCustomer(userData.id, customerPhone),
          CacheService.invalidateSavedMeters(userData.id),
        ]);
        console.log(`⏱️ [ELECTRICITY API] Cache invalidation took ${Date.now() - cacheStart}ms`);

        const totalTime = Date.now() - startTime;
        console.log(`✅ [ELECTRICITY API] Transaction completed in ${totalTime}ms`);

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
            totalTime: totalTime,
            ...result.data,
          },
        });
      } else {
        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            metadata: {
              ...transaction.metadata,
              error: result.error,
              vendor: result.vendor,
              failedAt: new Date().toISOString(),
              pinVerified: true,
            },
          },
        });

        return NextResponse.json({
          success: false,
          error: result.error || "Vendor transaction failed",
        }, { status: 500 });
      }
    } catch (error: any) {
      console.error(`❌ [ELECTRICITY API] Error during purchase:`, error);
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...transaction.metadata,
            error: error.message || "Unknown error",
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
    console.error(`❌ [ELECTRICITY API] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred",
    }, { status: 500 });
  }
}