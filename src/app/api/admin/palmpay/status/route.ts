// src/app/api/admin/palmpay/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPalmPayStatus, isPalmPaySimulationMode } from '~/lib/services/wallet.service';
import { requireAuth } from '~/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Admin only
    const user = await requireAuth('/auth/sign-in');
    
    // Check if user is admin
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin access required',
      }, { status: 403 });
    }

    const status = getPalmPayStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        environment: process.env.NODE_ENV || 'development',
        webhookUrl: process.env.PALMPAY_WEBHOOK_URL || null,
      },
    });
  } catch (error: any) {
    console.error('Failed to get PalmPay status:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get PalmPay status',
    }, { status: 500 });
  }
}