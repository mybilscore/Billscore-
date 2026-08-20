// src/app/api/mobile/vendors/cable/verify-decoder/route.ts

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
    console.error("❌ [MOBILE DECODER VERIFY] Token verification failed:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate mobile user
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      console.log("❌ [MOBILE DECODER VERIFY] Authentication failed");
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
        message: "Please login to verify decoder",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`👤 [MOBILE DECODER VERIFY] User authenticated: ${userId}`);

    // 2. Parse request body
    const body = await request.json();
    const { serviceID, smartCardNumber, packageCode } = body;

    // 3. Validate request
    if (!serviceID) {
      return NextResponse.json({
        success: false,
        error: "Service ID is required",
      }, { status: 400 });
    }

    if (!smartCardNumber || smartCardNumber.length < 10) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid smart card number (minimum 10 digits)",
      }, { status: 400 });
    }

    console.log(`📡 [MOBILE DECODER VERIFY] Verifying decoder: ${smartCardNumber} (${serviceID})`);

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

    // 5. Build the verification payload
    const payload: any = {
      serviceID: serviceID,
      billersCode: smartCardNumber,
    };

    // Add type if provided (for DSTV/GOTV/Startimes)
    if (packageCode) {
      payload.type = packageCode;
    }

    console.log(`📦 [MOBILE DECODER VERIFY] Payload:`, payload);

    // 6. Call VTpass API
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey || "",
        "secret-key": secretKey || "",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`❌ [MOBILE DECODER VERIFY] VTpass API error: ${response.status}`);
      return NextResponse.json({
        success: false,
        error: `Failed to verify decoder. Please try again.`,
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`📊 [MOBILE DECODER VERIFY] VTpass response:`, data);

    // 7. Process response
    if (data.code === "000" && data.content) {
      const content = data.content;
      
      const customerName = content.Customer_Name || 
                          content.customerName || 
                          content.name || 
                          "Unknown Customer";
      
      const customerAddress = content.Address || 
                             content.address || 
                             content.customerAddress || 
                             "";
      
      const smartCardNumberFromResponse = content.Smart_Card_Number || 
                                          content.smartCardNumber || 
                                          content.billersCode || 
                                          smartCardNumber;

      const provider = content.Provider || 
                      content.provider || 
                      "";

      const packageName = content.Package_Name || 
                         content.packageName || 
                         content.package || 
                         "";

      const packageCodeFromResponse = content.Package_Code || 
                                      content.packageCode || 
                                      packageCode || 
                                      "";

      const status = content.Status || 
                    content.status || 
                    "ACTIVE";

      const dueDate = content.Due_Date || 
                     content.dueDate || 
                     null;

      const customerType = content.Customer_Type || 
                          content.customerType || 
                          "";

      const canVend = content.Can_Vend !== undefined ? 
                      content.Can_Vend : 
                      true;

      const subscriptionType = content.Subscription_Type || 
                              content.subscriptionType || 
                              "";

      const renewalDate = content.Renewal_Date || 
                         content.renewalDate || 
                         null;

      const isValid = customerName && customerName !== "Unknown Customer" && customerName !== "";

      console.log(`✅ [MOBILE DECODER VERIFY] Decoder verified: ${customerName}`);

      return NextResponse.json({
        success: true,
        data: {
          customerName: customerName,
          customerAddress: customerAddress,
          smartCardNumber: smartCardNumberFromResponse,
          provider: provider,
          packageName: packageName,
          packageCode: packageCodeFromResponse,
          status: status,
          dueDate: dueDate,
          customerType: customerType,
          canVend: canVend,
          subscriptionType: subscriptionType,
          renewalDate: renewalDate,
          isValid: isValid,
        },
      });
    } else {
      const errorMessage = data.response_description || 
                           data.message || 
                           data.error || 
                           "Decoder verification failed. Please check the smart card number and try again.";

      console.error(`❌ [MOBILE DECODER VERIFY] Verification failed: ${errorMessage}`);

      return NextResponse.json({
        success: false,
        error: errorMessage,
        code: data.code || "VERIFICATION_FAILED",
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("❌ [MOBILE DECODER VERIFY] Error:", error);
    
    if (error.message?.includes("fetch") || error.message?.includes("network")) {
      return NextResponse.json({
        success: false,
        error: "Network error. Please check your internet connection and try again.",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || "Failed to verify decoder. Please try again.",
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