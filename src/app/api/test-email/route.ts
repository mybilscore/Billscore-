// app/api/test-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "~/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();
    
    console.log("Testing email to:", email);
    console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
    console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
    
    const result = await sendWelcomeEmail(
      email,
      name,
      email,
      "https://test.com/site"
    );
    
    return NextResponse.json({
      success: result,
      env: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        from: process.env.EMAIL_FROM,
      }
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}