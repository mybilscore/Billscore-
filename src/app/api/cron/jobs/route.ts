// app/api/cron/jobs/route.ts - CRON JOB TRIGGER (OPTIONAL)

import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const apiUrl = process.env.NEXTAUTH_URL || 'https://app.bilscore.com';
    
    const response = await fetch(`${apiUrl}/api/jobs/processor`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'authorization': authHeader || '',
      },
    });

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron Jobs] Error:', error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger job processor" },
      { status: 500 }
    );
  }
}