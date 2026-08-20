// src/app/api/seed/vtpass/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VtuType, VendorStatus, VtuVendor } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const environment = body.environment || 'sandbox';

    console.log(`🌱 Seeding VTpass ${environment} vendor...`);

    // Get credentials based on environment
    // Sandbox uses SANDBOX variables, Live uses LIVE variables
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

    console.log(`🌐 [Seed] Environment: ${environment}`);
    console.log(`🌐 [Seed] API Base URL: ${apiBaseUrl}`);
    console.log(`🔑 [Seed] API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`🔑 [Seed] Secret Key: ${secretKey ? '✅ Set' : '❌ Missing'}`);

    if (!apiKey) {
      console.error(`❌ VTPASS_${environment.toUpperCase()}_API_KEY not set`);
      return NextResponse.json({
        success: false,
        error: `VTPASS_${environment.toUpperCase()}_API_KEY not set in environment variables. Please set it in your .env file.`,
        required: `VTPASS_${environment.toUpperCase()}_API_KEY`,
      }, { status: 400 });
    }

    // ✅ FIX: Use code as the unique identifier for upsert
    const vendor = await prisma.vendor.upsert({
      where: { code: 'VTPASS' },
      update: {
        name: `VTpass ${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
        apiBaseUrl: apiBaseUrl,
        type: VtuVendor.VTPASS,
        authType: 'API_KEY',
        authConfig: {
          authMethod: 'apikey',
          apiKey: apiKey,
          secretKey: secretKey || '',
          publicKey: publicKey || '',
          environment: environment,
        },
        priority: 1,
        status: VendorStatus.ACTIVE,
        successRate: 100,
        avgResponseTime: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        metadata: {
          environment: environment,
          lastSeededAt: new Date().toISOString(),
          credentials: {
            apiKeySet: !!apiKey,
            secretKeySet: !!secretKey,
            publicKeySet: !!publicKey,
          },
        },
      },
      create: {
        id: `vtpass-${environment}-${Date.now()}`,
        code: 'VTPASS',
        name: `VTpass ${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
        apiBaseUrl: apiBaseUrl,
        type: VtuVendor.VTPASS,
        authType: 'API_KEY',
        authConfig: {
          authMethod: 'apikey',
          apiKey: apiKey,
          secretKey: secretKey || '',
          publicKey: publicKey || '',
          environment: environment,
        },
        priority: 1,
        status: VendorStatus.ACTIVE,
        successRate: 100,
        avgResponseTime: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        metadata: {
          environment: environment,
          seededAt: new Date().toISOString(),
          credentials: {
            apiKeySet: !!apiKey,
            secretKeySet: !!secretKey,
            publicKeySet: !!publicKey,
          },
        },
      },
    });

    console.log(`✅ Vendor ${vendor.id} created/updated with ${environment} credentials`);

    // Services to create
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
          metadata: {
            endpoint: '/pay',
            method: 'POST',
            environment: environment,
          },
        },
        create: {
          vendorId: vendor.id,
          serviceType: service.serviceType,
          isActive: true,
          priority: service.priority,
          markup: 0,
          metadata: {
            endpoint: '/pay',
            method: 'POST',
            environment: environment,
          },
        },
      });
    }

    console.log(`✅ VTpass ${environment} seeded successfully`);

    const completeVendor = await prisma.vendor.findUnique({
      where: { id: vendor.id },
      include: { services: true },
    });

    return NextResponse.json({
      success: true,
      message: `VTpass ${environment} vendor configured successfully`,
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
        },
        environment: environment,
      },
    });

  } catch (error: any) {
    console.error('❌ Seed error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to seed VTpass vendor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { code: 'VTPASS' },
      include: { services: true },
    });

    if (!vendors || vendors.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'VTpass vendor not configured',
      }, { status: 404 });
    }

    const safeVendors = vendors.map(vendor => ({
      id: vendor.id,
      name: vendor.name,
      code: vendor.code,
      apiBaseUrl: vendor.apiBaseUrl,
      status: vendor.status,
      priority: vendor.priority,
      environment: vendor.metadata?.environment || 'unknown',
      metadata: vendor.metadata,
      services: vendor.services.map(s => ({
        serviceType: s.serviceType,
        isActive: s.isActive,
        priority: s.priority,
        metadata: s.metadata,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: safeVendors,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch vendor configuration',
    }, { status: 500 });
  }
}