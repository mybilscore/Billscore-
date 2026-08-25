// app/api/twilio/webhook/route.ts - COMPLETE UPDATED VERSION WITH SESSION TRACKING

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
// SESSION STORAGE FOR COMMAND CONTEXT
// ============================================================

// Store user's last command context
const userSessions: Map<string, { 
  command: string, 
  phoneNumber: string, 
  network: string,
  isOwnNumber: boolean,
  timestamp: number 
}> = new Map();

const SESSION_TIMEOUT = 300000; // 5 minutes

// ============================================================
// CACHE FOR NETWORK-SPECIFIC DATA PLANS
// ============================================================

let cachedNetworkPlans: Map<string, Map<number, { planData: any, provider: string, network: string }>> = new Map();
let cachedNetworkMessages: Map<string, string> = new Map();
let networkPlanCacheTime: Map<string, number> = new Map();
const CACHE_TTL = 300000; // 5 minutes

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

function generateRandomPin(): string {
  const pin = Math.floor(1000 + Math.random() * 9000);
  return pin.toString();
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
// NETWORK DETECTION - Complete Nigerian prefixes
// ============================================================

function detectNetworkFromPhone(phoneNumber: string): string | null {
  if (!phoneNumber) return null;
  
  let cleanNumber = phoneNumber.replace(/\D/g, "");
  
  console.log(`[Network Detection] Original: ${phoneNumber}, Cleaned: ${cleanNumber}`);
  
  if (cleanNumber.startsWith("234")) {
    cleanNumber = cleanNumber.substring(3);
  }
  
  if (!cleanNumber.startsWith("0")) {
    if (cleanNumber.length >= 10) {
      cleanNumber = '0' + cleanNumber;
    }
  }
  
  if (cleanNumber.length < 11) {
    console.warn(`[Network Detection] Phone number too short: ${cleanNumber}`);
    return null;
  }
  
  const firstFour = cleanNumber.substring(0, 4);
  const firstFive = cleanNumber.substring(0, 5);
  const firstThree = cleanNumber.substring(0, 3);
  
  console.log(`[Network Detection] First 3: ${firstThree}, First 4: ${firstFour}, First 5: ${firstFive}`);
  
  if (firstFive === "07025" || firstFive === "07026") {
    console.log(`[Network Detection] Detected MTN (Visafone) from prefix: ${firstFive}`);
    return "MTN";
  }
  
  const mtnPrefixes = [
    '0701', '0703', '0704', '0706', '0801', '0803', '0804', '0806',
    '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916'
  ];
  if (mtnPrefixes.includes(firstFour)) {
    console.log(`[Network Detection] Detected MTN from prefix: ${firstFour}`);
    return "MTN";
  }
  
  const airtelPrefixes = [
    '0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904',
    '0907', '0911', '0912'
  ];
  if (airtelPrefixes.includes(firstFour)) {
    console.log(`[Network Detection] Detected AIRTEL from prefix: ${firstFour}`);
    return "AIRTEL";
  }
  
  const gloPrefixes = [
    '0705', '0805', '0807', '0811', '0815', '0905', '0915'
  ];
  if (gloPrefixes.includes(firstFour)) {
    console.log(`[Network Detection] Detected GLO from prefix: ${firstFour}`);
    return "GLO";
  }
  
  const nineMobilePrefixes = [
    '0809', '0817', '0818', '0908', '0909'
  ];
  if (nineMobilePrefixes.includes(firstFour)) {
    console.log(`[Network Detection] Detected 9MOBILE from prefix: ${firstFour}`);
    return "9MOBILE";
  }
  
  if (firstThree === "070" || firstThree === "080" || firstThree === "081" ||
      firstThree === "090" || firstThree === "091") {
    console.log(`[Network Detection] Defaulting to MTN from prefix: ${firstThree}`);
    return "MTN";
  }
  
  console.warn(`[Network Detection] Unknown network for phone: ${phoneNumber} (cleaned: ${cleanNumber})`);
  return null;
}

// ============================================================
// NORMALIZE PHONE NUMBER - Keep leading zero
// ============================================================

function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return "";
  
  let clean = phoneNumber.replace(/\D/g, '');
  
  console.log(`[Normalize] Original: ${phoneNumber}, Cleaned: ${clean}`);
  
  if (clean.startsWith('234')) {
    clean = clean.substring(3);
  }
  
  if (!clean.startsWith('0')) {
    if (clean.length === 10) {
      clean = '0' + clean;
    } else if (clean.length > 10) {
      clean = '0' + clean.substring(clean.length - 10);
    } else if (clean.length < 10) {
      clean = '0' + clean.padStart(10, '0');
    }
  }
  
  if (clean.length > 11) {
    clean = clean.substring(0, 11);
  }
  
  console.log(`[Normalize] Result: ${clean}`);
  return clean;
}

// ============================================================
// ERROR FORMATTING
// ============================================================

