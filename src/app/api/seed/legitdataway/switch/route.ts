// src/app/api/seed/legitdataway/switch/route.ts

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

    console.log(`🔄 [LegitDataway Switch] Switching to ${mode} mode...`);

    // Get credentials based on mode
    const username = process.env.LEGITDATAWAY_USERNAME || 'mijinyawa01';
    const password = process.env.LEGITDATAWAY_PASSWORD || 'your-password';
    
    const apiBaseUrl = mode === 'simulation' 
      ? 'https://simulation.legitdataway.com'
      : process.env.LEGITDATAWAY_API_URL || 'https://legitdataway.com';

    console.log(`🌐 [LegitDataway Switch] Mode: ${mode}`);
    console.log(`🌐 [LegitDataway Switch] API Base URL: ${apiBaseUrl}`);
    console.log(`🔑 [LegitDataway Switch] Username: ${username}`);
    console.log(`🔑 [LegitDataway Switch] Password: ${password ? '✅ Set' : '❌ Missing'}`);

    // Find existing LegitDataway vendor
    const existingVendor = await prisma.vendor.findUnique({
      where: { code: 'LEGITDATAWAY' },
    });

    if (!existingVendor) {
      return NextResponse.json({
        success: false,
        error: "LegitDataway vendor not found. Please seed first.",
        suggestion: "Run: POST /api/seed/legitdataway with { mode: 'simulation' }",
      }, { status: 404 });
    }

    // Update vendor with new mode configuration
    const updatedVendor = await prisma.vendor.update({
      where: { code: 'LEGITDATAWAY' },
      data: {
        name: `LegitDataway ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
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

    console.log(`✅ [LegitDataway Switch] Successfully switched to ${mode}`);

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
      message: `LegitDataway switched to ${mode} mode successfully`,
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
    console.error('❌ [LegitDataway Switch] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to switch LegitDataway mode',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { code: 'LEGITDATAWAY' },
      include: { services: true },
    });

    if (!vendor) {
      return NextResponse.json({
        success: false,
        message: 'LegitDataway vendor not configured',
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
            // Don't expose sensitive data
          },
        },
        environmentVariables: {
          usernameSet: !!process.env.LEGITDATAWAY_USERNAME,
          passwordSet: !!process.env.LEGITDATAWAY_PASSWORD,
        },
        nextSteps: {
          switchToSimulation: 'POST /api/seed/legitdataway/switch with { "mode": "simulation" }',
          switchToLive: 'POST /api/seed/legitdataway/switch with { "mode": "live" }',
        },
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch LegitDataway status',
    }, { status: 500 });
  }
}