// src/app/api/seed/vtpass/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VtuType, VendorStatus, VtuVendor } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const environment = body.environment || 'sandbox';

    console.log(`🌱 Seeding VTpass ${environment} vendor...`);

    // Get credentials from environment
    const apiKey = environment === 'sandbox' 
      ? process.env.VTPASS_SANDBOX_API_KEY 
      : process.env.VTPASS_LIVE_API_KEY;
    
    const secretKey = environment === 'sandbox'
      ? process.env.VTPASS_SANDBOX_SECRET_KEY
      : process.env.VTPASS_LIVE_SECRET_KEY;
    
    const publicKey = environment === 'sandbox'
      ? process.env.VTPASS_SANDBOX_PUBLIC_KEY
      : process.env.VTPASS_LIVE_PUBLIC_KEY;
    
    // ✅ Fix: Remove /api from base URL since we'll add it in endpoints
    const rawApiUrl = environment === 'sandbox'
      ? process.env.VTPASS_SANDBOX_API_URL || 'https://sandbox.vtpass.com/'
      : process.env.VTPASS_LIVE_API_URL || 'https://vtpass.com/';
    const apiBaseUrl = rawApiUrl.replace(/\/$/, '');

    console.log(`🌐 [Seed] API Base URL: ${apiBaseUrl}`);
    console.log(`🔑 [Seed] API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`🔑 [Seed] Secret Key: ${secretKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`🔑 [Seed] Public Key: ${publicKey ? '✅ Set' : '❌ Missing'}`);

    if (!apiKey) {
      console.error(`❌ VTPASS_${environment.toUpperCase()}_API_KEY not set`);
      return NextResponse.json({
        success: false,
        error: `VTPASS_${environment.toUpperCase()}_API_KEY not set in environment variables`,
      }, { status: 400 });
    }

    // Create or update vendor
    const vendor = await prisma.vendor.upsert({
      where: { code: 'VTPASS' },
      update: {
        name: `VTpass ${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
        apiBaseUrl: apiBaseUrl,  // ✅ Now this is just the domain
        type: VtuVendor.VTPASS,
        authType: 'API_KEY',
        authConfig: {
          authMethod: 'apikey',
          apiKey: apiKey,
          secretKey: secretKey || '',
          publicKey: publicKey || '',
        },
        priority: 1,
        status: VendorStatus.ACTIVE,
        successRate: 100,
        avgResponseTime: 0,
        failureCount: 0,
        consecutiveFailures: 0,
      },
      create: {
        id: `vtpass-${environment}-001`,
        code: 'VTPASS',
        name: `VTpass ${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
        apiBaseUrl: apiBaseUrl,  // ✅ Now this is just the domain
        type: VtuVendor.VTPASS,
        authType: 'API_KEY',
        authConfig: {
          authMethod: 'apikey',
          apiKey: apiKey,
          secretKey: secretKey || '',
          publicKey: publicKey || '',
        },
        priority: 1,
        status: VendorStatus.ACTIVE,
        successRate: 100,
        avgResponseTime: 0,
        failureCount: 0,
        consecutiveFailures: 0,
      },
    });

    console.log(`✅ Vendor ${vendor.id} created/updated with API URL: ${vendor.apiBaseUrl}`);

    // Create vendor services
    const services = [
      { serviceType: VtuType.AIRTIME, priority: 1 },
      { serviceType: VtuType.DATA, priority: 2 },
      { serviceType: VtuType.ELECTRICITY_INSTANT, priority: 3 },
      { serviceType: VtuType.CABLE_TV, priority: 4 },
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
          services: completeVendor?.services.map(s => ({
            serviceType: s.serviceType,
            isActive: s.isActive,
            priority: s.priority,
          })),
        },
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

    const safeVendor = {
      id: vendor.id,
      name: vendor.name,
      code: vendor.code,
      apiBaseUrl: vendor.apiBaseUrl,
      status: vendor.status,
      priority: vendor.priority,
      services: vendor.services.map(s => ({
        serviceType: s.serviceType,
        isActive: s.isActive,
        priority: s.priority,
      })),
    };

    return NextResponse.json({
      success: true,
      data: safeVendor,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch vendor configuration',
    }, { status: 500 });
  }
}