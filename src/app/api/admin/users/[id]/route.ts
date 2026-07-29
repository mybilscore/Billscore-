// bilscore-app/app/api/admin/users/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { UserRole, TransactionStatus } from "@prisma/client";

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

// ============================================================
// GET - Fetch user details
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const { id } = params;
    const searchParams = new URL(request.url).searchParams;
    const transactionPage = parseInt(searchParams.get("transactionPage") || "1");
    const transactionLimit = parseInt(searchParams.get("transactionLimit") || "10");
    const transactionSkip = (transactionPage - 1) * transactionLimit;

    // ✅ Fetch user with all related data
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        wallet: true,
        customers: {
          take: 5,
          orderBy: { lastTransactionAt: "desc" },
        },
        subscriptions: {
          where: { isActive: true },
          take: 5,
        },
        preOrders: {
          where: { isCancelled: false },
          take: 5,
          orderBy: { deliveryDate: "asc" },
        },
        referredReferrals: {
          include: {
            referee: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
          take: 5,
        },
      },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    // ✅ Fetch wallet transactions with pagination
    const [walletTransactions, walletTransactionCount] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: transactionLimit,
        skip: transactionSkip,
        include: {
          vtuTransaction: {
            select: {
              id: true,
              transactionType: true,
              product: true,
              status: true,
            },
          },
        },
      }),
      prisma.walletTransaction.count({
        where: { userId: id },
      }),
    ]);

    // ✅ Fetch VTU transactions with pagination
    const [vtuTransactions, vtuTransactionCount] = await Promise.all([
      prisma.vtuTransaction.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: transactionLimit,
        skip: transactionSkip,
        include: {
          selectedVendor: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      prisma.vtuTransaction.count({
        where: { userId: id },
      }),
    ]);

    // ✅ Get wallet stats
    const walletStats = await prisma.walletTransaction.aggregate({
      where: { userId: id, status: TransactionStatus.SUCCESS },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // ✅ Get VTU stats
    const vtuStats = await prisma.vtuTransaction.aggregate({
      where: { userId: id, status: TransactionStatus.SUCCESS },
      _sum: {
        amount: true,
        totalDebited: true,
      },
      _count: {
        id: true,
      },
    });

    // ✅ Get customer stats
    const customerStats = await prisma.customer.aggregate({
      where: { userId: id },
      _sum: {
        totalSpent: true,
        totalCommissionEarned: true,
      },
      _count: {
        id: true,
      },
    });

    // Format wallet transactions
    const formattedWalletTransactions = walletTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      balanceBefore: Number(tx.balanceBefore),
      balanceAfter: Number(tx.balanceAfter),
      reference: tx.reference,
      description: tx.description,
      status: tx.status,
      category: tx.category,
      channel: tx.channel,
      createdAt: tx.createdAt.toISOString(),
      vtuTransaction: tx.vtuTransaction,
    }));

    // Format VTU transactions
    const formattedVtuTransactions = vtuTransactions.map((tx) => ({
      id: tx.id,
      type: tx.transactionType,
      product: tx.product,
      amount: Number(tx.amount),
      serviceFee: Number(tx.serviceFee || 0),
      totalDebited: Number(tx.totalDebited),
      status: tx.status,
      phoneNumber: tx.phoneNumber,
      meterNumber: tx.meterNumber,
      network: tx.network,
      networkPlan: tx.networkPlan,
      vendor: tx.vendor,
      vendorName: tx.selectedVendor?.name || tx.vendor,
      vendorReference: tx.vendorReference,
      token: tx.token,
      channel: tx.channel,
      createdAt: tx.createdAt.toISOString(),
      deliveredAt: tx.deliveredAt?.toISOString(),
      scheduledFor: tx.scheduledFor?.toISOString(),
    }));

    // ✅ Format response
    const response = NextResponse.json({
      success: true,
      data: {
        // User basic info
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
        referredBy: user.referredBy,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
        loginAttempts: user.loginAttempts,
        pinAttempts: user.pinAttempts,
        isWalletFrozen: user.isWalletFrozen,
        walletFrozenReason: user.walletFrozenReason,
        kycStatus: user.kycStatus,
        preferredChannel: user.preferredChannel,
        preferredLanguage: user.preferredLanguage,

        // Wallet
        wallet: user.wallet ? {
          id: user.wallet.id,
          accountNumber: user.wallet.accountNumber,
          bankName: user.wallet.bankName,
          accountName: user.wallet.accountName,
          walletBalance: Number(user.wallet.walletBalance),
          ledgerBalance: Number(user.wallet.ledgerBalance),
          isActive: user.wallet.isActive,
          isFrozen: user.wallet.isFrozen,
          kycLevel: user.wallet.kycLevel,
          dailyLimit: Number(user.wallet.dailyLimit),
          monthlyLimit: Number(user.wallet.monthlyLimit),
        } : null,

        // Stats
        stats: {
          wallet: {
            totalTransactions: walletTransactionCount,
            totalCredit: Number(walletStats._sum.amount || 0),
            totalDebit: 0,
          },
          vtu: {
            totalTransactions: vtuTransactionCount,
            totalSpent: Number(vtuStats._sum.totalDebited || 0),
            totalAmount: Number(vtuStats._sum.amount || 0),
            successCount: vtuTransactions.filter(t => t.status === TransactionStatus.SUCCESS).length,
            failedCount: vtuTransactions.filter(t => t.status === TransactionStatus.FAILED).length,
            pendingCount: vtuTransactions.filter(t => t.status === TransactionStatus.PENDING).length,
          },
          customer: {
            totalCustomers: customerStats._count.id || 0,
            totalSpent: Number(customerStats._sum.totalSpent || 0),
            totalCommission: Number(customerStats._sum.totalCommissionEarned || 0),
          },
        },

        // Transactions
        transactions: {
          wallet: {
            data: formattedWalletTransactions,
            pagination: {
              page: transactionPage,
              limit: transactionLimit,
              total: walletTransactionCount,
              totalPages: Math.ceil(walletTransactionCount / transactionLimit),
            },
          },
          vtu: {
            data: formattedVtuTransactions,
            pagination: {
              page: transactionPage,
              limit: transactionLimit,
              total: vtuTransactionCount,
              totalPages: Math.ceil(vtuTransactionCount / transactionLimit),
            },
          },
        },

        // Related data
        customers: user.customers,
        subscriptions: user.subscriptions,
        preOrders: user.preOrders,
        referrals: user.referredReferrals,
      },
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN USER API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch user",
    }, { status: 500 });
  }
}

