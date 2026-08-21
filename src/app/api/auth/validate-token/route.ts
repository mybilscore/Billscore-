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

    // Find transaction by validation token
    let transaction = await prisma.vtuTransaction.findFirst({
      where: {
        status: "PENDING",
        metadata: {
          path: "$.validationToken",
          equals: token,
        },
      },
      select: {
        id: true,
        transactionType: true,
        amount: true,
        phoneNumber: true,
        meterNumber: true,
        product: true,
        networkPlan: true,
        network: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Fallback: manual filter
    if (!transaction) {
      console.log(`🔍 [Validate Token] Fallback search...`);
      const pendingTransactions = await prisma.vtuTransaction.findMany({
        where: { status: "PENDING" },
        take: 50,
        select: {
          id: true,
          transactionType: true,
          amount: true,
          phoneNumber: true,
          meterNumber: true,
          product: true,
          networkPlan: true,
          network: true,
          metadata: true,
          createdAt: true,
        },
      });
      
      const found = pendingTransactions.find((tx: any) => {
        return tx.metadata?.validationToken === token;
      });
      
      if (found) {
        transaction = found;
        console.log(`✅ [Validate Token] Found via fallback: ${transaction.id}`);
      }
    }

    if (!transaction) {
      return NextResponse.json({
        success: false,
        error: "Invalid or expired validation link",
      }, { status: 404 });
    }

    // Check if expired
    const validationExpiry = transaction.metadata?.validationExpiry;
    if (validationExpiry && new Date(validationExpiry) < new Date()) {
      return NextResponse.json({
        success: false,
        error: "Validation link has expired",
      }, { status: 410 });
    }

    // Check if already processed
    if (transaction.metadata?.processed === true) {
      return NextResponse.json({
        success: false,
        error: "This transaction has already been processed",
      }, { status: 400 });
    }

    // Determine recipient based on transaction type
    let recipient = "N/A";
    let serviceTypeDisplay = "";
    let details = {};

    switch (transaction.transactionType) {
      case "AIRTIME":
        recipient = transaction.phoneNumber || "N/A";
        serviceTypeDisplay = "Airtime";
        details = {
          network: transaction.product || "N/A",
          phoneNumber: transaction.phoneNumber,
        };
        break;

      case "DATA":
        recipient = transaction.phoneNumber || "N/A";
        serviceTypeDisplay = "Data";
        details = {
          network: transaction.product || "N/A",
          plan: transaction.networkPlan || "N/A",
          phoneNumber: transaction.phoneNumber,
        };
        break;

      case "ELECTRICITY_INSTANT":
      case "ELECTRICITY_PREORDER":
        recipient = transaction.meterNumber || "N/A";
        serviceTypeDisplay = "Electricity";
        details = {
          disco: transaction.product || "N/A",
          meterNumber: transaction.meterNumber,
          meterType: transaction.meterType || "Prepaid",
        };
        break;

      case "CABLE_TV":
        recipient = transaction.metadata?.smartCardNumber || transaction.phoneNumber || "N/A";
        serviceTypeDisplay = "Cable TV";
        details = {
          provider: transaction.product || "N/A",
          package: transaction.networkPlan || "N/A",
          decoderNumber: transaction.metadata?.smartCardNumber || "N/A",
        };
        break;

      case "EDUCATION":
        recipient = transaction.phoneNumber || "N/A";
        serviceTypeDisplay = "Education";
        details = {
          service: transaction.product || "N/A",
          variation: transaction.networkPlan || "N/A",
          quantity: transaction.bulkQuantity || 1,
        };
        break;

      default:
        recipient = transaction.phoneNumber || transaction.meterNumber || "N/A";
        serviceTypeDisplay = transaction.transactionType || "Unknown";
        details = {
          product: transaction.product || "N/A",
        };
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        serviceType: serviceTypeDisplay,
        transactionType: transaction.transactionType,
        amount: Number(transaction.amount),
        recipient: recipient,
        product: transaction.product,
        networkPlan: transaction.networkPlan,
        network: transaction.network,
        details: details,
        createdAt: transaction.createdAt,
      },
    });

  } catch (error: any) {
    console.error("❌ [Validate Token] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to validate token",
    }, { status: 500 });
  }
}