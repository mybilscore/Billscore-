// app/api/auth/check-username/route.ts
// import { prisma } from "@/lib/db";
import { prisma } from "~/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Username parameter required" },
      { status: 400 }
    );
  }

  try {
    console.log(`🔍 Checking username: "${username}"`);
    
    // Check if username exists (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        fullName: true,
        hasPasswordHash: !!true,
      },
    });

    if (!user) {
      console.log(`❌ Username not found: "${username}"`);
      return NextResponse.json({
        exists: false,
        message: "Username not found",
      });
    }

    console.log(`✅ Username found:`, user.username);
    return NextResponse.json({
      exists: true,
      user: {
        ...user,
        hasPasswordHash: !!user.passwordHash,
      },
    });
  } catch (error) {
    console.error("❌ Error checking username:", error);
    return NextResponse.json(
      { error: "Failed to check username" },
      { status: 500 }
    );
  }
}