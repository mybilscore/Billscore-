// src/app/api/admin/palmpay/verify-credentials/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPalmPayService } from '~/lib/palmpay/palmpay.service';
import { requireAuth } from '~/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Admin only
    const user = await requireAuth('/auth/sign-in');
    
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin access required',
      }, { status: 403 });
    }

    const palmPay = getPalmPayService();
    
    // Check if Bearer token is configured
    const hasBearerToken = !!process.env.PALMPAY_AUTHORIZATION;
    const tokenPreview = hasBearerToken 
      ? `${process.env.PALMPAY_AUTHORIZATION!.substring(0, 10)}...${process.env.PALMPAY_AUTHORIZATION!.substring(process.env.PALMPAY_AUTHORIZATION!.length - 4)}`
      : null;

    // Try to query a test account to verify credentials
    let credentialsValid = false;
    let testResult = null;
    
    if (!palmPay.isSimulationMode() && hasBearerToken) {
      try {
        // Try to query a known test virtual account
        const response = await palmPay.queryVirtualAccount('6664564951');
        credentialsValid = response.status && response.respCode === '00000000';
        testResult = response;
      } catch (error: any) {
        console.error('Credential verification failed:', error);
        credentialsValid = false;
        testResult = { error: error.message };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        mode: palmPay.isSimulationMode() ? 'simulation' : 'production',
        hasBearerToken,
        tokenPreview,
        credentialsValid: palmPay.isSimulationMode() ? null : credentialsValid,
        testResult,
        environment: process.env.NODE_ENV || 'development',
        webhookUrl: process.env.PALMPAY_WEBHOOK_URL || null,
      },
    });
  } catch (error: any) {
    console.error('Failed to verify credentials:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to verify credentials',
    }, { status: 500 });
  }
}