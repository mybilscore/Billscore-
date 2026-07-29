// app/api/admin/vendors/status/route.ts

import { NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { getVendorService } from "~/lib/vendors/vendor.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth("/auth/sign-in");
    
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const vendorService = getVendorService();
    const vendorStatus = vendorService.getVendorStatus();
    const metrics = vendorService.getMetrics();

    return NextResponse.json({
      success: true,
      data: {
        vendors: vendorStatus,
        metrics: metrics,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth("/auth/sign-in");
    
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, vendorCode } = body;

    const vendorService = getVendorService();

    let result = false;

    switch (action) {
      case "reset":
        if (vendorCode) {
          result = vendorService.resetVendorHealth(vendorCode as VtuVendor);
        }
        break;
      case "refresh":
        await vendorService.refreshVendors();
        result = true;
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result,
      data: {
        action,
        vendorCode,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}