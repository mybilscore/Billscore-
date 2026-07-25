// app/api/customers/recent/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    // Get recent customers for this user
    const customers = await prisma.customer.findMany({
      where: {
        userId: sessionUser.id,
        ...(search && {
          OR: [
            { phone: { contains: search } },
            { fullName: { contains: search } },
          ],
        }),
      },
      orderBy: { lastTransactionAt: "desc" },
      take: limit,
      select: {
        id: true,
        phone: true,
        fullName: true,
        totalTransactions: true,
        totalSpent: true,
        lastTransactionAt: true,
        firstTransactionAt: true,
        customerType: true,
        isFavorite: true,
      },
    });

    // Get total count for pagination
    const total = await prisma.customer.count({
      where: {
        userId: sessionUser.id,
        ...(search && {
          OR: [
            { phone: { contains: search } },
            { fullName: { contains: search } },
          ],
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        customers,
        total,
        limit,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching customers:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch customers",
    }, { status: 500 });
  }
}