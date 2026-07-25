// src/app/api/admin/palmpay/simulate-webhook/route.ts

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
    const { virtualAccountNo, amount, payerAccountName, payerBankName } = body;

    if (!virtualAccountNo) {
      return NextResponse.json({
        success: false,
        error: 'virtualAccountNo is required',
      }, { status: 400 });
    }

    const palmPay = getPalmPayService();

    if (!palmPay.isSimulationMode()) {
      return NextResponse.json({
        success: false,
        error: 'Cannot simulate webhook in production mode',
      }, { status: 400 });
    }

    // Simulate webhook
    palmPay.simulateWebhook({
      virtualAccountNo,
      orderAmount: amount || 10000,
      payerAccountName: payerAccountName || 'Test Payer',
      payerBankName: payerBankName || 'PalmPay',
      payerAccountNo: `123${Math.floor(1000000 + Math.random() * 9000000)}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook simulated successfully',
      data: {
        mode: 'simulation',
        virtualAccountNo,
        amount: amount || 10000,
      },
    });
  } catch (error: any) {
    console.error('Failed to simulate webhook:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to simulate webhook',
    }, { status: 500 });
  }
}