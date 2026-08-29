// src/app/api/seed/bilalsada/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VtuType, VendorStatus, VtuVendor } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode = body.mode || 'sandbox';
    
    console.log(`🌱 Seeding BilalSada ${mode} vendor...`);
    console.log(`📁 Reading configuration from .env file...`);
    
    // ✅ Read directly from .env - Only token
    const accessToken = process.env.BILAL_SADA_ACCESS_TOKEN;
    const apiBaseUrl = process.env.BILAL_SADA_API_URL || 'https://bilalsadasub.com';
    const envMode = process.env.BILAL_SADA_MODE || 'sandbox';
    
    console.log(`🔑 Token in .env: ${accessToken ? '✅ Found' : '❌ Not found'}`);
    console.log(`🌐 API URL: ${apiBaseUrl}`);
    console.log(`🌐 Mode: ${envMode}`);
    
    // ✅ Validate .env configuration
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Missing access token in .env file',
        message: 'You must set BILAL_SADA_ACCESS_TOKEN in your .env file',
        required: 'BILAL_SADA_ACCESS_TOKEN',
        example: 'BILAL_SADA_ACCESS_TOKEN=your_token_here',
        currentStatus: {
          hasToken: !!accessToken,
        }
      }, { status: 400 });
    }

    // ✅ Build auth config - Token only
    const authConfig: any = {
      mode: envMode,
      accessToken: accessToken,
    };

    console.log(`🔑 [Seed] Using token from .env: ${accessToken.substring(0, 15)}...`);
    console.log(`🌐 [Seed] API Base URL: ${apiBaseUrl}`);
    console.log(`🌐 [Seed] Mode: ${mode}`);

    // ✅ Create or update vendor
    const vendor = await prisma.vendor.upsert({
      where: { code: 'BILAL_SADA' },
      update: {
        name: `BilalSada ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
        apiBaseUrl: apiBaseUrl,
        type: VtuVendor.BILAL_SADA,
        authType: 'BEARER_TOKEN',
        authConfig: authConfig,
        priority: 1,
        status: VendorStatus.ACTIVE,
        successRate: 100,
        avgResponseTime: 0,
        failureCount: 0,
        consecutiveFailures: 0,
      },
      create: {
        id: `bilalsada-${mode}-001`,
        code: 'BILAL_SADA',
        name: `BilalSada ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
        apiBaseUrl: apiBaseUrl,
        type: VtuVendor.BILAL_SADA,
        authType: 'BEARER_TOKEN',
        authConfig: authConfig,
        priority: 1,
        status: VendorStatus.ACTIVE,
        successRate: 100,
        avgResponseTime: 0,
        failureCount: 0,
        consecutiveFailures: 0,
      },
    });

    console.log(`✅ Vendor ${vendor.id} created/updated`);

    // ✅ Create vendor services
    const services = [
      { serviceType: VtuType.AIRTIME, priority: 1 },
      { serviceType: VtuType.DATA, priority: 2 },
      { serviceType: VtuType.ELECTRICITY_INSTANT, priority: 3 },
      { serviceType: VtuType.CABLE_TV, priority: 4 },
      { serviceType: VtuType.EDUCATION, priority: 5 },
    ];

    for (const service of services) {
      await prisma.vendorService.upsert({
        where: {
          vendorId_serviceType: {
            vendorId: vendor.id,
            serviceType: service.serviceType,
          },
        },
        update: {
          isActive: true,
          priority: service.priority,
        },
        create: {
          vendorId: vendor.id,
          serviceType: service.serviceType,
          isActive: true,
          priority: service.priority,
          markup: 0,
        },
      });
    }

    console.log(`✅ BilalSada ${mode} seeded successfully`);
    console.log(`✅ Authentication method: TOKEN`);

    return NextResponse.json({
      success: true,
      message: `BilalSada ${mode} vendor configured successfully from .env`,
      data: {
        vendor: {
          id: vendor.id,
          name: vendor.name,
          code: vendor.code,
          apiBaseUrl: vendor.apiBaseUrl,
          status: vendor.status,
          priority: vendor.priority,
          authMethod: 'TOKEN',
          authSource: '.env file',
          services: services.map(s => s.serviceType),
        },
        envStatus: {
          tokenConfigured: !!accessToken,
          apiUrlConfigured: !!process.env.BILAL_SADA_API_URL,
          modeConfigured: !!process.env.BILAL_SADA_MODE,
        },
        nextSteps: {
          importPlans: 'POST /api/seed/bilalsada-plans',
          viewPlans: 'GET /api/plans?vendorId=' + vendor.id,
          testAirtime: 'POST /api/vendor/bilalsada/airtime',
          testData: 'POST /api/vendor/bilalsada/data',
        },
      },
    });

  } catch (error: any) {
    console.error('❌ Seed error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to seed BilalSada vendor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { code: 'BILAL_SADA' },
      include: { services: true },
    });

    if (!vendor) {
      return NextResponse.json({
        success: false,
        message: 'BilalSada vendor not configured',
        suggestion: 'Run POST /api/seed/bilalsada to configure from .env',
      }, { status: 404 });
    }

    const accessToken = process.env.BILAL_SADA_ACCESS_TOKEN;
    const apiUrl = process.env.BILAL_SADA_API_URL;

    return NextResponse.json({
      success: true,
      data: {
        id: vendor.id,
        name: vendor.name,
        code: vendor.code,
        apiBaseUrl: vendor.apiBaseUrl,
        status: vendor.status,
        priority: vendor.priority,
        authMethod: 'TOKEN',
        envStatus: {
          tokenConfigured: !!accessToken,
          apiUrlConfigured: !!apiUrl,
          apiUrl: apiUrl || 'https://bilalsadasub.com (default)',
        },
        services: vendor.services.map(s => ({
          serviceType: s.serviceType,
          isActive: s.isActive,
          priority: s.priority,
        })),
      },
    });

  } catch (error: any) {
    console.error('❌ GET error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch vendor configuration',
    }, { status: 500 });
  }
}