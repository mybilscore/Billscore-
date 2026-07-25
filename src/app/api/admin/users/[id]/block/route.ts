// src/app/api/admin/users/[id]/block/route.ts
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "~/lib/auth";
import { blockUser, unblockUser } from "~/lib/services/user-block.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Only super admins can block/unblock users." },
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

    const body = await request.json();
    const { action } = body; // "block" or "unblock"

    if (!action || !["block", "unblock"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'block' or 'unblock'" },
        { status: 400 }
      );
    }

    let result;
    if (action === "block") {
      result = await blockUser(userId, session.user.partyId);
    } else {
      result = await unblockUser(userId, session.user.partyId);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error blocking/unblocking user:", error);
    
    // Handle specific errors with appropriate status codes
    if (error.message.includes("already blocked")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 } // Conflict
      );
    }
    
    if (error.message.includes("not blocked")) {
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
      { error: error.message || "Failed to update user status" },
      { status: 500 }
    );
  }
}