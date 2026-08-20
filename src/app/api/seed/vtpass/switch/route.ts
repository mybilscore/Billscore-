// src/app/api/vendors/vtpass/switch/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VendorStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { environment } = body;

    if (!environment || !['sandbox', 'live'].includes(environment)) {
      return NextResponse.json({
        success: false,
        error: "Invalid environment. Must be 'sandbox' or 'live'",
        validOptions: ['sandbox', 'live'],
      }, { status: 400 });
    }

    console.log(`🔄 [VTpass Switch] Switching to ${environment} environment...`);

    // Get credentials based on environment
    const apiKey = environment === 'sandbox' 
      ? process.env.VTPASS_SANDBOX_API_KEY 
      : process.env.VTPASS_LIVE_API_KEY;
    
    const secretKey = environment === 'sandbox'
      ? process.env.VTPASS_SANDBOX_SECRET_KEY
      : process.env.VTPASS_LIVE_SECRET_KEY;
    
    const publicKey = environment === 'sandbox'
      ? process.env.VTPASS_SANDBOX_PUBLIC_KEY
      : process.env.VTPASS_LIVE_PUBLIC_KEY;
    
    // Base URL
    const apiBaseUrl = environment === 'sandbox'
      ? 'https://sandbox.vtpass.com/api'
      : 'https://vtpass.com/api';

    console.log(`🌐 [VTpass Switch] Environment: ${environment}`);
    console.log(`🌐 [VTpass Switch] API Base URL: ${apiBaseUrl}`);
    console.log(`🔑 [VTpass Switch] API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`🔑 [VTpass Switch] Secret Key: ${secretKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`🔑 [VTpass Switch] Public Key: ${publicKey ? '✅ Set' : '❌ Missing'}`);

    // Check if credentials exist
    if (!apiKey) {
      console.error(`❌ VTPASS_${environment.toUpperCase()}_API_KEY not set`);
      return NextResponse.json({
        success: false,
        error: `VTPASS_${environment.toUpperCase()}_API_KEY not set in environment variables.`,
        required: `VTPASS_${environment.toUpperCase()}_API_KEY`,
      }, { status: 400 });
    }

    // Find existing VTpass vendor
    const existingVendor = await prisma.vendor.findUnique({
      where: { code: 'VTPASS' },
    });

    if (!existingVendor) {
      return NextResponse.json({
        success: false,
        error: "VTpass vendor not found. Please seed first.",
        suggestion: "Run: POST /api/seed/vtpass with { environment: 'sandbox' }",
      }, { status: 404 });
    }

    // Update vendor with new environment configuration
    const updatedVendor = await prisma.vendor.update({
      where: { code: 'VTPASS' },
      data: {
        name: `VTpass ${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
        apiBaseUrl: apiBaseUrl,
        authConfig: {
          authMethod: 'apikey',
          apiKey: apiKey,
          secretKey: secretKey || '',
          publicKey: publicKey || '',
          environment: environment,
        },
        metadata: {
          ...(existingVendor.metadata as any || {}),
          environment: environment,
          lastSwitchedAt: new Date().toISOString(),
          switchedFrom: (existingVendor.metadata as any)?.environment || 'unknown',
          credentials: {
            apiKeySet: !!apiKey,
            secretKeySet: !!secretKey,
            publicKeySet: !!publicKey,
          },
        },
      },
    });

    console.log(`✅ [VTpass Switch] Successfully switched to ${environment}`);

    // Also update all vendor services to reflect the environment
    await prisma.vendorService.updateMany({
      where: { vendorId: updatedVendor.id },
      data: {
        metadata: {
          endpoint: '/pay',
          method: 'POST',
          environment: environment,
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
      message: `VTpass switched to ${environment} environment successfully`,
      data: {
        vendor: {
          id: completeVendor?.id,
          name: completeVendor?.name,
          code: completeVendor?.code,
          apiBaseUrl: completeVendor?.apiBaseUrl,
          status: completeVendor?.status,
          priority: completeVendor?.priority,
          environment: environment,
          services: completeVendor?.services.map(s => ({
            serviceType: s.serviceType,
            isActive: s.isActive,
            priority: s.priority,
            metadata: s.metadata,
          })),
          metadata: completeVendor?.metadata,
        },
        environment: environment,
      },
    });

  } catch (error: any) {
    console.error('❌ [VTpass Switch] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to switch VTpass environment',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { code: 'VTPASS' },
      include: { services: true },
    });

    if (!vendor) {
      return NextResponse.json({
        success: false,
        message: 'VTpass vendor not configured',
      }, { status: 404 });
    }

    const currentEnvironment = (vendor.metadata as any)?.environment || 
                              (vendor.authConfig as any)?.environment || 
                              'unknown';

    const isSandbox = currentEnvironment === 'sandbox' || 
                      vendor.apiBaseUrl?.includes('sandbox');

    return NextResponse.json({
      success: true,
      data: {
        currentEnvironment: isSandbox ? 'sandbox' : 'live',
        vendor: {
          id: vendor.id,
          name: vendor.name,
          code: vendor.code,
          apiBaseUrl: vendor.apiBaseUrl,
          status: vendor.status,
          priority: vendor.priority,
          environment: currentEnvironment,
          isSandbox: isSandbox,
          services: vendor.services.map(s => ({
            serviceType: s.serviceType,
            isActive: s.isActive,
            priority: s.priority,
          })),
          metadata: vendor.metadata,
          authConfig: {
            environment: (vendor.authConfig as any)?.environment,
            // Don't expose sensitive data
          },
        },
        environmentVariables: {
          sandbox: {
            apiKeySet: !!process.env.VTPASS_SANDBOX_API_KEY,
            secretKeySet: !!process.env.VTPASS_SANDBOX_SECRET_KEY,
            publicKeySet: !!process.env.VTPASS_SANDBOX_PUBLIC_KEY,
          },
          live: {
            apiKeySet: !!process.env.VTPASS_LIVE_API_KEY,
            secretKeySet: !!process.env.VTPASS_LIVE_SECRET_KEY,
            publicKeySet: !!process.env.VTPASS_LIVE_PUBLIC_KEY,
          },
        },
        nextSteps: {
          switchToSandbox: 'POST /api/vendors/vtpass/switch with { "environment": "sandbox" }',
          switchToLive: 'POST /api/vendors/vtpass/switch with { "environment": "live" }',
        },
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch VTpass status',
    }, { status: 500 });
  }
}