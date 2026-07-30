// app/api/auth/purchase-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { sign } from "jsonwebtoken";
import { requireAuth } from "~/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("/auth/sign-in");
    const body = await request.json();
    const { transactionId, amount, serviceType, recipient, details } = body;

    if (!transactionId || !amount || !serviceType) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields",
      }, { status: 400 });
    }

    // Create a one-time token for PIN validation
    const token = sign(
      {
        userId: user.id,
        transactionId,
        amount,
        serviceType,
        recipient,
        details,
        timestamp: Date.now(),
      },
      process.env.AUTH_SECRET || "fallback-secret",
      { expiresIn: "5m" } // 5 minutes expiry
    );

    // Store the pending transaction
    await prisma.$transaction([
      prisma.vtuTransaction.update({
        where: { id: transactionId },
        data: {
          status: "PENDING",
          metadata: {
            pendingPin: true,
            tokenExpiry: new Date(Date.now() + 5 * 60 * 1000),
            validationToken: token,
          },
        },
      }),
      // Create a pending wallet transaction
      prisma.walletTransaction.create({
        data: {
          walletId: user.wallet?.id || "",
          userId: user.id,
          type: "RESERVE",
          amount: amount,
          balanceBefore: Number(user.wallet?.walletBalance || 0),
          balanceAfter: Number(user.wallet?.walletBalance || 0),
          reference: `PENDING_${transactionId}`,
          description: `Pending ${serviceType} purchase - await PIN validation`,
          status: "PENDING",
          category: serviceType.toUpperCase() as any,
          metadata: {
            validationToken: token,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          },
        },
      }),
    ]);

    // Generate the validation link
    const validationLink = `${process.env.NEXTAUTH_URL}/auth/validate-purchase?token=${token}`;

    return NextResponse.json({
      success: true,
      data: {
        validationLink,
        expiresIn: "5 minutes",
        transactionId,
      },
    });

  } catch (error) {
    console.error("Purchase link error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to generate validation link",
    }, { status: 500 });
  }
}