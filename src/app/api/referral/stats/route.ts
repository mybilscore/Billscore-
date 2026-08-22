// app/api/referral/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const userId = sessionUser.id;

    // Get user with referral code and wallet
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referralCode: true,
        fullName: true,
        wallet: {
          select: {
            walletBalance: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    // Get referral stats
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats
    const totalReferrals = referrals.length;
    const completedReferrals = referrals.filter(r => r.status === "COMPLETED").length;
    const pendingReferrals = referrals.filter(r => r.status === "PENDING").length;
    const totalEarned = referrals.reduce((sum, r) => sum + Number(r.rewardAmount || 0), 0);

    // Get recent referrals (last 5)
    const recentReferrals = referrals.slice(0, 5).map(r => ({
      id: r.id,
      refereeName: r.referee?.fullName || "Unknown",
      refereeEmail: r.referee?.email || null,
      refereePhone: r.referee?.phone || null,
      status: r.status,
      rewardAmount: Number(r.rewardAmount || 0),
      createdAt: r.createdAt,
      channel: r.channel,
    }));

    return NextResponse.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        walletBalance: Number(user.wallet?.walletBalance || 0),
        stats: {
          totalReferrals,
          completedReferrals,
          pendingReferrals,
          totalEarned,
        },
        recentReferrals,
        allReferrals: referrals.map(r => ({
          id: r.id,
          refereeName: r.referee?.fullName || "Unknown",
          status: r.status,
          rewardAmount: Number(r.rewardAmount || 0),
          createdAt: r.createdAt,
        })),
      },
    });

  } catch (error: any) {
    console.error("Referral stats error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch referral stats",
    }, { status: 500 });
  }
}