// app/api/vendors/electricity/verify-meter/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { VtuType, VendorStatus } from "@prisma/client";

// ✅ Types
interface VtpassVerificationResponse {
  code: string;
  content?: {
    Customer_Name?: string;
    Address?: string;
    Meter_Number?: string;
    Meter_Type?: string;
    Status?: string;
    Due_Date?: string;
    Customer_Type?: string;
    Can_Vend?: boolean;
    Phone?: string;
    Email?: string;
    customerName?: string;
    address?: string;
    meterNumber?: string;
    meterType?: string;
    status?: string;
    dueDate?: string;
    customerType?: string;
    canVend?: boolean;
    phone?: string;
    email?: string;
  };
  response_description?: string;
  message?: string;
}

interface BilalSadaVerificationResponse {
  status: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  message?: string;
}

interface VerificationResult {
  success: boolean;
  vendor: string;
  data: {
    customerName: string;
    customerAddress: string;
    meterNumber: string;
    meterType: string;
    status: string;
    customerPhone: string | null;
    customerEmail: string | null;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceID, meterNumber, meterType, disco } = body;

    if (!meterNumber) {
      return NextResponse.json({
        success: false,
        error: "Meter number is required",
      }, { status: 400 });
    }

    console.log(`[Verify Meter] Request:`, {
      serviceID,
      meterNumber,
      meterType,
      disco,
    });

    // ✅ Get active vendor for electricity
    const activeVendor = await prisma.vendor.findFirst({
      where: {
        status: VendorStatus.ACTIVE,
        services: {
          some: {
            serviceType: VtuType.ELECTRICITY_INSTANT,
            isActive: true,
          },
        },
      },
      orderBy: { priority: 'asc' },
    });

    if (!activeVendor) {
      return NextResponse.json({
        success: false,
        error: "No active vendor found for electricity service",
      }, { status: 503 });
    }

    console.log(`[Verify Meter] Using vendor: ${activeVendor.code}`);

    // ✅ Only handle BilalSada (since it's the active vendor)
    if (activeVendor.code === 'BILAL_SADA') {
      // ✅ Use disco from request, ensure it's a valid number (1-8)
      let discoId = disco || body.discoId || 1;
      discoId = Math.min(Math.max(Number(discoId), 1), 8);
      
      console.log(`[Verify Meter] Using BilalSada discoId: ${discoId}`);
      
      const result = await verifyWithBilalSada(meterNumber, discoId, meterType || 'prepaid');
      return NextResponse.json(result);
    }

    // ✅ Fallback to VTpass if BilalSada is not active
    if (activeVendor.code === 'VTPASS') {
      const result = await verifyWithVtpass(serviceID, meterNumber, meterType);
      return NextResponse.json(result);
    }

    return NextResponse.json({
      success: false,
      error: `Unsupported vendor: ${activeVendor.code}`,
    }, { status: 400 });

  } catch (error: any) {
    console.error("❌ Error verifying meter:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Network error during verification",
    }, { status: 500 });
  }
}

// ============================================================
// BilalSada Meter Verification
// ============================================================

async function verifyWithBilalSada(
  meterNumber: string, 
  discoId: number, 
  meterType: string
): Promise<VerificationResult> {
  const accessToken = process.env.BILAL_SADA_ACCESS_TOKEN;
  const apiBaseUrl = process.env.BILAL_SADA_API_URL || 'https://bilalsadasub.com';

  if (!accessToken) {
    throw new Error("BilalSada access token is not configured");
  }

  // ✅ Validate discoId (1-8)
  if (discoId < 1 || discoId > 8) {
    console.warn(`[BilalSada Verify] Invalid discoId: ${discoId}, defaulting to 1 (Ikeja)`);
    discoId = 1;
  }

  const url = `${apiBaseUrl}/api/bill/bill-validation?meter_number=${meterNumber}&disco=${discoId}&meter_type=${meterType}`;

  console.log(`[BilalSada Verify] URL: ${url}`);
  console.log(`[BilalSada Verify] Meter: ${meterNumber}, Disco: ${discoId}, Type: ${meterType}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      'Authorization': `Token ${accessToken}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  // ✅ Check if it's a "Invalid Meter Number" error
  if (response.status === 403) {
    const errorText = await response.text();
    console.log(`[BilalSada Verify] Meter not found: ${errorText}`);
    throw new Error(`Meter not found in BilalSada: ${errorText}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[BilalSada Verify] HTTP ${response.status}: ${errorText}`);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data: BilalSadaVerificationResponse = await response.json();
  console.log(`[BilalSada Verify] Response:`, data);

  if (data.status === "success" && data.name) {
    return {
      success: true,
      vendor: 'BILAL_SADA',
      data: {
        customerName: data.name || "Unknown",
        customerAddress: data.address || "",
        meterNumber: meterNumber,
        meterType: meterType,
        status: "ACTIVE",
        customerPhone: data.phone || null,
        customerEmail: data.email || null,
      },
    };
  }

  throw new Error(data.message || data.status || "Meter verification failed");
}

// ============================================================
// VTpass Meter Verification (Fallback)
// ============================================================

async function verifyWithVtpass(
  serviceID: string, 
  meterNumber: string, 
  meterType: string
): Promise<VerificationResult> {
  const USE_SANDBOX = process.env.USE_SANDBOX_FOR_VERIFY !== 'false';
  
  const baseUrl = USE_SANDBOX 
    ? "https://sandbox.vtpass.com/api/merchant-verify"
    : "https://vtpass.com/api/merchant-verify";
  
  const apiKey = USE_SANDBOX 
    ? process.env.VTPASS_SANDBOX_API_KEY 
    : process.env.VTPASS_LIVE_API_KEY;
  
  const secretKey = USE_SANDBOX
    ? process.env.VTPASS_SANDBOX_SECRET_KEY
    : process.env.VTPASS_LIVE_SECRET_KEY;
  
  const publicKey = USE_SANDBOX
    ? process.env.VTPASS_SANDBOX_PUBLIC_KEY
    : process.env.VTPASS_LIVE_PUBLIC_KEY;

  console.log(`[VTpass Verify] Environment: ${USE_SANDBOX ? 'Sandbox' : 'Production'}`);

  if (!apiKey || !secretKey || !publicKey) {
    throw new Error("VTpass credentials are not configured");
  }

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'secret-key': secretKey,
      'public-key': publicKey,
    },
    body: JSON.stringify({
      serviceID: serviceID,
      billersCode: meterNumber,
      type: meterType || "prepaid",
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: VtpassVerificationResponse = await response.json();
  console.log(`[VTpass Verify] Response code: ${data.code}`);

  if (data.code === "000" && data.content) {
    const content = data.content;
    
    const customerName = content.Customer_Name || content.customerName || "Unknown";
    const customerAddress = content.Address || content.address || "";
    const customerPhone = content.Phone || content.phone || content.Customer_Phone || null;
    const customerEmail = content.Email || content.email || content.Customer_Email || null;
    
    return {
      success: true,
      vendor: 'VTPASS',
      data: {
        customerName,
        customerAddress,
        meterNumber: content.Meter_Number || content.meterNumber || meterNumber,
        meterType: content.Meter_Type || content.meterType || meterType,
        status: content.Status || content.status || "ACTIVE",
        customerPhone,
        customerEmail,
      },
    };
  }

  throw new Error(data.response_description || data.message || "Meter verification failed");
}