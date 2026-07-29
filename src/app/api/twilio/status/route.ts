// app/api/twilio/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const messageSid = formData.get("MessageSid")?.toString() || "";
    const status = formData.get("MessageStatus")?.toString() || "";
    const from = formData.get("From")?.toString() || "";
    const to = formData.get("To")?.toString() || "";

    console.log(`📊 [Twilio Status] Message ${messageSid} status: ${status}`);
    console.log(`  From: ${from}`);
    console.log(`  To: ${to}`);

    // Update message status in database
    await prisma.channel.updateMany({
      where: {
        channelIdentifier: from.replace("whatsapp:", ""),
        metadata: {
          path: "$.messageSid",
          equals: messageSid,
        },
      },
      data: {
        metadata: {
          status,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("❌ [Twilio Status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}