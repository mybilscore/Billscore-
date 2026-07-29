// bilscore-app/app/api/auth/api-key/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated via session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Return the API key for client-side storage
    const apiKey = process.env.BILSCORE_API_KEY;
    
    if (!apiKey) {
      console.warn("⚠️ BILSCORE_API_KEY is not set in environment");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      apiKey,
    });
  } catch (error: any) {
    console.error("Error fetching API key:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get API key" },
      { status: 500 }
    );
  }
}