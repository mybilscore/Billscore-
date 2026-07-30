// app/api/auth/validate-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({
        success: false,
        error: "Token is required",
      }, { status: 400 });
    }

    // Verify token
    const decoded = verify(token, process.env.AUTH_SECRET || "fallback-secret") as any;

    // Check if transaction exists and is pending
    const transaction = await prisma.vtuTransaction.findFirst({
      where: {
        id: decoded.transactionId,
        userId: decoded.userId,
        status: "PENDING",
        metadata: {
          path: "$.pendingPin",
          equals: true,
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({
        success: false,
        error: "Transaction not found or already processed",
      }, { status: 404 });
    }

    // Check if token is expired
    const tokenExpiry = transaction.metadata?.tokenExpiry;
    if (tokenExpiry && new Date(tokenExpiry) < new Date()) {
      return NextResponse.json({
        success: false,
        error: "Validation link has expired",
      }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        serviceType: transaction.transactionType,
        amount: Number(transaction.amount),
        recipient: transaction.phoneNumber || transaction.meterNumber || "N/A",
      },
    });

  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json({
      success: false,
      error: "Invalid or expired token",
    }, { status: 401 });
  }
}