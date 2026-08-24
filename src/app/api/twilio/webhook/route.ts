// app/api/twilio/webhook/route.ts - COMPLETE UPDATED VERSION WITH COMPREHENSIVE ERROR HANDLING

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { hash } from "bcrypt";
import { 
  TransactionStatus, 
  VtuType, 
  ChannelType,
  NetworkProvider,
  CustomerType,
  WalletCategory,
  WalletTransactionType,
  VtuVendor,
  MeterType,
  TokenStatus,
  PreOrderStatus,
  DisCo,
  TokenType,
  DeliveryChannel,
  JobType,
  JobStatus,
  RefundStatus,
} from "@prisma/client";
import { 
  createPalmPayVirtualAccountForUser, 
  isPalmPaySimulationMode 
} from "~/lib/palmpay/palmpay-wallet.service";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { generateQRUrl } from "~/lib/qr-hash";

// ============================================================
// HELPER: Generate Short Validation Token (for link)
// ============================================================

function generateValidationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ============================================================
// GENERATE QR CODE FOR METER
// ============================================================

async function generateMeterQRCode(userId: string, meterNumber: string, disco: string): Promise<string> {
  try {
    const appUrl = getAppUrl();
    const baseUrl = appUrl;
    
    const qrValue = generateQRUrl(baseUrl, {
      identifier: meterNumber,
      type: "electricity",
      provider: disco,
    });
    
    const url = new URL(qrValue);
    const params = new URLSearchParams(url.search);
    const hash = params.get('h');
    const expiresAt = params.get('e');
    
    const qrDisplayLink = `${baseUrl}/qr/display/${meterNumber}?t=electricity&p=${encodeURIComponent(disco)}&h=${hash}${expiresAt ? `&e=${expiresAt}` : ''}`;
    
    return qrDisplayLink;
  } catch (error) {
    console.error("QR code generation error:", error);
    return "";
  }
}

// ============================================================
// XML RESPONSE BUILDER
// ============================================================

function buildTwilioResponse(message: string): string {
  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${escapedMessage}</Message>
</Response>`;
}

// ============================================================
// HELPER: Get Application URL
// ============================================================

function getAppUrl(): string {
  const url = process.env.NEXTAUTH_URL || 
              process.env.NEXT_PUBLIC_APP_URL || 
              process.env.APP_URL ||
              process.env.VERCEL_URL ||
              'https://app.bilscore.com';
  
  const cleanUrl = url.replace(/\/$/, '');
  
  if (url === process.env.VERCEL_URL && !url.startsWith('http')) {
    return `https://${cleanUrl}`;
  }
  
  return cleanUrl;
}

// ============================================================
// HELPER: Get API URL (for internal API calls)
// ============================================================

function getApiUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXTAUTH_URL || 
           process.env.NEXT_PUBLIC_APP_URL || 
           process.env.APP_URL ||
           'https://app.bilscore.com';
  }
  
  return process.env.NEXT_PUBLIC_API_URL || 
         process.env.NEXTAUTH_URL || 
         'http://localhost:3000';
}

// ============================================================
// ✅ FIXED: NETWORK DETECTION - Complete Nigerian prefixes
// ============================================================

function detectNetworkFromPhone(phoneNumber: string): string | null {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  let cleanNumber = phoneNumber.replace(/\D/g, "");
  
  console.log(`[Network Detection] Original: ${phoneNumber}, Cleaned: ${cleanNumber}`);
  
  // Remove country code if present (234)
  if (cleanNumber.startsWith("234")) {
    cleanNumber = cleanNumber.substring(3);
  }
  
  // ✅ IMPORTANT: Keep the leading zero for prefix detection
  if (!cleanNumber.startsWith("0")) {
    if (cleanNumber.length >= 10) {
      cleanNumber = '0' + cleanNumber;
    }
  }
  
  // Ensure we have at least 11 digits for detection (with leading zero)
  if (cleanNumber.length < 11) {
    console.warn(`[Network Detection] Phone number too short: ${cleanNumber}`);
    return null;
  }
  
  // Get the relevant digits for detection (with leading zero preserved)
  const firstFour = cleanNumber.substring(0, 4);
  const firstFive = cleanNumber.substring(0, 5);
  const firstThree = cleanNumber.substring(0, 3);
  
  console.log(`[Network Detection] First 3: ${firstThree}, First 4: ${firstFour}, First 5: ${firstFive}`);
  
  // ============================================================
  // Special: Check first 5 digits for Visafone legacy prefixes
  // ============================================================
  if (firstFive === "07025" || firstFive === "07026") {
    console.log(`[Network Detection] Detected MTN (Visafone) from prefix: ${firstFive}`);
    return "MTN";
  }
  
  // ============================================================
  // MTN - Complete list of prefixes
  // ============================================================
  const mtnPrefixes = [
    '0701', '0703', '0704', '0706', '0801', '0803', '0804', '0806',
    '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916'
  ];
  if (mtnPrefixes.includes(firstFour)) {
    console.log(`[Network Detection] Detected MTN from prefix: ${firstFour}`);
    return "MTN";
  }
  
  // ============================================================
  // AIRTEL - Check first 4 digits
  // ============================================================
  const airtelPrefixes = [
    '0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904',
    '0907', '0911', '0912'
  ];
  if (airtelPrefixes.includes(firstFour)) {
    console.log(`[Network Detection] Detected AIRTEL from prefix: ${firstFour}`);
    return "AIRTEL";
  }
  
  // ============================================================
  // GLO - Check first 4 digits
  // ============================================================
  const gloPrefixes = [
    '0705', '0805', '0807', '0811', '0815', '0905', '0915'
  ];
  if (gloPrefixes.includes(firstFour)) {
    console.log(`[Network Detection] Detected GLO from prefix: ${firstFour}`);
    return "GLO";
  }
  
  // ============================================================
  // 9MOBILE (T2) - Check first 4 digits
  // ============================================================
  const nineMobilePrefixes = [
    '0809', '0817', '0818', '0908', '0909'
  ];
  if (nineMobilePrefixes.includes(firstFour)) {
    console.log(`[Network Detection] Detected 9MOBILE from prefix: ${firstFour}`);
    return "9MOBILE";
  }
  
  // ============================================================
  // Fallback: Check first 3 digits for older/ambiguous prefixes
  // ============================================================
  if (firstThree === "070" || firstThree === "080" || firstThree === "081" ||
      firstThree === "090" || firstThree === "091") {
    console.log(`[Network Detection] Defaulting to MTN from prefix: ${firstThree}`);
    return "MTN";
  }
  
  console.warn(`[Network Detection] Unknown network for phone: ${phoneNumber} (cleaned: ${cleanNumber})`);
  return null;
}

// ============================================================
// ✅ FIXED: NORMALIZE PHONE NUMBER - Keep leading zero
// ============================================================

function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return "";
  
  // Remove all non-digit characters
  let clean = phoneNumber.replace(/\D/g, '');
  
  console.log(`[Normalize] Original: ${phoneNumber}, Cleaned: ${clean}`);
  
  // Remove country code if present (234)
  if (clean.startsWith('234')) {
    clean = clean.substring(3);
  }
  
  // ✅ Ensure we have a leading zero (for 11-digit format)
  if (!clean.startsWith('0')) {
    if (clean.length === 10) {
      clean = '0' + clean;
    } else if (clean.length > 10) {
      clean = '0' + clean.substring(clean.length - 10);
    } else if (clean.length < 10) {
      clean = '0' + clean.padStart(10, '0');
    }
  }
  
  // Ensure we have exactly 11 digits with leading zero
  if (clean.length > 11) {
    clean = clean.substring(0, 11);
  }
  
  console.log(`[Normalize] Result: ${clean}`);
  return clean;
}

// ============================================================
// ✅ COMPLETE ERROR FORMATTING - All possible errors
// ============================================================

function formatErrorMessage(error: any, accountInfo?: { accountNumber?: string, accountName?: string }): string {
  // ============================================================
  // STEP 1: Extract all possible error details
  // ============================================================
  
  let errorMessage = '';
  let errorCode = '';
  let errorDetails: any = {};
  
  // Extract from various error sources
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error) {
    // Standard error properties
    errorMessage = error?.message || error?.error || error?.response_description || error?.statusText || '';
    errorCode = error?.code || error?.status || error?.response_code || '';
    errorDetails = error?.details || error?.data || error?.content || error?.metadata || {};
    
    // Vendor response
    if (error?.vendorResponse) {
      const vResp = error.vendorResponse;
      errorMessage = vResp?.response_description || vResp?.message || errorMessage;
      errorCode = vResp?.code || errorCode;
      errorDetails = vResp?.content || vResp?.data || errorDetails;
    }
    
    // Vendor errors array
    if (error?.vendorErrors && Array.isArray(error.vendorErrors) && error.vendorErrors.length > 0) {
      const lastError = error.vendorErrors[error.vendorErrors.length - 1];
      if (lastError) {
        errorMessage = lastError.message || lastError.error || errorMessage;
        errorCode = lastError.code || lastError.status || errorCode;
        errorDetails = lastError.details || lastError.data || errorDetails;
      }
    }
    
    // Prisma errors
    if (error?.meta) {
      errorDetails = { ...errorDetails, ...error.meta };
    }
    
    // HTTP errors
    if (error?.response) {
      const resp = error.response;
      errorMessage = resp?.statusText || resp?.data?.message || errorMessage;
      errorCode = resp?.status || resp?.statusCode || errorCode;
    }
  }
  
  // If no message found, use a default
  if (!errorMessage || errorMessage === '') {
    errorMessage = 'An unknown error occurred';
  }
  
  // Clean up the message
  errorMessage = errorMessage.replace(/^Error:\s*/, '').trim();
  
  console.log(`[Error Format] Message: ${errorMessage}, Code: ${errorCode}`);
  console.log(`[Error Format] Details:`, JSON.stringify(errorDetails, null, 2));
  
  // ============================================================
  // STEP 2: Check environment (sandbox/production)
  // ============================================================
  
  const isSandbox = process.env.NODE_ENV !== 'production' || 
                    process.env.VTPASS_ENVIRONMENT === 'sandbox' ||
                    process.env.SANDBOX_MODE === 'true' ||
                    process.env.NODE_ENV === 'development';
  
  // ============================================================
  // STEP 3: Build user-friendly error messages
  // ============================================================
  
  // --- VTPASS Specific Error Codes ---
  
  if (errorCode === '000' || errorMessage.includes('success') || errorMessage.includes('Successful')) {
    return `✅ Transaction successful! ${errorMessage}`;
  }
  
  if (errorCode === '016' || errorMessage.includes('016') || 
      errorMessage.toUpperCase().includes('TRANSACTION FAILED') ||
      errorMessage.toUpperCase().includes('FAILED')) {
    if (isSandbox) {
      return `⚠️ SANDBOX MODE: Transaction simulation failed.

Error: ${errorMessage}
Code: ${errorCode}

💡 This is expected in test mode.
Your wallet balance was NOT debited.

💡 Try buying airtime for your own number:
AIRTIME 100

For production, this would be a real transaction.`;
    }
    return `❌ Transaction Failed

${errorMessage}

Possible reasons:
• Insufficient vendor balance
• Invalid phone number or meter number
• Network issues with the service provider
• Service temporarily unavailable

Please try again or contact support.
Reference: ${errorCode}`;
  }
  
  if (errorCode === '015' || errorMessage.toUpperCase().includes('DUPLICATE') || 
      errorMessage.toUpperCase().includes('ALREADY PROCESSED')) {
    return `⚠️ Duplicate Transaction Detected

This transaction appears to have been processed already.
Please wait a moment and try again.

If you think this is a mistake, contact support with:
Reference: ${errorCode}`;
  }
  
  if (errorCode === '009' || errorMessage.toUpperCase().includes('INSUFFICIENT') || 
      errorMessage.toUpperCase().includes('INSUFFICIENT BALANCE')) {
    const accountInfoStr = accountInfo?.accountNumber ? `\nYour Account: ${accountInfo.accountNumber}` : '';
    return `❌ Insufficient Balance

The service provider has insufficient balance to complete this transaction.
${accountInfoStr}

Please try again later or contact support.
Reference: ${errorCode}`;
  }
  
  if (errorCode === '012' || errorMessage.toUpperCase().includes('UNAVAILABLE') || 
      errorMessage.toUpperCase().includes('SERVICE UNAVAILABLE')) {
    return `⚠️ Service Unavailable

The service is currently unavailable.
Please try again in a few minutes.

Reference: ${errorCode}`;
  }
  
  if (errorCode === '013' || errorMessage.toUpperCase().includes('INVALID PHONE') || 
      errorMessage.toUpperCase().includes('INVALID PHONE NUMBER')) {
    return `❌ Invalid Phone Number

The phone number you entered is invalid.
Please check and try again.

Format: 08012345678 or +2348012345678
Example: AIRTIME 08012345678 500

Reference: ${errorCode}`;
  }
  
  if (errorCode === '014' || errorMessage.toUpperCase().includes('INVALID AMOUNT') || 
      errorMessage.toUpperCase().includes('AMOUNT')) {
    return `❌ Invalid Amount

The amount you entered is invalid.
Please check and try again.

Airtime: NGN 50 - NGN 50,000
Data: Check available plans with PLANS
Electricity: Minimum NGN 1,000

Reference: ${errorCode}`;
  }
  
  if (errorCode === '017' || errorMessage.toUpperCase().includes('INVALID SERVICE') || 
      errorMessage.toUpperCase().includes('SERVICE NOT FOUND')) {
    return `❌ Invalid Service

The service you requested is not available.
Please check your request and try again.

Available services:
• AIRTIME [amount] - Buy airtime
• DATA [plan] - Buy data
• ELECTRIC [meter] [disco] [amount] - Buy electricity
• CABLE [index] [package] - Cable TV subscription

Reference: ${errorCode}`;
  }
  
  // --- All Vendors Failed ---
  
  if (errorMessage.toLowerCase().includes('all vendors failed') || 
      errorMessage.toLowerCase().includes('all providers failed') ||
      errorMessage.toLowerCase().includes('no vendor available')) {
    if (isSandbox) {
      return `⚠️ SANDBOX MODE: All Service Providers Failed

All available vendors failed to process this transaction.
This is expected in test mode.

💡 Vendors in sandbox:
• VTPASS (simulation mode)
• BILAL_SADA (simulation mode)
• LEGITDATAWAY (simulation mode)

Your wallet was NOT debited.
Try: AIRTIME 100 (for your own number)

Error: ${errorMessage}`;
    }
    return `❌ All Service Providers Unavailable

None of our service providers could process your request.
This is a temporary issue.

Possible reasons:
• All vendors are experiencing issues
• Network connectivity problems
• System maintenance

Please try again in a few minutes.
Your wallet balance was not debited.

If this persists, contact support.`;
  }
  
  // --- Vendor Doesn't Support Service ---
  
  if (errorMessage.toLowerCase().includes('does not support') || 
      errorMessage.toLowerCase().includes('not support') ||
      errorMessage.toLowerCase().includes('unsupported')) {
    if (isSandbox) {
      return `⚠️ SANDBOX MODE: Service Not Supported

${errorMessage}

💡 This vendor doesn't support this service in sandbox mode.
The system tried other vendors but they may also be unavailable.

Try: AIRTIME 100 (for your own number)`;
    }
    return `⚠️ Service Not Supported

The service provider doesn't support this type of transaction.
Please try a different service or contact support.

Reference: ${errorCode}`;
  }
  
  // --- Network Errors ---
  
  if (errorMessage.toLowerCase().includes('econnrefused') || 
      errorMessage.toLowerCase().includes('enotfound') || 
      errorMessage.toLowerCase().includes('etimedout') || 
      errorMessage.toLowerCase().includes('network') ||
      errorMessage.toLowerCase().includes('connection') ||
      errorMessage.toLowerCase().includes('timeout') ||
      errorMessage.toLowerCase().includes('fetch')) {
    return `⚠️ Network Connection Issue

We're having trouble connecting to the service provider.
Please check your internet connection and try again.

If the problem persists, try again in a few minutes.
Your wallet was not debited.

Reference: ${errorCode || 'Network Error'}`;
  }
  
  // --- Timeout Errors ---
  
  if (errorMessage.toLowerCase().includes('timeout') || 
      errorMessage.toLowerCase().includes('timed out')) {
    return `⏱️ Request Timeout

The service provider is taking too long to respond.
Please try again in a few minutes.

Your wallet was not debited.
Reference: ${errorCode || 'Timeout'}`;
  }
  
  // --- Database Errors ---
  
  if (errorMessage.toLowerCase().includes('database') || 
      errorMessage.toLowerCase().includes('prisma') ||
      errorMessage.toLowerCase().includes('db') ||
      errorMessage.toLowerCase().includes('sequelize')) {
    return `⚠️ System Busy

Our system is currently processing many requests.
Please try again in a moment.

Your transaction is safe and your wallet was not debited.
Reference: ${errorCode || 'DB Error'}`;
  }
  
  // --- Authentication Errors ---
  
  if (errorMessage.toLowerCase().includes('auth') || 
      errorMessage.toLowerCase().includes('unauthorized') ||
      errorMessage.toLowerCase().includes('forbidden') ||
      errorMessage.toLowerCase().includes('permission')) {
    return `❌ Authentication Error

There was a problem with your account authentication.
Please try logging out and logging back in.

If this persists, contact support.
Reference: ${errorCode || 'Auth Error'}`;
  }
  
  // --- Wallet Errors ---
  
  if (errorMessage.toLowerCase().includes('wallet not found') || 
      errorMessage.toLowerCase().includes('no wallet')) {
    return `❌ Wallet Not Found

We couldn't find your wallet.
Please contact support to resolve this issue.

Reference: ${errorCode || 'Wallet Error'}`;
  }
  
  if (errorMessage.toLowerCase().includes('insufficient balance') || 
      errorMessage.toLowerCase().includes('not enough balance') ||
      errorMessage.toLowerCase().includes('low balance')) {
    const accountInfoStr = accountInfo?.accountNumber ? `\nAccount: ${accountInfo.accountNumber}` : '';
    return `❌ Insufficient Balance

You don't have enough balance in your wallet.
${accountInfoStr}

Please fund your wallet and try again.
Check your balance with: BALANCE

Reference: ${errorCode || 'Balance Error'}`;
  }
  
  // --- Phone Number Errors ---
  
  if (errorMessage.toLowerCase().includes('phone') || 
      errorMessage.toLowerCase().includes('number') ||
      errorMessage.toLowerCase().includes('invalid number')) {
    return `❌ Invalid Phone Number

The phone number you entered is invalid.
Please check and try again.

Supported formats:
• 08012345678 (11 digits with leading zero)
• +2348012345678 (with country code)
• 2348012345678 (without leading zero)

Example: AIRTIME 08012345678 500

Reference: ${errorCode || 'Phone Error'}`;
  }
  
  // --- Meter Errors ---
  
  if (errorMessage.toLowerCase().includes('meter')) {
    if (errorMessage.toLowerCase().includes('invalid') || 
        errorMessage.toLowerCase().includes('incorrect')) {
      return `❌ Invalid Meter Number

The meter number you entered is invalid.
Please check and try again.

Format: 11-digit meter number
Example: ELECTRIC 12345678901 ABUJA 5000

Reference: ${errorCode || 'Meter Error'}`;
    }
    if (errorMessage.toLowerCase().includes('not found') || 
        errorMessage.toLowerCase().includes('does not exist')) {
      return `❌ Meter Not Found

We couldn't find this meter in the system.
Please verify the meter number and try again.

If you're sure the number is correct, contact support.
Reference: ${errorCode || 'Meter Error'}`;
    }
    if (errorMessage.toLowerCase().includes('disco') || 
        errorMessage.toLowerCase().includes('distribution')) {
      return `❌ Invalid DisCo

The Distribution Company (DisCo) you entered is invalid.
Please check and try again.

Available DisCos:
IKEJA, EKO, ABUJA, KANO, PHCN, IBADAN, BENIN, ENUGU, JOS, PORTHARCOURT

Example: ELECTRIC 12345678901 ABUJA 5000

Reference: ${errorCode || 'DisCo Error'}`;
    }
    return `❌ Meter Verification Failed

We couldn't verify the meter number.
Please check the number and try again.

Reference: ${errorCode || 'Meter Error'}`;
  }
  
  // --- Decoder Errors ---
  
  if (errorMessage.toLowerCase().includes('decoder') || 
      errorMessage.toLowerCase().includes('smart card')) {
    if (errorMessage.toLowerCase().includes('invalid') || 
        errorMessage.toLowerCase().includes('incorrect')) {
      return `❌ Invalid Decoder Number

The decoder number you entered is invalid.
Please check and try again.

Format: Smart card number (10-12 digits)
Example: CABLE 1234567890 PREMIUM

Reference: ${errorCode || 'Decoder Error'}`;
    }
    if (errorMessage.toLowerCase().includes('not found') || 
        errorMessage.toLowerCase().includes('does not exist')) {
      return `❌ Decoder Not Found

We couldn't find this decoder in the system.
Please verify the smart card number and try again.

Reference: ${errorCode || 'Decoder Error'}`;
    }
    if (errorMessage.toLowerCase().includes('provider') || 
        errorMessage.toLowerCase().includes('package')) {
      return `❌ Invalid Provider or Package

The cable provider or package you selected is invalid.
Please check and try again.

Available providers: DSTV, GOTV, STARTIMES
To see packages: PACKAGES [provider]

Reference: ${errorCode || 'Cable Error'}`;
    }
    return `❌ Decoder Verification Failed

We couldn't verify the decoder.
Please check the smart card number and try again.

Reference: ${errorCode || 'Decoder Error'}`;
  }
  
  // --- Data Plan Errors ---
  
  if (errorMessage.toLowerCase().includes('plan') || 
      errorMessage.toLowerCase().includes('data')) {
    if (errorMessage.toLowerCase().includes('invalid') || 
        errorMessage.toLowerCase().includes('not found')) {
      return `❌ Invalid Data Plan

The data plan you selected is not available.
Please check available plans with: PLANS

Example: DATA 1GB
Example: DATA 08012345678 1GB

Reference: ${errorCode || 'Data Error'}`;
    }
    return `❌ Data Plan Error

We couldn't process your data purchase.
Please check the plan and try again.

To see available plans: PLANS
Reference: ${errorCode || 'Data Error'}`;
  }
  
  // --- Airtime Specific ---
  
  if (errorMessage.toLowerCase().includes('airtime')) {
    return `❌ Airtime Purchase Failed

We couldn't complete your airtime purchase.
Please check the phone number and amount and try again.

Airtime: NGN 50 - NGN 50,000
Example: AIRTIME 500
Example: AIRTIME 08012345678 500

Reference: ${errorCode || 'Airtime Error'}`;
  }
  
  // --- Cable TV Specific ---
  
  if (errorMessage.toLowerCase().includes('cable') || 
      errorMessage.toLowerCase().includes('subscription')) {
    return `❌ Cable Subscription Failed

We couldn't complete your cable subscription.
Please check the decoder number and package and try again.

To see packages: PACKAGES [provider]
Example: CABLE 1 PREMIUM

Reference: ${errorCode || 'Cable Error'}`;
  }
  
  // --- Education Specific ---
  
  if (errorMessage.toLowerCase().includes('education') || 
      errorMessage.toLowerCase().includes('pin') ||
      errorMessage.toLowerCase().includes('waec') ||
      errorMessage.toLowerCase().includes('jamb') ||
      errorMessage.toLowerCase().includes('neco')) {
    return `❌ Education PIN Purchase Failed

We couldn't complete your education PIN purchase.
Please check the product and quantity and try again.

Available: WAEC, JAMB, NECO, WAEC-RESULT
Example: EDU WAEC 2
Example: JAMB 1

Reference: ${errorCode || 'Education Error'}`;
  }
  
  // --- PIN Verification Errors ---
  
  if (errorMessage.toLowerCase().includes('pin') || 
      errorMessage.toLowerCase().includes('verification')) {
    if (errorMessage.toLowerCase().includes('incorrect') || 
        errorMessage.toLowerCase().includes('invalid') ||
        errorMessage.toLowerCase().includes('wrong')) {
      return `❌ Incorrect PIN

The PIN you entered is incorrect.
Please try again.

If you've forgotten your PIN, you can reset it in the app or website.

Reference: ${errorCode || 'PIN Error'}`;
    }
    if (errorMessage.toLowerCase().includes('locked') || 
        errorMessage.toLowerCase().includes('blocked')) {
      return `🔒 PIN Locked

Your PIN has been locked due to too many failed attempts.
Please wait 15 minutes and try again.

To reset your PIN, visit:
${getAppUrl()}/profile

Reference: ${errorCode || 'PIN Locked'}`;
    }
    return `❌ PIN Verification Failed

Please verify your PIN and try again.

Reference: ${errorCode || 'PIN Error'}`;
  }
  
  // --- Minimum Amount Errors ---
  
  if (errorMessage.toLowerCase().includes('minimum') || 
      errorMessage.toLowerCase().includes('below minimum') ||
      errorMessage.toLowerCase().includes('minimum amount')) {
    if (errorMessage.toLowerCase().includes('electricity') || 
        errorMessage.toLowerCase().includes('meter')) {
      return `❌ Minimum Amount: NGN 1,000

Electricity purchase requires a minimum of NGN 1,000.
Please try again with a higher amount.

Example: ELECTRIC 1000

Reference: ${errorCode || 'Min Amount'}`;
    }
    return `❌ Amount Below Minimum

The amount you entered is below the minimum required.
Please check and try again with a higher amount.

Reference: ${errorCode || 'Min Amount'}`;
  }
  
  // --- Maximum Amount Errors ---
  
  if (errorMessage.toLowerCase().includes('maximum') || 
      errorMessage.toLowerCase().includes('above maximum') ||
      errorMessage.toLowerCase().includes('max amount')) {
    return `❌ Amount Exceeds Maximum

The amount you entered exceeds the maximum allowed.
Please check and try again with a lower amount.

Airtime Maximum: NGN 50,000

Reference: ${errorCode || 'Max Amount'}`;
  }
  
  // --- User Not Found ---
  
  if (errorMessage.toLowerCase().includes('user not found') || 
      errorMessage.toLowerCase().includes('no user')) {
    return `❌ User Not Found

We couldn't find your account.
Please register first with:
REG [Full Name] [Email] [Username]

Example: REG John Doe john@email.com johndoe

Reference: ${errorCode || 'User Error'}`;
  }
  
  // --- Registration Errors ---
  
  if (errorMessage.toLowerCase().includes('registration') || 
      errorMessage.toLowerCase().includes('register')) {
    if (errorMessage.toLowerCase().includes('already') || 
        errorMessage.toLowerCase().includes('exists')) {
      return `⚠️ Already Registered

You are already registered with Bilscore!
Type HELP to see available commands.

Reference: ${errorCode || 'Registration Error'}`;
    }
    return `❌ Registration Failed

We couldn't complete your registration.
Please try again or visit:
${getAppUrl()}/auth

Reference: ${errorCode || 'Registration Error'}`;
  }
  
  // --- Sandbox Mode Generic ---
  
  if (isSandbox) {
    return `⚠️ SANDBOX MODE: ${errorMessage.substring(0, 200)}

Code: ${errorCode || 'Unknown'}

💡 This is expected in test mode.
Your wallet was NOT debited.

💡 Try: AIRTIME 100 (for your own number)

If you're testing, this is normal behavior.
In production, this would be a real transaction.`;
  }
  
  // --- Unknown Generic Error ---
  
  return `❌ Transaction Failed

${errorMessage.substring(0, 200)}

Error Code: ${errorCode || 'Unknown'}

Please try again or contact support.
If you need help, type HELP for available commands.

Reference: ${errorCode || 'Unknown Error'}`;
}

