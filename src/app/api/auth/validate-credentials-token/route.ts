// app/api/auth/validate-credentials-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing token" },
        { status: 400 }
      );
    }

    // Find the audit log with this token
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: "WHATSAPP_REGISTRATION",
        metadata: {
          path: "$.changeToken",
          equals: token,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    if (auditLogs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 404 }
      );
    }

    const auditLog = auditLogs[0];
    const metadata = auditLog.metadata as any;
    const expiry = metadata?.changeTokenExpiry;
    
    if (expiry && new Date(expiry) < new Date()) {
      return NextResponse.json(
        { success: false, error: "This link has expired. Please request a new one." },
        { status: 410 }
      );
    }

    // Check if token was already used
    if (metadata?.tokenUsed === true) {
      return NextResponse.json(
        { success: false, error: "This link has already been used. Please request a new one." },
        { status: 410 }
      );
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: auditLog.userId! },
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        fullName: user.fullName,
        email: user.email,
        username: user.username,
      },
    });

  } catch (error) {
    console.error("Validate token error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate token" },
      { status: 500 }
    );
  }
}