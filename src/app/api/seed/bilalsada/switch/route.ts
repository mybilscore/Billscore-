// src/app/api/seed/bilalsada/switch/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VendorStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode } = body;

    if (!mode || !['simulation', 'live'].includes(mode)) {
      return NextResponse.json({
        success: false,
        error: "Invalid mode. Must be 'simulation' or 'live'",
        validOptions: ['simulation', 'live'],
      }, { status: 400 });
    }

    console.log(`🔄 [BilalSada Switch] Switching to ${mode} mode...`);

    // Get credentials based on mode
    const username = process.env.BILAL_SADA_USERNAME || 'mijinyawa01';
    const password = process.env.BILAL_SADA_PASSWORD || 'your-password';
    
    const apiBaseUrl = mode === 'simulation' 
      ? 'https://simulation.bilalsada.com'
      : process.env.BILAL_SADA_API_URL || 'https://bilalsada.com';

    console.log(`🌐 [BilalSada Switch] Mode: ${mode}`);
    console.log(`🌐 [BilalSada Switch] API Base URL: ${apiBaseUrl}`);
    console.log(`🔑 [BilalSada Switch] Username: ${username}`);
    console.log(`🔑 [BilalSada Switch] Password: ${password ? '✅ Set' : '❌ Missing'}`);

    // Find existing BilalSada vendor
    const existingVendor = await prisma.vendor.findUnique({
      where: { code: 'BILAL_SADA' },
    });

    if (!existingVendor) {
      return NextResponse.json({
        success: false,
        error: "BilalSada vendor not found. Please seed first.",
        suggestion: "Run: POST /api/seed/bilalsada with { mode: 'simulation' }",
      }, { status: 404 });
    }

    // Update vendor with new mode configuration
    const updatedVendor = await prisma.vendor.update({
      where: { code: 'BILAL_SADA' },
      data: {
        name: `BilalSada ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
        apiBaseUrl: apiBaseUrl,
        authConfig: {
          username: username,
          password: password,
          mode: mode,
        },
        metadata: {
          ...(existingVendor.metadata as any || {}),
          mode: mode,
          lastSwitchedAt: new Date().toISOString(),
          switchedFrom: (existingVendor.metadata as any)?.mode || 'unknown',
          credentials: {
            usernameSet: !!username,
            passwordSet: !!password,
          },
        },
      },
    });

    console.log(`✅ [BilalSada Switch] Successfully switched to ${mode}`);

    // Also update all vendor services to reflect the mode
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
          services: completeVendor?.services.map(s => ({
            serviceType: s.serviceType,
            isActive: s.isActive,
            priority: s.priority,
            metadata: s.metadata,
          })),
          metadata: completeVendor?.metadata,
        },
        mode: mode,
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
      }, { status: 404 });
    }

    const currentMode = (vendor.metadata as any)?.mode || 
                        (vendor.authConfig as any)?.mode || 
                        'unknown';

    const isSimulation = currentMode === 'simulation' || 
                         vendor.apiBaseUrl?.includes('simulation');

    return NextResponse.json({
      success: true,
      data: {
        currentMode: isSimulation ? 'simulation' : 'live',
        vendor: {
          id: vendor.id,
          name: vendor.name,
          code: vendor.code,
          apiBaseUrl: vendor.apiBaseUrl,
          status: vendor.status,
          priority: vendor.priority,
          mode: currentMode,
          isSimulation: isSimulation,
          services: vendor.services.map(s => ({
            serviceType: s.serviceType,
            isActive: s.isActive,
            priority: s.priority,
          })),
          metadata: vendor.metadata,
          authConfig: {
            mode: (vendor.authConfig as any)?.mode,
          },
        },
        environmentVariables: {
          usernameSet: !!process.env.BILAL_SADA_USERNAME,
          passwordSet: !!process.env.BILAL_SADA_PASSWORD,
        },
        nextSteps: {
          switchToSimulation: 'POST /api/seed/bilalsada/switch with { "mode": "simulation" }',
          switchToLive: 'POST /api/seed/bilalsada/switch with { "mode": "live" }',
        },
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch BilalSada status',
    }, { status: 500 });
  }
}