// ============================================================
// SEND WHATSAPP MESSAGE VIA TWILIO
// ============================================================

async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  try {
    console.log(`[WhatsApp] Sending message to ${to}`);
    
    const response = await fetch(`${getAppUrl()}/api/twilio/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: to,
        message: message,
      }),
    });

    if (!response.ok) {
      console.error(`[WhatsApp] Failed to send message: ${response.status}`);
      return false;
    }

    console.log(`[WhatsApp] Message sent successfully`);
    return true;
  } catch (error) {
    console.error("[WhatsApp] Error sending message:", error);
    return false;
  }
}

// ============================================================
// MAP VENDOR TO ENUM
// ============================================================

function mapVendorToEnum(vendorCode: string | undefined): VtuVendor | null {
  if (!vendorCode) return null;
  const normalized = vendorCode.toUpperCase();
  const vendorMap: Record<string, VtuVendor> = {
    'VTPASS': VtuVendor.VTPASS,
    'GIDIGITAL': VtuVendor.GIDIGITAL,
    'MONIEPOINT': VtuVendor.MONIEPOINT,
    'FLUTTERWAVE_VTU': VtuVendor.FLUTTERWAVE_VTU,
    'QUICKTELLER': VtuVendor.QUICKTELLER,
    'BILAL_SADA': VtuVendor.BILAL_SADA,
    'LEGITDATAWAY': VtuVendor.VTPASS,
    'BILALSADA': VtuVendor.BILAL_SADA,
  };
  return vendorMap[normalized] || null;
}

// ============================================================
// SAVE METER HELPER (Non-blocking)
// ============================================================

async function saveMeterAsync(userId: string, meterNumber: string, disco: string, meterType: string) {
  try {
    const existing = await prisma.savedMeter.findFirst({
      where: { userId, meterNumber },
    });

    if (!existing) {
      await prisma.savedMeter.create({
        data: {
          userId,
          meterNumber,
          disco: disco.toUpperCase(),
          meterType: meterType || "Prepaid",
          isDefault: false,
        },
      });
      console.log(`[WhatsApp] Meter ${meterNumber} saved automatically`);
    }
  } catch (error) {
    // Non-critical - ignore
    console.warn(`[WhatsApp] Failed to auto-save meter: ${error}`);
  }
}

// ============================================================
// SAVE METER WITH CUSTOMER INFO HELPER
// ============================================================

async function saveMeterWithCustomerInfo(
  userId: string,
  meterNumber: string,
  disco: string,
  meterType: string,
  customerName?: string | null,
  customerAddress?: string | null,
  customerPhone?: string | null,
  customerEmail?: string | null,
  meterStatus?: string | null
): Promise<void> {
  try {
    const existing = await prisma.savedMeter.findFirst({
      where: { userId, meterNumber },
    });

    const data = {
      userId,
      meterNumber,
      disco: disco.toUpperCase(),
      meterType: meterType || "Prepaid",
      customerName: customerName || null,
      customerAddress: customerAddress || null,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      meterStatus: meterStatus || null,
      lastVerified: new Date(),
      isDefault: existing?.isDefault || false,
    };

    if (existing) {
      await prisma.savedMeter.update({
        where: { id: existing.id },
        data: {
          disco: disco.toUpperCase(),
          meterType: meterType || "Prepaid",
          customerName: customerName || existing.customerName,
          customerAddress: customerAddress || existing.customerAddress,
          customerPhone: customerPhone || existing.customerPhone,
          customerEmail: customerEmail || existing.customerEmail,
          meterStatus: meterStatus || existing.meterStatus,
          lastVerified: new Date(),
        },
      });
      console.log(`[WhatsApp] Meter updated with customer info: ${meterNumber}`);
    } else {
      await prisma.savedMeter.create({ data });
      console.log(`[WhatsApp] Meter saved with customer info: ${meterNumber}`);
    }
  } catch (error) {
    console.error(`[WhatsApp] Failed to save meter with customer info:`, error);
  }
}

// ============================================================
// METER VERIFICATION USING API ROUTE (Same as Dashboard)
// ============================================================

async function verifyMeterWithVTpass(serviceID: string, meterNumber: string, meterType: string = "prepaid") {
  try {
    const apiUrl = getApiUrl();
    const url = `${apiUrl}/api/vendors/electricity/verify-meter`;
    
    console.log(`[VTpass] Calling verify-meter API: ${url}`);
    console.log(`[VTpass] Service: ${serviceID}, Meter: ${meterNumber}, Type: ${meterType}`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serviceID: serviceID,
        meterNumber: meterNumber,
        meterType: meterType,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const result = await response.json();
    
    console.log(`[VTpass] API Response:`, result.success ? 'Success' : 'Failed');
    
    if (!response.ok || !result.success) {
      console.error(`[VTpass] Verification failed:`, result.error);
      return {
        success: false,
        error: result.error || "Meter verification failed",
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error: any) {
    console.error('[VTpass] Verification error:', error.message);
    return {
      success: false,
      error: error.message || "Network error",
    };
  }
}

// ============================================================
// MAIN WEBHOOK HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  try {
    console.log(`[Twilio Webhook] Request received`);
    console.log(`  Method: ${request.method}`);
    console.log(`  URL: ${request.url}`);
    console.log(`  Content-Type: ${request.headers.get('content-type')}`);
    
    let body = "";
    let from = "";
    let to = "";
    let messageSid = "";
    let accountSid = "";
    let numMedia = "0";
    
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      console.log(`[Twilio] Processing form-urlencoded data`);
      const text = await request.text();
      console.log(`[Twilio] Raw body: ${text}`);
      const params = new URLSearchParams(text);
      
      for (const [key, value] of params.entries()) {
        console.log(`  ${key}: ${value}`);
        if (key === "Body") body = value;
        if (key === "From") from = value;
        if (key === "To") to = value;
        if (key === "MessageSid") messageSid = value;
        if (key === "AccountSid") accountSid = value;
        if (key === "NumMedia") numMedia = value;
      }
    } else if (contentType.includes('application/json')) {
      console.log(`[Twilio] Processing JSON data`);
      const jsonBody = await request.json();
      console.log(`[Twilio] JSON Body:`, jsonBody);
      
      body = jsonBody.Body || jsonBody.body || "";
      from = jsonBody.From || jsonBody.from || "";
      to = jsonBody.To || jsonBody.to || "";
      messageSid = jsonBody.MessageSid || jsonBody.messageSid || "";
      accountSid = jsonBody.AccountSid || jsonBody.accountSid || "";
      numMedia = jsonBody.NumMedia || jsonBody.numMedia || "0";
    } else {
      console.log(`[Twilio] Processing as formData`);
      const formData = await request.formData();
      
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
        if (key === "Body") body = value.toString();
        if (key === "From") from = value.toString();
        if (key === "To") to = value.toString();
        if (key === "MessageSid") messageSid = value.toString();
        if (key === "AccountSid") accountSid = value.toString();
        if (key === "NumMedia") numMedia = value.toString();
      }
    }

    const whatsappFrom = from ? from.replace("whatsapp:", "") : "";
    const whatsappTo = to ? to.replace("whatsapp:", "") : "";

    console.log(`[Twilio Webhook] Parsed message:`);
    console.log(`  From: ${whatsappFrom}`);
    console.log(`  To: ${whatsappTo}`);
    console.log(`  Body: "${body}"`);
    console.log(`  MessageSid: ${messageSid}`);
    console.log(`  AccountSid: ${accountSid}`);
    console.log(`  NumMedia: ${numMedia}`);

    if (parseInt(numMedia) > 0) {
      console.log(`[Twilio] Media message received`);
      const mediaResponse = `We received your media. Currently, we only support text messages.

Type HELP to see available commands.`;
      return new NextResponse(buildTwilioResponse(mediaResponse), {
        headers: {
          "Content-Type": "text/xml",
        },
      });
    }

    if (!body || body.trim() === "") {
      console.log(`[Twilio Webhook] Empty message body - returning help response`);
      const helpResponse = `Welcome to Bilscore!

To get started, reply with:
HELP - Show all commands
REG [Full Name] [Email] [Username] - Register

Or visit: ${getAppUrl()}`;
      
      return new NextResponse(buildTwilioResponse(helpResponse), {
        headers: {
          "Content-Type": "text/xml",
        },
      });
    }

    let user = await prisma.user.findFirst({
      where: { phone: whatsappFrom },
      include: { wallet: true },
    });

    let responseMessage = "";

    if (!user) {
      const upperBody = body.toUpperCase().trim();
      
      if (upperBody.startsWith("REG") || upperBody === "REGISTER" || upperBody === "SIGNUP" || upperBody === "JOIN") {
        responseMessage = await handleUserRegistration(whatsappFrom, body);
      } else {
        responseMessage = `Welcome to Bilscore!

You are not yet registered. To get started, reply with:

REG [Full Name] [Email] [Username]

Example: REG John Doe john@email.com johndoe

If you don't have an email, you can skip it:
REG John Doe - johndoe

Or visit our website to register:
${getAppUrl()}/auth

Reply with REG and your details to create your account!`;
      }

      return new NextResponse(buildTwilioResponse(responseMessage), {
        headers: {
          "Content-Type": "text/xml",
        },
      });
    }

    try {
      await prisma.channel.upsert({
        where: {
          channelIdentifier: whatsappFrom,
        },
        update: {
          userId: user.id,
          lastSeen: new Date(),
          isVerified: true,
          metadata: {
            lastMessage: body,
            lastMessageSid: messageSid,
            status: "ACTIVE",
          },
        },
        create: {
          userId: user.id,
          channelType: ChannelType.WHATSAPP,
          channelIdentifier: whatsappFrom,
          channelUsername: whatsappFrom,
          isVerified: true,
          linkedAt: new Date(),
          lastSeen: new Date(),
          metadata: {
            messageSid,
            body,
            from: whatsappFrom,
            to: whatsappTo,
            status: "ACTIVE",
          },
        },
      });
    } catch (error) {
      console.error("Channel upsert error:", error);
    }

    responseMessage = await processWhatsAppCommand(user, body, whatsappFrom);

    console.log(`[Twilio Webhook] Sending response:`, responseMessage.substring(0, 100) + "...");

    return new NextResponse(buildTwilioResponse(responseMessage), {
      headers: {
        "Content-Type": "text/xml",
      },
    });

  } catch (error) {
    console.error("[Twilio Webhook] Error:", error);
    const errorMessage = formatErrorMessage(error);
    return new NextResponse(buildTwilioResponse(errorMessage), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}

// ============================================================
// USER REGISTRATION HANDLER
// ============================================================

async function handleUserRegistration(phone: string, body: string): Promise<string> {
  try {
    console.log(`[WhatsApp] Starting registration for: ${phone}`);

    const existingUser = await prisma.user.findFirst({
      where: { phone: phone },
    });

    if (existingUser) {
      return `You are already registered with Bilscore.
Registered name: ${existingUser.fullName}
Wallet Balance: NGN ${Number(existingUser.walletBalance || 0).toFixed(2)}

Type HELP to see available commands.`;
    }

    const parts = body.split(" ").filter(p => p.length > 0);
    const command = parts[0].toUpperCase();
    
    if (command === "REG" || command === "REGISTER" || command === "SIGNUP") {
      if (parts.length < 2) {
        return `Welcome to Bilscore!

To register, please provide your details:
REG [Full Name] [Email] [Username]

Example: REG John Doe john@email.com johndoe

If you don't have an email, you can skip it:
REG John Doe - johndoe

Or visit: ${getAppUrl()}/auth`;
      }

      let fullName = "";
      let email = "";
      let username = "";
      
      if (parts.length >= 2) {
        const nameParts: string[] = [];
        let emailIndex = -1;
        let usernameIndex = -1;
        
        for (let i = 1; i < parts.length; i++) {
          if (parts[i].includes('@')) {
            emailIndex = i;
            break;
          }
        }
        
        if (parts.length > 1) {
          usernameIndex = parts.length - 1;
          if (parts[usernameIndex] === '-') {
            usernameIndex = parts.length - 2;
          }
          if (emailIndex === parts.length - 1) {
            usernameIndex = parts.length - 2;
          }
        }
        
        const nameEnd = emailIndex > 0 ? emailIndex : (usernameIndex > 0 ? usernameIndex : parts.length);
        for (let i = 1; i < nameEnd; i++) {
          if (parts[i] !== '-') {
            nameParts.push(parts[i]);
          }
        }
        fullName = nameParts.join(' ');
        
        if (emailIndex > 0 && parts[emailIndex] && parts[emailIndex].includes('@')) {
          email = parts[emailIndex];
        }
        
        if (usernameIndex > 0 && usernameIndex < parts.length) {
          const candidate = parts[usernameIndex];
          if (candidate !== '-' && !candidate.includes('@')) {
            username = candidate;
          }
        }
      }

      if (!fullName || fullName.trim().length < 2) {
        return `Please provide your full name.
Format: REG [Full Name] [Email] [Username]

Example: REG John Doe john@email.com johndoe
Example: REG John Doe - johndoe (skip email)`;
      }

      if (!username) {
        const base = fullName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 20);
        username = base || `user${Math.random().toString(36).substring(2, 8)}`;
        
        const existingUsername = await prisma.user.findUnique({
          where: { username: username },
        });
        if (existingUsername) {
          username = `${base}${Math.random().toString(36).substring(2, 6)}`;
        }
      }

      username = username.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '');
      if (!email) {
        email = `${username}@whatsapp.bilscore.com`;
      }

      const defaultPassword = `BIL${Math.random().toString(36).substring(2, 10).toUpperCase()}!`;
      const defaultPin = "1234";
      const changeToken = generateValidationToken();
      const changeTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const hashedPassword = await hash(defaultPassword, 10);
      const hashedPin = await hash(defaultPin, 10);
      const referralCode = `BIL${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const user = await prisma.user.create({
        data: {
          username: username,
          email: email,
          phone: phone,
          fullName: fullName.trim(),
          passwordHash: hashedPassword,
          pinHash: hashedPin,
          role: "END_USER",
          referralCode: referralCode,
          hasWallet: false,
          isVerified: true,
          isWalletFrozen: false,
          preferredLanguage: "EN",
          pinAttempts: 0,
          kycStatus: "PENDING",
          walletBalance: 0,
        },
      });

      console.log(`[WhatsApp] User created: ${user.id}`);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "WHATSAPP_REGISTRATION",
          entityType: "User",
          entityId: user.id,
          metadata: {
            changeToken: changeToken,
            changeTokenExpiry: changeTokenExpiry.toISOString(),
            defaultPassword: defaultPassword,
            defaultPin: defaultPin,
            registeredAt: new Date().toISOString(),
            phone: phone,
          },
        },
      });

      let wallet: any = null;
      let virtualAccountNo: string | null = null;
      let isSimulation = false;
      let palmpayAccountName: string | null = null;

      try {
        console.log(`Creating PalmPay virtual account for user ${user.id}...`);
        const result = await createPalmPayVirtualAccountForUser(
          user.id,
          {
            fullName: fullName.trim(),
            email: email,
            phone: phone,
            role: "END_USER",
          }
        );
        wallet = result.wallet;
        virtualAccountNo = result.virtualAccount.virtualAccountNo;
        isSimulation = isPalmPaySimulationMode();
        palmpayAccountName = wallet?.accountName || fullName.trim();
      } catch (error: any) {
        console.error('PalmPay creation failed:', error);
        const accountNumber = `BIL${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        palmpayAccountName = fullName.trim();
        wallet = await prisma.wallet.create({
          data: {
            userId: user.id,
            accountNumber: accountNumber,
            bankName: "BILSCORE",
            accountName: user.fullName,
            walletBalance: 0,
            ledgerBalance: 0,
            currency: "NGN",
            isActive: true,
            kycLevel: 1,
          },
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { hasWallet: true },
        });
      }

      const WELCOME_BONUS = parseInt(process.env.WELCOME_BONUS_AMOUNT || '20000');
      if (wallet) {
        const currentBalance = Number(wallet.walletBalance || 0);
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              walletBalance: { increment: WELCOME_BONUS },
              ledgerBalance: { increment: WELCOME_BONUS },
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId: user.id,
              type: "CREDIT",
              amount: WELCOME_BONUS,
              balanceBefore: currentBalance,
              balanceAfter: currentBalance + WELCOME_BONUS,
              reference: `WELCOME_BONUS_${user.id}`,
              description: `Welcome bonus of NGN ${WELCOME_BONUS.toLocaleString()} for joining Bilscore!`,
              status: "SUCCESS",
              category: "SYSTEM",
            },
          }),
        ]);
        await prisma.user.update({
          where: { id: user.id },
          data: { walletBalance: currentBalance + WELCOME_BONUS },
        });
      }

      await prisma.channel.upsert({
        where: { channelIdentifier: phone },
        update: {
          userId: user.id,
          lastSeen: new Date(),
          isVerified: true,
          metadata: {
            registeredVia: "whatsapp",
            registrationDate: new Date().toISOString(),
          },
        },
        create: {
          userId: user.id,
          channelType: ChannelType.WHATSAPP,
          channelIdentifier: phone,
          channelUsername: phone,
          isVerified: true,
          linkedAt: new Date(),
          lastSeen: new Date(),
          metadata: {
            registeredVia: "whatsapp",
            registrationDate: new Date().toISOString(),
          },
        },
      });

      const appUrl = getAppUrl();
      const changeLink = `${appUrl}/auth/update-credentials?token=${changeToken}`;
      const finalBalance = wallet ? Number(wallet.walletBalance) + WELCOME_BONUS : 0;

      return `Welcome ${user.fullName}! Registration successful.

Wallet Info:
Name: ${palmpayAccountName || wallet?.accountName || user.fullName}
Number: ${wallet?.accountNumber || 'N/A'}

Transfer to this account to fund your wallet instantly.

Default Password: ${defaultPassword}
Default PIN: ${defaultPin}

To change your password and PIN:
${changeLink}

This link is valid for 7 days.

Type HELP to see all available commands.

Thank you for choosing Bilscore!`;
    }

    return `Welcome to Bilscore!

To register, please provide your details:
REG [Full Name] [Email] [Username]

Example: REG John Doe john@email.com johndoe

If you don't have an email, you can skip it:
REG John Doe - johndoe

Or visit our website:
${getAppUrl()}/auth`;

  } catch (error) {
    console.error("[WhatsApp] Registration error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// NETWORK MAPPING
// ============================================================

const networkMap: Record<string, NetworkProvider> = {
  'MTN': NetworkProvider.MTN,
  'mtn': NetworkProvider.MTN,
  'GLO': NetworkProvider.GLO,
  'glo': NetworkProvider.GLO,
  'AIRTEL': NetworkProvider.AIRTEL,
  'airtel': NetworkProvider.AIRTEL,
  '9MOBILE': NetworkProvider.NINEMOBILE,
  '9mobile': NetworkProvider.NINEMOBILE,
  'NINEMOBILE': NetworkProvider.NINEMOBILE,
  'ETISALAT': NetworkProvider.NINEMOBILE,
};

function mapNetwork(networkInput: string): NetworkProvider {
  const normalized = networkInput?.trim() || '';
  const mapped = networkMap[normalized];
  if (!mapped) {
    console.warn(`Unknown network: "${networkInput}", defaulting to MTN`);
    return NetworkProvider.MTN;
  }
  return mapped;
}

function mapDiscoCode(discoCode: string | null | undefined): DisCo | null {
  if (!discoCode) return null;
  const discoMap: Record<string, DisCo> = {
    'IKEJA': DisCo.IKEJA,
    'EKO': DisCo.EKO,
    'ABUJA': DisCo.ABUJA,
    'KANO': DisCo.KANO,
    'PHCN': DisCo.PHCN,
    'IBADAN': DisCo.IBADAN,
    'BENIN': DisCo.BENIN,
    'ENUGU': DisCo.ENUGU,
    'JOS': DisCo.JOS,
    'PORT_HARCOURT': DisCo.PORT_HARCOURT,
    'PORTHARCOURT': DisCo.PORT_HARCOURT,
  };
  const normalized = discoCode.toUpperCase().trim();
  return discoMap[normalized] || null;
}

// ============================================================
// FALLBACK FUNCTIONS
// ============================================================

function getFallbackPlans(): string {
  return `Available plans:
MTN: 1GB, 2GB, 5GB, 10GB
GLO: 1GB, 3GB, 5GB
AIRTEL: 1GB, 3GB, 8GB
9MOBILE: 1GB, 2GB, 5GB

Example: DATA 08012345678 1GB`;
}

// ============================================================
// GET AVAILABLE PLANS FOR WHATSAPP
// ============================================================

async function getAvailablePlansForWhatsApp(): Promise<string> {
  try {
    const apiUrl = getApiUrl();
    const url = `${apiUrl}/api/vendors/plans?serviceType=DATA`;
    
    console.log(`[WhatsApp] Fetching plans from: ${url}`);
    
    const response = await fetch(url, {
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Bilscore-WhatsApp/1.0',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[WhatsApp] Failed to fetch plans: ${response.status}`);
      return getFallbackPlans();
    }

    const result = await response.json();
    
    if (result.success && result.data?.plans) {
      const { plans } = result.data;
      let message = "Available plans:\n";
      const groupedPlans: Record<string, string[]> = {};
      
      for (const provider of plans) {
        const networkName = provider.name;
        if (!groupedPlans[networkName]) {
          groupedPlans[networkName] = [];
        }
        for (const category of provider.categories || []) {
          for (const plan of category.plans || []) {
            if (plan.price && plan.price > 0) {
              groupedPlans[networkName].push(plan.data);
            }
          }
        }
      }
      
      for (const [network, planSizes] of Object.entries(groupedPlans)) {
        const uniquePlans = [...new Set(planSizes)];
        message += `${network}: ${uniquePlans.join(', ')}\n`;
      }
      
      return message;
    }

    console.warn(`[WhatsApp] No plans data from API, using fallback`);
    return getFallbackPlans();

  } catch (error) {
    console.error('[WhatsApp] Error fetching plans:', error);
    return getFallbackPlans();
  }
}

