// app/api/vendors/electricity/purchase/route.ts - COMPLETE UPDATED

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { TransactionStatus, VtuType, CustomerType, MeterType } from "@prisma/client";
import { compare } from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    console.log(`👤 [ELECTRICITY API] User authenticated: ${sessionUser.id}`);

    const body = await request.json();
    const { meterNumber, meterType, amount, discoCode, discoId, phone, pin } = body;

    console.log(`📝 [ELECTRICITY API] Request:`, { 
      meterNumber, 
      meterType, 
      amount, 
      discoCode, 
      discoId, 
      phone, 
      pin: pin ? '***' : 'missing' 
    });

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

    // ✅ Validate PIN
    if (!pin || pin.length < 4) {
      return NextResponse.json({
        success: false,
        error: "Please enter your 4-6 digit transaction PIN",
      }, { status: 400 });
    }

    // Get user with wallet and pin info
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      return NextResponse.json({
        success: false,
        error: "User or wallet not found",
      }, { status: 404 });
    }

    // ✅ Check if PIN is locked
    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json({
        success: false,
        error: `Account locked due to multiple failed PIN attempts. Please try again in ${remainingMinutes} minute(s).`,
      }, { status: 403 });
    }

    // ✅ Verify PIN
    if (!user.pinHash) {
      return NextResponse.json({
        success: false,
        error: "You don't have a transaction PIN set. Please set one in your profile.",
      }, { status: 400 });
    }

    const isValidPin = await compare(pin, user.pinHash);
    if (!isValidPin) {
      // Track failed PIN attempts
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
      
      // Lock account after 5 failed attempts
      if (attemptsLeft <= 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            pinLockedUntil: new Date(Date.now() + 15 * 60 * 1000), // Lock for 15 minutes
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

    // ✅ Reset PIN attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    const walletBalance = Number(user.wallet.walletBalance);
    console.log(`💰 [ELECTRICITY API] Wallet balance: ${walletBalance}, Amount: ${amount}`);

    if (walletBalance < amount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}, Required: ₦${amount.toFixed(2)}`,
      }, { status: 400 });
    }

    // Create or get customer
    const customerPhone = phone || user.phone;
    let customer = await prisma.customer.findUnique({
      where: {
        userId_phone: {
          userId: user.id,
          phone: customerPhone,
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId: user.id,
          phone: customerPhone,
          fullName: user.fullName,
          email: user.email || null,
          customerType: CustomerType.REGULAR,
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        },
      });
      console.log(`👤 [ELECTRICITY API] New customer created: ${customer.id}`);
    }

    // ✅ SAVE METER TO SAVED METERS
    try {
      console.log(`💾 [ELECTRICITY API] Attempting to save meter: ${meterNumber} for ${discoCode}`);
      
      // Check if meter already exists
      const existingMeter = await prisma.savedMeter.findFirst({
        where: {
          userId: user.id,
          meterNumber: meterNumber,
        },
      });

      if (!existingMeter) {
        const saved = await prisma.savedMeter.create({
          data: {
            userId: user.id,
            meterNumber: meterNumber,
            disco: discoCode,
            name: `${discoCode} Meter`,
            meterType: meterType || "Prepaid",
            isDefault: false,
          },
        });
        console.log(`✅ [ELECTRICITY API] Saved meter successfully: ${saved.id} - ${saved.meterNumber}`);
      } else {
        console.log(`ℹ️ [ELECTRICITY API] Meter already exists: ${existingMeter.id}`);
      }
    } catch (saveError) {
      console.error("❌ [ELECTRICITY API] Failed to save meter:", saveError);
      // Continue with transaction even if save fails
    }

    // Map meterType string to MeterType enum
    const meterTypeEnum = meterType?.toLowerCase() === 'prepaid' 
      ? MeterType.HOME 
      : MeterType.OFFICE;

    // Create transaction record
    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
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
    });

    console.log(`📝 [ELECTRICITY API] Transaction created: ${transaction.id}`);

    try {
      const vendorService = getVendorService();
      const result = await vendorService.buyElectricity(
        {
          meterNumber: meterNumber,
          amount: amount,
          discoCode: discoCode,
          meterType: meterType as any,
          phone: customerPhone,
        },
        user.id
      );

      console.log(`📊 [ELECTRICITY API] Vendor result:`, result);

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
              userId: user.id,
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

        console.log(`✅ [ELECTRICITY API] Transaction completed successfully!`);

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
            ...result.data,
          },
        });
      } else {
        console.log(`❌ [ELECTRICITY API] Vendor transaction failed:`, result.error);
        
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