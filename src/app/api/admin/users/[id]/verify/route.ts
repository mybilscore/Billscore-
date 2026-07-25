// src/app/api/admin/users/[id]/verify/route.ts
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "~/lib/auth";
import { verifyUser } from "~/lib/services/user-verification.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Only super admins can verify users." },
        { status: 401 }
      );
    }

    // ✅ Fix: Await params before using
    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const result = await verifyUser(userId, session.user.partyId);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error verifying user:", error);
    
    // Handle specific errors
    if (error.message.includes("already verified")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 } // Conflict
      );
    }
    
    if (error.message.includes("not found")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to verify user" },
      { status: 500 }
    );
  }
}