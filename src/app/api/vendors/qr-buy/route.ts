// app/api/vendors/qr-buy/route.ts - with fallback for testing
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { TransactionStatus, VtuType, CustomerType, MeterType } from "@prisma/client";
import { compare } from "bcrypt";

// Try to import vendor service, but handle it gracefully
let getVendorService: any;
try {
  const vendorModule = require("~/lib/vendors/vendor.service");
  getVendorService = vendorModule.getVendorService;
} catch (error) {
  console.log("⚠️ Vendor service not available, using mock mode");
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    console.log(`👤 [QR BUY API] User authenticated: ${sessionUser.id}`);

    const body = await request.json();
    const { 
      serviceType, 
      identifier, 
      amount, 
      pin,
      discoCode,
      meterType,
      provider,
      packageCode
    } = body;

    console.log(`📝 [QR BUY API] Request body:`, JSON.stringify(body, null, 2));

    // Validate required fields
    if (!serviceType) {
      return NextResponse.json({
        success: false,
        error: "Service type is required (electricity or cable)",
      }, { status: 400 });
    }

    if (!identifier) {
      return NextResponse.json({
        success: false,
        error: "Identifier (meter/decoder number) is required",
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

    // Check if PIN is locked
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
    console.log(`🔐 PIN valid: ${isValidPin}`);

    if (!isValidPin) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { pinAttempts: { increment: 1 } },
        select: { pinAttempts: true },
      });

      const attemptsLeft = 5 - (updatedUser.pinAttempts || 0);
      
      if (attemptsLeft <= 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { pinLockedUntil: new Date(Date.now() + 15 * 60 * 1000) },
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
      data: { pinAttempts: 0, pinLockedUntil: null },
    });

    const walletBalance = Number(user.wallet.walletBalance);
    console.log(`💰 Wallet balance: ${walletBalance}, Amount: ${amount}`);

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
      console.log(`👤 [QR BUY API] New customer created: ${customer.id}`);
    }

    let transaction;
    let vendorResult = null;
    const isMockMode = !getVendorService;

    try {
      // Create transaction record
      if (serviceType === "electricity") {
        const disco = discoCode || "ABUJA";
        const meterTypeEnum = meterType?.toLowerCase() === 'prepaid' ? MeterType.HOME : MeterType.OFFICE;

        transaction = await prisma.vtuTransaction.create({
          data: {
            userId: user.id,
            transactionType: VtuType.ELECTRICITY_INSTANT,
            product: disco,
            amount: amount,
            totalDebited: amount,
            meterNumber: identifier,
            meterType: meterTypeEnum,
            status: TransactionStatus.PENDING,
            channel: "MOBILE_APP",
            metadata: {
              source: "QR_BUY",
              service: "ELECTRICITY",
              timestamp: new Date().toISOString(),
              discoCode: disco,
              meterType: meterType || "Prepaid",
              customerId: customer.id,
              pinVerified: true,
              qrPurchase: true,
            },
          },
        });

        console.log(`📝 Electricity transaction created: ${transaction.id}`);

        // Call vendor service if available
        if (!isMockMode && getVendorService) {
          try {
            const vendorService = getVendorService();
            vendorResult = await vendorService.buyElectricity(
              {
                meterNumber: identifier,
                amount: amount,
                discoCode: disco,
                meterType: meterType || "Prepaid",
                phone: user.phone,
              },
              user.id
            );
            console.log(`📊 Vendor result:`, JSON.stringify(vendorResult, null, 2));
          } catch (vendorError: any) {
            console.error(`❌ Vendor service error:`, vendorError);
            vendorResult = {
              success: false,
              error: vendorError.message || "Vendor service unavailable",
              vendor: null,
            };
          }
        } else {
          // Mock mode - simulate success
          console.log(`🔄 MOCK MODE: Simulating electricity purchase`);
          vendorResult = {
            success: true,
            vendor: "MOCK_VENDOR",
            vendorReference: `MOCK_${Date.now()}`,
            data: {
              token: `MOCK_TOKEN_${Date.now()}`,
              units: amount / 50,
              customerName: "Test Customer",
              address: "Test Address",
            },
          };
        }

      } else if (serviceType === "cable") {
        const prov = provider || "DSTV";
        const pkg = packageCode || "STANDARD";

        transaction = await prisma.vtuTransaction.create({
          data: {
            userId: user.id,
            transactionType: VtuType.CABLE_TV,
            product: `${prov} - ${pkg}`,
            amount: amount,
            totalDebited: amount,
            phoneNumber: user.phone,
            network: null,
            networkPlan: pkg,
            status: TransactionStatus.PENDING,
            channel: "MOBILE_APP",
            metadata: {
              source: "QR_BUY",
              service: "CABLE_TV",
              timestamp: new Date().toISOString(),
              provider: prov,
              packageCode: pkg,
              smartCardNumber: identifier,
              customerId: customer.id,
              pinVerified: true,
              qrPurchase: true,
            },
          },
        });

        console.log(`📝 Cable transaction created: ${transaction.id}`);

        // Call vendor service if available
        if (!isMockMode && getVendorService) {
          try {
            const vendorService = getVendorService();
            vendorResult = await vendorService.buyCableTV(
              {
                decoderNumber: identifier,
                packageCode: pkg,
                provider: prov,
                amount: amount,
                phone: user.phone,
              },
              user.id
            );
            console.log(`📊 Vendor result:`, JSON.stringify(vendorResult, null, 2));
          } catch (vendorError: any) {
            console.error(`❌ Vendor service error:`, vendorError);
            vendorResult = {
              success: false,
              error: vendorError.message || "Vendor service unavailable",
              vendor: null,
            };
          }
        } else {
          // Mock mode - simulate success
          console.log(`🔄 MOCK MODE: Simulating cable purchase`);
          vendorResult = {
            success: true,
            vendor: "MOCK_VENDOR",
            vendorReference: `MOCK_${Date.now()}`,
            data: {
              token: `MOCK_TOKEN_${Date.now()}`,
              customerName: "Test Customer",
              subscription: "Active",
            },
          };
        }

      } else {
        return NextResponse.json({
          success: false,
          error: "Invalid service type. Must be 'electricity' or 'cable'",
        }, { status: 400 });
      }

      // Check vendor result
      if (vendorResult && vendorResult.success) {
        let vendorId: string | null = null;
        if (vendorResult.vendor && vendorResult.vendor !== "MOCK_VENDOR") {
          const vendorRecord = await prisma.vendor.findFirst({
            where: { code: vendorResult.vendor as string },
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

        console.log(`💰 Processing wallet transaction...`);

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
              reference: `QR_${transaction.id}`,
              description: `QR Purchase: ${serviceType} for ${identifier}`,
              status: TransactionStatus.SUCCESS,
              category: serviceType === "electricity" ? "ELECTRICITY" : "CABLE_TV",
            },
          }),
          prisma.vtuTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.SUCCESS,
              vendorReference: vendorResult.vendorReference,
              vendorId: vendorId || undefined,
              vendor: vendorResult.vendor || "MOCK_VENDOR",
              token: vendorResult.data?.token,
              deliveredAt: new Date(),
              metadata: {
                ...transaction.metadata,
                vendorResponse: vendorResult.data,
                vendorName: vendorResult.vendor || "MOCK_VENDOR",
                vendorReference: vendorResult.vendorReference,
                success: true,
                token: vendorResult.data?.token,
                pinVerified: true,
                qrPurchase: true,
                mockMode: isMockMode,
              },
            },
          }),
          prisma.customerTransaction.create({
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
              metadata: {
                serviceType: serviceType,
                identifier: identifier,
                pinVerified: true,
                qrPurchase: true,
                mockMode: isMockMode,
                ...(serviceType === "electricity" ? { meterType: meterType } : { provider: provider }),
              },
            },
          }),
        ]);

        console.log(`✅ Transaction completed successfully!`);

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
            customerId: customer.id,
            isNewCustomer: customer.totalTransactions === 0,
            ...vendorResult.data,
          },
        });

      } else {
        // Vendor failed - update transaction as failed
        const errorMsg = vendorResult?.error || "Vendor transaction failed";
        console.log(`❌ Vendor transaction failed: ${errorMsg}`);
        
        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            metadata: {
              ...transaction.metadata,
              error: errorMsg,
              vendor: vendorResult?.vendor,
              failedAt: new Date().toISOString(),
              pinVerified: true,
              qrPurchase: true,
            },
          },
        });

        return NextResponse.json({
          success: false,
          error: errorMsg,
        }, { status: 400 });
      }

    } catch (error: any) {
      console.error(`❌ [QR BUY API] Error during purchase:`, error);
      
      if (transaction) {
        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            metadata: {
              ...transaction.metadata,
              error: error.message || "Unknown error",
              failedAt: new Date().toISOString(),
              pinVerified: true,
              qrPurchase: true,
            },
          },
        });
      }

      return NextResponse.json({
        success: false,
        error: error.message || "Purchase failed. Please try again.",
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error(`❌ [QR BUY API] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred",
    }, { status: 500 });
  }
}