function formatErrorMessage(error: any, accountInfo?: { accountNumber?: string, accountName?: string }): string {
  let errorMessage = '';
  let errorCode = '';
  let errorDetails: any = {};
  
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error) {
    errorMessage = error?.message || error?.error || error?.response_description || error?.statusText || '';
    errorCode = error?.code || error?.status || error?.response_code || '';
    errorDetails = error?.details || error?.data || error?.content || error?.metadata || {};
    
    if (error?.vendorResponse) {
      const vResp = error.vendorResponse;
      errorMessage = vResp?.response_description || vResp?.message || errorMessage;
      errorCode = vResp?.code || errorCode;
      errorDetails = vResp?.content || vResp?.data || errorDetails;
    }
    
    if (error?.vendorErrors && Array.isArray(error.vendorErrors) && error.vendorErrors.length > 0) {
      const lastError = error.vendorErrors[error.vendorErrors.length - 1];
      if (lastError) {
        errorMessage = lastError.message || lastError.error || errorMessage;
        errorCode = lastError.code || lastError.status || errorCode;
        errorDetails = lastError.details || lastError.data || errorDetails;
      }
    }
    
    if (error?.meta) {
      errorDetails = { ...errorDetails, ...error.meta };
    }
    
    if (error?.response) {
      const resp = error.response;
      errorMessage = resp?.statusText || resp?.data?.message || errorMessage;
      errorCode = resp?.status || resp?.statusCode || errorCode;
    }
  }
  
  if (!errorMessage || errorMessage === '') {
    errorMessage = 'An unknown error occurred';
  }
  
  errorMessage = errorMessage.replace(/^Error:\s*/, '').trim();
  
  const isSandbox = process.env.NODE_ENV !== 'production' || 
                    process.env.VTPASS_ENVIRONMENT === 'sandbox' ||
                    process.env.SANDBOX_MODE === 'true' ||
                    process.env.NODE_ENV === 'development';
  
  if (errorCode === '000' || errorMessage.includes('success') || errorMessage.includes('Successful')) {
    return `SUCCESS: Transaction successful! ${errorMessage}`;
  }
  
  if (errorCode === '016' || errorMessage.includes('016') || 
      errorMessage.toUpperCase().includes('TRANSACTION FAILED') ||
      errorMessage.toUpperCase().includes('FAILED')) {
    if (isSandbox) {
      return `SANDBOX MODE: Transaction simulation failed.

Error: ${errorMessage}
Code: ${errorCode}

This is expected in test mode.
Your wallet balance was NOT debited.

Try buying airtime for your own number:
AIRTIME 100

For production, this would be a real transaction.`;
    }
    return `Transaction Failed

${errorMessage}

Possible reasons:
- Insufficient vendor balance
- Invalid phone number or meter number
- Network issues with the service provider
- Service temporarily unavailable

Please try again or contact support.
Reference: ${errorCode}`;
  }
  
  if (errorCode === '015' || errorMessage.toUpperCase().includes('DUPLICATE') || 
      errorMessage.toUpperCase().includes('ALREADY PROCESSED')) {
    return `Duplicate Transaction Detected

This transaction appears to have been processed already.
Please wait a moment and try again.

If you think this is a mistake, contact support with:
Reference: ${errorCode}`;
  }
  
  if (errorCode === '009' || errorMessage.toUpperCase().includes('INSUFFICIENT') || 
      errorMessage.toUpperCase().includes('INSUFFICIENT BALANCE')) {
    const accountInfoStr = accountInfo?.accountNumber ? `\nYour Account: ${accountInfo.accountNumber}` : '';
    return `Insufficient Balance

The service provider has insufficient balance to complete this transaction.
${accountInfoStr}

Please try again later or contact support.
Reference: ${errorCode}`;
  }
  
  if (errorCode === '012' || errorMessage.toUpperCase().includes('UNAVAILABLE') || 
      errorMessage.toUpperCase().includes('SERVICE UNAVAILABLE')) {
    return `Service Unavailable

The service is currently unavailable.
Please try again in a few minutes.

Reference: ${errorCode}`;
  }
  
  if (errorCode === '013' || errorMessage.toUpperCase().includes('INVALID PHONE') || 
      errorMessage.toUpperCase().includes('INVALID PHONE NUMBER')) {
    return `Invalid Phone Number

The phone number you entered is invalid.
Please check and try again.

Format: 08012345678 or +2348012345678
Example: AIRTIME 08012345678 500

Reference: ${errorCode}`;
  }
  
  if (errorMessage.toLowerCase().includes('all vendors failed') || 
      errorMessage.toLowerCase().includes('all providers failed') ||
      errorMessage.toLowerCase().includes('no vendor available')) {
    if (isSandbox) {
      return `SANDBOX MODE: All Service Providers Failed

All available vendors failed to process this transaction.
This is expected in test mode.

Vendors in sandbox:
- VTPASS (simulation mode)
- BILAL_SADA (simulation mode)
- LEGITDATAWAY (simulation mode)

Your wallet was NOT debited.
Try: AIRTIME 100 (for your own number)

Error: ${errorMessage}`;
    }
    return `All Service Providers Unavailable

None of our service providers could process your request.
This is a temporary issue.

Please try again in a few minutes.
Your wallet balance was not debited.

If this persists, contact support.`;
  }
  
  if (isSandbox) {
    return `SANDBOX MODE: ${errorMessage.substring(0, 200)}

Code: ${errorCode || 'Unknown'}

This is expected in test mode.
Your wallet was NOT debited.

Try: AIRTIME 100 (for your own number)

If you're testing, this is normal behavior.
In production, this would be a real transaction.`;
  }
  
  return `Transaction Failed

${errorMessage.substring(0, 200)}

Error Code: ${errorCode || 'Unknown'}

Please try again or contact support.
If you need help, type HELP for available commands.

Reference: ${errorCode || 'Unknown Error'}`;
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
// METER VERIFICATION USING API ROUTE
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
// GET AVAILABLE PLANS FOR A SPECIFIC NETWORK WITH INDEXING
// ============================================================

