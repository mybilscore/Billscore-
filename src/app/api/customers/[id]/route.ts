// app/api/customers/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const { id } = params;

    const customer = await prisma.customer.findFirst({
      where: {
        id: id,
        userId: sessionUser.id,
      },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            vtuTransaction: true,
          },
        },
        notesHistory: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        communications: {
          orderBy: { sentAt: "desc" },
          take: 5,
        },
        loyaltyPoints: true,
        discounts: {
          where: { isActive: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({
        success: false,
        error: "Customer not found",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error: any) {
    console.error("❌ Error fetching customer:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch customer",
    }, { status: 500 });
  }
}