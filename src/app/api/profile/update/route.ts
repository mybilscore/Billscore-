// app/api/profile/update/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";

export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const body = await request.json();
    const { fullName, email, phone } = body;

    // Validate
    if (!fullName) {
      return NextResponse.json({
        success: false,
        error: "Full name is required",
      }, { status: 400 });
    }

    // Check if email is taken by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: sessionUser.id },
        },
      });
      if (existingUser) {
        return NextResponse.json({
          success: false,
          error: "Email is already in use",
        }, { status: 400 });
      }
    }

    // Check if phone is taken by another user
    if (phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: sessionUser.id },
        },
      });
      if (existingUser) {
        return NextResponse.json({
          success: false,
          error: "Phone number is already in use",
        }, { status: 400 });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        fullName,
        email: email || undefined,
        phone: phone || undefined,
      },
    });

    // Update wallet account name if wallet exists
    if (updatedUser.wallet) {
      await prisma.wallet.update({
        where: { userId: sessionUser.id },
        data: { accountName: fullName },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
      },
    });
  } catch (error: any) {
    console.error("❌ Update profile error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to update profile",
    }, { status: 500 });
  }
}