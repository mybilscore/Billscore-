import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "~/lib/db";

// Schema for password recovery request
const passwordRecoverySchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
});

// Helper function to format phone number (similar to your PHP setNumber function)
function setNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const first = cleaned[0];
  const length = cleaned.length;

  if (length === 11 && first === "0") {
    const val = cleaned.substring(1);
    return `234${val}`;
    // biome-ignore lint/style/noUselessElse: <explanation>
  } else if (length === 10) {
    return `234${cleaned}`;
    // biome-ignore lint/style/noUselessElse: <explanation>
  } else {
    throw new Error("Please enter a valid number");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone } = passwordRecoverySchema.parse(body);

    // Format the phone number
    const smsNumber = setNumber(phone);

    // Check if phone exists in your database (using Prisma)
    // Replace 'app_admin' with your actual user model
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phone },
          { phone: smsNumber },
          { phone: { contains: phone.replace(/\D/g, "") } },
        ],
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Phone number not found" },
        { status: 404 },
      );
    }

    // Send OTP via Termii API
    const message = "Your password recovery pin is";
    const termiiData = {
      api_key: "TL0TP7GwJxtiaOCDIDyTwaSXxqEo8nKNLuXmFwZ185UCu2CLr4Nsx0tVYsM6mc",
      message_type: "NUMERIC",
      to: smsNumber,
      from: "N-Alert",
      channel: "dnd",
      pin_attempts: 10,
      pin_time_to_live: 60,
      pin_length: 6,
      pin_placeholder: "< 1234 >",
      message_text: `${message}< 1234 >`,
      pin_type: "NUMERIC",
    };

    const response = await fetch("https://api.ng.termii.com/api/sms/otp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(termiiData),
    });

    if (!response.ok) {
      throw new Error("Failed to send OTP");
    }

    const result: any = await response.json();

    // Store the pinId and phone in session or database for verification
    // Since Next.js API routes are stateless, we need to use a different approach
    // You might want to store this in your database or use a temporary storage solution

    const pinId = result.pinId;

    return NextResponse.json(
      {
        message: "OTP sent successfully",
        pinId: pinId,
        // Don't send sensitive data to frontend in production
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Password recovery error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || "Invalid data" },
        { status: 400 },
      );
    }

    // Handle phone formatting errors
    if (
      error instanceof Error &&
      error.message === "Please enter a valid number"
    ) {
      return NextResponse.json(
        { error: "Please enter a valid phone number" },
        { status: 400 },
      );
    }

    // Handle Termii API errors
    if (error instanceof Error && error.message === "Failed to send OTP") {
      return NextResponse.json(
        { error: "Failed to send verification code. Please try again." },
        { status: 500 },
      );
    }

    // Generic error response
    return NextResponse.json(
      { error: "Password recovery failed" },
      { status: 500 },
    );
  }
}

// Optional: Add a GET method to check if a phone exists before sending OTP
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    // Check if phone exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phone },
          { phone: { contains: phone.replace(/\D/g, "") } },
        ],
      },
      select: {
        id: true,
        phone: true,
        email: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { exists: false, error: "Phone number not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        exists: true,
        phone: existingUser.phone,
        // Don't send sensitive user data
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Phone check error:", error);
    return NextResponse.json(
      { error: "Failed to check phone number" },
      { status: 500 },
    );
  }
}
