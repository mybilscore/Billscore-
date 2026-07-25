// src/app/api/webhooks/palmpay/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPalmPayService } from '~/lib/palmpay/palmpay.service';
import { PalmPayWebhookPayload } from '~/lib/palmpay/types';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const bodyText = await request.text();
    const payload: PalmPayWebhookPayload = JSON.parse(bodyText);
    
    // Get signature from header
    const signature = request.headers.get('X-Signature') || '';
    
    console.log('📨 Received PalmPay webhook:', {
      orderNo: payload.orderNo,
      orderStatus: payload.orderStatus,
      amount: payload.orderAmount,
      payerAccountNo: payload.payerAccountNo,
    });

    // Process webhook
    const palmPay = getPalmPayService();
    const result = await palmPay.handleWebhook(payload, signature);

    if (!result.verified) {
      console.warn('⚠️ Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Return success to prevent retries
    return new NextResponse('success', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    return new NextResponse('error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}