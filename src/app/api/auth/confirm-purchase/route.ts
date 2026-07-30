// app/api/auth/confirm-purchase/route.ts
import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcrypt";
import { prisma } from "~/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, pin } = body;

    if (!token || !pin) {
      return NextResponse.json({
        success: false,
        error: "Token and PIN are required",
      }, { status: 400 });
    }

    // ✅ Find transaction with this validation token
    const transaction = await prisma.vtuTransaction.findFirst({
      where: {
        metadata: {
          path: "$.validationToken",
          equals: token,
        },
        status: "PENDING",
      },
    });

    if (!transaction) {
      return NextResponse.json({
        success: false,
        error: "Invalid or expired validation link",
      }, { status: 404 });
    }

    // Check if validation token is expired
    const validationExpiry = transaction.metadata?.validationExpiry;
    if (validationExpiry && new Date(validationExpiry) < new Date()) {
      return NextResponse.json({
        success: false,
        error: "Validation link has expired",
      }, { status: 410 });
    }

    // Get user and verify PIN
    const user = await prisma.user.findUnique({
      where: { id: transaction.userId },
      include: { wallet: true },
    });

    if (!user || !user.pinHash) {
      return NextResponse.json({
        success: false,
        error: "User not found or PIN not set",
      }, { status: 404 });
    }

    // Verify PIN
    const isValidPin = await compare(pin, user.pinHash);
    if (!isValidPin) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pinAttempts: {
            increment: 1,
          },
        },
      });

      const attempts = user.pinAttempts + 1;
      if (attempts >= 5) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            pinLockedUntil: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
        return NextResponse.json({
          success: false,
          error: "Too many failed attempts. Account locked for 15 minutes.",
        }, { status: 403 });
      }

      return NextResponse.json({
        success: false,
        error: `Invalid PIN. ${5 - attempts} attempts remaining.`,
      }, { status: 401 });
    }

    // Reset PIN attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    // ✅ Call the INTERNAL purchase API to complete the purchase
    const apiUrl = `${process.env.NEXTAUTH_URL}/api/internal/electricity/purchase`;
    
    console.log(`📡 [Confirm] Calling internal electricity API`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user.id,
        meterNumber: transaction.meterNumber,
        amount: Number(transaction.amount),
        discoCode: transaction.product,
        meterType: "Prepaid",
        phone: user.phone,
        pin: pin, // ✅ Pass the verified PIN
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ [Confirm] Internal API error:", result);
      
      // Update transaction as failed
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          metadata: {
            ...transaction.metadata,
            error: result.error || "Purchase failed",
            failedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: false,
        error: result.error || "Failed to complete purchase",
      }, { status: 500 });
    }

    // ✅ Extract the VENDOR token from the API response
    const vendorToken = result.data?.token || result.token;
    const transactionId = result.data?.transactionId || result.transactionId;

    // ✅ Update the original transaction with the vendor token
    await prisma.vtuTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "SUCCESS",
        token: vendorToken,
        vendorReference: result.data?.vendorReference,
        deliveredAt: new Date(),
        metadata: {
          ...transaction.metadata,
          pinVerified: true,
          vendorToken: vendorToken,
          completedAt: new Date().toISOString(),
          vendorResponse: result.data,
        },
      },
    });

    // ✅ Send the vendor token to WhatsApp
    await sendTokenToWhatsApp(user.phone, {
      transactionType: transaction.transactionType,
      amount: transaction.amount,
      meterNumber: transaction.meterNumber,
      product: transaction.product,
      token: vendorToken,
      transactionId: transaction.id,
    });

    return NextResponse.json({
      success: true,
      message: "Purchase confirmed successfully!",
      transactionId: transaction.id,
      token: vendorToken, // ✅ Return the vendor token
      serviceType: transaction.transactionType,
      amount: Number(transaction.amount),
      recipient: transaction.phoneNumber || transaction.meterNumber || "N/A",
    });

  } catch (error) {
    console.error("Confirm purchase error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to confirm purchase",
    }, { status: 500 });
  }
}

// ============================================================
// HELPER: Send Token to WhatsApp
// ============================================================

async function sendTokenToWhatsApp(phoneNumber: string, data: any): Promise<void> {
  try {
    let message = "";

    if (data.transactionType === "ELECTRICITY_INSTANT") {
      message = `✅ Electricity Purchase Confirmed! ⚡

📍 Meter: ${data.meterNumber}
📍 DisCo: ${data.product}
💰 Amount: ₦${Number(data.amount).toFixed(2)}
🔑 Your Electricity Token: ${data.token}

🆔 Transaction ID: ${data.transactionId?.substring(0, 10) || 'N/A'}

Please use this token to recharge your meter.
Thank you for using Bilscore! 🎉`;
    } else if (data.transactionType === "AIRTIME") {
      message = `✅ Airtime Purchase Confirmed! 📱

📱 Phone: ${data.phoneNumber}
💰 Amount: ₦${Number(data.amount).toFixed(2)}
📡 Network: ${data.network}
🆔 Transaction ID: ${data.transactionId?.substring(0, 10) || 'N/A'}

Thank you for using Bilscore! 🎉`;
    } else if (data.transactionType === "DATA") {
      message = `✅ Data Purchase Confirmed! 📶

📱 Phone: ${data.phoneNumber}
📶 Plan: ${data.networkPlan}
💰 Amount: ₦${Number(data.amount).toFixed(2)}
📡 Network: ${data.network}
🆔 Transaction ID: ${data.transactionId?.substring(0, 10) || 'N/A'}

Thank you for using Bilscore! 🎉`;
    } else if (data.transactionType === "CABLE_TV") {
      message = `✅ Cable TV Subscription Confirmed! 📺

📺 Decoder: ${data.decoderNumber}
📦 Package: ${data.packageName}
💰 Amount: ₦${Number(data.amount).toFixed(2)}
🆔 Transaction ID: ${data.transactionId?.substring(0, 10) || 'N/A'}

Your subscription has been activated. Enjoy! 🎉`;
    }

    // Send via Twilio
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/twilio/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send WhatsApp message");
    }
  } catch (error) {
    console.error("Error sending token to WhatsApp:", error);
  }
}