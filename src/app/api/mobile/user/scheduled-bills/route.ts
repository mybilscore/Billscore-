// src/app/api/mobile/user/scheduled-bills/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { verify } from "jsonwebtoken";
import { PreOrderStatus } from "@prisma/client";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

async function authenticateMobile(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  console.log("📋 [MOBILE SCHEDULED BILLS] API called");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;

    // Get pre-orders with transaction details
    const preOrders = await prisma.preOrder.findMany({
      where: {
        userId: userId,
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

    console.log(`📊 [MOBILE SCHEDULED BILLS] Found ${preOrders.length} pre-orders`);

    // Format the data
    const formattedBills = preOrders.map((order) => {
      const transaction = order.transaction;
      let token = null;

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

    return NextResponse.json({
      success: true,
      data: formattedBills,
    });

  } catch (error: any) {
    console.error("❌ [MOBILE SCHEDULED BILLS] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch scheduled bills",
    }, { status: 500 });
  }
}