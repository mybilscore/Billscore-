// app/api/admin/reminder-stats/route.ts (Optional)
import { NextResponse } from "next/server";
import { prisma } from "~/lib/db";

export async function GET() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const [totalUsers, remindedUsers, pendingJobs] = await Promise.all([
    prisma.user.count({
      where: {
        channels: { some: { channelType: "WHATSAPP", isVerified: true } }
      }
    }),
    prisma.user.count({
      where: {
        channels: { some: { channelType: "WHATSAPP", isVerified: true } },
        lastWhatsAppReminder: { gte: threeDaysAgo }
      }
    }),
    prisma.job.count({
      where: {
        type: "WHATSAPP_REMINDER",
        status: "PENDING"
      }
    })
  ]);

  return NextResponse.json({
    totalWhatsAppUsers: totalUsers,
    remindedInLast3Days: remindedUsers,
    pendingReminderJobs: pendingJobs,
  });
}