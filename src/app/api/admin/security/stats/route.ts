// app/api/admin/security/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { requireAuth } from "~/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth("/auth/sign-in");
    
    // Check if user is admin
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get stats
    const [totalAttempts, blockedAccounts, activeBlocks, rateLimits, recentLogs] = await Promise.all([
      prisma.registrationAttempt.count(),
      prisma.registrationAttempt.count({ where: { blockedUntil: { gt: new Date() } } }),
      prisma.registrationAttempt.count({ where: { blockedUntil: { gt: new Date() } } }),
      prisma.rateLimit.count(),
      prisma.auditLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, fullName: true } } },
      }),
    ]);

    // Group by action
    const byAction = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalAttempts,
        blockedCount: blockedAccounts,
        activeBlocks,
        rateLimits,
        byAction: byAction.map(item => ({
          action: item.action,
          count: item._count,
        })),
        recentLogs,
      },
    });
  } catch (error) {
    console.error("Failed to fetch security stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch security stats" },
      { status: 500 }
    );
  }
}