// src/app/api/palmpay/test-funding/route.ts

import { NextResponse } from 'next/server';
import { getPalmPayService } from '~/lib/palmpay/palmpay.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { virtualAccountNo, amount, payerName, payerBank } = body;

    if (!virtualAccountNo || !amount) {
      return NextResponse.json({
        success: false,
        error: 'virtualAccountNo and amount are required',
      }, { status: 400 });
    }

    const palmPay = getPalmPayService();

    // ✅ Get the virtual account to verify it exists
    const accountResult = await palmPay.queryVirtualAccount(virtualAccountNo);
    
    if (!accountResult.status) {
      return NextResponse.json({
        success: false,
        error: `Virtual account not found: ${accountResult.respMsg}`,
      }, { status: 404 });
    }

    // ✅ Build a realistic webhook payload (matching PalmPay format)
    const payload = {
      orderNo: `PAY${Date.now()}`,
      virtualAccountNo: virtualAccountNo,
      orderAmount: amount * 100, // Convert to cent (PalmPay uses cent)
      payerAccountName: payerName || 'Test Customer',
      payerAccountNo: `012${Math.floor(10000000 + Math.random() * 90000000)}`,
      payerBankName: payerBank || 'GTBank',
      sessionId: `SESS_${Date.now()}`,
      orderId: `ORD_${Date.now()}`,
      createdTime: Date.now(),
      completedTime: Date.now(),
      orderStatus: 1, // 1 = SUCCESS
    };

    // ✅ Call handleWebhook to process the funding
    const result = await palmPay.handleWebhook(payload as any, 'test_signature');

    return NextResponse.json({
      success: result.verified,
      message: result.verified ? 'Funding simulated successfully' : 'Funding simulation failed',
      payload: payload,
      result: result,
      // ✅ Include wallet update info
      walletUpdate: result.verified ? {
        status: 'credited',
        amount: amount,
        orderNo: payload.orderNo,
      } : null,
    });

  } catch (error: any) {
    console.error('❌ Test funding error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}