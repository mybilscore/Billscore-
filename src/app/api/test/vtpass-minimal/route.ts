// src/app/api/test/vtpass-minimal/route.ts

import { NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VTPassVendor } from "~/lib/vendors/vtpass.vendor";

export async function GET() {
  try {
    console.log("🧪 [MINIMAL TEST] Starting minimal VTpass test...");

    // Get vendor from database
    const vendorConfig = await prisma.vendor.findUnique({
      where: { code: 'VTPASS' },
    });

    if (!vendorConfig) {
      return NextResponse.json({
        success: false,
        error: "VTpass vendor not found",
      });
    }

    console.log("🔍 [MINIMAL TEST] Vendor config:", {
      id: vendorConfig.id,
      name: vendorConfig.name,
      apiBaseUrl: vendorConfig.apiBaseUrl,
      authType: vendorConfig.authType,
      hasAuthConfig: !!vendorConfig.authConfig,
    });

    // Create vendor instance
    const vendor = new VTPassVendor({
      id: vendorConfig.id,
      name: vendorConfig.name,
      code: vendorConfig.code as any,
      apiBaseUrl: vendorConfig.apiBaseUrl,
      authType: vendorConfig.authType as any,
      authConfig: vendorConfig.authConfig as any,
      priority: vendorConfig.priority,
      supportedServices: ['AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'CABLE_TV'] as any,
      isActive: true,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    });

    // Test authentication
    console.log("🔑 [MINIMAL TEST] Testing authentication...");
    const headers = await vendor.authenticate();
    console.log("✅ [MINIMAL TEST] Authentication headers:", Object.keys(headers));

    // Test airtime purchase
    console.log("📱 [MINIMAL TEST] Testing airtime purchase...");
    const result = await vendor.buyAirtime({
      phoneNumber: '08012345678',
      amount: 100,
      network: 'MTN',
    });

    console.log("📊 [MINIMAL TEST] Result:", {
      success: result.success,
      error: result.error,
      vendor: result.vendor,
      vendorReference: result.vendorReference,
      data: result.data,
      metadata: result.metadata,
      rawResponse: result.rawResponse,
    });

    return NextResponse.json({
      success: result.success,
      result,
      vendor: {
        id: vendorConfig.id,
        name: vendorConfig.name,
        apiBaseUrl: vendorConfig.apiBaseUrl,
      },
    });

  } catch (error: any) {
    console.error("❌ [MINIMAL TEST] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}