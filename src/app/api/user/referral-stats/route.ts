// src/app/api/user/referral-stats/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/app/api/auth/[...nextauth]/route";
import { prisma } from "~/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user with referral code
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        referralCode: true,
        fullName: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
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
            createdAt: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter((r) => r.status === "COMPLETED").length;
    const pendingReferrals = referrals.filter((r) => r.status === "PENDING").length;
    const totalEarned = referrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

    // Calculate conversion rate
    const conversionRate = totalReferrals > 0
      ? Math.round((activeReferrals / totalReferrals) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        user: {
          name: user.fullName,
          email: user.email,
        },
        stats: {
          totalReferrals,
          activeReferrals,
          pendingReferrals,
          totalEarned,
          conversionRate,
        },
        referrals: referrals.map((r) => ({
          id: r.id,
          refereeName: r.referee.fullName || "Anonymous",
          refereeEmail: r.referee.email,
          refereeVerified: r.referee.isVerified,
          status: r.status,
          reward: r.rewardAmount,
          joinedAt: r.referee.createdAt,
          paidAt: r.rewardPaidAt,
        })),
      },
    });
  } catch (error) {
    console.error("Referral stats error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}