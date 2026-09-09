// app/api/cron/whatsapp-reminder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { JobType, JobStatus } from "@prisma/client";

// ✅ Use Node.js runtime (default) - NOT Edge Runtime
// export const runtime = 'edge'; // ❌ REMOVE THIS - Prisma doesn't work with Edge Runtime
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // ✅ Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Cron] Unauthorized attempt to access reminder endpoint');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log(`[Cron] Starting WhatsApp reminder scheduler...`);

    // ✅ PRODUCTION: 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // ✅ Get users who haven't had a reminder in 7 days
    const users = await prisma.user.findMany({
      where: {
        // ✅ Only users with WhatsApp channel
        channels: {
          some: {
            channelType: "WHATSAPP",
            isVerified: true,
          }
        },
        // ✅ Only users who haven't received a reminder in 7 days
        AND: [
          {
            OR: [
              { lastWhatsAppReminder: { lt: sevenDaysAgo } },
              { lastWhatsAppReminder: null }
            ]
          }
        ]
      },
      include: {
        channels: {
          where: { channelType: "WHATSAPP", isVerified: true },
          take: 1,
        },
        wallet: true,
      },
    });

    console.log(`[Cron] Found ${users.length} users for reminder (7-day interval)`);

    let createdJobs = 0;
    let skippedUsers = 0;

    for (const user of users) {
      try {
        const whatsappChannel = user.channels[0];
        if (!whatsappChannel) {
          skippedUsers++;
          continue;
        }

        // ✅ Check if there's already a pending reminder job for this user
        const existingJob = await prisma.job.findFirst({
          where: {
            type: JobType.WHATSAPP_REMINDER,
            status: JobStatus.PENDING,
            payload: {
              path: "$.userId",
              equals: user.id,
            },
          },
        });

        if (existingJob) {
          console.log(`[Cron] Reminder already pending for user ${user.id}`);
          skippedUsers++;
          continue;
        }

        // ✅ Create reminder job
        await prisma.job.create({
          data: {
            type: JobType.WHATSAPP_REMINDER,
            status: JobStatus.PENDING,
            priority: 5,
            maxAttempts: 3,
            scheduledFor: new Date(),
            payload: {
              userId: user.id,
              phoneNumber: whatsappChannel.channelIdentifier,
              fullName: user.fullName,
              balance: user.wallet?.walletBalance || 0,
              lastActivity: user.lastWhatsAppReminder || null,
            },
          },
        });

        createdJobs++;
        console.log(`[Cron] Created reminder job for user ${user.id}`);

      } catch (error) {
        console.error(`[Cron] Failed to create job for user ${user.id}:`, error);
        skippedUsers++;
      }
    }

    console.log(`[Cron] Completed. Created: ${createdJobs}, Skipped: ${skippedUsers}`);

    return NextResponse.json({
      success: true,
      created: createdJobs,
      skipped: skippedUsers,
      total: users.length,
      timestamp: new Date().toISOString(),
      mode: "PRODUCTION - 7 days",
    });

  } catch (error: any) {
    console.error("[Cron] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to schedule reminders" },
      { status: 500 }
    );
  }
}