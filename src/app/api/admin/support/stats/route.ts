// bilscore-app/app/api/admin/support/stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { TicketStatus, TicketPriority } from "@prisma/client";

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
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    // Get ticket counts by status
    const statusCounts = await prisma.supportTicket.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Get ticket counts by priority
    const priorityCounts = await prisma.supportTicket.groupBy({
      by: ['priority'],
      _count: { priority: true },
    });

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await prisma.supportTicket.aggregate({
      where: {
        createdAt: { gte: today },
      },
      _count: {
        id: true,
      },
    });

    // Get average response time
    const closedTickets = await prisma.supportTicket.findMany({
      where: {
        status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        firstResponseAt: { not: null },
        createdAt: { not: null },
      },
      select: {
        firstResponseAt: true,
        createdAt: true,
      },
    });

    let avgResponseTime = 0;
    if (closedTickets.length > 0) {
      const totalTime = closedTickets.reduce((sum, t) => {
        if (t.firstResponseAt && t.createdAt) {
          return sum + (t.firstResponseAt.getTime() - t.createdAt.getTime());
        }
        return sum;
      }, 0);
      avgResponseTime = Math.round(totalTime / closedTickets.length / 60000); // in minutes
    }

    // Calculate satisfaction
    const satisfactionStats = await prisma.supportSatisfaction.aggregate({
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    const statusMap = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {} as Record<string, number>);

    const priorityMap = priorityCounts.reduce((acc, curr) => {
      acc[curr.priority] = curr._count.priority;
      return acc;
    }, {} as Record<string, number>);

    const response = NextResponse.json({
      success: true,
      data: {
        total: statusCounts.reduce((sum, s) => sum + s._count.status, 0),
        byStatus: statusMap,
        byPriority: priorityMap,
        today: todayStats._count.id || 0,
        avgResponseTime,
        totalSatisfaction: satisfactionStats._count.id || 0,
        avgSatisfaction: satisfactionStats._avg.rating || 0,
      },
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN SUPPORT STATS API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch support stats",
    }, { status: 500 });
  }
}

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