// ============================================================
// FIND DATA PLAN FROM VENDOR API
// ============================================================

async function findDataPlanFromVendor(network: string, planQuery: string): Promise<any | null> {
  try {
    const apiUrl = getApiUrl();
    const url = `${apiUrl}/api/vendors/plans?serviceType=DATA&network=${mapNetwork(network)}`;
    
    console.log(`[WhatsApp] Finding plan from: ${url}`);
    
    const response = await fetch(url, {
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Bilscore-WhatsApp/1.0',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[WhatsApp] Failed to fetch plans: ${response.status}`);
      return null;
    }

    const result = await response.json();
    
    if (!result.success || !result.data?.plans) {
      return null;
    }

    const { plans } = result.data;
    const normalizedQuery = planQuery.toLowerCase().trim();
    
    let mbValue = 0;
    const gbMatch = normalizedQuery.match(/(\d+\.?\d*)\s*gb/i);
    const mbMatch = normalizedQuery.match(/(\d+)\s*mb/i);
    if (gbMatch) mbValue = parseFloat(gbMatch[1]) * 1024;
    else if (mbMatch) mbValue = parseFloat(mbMatch[1]);

    let foundPlan = null;
    let closestPlan = null;
    let closestDiff = Infinity;

    for (const provider of plans) {
      if (provider.name.toLowerCase() !== network.toLowerCase()) continue;
      
      for (const category of provider.categories || []) {
        for (const plan of category.plans || []) {
          const planData = plan.data?.toLowerCase() || '';
          
          if (planData === normalizedQuery || 
              planData === `${mbValue}mb` || 
              planData === `${mbValue/1024}gb`) {
            return { ...plan, provider: provider.name };
          }

          if (!foundPlan && (planData.includes(normalizedQuery) || 
              normalizedQuery.includes(planData))) {
            foundPlan = { ...plan, provider: provider.name };
          }

          if (mbValue > 0 && plan.amountMB) {
            const diff = Math.abs(plan.amountMB - mbValue);
            if (diff < closestDiff) {
              closestDiff = diff;
              closestPlan = { ...plan, provider: provider.name };
            }
          }
        }
      }
    }

    return foundPlan || closestPlan || null;

  } catch (error) {
    console.error('[WhatsApp] Error finding data plan:', error);
    return null;
  }
}

// ============================================================
// GET AVAILABLE DISCOS FOR WHATSAPP
// ============================================================

async function getAvailableDiscosForWhatsApp(): Promise<string> {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction 
      ? "https://vtpass.com/api/service-categories"
      : "https://sandbox.vtpass.com/api/service-categories";
    
    const response = await fetch(baseUrl, {
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.response_description === "000" && data.content) {
        const electricityCategory = data.content.find(
          (cat: any) => cat.identifier === "electricity-bill"
        );
        
        if (electricityCategory) {
          const servicesUrl = isProduction
            ? "https://vtpass.com/api/services?identifier=electricity-bill"
            : "https://sandbox.vtpass.com/api/services?identifier=electricity-bill";
          
          const servicesResponse = await fetch(servicesUrl, {
            headers: {
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(5000),
          });

          if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            if (servicesData.response_description === "000" && servicesData.content) {
              let message = "";
              servicesData.content.forEach((service: any) => {
                let code = service.serviceID || "";
                code = code.replace("-electric", "").toUpperCase();
                let name = service.name || "";
                name = name.replace(" Payment", "").replace(" Distribution Company", "").replace("Electricity", "").trim();
                if (code && code.length > 1) {
                  message += `   ${code} - ${name}\n`;
                }
              });
              if (message) return message;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error fetching DisCos:", error);
  }

  return `   IKEJA - Ikeja Electric
   EKO - Eko Electric
   ABUJA - Abuja Electric
   KANO - Kano Electric
   IBADAN - Ibadan Electric
   BENIN - Benin Electric
   ENUGU - Enugu Electric
   JOS - Jos Electric
   PORTHARCOURT - Port Harcourt Electric
   KADUNA - Kaduna Electric`;
}

// ============================================================
// GET AVAILABLE PACKAGES FOR WHATSAPP
// ============================================================

async function getAvailablePackagesForWhatsApp(provider: string = "DSTV"): Promise<string> {
  try {
    const serviceMap: Record<string, string> = {
      'DSTV': 'dstv', 'dstv': 'dstv',
      'GOTV': 'gotv', 'gotv': 'gotv',
      'STARTIMES': 'startimes', 'startimes': 'startimes',
    };

    const serviceId = serviceMap[provider] || 'dstv';
    const providerDisplayName = provider.toUpperCase();

    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction 
      ? "https://vtpass.com/api/service-variations"
      : "https://sandbox.vtpass.com/api/service-variations";
    
    const response = await fetch(`${baseUrl}?serviceID=${serviceId}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.response_description === "000" && data.content?.variations) {
        const packages = data.content.variations
          .filter((v: any) => parseFloat(v.variation_amount) > 0)
          .map((v: any) => ({
            name: v.name || "",
            price: parseFloat(v.variation_amount) || 0,
            code: v.variation_code || "",
          }))
          .sort((a: any, b: any) => a.price - b.price);

        if (packages.length > 0) {
          let message = `${providerDisplayName} Packages:\n\n`;
          packages.forEach((pkg: any) => {
            message += `   ${pkg.code} - ${pkg.name}\n`;
            message += `   Price: NGN ${pkg.price.toFixed(2)}\n\n`;
          });
          message += `To subscribe: CABLE [decoder_index] [package_code]\n`;
          message += `Example: CABLE 1 ${packages[0]?.code || 'PREMIUM'}`;
          return message;
        }
      }
    }
  } catch (error) {
    console.error("Error fetching packages:", error);
  }

  const fallbackPackages: Record<string, any[]> = {
    'DSTV': [
      { code: 'PREMIUM', name: 'Premium', price: 15000 },
      { code: 'COMPACT', name: 'Compact', price: 10000 },
      { code: 'FAMILY', name: 'Family', price: 5000 },
    ],
    'GOTV': [
      { code: 'MAX', name: 'Max', price: 8000 },
      { code: 'PLUS', name: 'Plus', price: 5000 },
      { code: 'LITE', name: 'Lite', price: 3000 },
    ],
    'STARTIMES': [
      { code: 'BASIC', name: 'Basic', price: 2500 },
      { code: 'STANDARD', name: 'Standard', price: 4500 },
      { code: 'PREMIUM', name: 'Premium', price: 7000 },
    ],
  };

  const providerPackages = fallbackPackages[provider.toUpperCase()] || fallbackPackages['DSTV'];
  let message = `${provider.toUpperCase()} Packages (Fallback):\n\n`;
  providerPackages.forEach((pkg: any) => {
    message += `   ${pkg.code} - ${pkg.name}\n`;
    message += `   Price: NGN ${pkg.price.toFixed(2)}\n\n`;
  });
  message += `To subscribe: CABLE [decoder_index] [package_code]\n`;
  message += `Example: CABLE 1 ${providerPackages[0]?.code || 'PREMIUM'}`;
  return message;
}

// ============================================================
// GET AVAILABLE EDUCATION PRODUCTS
// ============================================================

async function getAvailableEducationProducts(): Promise<string> {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction 
      ? "https://vtpass.com/api/service-categories"
      : "https://sandbox.vtpass.com/api/service-categories";
    
    const response = await fetch(baseUrl, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.response_description === "000" && data.content) {
        const educationCategory = data.content.find(
          (cat: any) => cat.identifier === "education"
        );
        
        if (educationCategory) {
          const servicesUrl = isProduction
            ? "https://vtpass.com/api/services?identifier=education"
            : "https://sandbox.vtpass.com/api/services?identifier=education";
          
          const servicesResponse = await fetch(servicesUrl, {
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000),
          });

          if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            if (servicesData.response_description === "000" && servicesData.content) {
              let message = "Available Education Services:\n\n";
              let hasProducts = false;
              for (const service of servicesData.content) {
                const name = service.name || service.serviceID || "";
                const serviceId = service.serviceID || "";
                if (!name || !serviceId) continue;
                let displayName = name;
                if (name.includes("WAEC")) displayName = "WAEC";
                else if (name.includes("JAMB")) displayName = "JAMB";
                else if (name.includes("NECO")) displayName = "NECO";
                else if (name.includes("Result")) displayName = "WAEC-RESULT";
                else continue;
                message += `   ${displayName} - ${name}\n`;
                hasProducts = true;
              }
              if (hasProducts) return message;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error fetching education products:", error);
  }

  return `   WAEC - WAEC Registration
   WAEC-RESULT - WAEC Result Checker
   JAMB - JAMB PIN
   NECO - NECO Registration`;
}

// ============================================================
// VERIFY DECODER WITH VTPASS
// ============================================================

async function verifyDecoderWithVTpass(serviceID: string, smartCardNumber: string) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction 
      ? "https://vtpass.com/api/merchant-verify"
      : "https://sandbox.vtpass.com/api/merchant-verify";
    
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
        billersCode: smartCardNumber,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    if (data.code === "000" && data.content) {
      return {
        success: true,
        data: {
          customerName: data.content.Customer_Name || data.content.customerName || "Unknown",
          customerAddress: data.content.Address || data.content.address || "",
          smartCardNumber: data.content.Smart_Card_Number || data.content.smartCardNumber || smartCardNumber,
          provider: data.content.Provider || data.content.provider || "",
          status: data.content.Status || data.content.status || "ACTIVE",
        },
      };
    }
    return { success: false, error: data.response_description || "Decoder verification failed" };
  } catch (error: any) {
    return { success: false, error: error.message || "Network error" };
  }
}

// ============================================================
// ADD METER WITH VERIFICATION AND QR CODE
// ============================================================

async function addMeterWithVerificationAndQR(userId: string, meterNumber: string, disco: string, name: string): Promise<string> {
  try {
    const validDiscos = ["IKEJA", "EKO", "ABUJA", "KANO", "PHCN", "IBADAN", "BENIN", "ENUGU", "JOS", "PORTHARCOURT", "KADUNA"];
    const discoUpper = disco.toUpperCase();
    if (!validDiscos.includes(discoUpper)) {
      return `Invalid DisCo. Available: ${validDiscos.join(", ")}`;
    }

    const serviceIDMap: Record<string, string> = {
      "IKEJA": "ikeja-electric",
      "EKO": "eko-electric",
      "ABUJA": "abuja-electric",
      "KANO": "kano-electric",
      "IBADAN": "ibadan-electric",
      "BENIN": "benin-electric",
      "ENUGU": "enugu-electric",
      "JOS": "jos-electric",
      "PORTHARCOURT": "portharcourt-electric",
      "KADUNA": "kaduna-electric",
      "PHCN": "phcn-electric",
    };
    const serviceID = serviceIDMap[discoUpper] || discoUpper.toLowerCase() + "-electric";

    const verificationResult = await verifyMeterWithVTpass(serviceID, meterNumber, "prepaid");
    
    let verificationMessage = "";
    let customerName = null;
    let customerAddress = null;
    let customerPhone = null;
    let customerEmail = null;
    let meterStatus = null;
    
    if (verificationResult.success) {
      customerName = verificationResult.data?.customerName || null;
      customerAddress = verificationResult.data?.customerAddress || null;
      customerPhone = verificationResult.data?.customerPhone || null;
      customerEmail = verificationResult.data?.customerEmail || null;
      meterStatus = verificationResult.data?.status || null;
      
      verificationMessage = `
✅ Meter Verified!
Customer: ${customerName || "Unknown"}
Meter: ${verificationResult.data?.meterNumber || meterNumber}
Status: ${meterStatus || "ACTIVE"}`;
    } else {
      verificationMessage = `
⚠️ Could not verify meter: ${verificationResult.error || "Unknown error"}
You can still save the meter.`;
    }

    const existing = await prisma.savedMeter.findFirst({
      where: { userId: userId, meterNumber: meterNumber },
    });

    if (existing) {
      await prisma.savedMeter.update({
        where: { id: existing.id },
        data: { 
          disco: discoUpper, 
          name: name || existing.name,
          customerName: customerName || existing.customerName,
          customerAddress: customerAddress || existing.customerAddress,
          customerPhone: customerPhone || existing.customerPhone,
          customerEmail: customerEmail || existing.customerEmail,
          meterStatus: meterStatus || existing.meterStatus,
          lastVerified: verificationResult.success ? new Date() : existing.lastVerified,
          updatedAt: new Date(),
        },
      });
      
      const qrLink = await generateMeterQRCode(userId, meterNumber, discoUpper);
      
      return `✅ Meter updated successfully!${verificationMessage}

📋 Meter Details:
Meter: ${meterNumber}
DisCo: ${discoUpper}
Name: ${name || existing.name}
${customerName ? `👤 Customer: ${customerName}` : ''}
${customerAddress ? `📍 Address: ${customerAddress}` : ''}
${customerPhone ? `📞 Phone: ${customerPhone}` : ''}
${customerEmail ? `✉️ Email: ${customerEmail}` : ''}

📱 Quick Buy QR Code:
${qrLink}

Scan this QR code to quickly buy electricity for this meter.
You can also find this QR code in your saved meters.

Type ELECTRIC to see all your meters and buy power!`;
    }

    await prisma.savedMeter.create({
      data: {
        userId: userId,
        meterNumber: meterNumber,
        disco: discoUpper,
        name: name || `${discoUpper} Meter`,
        meterType: "Prepaid",
        isDefault: false,
        customerName: customerName || null,
        customerAddress: customerAddress || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        meterStatus: meterStatus || null,
        lastVerified: verificationResult.success ? new Date() : null,
      },
    });

    const qrLink = await generateMeterQRCode(userId, meterNumber, discoUpper);

    return `✅ Meter added successfully!${verificationMessage}

📋 Meter Details:
Meter: ${meterNumber}
DisCo: ${discoUpper}
Name: ${name || `${discoUpper} Meter`}
${customerName ? `👤 Customer: ${customerName}` : ''}
${customerAddress ? `📍 Address: ${customerAddress}` : ''}
${customerPhone ? `📞 Phone: ${customerPhone}` : ''}
${customerEmail ? `✉️ Email: ${customerEmail}` : ''}

📱 Quick Buy QR Code:
${qrLink}

Scan this QR code to quickly buy electricity for this meter.
You can also find this QR code in your saved meters.

Type ELECTRIC to see all your meters and buy power!`;
  } catch (error) {
    console.error("Add meter error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// ADD DECODER WITH VERIFICATION
// ============================================================

async function addDecoderWithVerification(userId: string, decoderNumber: string, provider: string, name: string): Promise<string> {
  try {
    const validProviders = ["DSTV", "GOTV", "STARTIMES"];
    const providerUpper = provider.toUpperCase();
    if (!validProviders.includes(providerUpper)) {
      return `Invalid provider. Available: ${validProviders.join(", ")}`;
    }

    const serviceMap: Record<string, string> = {
      'DSTV': 'dstv',
      'GOTV': 'gotv',
      'STARTIMES': 'startimes',
    };
    const serviceId = serviceMap[providerUpper] || 'dstv';

    const verificationResult = await verifyDecoderWithVTpass(serviceId, decoderNumber);
    let verificationMessage = "";
    let customerName = null;
    let customerAddress = null;
    let customerPhone = null;
    let customerEmail = null;
    let decoderStatus = null;
    
    if (verificationResult.success) {
      customerName = verificationResult.data?.customerName || null;
      customerAddress = verificationResult.data?.customerAddress || null;
      customerPhone = verificationResult.data?.customerPhone || null;
      customerEmail = verificationResult.data?.customerEmail || null;
      decoderStatus = verificationResult.data?.status || null;
      
      verificationMessage = `
✅ Decoder Verified!
Customer: ${customerName || "Unknown"}
Decoder: ${verificationResult.data?.smartCardNumber || decoderNumber}
Status: ${decoderStatus || "ACTIVE"}`;
    } else {
      verificationMessage = `
⚠️ Could not verify decoder: ${verificationResult.error || "Unknown error"}
You can still save the decoder.`;
    }

    const existing = await prisma.savedDecoder.findFirst({
      where: { userId: userId, decoderNumber: decoderNumber },
    });

    if (existing) {
      await prisma.savedDecoder.update({
        where: { id: existing.id },
        data: { 
          provider: providerUpper, 
          name: name || existing.name,
          customerName: customerName || existing.customerName,
          customerAddress: customerAddress || existing.customerAddress,
          customerPhone: customerPhone || existing.customerPhone,
          customerEmail: customerEmail || existing.customerEmail,
          decoderStatus: decoderStatus || existing.decoderStatus,
          lastVerified: verificationResult.success ? new Date() : existing.lastVerified,
          updatedAt: new Date(),
        },
      });
      return `✅ Decoder updated successfully!${verificationMessage}

📋 Decoder Details:
Decoder: ${decoderNumber}
Provider: ${providerUpper}
Name: ${name || existing.name}
${customerName ? `👤 Customer: ${customerName}` : ''}
${customerAddress ? `📍 Address: ${customerAddress}` : ''}
${customerPhone ? `📞 Phone: ${customerPhone}` : ''}
${customerEmail ? `✉️ Email: ${customerEmail}` : ''}

Type CABLE to see all your decoders and subscribe!`;
    }

    await prisma.savedDecoder.create({
      data: {
        userId: userId,
        decoderNumber: decoderNumber,
        provider: providerUpper,
        name: name || `${providerUpper} Decoder`,
        isDefault: false,
        customerName: customerName || null,
        customerAddress: customerAddress || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        decoderStatus: decoderStatus || null,
        lastVerified: verificationResult.success ? new Date() : null,
      },
    });

    return `✅ Decoder added successfully!${verificationMessage}

📋 Decoder Details:
Decoder: ${decoderNumber}
Provider: ${providerUpper}
Name: ${name || `${providerUpper} Decoder`}
${customerName ? `👤 Customer: ${customerName}` : ''}
${customerAddress ? `📍 Address: ${customerAddress}` : ''}
${customerPhone ? `📞 Phone: ${customerPhone}` : ''}
${customerEmail ? `✉️ Email: ${customerEmail}` : ''}

Type CABLE to see all your decoders and subscribe!`;
  } catch (error) {
    console.error("Add decoder error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// LIST METERS
// ============================================================

async function listMeters(userId: string): Promise<string> {
  const meters = await prisma.savedMeter.findMany({
    where: { userId: userId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  if (meters.length === 0) {
    const discosList = await getAvailableDiscosForWhatsApp();
    return `You have no saved meters.

To add a meter:
ADDMETER [meter_number] [disco_code] [name]

Available DisCos:
${discosList}

Example: ADDMETER 1234567890 ABUJA HOME`;
  }

  let message = "Your Saved Meters:\n\n";
  meters.forEach((meter: any, index: number) => {
    const defaultTag = meter.isDefault ? " (Default)" : "";
    message += `${index + 1}. ${meter.name || meter.meterNumber}${defaultTag}\n`;
    message += `   ${meter.disco}\n`;
    message += `   ${meter.meterNumber}\n`;
    if (meter.customerName) {
      message += `   👤 ${meter.customerName}\n`;
    }
    if (meter.customerAddress) {
      message += `   📍 ${meter.customerAddress}\n`;
    }
    message += `\n`;
  });

  message += `To buy electricity: ELECTRIC [number] [amount]
To delete: DELETEMETER [meter_number]
To set default: SETDEFAULTMETER [meter_number]`;

  return message;
}

// ============================================================
// LIST DECODERS
// ============================================================

async function listDecoders(userId: string): Promise<string> {
  const decoders = await prisma.savedDecoder.findMany({
    where: { userId: userId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  if (decoders.length === 0) {
    return `You have no saved decoders.

To add a decoder:
ADDDECODER [decoder_number] [provider] [name]

Example: ADDDECODER 1234567890 DSTV LIVING_ROOM

Available providers: DSTV, GOTV, STARTIMES`;
  }

  let message = "Your Saved Decoders:\n\n";
  decoders.forEach((decoder: any, index: number) => {
    const defaultTag = decoder.isDefault ? " (Default)" : "";
    message += `${index + 1}. ${decoder.name || decoder.decoderNumber}${defaultTag}\n`;
    message += `   ${decoder.provider}\n`;
    message += `   ${decoder.decoderNumber}\n`;
    if (decoder.customerName) {
      message += `   👤 ${decoder.customerName}\n`;
    }
    if (decoder.customerAddress) {
      message += `   📍 ${decoder.customerAddress}\n`;
    }
    message += `\n`;
  });

  message += `To buy cable: CABLE [decoder_index] [package]
To delete: DELETEDECODER [decoder_number]
To set default: SETDEFAULTDECODER [decoder_number]
To see packages: PACKAGES [provider]`;

  return message;
}

// ============================================================
// DELETE METER
// ============================================================

async function deleteMeter(userId: string, meterNumber: string): Promise<string> {
  try {
    const result = await prisma.savedMeter.deleteMany({
      where: {
        userId: userId,
        meterNumber: meterNumber,
      },
    });

    if (result.count === 0) {
      return `Meter ${meterNumber} not found.`;
    }

    return `Meter ${meterNumber} deleted successfully!`;
  } catch (error) {
    console.error("Delete meter error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// DELETE DECODER
// ============================================================

async function deleteDecoder(userId: string, decoderNumber: string): Promise<string> {
  try {
    const result = await prisma.savedDecoder.deleteMany({
      where: {
        userId: userId,
        decoderNumber: decoderNumber,
      },
    });

    if (result.count === 0) {
      return `Decoder ${decoderNumber} not found.`;
    }

    return `Decoder ${decoderNumber} deleted successfully!`;
  } catch (error) {
    console.error("Delete decoder error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// SET DEFAULT METER
// ============================================================

async function setDefaultMeter(userId: string, meterId: string): Promise<string> {
  try {
    const isIndex = /^\d+$/.test(meterId);
    let meterNumber: string;
    
    if (isIndex) {
      const meters = await prisma.savedMeter.findMany({
        where: { userId: userId },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      const index = parseInt(meterId) - 1;
      if (index < 0 || index >= meters.length) {
        return `Invalid meter selection.`;
      }
      meterNumber = meters[index].meterNumber;
    } else {
      meterNumber = meterId;
    }

    await prisma.savedMeter.updateMany({
      where: {
        userId: userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    await prisma.savedMeter.updateMany({
      where: {
        userId: userId,
        meterNumber: meterNumber,
      },
      data: {
        isDefault: true,
      },
    });

    return `Meter ${meterNumber} set as default!`;
  } catch (error) {
    console.error("Set default meter error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// SET DEFAULT DECODER
// ============================================================

async function setDefaultDecoder(userId: string, decoderId: string): Promise<string> {
  try {
    const isIndex = /^\d+$/.test(decoderId);
    let decoderNumber: string;
    
    if (isIndex) {
      const decoders = await prisma.savedDecoder.findMany({
        where: { userId: userId },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      const index = parseInt(decoderId) - 1;
      if (index < 0 || index >= decoders.length) {
        return `Invalid decoder selection.`;
      }
      decoderNumber = decoders[index].decoderNumber;
    } else {
      decoderNumber = decoderId;
    }

    await prisma.savedDecoder.updateMany({
      where: {
        userId: userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    await prisma.savedDecoder.updateMany({
      where: {
        userId: userId,
        decoderNumber: decoderNumber,
      },
      data: {
        isDefault: true,
      },
    });

    return `Decoder ${decoderNumber} set as default!`;
  } catch (error) {
    console.error("Set default decoder error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// GET SAVED METERS LIST
// ============================================================

async function getSavedMetersList(userId: string): Promise<string> {
  const meters = await prisma.savedMeter.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  if (meters.length === 0) {
    return `No saved meters found. Add one with:
ADDMETER [meter_number] [disco] [name]

Example: ADDMETER 1234567890 ABUJA HOME`;
  }

  let message = "";
  meters.forEach((meter: any, index: number) => {
    const defaultTag = meter.isDefault ? " (Default)" : "";
    message += `${index + 1}. ${meter.name || meter.meterNumber}${defaultTag}\n`;
    message += `   ${meter.disco}\n`;
    message += `   ${meter.meterNumber}\n\n`;
  });

  return message;
}

// ============================================================
// ACTIVE SUBSCRIPTIONS
// ============================================================

async function getActiveSubscriptions(userId: string): Promise<string> {
  try {
    const preOrders = await prisma.preOrder.findMany({
      where: {
        userId: userId,
        status: { in: ["PENDING", "PROCESSING", "PURCHASED"] },
      },
      orderBy: { deliveryDate: "asc" },
    });

    if (preOrders.length === 0) {
      return `You have no active subscriptions.

To schedule electricity token delivery:
SCHEDULE [meter_index] [amount] [days]

Example: SCHEDULE 1 5000 7

To see your saved meters: METERS`;
    }

    let message = "Active Subscriptions:\n\n";
    preOrders.forEach((order: any, index: number) => {
      const statusIcon = order.status === "PURCHASED" ? "DONE" : 
                         order.status === "PROCESSING" ? "PROCESSING" : "SCHEDULED";
      const deliveryDate = new Date(order.deliveryDate).toLocaleDateString();
      message += `${index + 1}. ${statusIcon} ${order.meterNumber}\n`;
      message += `   ${order.disco}\n`;
      message += `   Amount: NGN ${Number(order.amount).toFixed(2)}\n`;
      message += `   Delivery: ${deliveryDate}\n`;
      message += `   Status: ${order.status}\n\n`;
    });

    message += `To cancel: CANCEL [subscription_id]\n`;
    message += `To see subscription ID: SUBSCRIPTIONS`;

    return message;
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// CANCEL SUBSCRIPTION
// ============================================================

async function cancelSubscription(userId: string, subscriptionId: string): Promise<string> {
  try {
    const preOrder = await prisma.preOrder.findFirst({
      where: {
        id: subscriptionId,
        userId: userId,
        status: { in: ["PENDING", "PROCESSING", "PURCHASED"] },
      },
      include: { transaction: true, tokenVault: true },
    });

    if (!preOrder) {
      return `No active subscription found with ID: ${subscriptionId}

To see your active subscriptions: SUBSCRIPTIONS`;
    }

    const deliveryDate = new Date(preOrder.deliveryDate);
    const now = new Date();
    const hoursUntilDelivery = (deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDelivery < 24) {
      return `Cannot cancel subscription within 24 hours of delivery.

Delivery: ${deliveryDate.toLocaleDateString()}
Hours remaining: ${Math.floor(hoursUntilDelivery)} hours

Please contact support for assistance.`;
    }

    await prisma.$transaction([
      prisma.preOrder.update({
        where: { id: preOrder.id },
        data: {
          status: "CANCELLED",
          isCancelled: true,
          cancelledAt: new Date(),
          cancellationReason: "User requested cancellation via WhatsApp",
        },
      }),
      prisma.job.updateMany({
        where: {
          payload: { path: "$.preOrderId", equals: preOrder.id },
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
      }),
      prisma.walletTransaction.updateMany({
        where: {
          reference: `RESERVE_${preOrder.id}`,
          status: "PENDING",
        },
        data: {
          status: "FAILED",
          description: `Cancelled: ${preOrder.meterNumber} subscription`,
        },
      }),
    ]);

    return `Subscription cancelled successfully!

Meter: ${preOrder.meterNumber}
DisCo: ${preOrder.disco}
Amount: NGN ${Number(preOrder.amount).toFixed(2)}
Delivery: ${deliveryDate.toLocaleDateString()}

Your funds have been released back to your wallet.

To create a new subscription: SCHEDULE [meter_index] [amount] [days]`;
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// DIRECT PURCHASE HANDLERS (NO PIN REQUIRED - OWN NUMBER/METER)
// ============================================================

async function processAirtimePurchaseDirect(
  user: any, 
  phoneNumber: string, 
  amount: number,
  detectedNetwork: string
): Promise<string> {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return formatErrorMessage({ message: "Wallet not found. Please contact support." });
    }

    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `❌ Insufficient Balance

You have NGN ${walletBalance.toFixed(2)}
Need NGN ${amount.toFixed(2)}
Account: ${wallet.accountNumber || 'N/A'}

Please fund your wallet and try again.
Check balance with: BALANCE`;
    }

    const networkEnum = mapNetwork(detectedNetwork);

    let customer = await prisma.customer.findUnique({
      where: { userId_phone: { userId: user.id, phone: phoneNumber } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId: user.id,
          phone: phoneNumber,
          fullName: null,
          email: null,
          customerType: "REGULAR",
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        },
      });
    }

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.AIRTIME,
        product: detectedNetwork,
        amount: amount,
        totalDebited: 0,
        phoneNumber: phoneNumber,
        network: networkEnum,
        status: TransactionStatus.PENDING,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "WhatsApp",
          service: "AIRTIME",
          timestamp: new Date().toISOString(),
          network: detectedNetwork,
          networkEnum: networkEnum,
          customerId: customer.id,
          pinVerified: true,
          skipPin: true,
          isOwnNumber: true,
        },
      },
    });

    try {
      const vendorService = getVendorService();
      const result = await vendorService.buyAirtime(
        {
          phoneNumber: phoneNumber,
          amount: amount,
          network: detectedNetwork,
        },
        user.id
      );

      if (!result || !result.success) {
        const errorDetails = {
          message: result?.error || result?.response_description || "Vendor purchase failed",
          code: result?.code || result?.response_description || '',
          amount: amount,
          phoneNumber: phoneNumber,
          network: detectedNetwork,
          vendorResponse: result,
          vendorErrors: result?.vendorErrors || [],
          allVendorsFailed: result?.allVendorsFailed || false,
        };
        
        console.error(`[AIRTIME] Vendor failed:`, JSON.stringify(errorDetails, null, 2));
        
        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            metadata: {
              ...transaction.metadata,
              failureReason: errorDetails.message,
              errorCode: errorDetails.code,
              vendorResponse: result,
              vendorErrors: result?.vendorErrors || [],
              allVendorsFailed: result?.allVendorsFailed || false,
              failedAt: new Date().toISOString(),
            },
          },
        });
        
        return formatErrorMessage(errorDetails, { 
          accountNumber: wallet.accountNumber,
          accountName: wallet.accountName 
        });
      }

      const token = result.data?.token || result.data?.purchased_code || null;
      const vendorReference = result.vendorReference || null;

      await prisma.$transaction([
        prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            walletBalance: { decrement: amount },
          },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: user.id,
            type: "DEBIT",
            amount: amount,
            balanceBefore: walletBalance,
            balanceAfter: walletBalance - amount,
            reference: `VTU_${transaction.id}`,
            description: `Airtime purchase for ${phoneNumber}`,
            status: "SUCCESS",
            category: "AIRTIME",
          },
        }),
        prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.SUCCESS,
            totalDebited: amount,
            token: token,
            vendorReference: vendorReference,
            vendor: result.vendor as VtuVendor || null,
            deliveredAt: new Date(),
            metadata: {
              ...transaction.metadata,
              processed: true,
              vendorResponse: result.data,
              completedAt: new Date().toISOString(),
            },
          },
        }),
      ]);

      const successMessage = `✅ Airtime Purchase Successful!

Phone: ${phoneNumber}
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
${token ? `Token: ${token}` : ''}
Reference: ${transaction.id.substring(0, 10)}

Thank you for using Bilscore!`;

      await sendWhatsAppMessage(user.phone, successMessage);
      return successMessage;
    } catch (vendorError: any) {
      console.error("[AIRTIME] Vendor error:", vendorError);
      
      const errorDetails = {
        message: vendorError?.message || "Vendor error",
        code: vendorError?.code || vendorError?.response_description || 'UNKNOWN',
        amount: amount,
        phoneNumber: phoneNumber,
        network: detectedNetwork,
        vendorResponse: vendorError?.response || vendorError,
      };
      
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...transaction.metadata,
            failureReason: errorDetails.message,
            errorCode: errorDetails.code,
            failedAt: new Date().toISOString(),
          },
        },
      });
      
      return formatErrorMessage(errorDetails, { 
        accountNumber: wallet.accountNumber,
        accountName: wallet.accountName 
      });
    }
  } catch (error: any) {
    console.error("[AIRTIME] Purchase error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// EXTERNAL PURCHASE HANDLERS (PIN REQUIRED)
// ============================================================

async function processAirtimePurchaseWithPin(
  user: any, 
  phoneNumber: string, 
  amount: number,
  detectedNetwork: string
): Promise<string> {
  try {
    if (!user.pinHash) {
      return `❌ PIN Not Set

You need to set a transaction PIN first to buy airtime for other numbers.

To set your PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

For your own number, just use: AIRTIME 500 (no PIN needed)`;
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return formatErrorMessage({ message: "Wallet not found. Please contact support." });
    }

    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `❌ Insufficient Balance

You have NGN ${walletBalance.toFixed(2)}
Need NGN ${amount.toFixed(2)}
Account: ${wallet.accountNumber || 'N/A'}

Please fund your wallet and try again.`;
    }

    const networkEnum = mapNetwork(detectedNetwork);

    let customer = await prisma.customer.findUnique({
      where: { userId_phone: { userId: user.id, phone: phoneNumber } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId: user.id,
          phone: phoneNumber,
          fullName: null,
          email: null,
          customerType: "REGULAR",
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        },
      });
    }

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.AIRTIME,
        product: detectedNetwork,
        amount: amount,
        totalDebited: 0,
        phoneNumber: phoneNumber,
        network: networkEnum,
        status: TransactionStatus.PENDING,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "WhatsApp",
          service: "AIRTIME",
          timestamp: new Date().toISOString(),
          network: detectedNetwork,
          networkEnum: networkEnum,
          customerId: customer.id,
          pinVerified: false,
          isOwnNumber: false,
        },
      },
    });

    const validationToken = generateValidationToken();
    const validationExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.vtuTransaction.update({
      where: { id: transaction.id },
      data: {
        metadata: {
          ...transaction.metadata,
          validationToken: validationToken,
          validationExpiry: validationExpiry.toISOString(),
          pendingPin: true,
        },
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: "SYSTEM",
        amount: amount,
        balanceBefore: walletBalance,
        balanceAfter: walletBalance,
        reference: `PENDING_${transaction.id}`,
        description: `Pending airtime purchase - await PIN validation`,
        status: "PENDING",
        category: "AIRTIME",
        metadata: {
          validationToken: validationToken,
          expiresAt: validationExpiry.toISOString(),
          phoneNumber: phoneNumber,
          network: detectedNetwork,
        },
      },
    });

    const appUrl = getAppUrl();
    const validationLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

    return `🔐 Airtime Purchase Requires PIN Confirmation!

Phone: ${phoneNumber}
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
Reference: ${transaction.id.substring(0, 10)}

To complete this purchase, please confirm your PIN:

${validationLink}

This link expires in 5 minutes.
Your PIN is secure and will not be shared via WhatsApp.

For your own number, use: AIRTIME 500 (no PIN needed)`;
  } catch (error: any) {
    console.error("[AIRTIME] Purchase with PIN error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// DATA PURCHASE - NO PIN (OWN NUMBER)
// ============================================================

async function processDataPurchaseDirect(
  user: any, 
  phoneNumber: string, 
  planQuery: string,
  detectedNetwork: string
): Promise<string> {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return formatErrorMessage({ message: "Wallet not found. Please contact support." });
    }

    const planData = await findDataPlanFromVendor(detectedNetwork, planQuery);
    
    if (!planData) {
      const availablePlans = await getAvailablePlansForWhatsApp();
      return `❌ Data Plan Not Found

No data plan found for ${detectedNetwork} with "${planQuery}".

${availablePlans}

Example: DATA 1GB
Example: DATA 08012345678 1GB`;
    }

    const amount = Number(planData.price);
    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `❌ Insufficient Balance

You have NGN ${walletBalance.toFixed(2)}
Need NGN ${amount.toFixed(2)}
Account: ${wallet.accountNumber || 'N/A'}

Please fund your wallet and try again.`;
    }

    const networkEnum = mapNetwork(detectedNetwork);

    let customer = await prisma.customer.findUnique({
      where: { userId_phone: { userId: user.id, phone: phoneNumber } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId: user.id,
          phone: phoneNumber,
          fullName: null,
          email: null,
          customerType: "REGULAR",
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        },
      });
    }

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.DATA,
        product: `${detectedNetwork} - ${planData.data}`,
        amount: amount,
        totalDebited: 0,
        phoneNumber: phoneNumber,
        network: networkEnum,
        networkPlan: planData.planCode || planQuery,
        status: TransactionStatus.PENDING,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "WhatsApp",
          service: "DATA",
          timestamp: new Date().toISOString(),
          network: detectedNetwork,
          networkEnum: networkEnum,
          planQuery: planQuery,
          planName: planData.name,
          dataAmount: planData.amountMB,
          customerId: customer.id,
          pinVerified: true,
          skipPin: true,
          isOwnNumber: true,
        },
      },
    });

    try {
      const vendorService = getVendorService();
      const result = await vendorService.buyData(
        {
          phoneNumber: phoneNumber,
          planCode: planData.planCode || planQuery,
          network: detectedNetwork,
          amount: amount,
        },
        user.id
      );

      if (!result || !result.success) {
        const errorDetails = {
          message: result?.error || result?.response_description || "Vendor purchase failed",
          code: result?.code || result?.response_description || '',
          amount: amount,
          phoneNumber: phoneNumber,
          network: detectedNetwork,
          planQuery: planQuery,
          vendorResponse: result,
          vendorErrors: result?.vendorErrors || [],
          allVendorsFailed: result?.allVendorsFailed || false,
        };
        
        console.error(`[DATA] Vendor failed:`, JSON.stringify(errorDetails, null, 2));
        
        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            metadata: {
              ...transaction.metadata,
              failureReason: errorDetails.message,
              errorCode: errorDetails.code,
              vendorResponse: result,
              vendorErrors: result?.vendorErrors || [],
              allVendorsFailed: result?.allVendorsFailed || false,
              failedAt: new Date().toISOString(),
            },
          },
        });
        
        return formatErrorMessage(errorDetails, { 
          accountNumber: wallet.accountNumber,
          accountName: wallet.accountName 
        });
      }

      const token = result.data?.token || result.data?.purchased_code || null;
      const vendorReference = result.vendorReference || null;

      await prisma.$transaction([
        prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            walletBalance: { decrement: amount },
          },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: user.id,
            type: "DEBIT",
            amount: amount,
            balanceBefore: walletBalance,
            balanceAfter: walletBalance - amount,
            reference: `VTU_${transaction.id}`,
            description: `Data purchase for ${phoneNumber}`,
            status: "SUCCESS",
            category: "DATA",
          },
        }),
        prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.SUCCESS,
            totalDebited: amount,
            token: token,
            vendorReference: vendorReference,
            vendor: result.vendor as VtuVendor || null,
            deliveredAt: new Date(),
            metadata: {
              ...transaction.metadata,
              processed: true,
              vendorResponse: result.data,
              completedAt: new Date().toISOString(),
            },
          },
        }),
      ]);

      const dataDisplay = planData.data || `${planData.amountMB || 0}MB`;

      const successMessage = `✅ Data Purchase Successful!

Phone: ${phoneNumber}
Plan: ${dataDisplay} (${planData.name || detectedNetwork})
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
${token ? `Token: ${token}` : ''}
Reference: ${transaction.id.substring(0, 10)}

Thank you for using Bilscore!`;

      await sendWhatsAppMessage(user.phone, successMessage);
      return successMessage;
    } catch (vendorError: any) {
      console.error("[DATA] Vendor error:", vendorError);
      
      const errorDetails = {
        message: vendorError?.message || "Vendor error",
        code: vendorError?.code || vendorError?.response_description || 'UNKNOWN',
        amount: amount,
        phoneNumber: phoneNumber,
        network: detectedNetwork,
        planQuery: planQuery,
      };
      
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...transaction.metadata,
            failureReason: errorDetails.message,
            errorCode: errorDetails.code,
            failedAt: new Date().toISOString(),
          },
        },
      });
      
      return formatErrorMessage(errorDetails, { 
        accountNumber: wallet.accountNumber,
        accountName: wallet.accountName 
      });
    }
  } catch (error: any) {
    console.error("[DATA] Purchase error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// DATA PURCHASE - WITH PIN (EXTERNAL NUMBER)
// ============================================================

async function processDataPurchaseWithPin(
  user: any, 
  phoneNumber: string, 
  planQuery: string,
  detectedNetwork: string
): Promise<string> {
  try {
    if (!user.pinHash) {
      return `❌ PIN Not Set

You need to set a transaction PIN first to buy data for other numbers.

To set your PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

For your own number, just use: DATA 1GB (no PIN needed)`;
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return formatErrorMessage({ message: "Wallet not found. Please contact support." });
    }

    const planData = await findDataPlanFromVendor(detectedNetwork, planQuery);
    
    if (!planData) {
      const availablePlans = await getAvailablePlansForWhatsApp();
      return `❌ Data Plan Not Found

No data plan found for ${detectedNetwork} with "${planQuery}".

${availablePlans}

Example: DATA 08012345678 1GB`;
    }

    const amount = Number(planData.price);
    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `❌ Insufficient Balance

You have NGN ${walletBalance.toFixed(2)}
Need NGN ${amount.toFixed(2)}
Account: ${wallet.accountNumber || 'N/A'}

Please fund your wallet and try again.`;
    }

    const networkEnum = mapNetwork(detectedNetwork);

    let customer = await prisma.customer.findUnique({
      where: { userId_phone: { userId: user.id, phone: phoneNumber } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId: user.id,
          phone: phoneNumber,
          fullName: null,
          email: null,
          customerType: "REGULAR",
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        },
      });
    }

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.DATA,
        product: `${detectedNetwork} - ${planData.data}`,
        amount: amount,
        totalDebited: 0,
        phoneNumber: phoneNumber,
        network: networkEnum,
        networkPlan: planData.planCode || planQuery,
        status: TransactionStatus.PENDING,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "WhatsApp",
          service: "DATA",
          timestamp: new Date().toISOString(),
          network: detectedNetwork,
          networkEnum: networkEnum,
          planQuery: planQuery,
          planName: planData.name,
          dataAmount: planData.amountMB,
          customerId: customer.id,
          pinVerified: false,
          isOwnNumber: false,
        },
      },
    });

    const validationToken = generateValidationToken();
    const validationExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.vtuTransaction.update({
      where: { id: transaction.id },
      data: {
        metadata: {
          ...transaction.metadata,
          validationToken: validationToken,
          validationExpiry: validationExpiry.toISOString(),
          pendingPin: true,
        },
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: "SYSTEM",
        amount: amount,
        balanceBefore: walletBalance,
        balanceAfter: walletBalance,
        reference: `PENDING_${transaction.id}`,
        description: `Pending data purchase - await PIN validation`,
        status: "PENDING",
        category: "DATA",
        metadata: {
          validationToken: validationToken,
          expiresAt: validationExpiry.toISOString(),
          phoneNumber: phoneNumber,
          network: detectedNetwork,
          planQuery: planQuery,
        },
      },
    });

    const appUrl = getAppUrl();
    const validationLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

    const dataDisplay = planData.data || `${planData.amountMB || 0}MB`;

    return `🔐 Data Purchase Requires PIN Confirmation!

Phone: ${phoneNumber}
Plan: ${dataDisplay} (${planData.name || detectedNetwork})
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
Reference: ${transaction.id.substring(0, 10)}

To complete this purchase, please confirm your PIN:

${validationLink}

This link expires in 5 minutes.
Your PIN is secure and will not be shared via WhatsApp.

For your own number, use: DATA 1GB (no PIN needed)`;
  } catch (error: any) {
    console.error("[DATA] Purchase with PIN error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// ELECTRICITY PURCHASE - NO PIN (OWN METER)
// ============================================================

async function processElectricityPurchaseDirect(
  user: any, 
  meterNumber: string, 
  amount: number, 
  discoCode: string,
  meterType: string = "Prepaid"
): Promise<string> {
  try {
    const MIN_ELECTRICITY_AMOUNT = 1000;
    if (amount < MIN_ELECTRICITY_AMOUNT) {
      return `❌ Minimum Amount: NGN 1,000

Electricity purchase requires a minimum of NGN 1,000.
Please try again with a higher amount.

Example: ELECTRIC 1000`;
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return formatErrorMessage({ message: "Wallet not found. Please contact support." });
    }

    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `❌ Insufficient Balance

You have NGN ${walletBalance.toFixed(2)}
Need NGN ${amount.toFixed(2)}
Account: ${wallet.accountNumber || 'N/A'}

Please fund your wallet and try again.`;
    }

    const serviceID = discoCode.toLowerCase() + "-electric";
    const verificationResult = await verifyMeterWithVTpass(serviceID, meterNumber, meterType.toLowerCase());
    
    let customerName = null;
    let customerAddress = null;
    let customerPhone = null;
    let customerEmail = null;
    let meterStatus = null;
    
    if (verificationResult.success) {
      customerName = verificationResult.data?.customerName || null;
      customerAddress = verificationResult.data?.customerAddress || null;
      customerPhone = verificationResult.data?.customerPhone || null;
      customerEmail = verificationResult.data?.customerEmail || null;
      meterStatus = verificationResult.data?.status || null;
      console.log(`[WhatsApp] Verified meter: ${meterNumber} - Customer: ${customerName}`);
    } else {
      console.warn(`[WhatsApp] Verification failed for ${meterNumber}: ${verificationResult.error}`);
    }

    let customer = await prisma.customer.findUnique({
      where: { userId_phone: { userId: user.id, phone: user.phone } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId: user.id,
          phone: user.phone,
          fullName: user.fullName || null,
          email: user.email || null,
          customerType: "REGULAR",
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        },
      });
    }

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.ELECTRICITY_INSTANT,
        product: discoCode,
        amount: amount,
        totalDebited: 0,
        meterNumber: meterNumber,
        meterType: meterType.toLowerCase() === 'prepaid' ? MeterType.HOME : MeterType.OFFICE,
        status: TransactionStatus.PENDING,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "WhatsApp",
          service: "ELECTRICITY",
          timestamp: new Date().toISOString(),
          discoCode: discoCode,
          meterType: meterType,
          customerId: customer.id,
          pinVerified: true,
          skipPin: true,
          isOwnMeter: true,
          customerName: customerName,
          customerAddress: customerAddress,
          customerPhone: customerPhone,
          customerEmail: customerEmail,
          meterStatus: meterStatus,
          verified: verificationResult.success,
        },
      },
    });

    let vendorEnum: VtuVendor | null = null;
    let vendorReference: string | null = null;
    let token: string | null = null;

    try {
      console.log(`[WhatsApp] Calling vendor for meter ${meterNumber}...`);
      const startTime = Date.now();
      
      const vendorService = getVendorService();
      const TIMEOUT_MS = 30000;
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Vendor timeout after 30 seconds')), TIMEOUT_MS);
      });
      
      const vendorPromise = vendorService.buyElectricity(
        {
          meterNumber: meterNumber,
          amount: amount,
          discoCode: discoCode,
          meterType: meterType || 'Prepaid',
          phone: user.phone,
        },
        user.id
      );
      
      const result = await Promise.race([vendorPromise, timeoutPromise]) as any;
      
      const elapsed = Date.now() - startTime;
      console.log(`[WhatsApp] Vendor responded in ${elapsed}ms`);

      vendorEnum = mapVendorToEnum(result.vendor) || VtuVendor.VTPASS;
      vendorReference = result.vendorReference || null;

      if (result.success) {
        token = result.data?.token || result.data?.purchased_code || null;
        
        console.log(`[WhatsApp] Purchase successful! Token: ${token?.substring(0, 20)}...`);

        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            totalTransactions: { increment: 1 },
            totalSpent: { increment: amount },
            lastTransactionAt: new Date(),
          },
        });

        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              walletBalance: { decrement: amount },
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId: user.id,
              type: "DEBIT",
              amount: amount,
              balanceBefore: walletBalance,
              balanceAfter: walletBalance - amount,
              reference: `VTU_${transaction.id}`,
              description: `Electricity purchase for meter ${meterNumber} (${discoCode})`,
              status: "SUCCESS",
              category: "ELECTRICITY",
            },
          }),
          prisma.vtuTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.SUCCESS,
              totalDebited: amount,
              token: token,
              vendorReference: vendorReference,
              vendor: vendorEnum,
              deliveredAt: new Date(),
              metadata: {
                ...transaction.metadata,
                vendorResponse: result.data,
                vendorName: result.vendor,
                vendorReference: vendorReference,
                processed: true,
                completedAt: new Date().toISOString(),
                wasDebited: true,
                elapsedMs: elapsed,
              },
            },
          }),
          prisma.customerTransaction.create({
            data: {
              customerId: customer.id,
              userId: user.id,
              vtuTransactionId: transaction.id,
              transactionType: VtuType.ELECTRICITY_INSTANT,
              amount: amount,
              totalAmount: amount,
              product: discoCode,
              meterNumber: meterNumber,
              status: TransactionStatus.SUCCESS,
              metadata: {
                vendorName: result.vendor || 'unknown',
                vendorReference: vendorReference || '',
                token: token,
                meterType: meterType,
                completedAt: new Date().toISOString(),
                customerName: customerName,
                customerAddress: customerAddress,
                customerPhone: customerPhone,
                customerEmail: customerEmail,
                meterStatus: meterStatus,
              },
            },
          }),
        ]);

        saveMeterWithCustomerInfo(
          user.id, 
          meterNumber, 
          discoCode, 
          meterType,
          customerName,
          customerAddress,
          customerPhone,
          customerEmail,
          meterStatus
        ).catch(() => {});

        const successMessage = `✅ Electricity Purchase Successful!

Meter: ${meterNumber}
DisCo: ${discoCode}
Amount: NGN ${amount.toFixed(2)}
${customerName ? `👤 Customer: ${customerName}` : ''}
${customerAddress ? `📍 Address: ${customerAddress}` : ''}
${token ? `🔑 Token: ${token}` : ''}
Reference: ${transaction.id.substring(0, 10)}

Thank you for using Bilscore!`;

        console.log(`[WhatsApp] Sending success message to ${user.phone}`);
        await sendWhatsAppMessage(user.phone, successMessage);
        
        return successMessage;
      } else {
        console.error(`[WhatsApp] Vendor failed: ${result.error}`);

        const errorDetails = {
          message: result?.error || result?.response_description || "Vendor transaction failed",
          code: result?.code || result?.response_description || '',
          amount: amount,
          meterNumber: meterNumber,
          discoCode: discoCode,
          vendorResponse: result,
          vendorErrors: result?.vendorErrors || [],
          allVendorsFailed: result?.allVendorsFailed || false,
        };

        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            totalDebited: 0,
            vendor: vendorEnum,
            vendorReference: vendorReference,
            metadata: {
              ...transaction.metadata,
              error: result.error || "Vendor transaction failed",
              errorCode: errorDetails.code,
              vendor: result.vendor,
              vendorErrors: result.vendorErrors || [],
              allVendorsFailed: result?.allVendorsFailed || false,
              failedAt: new Date().toISOString(),
              wasDebited: false,
            },
          },
        });

        await prisma.customerTransaction.create({
          data: {
            customerId: customer.id,
            userId: user.id,
            vtuTransactionId: transaction.id,
            transactionType: VtuType.ELECTRICITY_INSTANT,
            amount: amount,
            totalAmount: amount,
            product: discoCode,
            meterNumber: meterNumber,
            status: TransactionStatus.FAILED,
            notes: `Vendor failure: ${result.error || "Unknown error"}`,
            metadata: {
              vendorName: result.vendor || 'unknown',
              vendorReference: vendorReference || '',
              failureReason: result.error,
              errorCode: errorDetails.code,
              vendorErrors: result.vendorErrors || [],
              meterType: meterType,
              failedAt: new Date().toISOString(),
              customerName: customerName,
              customerAddress: customerAddress,
              customerPhone: customerPhone,
              customerEmail: customerEmail,
              meterStatus: meterStatus,
            },
          },
        });

        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            totalTransactions: { increment: 1 },
            lastTransactionAt: new Date(),
          },
        });

        return formatErrorMessage(errorDetails, { 
          accountNumber: wallet.accountNumber,
          accountName: wallet.accountName 
        });
      }
    } catch (vendorError: any) {
      console.error(`[WhatsApp] Vendor error:`, vendorError.message);

      const errorDetails = {
        message: vendorError?.message || "Unknown vendor error",
        code: vendorError?.code || vendorError?.response_description || 'UNKNOWN',
        amount: amount,
        meterNumber: meterNumber,
        discoCode: discoCode,
      };

      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          totalDebited: 0,
          vendor: vendorEnum || VtuVendor.VTPASS,
          metadata: {
            ...transaction.metadata,
            error: vendorError.message || "Unknown vendor error",
            errorCode: errorDetails.code,
            errorType: vendorError.name || 'UnknownError',
            failedAt: new Date().toISOString(),
            wasDebited: false,
          },
        },
      });

      await prisma.customerTransaction.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          vtuTransactionId: transaction.id,
          transactionType: VtuType.ELECTRICITY_INSTANT,
          amount: amount,
          totalAmount: amount,
          product: discoCode,
          meterNumber: meterNumber,
          status: TransactionStatus.FAILED,
          notes: `Vendor Error: ${vendorError.message || 'Unknown error'}`,
          metadata: {
            failureReason: vendorError.message,
            errorCode: errorDetails.code,
            errorType: vendorError.name,
            meterType: meterType,
            failedAt: new Date().toISOString(),
            customerName: customerName,
            customerAddress: customerAddress,
            customerPhone: customerPhone,
            customerEmail: customerEmail,
            meterStatus: meterStatus,
          },
        },
      });

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalTransactions: { increment: 1 },
          lastTransactionAt: new Date(),
        },
      });

      return formatErrorMessage(errorDetails, { 
        accountNumber: wallet.accountNumber,
        accountName: wallet.accountName 
      });
    }
  } catch (error: any) {
    console.error("[WhatsApp] Purchase error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// ELECTRICITY PURCHASE - WITH PIN (EXTERNAL METER)
// ============================================================

async function processElectricityPurchaseWithPin(
  user: any, 
  meterNumber: string, 
  amount: number, 
  discoCode: string,
  meterType: string = "Prepaid",
  customerName: string = "Unknown"
): Promise<string> {
  try {
    const MIN_ELECTRICITY_AMOUNT = 1000;
    if (amount < MIN_ELECTRICITY_AMOUNT) {
      return `❌ Minimum Amount: NGN 1,000

Electricity purchase requires a minimum of NGN 1,000.
Please try again with a higher amount.

Example: ELECTRIC 1234567890 ABUJA 1000`;
    }

    if (!user.pinHash) {
      return `❌ PIN Not Set

You need to set a transaction PIN first to buy electricity for external meters.

To set your PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

For your saved meters, just use: ELECTRIC [amount] (no PIN needed)`;
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return formatErrorMessage({ message: "Wallet not found. Please contact support." });
    }

    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `❌ Insufficient Balance

You have NGN ${walletBalance.toFixed(2)}
Need NGN ${amount.toFixed(2)}
Account: ${wallet.accountNumber || 'N/A'}

Please fund your wallet and try again.`;
    }

    let customer = await prisma.customer.findUnique({
      where: { userId_phone: { userId: user.id, phone: user.phone } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId: user.id,
          phone: user.phone,
          fullName: user.fullName || null,
          email: user.email || null,
          customerType: "REGULAR",
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        },
      });
    }

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.ELECTRICITY_INSTANT,
        product: discoCode,
        amount: amount,
        totalDebited: 0,
        meterNumber: meterNumber,
        meterType: meterType.toLowerCase() === 'prepaid' ? MeterType.HOME : MeterType.OFFICE,
        status: TransactionStatus.PENDING,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "WhatsApp",
          service: "ELECTRICITY",
          timestamp: new Date().toISOString(),
          discoCode: discoCode,
          meterType: meterType,
          customerId: customer.id,
          customerName: customerName,
          isExternalMeter: true,
          pinVerified: false,
        },
      },
    });

    const validationToken = generateValidationToken();
    const validationExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.vtuTransaction.update({
      where: { id: transaction.id },
      data: {
        metadata: {
          ...transaction.metadata,
          validationToken: validationToken,
          validationExpiry: validationExpiry.toISOString(),
          pendingPin: true,
        },
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: "SYSTEM",
        amount: amount,
        balanceBefore: walletBalance,
        balanceAfter: walletBalance,
        reference: `PENDING_${transaction.id}`,
        description: `Pending electricity purchase for external meter - await PIN validation`,
        status: "PENDING",
        category: "ELECTRICITY",
        metadata: {
          validationToken: validationToken,
          expiresAt: validationExpiry.toISOString(),
          meterNumber: meterNumber,
          discoCode: discoCode,
          isExternalMeter: true,
        },
      },
    });

    const appUrl = getAppUrl();
    const validationLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

    return `🔐 Electricity Purchase Requires PIN Confirmation!

Meter: ${meterNumber}
DisCo: ${discoCode}
Amount: NGN ${amount.toFixed(2)}
Meter Type: ${meterType}
Customer: ${customerName}
Reference: ${transaction.id.substring(0, 10)}

To complete this purchase, please confirm your PIN:

${validationLink}

This link expires in 5 minutes.
Your PIN is secure and will not be shared via WhatsApp.

For your saved meters, use: ELECTRIC [amount] (no PIN needed)`;
  } catch (error: any) {
    console.error("[ELECTRIC] Purchase with PIN error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// CABLE PURCHASE - NO PIN (OWN DECODER)
// ============================================================

async function processCablePurchaseDirect(
  user: any, 
  decoderNumber: string, 
  packageQuery: string,
  provider: string
): Promise<string> {
  try {
    const serviceMap: Record<string, string> = {
      'DSTV': 'dstv', 'dstv': 'dstv',
      'GOTV': 'gotv', 'gotv': 'gotv',
      'STARTIMES': 'startimes', 'startimes': 'startimes',
    };

    const serviceId = serviceMap[provider] || 'dstv';
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction 
      ? "https://vtpass.com/api/service-variations"
      : "https://sandbox.vtpass.com/api/service-variations";
    
    const response = await fetch(`${baseUrl}?serviceID=${serviceId}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    let packageData = null;
    if (response.ok) {
      const data = await response.json();
      if (data.response_description === "000" && data.content?.variations) {
        const normalizedQuery = packageQuery.toLowerCase().trim();
        packageData = data.content.variations.find((v: any) => 
          v.variation_code?.toLowerCase() === normalizedQuery ||
          v.name?.toLowerCase().includes(normalizedQuery)
        );
        if (!packageData && data.content.variations.length > 0) {
          packageData = data.content.variations[0];
        }
      }
    }

    if (!packageData) {
      const packagesList = await getAvailablePackagesForWhatsApp(provider);
      return `❌ Package Not Found

No package found for "${packageQuery}" with ${provider}.

${packagesList}`;
    }

    const amount = parseFloat(packageData.variation_amount) || 0;

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return formatErrorMessage({ message: "Wallet not found. Please contact support." });
    }

    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `❌ Insufficient Balance

You have NGN ${walletBalance.toFixed(2)}
Need NGN ${amount.toFixed(2)}
Account: ${wallet.accountNumber || 'N/A'}

Please fund your wallet and try again.`;
    }

    let customer = await prisma.customer.findUnique({
      where: { userId_phone: { userId: user.id, phone: user.phone } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId: user.id,
          phone: user.phone,
          fullName: user.fullName || null,
          email: user.email || null,
          customerType: "REGULAR",
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        },
      });
    }

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.CABLE_TV,
        product: `${provider} - ${packageData.name}`,
        amount: amount,
        totalDebited: 0,
        phoneNumber: user.phone,
        networkPlan: packageData.variation_code,
        status: TransactionStatus.PENDING,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "WhatsApp",
          service: "CABLE_TV",
          timestamp: new Date().toISOString(),
          provider: provider,
          packageCode: packageData.variation_code,
          packageName: packageData.name,
          smartCardNumber: decoderNumber,
          customerId: customer.id,
          pinVerified: true,
          skipPin: true,
        },
      },
    });

    try {
      const vendorService = getVendorService();
      const result = await vendorService.buyCableTV(
        {
          decoderNumber: decoderNumber,
          packageCode: packageData.variation_code,
          provider: provider,
          amount: amount,
          phone: user.phone,
        },
        user.id
      );

      if (!result || !result.success) {
        const errorDetails = {
          message: result?.error || result?.response_description || "Vendor purchase failed",
          code: result?.code || result?.response_description || '',
          amount: amount,
          decoderNumber: decoderNumber,
          provider: provider,
          packageQuery: packageQuery,
          vendorResponse: result,
          vendorErrors: result?.vendorErrors || [],
          allVendorsFailed: result?.allVendorsFailed || false,
        };
        
        console.error(`[CABLE] Vendor failed:`, JSON.stringify(errorDetails, null, 2));
        
        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            metadata: {
              ...transaction.metadata,
              failureReason: errorDetails.message,
              errorCode: errorDetails.code,
              vendorResponse: result,
              vendorErrors: result?.vendorErrors || [],
              allVendorsFailed: result?.allVendorsFailed || false,
              failedAt: new Date().toISOString(),
            },
          },
        });
        
        return formatErrorMessage(errorDetails, { 
          accountNumber: wallet.accountNumber,
          accountName: wallet.accountName 
        });
      }

      const token = result.data?.token || result.data?.purchased_code || null;
      const vendorReference = result.vendorReference || null;

      await prisma.$transaction([
        prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            walletBalance: { decrement: amount },
          },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: user.id,
            type: "DEBIT",
            amount: amount,
            balanceBefore: walletBalance,
            balanceAfter: walletBalance - amount,
            reference: `VTU_${transaction.id}`,
            description: `Cable subscription for ${decoderNumber}`,
            status: "SUCCESS",
            category: "CABLE_TV",
          },
        }),
        prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.SUCCESS,
            totalDebited: amount,
            token: token,
            vendorReference: vendorReference,
            vendor: result.vendor as VtuVendor || null,
            deliveredAt: new Date(),
            metadata: {
              ...transaction.metadata,
              processed: true,
              vendorResponse: result.data,
              completedAt: new Date().toISOString(),
            },
          },
        }),
      ]);

      const successMessage = `✅ Cable Subscription Successful!

Decoder: ${decoderNumber}
Provider: ${provider}
Package: ${packageData.name}
Amount: NGN ${amount.toFixed(2)}
${token ? `Token: ${token}` : ''}
Reference: ${transaction.id.substring(0, 10)}

Your subscription has been activated. Enjoy!
Thank you for using Bilscore!`;

      await sendWhatsAppMessage(user.phone, successMessage);
      return successMessage;
    } catch (vendorError: any) {
      console.error("[CABLE] Vendor error:", vendorError);
      
      const errorDetails = {
        message: vendorError?.message || "Vendor error",
        code: vendorError?.code || vendorError?.response_description || 'UNKNOWN',
        amount: amount,
        decoderNumber: decoderNumber,
        provider: provider,
        packageQuery: packageQuery,
      };
      
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...transaction.metadata,
            failureReason: errorDetails.message,
            errorCode: errorDetails.code,
            failedAt: new Date().toISOString(),
          },
        },
      });
      
      return formatErrorMessage(errorDetails, { 
        accountNumber: wallet.accountNumber,
        accountName: wallet.accountName 
      });
    }
  } catch (error: any) {
    console.error("[CABLE] Purchase error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// EDUCATION PURCHASE (PIN REQUIRED)
// ============================================================

async function processEducationPurchaseWhatsApp(
  user: any,
  productType: string,
  quantity: number
): Promise<string> {
  try {
    if (!user.pinHash) {
      return `❌ PIN Not Set

You need to set a transaction PIN first to buy education pins.

To set your PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234`;
    }

    const serviceMap: Record<string, { serviceId: string; variationCode: string; name: string; price: number }> = {
      'WAEC': { serviceId: 'waec-registration', variationCode: 'waec-registration', name: 'WAEC Registration PIN', price: 14450 },
      'WAEC-RESULT': { serviceId: 'waec', variationCode: 'waecdirect', name: 'WAEC Result Checker PIN', price: 900 },
      'JAMB': { serviceId: 'jamb', variationCode: 'utme-no-mock', name: 'JAMB UTME PIN', price: 6200 },
      'NECO': { serviceId: 'neco', variationCode: 'neco-registration', name: 'NECO Registration PIN', price: 11000 },
    };

    const productInfo = serviceMap[productType];
    if (!productInfo) {
      const productsList = await getAvailableEducationProducts();
      return `❌ Invalid Product: ${productType}

Available products:
${productsList}

Examples:
EDU WAEC 2
EDU JAMB 1
WAEC 2`;
    }

    const amount = productInfo.price * quantity;

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return formatErrorMessage({ message: "Wallet not found. Please contact support." });
    }

    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `❌ Insufficient Balance

You have NGN ${walletBalance.toFixed(2)}
Need NGN ${amount.toFixed(2)}
Account: ${wallet.accountNumber || 'N/A'}

Please fund your wallet and try again.`;
    }

    let customer = await prisma.customer.findUnique({
      where: { userId_phone: { userId: user.id, phone: user.phone } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId: user.id,
          phone: user.phone,
          fullName: user.fullName || null,
          email: user.email || null,
          customerType: "REGULAR",
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        },
      });
    }

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.EDUCATION,
        product: productInfo.serviceId,
        amount: amount,
        totalDebited: 0,
        phoneNumber: user.phone,
        network: null,
        networkPlan: productInfo.variationCode,
        status: TransactionStatus.PENDING,
        channel: ChannelType.WHATSAPP,
        isBulkPurchase: quantity > 1,
        bulkQuantity: quantity > 1 ? quantity : undefined,
        metadata: {
          source: "WhatsApp",
          service: "EDUCATION",
          timestamp: new Date().toISOString(),
          serviceId: productInfo.serviceId,
          variationCode: productInfo.variationCode,
          quantity: quantity,
          productName: productInfo.name,
          productType: productType,
          customerId: customer.id,
          pinVerified: false,
        },
      },
    });

    const validationToken = generateValidationToken();
    const validationExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.vtuTransaction.update({
      where: { id: transaction.id },
      data: {
        metadata: {
          ...transaction.metadata,
          validationToken: validationToken,
          validationExpiry: validationExpiry.toISOString(),
          pendingPin: true,
        },
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: "SYSTEM",
        amount: amount,
        balanceBefore: walletBalance,
        balanceAfter: walletBalance,
        reference: `PENDING_${transaction.id}`,
        description: `Pending education purchase - await PIN validation`,
        status: "PENDING",
        category: "EDUCATION",
        metadata: {
          validationToken: validationToken,
          expiresAt: validationExpiry.toISOString(),
          productType: productType,
          productName: productInfo.name,
          quantity: quantity,
          serviceId: productInfo.serviceId,
        },
      },
    });

    const appUrl = getAppUrl();
    const validationLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

    return `🔐 Education Purchase Requires PIN Confirmation!

Product: ${productInfo.name}
Quantity: ${quantity}
Amount: NGN ${amount.toFixed(2)}
Service: ${productType}
Reference: ${transaction.id.substring(0, 10)}

To complete this purchase, please confirm your PIN:

${validationLink}

This link expires in 5 minutes.
Your PIN is secure and will not be shared via WhatsApp.`;
  } catch (error: any) {
    console.error("[EDUCATION] Purchase error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// SUBSCRIPTION HANDLER
// ============================================================

async function processSubscriptionWhatsApp(
  user: any,
  meterNumber: string,
  discoCode: string,
  amount: number,
  days: number,
  meterType: string = "Prepaid"
): Promise<string> {
  try {
    if (!user.pinHash) {
      return `❌ PIN Not Set

You need to set a transaction PIN first to schedule subscriptions.

To set your PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234`;
    }

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + days);

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return formatErrorMessage({ message: "Wallet not found. Please contact support." });
    }

    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `❌ Insufficient Balance

You have NGN ${walletBalance.toFixed(2)}
Need NGN ${amount.toFixed(2)}
Account: ${wallet.accountNumber || 'N/A'}

Please fund your wallet and try again.`;
    }

    let customer = await prisma.customer.findUnique({
      where: { userId_phone: { userId: user.id, phone: user.phone } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId: user.id,
          phone: user.phone,
          fullName: user.fullName || null,
          email: user.email || null,
          customerType: "REGULAR",
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        },
      });
    }

    const discoEnum = mapDiscoCode(discoCode);
    if (!discoEnum) {
      return `❌ Invalid DisCo: ${discoCode}

Available DisCos:
IKEJA, EKO, ABUJA, KANO, PHCN, IBADAN, BENIN, ENUGU, JOS, PORTHARCOURT`;
    }

    const validationToken = generateValidationToken();
    const validationExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const preOrder = await prisma.preOrder.create({
      data: {
        userId: user.id,
        disCo: discoEnum,
        meterNumber: meterNumber,
        meterType: meterType.toLowerCase() === 'prepaid' ? MeterType.HOME : MeterType.OFFICE,
        meterName: `${discoCode} Meter`,
        amount: amount,
        serviceFee: 0,
        totalDebited: 0,
        deliveryDate: deliveryDate,
        status: "PENDING",
        isCancelled: false,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "WhatsApp",
          service: "SUBSCRIPTION",
          timestamp: new Date().toISOString(),
          serviceType: "electricity",
          isSubscription: true,
          isReserved: true,
          reservedAmount: amount,
          scheduledDate: deliveryDate.toISOString(),
          tokenPurchased: false,
          walletId: wallet.id,
          paymentPending: true,
          days: days,
          customerId: customer.id,
          pinVerified: false,
          validationToken: validationToken,
          validationExpiry: validationExpiry.toISOString(),
          pendingPin: true,
        },
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: "SYSTEM",
        amount: amount,
        balanceBefore: walletBalance,
        balanceAfter: walletBalance,
        reference: `RESERVE_${preOrder.id}`,
        description: `Reserved for electricity delivery on ${deliveryDate.toLocaleDateString()}`,
        status: "PENDING",
        category: "ELECTRICITY",
        channel: ChannelType.WHATSAPP,
        metadata: {
          preOrderId: preOrder.id,
          deliveryDate: deliveryDate.toISOString(),
          serviceType: "electricity",
          isReserved: true,
          amountReserved: amount,
          scheduledDate: deliveryDate.toISOString(),
          tokenPurchased: false,
          walletId: wallet.id,
          paymentPending: true,
          source: "WhatsApp",
          validationToken: validationToken,
        },
      },
    });

    await prisma.job.create({
      data: {
        type: JobType.SUBSCRIPTION_PROCESSING,
        status: JobStatus.PENDING,
        payload: {
          preOrderId: preOrder.id,
          userId: user.id,
          serviceType: "electricity",
          amount: amount,
          deliveryDate: deliveryDate.toISOString(),
          walletId: wallet.id,
          reserveTransactionId: `RESERVE_${preOrder.id}`,
          tokenVaultId: null,
          vtuTransactionId: null,
          token: null,
          tokenPurchased: false,
          wasDebited: false,
          meterNumber: meterNumber,
          discoCode: discoCode,
          source: "WhatsApp",
          validationToken: validationToken,
        },
        priority: 5,
        maxAttempts: 3,
        scheduledFor: deliveryDate,
      },
    });

    const appUrl = getAppUrl();
    const validationLink = `${appUrl}/auth/validate-subscription?token=${validationToken}`;

    const deliveryDateStr = deliveryDate.toLocaleDateString();

    return `🔐 Electricity Subscription Requires PIN Confirmation!

Meter: ${meterNumber}
DisCo: ${discoCode}
Amount: NGN ${amount.toFixed(2)}
Delivery Date: ${deliveryDateStr}
Subscription ID: ${preOrder.id.substring(0, 10)}

To complete this subscription, please confirm your PIN:

${validationLink}

This link expires in 5 minutes.
Your PIN is secure and will not be shared via WhatsApp.

After confirming, your token will be scheduled for delivery on ${deliveryDateStr}.

To see your active subscriptions: SUBSCRIPTIONS
To cancel: CANCEL [subscription_id]`;
  } catch (error: any) {
    console.error("[SUBSCRIPTION] Error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// MAIN COMMAND PROCESSOR
// ============================================================

async function processWhatsAppCommand(user: any, body: string, phone: string): Promise<string> {
  const command = body.toUpperCase().trim();
  const parts = body.split(" ").filter(p => p.length > 0);

  // ========== HELP ==========
  if (command === "HELP" || command === "?") {
    return getHelpMessage(user);
  }

  // ========== REGISTER ==========
  if (command.startsWith("REG") || command === "REGISTER" || command === "SIGNUP" || command === "JOIN") {
    return `You are already registered with Bilscore!

Registered name: ${user.fullName}
Wallet Balance: NGN ${Number(user.wallet?.walletBalance || 0).toFixed(2)}

Type HELP to see available commands.`;
  }

  // ========== BALANCE ==========
  if (command === "BALANCE" || command === "BAL" || command === "WALLET") {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });
    const balance = wallet?.walletBalance || 0;
    const totalTxns = await prisma.vtuTransaction.count({
      where: { userId: user.id },
    });
    const referrals = await prisma.referral.count({
      where: { referrerId: user.id },
    });

    return `💰 Your Bilscore Balance: NGN ${Number(balance).toFixed(2)}
Account Name: ${wallet?.accountName || user.fullName}
Account Number: ${wallet?.accountNumber || 'N/A'}

📊 Quick Stats:
Total Transactions: ${totalTxns}
Referrals: ${referrals}
Wallet Status: ${wallet?.isActive ? "Active" : "Inactive"}

Reply with HELP for available commands.`;
  }

  // ============================================================
  // ✅ AIRTIME - UPDATED WITH CORRECT NETWORK DETECTION
  // ============================================================
  if (command.startsWith("AIRTIME") || command.startsWith("AIRTIME ")) {
    let targetPhone: string;
    let amountNum: number;
    let isOwnNumber = false;
    
    if (parts.length === 2) {
      const param = parts[1];
      if (/^\d{2,5}$/.test(param)) {
        targetPhone = user.phone;
        amountNum = parseFloat(param);
        isOwnNumber = true;
      } else {
        return `❌ Invalid Format

Please specify the amount.
Example: AIRTIME 500 (buys for your number - no PIN)
Or: AIRTIME 08012345678 500 (buys for another number - PIN required)
Or: AIRTIME +2348012345678 500 (with country code)`;
      }
    } else if (parts.length >= 3) {
      targetPhone = parts[1];
      amountNum = parseFloat(parts[2]);
      const normalizedTarget = normalizePhoneNumber(targetPhone);
      const normalizedUser = normalizePhoneNumber(user.phone);
      isOwnNumber = normalizedTarget === normalizedUser;
    } else {
      return `📱 Buy Airtime

AIRTIME [amount] - For YOUR number (no PIN required)
AIRTIME [phone] [amount] - For another number (PIN required)

Example: AIRTIME 500
Example: AIRTIME 08012345678 500
Example: AIRTIME +2348012345678 500

Available networks: MTN, GLO, AIRTEL, 9MOBILE
Minimum: NGN 50 | Maximum: NGN 50,000`;
    }
    
    if (isNaN(amountNum) || amountNum < 50 || amountNum > 50000) {
      return `❌ Invalid Amount

Please enter between NGN 50 and NGN 50,000.
Example: AIRTIME 500`;
    }
    
    if (!targetPhone || targetPhone.length < 10) {
      targetPhone = user.phone;
      isOwnNumber = true;
    }
    
    const normalizedTarget = normalizePhoneNumber(targetPhone);
    const detectedNetwork = detectNetworkFromPhone(normalizedTarget);
    
    console.log(`[AIRTIME] Target: ${targetPhone}, Normalized: ${normalizedTarget}, Network: ${detectedNetwork}`);
    
    if (!detectedNetwork) {
      return `❌ Could Not Detect Network

We couldn't detect the network for ${targetPhone}.
Please ensure the phone number is correct.

Supported formats:
• 08012345678 (11 digits with leading zero)
• +2348012345678 (with country code)
• 2348012345678 (without leading zero)

Available networks: MTN, GLO, AIRTEL, 9MOBILE`;
    }

    if (isOwnNumber) {
      return await processAirtimePurchaseDirect(user, normalizedTarget, amountNum, detectedNetwork);
    } else {
      return await processAirtimePurchaseWithPin(user, normalizedTarget, amountNum, detectedNetwork);
    }
  }

  // ============================================================
  // ✅ DATA - UPDATED WITH CORRECT NETWORK DETECTION
  // ============================================================
  if (command.startsWith("DATA") || command.startsWith("DATA ")) {
    let targetPhone: string;
    let planQuery: string;
    let isOwnNumber = false;
    
    if (parts.length === 2) {
      targetPhone = user.phone;
      planQuery = parts[1];
      isOwnNumber = true;
    } else if (parts.length >= 3) {
      targetPhone = parts[1];
      planQuery = parts.slice(2).join(' ');
      const normalizedTarget = normalizePhoneNumber(targetPhone);
      const normalizedUser = normalizePhoneNumber(user.phone);
      isOwnNumber = normalizedTarget === normalizedUser;
    } else {
      const availablePlans = await getAvailablePlansForWhatsApp();
      return `📱 Buy Data

DATA [plan] - For YOUR number (no PIN required)
DATA [phone] [plan] - For another number (PIN required)

Example: DATA 1GB
Example: DATA 08012345678 1GB
Example: DATA +2348012345678 1GB

${availablePlans}`;
    }
    
    if (!planQuery) {
      const availablePlans = await getAvailablePlansForWhatsApp();
      return `❌ Missing Plan

Please specify a data plan.
Example: DATA 1GB

${availablePlans}`;
    }
    
    if (!targetPhone || targetPhone.length < 10) {
      targetPhone = user.phone;
      isOwnNumber = true;
    }
    
    const normalizedTarget = normalizePhoneNumber(targetPhone);
    const detectedNetwork = detectNetworkFromPhone(normalizedTarget);
    
    console.log(`[DATA] Target: ${targetPhone}, Normalized: ${normalizedTarget}, Network: ${detectedNetwork}`);
    
    if (!detectedNetwork) {
      return `❌ Could Not Detect Network

We couldn't detect the network for ${targetPhone}.
Please ensure the phone number is correct.

Supported formats:
• 08012345678 (11 digits with leading zero)
• +2348012345678 (with country code)
• 2348012345678 (without leading zero)

${await getAvailablePlansForWhatsApp()}`;
    }

    if (isOwnNumber) {
      return await processDataPurchaseDirect(user, normalizedTarget, planQuery, detectedNetwork);
    } else {
      return await processDataPurchaseWithPin(user, normalizedTarget, planQuery, detectedNetwork);
    }
  }

  // ============================================================
  // ✅ METER MANAGEMENT
  // ============================================================
  
  if (command.startsWith("ADDMETER") || command.startsWith("ADD METER")) {
    const addParts = body.split(" ").filter(p => p.length > 0);
    if (addParts.length < 4) {
      const discosList = await getAvailableDiscosForWhatsApp();
      return `⚡ Add Meter

To add a meter, reply with:
ADDMETER [meter_number] [disco_code] [name]

Available DisCos:
${discosList}

Example: ADDMETER 1234567890 ABUJA HOME

Name can be: HOME, OFFICE, SHOP, etc.`;
    }

    const [, meterNumber, disco, ...nameParts] = addParts;
    const name = nameParts.join(" ");
    return await addMeterWithVerificationAndQR(user.id, meterNumber, disco, name);
  }

  if (command === "METERS" || command === "LIST METERS") {
    return await listMeters(user.id);
  }

  if (command.startsWith("DELETEMETER") || command.startsWith("DELETE METER")) {
    const deleteParts = body.split(" ").filter(p => p.length > 0);
    if (deleteParts.length < 2) {
      return `❌ Missing Meter Number

Please specify the meter number to delete.
Example: DELETEMETER 1234567890`;
    }
    const meterNumber = deleteParts[1];
    return await deleteMeter(user.id, meterNumber);
  }

  if (command.startsWith("SETDEFAULTMETER") || command.startsWith("SET DEFAULT METER")) {
    const defaultParts = body.split(" ").filter(p => p.length > 0);
    if (defaultParts.length < 2) {
      return `❌ Missing Selection

Please specify the meter number or index.
Example: SETDEFAULTMETER 1
Or: SETDEFAULTMETER 1234567890`;
    }
    const meterId = defaultParts[1];
    return await setDefaultMeter(user.id, meterId);
  }

  // ========== DECODER MANAGEMENT ==========
  
  if (command.startsWith("ADDDECODER") || command.startsWith("ADD DECODER")) {
    const addParts = body.split(" ").filter(p => p.length > 0);
    if (addParts.length < 4) {
      return `📺 Add Decoder

To add a decoder, reply with:
ADDDECODER [decoder_number] [provider] [name]

Example: ADDDECODER 1234567890 DSTV LIVING_ROOM

Available providers: DSTV, GOTV, STARTIMES
Name can be: LIVING_ROOM, BEDROOM, OFFICE, etc.`;
    }

    const [, decoderNumber, provider, ...nameParts] = addParts;
    const name = nameParts.join(" ");
    return await addDecoderWithVerification(user.id, decoderNumber, provider, name);
  }

  if (command === "DECODERS" || command === "LIST DECODERS") {
    return await listDecoders(user.id);
  }

  if (command.startsWith("DELETEDECODER") || command.startsWith("DELETE DECODER")) {
    const deleteParts = body.split(" ").filter(p => p.length > 0);
    if (deleteParts.length < 2) {
      return `❌ Missing Decoder Number

Please specify the decoder number to delete.
Example: DELETEDECODER 1234567890`;
    }
    const decoderNumber = deleteParts[1];
    return await deleteDecoder(user.id, decoderNumber);
  }

  if (command.startsWith("SETDEFAULTDECODER") || command.startsWith("SET DEFAULT DECODER")) {
    const defaultParts = body.split(" ").filter(p => p.length > 0);
    if (defaultParts.length < 2) {
      return `❌ Missing Selection

Please specify the decoder number or index.
Example: SETDEFAULTDECODER 1
Or: SETDEFAULTDECODER 1234567890`;
    }
    const decoderId = defaultParts[1];
    return await setDefaultDecoder(user.id, decoderId);
  }

  // ============================================================
  // ✅ ELECTRICITY - SUPPORTS BOTH SAVED AND EXTERNAL METERS
  // ============================================================
  
  if (command.startsWith("ELECTRIC") || command.startsWith("ELEC") || 
      command.startsWith("POWER") || command.startsWith("ELECTRICITY")) {
    
    if (parts.length === 1) {
      const meters = await prisma.savedMeter.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });

      if (meters.length === 0) {
        const discosList = await getAvailableDiscosForWhatsApp();
        return `⚡ Buy Electricity

You don't have any saved meters.

To buy electricity for any meter:
ELECTRIC [meter_number] [disco] [amount]

Example: ELECTRIC 1234567890 ABUJA 5000

To add a meter for quick buying:
ADDMETER [meter_number] [disco] [name]

Available DisCos:
${discosList}`;
      }

      let message = "⚡ Your Saved Meters:\n\n";
      meters.forEach((meter: any, index: number) => {
        const defaultTag = meter.isDefault ? " (Default)" : "";
        message += `${index + 1}. ${meter.name || meter.meterNumber}${defaultTag}\n`;
        message += `   ${meter.disco}\n`;
        message += `   ${meter.meterNumber}\n`;
        if (meter.customerName) {
          message += `   👤 ${meter.customerName}\n`;
        }
        if (meter.customerAddress) {
          message += `   📍 ${meter.customerAddress}\n`;
        }
        message += `\n`;
      });

      message += `To buy for saved meter: ELECTRIC [index] [amount]\n`;
      message += `Example: ELECTRIC 1 5000\n\n`;
      message += `To buy for any meter: ELECTRIC [meter_number] [disco] [amount]\n`;
      message += `Example: ELECTRIC 1234567890 ABUJA 5000\n\n`;
      message += `To add more meters: ADDMETER [meter] [disco] [name]`;

      return message;
    }

    if (parts.length >= 4) {
      const [, meterNumber, disco, amountStr] = parts;
      const amount = parseFloat(amountStr);
      
      if (isNaN(amount) || amount < 100) {
        return `❌ Invalid Amount

Minimum is NGN 100.
Example: ELECTRIC 1234567890 ABUJA 5000`;
      }
      
      const validDiscos = ["IKEJA", "EKO", "ABUJA", "KANO", "PHCN", "IBADAN", "BENIN", "ENUGU", "JOS", "PORTHARCOURT", "KADUNA"];
      const discoUpper = disco.toUpperCase();
      if (!validDiscos.includes(discoUpper)) {
        return `❌ Invalid DisCo: ${discoUpper}

Available DisCos:
${validDiscos.join(", ")}`;
      }
      
      const verificationResult = await verifyMeterWithVTpass(
        discoUpper.toLowerCase() + "-electric",
        meterNumber,
        "prepaid"
      );
      
      let customerName = "Unknown";
      if (verificationResult.success) {
        customerName = verificationResult.data?.customerName || "Unknown";
      } else {
        return `⚠️ Could Not Verify Meter

${verificationResult.error || "Unknown error"}

You can still proceed with the purchase.

To continue: ELECTRIC ${meterNumber} ${discoUpper} ${amount}
To cancel: Type HELP for other options.`;
      }
      
      return await processElectricityPurchaseWithPin(
        user,
        meterNumber,
        amount,
        discoUpper,
        "Prepaid",
        customerName
      );
    }
    
    if (parts.length === 3) {
      const [, indexStr, amountStr] = parts;
      const index = parseInt(indexStr) - 1;
      const amount = parseFloat(amountStr);
      
      if (isNaN(index) || index < 0) {
        return `❌ Invalid Selection

Please choose a number from the list.
Example: ELECTRIC 1 5000`;
      }
      
      if (isNaN(amount) || amount < 100) {
        return `❌ Invalid Amount

Minimum is NGN 100.
Example: ELECTRIC 1 5000`;
      }
      
      const meters = await prisma.savedMeter.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      
      if (index >= meters.length) {
        return `❌ Invalid Selection

Please choose a number from the list.`;
      }
      
      const selectedMeter = meters[index];
      
      return await processElectricityPurchaseDirect(
        user,
        selectedMeter.meterNumber,
        amount,
        selectedMeter.disco,
        selectedMeter.meterType || "Prepaid"
      );
    }
    
    if (parts.length === 2) {
      const amountStr = parts[1];
      const amount = parseFloat(amountStr);
      
      if (isNaN(amount) || amount < 100) {
        return `❌ Invalid Amount

Minimum is NGN 100.
Example: ELECTRIC 5000`;
      }
      
      const meters = await prisma.savedMeter.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      
      if (meters.length === 0) {
        return `⚡ No Saved Meters

You don't have any saved meters.

To buy for any meter:
ELECTRIC [meter_number] [disco] [amount]

Example: ELECTRIC 1234567890 ABUJA 5000

To add a meter: ADDMETER [meter_number] [disco] [name]`;
      }
      
      let selectedMeter = meters.find(m => m.isDefault) || meters[0];
      
      if (meters.length > 1 && !meters.find(m => m.isDefault)) {
        let message = "⚡ Multiple Meters Found\n\nPlease select one:\n\n";
        meters.forEach((meter: any, index: number) => {
          message += `${index + 1}. ${meter.name || meter.meterNumber}\n`;
          message += `   ${meter.disco}\n\n`;
        });
        message += `Reply with: ELECTRIC [index] [amount]\n`;
        message += `Example: ELECTRIC 1 5000`;
        return message;
      }
      
      return await processElectricityPurchaseDirect(
        user,
        selectedMeter.meterNumber,
        amount,
        selectedMeter.disco,
        selectedMeter.meterType || "Prepaid"
      );
    }
    
    const meters = await prisma.savedMeter.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    let message = "⚡ Buy Electricity\n\n";
    
    if (meters.length > 0) {
      message += "Your Saved Meters:\n";
      meters.forEach((meter: any, index: number) => {
        const defaultTag = meter.isDefault ? " (Default)" : "";
        message += `${index + 1}. ${meter.name || meter.meterNumber}${defaultTag}\n`;
        message += `   ${meter.disco}\n\n`;
      });
      message += `To buy: ELECTRIC [index] [amount]\n`;
      message += `Example: ELECTRIC 1 5000\n\n`;
    }
    
    message += `To buy for any meter: ELECTRIC [meter_number] [disco] [amount]\n`;
    message += `Example: ELECTRIC 1234567890 ABUJA 5000\n\n`;
    message += `To add meter: ADDMETER [meter] [disco] [name]\n`;
    message += `To see DisCos: DISCOS`;

    return message;
  }

  // ========== DISCOS ==========
  if (command === "DISCOS" || command === "DISCO" || command === "DISCOS?") {
    const discosList = await getAvailableDiscosForWhatsApp();
    return `⚡ Available DisCos:

${discosList}

To add a meter: ADDMETER [meter_number] [disco_code] [name]
Example: ADDMETER 1234567890 ABUJA HOME`;
  }

  // ============================================================
  // ✅ CABLE - NO PIN FOR OWN DECODERS
  // ============================================================
  if (command === "CABLE" || command === "TV") {
    const decoders = await prisma.savedDecoder.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    if (decoders.length === 0) {
      return `📺 Cable TV

You don't have any saved decoders.

To add your first decoder:
ADDDECODER [decoder_number] [provider] [name]

Example: ADDDECODER 1234567890 DSTV LIVING_ROOM

Available providers: DSTV, GOTV, STARTIMES

After adding, you can buy cable by just typing CABLE!`;
    }

    let message = "📺 Your Saved Decoders:\n\n";
    decoders.forEach((decoder: any, index: number) => {
      const defaultTag = decoder.isDefault ? " (Default)" : "";
      message += `${index + 1}. ${decoder.name || decoder.decoderNumber}${defaultTag}\n`;
      message += `   ${decoder.provider}\n`;
      message += `   ${decoder.decoderNumber}\n\n`;
    });

    message += `To buy cable: CABLE [decoder_index] [package]\n`;
    message += `Example: CABLE 1 PREMIUM\n\n`;
    message += `To see available packages: PACKAGES [provider]\n`;
    message += `Example: PACKAGES DSTV\n\n`;
    message += `To add more decoders: ADDDECODER [decoder] [provider] [name]`;

    return message;
  }

  if (command.startsWith("CABLE") || command.startsWith("TV")) {
    const cableParts = body.split(" ").filter(p => p.length > 0);
    
    if (cableParts.length >= 3) {
      const [, indexStr, packageQuery] = cableParts;
      const index = parseInt(indexStr) - 1;
      
      if (isNaN(index) || index < 0) {
        return `❌ Invalid Selection

Please choose a number from the list.
Example: CABLE 1 PREMIUM`;
      }
      
      const decoders = await prisma.savedDecoder.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      
      if (index >= decoders.length) {
        return `❌ Invalid Selection

Please choose a number from the list.`;
      }
      
      const selectedDecoder = decoders[index];
      
      return await processCablePurchaseDirect(
        user, 
        selectedDecoder.decoderNumber, 
        packageQuery,
        selectedDecoder.provider
      );
    }
    
    if (cableParts.length === 2) {
      return `❌ Missing Package

Please specify the package as well.
Example: CABLE ${cableParts[1]} PREMIUM

To see available packages: PACKAGES [provider]
Example: PACKAGES DSTV`;
    }
  }

  // ========== PACKAGES ==========
  if (command.startsWith("PACKAGES") || command === "PACKAGE") {
    const packageParts = body.split(" ").filter(p => p.length > 0);
    const provider = packageParts.length > 1 ? packageParts[1] : "DSTV";
    const packagesList = await getAvailablePackagesForWhatsApp(provider);
    return packagesList;
  }

  // ========== SUBSCRIPTIONS ==========
  if (command.startsWith("SCHEDULE") || command.startsWith("SUBSCRIBE")) {
    const scheduleParts = body.split(" ").filter(p => p.length > 0);
    
    if (scheduleParts.length < 4) {
      return `📅 Schedule Electricity Token Delivery

SCHEDULE [meter_index] [amount] [days]

Example: SCHEDULE 1 5000 7

This schedules a token for delivery in 7 days.

Available meters:
${await getSavedMetersList(user.id)}`;
    }

    const [, indexStr, amountStr, daysStr] = scheduleParts;
    const index = parseInt(indexStr) - 1;
    const amount = parseFloat(amountStr);
    const days = parseInt(daysStr);

    if (isNaN(index) || index < 0) {
      return `❌ Invalid Meter Selection

Please choose a number from the list.
Example: SCHEDULE 1 5000 7`;
    }

    if (isNaN(amount) || amount < 100) {
      return `❌ Invalid Amount

Minimum is NGN 100.
Example: SCHEDULE 1 5000 7`;
    }

    if (isNaN(days) || days < 3) {
      return `❌ Invalid Days

Minimum is 3 days.
Example: SCHEDULE 1 5000 7`;
    }

    const meters = await prisma.savedMeter.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    if (index >= meters.length) {
      return `❌ Invalid Meter Selection

Please choose a number from the list.`;
    }

    const selectedMeter = meters[index];
    return await processSubscriptionWhatsApp(
      user,
      selectedMeter.meterNumber,
      selectedMeter.disco,
      amount,
      days,
      selectedMeter.meterType || "Prepaid"
    );
  }

  if (command === "SUBSCRIPTIONS" || command === "SCHEDULES") {
    return await getActiveSubscriptions(user.id);
  }

  if (command.startsWith("CANCEL") || command.startsWith("UNSUBSCRIBE")) {
    const cancelParts = body.split(" ").filter(p => p.length > 0);
    if (cancelParts.length < 2) {
      return `❌ Missing Subscription ID

To cancel a subscription:
CANCEL [subscription_id]

Example: CANCEL SUB-123456

To see your active subscriptions: SUBSCRIPTIONS`;
    }
    const subscriptionId = cancelParts[1];
    return await cancelSubscription(user.id, subscriptionId);
  }

  // ========== EDUCATION ==========
  if (command.startsWith("EDU") || command === "EDUCATION" || 
      command.startsWith("WAEC") || command.startsWith("JAMB") || 
      command.startsWith("NECO") || command === "WAEC-RESULT") {
    
    const eduParts = body.split(" ").filter(p => p.length > 0);
    const cmd = eduParts[0].toUpperCase();
    
    if (cmd === "EDU" || cmd === "EDUCATION") {
      const productsList = await getAvailableEducationProducts();
      return `🎓 Education Services:

${productsList}

To purchase:
EDU [product] [quantity]

Examples:
EDU WAEC 2
EDU JAMB 1
EDU NECO 3

Available products: WAEC, JAMB, NECO, WAEC-RESULT`;
    }

    if (eduParts.length >= 3 && (cmd === "EDU" || cmd === "EDUCATION")) {
      const product = eduParts[1].toUpperCase();
      const quantity = parseInt(eduParts[2]);
      if (isNaN(quantity) || quantity < 1) {
        return `❌ Invalid Quantity

Please enter a number greater than 0.
Example: EDU WAEC 2`;
      }
      return await processEducationPurchaseWhatsApp(user, product, quantity);
    }

    if (eduParts.length >= 2 && ["WAEC", "JAMB", "NECO", "WAEC-RESULT"].includes(cmd)) {
      const quantity = parseInt(eduParts[1]);
      if (isNaN(quantity) || quantity < 1) {
        return `❌ Invalid Quantity

Please enter a number greater than 0.
Example: WAEC 2`;
      }
      return await processEducationPurchaseWhatsApp(user, cmd, quantity);
    }

    const productsList = await getAvailableEducationProducts();
    return `🎓 Education Services:

${productsList}

To purchase:
EDU [product] [quantity]

Examples:
EDU WAEC 2
EDU JAMB 1
EDU NECO 3
WAEC 2
JAMB 1

Available products: WAEC, JAMB, NECO, WAEC-RESULT`;
  }

  // ========== TRANSACTIONS ==========
  if (command === "TRANSACTIONS" || command === "TXNS" || command === "HISTORY") {
    return await getTransactionHistory(user.id);
  }

  // ========== REFERRAL ==========
  if (command === "REFERRAL" || command === "REF") {
    const referralCode = user.referralCode || "N/A";
    const link = `${getAppUrl()}/auth?ref=${referralCode}`;
    const count = await prisma.referral.count({
      where: { referrerId: user.id },
    });
    
    return `👥 Your Referral Program

Referral Code: ${referralCode}
Total Referrals: ${count}
Referral Bonus: NGN 50 per signup

Share your link:
${link}

Copy this link and share with friends to earn rewards!`;
  }

  // ========== PIN ==========
  if (command === "PIN" || command.startsWith("PIN ")) {
    return await handlePinCommand(user, parts);
  }

  // ========== UNKNOWN COMMAND ==========
  return `❓ Unknown Command

I didn't understand that command.

Type HELP to see all available commands.

Or try:
BALANCE - Check your wallet
AIRTIME [amount] - Buy airtime for YOUR number (no PIN)
AIRTIME [phone] [amount] - Buy airtime for others (PIN required)
DATA [plan] - Buy data for YOUR number (no PIN)
DATA [phone] [plan] - Buy data for others (PIN required)
ELECTRIC - See saved meters
ELECTRIC [amount] - Buy electricity (your saved meter - no PIN)
ELECTRIC [meter] [disco] [amount] - Buy for any meter (PIN required)
ADDMETER [meter] [disco] [name] - Save a meter
ADDDECODER [decoder] [provider] [name] - Save a decoder
METERS - List your saved meters
DECODERS - List your saved decoders
SCHEDULE [index] [amount] [days] - Schedule electricity
SUBSCRIPTIONS - View active schedules
EDU [product] [quantity] - Buy education pins
TRANSACTIONS - View your history
REFERRAL - Get your referral link
PIN - Set up transaction PIN`;
}

