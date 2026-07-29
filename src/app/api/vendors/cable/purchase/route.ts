// app/api/vendors/cable/purchase/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { CacheService } from "~/lib/cache/cache.service";
import { TransactionStatus, VtuType, CustomerType } from "@prisma/client";
import { compare } from "bcrypt";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    console.log(`👤 [CABLE API] User authenticated: ${sessionUser.id}`);

    const body = await request.json();
    const { smartCardNumber, packageCode, provider, amount, pin } = body;

    // Validate request
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

    // ✅ Get user with cache
    const userStart = Date.now();
    let user = await CacheService.getUser(sessionUser.id);
    
    if (!user || !user.wallet) {
      console.log(`📡 [CABLE API] User not in cache, fetching from DB...`);
      user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: { wallet: true },
      });
    }
    console.log(`⏱️ [CABLE API] User fetch took ${Date.now() - userStart}ms`);

    if (!user || !user.wallet) {
      return NextResponse.json({
        success: false,
        error: "User or wallet not found",
      }, { status: 404 });
    }

    // ✅ Get balance from cache
    const balanceStart = Date.now();
    const cachedBalance = await CacheService.getBalance(sessionUser.id);
    const walletBalance = cachedBalance?.balance ?? Number(user.wallet.walletBalance || 0);
    console.log(`⏱️ [CABLE API] Balance check took ${Date.now() - balanceStart}ms`);

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

    // ✅ Get customer with cache
    const customerStart = Date.now();
    let customer = await CacheService.getCustomer(user.id, user.phone);
    
    if (!customer) {
      console.log(`📡 [CABLE API] Customer not in cache, checking DB...`);
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
        console.log(`👤 [CABLE API] New customer created: ${customer.id}`);
      }
    }
    console.log(`⏱️ [CABLE API] Customer fetch took ${Date.now() - customerStart}ms`);

    // Save decoder to saved decoders
    try {
      const existingDecoder = await prisma.savedDecoder.findFirst({
        where: {
          userId: user.id,
          decoderNumber: smartCardNumber,
        },
      });

      if (!existingDecoder) {
        await prisma.savedDecoder.create({
          data: {
            userId: user.id,
            decoderNumber: smartCardNumber,
            provider: provider,
            name: `${provider} Decoder`,
            package: packageCode,
            isDefault: false,
          },
        });
        // Invalidate saved decoders cache
        await CacheService.invalidateSavedDecoders(user.id);
        console.log(`✅ [CABLE API] Saved decoder: ${smartCardNumber}`);
      }
    } catch (saveError) {
      console.error("❌ [CABLE API] Failed to save decoder:", saveError);
    }

    // Create transaction record
    const transactionStart = Date.now();
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
        channel: "MOBILE_APP",
        metadata: {
          source: "CableAPI",
          service: "CABLE_TV",
          timestamp: new Date().toISOString(),
          provider: provider,
          packageCode: packageCode,
          smartCardNumber: smartCardNumber,
          customerId: customer.id,
          pinVerified: true,
        },
      },
    });
    console.log(`⏱️ [CABLE API] Transaction creation took ${Date.now() - transactionStart}ms`);

    try {
      const vendorStart = Date.now();
      const vendorService = getVendorService();
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
      console.log(`⏱️ [CABLE API] Vendor call took ${Date.now() - vendorStart}ms`);

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

        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            totalTransactions: { increment: 1 },
            totalSpent: { increment: amount },
            lastTransactionAt: new Date(),
          },
        });

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
              metadata: {
                smartCardNumber: smartCardNumber,
                provider: provider,
                pinVerified: true,
              },
            },
          }),
        ]);
        console.log(`⏱️ [CABLE API] Database transaction took ${Date.now() - dbStart}ms`);

        // ✅ Invalidate cache
        await Promise.all([
          CacheService.invalidateWallet(user.id),
          CacheService.invalidateUser(user.id),
          CacheService.invalidateCustomer(user.id, user.phone),
          CacheService.invalidateSavedDecoders(user.id),
        ]);

        const totalTime = Date.now() - startTime;
        console.log(`✅ [CABLE API] Transaction completed in ${totalTime}ms`);

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
      console.error(`❌ [CABLE API] Error during purchase:`, error);
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
    console.error(`❌ [CABLE API] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred",
    }, { status: 500 });
  }
}