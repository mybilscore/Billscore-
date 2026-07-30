// app/api/auth/validate-token/route.ts
import { NextRequest, NextResponse } from "next/server";
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

    console.log(`🔍 [Validate Token] Looking for token: ${token}`);

    // ✅ CORRECT: Query JSON metadata field
    const transaction = await prisma.vtuTransaction.findFirst({
      where: {
        status: "PENDING",
        metadata: {
          path: "$.validationToken",
          equals: token,
        },
      },
    });

    // ✅ FALLBACK: Manual filter
    if (!transaction) {
      console.log(`🔍 [Validate Token] Not found with path query, trying fallback...`);
      
      const pendingTransactions = await prisma.vtuTransaction.findMany({
        where: { status: "PENDING" },
        take: 50,
      });
      
      const found = pendingTransactions.find((tx: any) => {
        return tx.metadata?.validationToken === token;
      });
      
      if (found) {
        console.log(`✅ [Validate Token] Found via fallback: ${found.id}`);
        
        const validationExpiry = found.metadata?.validationExpiry;
        if (validationExpiry && new Date(validationExpiry) < new Date()) {
          return NextResponse.json({
            success: false,
            error: "Validation link has expired",
          }, { status: 410 });
        }

        return NextResponse.json({
          success: true,
          transaction: {
            id: found.id,
            serviceType: found.transactionType,
            amount: Number(found.amount),
            recipient: found.phoneNumber || found.meterNumber || "N/A",
            details: found.product,
          },
        });
      }

      console.log(`❌ [Validate Token] No transaction found for token: ${token}`);
      return NextResponse.json({
        success: false,
        error: "Invalid or expired token",
      }, { status: 404 });
    }

    console.log(`✅ [Validate Token] Found transaction: ${transaction.id}`);

    const validationExpiry = transaction.metadata?.validationExpiry;
    if (validationExpiry && new Date(validationExpiry) < new Date()) {
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
        details: transaction.product,
      },
    });

  } catch (error) {
    console.error("❌ [Validate Token] Error:", error);
    return NextResponse.json({
      success: false,
      error: "Invalid or expired token",
    }, { status: 500 });
  }
}