// app/api/vendors/data/purchase/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { CacheService } from "~/lib/cache/cache.service";
import { TransactionStatus, VtuType, CustomerType } from "@prisma/client";
import { compare } from "bcrypt";

// ✅ Helper to measure performance
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    console.log(`👤 [DATA API] User authenticated: ${sessionUser.id}`);

    const body = await request.json();
    const { phoneNumber, planCode, provider, amount, pin } = body;

    // Validate request
    if (!phoneNumber || phoneNumber.length < 10) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid phone number",
      }, { status: 400 });
    }

    if (!planCode) {
      return NextResponse.json({
        success: false,
        error: "Please select a data plan",
      }, { status: 400 });
    }

    if (!amount || amount < 50) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid amount",
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

    // ✅ Get user, wallet, and balance in parallel
    const [user, cachedBalance] = await Promise.all([
      measure('User fetch', () => CacheService.getUser(sessionUser.id)),
      measure('Balance fetch', () => CacheService.getBalance(sessionUser.id)),
    ]);

    let userData = user;
    if (!userData || !userData.wallet) {
      console.log(`📡 [DATA API] User not in cache, fetching from DB...`);
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
    let customer = await measure('Customer fetch', () => CacheService.getCustomer(userData.id, phoneNumber));
    
    if (!customer) {
      console.log(`📡 [DATA API] Customer not in cache, checking DB...`);
      customer = await measure('Customer DB fetch', async () => {
        const existing = await prisma.customer.findUnique({
          where: {
            userId_phone: {
              userId: userData.id,
              phone: phoneNumber,
            },
          },
        });

        if (!existing) {
          return CacheService.createCustomer({
            userId: userData.id,
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
        }
        return existing;
      });
      console.log(`👤 [DATA API] Customer ready: ${customer.id}`);
    }

    // ✅ Create transaction record
    const transaction = await measure('Transaction creation', () => prisma.vtuTransaction.create({
      data: {
        userId: userData.id,
        transactionType: VtuType.DATA,
        product: `${provider} - ${planCode}`,
        amount: amount,
        totalDebited: amount,
        phoneNumber: phoneNumber,
        network: provider as any,
        networkPlan: planCode,
        status: TransactionStatus.PENDING,
        channel: "MOBILE_APP",
        metadata: {
          source: "DataAPI",
          service: "DATA",
          timestamp: new Date().toISOString(),
          provider: provider,
          planCode: planCode,
          customerId: customer.id,
          pinVerified: true,
        },
      },
    }));

    console.log(`📝 [DATA API] Transaction created: ${transaction.id}`);

    try {
      // ✅ Vendor call
      const vendorStart = Date.now();
      const vendorService = getVendorService();
      const result = await vendorService.buyData(
        {
          phoneNumber: phoneNumber,
          planCode: planCode,
          network: provider,
          amount: amount,
        },
        userData.id
      );
      console.log(`⏱️ [DATA API] Vendor call took ${Date.now() - vendorStart}ms`);

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

        // ✅ Update customer stats (async)
        const customerUpdatePromise = prisma.customer.update({
          where: { id: customer.id },
          data: {
            totalTransactions: { increment: 1 },
            totalSpent: { increment: amount },
            lastTransactionAt: new Date(),
          },
        });

        // ✅ Parallel DB operations
        const dbStart = Date.now();
        await Promise.all([
          customerUpdatePromise,
          prisma.wallet.update({
            where: { id: userData.wallet!.id },
            data: {
              walletBalance: {
                decrement: amount,
              },
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: userData.wallet!.id,
              userId: userData.id,
              type: "DEBIT",
              amount: amount,
              balanceBefore: walletBalance,
              balanceAfter: walletBalance - amount,
              reference: `VTU_${transaction.id}`,
              description: `Data purchase for ${phoneNumber} (${provider} - ${planCode})`,
              status: TransactionStatus.SUCCESS,
              category: "DATA",
            },
          }),
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
                pinVerified: true,
              },
            },
          }),
          prisma.customerTransaction.create({
            data: {
              customerId: customer.id,
              userId: userData.id,
              vtuTransactionId: transaction.id,
              transactionType: VtuType.DATA,
              amount: amount,
              totalAmount: amount,
              product: `${provider} - ${planCode}`,
              phoneNumber: phoneNumber,
              network: provider as any,
              planName: planCode,
              status: TransactionStatus.SUCCESS,
              metadata: {
                vendor: result.vendor,
                vendorReference: result.vendorReference,
                pinVerified: true,
              },
            },
          }),
        ]);
        console.log(`⏱️ [DATA API] Parallel DB operations took ${Date.now() - dbStart}ms`);

        // ✅ Invalidate cache in parallel
        const cacheStart = Date.now();
        await Promise.all([
          CacheService.invalidateWallet(userData.id),
          CacheService.invalidateUser(userData.id),
          CacheService.invalidateCustomer(userData.id, phoneNumber),
        ]);
        console.log(`⏱️ [DATA API] Cache invalidation took ${Date.now() - cacheStart}ms`);

        const totalTime = Date.now() - startTime;
        console.log(`✅ [DATA API] Transaction completed in ${totalTime}ms`);

        return NextResponse.json({
          success: true,
          data: {
            transactionId: transaction.id,
            reference: transaction.id,
            vendorReference: result.vendorReference,
            amount: amount,
            provider: provider,
            planCode: planCode,
            phoneNumber: phoneNumber,
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
      console.error(`❌ [DATA API] Error during purchase:`, error);
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
    console.error(`❌ [DATA API] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred",
    }, { status: 500 });
  }
}