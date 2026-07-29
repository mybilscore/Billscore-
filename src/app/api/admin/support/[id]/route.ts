// bilscore-app/app/api/admin/support/tickets/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { TicketStatus } from "@prisma/client";

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
// GET - Fetch ticket details
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

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
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
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        internalNotes: {
          orderBy: { createdAt: "desc" },
          include: {
            agent: {
              select: {
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
          },
        },
        escalations: {
          orderBy: { createdAt: "desc" },
          include: {
            fromAgent: {
              select: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
            toAgent: {
              select: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        satisfactionSurvey: true,
        attachments: true,
        tags: {
          include: {
            tag: true,
          },
        },
        sla: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({
        success: false,
        error: "Support ticket not found",
      }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      data: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        urgency: ticket.urgency,
        impact: ticket.impact,
        type: ticket.type,
        category: ticket.category,
        subCategory: ticket.subCategory,
        channel: ticket.channel,
        source: ticket.source,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        resolvedAt: ticket.resolvedAt?.toISOString(),
        closedAt: ticket.closedAt?.toISOString(),
        firstResponseAt: ticket.firstResponseAt?.toISOString(),
        resolutionDeadline: ticket.resolutionDeadline?.toISOString(),
        slaStatus: ticket.slaStatus,
        firstResponseTime: ticket.firstResponseTime,
        resolutionTime: ticket.resolutionTime,
        timeToClose: ticket.timeToClose,
        totalReplies: ticket.totalReplies,
        totalInternalNotes: ticket.totalInternalNotes,
        user: ticket.user,
        assignedAgent: ticket.assignedAgent?.user,
        replies: ticket.replies,
        internalNotes: ticket.internalNotes,
        escalations: ticket.escalations,
        satisfaction: ticket.satisfactionSurvey,
        attachments: ticket.attachments,
        tags: ticket.tags.map((t) => t.tag),
        sla: ticket.sla,
        customerName: ticket.customerName,
        customerEmail: ticket.customerEmail,
        customerPhone: ticket.customerPhone,
        metadata: ticket.metadata,
      },
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN SUPPORT TICKET API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch support ticket",
    }, { status: 500 });
  }
}

// ============================================================
// PATCH - Update ticket status
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

    // Check if ticket exists
    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingTicket) {
      return NextResponse.json({
        success: false,
        error: "Support ticket not found",
      }, { status: 404 });
    }

    // Update ticket
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: body.status as TicketStatus,
        priority: body.priority,
        assignedTo: body.assignedTo,
        assignedAt: body.assignedTo ? new Date() : undefined,
        resolvedAt: body.status === "RESOLVED" ? new Date() : undefined,
        closedAt: body.status === "CLOSED" ? new Date() : undefined,
        resolutionNotes: body.resolutionNotes,
        updatedAt: new Date(),
      },
    });

    const response = NextResponse.json({
      success: true,
      data: ticket,
    });

    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    return response;

  } catch (error: any) {
    console.error("💥 [ADMIN SUPPORT TICKET API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to update support ticket",
    }, { status: 500 });
  }
}