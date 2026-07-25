// src/app/api/admin/palmpay/switch-mode/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPalmPayService } from '~/lib/palmpay/palmpay.service';
import { requireAuth } from '~/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Admin only
    const user = await requireAuth('/auth/sign-in');
    
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin access required',
      }, { status: 403 });
    }

    const body = await request.json();
    const { mode } = body;

    if (!mode || !['simulation', 'production'].includes(mode)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid mode. Must be "simulation" or "production"',
      }, { status: 400 });
    }

    const palmPay = getPalmPayService();

    if (mode === 'simulation') {
      palmPay.switchToSimulation();
    } else {
      palmPay.switchToProduction();
    }

    return NextResponse.json({
      success: true,
      data: {
        mode,
        message: `Switched to ${mode} mode`,
      },
    });
  } catch (error: any) {
    console.error('Failed to switch PalmPay mode:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to switch PalmPay mode',
    }, { status: 500 });
  }
}