// bilscore-app/app/api/admin/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { UserRole } from "@prisma/client";

// ✅ Validate API Key
function validateApiKey(request: NextRequest): { valid: boolean; error?: string } {
  const apiKey = request.headers.get("x-api-key");
  const validApiKeys = [
    process.env.BILSCORE_API_KEY,
    process.env.BILSCORE_ADMIN_API_KEY,
    process.env.BILSCORE_EXTERNAL_API_KEY,
  ].filter(Boolean);

  if (!apiKey) {
    return { valid: false, error: "API key is required" };
  }

  if (!validApiKeys.includes(apiKey)) {
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true };
}

export async function GET(request: NextRequest) {
  try {
    // ✅ Validate API key
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { username: { contains: search } },
      ];
    }

    if (role && role !== "all") {
      where.role = role as UserRole;
    }

    if (status === "verified") {
      where.isVerified = true;
    } else if (status === "unverified") {
      where.isVerified = false;
    } else if (status === "locked") {
      where.isLocked = true;
    }

    // Fetch users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          phone: true,
          role: true,
          isVerified: true,
          isLocked: true,
          hasWallet: true,
          walletBalance: true,
          referralCode: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          wallet: {
            select: {
              id: true,
              accountNumber: true,
              bankName: true,
              accountName: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Format users
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      isLocked: user.isLocked,
      hasWallet: user.hasWallet,
      walletBalance: Number(user.walletBalance || 0),
      referralCode: user.referralCode,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
      wallet: user.wallet,
    }));

    const response = NextResponse.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });

    // ✅ Set CORS headers
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN USERS API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch users",
    }, { status: 500 });
  }
}

// ✅ Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}