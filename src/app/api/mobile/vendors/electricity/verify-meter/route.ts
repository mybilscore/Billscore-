// src/app/api/mobile/vendors/electricity/verify-meter/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

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
    const { serviceID, meterNumber, meterType } = body;

    // 3. Validate request
    if (!serviceID) {
      return NextResponse.json({
        success: false,
        error: "Service ID is required",
      }, { status: 400 });
    }

    if (!meterNumber || meterNumber.length < 7) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid meter number (minimum 7 digits)",
      }, { status: 400 });
    }

    console.log(`📡 [MOBILE VERIFY METER] Verifying meter: ${meterNumber} (${meterType || 'prepaid'})`);

    // 4. Determine environment
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction 
      ? "https://vtpass.com/api/merchant-verify"
      : "https://sandbox.vtpass.com/api/merchant-verify";
    
    // Get API keys from environment
    const apiKey = isProduction 
      ? process.env.VTPASS_LIVE_API_KEY 
      : process.env.VTPASS_SANDBOX_API_KEY;
    
    const secretKey = isProduction
      ? process.env.VTPASS_LIVE_SECRET_KEY
      : process.env.VTPASS_SANDBOX_SECRET_KEY;

    console.log(`🔑 [MOBILE VERIFY METER] Using ${isProduction ? 'LIVE' : 'SANDBOX'} environment`);

    // 5. Call VTpass API
    const vtpassStart = Date.now();
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey || "",
        "secret-key": secretKey || "",
      },
      body: JSON.stringify({
        serviceID: serviceID,
        billersCode: meterNumber,
        type: meterType || "prepaid",
      }),
    });

    console.log(`⏱️ [MOBILE VERIFY METER] VTpass API call took ${Date.now() - vtpassStart}ms`);

    if (!response.ok) {
      console.error(`❌ [MOBILE VERIFY METER] VTpass API error: ${response.status}`);
      return NextResponse.json({
        success: false,
        error: `Failed to verify meter. Please try again.`,
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`📊 [MOBILE VERIFY METER] VTpass response:`, data);

    // 6. Process response
    if (data.code === "000" && data.content) {
      // Extract customer info
      const customerName = data.content.Customer_Name || 
                          data.content.customerName || 
                          data.content.name || 
                          "Unknown Customer";
      
      const customerAddress = data.content.Address || 
                             data.content.address || 
                             data.content.customerAddress || 
                             "";

      const customerPhone = data.content.Phone || 
                           data.content.phone || 
                           data.content.mobile || 
                           null;

      const meterNumberFromResponse = data.content.Meter_Number || 
                                      data.content.meterNumber || 
                                      meterNumber;

      const meterTypeFromResponse = data.content.Meter_Type || 
                                    data.content.meterType || 
                                    meterType || 
                                    "prepaid";

      const status = data.content.Status || 
                    data.content.status || 
                    "ACTIVE";

      const dueDate = data.content.Due_Date || 
                     data.content.dueDate || 
                     data.content.due_date || 
                     null;

      const customerType = data.content.Customer_Type || 
                          data.content.customerType || 
                          data.content.type || 
                          "";

      const canVend = data.content.Can_Vend !== undefined ? 
                      data.content.Can_Vend : 
                      true;

      const arrears = data.content.Arrears || 
                     data.content.arrears || 
                     data.content.outstanding || 
                     0;

      const minimumAmount = data.content.Minimum_Amount || 
                           data.content.minimumAmount || 
                           data.content.min_amount || 
                           100;

      // Determine if customer is valid
      const isValid = customerName && customerName !== "Unknown Customer" && customerName !== "";

      console.log(`✅ [MOBILE VERIFY METER] Customer verified: ${customerName} (${meterNumberFromResponse})`);

      return NextResponse.json({
        success: true,
        data: {
          customerName: customerName,
          customerAddress: customerAddress,
          customerPhone: customerPhone,
          meterNumber: meterNumberFromResponse,
          meterType: meterTypeFromResponse,
          status: status,
          dueDate: dueDate,
          customerType: customerType,
          canVend: canVend,
          arrears: arrears,
          minimumAmount: minimumAmount,
          isValid: isValid,
          rawData: data.content,
        },
      });
    } else {
      // Handle error response
      const errorMessage = data.response_description || 
                           data.message || 
                           data.error || 
                           "Meter verification failed. Please check the meter number and try again.";

      console.error(`❌ [MOBILE VERIFY METER] Verification failed: ${errorMessage}`);

      return NextResponse.json({
        success: false,
        error: errorMessage,
        code: data.code || "VERIFICATION_FAILED",
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("❌ [MOBILE VERIFY METER] Error:", error);
    
    // Handle network errors
    if (error.message?.includes("fetch") || error.message?.includes("network")) {
      return NextResponse.json({
        success: false,
        error: "Network error. Please check your internet connection and try again.",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || "Failed to verify meter. Please try again.",
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