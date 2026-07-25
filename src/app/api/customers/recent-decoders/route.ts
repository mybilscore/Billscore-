// app/api/customers/recent-decoders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    
    // Get unique decoders from customer transactions
    const transactions = await prisma.customerTransaction.findMany({
      where: {
        userId: sessionUser.id,
        planName: { not: null },
        transactionType: "CABLE_TV",
      },
      orderBy: { createdAt: "desc" },
      distinct: ["planName"],
      take: 10,
      select: {
        planName: true,
        product: true,
        metadata: true,
        createdAt: true,
      },
    });

    const decoders = transactions.map((tx) => ({
      decoderNumber: tx.planName || "Unknown",
      provider: tx.product || "Unknown",
      name: tx.metadata?.decoderName || `Decoder ${tx.planName}`,
      package: tx.metadata?.package || "Standard",
      lastUsed: tx.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: decoders,
    });
  } catch (error: any) {
    console.error("❌ Error fetching recent decoders:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch recent decoders",
    }, { status: 500 });
  }
}