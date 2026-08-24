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

    // ✅ FORCE USE SANDBOX FOR NOW
    // In production, you can make this configurable via environment variable
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

    console.log(`[Verify Meter] Environment: ${USE_SANDBOX ? 'Sandbox' : 'Production'}`);
    console.log(`[Verify Meter] API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`[Verify Meter] Secret Key: ${secretKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`[Verify Meter] Public Key: ${publicKey ? '✅ Set' : '❌ Missing'}`);

    // ✅ Check for missing credentials
    if (!apiKey || !secretKey || !publicKey) {
      console.error('[Verify Meter] Missing credentials!');
      return NextResponse.json({
        success: false,
        error: "VTpass credentials are not configured. Please check your environment variables.",
      }, { status: 500 });
    }

    // ✅ Build headers with ALL three keys
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'secret-key': secretKey,
      'public-key': publicKey,
    };

    console.log(`[Verify Meter] Headers:`, Object.keys(headers));

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        serviceID: serviceID,
        billersCode: meterNumber,
        type: meterType || "prepaid",
      }),
      signal: AbortSignal.timeout(15000),
    });

    console.log(`[Verify Meter] Response status: ${response.status}`);

    if (!response.ok) {
      console.error(`[Verify Meter] HTTP ${response.status}: ${response.statusText}`);
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`[Verify Meter] Response code: ${data.code}`);
    
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