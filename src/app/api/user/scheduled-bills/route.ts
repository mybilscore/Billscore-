// app/api/user/scheduled-bills/route.ts

import { NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { PreOrderStatus } from "@prisma/client";

export async function GET() {
  try {
    console.log("📋 [SCHEDULED BILLS] API called");
    
    const user = await requireAuth("/auth/sign-in");
    console.log(`👤 [SCHEDULED BILLS] User: ${user.id}`);

    // ✅ Get pre-orders with transaction details only
    const preOrders = await prisma.preOrder.findMany({
      where: {
        userId: user.id,
        isCancelled: false,
        status: {
          in: [
            PreOrderStatus.PENDING,
            PreOrderStatus.PROCESSING,
            PreOrderStatus.PURCHASED,
            PreOrderStatus.DELIVERED,
          ],
        },
      },
      orderBy: { deliveryDate: "asc" },
      include: {
        transaction: {
          select: {
            id: true,
            token: true,
            status: true,
            deliveredAt: true,
          },
        },
      },
    });

    console.log(`📊 [SCHEDULED BILLS] Found ${preOrders.length} pre-orders`);

    // Format the data
    const formattedBills = preOrders.map((order) => {
      const transaction = order.transaction;
      let token = null;

      // Get token from transaction
      if (transaction?.token) {
        token = transaction.token;
      }

      return {
        id: order.id,
        type: "ELECTRICITY" as const,
        meterNumber: order.meterNumber,
        disco: order.disCo,
        amount: Number(order.amount),
        deliveryDate: order.deliveryDate.toISOString(),
        nextRenewalDate: new Date(order.deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: order.status,
        token: token,
        isActive: order.status !== PreOrderStatus.DELIVERED,
        isPaused: false,
      };
    });

    console.log(`✅ [SCHEDULED BILLS] Returning ${formattedBills.length} bills`);

    return NextResponse.json({
      success: true,
      data: formattedBills,
    });

  } catch (error: any) {
    console.error("❌ [SCHEDULED BILLS] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch scheduled bills",
    }, { status: 500 });
  }
}