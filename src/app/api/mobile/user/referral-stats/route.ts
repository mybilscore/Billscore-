// src/app/api/mobile/user/referral-stats/route.ts - With better error handling

import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/db";

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
  console.log("📊 [MOBILE REFERRAL STATS] Stats requested");
  
  try {
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;

    // Try to get user with referral code
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          referralCode: true,
          fullName: true,
          email: true,
        },
      });
    } catch (dbError: any) {
      console.error("❌ [MOBILE REFERRAL STATS] Database error:", dbError);
      // Return empty stats if database is down
      return NextResponse.json({
        success: true,
        data: {
          referralCode: null,
          user: {
            name: '',
            email: '',
          },
          stats: {
            totalReferrals: 0,
            activeReferrals: 0,
            pendingReferrals: 0,
            totalEarned: 0,
            conversionRate: 0,
          },
          referrals: [],
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get referral stats - handle case where no referrals exist
    let referrals = [];
    try {
      referrals = await prisma.referral.findMany({
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
    } catch (dbError: any) {
      console.error("❌ [MOBILE REFERRAL STATS] Referral fetch error:", dbError);
      referrals = [];
    }

    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter((r) => r.status === "COMPLETED").length;
    const pendingReferrals = referrals.filter((r) => r.status === "PENDING").length;
    const totalEarned = referrals.reduce((sum, r) => sum + Number(r.rewardAmount || 0), 0);

    const conversionRate = totalReferrals > 0
      ? Math.round((activeReferrals / totalReferrals) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        referralCode: user.referralCode || null,
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
          reward: Number(r.rewardAmount || 0),
          joinedAt: r.referee.createdAt,
          paidAt: r.rewardPaidAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("❌ [MOBILE REFERRAL STATS] Error:", error);
    // Return empty stats instead of error
    return NextResponse.json({
      success: true,
      data: {
        referralCode: null,
        user: {
          name: '',
          email: '',
        },
        stats: {
          totalReferrals: 0,
          activeReferrals: 0,
          pendingReferrals: 0,
          totalEarned: 0,
          conversionRate: 0,
        },
        referrals: [],
      },
    });
  }
}