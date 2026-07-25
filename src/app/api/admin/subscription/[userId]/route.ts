// app/api/admin/subscription/[userId]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "~/lib/auth";
import { prisma } from "~/lib/db";

// Validation schema for subscription update
const subscriptionUpdateSchema = z.object({
  newPlanId: z.string().min(1, "Plan ID is required"),
  newPlanType: z.enum(["monthly", "quarterly", "yearly"], {
    required_error: "Plan type is required",
  }),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }, // FIXED: Use Promise for params
) {
  try {
    // Await the params promise
    const params = await context.params;
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = subscriptionUpdateSchema.parse(body);

    const { newPlanId, newPlanType } = validatedData;

    // Calculate expiration date based on plan type
    const calculateExpirationDate = (type: string) => {
      const now = new Date();
      switch (type) {
        case "monthly":
          return new Date(now.setMonth(now.getMonth() + 1));
        case "quarterly":
          return new Date(now.setMonth(now.getMonth() + 3));
        case "yearly":
          return new Date(now.setFullYear(now.getFullYear() + 1));
        default:
          return new Date(now.setMonth(now.getMonth() + 1));
      }
    };

    const expiresAt = calculateExpirationDate(newPlanType);

    // Update user subscription
    const updatedUser = await prisma.user.update({
      where: { phone: userId },
      data: {
        subs_stat: 1,
      },
    });

    const updatedSub = await prisma.subscription.update({
      where: { userId: userId },
      data: {
        planId: Number(newPlanId),
        planType: newPlanType,
        status: "ACTIVE",
        expiresAt: expiresAt,
      },
    });

    // Create subscription history record
    await prisma.subscriptionHistory.create({
      data: {
        userId: userId,
        planId: Number(newPlanId),
        planType: newPlanType,
        status: "ACTIVE",
        expiresAt: expiresAt,
        changeReason: "Admin manual update",
      },
    });

    return NextResponse.json(
      {
        message: "Subscription updated successfully",
        user: updatedUser,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Subscription update error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 },
    );
  }
}
