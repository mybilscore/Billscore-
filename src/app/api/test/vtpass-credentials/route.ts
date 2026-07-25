// src/app/api/test/vtpass-credentials/route.ts

import { NextResponse } from "next/server";
import { prisma } from "~/lib/db";

export async function GET() {
  try {
    // Get the vendor from database
    const vendor = await prisma.vendor.findUnique({
      where: { code: 'VTPASS' },
    });

    if (!vendor) {
      return NextResponse.json({
        success: false,
        error: "VTpass vendor not found",
      });
    }

    // Check what credentials are stored
    const authConfig = vendor.authConfig as any;
    
    return NextResponse.json({
      success: true,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        apiBaseUrl: vendor.apiBaseUrl,
        authType: vendor.authType,
        authConfig: {
          authMethod: authConfig?.authMethod || 'Not set',
          apiKey: authConfig?.apiKey ? `${authConfig.apiKey.substring(0, 10)}...` : 'Not set',
          secretKey: authConfig?.secretKey ? `${authConfig.secretKey.substring(0, 10)}...` : 'Not set',
          publicKey: authConfig?.publicKey ? `${authConfig.publicKey.substring(0, 10)}...` : 'Not set',
        },
        environment: vendor.apiBaseUrl.includes('sandbox') ? 'sandbox' : 'live',
      },
      env: {
        VTPASS_SANDBOX_API_KEY: process.env.VTPASS_SANDBOX_API_KEY ? '✅ Set' : '❌ Missing',
        VTPASS_SANDBOX_SECRET_KEY: process.env.VTPASS_SANDBOX_SECRET_KEY ? '✅ Set' : '❌ Missing',
        VTPASS_SANDBOX_PUBLIC_KEY: process.env.VTPASS_SANDBOX_PUBLIC_KEY ? '✅ Set' : '❌ Missing',
        VTPASS_SANDBOX_API_URL: process.env.VTPASS_SANDBOX_API_URL || 'Not set',
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}