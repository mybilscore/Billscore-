// src/app/api/seed/legitdataway/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VtuType, VendorStatus, VtuVendor } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode = body.mode || 'simulation'; // 'simulation' or 'live'

    console.log(`🌱 Seeding LegitDataway ${mode} vendor...`);

    // Get credentials
    const username = process.env.LEGITDATAWAY_USERNAME || 'mijinyawa01';
    const password = process.env.LEGITDATAWAY_PASSWORD || 'your-password';
    const apiBaseUrl = mode === 'simulation' 
      ? 'https://simulation.legitdataway.com'
      : process.env.LEGITDATAWAY_API_URL || 'https://legitdataway.com';

    console.log(`🌐 [Seed] API Base URL: ${apiBaseUrl}`);
    console.log(`🔑 [Seed] Username: ${username}`);
    console.log(`🔑 [Seed] Password: ${password ? '✅ Set' : '❌ Missing'}`);

    // Create or update vendor
    const vendor = await prisma.vendor.upsert({
      where: { code: 'LEGITDATAWAY' },
      update: {
        name: `LegitDataway ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
        apiBaseUrl: apiBaseUrl,
        type: VtuVendor.VTPASS,
        authType: 'BEARER_TOKEN',
        authConfig: {
          username: username,
          password: password,
          mode: mode,
        },
        priority: 1,
        status: VendorStatus.ACTIVE,
        successRate: 100,
        avgResponseTime: 0,
        failureCount: 0,
        consecutiveFailures: 0,
      },
      create: {
        id: `legitdataway-${mode}-001`,
        code: 'LEGITDATAWAY',
        name: `LegitDataway ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
        apiBaseUrl: apiBaseUrl,
        type: VtuVendor.VTPASS,
        authType: 'BEARER_TOKEN',
        authConfig: {
          username: username,
          password: password,
          mode: mode,
        },
        priority: 1,
        status: VendorStatus.ACTIVE,
        successRate: 100,
        avgResponseTime: 0,
        failureCount: 0,
        consecutiveFailures: 0,
      },
    });

    console.log(`✅ Vendor ${vendor.id} created/updated`);

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

    console.log(`✅ LegitDataway ${mode} seeded successfully`);

    const completeVendor = await prisma.vendor.findUnique({
      where: { id: vendor.id },
      include: { services: true },
    });

    return NextResponse.json({
      success: true,
      message: `LegitDataway ${mode} vendor configured successfully`,
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
      error: error.message || 'Failed to seed LegitDataway vendor',
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