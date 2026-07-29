// bilscore-app/app/api/admin/support/tickets/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { 
  TicketStatus, 
  TicketPriority, 
  TicketType,
  TicketChannel,
  TicketSource,
  TransactionStatus 
} from "@prisma/client";

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
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const type = searchParams.get("type");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search } },
        { subject: { contains: search } },
        { description: { contains: search } },
        { customerName: { contains: search } },
        { customerEmail: { contains: search } },
        { customerPhone: { contains: search } },
        { user: { fullName: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    if (status && status !== "all") {
      where.status = status as TicketStatus;
    }

    if (priority && priority !== "all") {
      where.priority = priority as TicketPriority;
    }

    if (type && type !== "all") {
      where.type = type as TicketType;
    }

    // Fetch tickets
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: [
          { priority: "asc" },
          { createdAt: "desc" },
        ],
        take: limit,
        skip: skip,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          assignedAgent: {
            select: {
              id: true,
              userId: true,
              role: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
          replies: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              message: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
          satisfactionSurvey: {
            select: {
              rating: true,
              respondedAt: true,
            },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    const response = NextResponse.json({
      success: true,
      data: {
        tickets: tickets.map((ticket) => ({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          type: ticket.type,
          category: ticket.category,
          subCategory: ticket.subCategory,
          channel: ticket.channel,
          source: ticket.source,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          resolvedAt: ticket.resolvedAt?.toISOString(),
          closedAt: ticket.closedAt?.toISOString(),
          user: ticket.user,
          assignedAgent: ticket.assignedAgent?.user,
          lastReply: ticket.replies[0],
          satisfaction: ticket.satisfactionSurvey,
          customerName: ticket.customerName,
          customerEmail: ticket.customerEmail,
          customerPhone: ticket.customerPhone,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN SUPPORT TICKETS API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch support tickets",
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