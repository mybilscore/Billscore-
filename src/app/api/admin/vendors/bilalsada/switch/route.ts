// src/app/api/admin/vendors/bilalsada/switch/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode } = body;

    if (!mode || !['sandbox', 'simulation', 'live'].includes(mode)) {
      return NextResponse.json({
        success: false,
        error: "Invalid mode. Must be 'sandbox', 'simulation', or 'live'",
        validOptions: ['sandbox', 'simulation', 'live'],
      }, { status: 400 });
    }

    console.log(`🔄 [BilalSada Switch] Switching to ${mode} mode...`);

    // ✅ Read token from .env
    const accessToken = process.env.BILAL_SADA_ACCESS_TOKEN;
    const apiBaseUrl = process.env.BILAL_SADA_API_URL || 'https://bilalsadasub.com';

    console.log(`🌐 [BilalSada Switch] Mode: ${mode}`);
    console.log(`🌐 [BilalSada Switch] API Base URL: ${apiBaseUrl}`);
    console.log(`🔑 [BilalSada Switch] Token: ${accessToken ? '✅ Set' : '❌ Missing'}`);

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: "No access token configured for BilalSada.",
        required: "Set BILAL_SADA_ACCESS_TOKEN in .env",
      }, { status: 400 });
    }

    const existingVendor = await prisma.vendor.findUnique({
      where: { code: 'BILAL_SADA' },
    });

    if (!existingVendor) {
      return NextResponse.json({
        success: false,
        error: "BilalSada vendor not found. Please seed first.",
      }, { status: 404 });
    }

    // ✅ Build auth config - Token only
    const authConfig = {
      mode: mode,
      accessToken: accessToken,
    };

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
          authMethod: 'TOKEN',
          switchedBy: request.headers.get('x-admin-id') || 'admin',
        },
      },
    });

    console.log(`✅ [BilalSada Switch] Successfully switched to ${mode}`);

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
          authMethod: 'TOKEN',
          switchedBy: request.headers.get('x-admin-id') || 'admin',
          services: completeVendor?.services.map(s => ({
            serviceType: s.serviceType,
            isActive: s.isActive,
            priority: s.priority,
          })),
        },
      },
    });

  } catch (error: any) {
    console.error('❌ [BilalSada Switch] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to switch BilalSada mode',
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
      }, { status: 404 });
    }

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
          authMethod: 'TOKEN',
          switchedBy: (vendor.metadata as any)?.switchedBy || null,
          lastSwitchedAt: (vendor.metadata as any)?.lastSwitchedAt || null,
          services: vendor.services.map(s => ({
            serviceType: s.serviceType,
            isActive: s.isActive,
            priority: s.priority,
          })),
        },
        nextSteps: {
          switchToSandbox: 'POST /api/admin/vendors/bilalsada/switch with { "mode": "sandbox" }',
          switchToSimulation: 'POST /api/admin/vendors/bilalsada/switch with { "mode": "simulation" }',
          switchToLive: 'POST /api/admin/vendors/bilalsada/switch with { "mode": "live" }',
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