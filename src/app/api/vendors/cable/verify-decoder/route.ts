// app/api/vendors/cable/verify-decoder/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceID, smartCardNumber, packageCode } = body;

    if (!serviceID || !smartCardNumber) {
      return NextResponse.json({
        success: false,
        error: "Service ID and smart card number are required",
      }, { status: 400 });
    }

    // Determine environment
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

    // Build the verification payload
    const payload: any = {
      serviceID: serviceID,
      billersCode: smartCardNumber,
    };

    // Add type if provided (for DSTV/GOTV/Startimes)
    if (packageCode) {
      payload.type = packageCode;
    }

    console.log(`🔍 [CABLE VERIFY] Verifying decoder:`, {
      serviceID,
      smartCardNumber,
      packageCode,
      baseUrl,
    });

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
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }, { status: response.status });
    }

    const data = await response.json();
    
    console.log(`📊 [CABLE VERIFY] Response:`, data);

    if (data.code === "000" && data.content) {
      // Extract customer information from VTpass response
      const content = data.content;
      
      return NextResponse.json({
        success: true,
        data: {
          customerName: content.Customer_Name || content.customerName || content.name || "Unknown",
          customerAddress: content.Address || content.address || "",
          smartCardNumber: content.Smart_Card_Number || content.smartCardNumber || content.billersCode || smartCardNumber,
          provider: content.Provider || content.provider || "",
          packageName: content.Package_Name || content.packageName || "",
          packageCode: content.Package_Code || content.packageCode || packageCode,
          status: content.Status || content.status || "ACTIVE",
          dueDate: content.Due_Date || content.dueDate || null,
          customerType: content.Customer_Type || content.customerType || "",
          canVend: content.Can_Vend !== undefined ? content.Can_Vend : true,
          subscriptionType: content.Subscription_Type || content.subscriptionType || "",
          renewalDate: content.Renewal_Date || content.renewalDate || null,
          meterNumber: content.Meter_Number || content.meterNumber || null,
          disco: content.Disco || content.disco || null,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: data.response_description || data.message || "Decoder verification failed",
        code: data.code,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("❌ Error verifying decoder:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Network error during verification",
    }, { status: 500 });
  }
}