// ============================================================
// PATCH - Update user (Block/Unblock, etc.)
// ============================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    // Don't allow blocking super admin
    if (body.isLocked === true && existingUser.role === "SUPER_ADMIN") {
      return NextResponse.json({
        success: false,
        error: "Cannot block a super admin user",
      }, { status: 403 });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: {
        isLocked: body.isLocked,
        isVerified: body.isVerified,
        fullName: body.fullName,
        phone: body.phone,
        role: body.role as UserRole,
        isWalletFrozen: body.isWalletFrozen,
        walletFrozenReason: body.walletFrozenReason,
        username: body.username,
        kycStatus: body.kycStatus,
        preferredChannel: body.preferredChannel,
        preferredLanguage: body.preferredLanguage,
      },
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
    });

    const response = NextResponse.json({
      success: true,
      data: {
        ...user,
        walletBalance: Number(user.walletBalance || 0),
        wallet: user.wallet ? {
          ...user.wallet,
          walletBalance: Number(user.wallet.walletBalance || 0),
        } : null,
      },
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN USER API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to update user",
    }, { status: 500 });
  }
}

// ============================================================
// DELETE - Delete user
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    // Don't allow deleting super admin
    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json({
        success: false,
        error: "Cannot delete super admin user",
      }, { status: 403 });
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id },
    });

    const response = NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN USER API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to delete user",
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}