// src/lib/services/referral.service.ts

import { prisma } from "~/lib/db";

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class ReferralService {
  /**
   * Validate a referral code
   */
  static async validateReferralCode(code: string) {
    const referralRegex = /^BIL-[A-Z0-9]{6}$/;
    if (!referralRegex.test(code)) {
      return { valid: false, error: "Invalid referral code format" };
    }

    const user = await prisma.user.findFirst({
      where: { referralCode: code },
      select: {
        id: true,
        fullName: true,
        email: true,
        wallet: {
          select: { id: true, walletBalance: true },
        },
      },
    });

    if (!user) {
      return { valid: false, error: "Referral code not found" };
    }

    return {
      valid: true,
      referrer: user,
    };
  }

  /**
   * Complete a referral after the referee's first transaction
   */
  static async completeReferral(refereeId: string) {
    const referral = await prisma.referral.findUnique({
      where: { refereeId },
      include: {
        referrer: {
          include: { wallet: true },
        },
      },
    });

    if (!referral || referral.status !== "PENDING") {
      return null;
    }

    // Update referral status
    const updatedReferral = await prisma.$transaction(async (tx) => {
      // Grant bonus to referrer
      const bonusAmount = 100; // ₦100 bonus after first transaction

      const referrerWallet = referral.referrer.wallet;
      if (referrerWallet) {
        await tx.wallet.update({
          where: { id: referrerWallet.id },
          data: {
            walletBalance: {
              increment: bonusAmount,
            },
            ledgerBalance: {
              increment: bonusAmount,
            },
          },
        });

        // Log bonus transaction
        await tx.walletTransaction.create({
          data: {
            walletId: referrerWallet.id,
            userId: referral.referrerId,
            type: "SYSTEM",
            amount: bonusAmount,
            balanceBefore: referrerWallet.walletBalance,
            balanceAfter: referrerWallet.walletBalance + bonusAmount,
            reference: `REFERRAL_COMPLETE_${referral.id}`,
            description: `Referral completion bonus for referee #${refereeId}`,
            status: "SUCCESS",
            category: "SYSTEM",
          },
        });
      }

      // Update referral
      return tx.referral.update({
        where: { id: referral.id },
        data: {
          status: "COMPLETED",
          rewardAmount: bonusAmount,
          rewardPaid: true,
          rewardPaidAt: new Date(),
        },
      });
    });

    return updatedReferral;
  }

  /**
   * Get referral statistics for a user
   */
  static async getReferralStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          select: {
            fullName: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter((r) => r.status === "COMPLETED").length;
    const pendingReferrals = referrals.filter((r) => r.status === "PENDING").length;
    const totalEarned = referrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

    return {
      referralCode: user.referralCode,
      stats: {
        totalReferrals,
        activeReferrals,
        pendingReferrals,
        totalEarned,
      },
      referrals: referrals.map((r) => ({
        id: r.id,
        refereeName: r.referee.fullName,
        refereeEmail: r.referee.email,
        status: r.status,
        reward: r.rewardAmount,
        joinedAt: r.referee.createdAt,
        paidAt: r.rewardPaidAt,
      })),
    };
  }

  /**
   * Get leaderboard of top referrers
   */
  static async getReferralLeaderboard(limit: number = 10) {
    const leaderboard = await prisma.referral.groupBy({
      by: ["referrerId"],
      _count: {
        id: true,
      },
      _sum: {
        rewardAmount: true,
      },
      orderBy: {
        _sum: {
          rewardAmount: "desc",
        },
      },
      take: limit,
    });

    // Get user details
    const userIds = leaderboard.map((item) => item.referrerId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return leaderboard.map((item) => ({
      user: userMap.get(item.referrerId),
      totalReferrals: item._count.id,
      totalEarned: item._sum.rewardAmount || 0,
    }));
  }
}