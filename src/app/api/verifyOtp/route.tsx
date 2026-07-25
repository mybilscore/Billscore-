import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import * as z from "zod";
import { prisma } from "~/lib/db";

// Schema for OTP verification and password reset
const verifyOTPSchema = z.object({
  pin: z.string().min(1, "OTP is required").length(6, "OTP must be 6 digits"),
  password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters long"),
  token: z.string().min(1, "Token is required"), // This is the pinId from the previous step
  phone: z.string().min(1, "Phone number is required"),
});

// Type guard to check if error has a code property
function isPrismaError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

// Type guard to check if error is an Error object
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pin, password, token, phone } = verifyOTPSchema.parse(body);

    // Clean the phone number to match how it's stored in the database
    const cleanPhone = (phone: string) => phone.replace(/\D/g, "");
    const cleanedPhone = cleanPhone(phone);

    // Verify OTP with Termii API
    const termiiData = {
      api_key: "TLN8lRcv2zK3M2byxXGdoX72JN7CgsDpXKSwYCWmAIVGwk6d9AJ7onmh1chzjU",
      pin_id: token,
      pin: pin,
    };

    const response = await fetch("https://api.ng.termii.com/api/sms/otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(termiiData),
    });

    if (!response.ok) {
      throw new Error("Failed to verify OTP");
    }

    const result: any = await response.json();
    const verified = result.verified;

    if (verified === true) {
      // OTP verified successfully - update password in database
      const hashedPassword = await hash(password, 10);

      console.log("Attempting to update password for phone:", cleanedPhone);

      // First, check if user exists and get their current data
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: cleanedPhone },
            { phone: phone },
            { phone: { contains: cleanedPhone } }
          ]
        }
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      console.log("Found user:", existingUser.id, "with phone:", existingUser.phone);

      // Update user password in database using the exact phone format from database
      const updatedUser = await prisma.user.update({
        where: {
          id: existingUser.id, // Use ID for more reliable update
        },
        data: {
          password: hashedPassword,
        },
      });

      console.log("Password update result:", updatedUser.id);

      return NextResponse.json(
        {
          message: "Password reset successfully",
          success: true,
          userId: updatedUser.id,
        },
        { status: 200 }
      );

    } else {
      // OTP verification failed
      return NextResponse.json(
        {
          error: "Invalid OTP code",
          success: false,
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("OTP verification error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || "Invalid data" },
        { status: 400 }
      );
    }

    // Handle Termii API errors
    if (isError(error) && error.message === "Failed to verify OTP") {
      return NextResponse.json(
        { error: "Failed to verify OTP. Please try again." },
        { status: 500 }
      );
    }

    // Handle user not found error (Prisma P2025 error code)
    if (isPrismaError(error) && error.code === "P2025") {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Handle other Prisma errors
    if (isPrismaError(error)) {
      console.error("Prisma error code:", error.code);
      return NextResponse.json(
        { error: `Database error: ${error.code}` },
        { status: 500 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { error: "Password reset failed" },
      { status: 500 }
    );
  }
}

// Optional: Add a route to validate token and phone before showing reset form
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const phone = searchParams.get("phone");

    if (!token || !phone) {
      return NextResponse.json(
        { error: "Token and phone are required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: {
        phone: phone,
      },
      select: {
        id: true,
        phone: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { 
          valid: false,
          error: "User not found" 
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        valid: true,
        phone: user.phone,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate token" },
      { status: 500 }
    );
  }
}