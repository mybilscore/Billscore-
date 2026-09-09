// app/api/cron/whatsapp-reminder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { JobType, JobStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Cron] Unauthorized');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const users = await prisma.user.findMany({
      where: {
        channels: {
          some: {
            channelType: "WHATSAPP",
            isVerified: true,
          }
        },
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

    if (users.length === 0) {
      console.log('[Cron] No users need reminders');
      return NextResponse.json({ 
        success: true, 
        message: 'No users need reminders',
        timestamp: new Date().toISOString() 
      });
    }

    let createdJobs = 0;

    for (const user of users) {
      try {
        const whatsappChannel = user.channels[0];
        if (!whatsappChannel) continue;

        // Check for existing pending job
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

        if (existingJob) continue;

        // Create job
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

      } catch (error) {
        console.error(`[Cron] Failed for user ${user.id}:`, error);
      }
    }

    console.log(`[Cron] Created ${createdJobs} reminder jobs`);
    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      jobsCreated: createdJobs,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Cron] Error:', error.message);
    await prisma.$disconnect();
    return NextResponse.json(
      { error: error.message || "Failed to schedule reminders" },
      { status: 500 }
    );
  }
}