async function getAvailablePlansForNetwork(network: string, phoneNumber?: string): Promise<string> {
  try {
    const cacheKey = network.toUpperCase();
    if (networkPlanCacheTime.get(cacheKey) && 
        Date.now() - (networkPlanCacheTime.get(cacheKey) || 0) < CACHE_TTL && 
        cachedNetworkMessages.has(cacheKey)) {
      console.log(`[WhatsApp] Using cached plans for ${network}`);
      return cachedNetworkMessages.get(cacheKey)!;
    }
    
    const apiUrl = getApiUrl();
    // Use whatsapp=true to get only WhatsApp-enabled plans
    const url = `${apiUrl}/api/vendors/plans?serviceType=DATA&whatsapp=true`;
    
    console.log(`[WhatsApp] Fetching WhatsApp plans for ${network} from: ${url}`);
    
    const response = await fetch(url, {
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Bilscore-WhatsApp/1.0',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[WhatsApp] Failed to fetch WhatsApp plans: ${response.status}`);
      return getFallbackPlansForNetwork(network);
    }

    const result = await response.json();
    
    const planMap = new Map<number, { planData: any, provider: string, network: string }>();
    
    if (result.success && result.data?.plans) {
      const { plans } = result.data;
      let message = `Available Data Plans for ${network}:\n\n`;
      let index = 1;
      
      // Find the specific network provider from the WhatsApp plans
      const networkProvider = plans.find((p: any) => p.name.toLowerCase() === network.toLowerCase());
      
      if (!networkProvider) {
        return getFallbackPlansForNetwork(network);
      }
      
      const allPlans: any[] = [];
      for (const category of networkProvider.categories || []) {
        for (const plan of category.plans || []) {
          if (plan.price && plan.price > 0) {
            const priceDisplay = `NGN ${Number(plan.price).toFixed(0)}`;
            const validityDisplay = plan.validity ? ` (${plan.validity})` : '';
            
            planMap.set(index, {
              planData: plan,
              provider: networkProvider.name,
              network: network,
            });
            
            allPlans.push({
              data: plan.data,
              price: priceDisplay,
              validity: validityDisplay,
              planCode: plan.planCode || plan.data,
              index: index,
              id: plan.id,
              amountMB: plan.amountMB,
            });
            index++;
          }
        }
      }
      
      // Display WhatsApp-enabled plans
      if (allPlans.length > 0) {
        allPlans.forEach(p => {
          message += `  ${p.index}. ${p.data} - ${p.price}${p.validity}\n`;
        });
      } else {
        message += `  No WhatsApp plans available for ${network}\n`;
        message += `  Reply DATA ALL to see all plans on our website\n`;
      }
      
      cachedNetworkPlans.set(cacheKey, planMap);
      cachedNetworkMessages.set(cacheKey, message + `\nTo buy: DATA [index]\nExample: DATA 1\nFor another number: DATA [phone] [index]`);
      networkPlanCacheTime.set(cacheKey, Date.now());
      
      console.log(`[WhatsApp] Cached ${planMap.size} WhatsApp plans for ${network}`);
      
      return cachedNetworkMessages.get(cacheKey)!;
    }

    console.warn(`[WhatsApp] No WhatsApp plans found for ${network}, using fallback`);
    return getFallbackPlansForNetwork(network);

  } catch (error) {
    console.error(`[WhatsApp] Error fetching WhatsApp plans for ${network}:`, error);
    return getFallbackPlansForNetwork(network);
  }
}

// ============================================================
// FALLBACK PLANS FOR SPECIFIC NETWORK
// ============================================================

function getFallbackPlansForNetwork(network: string): string {
  const fallbackPlans: Record<string, any[]> = {
    'MTN': [
      { data: "1GB", price: 300, validity: "30 days" },
      { data: "2GB", price: 500, validity: "30 days" },
      { data: "5GB", price: 1200, validity: "30 days" },
      { data: "10GB", price: 2000, validity: "30 days" },
    ],
    'GLO': [
      { data: "1GB", price: 250, validity: "30 days" },
      { data: "2GB", price: 450, validity: "30 days" },
      { data: "3GB", price: 600, validity: "30 days" },
      { data: "5GB", price: 900, validity: "30 days" },
    ],
    'AIRTEL': [
      { data: "1GB", price: 300, validity: "30 days" },
      { data: "2GB", price: 500, validity: "30 days" },
      { data: "3GB", price: 700, validity: "30 days" },
      { data: "5GB", price: 1100, validity: "30 days" },
    ],
    '9MOBILE': [
      { data: "1GB", price: 280, validity: "30 days" },
      { data: "2GB", price: 480, validity: "30 days" },
      { data: "5GB", price: 1000, validity: "30 days" },
      { data: "10GB", price: 1800, validity: "30 days" },
    ],
  };

  const plans = fallbackPlans[network.toUpperCase()] || fallbackPlans['MTN'];
  
  const cacheKey = network.toUpperCase();
  const planMap = new Map<number, { planData: any, provider: string, network: string }>();
  
  let message = `Available Data Plans for ${network}:\n\n`;
  plans.forEach((plan, index) => {
    const idx = index + 1;
    planMap.set(idx, {
      planData: {
        data: plan.data,
        price: plan.price,
        validity: plan.validity,
        planCode: plan.data,
        amountMB: plan.data.includes('GB') ? parseInt(plan.data) * 1024 : parseInt(plan.data),
      },
      provider: network,
      network: network,
    });
    message += `  ${idx}. ${plan.data} - NGN ${plan.price} (${plan.validity})\n`;
  });
  
  cachedNetworkPlans.set(cacheKey, planMap);
  cachedNetworkMessages.set(cacheKey, message + `\nTo buy: DATA [index]\nExample: DATA 1\nFor another number: DATA [phone] [index]`);
  networkPlanCacheTime.set(cacheKey, Date.now());
  
  return cachedNetworkMessages.get(cacheKey)!;
}

// ============================================================
// GET PLAN BY INDEX FOR SPECIFIC NETWORK
// ============================================================

async function getPlanByIndexForNetwork(network: string, indexNumber: number): Promise<{ planData: any, provider: string, network: string } | null> {
  const cacheKey = network.toUpperCase();
  
  if (!cachedNetworkPlans.has(cacheKey) || 
      Date.now() - (networkPlanCacheTime.get(cacheKey) || 0) >= CACHE_TTL) {
    console.log(`[WhatsApp] No cached plans for ${network} or cache expired, fetching...`);
    await getAvailablePlansForNetwork(network);
  }
  
  const planMap = cachedNetworkPlans.get(cacheKey);
  if (planMap) {
    const plan = planMap.get(indexNumber);
    if (plan) {
      console.log(`[WhatsApp] Found plan at index ${indexNumber} for ${network}: ${plan.planData.data}`);
      return plan;
    }
  }
  
  console.log(`[WhatsApp] No plan found at index ${indexNumber} for ${network}`);
  return null;
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

      if (email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: email },
          select: { email: true },
        });
        if (existingEmail) {
          return `Email Already Registered

The email "${email}" is already registered with Bilscore.

If this is your email, please login at:
${getAppUrl()}/auth

Or try registering with a different email.
Example: REG ${fullName} ${fullName.toLowerCase().replace(/\s/g, '')}@email.com ${username}

Type HELP for more options.`;
        }
      }

      if (phone) {
        const existingPhone = await prisma.user.findFirst({
          where: { phone: phone },
          select: { phone: true },
        });
        if (existingPhone) {
          return `Phone Number Already Registered

The phone number ${phone} is already registered with Bilscore.

If this is your phone, please login at:
${getAppUrl()}/auth

Or contact support if you need assistance.
Type HELP for more options.`;
        }
      }

      if (username) {
        const existingUsername = await prisma.user.findUnique({
          where: { username: username },
          select: { username: true },
        });
        if (existingUsername) {
          return `Username Already Taken

The username "${username}" is already taken.
Please choose another username.

Example: REG ${fullName} ${email} ${username}123
Or: REG ${fullName} ${email} ${username}_${Math.random().toString(36).substring(2, 5)}`;
        }
      }

      const defaultPassword = `BIL${Math.random().toString(36).substring(2, 10).toUpperCase()}!`;
      const defaultPin = generateRandomPin();
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

  } catch (error: any) {
    console.error("[WhatsApp] Registration error:", error);
    
    if (error.code === "P2002") {
      const target = error.meta?.target || [];
      let field = "";
      let value = "";
      
      if (target.includes("email")) {
        field = "Email";
        value = error.meta?.target_value || "";
        return `Email Already Registered

The email "${value}" is already registered with Bilscore.

If this is your email, please login at:
${getAppUrl()}/auth

Or try registering with a different email.
Type HELP for more options.`;
      }
      
      if (target.includes("phone")) {
        field = "Phone number";
        value = phone;
        return `Phone Number Already Registered

The phone number ${value} is already registered with Bilscore.

If this is your phone, please login at:
${getAppUrl()}/auth

Or contact support if you need assistance.
Type HELP for more options.`;
      }
      
      if (target.includes("username")) {
        field = "Username";
        value = error.meta?.target_value || "";
        return `Username Already Taken

The username "${value}" is already taken.
Please choose another username.

Example: REG ${fullName} ${email} ${value}123
Or: REG ${fullName} ${email} ${value}_${Math.random().toString(36).substring(2, 5)}

Type HELP for more options.`;
      }
      
      return `Registration Failed

This account information is already registered.
Please check your details and try again.

If you already have an account, please login at:
${getAppUrl()}/auth

Type HELP for more options.`;
    }
    
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
Meter Verified!
Customer: ${customerName || "Unknown"}
Meter: ${verificationResult.data?.meterNumber || meterNumber}
Status: ${meterStatus || "ACTIVE"}`;
    } else {
      verificationMessage = `
Could not verify meter: ${verificationResult.error || "Unknown error"}
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
      
      return `Meter updated successfully!${verificationMessage}

Meter Details:
Meter: ${meterNumber}
DisCo: ${discoUpper}
Name: ${name || existing.name}
${customerName ? `Customer: ${customerName}` : ''}
${customerAddress ? `Address: ${customerAddress}` : ''}
${customerPhone ? `Phone: ${customerPhone}` : ''}
${customerEmail ? `Email: ${customerEmail}` : ''}

Quick Buy QR Code:
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

    return `Meter added successfully!${verificationMessage}

Meter Details:
Meter: ${meterNumber}
DisCo: ${discoUpper}
Name: ${name || `${discoUpper} Meter`}
${customerName ? `Customer: ${customerName}` : ''}
${customerAddress ? `Address: ${customerAddress}` : ''}
${customerPhone ? `Phone: ${customerPhone}` : ''}
${customerEmail ? `Email: ${customerEmail}` : ''}

Quick Buy QR Code:
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
Decoder Verified!
Customer: ${customerName || "Unknown"}
Decoder: ${verificationResult.data?.smartCardNumber || decoderNumber}
Status: ${decoderStatus || "ACTIVE"}`;
    } else {
      verificationMessage = `
Could not verify decoder: ${verificationResult.error || "Unknown error"}
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
      return `Decoder updated successfully!${verificationMessage}

Decoder Details:
Decoder: ${decoderNumber}
Provider: ${providerUpper}
Name: ${name || existing.name}
${customerName ? `Customer: ${customerName}` : ''}
${customerAddress ? `Address: ${customerAddress}` : ''}
${customerPhone ? `Phone: ${customerPhone}` : ''}
${customerEmail ? `Email: ${customerEmail}` : ''}

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

    return `Decoder added successfully!${verificationMessage}

Decoder Details:
Decoder: ${decoderNumber}
Provider: ${providerUpper}
Name: ${name || `${providerUpper} Decoder`}
${customerName ? `Customer: ${customerName}` : ''}
${customerAddress ? `Address: ${customerAddress}` : ''}
${customerPhone ? `Phone: ${customerPhone}` : ''}
${customerEmail ? `Email: ${customerEmail}` : ''}

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
      message += `   Customer: ${meter.customerName}\n`;
    }
    if (meter.customerAddress) {
      message += `   Address: ${meter.customerAddress}\n`;
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
      message += `   Customer: ${decoder.customerName}\n`;
    }
    if (decoder.customerAddress) {
      message += `   Address: ${decoder.customerAddress}\n`;
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
      return `Insufficient Balance

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

      const successMessage = `Airtime Purchase Successful!

Phone: ${phoneNumber}
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
${token ? `Token: ${token}` : ''}
Reference: ${transaction.id.substring(0, 10)}

Thank you for using Bilscore!`;

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
      return `PIN Not Set

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
      return `Insufficient Balance

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

    return `Airtime Purchase Requires PIN Confirmation!

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
// DATA PURCHASE - NO PIN (OWN NUMBER) - USING PLAN DATA DIRECTLY
// ============================================================

async function processDataPurchaseDirectWithPlan(
  user: any, 
  phoneNumber: string, 
  planData: any,
  provider: string,
  detectedNetwork: string
): Promise<string> {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return formatErrorMessage({ message: "Wallet not found. Please contact support." });
    }

    const amount = Number(planData.price);
    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `Insufficient Balance

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
        networkPlan: planData.planCode || planData.data,
        status: TransactionStatus.PENDING,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "WhatsApp",
          service: "DATA",
          timestamp: new Date().toISOString(),
          network: detectedNetwork,
          networkEnum: networkEnum,
          planData: planData,
          provider: provider,
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
          planCode: planData.planCode || planData.data,
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
          planQuery: planData.data,
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

      const successMessage = `Data Purchase Successful!

Phone: ${phoneNumber}
Plan: ${dataDisplay} (${provider})
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
${token ? `Token: ${token}` : ''}
Reference: ${transaction.id.substring(0, 10)}

Thank you for using Bilscore!`;

      return successMessage;
    } catch (vendorError: any) {
      console.error("[DATA] Vendor error:", vendorError);
      
      const errorDetails = {
        message: vendorError?.message || "Vendor error",
        code: vendorError?.code || vendorError?.response_description || 'UNKNOWN',
        amount: amount,
        phoneNumber: phoneNumber,
        network: detectedNetwork,
        planQuery: planData.data,
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
// DATA PURCHASE - WITH PIN (EXTERNAL NUMBER) - USING PLAN DATA DIRECTLY
// ============================================================

async function processDataPurchaseWithPinWithPlan(
  user: any, 
  phoneNumber: string, 
  planData: any,
  provider: string,
  detectedNetwork: string
): Promise<string> {
  try {
    if (!user.pinHash) {
      return `PIN Not Set

You need to set a transaction PIN first to buy data for other numbers.

To set your PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

For your own number, just use: DATA 1 (no PIN needed)`;
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return formatErrorMessage({ message: "Wallet not found. Please contact support." });
    }

    const amount = Number(planData.price);
    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `Insufficient Balance

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
        networkPlan: planData.planCode || planData.data,
        status: TransactionStatus.PENDING,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "WhatsApp",
          service: "DATA",
          timestamp: new Date().toISOString(),
          network: detectedNetwork,
          networkEnum: networkEnum,
          planData: planData,
          provider: provider,
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
          planData: planData,
        },
      },
    });

    const appUrl = getAppUrl();
    const validationLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

    const dataDisplay = planData.data || `${planData.amountMB || 0}MB`;

    return `Data Purchase Requires PIN Confirmation!

Phone: ${phoneNumber}
Plan: ${dataDisplay} (${provider})
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
Reference: ${transaction.id.substring(0, 10)}

To complete this purchase, please confirm your PIN:

${validationLink}

This link expires in 5 minutes.
Your PIN is secure and will not be shared via WhatsApp.

For your own number, use: DATA 1 (no PIN needed)`;
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
      return `Minimum Amount: NGN 1,000

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
      return `Insufficient Balance

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

        const successMessage = `Electricity Purchase Successful!

Meter: ${meterNumber}
DisCo: ${discoCode}
Amount: NGN ${amount.toFixed(2)}
${customerName ? `Customer: ${customerName}` : ''}
${customerAddress ? `Address: ${customerAddress}` : ''}
${token ? `Token: ${token}` : ''}
Reference: ${transaction.id.substring(0, 10)}

Thank you for using Bilscore!`;

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
      return `Minimum Amount: NGN 1,000

Electricity purchase requires a minimum of NGN 1,000.
Please try again with a higher amount.

Example: ELECTRIC 1234567890 ABUJA 1000`;
    }

    if (!user.pinHash) {
      return `PIN Not Set

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
      return `Insufficient Balance

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

    return `Electricity Purchase Requires PIN Confirmation!

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
      return `Package Not Found

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
      return `Insufficient Balance

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

      const successMessage = `Cable Subscription Successful!

Decoder: ${decoderNumber}
Provider: ${provider}
Package: ${packageData.name}
Amount: NGN ${amount.toFixed(2)}
${token ? `Token: ${token}` : ''}
Reference: ${transaction.id.substring(0, 10)}

Your subscription has been activated. Enjoy!
Thank you for using Bilscore!`;

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
      return `PIN Not Set

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
      return `Invalid Product: ${productType}

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
      return `Insufficient Balance

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

    return `Education Purchase Requires PIN Confirmation!

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
      return `PIN Not Set

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
      return `Insufficient Balance

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
      return `Invalid DisCo: ${discoCode}

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

    return `Electricity Subscription Requires PIN Confirmation!

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
    // Clear any stored session
    userSessions.delete(user.id);
    return getHelpMessage(user);
  }

  // ========== REGISTER ==========
  if (command.startsWith("REG") || command === "REGISTER" || command === "SIGNUP" || command === "JOIN") {
    userSessions.delete(user.id);
    return `You are already registered with Bilscore!

Registered name: ${user.fullName}
Wallet Balance: NGN ${Number(user.wallet?.walletBalance || 0).toFixed(2)}

Type HELP to see available commands.`;
  }

  // ========== BALANCE ==========
  if (command === "BALANCE" || command === "BAL" || command === "WALLET") {
    userSessions.delete(user.id);
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

    return `Your Bilscore Balance: NGN ${Number(balance).toFixed(2)}
Account Name: ${wallet?.accountName || user.fullName}
Account Number: ${wallet?.accountNumber || 'N/A'}

Quick Stats:
Total Transactions: ${totalTxns}
Referrals: ${referrals}
Wallet Status: ${wallet?.isActive ? "Active" : "Inactive"}

Reply with HELP for available commands.`;
  }

  // ========== DATA ALL - Show pricing link ==========
  if (command === "DATA ALL") {
    userSessions.delete(user.id);
    const pricingUrl = "https://bilscore.com/pricing";
    return `All Data Plans & Pricing

View our complete data pricing list at:
${pricingUrl}

You can also buy data directly via WhatsApp:
DATA [index] - For YOUR number (no PIN required)
DATA [phone] [index] - For another number (PIN required)

Example: DATA 1
Example: DATA 08012345678 1

Type DATA to see available plans for your network.`;
  }

  // ============================================================
  // DATA - WITH CORRECT NETWORK DETECTION, INDEX SUPPORT, AND SESSIONS
  // ============================================================
  if (command.startsWith("DATA") || command.startsWith("DATA ")) {
    let targetPhone: string;
    let planQuery: string;
    let isOwnNumber = false;
    
    // ============================================================
    // CASE 0: Just an index number (e.g., "1")
    // ============================================================
    if (parts.length === 1 && /^\d+$/.test(command)) {
      // Check if user has a recent DATA context
      const session = userSessions.get(user.id);
      
      if (session && session.command === 'DATA' && (Date.now() - session.timestamp) < SESSION_TIMEOUT) {
        // Use the stored context
        targetPhone = session.phoneNumber;
        planQuery = command;
        isOwnNumber = session.isOwnNumber;
        
        console.log(`[DATA] Using session context: ${targetPhone}, network: ${session.network}`);
      } else {
        // No session, treat as "DATA" command
        const normalizedUserPhone = normalizePhoneNumber(user.phone);
        const detectedNetwork = detectNetworkFromPhone(normalizedUserPhone);
        
        if (!detectedNetwork) {
          return `Could Not Detect Your Network

Please ensure your phone number is correct.
You can also specify: DATA [phone] [index]

Example: DATA 08012345678 1`;
        }
        
        const plans = await getAvailablePlansForNetwork(detectedNetwork, user.phone);
        return `Buy Data

DATA [index] - For YOUR number (no PIN required)
DATA [phone] - Show plans for another number
DATA [phone] [index] - For another number (PIN required)

Example: DATA 1
Example: DATA 08012345678
Example: DATA 08012345678 1

${plans}`;
      }
    }
    
    // ============================================================
    // CASE 1: Only "DATA" - Show plans for user's network
    // ============================================================
    if (parts.length === 1 && command === "DATA") {
      const normalizedUserPhone = normalizePhoneNumber(user.phone);
      const detectedNetwork = detectNetworkFromPhone(normalizedUserPhone);
      
      if (!detectedNetwork) {
        return `Could Not Detect Your Network

Please ensure your phone number is correct.
You can also specify: DATA [phone] [index]

Example: DATA 08012345678 1`;
      }
      
      // Store session context
      userSessions.set(user.id, {
        command: 'DATA',
        phoneNumber: user.phone,
        network: detectedNetwork,
        isOwnNumber: true,
        timestamp: Date.now()
      });
      
      const plans = await getAvailablePlansForNetwork(detectedNetwork, user.phone);
      return `Buy Data

DATA [index] - For YOUR number (no PIN required)
DATA [phone] - Show plans for another number
DATA [phone] [index] - For another number (PIN required)

Example: DATA 1
Example: DATA 08012345678
Example: DATA 08012345678 1

${plans}`;
    }
    
    // ============================================================
    // CASE 2: "DATA [phone]" - Show plans for the target number
    // ============================================================
    if (parts.length === 2) {
      const firstParam = parts[1];
      
      // Check if it's a phone number (contains digits and maybe +)
      const isPhoneNumber = /^[\d+]{10,15}$/.test(firstParam.replace(/\s/g, ''));
      
      if (isPhoneNumber) {
        targetPhone = firstParam;
        const normalizedTarget = normalizePhoneNumber(targetPhone);
        const detectedNetwork = detectNetworkFromPhone(normalizedTarget);
        
        if (!detectedNetwork) {
          return `Could Not Detect Network

We couldn't detect the network for ${targetPhone}.
Please ensure the phone number is correct.

Supported formats:
- 08012345678 (11 digits with leading zero)
- +2348012345678 (with country code)
- 2348012345678 (without leading zero)`;
        }
        
        // Store session context
        const normalizedUser = normalizePhoneNumber(user.phone);
        const isOwnNumber = normalizedTarget === normalizedUser;
        
        userSessions.set(user.id, {
          command: 'DATA',
          phoneNumber: targetPhone,
          network: detectedNetwork,
          isOwnNumber: isOwnNumber,
          timestamp: Date.now()
        });
        
        const plans = await getAvailablePlansForNetwork(detectedNetwork, targetPhone);
        return `Buy Data for ${targetPhone}

DATA [index] - Buy for this number (${isOwnNumber ? 'no PIN' : 'PIN required'})
Just type the index number to buy

Example: 1

${plans}`;
      }
      
      // If not a phone number, treat as index for user's own number
      targetPhone = user.phone;
      planQuery = firstParam;
      isOwnNumber = true;
      
      // Store session context
      userSessions.set(user.id, {
        command: 'DATA',
        phoneNumber: targetPhone,
        network: detectNetworkFromPhone(normalizePhoneNumber(targetPhone)) || 'Unknown',
        isOwnNumber: isOwnNumber,
        timestamp: Date.now()
      });
    }
    
    // ============================================================
    // CASE 3: "DATA [phone] [index]" - Buy for target number
    // ============================================================
    if (parts.length >= 3) {
      targetPhone = parts[1];
      planQuery = parts.slice(2).join(' ');
      const normalizedTarget = normalizePhoneNumber(targetPhone);
      const normalizedUser = normalizePhoneNumber(user.phone);
      isOwnNumber = normalizedTarget === normalizedUser;
    }
    
    // ============================================================
    // PROCESS: Validate and execute purchase
    // ============================================================
    
    if (!targetPhone || targetPhone.length < 10) {
      targetPhone = user.phone;
      isOwnNumber = true;
    }
    
    const normalizedTarget = normalizePhoneNumber(targetPhone);
    const detectedNetwork = detectNetworkFromPhone(normalizedTarget);
    
    console.log(`[DATA] Target: ${targetPhone}, Normalized: ${normalizedTarget}, Network: ${detectedNetwork}, Query: ${planQuery}`);
    
    if (!detectedNetwork) {
      return `Could Not Detect Network

We couldn't detect the network for ${targetPhone}.
Please ensure the phone number is correct.

Supported formats:
- 08012345678 (11 digits with leading zero)
- +2348012345678 (with country code)
- 2348012345678 (without leading zero)`;
    }

    // If no plan query, show plans for the target network
    if (!planQuery) {
      const plans = await getAvailablePlansForNetwork(detectedNetwork, targetPhone);
      
      // Store session context
      userSessions.set(user.id, {
        command: 'DATA',
        phoneNumber: targetPhone,
        network: detectedNetwork,
        isOwnNumber: isOwnNumber,
        timestamp: Date.now()
      });
      
      if (isOwnNumber) {
        return `Buy Data for YOUR number (${targetPhone})

DATA [index] - Buy for your number (no PIN required)
Just type the index number to buy

Example: 1

${plans}`;
      } else {
        return `Buy Data for ${targetPhone}

DATA [index] - Buy for this number (PIN required)
Just type the index number to buy

Example: 1

${plans}`;
      }
    }

    // Check if planQuery is an index number
    const isIndex = /^\d+$/.test(planQuery);
    
    if (isIndex) {
      const indexNum = parseInt(planQuery);
      console.log(`[DATA] Looking up index ${indexNum} for network ${detectedNetwork}...`);
      
      // Get plan from cached mapping for this specific network
      const planInfo = await getPlanByIndexForNetwork(detectedNetwork, indexNum);
      
      if (planInfo) {
        // Use the plan data directly from the mapping
        const planData = planInfo.planData;
        const provider = planInfo.provider;
        
        console.log(`[DATA] Found plan: ${planData.data} (${provider}) for ${detectedNetwork}`);
        
        // Clear session after purchase
        userSessions.delete(user.id);
        
        // Use the plan data directly - no need to search again
        if (isOwnNumber) {
          return await processDataPurchaseDirectWithPlan(user, normalizedTarget, planData, provider, detectedNetwork);
        } else {
          return await processDataPurchaseWithPinWithPlan(user, normalizedTarget, planData, provider, detectedNetwork);
        }
      } else {
        // Index not found in mapping
        const plans = await getAvailablePlansForNetwork(detectedNetwork, targetPhone);
        return `Invalid Plan Index

No plan found with index ${indexNum} for ${detectedNetwork}.

${plans}`;
      }
    } else {
      // If not an index, show available plans
      const plans = await getAvailablePlansForNetwork(detectedNetwork, targetPhone);
      return `Invalid Input

Please use a plan index number.
Example: 1

${plans}`;
    }
  }

  // ============================================================
  // METER MANAGEMENT
  // ============================================================
  
  if (command.startsWith("ADDMETER") || command.startsWith("ADD METER")) {
    userSessions.delete(user.id);
    const addParts = body.split(" ").filter(p => p.length > 0);
    if (addParts.length < 4) {
      const discosList = await getAvailableDiscosForWhatsApp();
      return `Add Meter

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
    userSessions.delete(user.id);
    return await listMeters(user.id);
  }

  if (command.startsWith("DELETEMETER") || command.startsWith("DELETE METER")) {
    userSessions.delete(user.id);
    const deleteParts = body.split(" ").filter(p => p.length > 0);
    if (deleteParts.length < 2) {
      return `Missing Meter Number

Please specify the meter number to delete.
Example: DELETEMETER 1234567890`;
    }
    const meterNumber = deleteParts[1];
    return await deleteMeter(user.id, meterNumber);
  }

  if (command.startsWith("SETDEFAULTMETER") || command.startsWith("SET DEFAULT METER")) {
    userSessions.delete(user.id);
    const defaultParts = body.split(" ").filter(p => p.length > 0);
    if (defaultParts.length < 2) {
      return `Missing Selection

Please specify the meter number or index.
Example: SETDEFAULTMETER 1
Or: SETDEFAULTMETER 1234567890`;
    }
    const meterId = defaultParts[1];
    return await setDefaultMeter(user.id, meterId);
  }

  // ========== DECODER MANAGEMENT ==========
  
  if (command.startsWith("ADDDECODER") || command.startsWith("ADD DECODER")) {
    userSessions.delete(user.id);
    const addParts = body.split(" ").filter(p => p.length > 0);
    if (addParts.length < 4) {
      return `Add Decoder

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
    userSessions.delete(user.id);
    return await listDecoders(user.id);
  }

  if (command.startsWith("DELETEDECODER") || command.startsWith("DELETE DECODER")) {
    userSessions.delete(user.id);
    const deleteParts = body.split(" ").filter(p => p.length > 0);
    if (deleteParts.length < 2) {
      return `Missing Decoder Number

Please specify the decoder number to delete.
Example: DELETEDECODER 1234567890`;
    }
    const decoderNumber = deleteParts[1];
    return await deleteDecoder(user.id, decoderNumber);
  }

  if (command.startsWith("SETDEFAULTDECODER") || command.startsWith("SET DEFAULT DECODER")) {
    userSessions.delete(user.id);
    const defaultParts = body.split(" ").filter(p => p.length > 0);
    if (defaultParts.length < 2) {
      return `Missing Selection

Please specify the decoder number or index.
Example: SETDEFAULTDECODER 1
Or: SETDEFAULTDECODER 1234567890`;
    }
    const decoderId = defaultParts[1];
    return await setDefaultDecoder(user.id, decoderId);
  }

  // ============================================================
  // ELECTRICITY - SUPPORTS BOTH SAVED AND EXTERNAL METERS
  // ============================================================
  
  if (command.startsWith("ELECTRIC") || command.startsWith("ELEC") || 
      command.startsWith("POWER") || command.startsWith("ELECTRICITY")) {
    userSessions.delete(user.id);
    
    if (parts.length === 1) {
      const meters = await prisma.savedMeter.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });

      if (meters.length === 0) {
        const discosList = await getAvailableDiscosForWhatsApp();
        return `Buy Electricity

You don't have any saved meters.

To buy electricity for any meter:
ELECTRIC [meter_number] [disco] [amount]

Example: ELECTRIC 1234567890 ABUJA 5000

To add a meter for quick buying:
ADDMETER [meter_number] [disco] [name]

Available DisCos:
${discosList}`;
      }

      let message = "Your Saved Meters:\n\n";
      meters.forEach((meter: any, index: number) => {
        const defaultTag = meter.isDefault ? " (Default)" : "";
        message += `${index + 1}. ${meter.name || meter.meterNumber}${defaultTag}\n`;
        message += `   ${meter.disco}\n`;
        message += `   ${meter.meterNumber}\n`;
        if (meter.customerName) {
          message += `   Customer: ${meter.customerName}\n`;
        }
        if (meter.customerAddress) {
          message += `   Address: ${meter.customerAddress}\n`;
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
        return `Invalid Amount

Minimum is NGN 100.
Example: ELECTRIC 1234567890 ABUJA 5000`;
      }
      
      const validDiscos = ["IKEJA", "EKO", "ABUJA", "KANO", "PHCN", "IBADAN", "BENIN", "ENUGU", "JOS", "PORTHARCOURT", "KADUNA"];
      const discoUpper = disco.toUpperCase();
      if (!validDiscos.includes(discoUpper)) {
        return `Invalid DisCo: ${discoUpper}

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
        return `Could Not Verify Meter

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
        return `Invalid Selection

Please choose a number from the list.
Example: ELECTRIC 1 5000`;
      }
      
      if (isNaN(amount) || amount < 100) {
        return `Invalid Amount

Minimum is NGN 100.
Example: ELECTRIC 1 5000`;
      }
      
      const meters = await prisma.savedMeter.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      
      if (index >= meters.length) {
        return `Invalid Selection

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
        return `Invalid Amount

Minimum is NGN 100.
Example: ELECTRIC 5000`;
      }
      
      const meters = await prisma.savedMeter.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      
      if (meters.length === 0) {
        return `No Saved Meters

You don't have any saved meters.

To buy for any meter:
ELECTRIC [meter_number] [disco] [amount]

Example: ELECTRIC 1234567890 ABUJA 5000

To add a meter: ADDMETER [meter_number] [disco] [name]`;
      }
      
      let selectedMeter = meters.find(m => m.isDefault) || meters[0];
      
      if (meters.length > 1 && !meters.find(m => m.isDefault)) {
        let message = "Multiple Meters Found\n\nPlease select one:\n\n";
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

    let message = "Buy Electricity\n\n";
    
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
    userSessions.delete(user.id);
    const discosList = await getAvailableDiscosForWhatsApp();
    return `Available DisCos:

${discosList}

To add a meter: ADDMETER [meter_number] [disco_code] [name]
Example: ADDMETER 1234567890 ABUJA HOME`;
  }

  // ============================================================
  // CABLE - NO PIN FOR OWN DECODERS
  // ============================================================
  if (command === "CABLE" || command === "TV") {
    userSessions.delete(user.id);
    const decoders = await prisma.savedDecoder.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    if (decoders.length === 0) {
      return `Cable TV

You don't have any saved decoders.

To add your first decoder:
ADDDECODER [decoder_number] [provider] [name]

Example: ADDDECODER 1234567890 DSTV LIVING_ROOM

Available providers: DSTV, GOTV, STARTIMES

After adding, you can buy cable by just typing CABLE!`;
    }

    let message = "Your Saved Decoders:\n\n";
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
    userSessions.delete(user.id);
    const cableParts = body.split(" ").filter(p => p.length > 0);
    
    if (cableParts.length >= 3) {
      const [, indexStr, packageQuery] = cableParts;
      const index = parseInt(indexStr) - 1;
      
      if (isNaN(index) || index < 0) {
        return `Invalid Selection

Please choose a number from the list.
Example: CABLE 1 PREMIUM`;
      }
      
      const decoders = await prisma.savedDecoder.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      
      if (index >= decoders.length) {
        return `Invalid Selection

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
      return `Missing Package

Please specify the package as well.
Example: CABLE ${cableParts[1]} PREMIUM

To see available packages: PACKAGES [provider]
Example: PACKAGES DSTV`;
    }
  }

  // ========== PACKAGES ==========
  if (command.startsWith("PACKAGES") || command === "PACKAGE") {
    userSessions.delete(user.id);
    const packageParts = body.split(" ").filter(p => p.length > 0);
    const provider = packageParts.length > 1 ? packageParts[1] : "DSTV";
    const packagesList = await getAvailablePackagesForWhatsApp(provider);
    return packagesList;
  }

  // ========== SUBSCRIPTIONS ==========
  if (command.startsWith("SCHEDULE") || command.startsWith("SUBSCRIBE")) {
    userSessions.delete(user.id);
    const scheduleParts = body.split(" ").filter(p => p.length > 0);
    
    if (scheduleParts.length < 4) {
      return `Schedule Electricity Token Delivery

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
      return `Invalid Meter Selection

Please choose a number from the list.
Example: SCHEDULE 1 5000 7`;
    }

    if (isNaN(amount) || amount < 100) {
      return `Invalid Amount

Minimum is NGN 100.
Example: SCHEDULE 1 5000 7`;
    }

    if (isNaN(days) || days < 3) {
      return `Invalid Days

Minimum is 3 days.
Example: SCHEDULE 1 5000 7`;
    }

    const meters = await prisma.savedMeter.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    if (index >= meters.length) {
      return `Invalid Meter Selection

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
    userSessions.delete(user.id);
    return await getActiveSubscriptions(user.id);
  }

  if (command.startsWith("CANCEL") || command.startsWith("UNSUBSCRIBE")) {
    userSessions.delete(user.id);
    const cancelParts = body.split(" ").filter(p => p.length > 0);
    if (cancelParts.length < 2) {
      return `Missing Subscription ID

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
    userSessions.delete(user.id);
    
    const eduParts = body.split(" ").filter(p => p.length > 0);
    const cmd = eduParts[0].toUpperCase();
    
    if (cmd === "EDU" || cmd === "EDUCATION") {
      const productsList = await getAvailableEducationProducts();
      return `Education Services:

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
        return `Invalid Quantity

Please enter a number greater than 0.
Example: EDU WAEC 2`;
      }
      return await processEducationPurchaseWhatsApp(user, product, quantity);
    }

    if (eduParts.length >= 2 && ["WAEC", "JAMB", "NECO", "WAEC-RESULT"].includes(cmd)) {
      const quantity = parseInt(eduParts[1]);
      if (isNaN(quantity) || quantity < 1) {
        return `Invalid Quantity

Please enter a number greater than 0.
Example: WAEC 2`;
      }
      return await processEducationPurchaseWhatsApp(user, cmd, quantity);
    }

    const productsList = await getAvailableEducationProducts();
    return `Education Services:

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
    userSessions.delete(user.id);
    return await getTransactionHistory(user.id);
  }

  // ========== REFERRAL ==========
  if (command === "REFERRAL" || command === "REF") {
    userSessions.delete(user.id);
    const referralCode = user.referralCode || "N/A";
    const link = `${getAppUrl()}/auth?ref=${referralCode}`;
    const count = await prisma.referral.count({
      where: { referrerId: user.id },
    });
    
    return `Your Referral Program

Referral Code: ${referralCode}
Total Referrals: ${count}
Referral Bonus: NGN 50 per signup

Share your link:
${link}

Copy this link and share with friends to earn rewards!`;
  }

  // ========== PIN ==========
  if (command === "PIN" || command.startsWith("PIN ")) {
    userSessions.delete(user.id);
    return await handlePinCommand(user, parts);
  }

  // ========== UNKNOWN COMMAND ==========
  return `Unknown Command

I didn't understand that command.

Type HELP to see all available commands.

Or try:
BALANCE - Check your wallet
AIRTIME [amount] - Buy airtime for YOUR number (no PIN)
AIRTIME [phone] [amount] - Buy airtime for others (PIN required)
DATA - Show available plans for your network
DATA [index] - Buy data for YOUR number (no PIN)
DATA [phone] - Show plans for another number
DATA [phone] [index] - Buy data for others (PIN required)
DATA ALL - View all pricing at https://bilscore.com/pricing
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
  return `Bilscore WhatsApp Commands

Financial:
BALANCE - Check wallet balance
TRANSACTIONS - View transaction history
PIN [code] - Set transaction PIN

Airtime & Data:
AIRTIME [amount] - For YOUR number (no PIN)
AIRTIME [phone] [amount] - For others (PIN required)
DATA - Show available plans for your network
DATA [index] - For YOUR number (no PIN)
DATA [phone] - Show plans for another number
DATA [phone] [index] - For others (PIN required)
DATA ALL - View all pricing at https://bilscore.com/pricing

Electricity:
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

Cable TV (Your decoders - no PIN):
CABLE - Show saved decoders
CABLE [index] [package] - Subscribe
ADDDECODER [decoder] [provider] [name] - Add decoder
DECODERS - List saved decoders
PACKAGES [provider] - Show packages

Education:
EDU [product] [quantity] - Buy education pins
WAEC [quantity] - Buy WAEC pins
JAMB [quantity] - Buy JAMB pins
NECO [quantity] - Buy NECO pins

Referral:
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
    return `No Transactions

No transactions found.

Start using Bilscore today!
Type HELP to see available commands.`;
  }

  let message = "Recent Transactions:\n\n";
  transactions.forEach((tx, i) => {
    const status = tx.status === "SUCCESS" ? "[OK]" : tx.status === "PENDING" ? "[PENDING]" : "[FAILED]";
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
    return `Set Transaction PIN

To set up your transaction PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

Your PIN will be encrypted and used for transaction verification.`;
  }

  const pin = parts[1];
  if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return `Invalid PIN Format

Please use 4-6 digits only.
Example: PIN 1234`;
  }

  if (user.pinHash) {
    return `PIN Already Set

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

  return `PIN Set Successfully!

Your PIN has been encrypted and saved.
You'll need this PIN for all transactions.

PIN: **** (hidden for security)

Keep your PIN safe and never share it with anyone.

You can change your PIN anytime in the Bilscore app.`;
}