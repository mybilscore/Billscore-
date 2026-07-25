// app/api/customers/recent-meters/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    
    // Get unique meters from customer transactions
    const transactions = await prisma.customerTransaction.findMany({
      where: {
        userId: sessionUser.id,
        meterNumber: { not: null },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["meterNumber"],
      take: 10,
      select: {
        meterNumber: true,
        product: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Format the response
    const meters = transactions.map((tx) => ({
      meterNumber: tx.meterNumber,
      disco: tx.product || "Unknown",
      name: tx.metadata?.meterName || `Meter ${tx.meterNumber}`,
      meterType: tx.metadata?.meterType || "Prepaid",
      lastUsed: tx.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: meters,
    });
  } catch (error: any) {
    console.error("❌ Error fetching recent meters:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch recent meters",
    }, { status: 500 });
  }
}