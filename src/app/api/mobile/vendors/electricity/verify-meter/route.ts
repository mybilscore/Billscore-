// src/app/api/mobile/vendors/electricity/verify-meter/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/db";
import { VtuType, VendorStatus } from "@prisma/client";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

// ============================================================
// TYPES
// ============================================================

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

// ============================================================
// AUTHENTICATION
// ============================================================

async function authenticateMobile(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    console.error("❌ [MOBILE VERIFY METER] Token verification failed:", error);
    return null;
  }
}

// ============================================================
// VERIFICATION FUNCTIONS
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

  // Validate discoId (1-8)
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

  // Check if it's a "Invalid Meter Number" error
  if (response.status === 403) {
    const errorText = await response.text();
    console.log(`[BilalSada Verify] Meter not found: ${errorText}`);
    throw new Error(`Meter not found: ${errorText}`);
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

    const customerName = content.Customer_Name || "Unknown";
    const customerAddress = content.Address || "";
    const customerPhone = content.Phone || null;
    const customerEmail = content.Email || null;

    return {
      success: true,
      vendor: 'VTPASS',
      data: {
        customerName,
        customerAddress,
        meterNumber: content.Meter_Number || meterNumber,
        meterType: content.Meter_Type || meterType,
        status: content.Status || "ACTIVE",
        customerPhone,
        customerEmail,
      },
    };
  }

  throw new Error(data.response_description || data.message || "Meter verification failed");
}

// ============================================================
// MAIN API ROUTE
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate mobile user
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      console.log("❌ [MOBILE VERIFY METER] Authentication failed");
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
        message: "Please login to verify meter",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`👤 [MOBILE VERIFY METER] User authenticated: ${userId}`);

    // 2. Parse request body
    const body = await request.json();
    const { serviceID, meterNumber, meterType, disco, discoId } = body;

    // 3. Validate request
    if (!meterNumber || meterNumber.length < 7) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid meter number (minimum 7 digits)",
      }, { status: 400 });
    }

    console.log(`📡 [MOBILE VERIFY METER] Verifying meter: ${meterNumber} (${meterType || 'prepaid'})`);
    console.log(`📡 [MOBILE VERIFY METER] ServiceID: ${serviceID}, Disco: ${disco || discoId}`);

    // 4. Get active vendor for electricity
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
      console.log("❌ [MOBILE VERIFY METER] No active vendor found");
      return NextResponse.json({
        success: false,
        error: "No active vendor found for electricity service",
      }, { status: 503 });
    }

    console.log(`[MOBILE VERIFY METER] Using vendor: ${activeVendor.code}`);

    // 5. Try verification with active vendor
    let result: VerificationResult | null = null;

    // ✅ Handle BilalSada
    if (activeVendor.code === 'BILAL_SADA') {
      let discoIdNum = disco || discoId || 1;
      discoIdNum = Math.min(Math.max(Number(discoIdNum), 1), 8);

      console.log(`[MOBILE VERIFY METER] Using BilalSada discoId: ${discoIdNum}`);

      try {
        result = await verifyWithBilalSada(meterNumber, discoIdNum, meterType || 'prepaid');
      } catch (error: any) {
        console.error(`[MOBILE VERIFY METER] BilalSada verification failed:`, error.message);
        // If BilalSada fails, try VTpass fallback if available
        const vtpassVendor = await prisma.vendor.findFirst({
          where: {
            code: 'VTPASS',
            status: VendorStatus.ACTIVE,
          },
        });

        if (vtpassVendor && serviceID) {
          console.log(`[MOBILE VERIFY METER] Falling back to VTpass`);
          try {
            result = await verifyWithVtpass(serviceID, meterNumber, meterType || 'prepaid');
          } catch (vtpassError: any) {
            console.error(`[MOBILE VERIFY METER] VTpass fallback failed:`, vtpassError.message);
            throw vtpassError;
          }
        } else {
          throw error;
        }
      }
    }
    // ✅ Handle VTpass
    else if (activeVendor.code === 'VTPASS') {
      if (!serviceID) {
        return NextResponse.json({
          success: false,
          error: "Service ID is required for VTpass verification",
        }, { status: 400 });
      }

      try {
        result = await verifyWithVtpass(serviceID, meterNumber, meterType || 'prepaid');
      } catch (error: any) {
        console.error(`[MOBILE VERIFY METER] VTpass verification failed:`, error.message);
        throw error;
      }
    } else {
      return NextResponse.json({
        success: false,
        error: `Unsupported vendor: ${activeVendor.code}`,
      }, { status: 400 });
    }

    // 6. Return result
    if (result && result.success) {
      const customerName = result.data.customerName || "Unknown Customer";
      const meterNumberFromResponse = result.data.meterNumber || meterNumber;

      // Determine if customer is valid
      const isValid = customerName && customerName !== "Unknown" && customerName !== "";

      console.log(`✅ [MOBILE VERIFY METER] Customer verified: ${customerName} (${meterNumberFromResponse})`);

      return NextResponse.json({
        success: true,
        data: {
          customerName: customerName,
          customerAddress: result.data.customerAddress || "",
          customerPhone: result.data.customerPhone || null,
          customerEmail: result.data.customerEmail || null,
          meterNumber: meterNumberFromResponse,
          meterType: result.data.meterType || meterType || "prepaid",
          status: result.data.status || "ACTIVE",
          isValid: isValid,
          vendor: result.vendor,
          arrears: 0,
          minimumAmount: 100,
          canVend: true,
        },
      });
    }

    // If we get here, verification failed
    return NextResponse.json({
      success: false,
      error: "Meter verification failed. Please check the meter number and try again.",
    }, { status: 400 });

  } catch (error: any) {
    console.error("❌ [MOBILE VERIFY METER] Error:", error);

    // Handle network errors
    if (error.message?.includes("fetch") || error.message?.includes("network")) {
      return NextResponse.json({
        success: false,
        error: "Network error. Please check your internet connection and try again.",
      }, { status: 500 });
    }

    // Handle specific error messages
    const errorMessage = error.message || "Failed to verify meter. Please try again.";
    
    // Check if it's a "meter not found" error
    if (errorMessage.toLowerCase().includes("not found") || 
        errorMessage.toLowerCase().includes("invalid meter")) {
      return NextResponse.json({
        success: false,
        error: "Meter number not found. Please check and try again.",
        code: "METER_NOT_FOUND",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// ✅ Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}