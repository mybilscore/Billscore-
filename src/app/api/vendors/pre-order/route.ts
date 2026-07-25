// app/api/vendors/pre-order/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { PreOrderStatus, VtuType, MeterType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const body = await request.json();
    const { serviceType, meterNumber, decoderNumber, discoCode, provider, amount, deliveryDate } = body;

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

    if (Number(user.wallet.walletBalance) < amount) {
      return NextResponse.json({
        success: false,
        error: "Insufficient balance",
      }, { status: 400 });
    }

    const preOrder = await prisma.preOrder.create({
      data: {
        userId: user.id,
        disCo: discoCode as any || "IKEJA",
        meterNumber: meterNumber || decoderNumber || "",
        meterType: MeterType.HOME,
        meterName: serviceType === "electricity" ? `${discoCode} Meter` : `${provider} Decoder`,
        amount: amount,
        serviceFee: 0,
        totalDebited: amount,
        deliveryDate: new Date(deliveryDate),
        status: PreOrderStatus.PENDING,
        metadata: {
          serviceType,
          provider,
          decoderNumber,
          source: "PreOrderAPI",
          timestamp: new Date().toISOString(),
        },
      },
    });

    await prisma.wallet.update({
      where: { id: user.wallet.id },
      data: {
        walletBalance: {
          decrement: amount,
        },
      },
    });

    await prisma.walletTransaction.create({
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
        category: "ELECTRICITY",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: preOrder.id,
        meterNumber: preOrder.meterNumber,
        disco: preOrder.disco,
        amount: Number(preOrder.amount),
        deliveryDate: preOrder.deliveryDate,
        status: preOrder.status,
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