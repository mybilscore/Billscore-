// app/api/auth/direct-test/route.ts
import { prisma } from "~/lib/db";
import { compare } from "bcrypt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    console.log("========================================");
    console.log("🧪 [DIRECT TEST] Testing auth logic");
    console.log(`📝 Identifier: "${identifier}"`);
    console.log(`🔑 Password: ${password ? "provided" : "missing"}`);

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 }
      );
    }

    // Same logic as authorize function
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
          { phone: identifier },
        ],
      },
    });

    if (!user) {
      console.log("❌ User not found");
      return NextResponse.json(
        { error: "User not found", identifier },
        { status: 404 }
      );
    }

    console.log("✅ User found:", {
      id: user.id,
      username: user.username,
      email: user.email,
      hasHash: !!user.passwordHash,
    });

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "No password hash set" },
        { status: 400 }
      );
    }

    const isValid = await compare(password, user.passwordHash);
    console.log(`🔐 Password valid: ${isValid}`);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Test error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}