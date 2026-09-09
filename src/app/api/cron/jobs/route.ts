// app/api/cron/jobs/route.ts (UPDATED)
import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const apiUrl = process.env.NEXTAUTH_URL || 'https://app.bilscore.com';
    
    // ✅ Trigger job processor (existing)
    const processorResponse = await fetch(`${apiUrl}/api/jobs/processor`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'authorization': authHeader || '',
      },
    });

    // ✅ Trigger reminder scheduler (every 3 days)
    const reminderResponse = await fetch(`${apiUrl}/api/cron/whatsapp-reminder`, {
      method: 'GET',
      headers: { 
        'authorization': authHeader || '',
      },
    });

    const processorResult = await processorResponse.json();
    const reminderResult = await reminderResponse.json();

    return NextResponse.json({
      success: true,
      processor: processorResult,
      reminder: reminderResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron Jobs] Error:', error);
    return NextResponse.json(
      { error: error.message || "Failed" },
      { status: 500 }
    );
  }
}