// ============================================================
// HELP FUNCTION
// ============================================================

function getHelpMessage(user: any): string {
  return `ℹ️ Bilscore WhatsApp Commands

💰 Financial:
BALANCE - Check wallet balance
TRANSACTIONS - View transaction history
PIN [code] - Set transaction PIN

📱 Airtime & Data:
AIRTIME [amount] - For YOUR number (no PIN)
AIRTIME [phone] [amount] - For others (PIN required)
DATA [plan] - For YOUR number (no PIN)
DATA [phone] [plan] - For others (PIN required)

⚡ Electricity:
ELECTRIC - Show saved meters
ELECTRIC [amount] - Buy for saved meter (no PIN)
ELECTRIC [index] [amount] - Buy for saved meter (no PIN)
ELECTRIC [meter] [disco] [amount] - Buy for any meter (PIN required)
ADDMETER [meter] [disco] [name] - Add meter
METERS - List saved meters
DISCOS - Show available DisCos
SCHEDULE [index] [amount] [days] - Schedule electricity
SUBSCRIPTIONS - View active schedules
CANCEL [id] - Cancel subscription

📺 Cable TV (Your decoders - no PIN):
CABLE - Show saved decoders
CABLE [index] [package] - Subscribe
ADDDECODER [decoder] [provider] [name] - Add decoder
DECODERS - List saved decoders
PACKAGES [provider] - Show packages

🎓 Education:
EDU [product] [quantity] - Buy education pins
WAEC [quantity] - Buy WAEC pins
JAMB [quantity] - Buy JAMB pins
NECO [quantity] - Buy NECO pins

👥 Referral:
REFERRAL - Get referral link

Need help? Visit: ${getAppUrl()}/support`;
}

