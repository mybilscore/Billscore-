// src/app/api/palmpay/switch/route.ts

import { NextResponse } from 'next/server';
import { getPalmPayService } from '~/lib/palmpay/palmpay.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode } = body;

    if (!mode || !['simulation', 'sandbox', 'production'].includes(mode)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid mode. Use "simulation", "sandbox", or "production"',
      }, { status: 400 });
    }

    const palmPay = getPalmPayService();

    // ✅ Use the new switchMode method
    palmPay.switchMode(mode);

    return NextResponse.json({
      success: true,
      message: `Switched to ${mode} mode`,
      mode: palmPay.getMode(),
      status: palmPay.getStatus(),
    });
    
  } catch (error: any) {
    console.error('❌ Switch mode error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const palmPay = getPalmPayService();
    
    return NextResponse.json({
      success: true,
      mode: palmPay.getMode(),
      status: palmPay.getStatus(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasAppId: !!process.env.PALMPAY_AUTHORIZATION,
        hasMerchantId: !!process.env.PALMPAY_MERCHANT_ID,
        hasPublicKey: !!process.env.PALMPAY_PUBLIC_KEY,
        hasPrivateKey: !!process.env.PALMPAY_PRIVATE_KEY,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}