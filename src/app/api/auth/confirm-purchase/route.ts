// app/api/auth/confirm-purchase/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { compare } from "bcrypt";
import { prisma } from "~/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, pin } = body;

    if (!token || !pin) {
      return NextResponse.json({
        success: false,
        error: "Token and PIN are required",
      }, { status: 400 });
    }

    // Verify token
    let decoded;
    try {
      decoded = verify(token, process.env.AUTH_SECRET || "fallback-secret") as any;
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: "Invalid or expired token",
      }, { status: 401 });
    }

    // Get user and verify PIN
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { wallet: true },
    });

    if (!user || !user.pinHash) {
      return NextResponse.json({
        success: false,
        error: "User not found or PIN not set",
      }, { status: 404 });
    }

    // Verify PIN
    const isValidPin = await compare(pin, user.pinHash);
    if (!isValidPin) {
      // Track failed attempts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pinAttempts: {
            increment: 1,
          },
        },
      });

      const attempts = user.pinAttempts + 1;
      if (attempts >= 5) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            pinLockedUntil: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
        return NextResponse.json({
          success: false,
          error: "Too many failed attempts. Account locked for 15 minutes.",
        }, { status: 403 });
      }

      return NextResponse.json({
        success: false,
        error: `Invalid PIN. ${5 - attempts} attempts remaining.`,
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

    // Complete the transaction
    const transaction = await prisma.$transaction(async (tx) => {
      // Update VtuTransaction to SUCCESS
      const updated = await tx.vtuTransaction.update({
        where: { id: decoded.transactionId },
        data: {
          status: "SUCCESS",
          deliveredAt: new Date(),
          metadata: {
            ...decoded,
            pinVerified: true,
            verifiedAt: new Date().toISOString(),
          },
        },
      });

      // Update wallet balance
      const wallet = await tx.wallet.update({
        where: { userId: user.id },
        data: {
          walletBalance: {
            decrement: decoded.amount,
          },
        },
      });

      // Update pending wallet transaction
      await tx.walletTransaction.updateMany({
        where: {
          reference: `PENDING_${decoded.transactionId}`,
          status: "PENDING",
        },
        data: {
          type: "DEBIT",
          status: "SUCCESS",
          balanceBefore: Number(wallet.walletBalance) + decoded.amount,
          balanceAfter: Number(wallet.walletBalance),
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: "Purchase confirmed successfully!",
      transactionId: transaction.id,
    });

  } catch (error) {
    console.error("Confirm purchase error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to confirm purchase",
    }, { status: 500 });
  }
}