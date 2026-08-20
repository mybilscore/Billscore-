// app/api/vendors/electricity/verify-meter/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceID, meterNumber, meterType } = body;

    if (!serviceID || !meterNumber) {
      return NextResponse.json({
        success: false,
        error: "Service ID and meter number are required",
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

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }, { status: response.status });
    }

    const data = await response.json();
    
    if (data.code === "000" && data.content) {
      return NextResponse.json({
        success: true,
        data: {
          customerName: data.content.Customer_Name || data.content.customerName || "Unknown",
          customerAddress: data.content.Address || data.content.address || "",
          meterNumber: data.content.Meter_Number || data.content.meterNumber || meterNumber,
          meterType: data.content.Meter_Type || data.content.meterType || meterType,
          status: data.content.Status || data.content.status || "ACTIVE",
          dueDate: data.content.Due_Date || data.content.dueDate || null,
          customerType: data.content.Customer_Type || data.content.customerType || "",
          canVend: data.content.Can_Vend !== undefined ? data.content.Can_Vend : true,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: data.response_description || data.message || "Meter verification failed",
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("❌ Error verifying meter:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Network error during verification",
    }, { status: 500 });
  }
}