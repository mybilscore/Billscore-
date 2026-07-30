// app/api/twilio/send-message/route.ts
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json({
        success: false,
        error: "Phone number and message are required",
      }, { status: 400 });
    }

    console.log(`📤 [Twilio] Sending message to ${to}`);

    const twilioMessage = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      body: message,
    });

    console.log(`✅ [Twilio] Message sent: ${twilioMessage.sid}`);

    return NextResponse.json({
      success: true,
      sid: twilioMessage.sid,
      status: twilioMessage.status,
    });

  } catch (error) {
    console.error("❌ [Twilio] Send message error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message",
    }, { status: 500 });
  }
}