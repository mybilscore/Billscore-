// app/api/vendors/cable/purchase/route.ts - COMPLETE UPDATED

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { TransactionStatus, VtuType, CustomerType } from "@prisma/client";
import { compare } from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    console.log(`👤 [CABLE API] User authenticated: ${sessionUser.id}`);

    const body = await request.json();
    const { smartCardNumber, packageCode, provider, amount, pin } = body;

    console.log(`📝 [CABLE API] Request:`, { smartCardNumber, packageCode, provider, amount, pin: pin ? '***' : 'missing' });

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
    console.log(`💰 [CABLE API] Wallet balance: ${walletBalance}, Amount: ${amount}`);

    if (walletBalance < amount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}, Required: ₦${amount.toFixed(2)}`,
      }, { status: 400 });
    }

    // Create or get customer
    let customer = await prisma.customer.findUnique({
      where: {
        userId_phone: {
          userId: user.id,
          phone: user.phone,
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
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
        },
      });
      console.log(`👤 [CABLE API] New customer created: ${customer.id}`);
    }

    // ✅ SAVE DECODER TO SAVED DECODERS
    try {
      console.log(`💾 [CABLE API] Attempting to save decoder: ${smartCardNumber} for ${provider}`);
      
      // Check if decoder already exists
      const existingDecoder = await prisma.savedDecoder.findFirst({
        where: {
          userId: user.id,
          decoderNumber: smartCardNumber,
        },
      });

      if (!existingDecoder) {
        const saved = await prisma.savedDecoder.create({
          data: {
            userId: user.id,
            decoderNumber: smartCardNumber,
            provider: provider,
            name: `${provider} Decoder`,
            package: packageCode,
            isDefault: false,
          },
        });
        console.log(`✅ [CABLE API] Saved decoder successfully: ${saved.id} - ${saved.decoderNumber}`);
      } else {
        console.log(`ℹ️ [CABLE API] Decoder already exists: ${existingDecoder.id}`);
      }
    } catch (saveError) {
      console.error("❌ [CABLE API] Failed to save decoder:", saveError);
      // Continue with transaction even if save fails
    }

    // Create transaction record
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

    console.log(`📝 [CABLE API] Transaction created: ${transaction.id}`);

    try {
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

      console.log(`📊 [CABLE API] Vendor result:`, result);

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

        console.log(`✅ [CABLE API] Transaction completed successfully!`);

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
            ...result.data,
          },
        });
      } else {
        console.log(`❌ [CABLE API] Vendor transaction failed:`, result.error);
        
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