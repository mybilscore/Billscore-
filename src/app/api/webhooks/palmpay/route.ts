import { NextResponse } from 'next/server';
// import { getPalmPayService } from '~/lib/palmpay';

import { getPalmPayService } from '~/lib/palmpay/palmpay.service';

export async function GET() {
  try {
    const palmPay = getPalmPayService();
    
    // Test connection
    const testResult = await palmPay.testConnection();
    
    // Try to create a test virtual account if in sandbox mode
    let createResult = null;
    if (!palmPay.isSimulationMode()) {
      createResult = await palmPay.createVirtualAccount({
        virtualAccountName: `Test Account ${Date.now()}`,
        identityType: 'personal',
        licenseNumber: '12345678901',
        email: 'test@example.com',
        customerName: 'Test User',
        accountReference: `TEST_${Date.now()}`,
      });
    }
    
    return NextResponse.json({
      success: testResult.success,
      mode: palmPay.isSimulationMode() ? 'simulation' : 'sandbox',
      config: {
        baseUrl: process.env.PALMPAY_BASE_URL,
        appId: process.env.PALMPAY_AUTHORIZATION ? '✅ Set' : '❌ Missing',
        merchantId: process.env.PALMPAY_MERCHANT_ID ? '✅ Set' : '❌ Missing',
        publicKey: process.env.PALMPAY_PUBLIC_KEY ? '✅ Set' : '❌ Missing',
        privateKey: process.env.PALMPAY_PRIVATE_KEY ? '✅ Set' : '❌ Missing',
      },
      testResult,
      createResult: createResult ? {
        status: createResult.status,
        respCode: createResult.respCode,
        respMsg: createResult.respMsg,
        data: createResult.data,
      } : null,
    });
    
  } catch (error: any) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}