// ============================================================
// TRANSACTION HISTORY
// ============================================================

async function getTransactionHistory(userId: string): Promise<string> {
  const transactions = await prisma.vtuTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (transactions.length === 0) {
    return `📊 No Transactions

No transactions found.

Start using Bilscore today!
Type HELP to see available commands.`;
  }

  let message = "📊 Recent Transactions:\n\n";
  transactions.forEach((tx, i) => {
    const status = tx.status === "SUCCESS" ? "✅" : tx.status === "PENDING" ? "⏳" : "❌";
    const type = tx.transactionType.replace("_", " ");
    message += `${i + 1}. ${status} ${type}\n`;
    message += `   Amount: NGN ${Number(tx.amount).toFixed(2)}\n`;
    message += `   ${new Date(tx.createdAt).toLocaleDateString()}\n\n`;
  });

  const total = await prisma.vtuTransaction.count({
    where: { userId },
  });

  message += `Total: ${total} transactions`;
  return message;
}

// ============================================================
// PIN HANDLER
// ============================================================

async function handlePinCommand(user: any, parts: string[]): Promise<string> {
  if (parts.length < 2) {
    return `🔐 Set Transaction PIN

To set up your transaction PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

Your PIN will be encrypted and used for transaction verification.`;
  }

  const pin = parts[1];
  if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return `❌ Invalid PIN Format

Please use 4-6 digits only.
Example: PIN 1234`;
  }

  if (user.pinHash) {
    return `ℹ️ PIN Already Set

You already have a transaction PIN set.
To change your PIN, please use the Bilscore mobile app or website.

${getAppUrl()}/profile`;
  }

  const hashedPin = await hash(pin, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pinHash: hashedPin,
      pinAttempts: 0,
      pinLockedUntil: null,
    },
  });

  return `✅ PIN Set Successfully!

Your PIN has been encrypted and saved.
You'll need this PIN for all transactions.

PIN: **** (hidden for security)

⚠️ Keep your PIN safe and never share it with anyone.

You can change your PIN anytime in the Bilscore app.`;
}