// src/app/api/test/vtpass/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VTPassVendor } from "~/lib/vendors/vtpass.vendor";
import { VtuVendor, VendorAuthType } from "~/lib/vendors/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testType = 'connection', phoneNumber, amount, network, meterNumber, discoCode } = body;

    console.log(`🧪 Testing VTpass: ${testType}...`);

    // Get vendor configuration from database
    const vendorConfig = await prisma.vendor.findUnique({
      where: { code: 'VTPASS' },
    });

    if (!vendorConfig) {
      return NextResponse.json({
        success: false,
        error: 'VTpass vendor not configured. Please seed first using /api/seed/vtpass',
      }, { status: 404 });
    }

    // Create vendor instance
    const vendor = new VTPassVendor({
      id: vendorConfig.id,
      name: vendorConfig.name,
      code: vendorConfig.code as VtuVendor,
      apiBaseUrl: vendorConfig.apiBaseUrl,
      authType: vendorConfig.authType as VendorAuthType,
      authConfig: vendorConfig.authConfig as any,
      priority: vendorConfig.priority,
      supportedServices: vendorConfig.supportedServices as any,
      isActive: true,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    });

    let result;

    switch (testType) {
      case 'connection':
        // Just test authentication
        console.log('🔑 Testing authentication...');
        const headers = await vendor.authenticate();
        result = {
          success: true,
          message: 'Authentication successful',
          headers: Object.keys(headers),
        };
        break;

      case 'airtime':
        console.log(`📱 Testing airtime purchase for ${phoneNumber || '08012345678'}...`);
        result = await vendor.buyAirtime({
          phoneNumber: phoneNumber || '08012345678',
          amount: amount || 100,
          network: network || 'MTN',
        });
        break;

      case 'data':
        console.log(`📊 Testing data purchase for ${phoneNumber || '08012345678'}...`);
        result = await vendor.buyData({
          phoneNumber: phoneNumber || '08012345678',
          planCode: '1GB',
          network: network || 'MTN',
          amount: amount || 400,
        });
        break;

      case 'electricity':
        console.log(`⚡ Testing electricity purchase for meter ${meterNumber || '12345678901'}...`);
        result = await vendor.buyElectricity({
          meterNumber: meterNumber || '12345678901',
          amount: amount || 1000,
          discoCode: discoCode || 'IKEJA',
        });
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid test type. Use: connection, airtime, data, electricity',
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `VTpass ${testType} test completed`,
      data: result,
    });

  } catch (error: any) {
    console.error('❌ Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'VTpass test failed',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

// GET endpoint for quick health check
export async function GET() {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { code: 'VTPASS' },
    });

    if (!vendor) {
      return NextResponse.json({
        success: false,
        message: 'VTpass vendor not configured',
        configured: false,
      });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      vendor: {
        name: vendor.name,
        status: vendor.status,
        apiBaseUrl: vendor.apiBaseUrl,
      },
      message: 'VTpass vendor is configured. Use POST with testType to test.',
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check VTpass status',
    }, { status: 500 });
  }
}