// src/app/api/seed/bilalsada/switch/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VendorStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode } = body;

    // ✅ Valid modes - match your seed route
    if (!mode || !['sandbox', 'simulation', 'live'].includes(mode)) {
      return NextResponse.json({
        success: false,
        error: "Invalid mode. Must be 'sandbox', 'simulation', or 'live'",
        validOptions: ['sandbox', 'simulation', 'live'],
      }, { status: 400 });
    }

    console.log(`🔄 [BilalSada Switch] Switching to ${mode} mode...`);
    console.log(`📁 Reading configuration from .env file...`);

    // ✅ Read directly from .env (same as seed route)
    const accessToken = process.env.BILAL_SADA_ACCESS_TOKEN;
    const tokenExpiry = process.env.BILAL_SADA_TOKEN_EXPIRY;
    const username = process.env.BILAL_SADA_USERNAME;
    const password = process.env.BILAL_SADA_PASSWORD;
    const apiBaseUrl = process.env.BILAL_SADA_API_URL || 'https://bilalsadasub.com';
    const envMode = process.env.BILAL_SADA_MODE || 'sandbox';

    // ✅ Log what's configured
    console.log(`🔑 Token in .env: ${accessToken ? '✅ Found' : '❌ Not found'}`);
    console.log(`🔑 Username in .env: ${username ? '✅ Found' : '❌ Not found'}`);
    console.log(`🔑 Password in .env: ${password ? '✅ Found' : '❌ Not found'}`);
    console.log(`🌐 API URL: ${apiBaseUrl}`);
    console.log(`🌐 Mode: ${envMode}`);

    // ✅ Validate .env configuration (same as seed)
    const hasToken = !!accessToken;
    const hasCredentials = !!(username && password);

    if (!hasToken && !hasCredentials) {
      return NextResponse.json({
        success: false,
        error: 'Missing authentication in .env file',
        message: 'You must set either BILAL_SADA_ACCESS_TOKEN OR BILAL_SADA_USERNAME and BILAL_SADA_PASSWORD in your .env file',
        required: [
          'BILAL_SADA_ACCESS_TOKEN (for token-based auth) OR',
          'BILAL_SADA_USERNAME and BILAL_SADA_PASSWORD (for credentials-based auth)'
        ],
        example: `
          # Token-based auth:
          BILAL_SADA_ACCESS_TOKEN=your_token_here
          
          # OR Credentials-based auth:
          BILAL_SADA_USERNAME=your_username
          BILAL_SADA_PASSWORD=your_password
        `,
        currentStatus: {
          hasToken,
          hasUsername: !!username,
          hasPassword: !!password,
        }
      }, { status: 400 });
    }

    // ✅ Find existing BilalSada vendor
    const existingVendor = await prisma.vendor.findUnique({
      where: { code: 'BILAL_SADA' },
    });

    if (!existingVendor) {
      return NextResponse.json({
        success: false,
        error: "BilalSada vendor not found. Please seed first.",
        suggestion: "Run: POST /api/seed/bilalsada with { mode: 'sandbox' }",
      }, { status: 404 });
    }

    // ✅ Build auth config from .env (same as seed)
    const authConfig: any = {
      mode: mode,
    };

    // ✅ Token takes priority if both are set (same as seed)
    if (accessToken) {
      authConfig.accessToken = accessToken;
      if (tokenExpiry) {
        authConfig.tokenExpiry = new Date(tokenExpiry);
      }
      console.log(`🔑 [Switch] Using token from .env: ${accessToken.substring(0, 15)}...`);
    } else if (username && password) {
      authConfig.username = username;
      authConfig.password = password;
      authConfig.autoRefresh = true;
      console.log(`🔑 [Switch] Using credentials from .env`);
      console.log(`🔑 [Switch] Username: ${username}`);
      console.log(`🔑 [Switch] Auto-refresh: Enabled`);
    }

    console.log(`🌐 [Switch] API Base URL: ${apiBaseUrl}`);
    console.log(`🌐 [Switch] Mode: ${mode}`);

    // ✅ Update vendor with new mode configuration
    const updatedVendor = await prisma.vendor.update({
      where: { code: 'BILAL_SADA' },
      data: {
        name: `BilalSada ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
        apiBaseUrl: apiBaseUrl,
        authConfig: authConfig,
        metadata: {
          ...(existingVendor.metadata as any || {}),
          mode: mode,
          lastSwitchedAt: new Date().toISOString(),
          switchedFrom: (existingVendor.metadata as any)?.mode || 'unknown',
          authMethod: authConfig.accessToken ? 'TOKEN' : 'CREDENTIALS',
        },
      },
    });

    console.log(`✅ [BilalSada Switch] Successfully switched to ${mode}`);

    // ✅ Update vendor services to reflect the mode
    await prisma.vendorService.updateMany({
      where: { vendorId: updatedVendor.id },
      data: {
        metadata: {
          endpoint: '/pay',
          method: 'POST',
          mode: mode,
        },
      },
    });

    // Get complete vendor with services
    const completeVendor = await prisma.vendor.findUnique({
      where: { id: updatedVendor.id },
      include: { services: true },
    });

    return NextResponse.json({
      success: true,
      message: `BilalSada switched to ${mode} mode successfully`,
      data: {
        vendor: {
          id: completeVendor?.id,
          name: completeVendor?.name,
          code: completeVendor?.code,
          apiBaseUrl: completeVendor?.apiBaseUrl,
          status: completeVendor?.status,
          priority: completeVendor?.priority,
          mode: mode,
          authMethod: authConfig.accessToken ? 'TOKEN' : 'CREDENTIALS',
          services: completeVendor?.services.map(s => ({
            serviceType: s.serviceType,
            isActive: s.isActive,
            priority: s.priority,
          })),
          metadata: completeVendor?.metadata,
        },
        envStatus: {
          tokenConfigured: !!accessToken,
          credentialsConfigured: !!(username && password),
          apiUrlConfigured: !!process.env.BILAL_SADA_API_URL,
          modeConfigured: !!process.env.BILAL_SADA_MODE,
        },
        nextSteps: {
          testAirtime: 'POST /api/vendor/bilalsada/airtime',
          testData: 'POST /api/vendor/bilalsada/data',
        },
      },
    });

  } catch (error: any) {
    console.error('❌ [BilalSada Switch] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to switch BilalSada mode',
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
        suggestion: 'Run POST /api/seed/bilalsada to configure',
      }, { status: 404 });
    }

    // ✅ Read from .env to show status
    const accessToken = process.env.BILAL_SADA_ACCESS_TOKEN;
    const username = process.env.BILAL_SADA_USERNAME;
    const password = process.env.BILAL_SADA_PASSWORD;
    const apiUrl = process.env.BILAL_SADA_API_URL;

    // ✅ Determine current mode from metadata or authConfig
    const currentMode = (vendor.metadata as any)?.mode || 
                        (vendor.authConfig as any)?.mode || 
                        'sandbox';

    return NextResponse.json({
      success: true,
      data: {
        currentMode: currentMode,
        vendor: {
          id: vendor.id,
          name: vendor.name,
          code: vendor.code,
          apiBaseUrl: vendor.apiBaseUrl,
          status: vendor.status,
          priority: vendor.priority,
          authMethod: vendor.authConfig?.accessToken ? 'TOKEN' : 'CREDENTIALS',
          services: vendor.services.map(s => ({
            serviceType: s.serviceType,
            isActive: s.isActive,
            priority: s.priority,
          })),
        },
        envStatus: {
          tokenConfigured: !!accessToken,
          credentialsConfigured: !!(username && password),
          apiUrlConfigured: !!apiUrl,
          apiUrl: apiUrl || 'https://bilalsadasub.com (default)',
          modeConfigured: !!process.env.BILAL_SADA_MODE,
        },
        nextSteps: {
          switchToSandbox: 'POST /api/seed/bilalsada/switch with { "mode": "sandbox" }',
          switchToSimulation: 'POST /api/seed/bilalsada/switch with { "mode": "simulation" }',
          switchToLive: 'POST /api/seed/bilalsada/switch with { "mode": "live" }',
        },
      },
    });

  } catch (error: any) {
    console.error('❌ [BilalSada Switch] GET error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch BilalSada status',
    }, { status: 500 });
  }
}