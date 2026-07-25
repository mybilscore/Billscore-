// app/api/vendors/pre-order/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { PreOrderStatus, VtuType, MeterType } from "@prisma/client";
import { compare } from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const body = await request.json();
    const { serviceType, meterNumber, decoderNumber, discoCode, provider, amount, deliveryDate, paymentOption, pin } = body;

    if (!amount || !deliveryDate) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields",
      }, { status: 400 });
    }

    if (serviceType === "electricity" && !meterNumber) {
      return NextResponse.json({
        success: false,
        error: "Meter number is required",
      }, { status: 400 });
    }

    if (serviceType === "cable" && !decoderNumber) {
      return NextResponse.json({
        success: false,
        error: "Decoder number is required",
      }, { status: 400 });
    }

    // Validate payment option
    if (!paymentOption || !["pay_now", "schedule_only"].includes(paymentOption)) {
      return NextResponse.json({
        success: false,
        error: "Invalid payment option",
      }, { status: 400 });
    }

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

    // If paying now, validate PIN and balance
    if (paymentOption === "pay_now") {
      if (!pin || pin.length < 4) {
        return NextResponse.json({
          success: false,
          error: "Please enter your 4-6 digit transaction PIN",
        }, { status: 400 });
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

      if (Number(user.wallet.walletBalance) < amount) {
        return NextResponse.json({
          success: false,
          error: "Insufficient balance",
        }, { status: 400 });
      }
    }

    // Create pre-order
    const preOrder = await prisma.preOrder.create({
      data: {
        userId: user.id,
        disCo: discoCode as any || "IKEJA",
        meterNumber: meterNumber || decoderNumber || "",
        meterType: MeterType.HOME,
        meterName: serviceType === "electricity" ? `${discoCode} Meter` : `${provider} Decoder`,
        amount: amount,
        serviceFee: 0,
        totalDebited: paymentOption === "pay_now" ? amount : 0,
        deliveryDate: new Date(deliveryDate),
        status: PreOrderStatus.PENDING,
        metadata: {
          serviceType,
          provider,
          decoderNumber,
          paymentOption,
          source: "PreOrderAPI",
          timestamp: new Date().toISOString(),
          pinVerified: paymentOption === "pay_now",
        },
      },
    });

    // If paying now, deduct from wallet
    if (paymentOption === "pay_now") {
      await prisma.$transaction([
        prisma.wallet.update({
          where: { id: user.wallet.id },
          data: { walletBalance: { decrement: amount } },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: user.wallet.id,
            userId: user.id,
            type: "DEBIT",
            amount: amount,
            balanceBefore: Number(user.wallet.walletBalance),
            balanceAfter: Number(user.wallet.walletBalance) - amount,
            reference: `PRE_${preOrder.id}`,
            description: `Pre-order for ${serviceType === "electricity" ? meterNumber : decoderNumber}`,
            status: "SUCCESS",
            category: serviceType === "electricity" ? "ELECTRICITY" : "CABLE_TV",
          },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: preOrder.id,
        meterNumber: preOrder.meterNumber,
        disco: preOrder.disco,
        amount: Number(preOrder.amount),
        deliveryDate: preOrder.deliveryDate,
        status: preOrder.status,
        isPaid: paymentOption === "pay_now",
      },
    });
  } catch (error: any) {
    console.error("❌ Pre-order error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to create pre-order",
    }, { status: 500 });
  }
}