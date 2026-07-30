// app/api/internal/electricity/purchase/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { CacheService } from "~/lib/cache/cache.service";
import { TransactionStatus, VtuType, CustomerType, MeterType } from "@prisma/client";
import { compare } from "bcrypt";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { userId, meterNumber, meterType, amount, discoCode, discoId, phone, pin } = body;

    console.log(`👤 [INTERNAL ELECTRICITY API] User: ${userId}`);

    // Validate required fields
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "User ID is required",
      }, { status: 400 });
    }

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

    // ✅ Get user directly by ID (no session check)
    let userData = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!userData || !userData.wallet) {
      return NextResponse.json({
        success: false,
        error: "User or wallet not found",
      }, { status: 404 });
    }

    const walletBalance = Number(userData.wallet.walletBalance || 0);

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

    // Get customer
    const customerPhone = phone || userData.phone;
    let customer = await prisma.customer.findUnique({
      where: {
        userId_phone: {
          userId: userData.id,
          phone: customerPhone,
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
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
        },
      });
    }

    // Save meter to saved meters
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
      }
    } catch (saveError) {
      console.error("Failed to save meter:", saveError);
    }

    const meterTypeEnum = meterType?.toLowerCase() === 'prepaid' 
      ? MeterType.HOME 
      : MeterType.OFFICE;

    // Create transaction record
    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: userData.id,
        transactionType: VtuType.ELECTRICITY_INSTANT,
        product: discoCode,
        amount: amount,
        totalDebited: amount,
        meterNumber: meterNumber,
        meterType: meterTypeEnum,
        status: TransactionStatus.PENDING,
        channel: "WHATSAPP",
        metadata: {
          source: "WhatsApp",
          service: "ELECTRICITY",
          timestamp: new Date().toISOString(),
          discoCode: discoCode,
          discoId: discoId,
          meterType: meterType,
          customerId: customer.id,
          pinVerified: true,
        },
      },
    });

    console.log(`📝 [INTERNAL ELECTRICITY API] Transaction created: ${transaction.id}`);

    try {
      // Vendor call
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

        // Parallel DB operations
        await Promise.all([
          prisma.customer.update({
            where: { id: customer.id },
            data: {
              totalTransactions: { increment: 1 },
              totalSpent: { increment: amount },
              lastTransactionAt: new Date(),
            },
          }),
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
              description: `Electricity token for ${meterNumber} (${discoCode})`,
              status: TransactionStatus.SUCCESS,
              category: "ELECTRICITY",
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
                token: result.data?.token,
                pinVerified: true,
              },
            },
          }),
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

        const totalTime = Date.now() - startTime;
        console.log(`✅ [INTERNAL ELECTRICITY API] Transaction completed in ${totalTime}ms`);

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
      console.error(`❌ [INTERNAL ELECTRICITY API] Error during purchase:`, error);
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
    console.error(`❌ [INTERNAL ELECTRICITY API] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred",
    }, { status: 500 });
  }
}