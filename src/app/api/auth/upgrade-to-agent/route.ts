// src/app/api/auth/upgrade-to-agent/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is already an agent
    if (user.role === "AGENT" || user.role === "RETAILER") {
      return NextResponse.json(
        { success: false, error: "User is already an agent" },
        { status: 400 }
      );
    }

    // Update user to AGENT role
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        role: "AGENT",
      },
    });

    // Check if wallet exists, create if not
    let wallet = await prisma.wallet.findUnique({
      where: { userId: updatedUser.id },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: updatedUser.id,
          balance: 0,
          currency: "NGN",
        },
      });
    }

    // Add starter credit of ₦3,000
    const STARTER_CREDIT = 3000;
    
    // Update wallet balance
    await prisma.wallet.update({
      where: { userId: updatedUser.id },
      data: {
        balance: {
          increment: STARTER_CREDIT,
        },
      },
    });

    // Create transaction record for starter credit
    await prisma.transaction.create({
      data: {
        userId: updatedUser.id,
        amount: STARTER_CREDIT,
        type: "CREDIT",
        status: "COMPLETED",
        description: "Starter credit for new agent",
        reference: `STARTER-${Date.now()}`,
        metadata: {
          type: "STARTER_CREDIT",
          role: "AGENT",
        },
      },
    });

    console.log("✅ User upgraded to agent:", {
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      starterCredit: STARTER_CREDIT,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully upgraded to agent!",
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          role: updatedUser.role,
        },
        wallet: {
          balance: wallet.balance + STARTER_CREDIT,
          currency: wallet.currency,
        },
        starterCredit: STARTER_CREDIT,
      },
    });

  } catch (error: any) {
    console.error("❌ Agent upgrade error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to upgrade to agent",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}