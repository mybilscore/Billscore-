import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmail } from "~/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email, name, otp } = await req.json();
    
    console.log("📧 Testing password reset email to:", email);
    console.log("📧 With name:", name);
    console.log("📧 With OTP:", otp);
    console.log("📧 RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
    console.log("📧 EMAIL_FROM:", process.env.EMAIL_FROM);
    
    const result = await sendPasswordResetEmail(
      email,
      name || "Test User",
      otp || "123456",
      `${process.env.NEXT_PUBLIC_APP_URL}/auth`
    );
    
    console.log("📧 Email send result:", result);
    
    return NextResponse.json({
      success: result,
      message: result ? "Email sent successfully" : "Failed to send email",
      config: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10),
        hasEmailFrom: !!process.env.EMAIL_FROM,
        emailFrom: process.env.EMAIL_FROM,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      }
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}