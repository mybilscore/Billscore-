// app/api/twilio/webhook/route.ts - COMPLETE UPDATED

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
  PlanStatus
} from "@prisma/client";
import { 
  createPalmPayVirtualAccountForUser, 
  isPalmPaySimulationMode 
} from "~/lib/palmpay/palmpay-wallet.service";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { generateQRUrl } from "~/lib/qr-hash";
import { sendWhatsAppMessage } from "~/lib/twilio";

// ============================================================
// CREATE JOB HELPER
// ============================================================

async function createJob(
  type: JobType,
  payload: any,
  priority: number = 5,
  maxAttempts: number = 3,
  scheduledFor: Date = new Date()
): Promise<any> {
  return await prisma.job.create({
    data: {
      type,
      status: JobStatus.PENDING,
      payload,
      priority,
      maxAttempts,
      scheduledFor,
    },
  });
}

// ============================================================
// SESSION STORAGE
// ============================================================

const userSessions: Map<string, { 
  command: string, 
  phoneNumber: string, 
  network: string,
  isOwnNumber: boolean,
  timestamp: number 
}> = new Map();

const SESSION_TIMEOUT = 300000;

// ============================================================
// CACHE FOR NETWORK-SPECIFIC DATA PLANS
// ============================================================

let cachedNetworkPlans: Map<string, Map<number, { 
  planData: any, 
  provider: string, 
  network: string, 
  planId: string 
}>> = new Map();

let cachedNetworkMessages: Map<string, string> = new Map();
let networkPlanCacheTime: Map<string, number> = new Map();
const CACHE_TTL = 300000;

// ============================================================
// DISCO MAPPING - Supports both full names and acronyms
// ============================================================

const DISCO_MAPPING: Record<string, { code: string, fullName: string, serviceID: string }> = {
  'AEDC': { code: 'ABUJA', fullName: 'Abuja Electric', serviceID: 'abuja-electric' },
  'IBEDC': { code: 'IBADAN', fullName: 'Ibadan Electric', serviceID: 'ibadan-electric' },
  'EEDC': { code: 'ENUGU', fullName: 'Enugu Electric', serviceID: 'enugu-electric' },
  'JED': { code: 'JOS', fullName: 'Jos Electric', serviceID: 'jos-electric' },
  'PHED': { code: 'PORTHARCOURT', fullName: 'Port Harcourt Electric', serviceID: 'portharcourt-electric' },
  'KEDCO': { code: 'KANO', fullName: 'Kano Electric', serviceID: 'kano-electric' },
  'KAEDCO': { code: 'KADUNA', fullName: 'Kaduna Electric', serviceID: 'kaduna-electric' },
  'IKEDC': { code: 'IKEJA', fullName: 'Ikeja Electric', serviceID: 'ikeja-electric' },
  'EKEDC': { code: 'EKO', fullName: 'Eko Electric', serviceID: 'eko-electric' },
  'BEDC': { code: 'BENIN', fullName: 'Benin Electric', serviceID: 'benin-electric' },
  'ABUJA': { code: 'ABUJA', fullName: 'Abuja Electric', serviceID: 'abuja-electric' },
  'IBADAN': { code: 'IBADAN', fullName: 'Ibadan Electric', serviceID: 'ibadan-electric' },
  'ENUGU': { code: 'ENUGU', fullName: 'Enugu Electric', serviceID: 'enugu-electric' },
  'JOS': { code: 'JOS', fullName: 'Jos Electric', serviceID: 'jos-electric' },
  'PORTHARCOURT': { code: 'PORTHARCOURT', fullName: 'Port Harcourt Electric', serviceID: 'portharcourt-electric' },
  'PORT HARCOURT': { code: 'PORTHARCOURT', fullName: 'Port Harcourt Electric', serviceID: 'portharcourt-electric' },
  'KANO': { code: 'KANO', fullName: 'Kano Electric', serviceID: 'kano-electric' },
  'KADUNA': { code: 'KADUNA', fullName: 'Kaduna Electric', serviceID: 'kaduna-electric' },
  'IKEJA': { code: 'IKEJA', fullName: 'Ikeja Electric', serviceID: 'ikeja-electric' },
  'EKO': { code: 'EKO', fullName: 'Eko Electric', serviceID: 'eko-electric' },
  'BENIN': { code: 'BENIN', fullName: 'Benin Electric', serviceID: 'benin-electric' },
  'PHCN': { code: 'PHCN', fullName: 'PHCN Electric', serviceID: 'phcn-electric' },
};

function normalizeDisco(input: string): { code: string; fullName: string; serviceID: string } | null {
  if (!input) return null;
  const normalized = input.toUpperCase().trim();
  const mapped = DISCO_MAPPING[normalized];
  if (mapped) return mapped;
  for (const [key, value] of Object.entries(DISCO_MAPPING)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  return null;
}

function getValidDiscosList(): string {
  const uniqueDiscos = new Map<string, { code: string, fullName: string }>();
  for (const [key, value] of Object.entries(DISCO_MAPPING)) {
    if (!uniqueDiscos.has(value.code)) {
      uniqueDiscos.set(value.code, { code: value.code, fullName: value.fullName });
    }
  }
  let list = "";
  for (const [code, info] of uniqueDiscos) {
    list += `   ${code} - ${info.fullName}\n`;
  }
  return list;
}

// ✅ Correct - WITH userId
function generateMeterQRCode(userId: string, meterNumber: string, disco: string): Promise<string> {
  try {
    const appUrl = getAppUrl();
    const baseUrl = appUrl;
    const qrValue = generateQRUrl(baseUrl, {
      identifier: meterNumber,
      type: "electricity",
      provider: disco,
      userId: userId, // ✅ Included in hash
    });
    const url = new URL(qrValue);
    const params = new URLSearchParams(url.search);
    const hash = params.get('h');
    const expiresAt = params.get('e');
    const qrDisplayLink = `${baseUrl}/qr/display/${meterNumber}?t=electricity&p=${encodeURIComponent(disco)}&h=${hash}&u=${userId}${expiresAt ? `&e=${expiresAt}` : ''}`;
    //                                                                                              ^^^^^^^^^^^^^^^^ ✅ Added userId
    return Promise.resolve(qrDisplayLink);
  } catch (error) {
    console.error("QR code generation error:", error);
    return Promise.resolve("");
  }
}

function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generateValidationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
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
// HELPER FUNCTIONS
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

function detectNetworkFromPhone(phoneNumber: string): string | null {
  if (!phoneNumber) return null;
  let cleanNumber = phoneNumber.replace(/\D/g, "");
  if (cleanNumber.startsWith("234")) {
    cleanNumber = cleanNumber.substring(3);
  }
  if (!cleanNumber.startsWith("0")) {
    if (cleanNumber.length >= 10) {
      cleanNumber = '0' + cleanNumber;
    }
  }
  if (cleanNumber.length < 11) {
    return null;
  }
  const firstFour = cleanNumber.substring(0, 4);
  const firstThree = cleanNumber.substring(0, 3);
  
  const mtnPrefixes = ['0701', '0703', '0704', '0706', '0801', '0803', '0804', '0806', '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916'];
  if (mtnPrefixes.includes(firstFour)) return "MTN";
  
  const airtelPrefixes = ['0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904', '0907', '0911', '0912'];
  if (airtelPrefixes.includes(firstFour)) return "AIRTEL";
  
  const gloPrefixes = ['0705', '0805', '0807', '0811', '0815', '0905', '0915'];
  if (gloPrefixes.includes(firstFour)) return "GLO";
  
  const nineMobilePrefixes = ['0809', '0817', '0818', '0908', '0909'];
  if (nineMobilePrefixes.includes(firstFour)) return "9MOBILE";
  
  if (firstThree === "070" || firstThree === "080" || firstThree === "081" || firstThree === "090" || firstThree === "091") {
    return "MTN";
  }
  return null;
}

function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return "";
  let clean = phoneNumber.replace(/\D/g, '');
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
  return clean;
}

function formatErrorMessage(error: any, accountInfo?: { accountNumber?: string, accountName?: string }): string {
  let errorMessage = '';
  let errorCode = '';
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error) {
    errorMessage = error?.message || error?.error || error?.response_description || error?.statusText || '';
    errorCode = error?.code || error?.status || error?.response_code || '';
  }
  if (!errorMessage || errorMessage === '') {
    errorMessage = 'An unknown error occurred';
  }
  errorMessage = errorMessage.replace(/^Error:\s*/, '').trim();
  
  return `Transaction Failed

${errorMessage.substring(0, 200)}

Error Code: ${errorCode || 'Unknown'}

Please try again or contact support.`;
}

function mapVendorToEnum(vendorCode: string | undefined): VtuVendor | null {
  if (!vendorCode) return null;
  const normalized = vendorCode.toUpperCase();
  const vendorMap: Record<string, VtuVendor> = {
    'VTPASS': VtuVendor.VTPASS,
    'BILAL_SADA': VtuVendor.BILAL_SADA,
    'LEGITDATAWAY': VtuVendor.VTPASS,
    'BILALSADA': VtuVendor.BILAL_SADA,
  };
  return vendorMap[normalized] || null;
}

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
  return networkMap[networkInput?.trim()] || NetworkProvider.MTN;
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
    } else {
      await prisma.savedMeter.create({ data });
    }
  } catch (error) {
    console.error(`[WhatsApp] Failed to save meter:`, error);
  }
}

// ============================================================
// METER VERIFICATION
// ============================================================

async function verifyMeterWithVTpass(serviceID: string, meterNumber: string, meterType: string = "prepaid") {
  try {
    const apiUrl = getApiUrl();
    const url = `${apiUrl}/api/vendors/electricity/verify-meter`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceID, meterNumber, meterType }),
      signal: AbortSignal.timeout(5000),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      return { success: false, error: result.error || "Meter verification failed" };
    }
    return { success: true, data: result.data };
  } catch (error: any) {
    return { success: false, error: error.message || "Network error" };
  }
}

// ============================================================
// VERIFY DECODER WITH VTPASS
// ============================================================

async function verifyDecoderWithVTpass(serviceID: string, smartCardNumber: string) {
  try {
    const apiKey = process.env.VTPASS_SANDBOX_API_KEY;
    const secretKey = process.env.VTPASS_SANDBOX_SECRET_KEY;
    const publicKey = process.env.VTPASS_SANDBOX_PUBLIC_KEY;
    const baseUrl = "https://sandbox.vtpass.com/api/merchant-verify";

    const payload = {
      serviceID: serviceID,
      billersCode: smartCardNumber,
    };

    if (!apiKey || !secretKey || !publicKey) {
      return {
        success: true,
        data: {
          customerName: "Sandbox Customer",
          customerAddress: "123 Sandbox Street, Lagos",
          smartCardNumber: smartCardNumber,
          provider: serviceID.toUpperCase(),
          status: "ACTIVE",
          packageName: "Premium",
          packageCode: "PREMIUM",
          canVend: true,
        },
      };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "api-key": apiKey,
      "secret-key": secretKey,
      "public-key": publicKey,
    };

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        success: true,
        data: {
          customerName: "Sandbox Customer",
          customerAddress: "123 Sandbox Street, Lagos",
          smartCardNumber: smartCardNumber,
          provider: serviceID.toUpperCase(),
          status: "ACTIVE",
          packageName: "Premium",
          packageCode: "PREMIUM",
          canVend: true,
        },
      };
    }

    const data = await response.json();
    
    if (data.code === "000" && data.content) {
      const content = data.content;
      return {
        success: true,
        data: {
          customerName: content.Customer_Name || content.customerName || content.name || "Unknown",
          customerAddress: content.Address || content.address || "",
          smartCardNumber: content.Smart_Card_Number || content.smartCardNumber || content.billersCode || smartCardNumber,
          provider: content.Provider || content.provider || "",
          status: content.Status || content.status || "ACTIVE",
          packageName: content.Package_Name || content.packageName || "",
          packageCode: content.Package_Code || content.packageCode || "",
          dueDate: content.Due_Date || content.dueDate || null,
          customerType: content.Customer_Type || content.customerType || "",
          canVend: content.Can_Vend !== undefined ? content.Can_Vend : true,
          subscriptionType: content.Subscription_Type || content.subscriptionType || "",
          renewalDate: content.Renewal_Date || content.renewalDate || null,
        },
      };
    } else {
      return {
        success: true,
        data: {
          customerName: "Sandbox Customer",
          customerAddress: "123 Sandbox Street, Lagos",
          smartCardNumber: smartCardNumber,
          provider: serviceID.toUpperCase(),
          status: "ACTIVE",
          packageName: "Premium",
          packageCode: "PREMIUM",
          canVend: true,
        },
      };
    }
  } catch (error: any) {
    return {
      success: true,
      data: {
        customerName: "Sandbox Customer",
        customerAddress: "123 Sandbox Street, Lagos",
        smartCardNumber: smartCardNumber,
        provider: serviceID.toUpperCase(),
        status: "ACTIVE",
        packageName: "Premium",
        packageCode: "PREMIUM",
        canVend: true,
      },
    };
  }
}

// ============================================================
// HELPER: Get active vendor for DATA service
// ============================================================

async function getActiveDataVendor() {
  const vendorService = await prisma.vendorService.findFirst({
    where: {
      serviceType: VtuType.DATA,
      isActive: true,
    },
    include: {
      vendor: true,
    },
    orderBy: {
      priority: 'asc',
    },
  });
  return vendorService;
}

// ============================================================
// HELPER: Build where clause for WhatsApp plans
// ============================================================

function buildWhatsAppPlanWhereClause(vendorId: string, network: string): any {
  const validNetworks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE', 'NINEMOBILE'];
  const networkUpper = network.toUpperCase();
  const where: any = {
    vendorId: vendorId,
    isActive: true,
    status: PlanStatus.ACTIVE,
    isActiveForWhatsApp: true,
  };

  if (validNetworks.includes(networkUpper)) {
    where.network = networkUpper as NetworkProvider;
  }

  return where;
}

// ============================================================
// HELPER: Format validity display from schema fields
// ============================================================

function formatValidityDisplay(validity: number, validityUnit: string): string {
  if (!validity || validity <= 0) {
    return '30 days';
  }

  const unit = validityUnit?.toUpperCase() || 'DAYS';
  
  if (unit === 'HOURS' || unit === 'MINUTES') {
    return `${validity} ${unit.toLowerCase()}`;
  }
  
  if (unit === 'DAYS') {
    if (validity === 1) return '1 day';
    if (validity < 7) return `${validity} days`;
    if (validity === 7) return '7 days';
    if (validity < 30) return `${validity} days`;
    if (validity === 30) return '30 days';
    if (validity === 60) return '60 days';
    if (validity === 90) return '90 days';
    if (validity === 365) return '1 year';
    return `${validity} days`;
  }
  
  if (unit === 'MONTHS') {
    if (validity === 1) return '1 month';
    if (validity < 12) return `${validity} months`;
    if (validity === 12) return '1 year';
    return `${validity} months`;
  }
  
  if (unit === 'YEARS') {
    if (validity === 1) return '1 year';
    return `${validity} years`;
  }
  
  return `${validity} days`;
}

// ============================================================
// HELPER: Format data display from amountMB
// ============================================================

function formatDataDisplay(amountMB: number, existingData?: string): string {
  if (existingData && existingData !== '0MB' && existingData !== '') {
    return existingData;
  }
  
  const mb = amountMB || 0;
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)}GB`;
  }
  return `${mb}MB`;
}

// ============================================================
// HELPER: Get display price from plan (uses ourPrice)
// ============================================================

function getDisplayPrice(plan: any): number {
  if (plan.ourPrice !== undefined && plan.ourPrice !== null && Number(plan.ourPrice) > 0) {
    return Number(plan.ourPrice);
  }
  return 0;
}

// ============================================================
// HELPER: Process plans and build message - WITH PLAN ID
// ============================================================

function processPlansForWhatsApp(dbPlans: any[], network: string): {
  planMap: Map<number, { planData: any, provider: string, network: string, planId: string }>;
  message: string;
  count: number;
} {
  const planMap = new Map<number, { planData: any, provider: string, network: string, planId: string }>();
  let message = `📱 *${network} Data Plans*\n\n`;
  let index = 1;
  let count = 0;

  for (const plan of dbPlans) {
    const displayPrice = getDisplayPrice(plan);
    if (displayPrice <= 0) continue;

    const dataDisplay = formatDataDisplay(plan.amountMB, plan.data || plan.dataDisplay);
    const validityDisplay = formatValidityDisplay(plan.validity, plan.validityUnit);
    const priceDisplay = `₦${displayPrice.toFixed(0)}`;
    
    // ✅ Store the plan ID - this is what BilalSada/VTpass uses
    const planId = plan.vendorPlanId || plan.id || plan.planCode || plan.dataDisplay;
    
    planMap.set(index, {
      planData: {
        data: dataDisplay,
        price: displayPrice,
        validity: validityDisplay,
        planCode: plan.planCode || plan.id || dataDisplay,
        amountMB: plan.amountMB || 0,
      },
      provider: network,
      network: network,
      planId: planId,
    });
    
    message += `${index}. ${dataDisplay} - ${priceDisplay} (${validityDisplay})\n`;
    index++;
    count++;
  }

  if (count > 0) {
    message += `\n_Reply with DATA [index] to buy_\n`;
    message += `_Example: DATA 1_\n`;
    message += `_For another number: DATA [phone] [index]_`;
  }

  return { planMap, message, count };
}

// ============================================================
// HELPER: Check if there are any active plans for network
// ============================================================

async function countActivePlansForNetwork(vendorId: string, network: string): Promise<number> {
  const validNetworks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE', 'NINEMOBILE'];
  const networkUpper = network.toUpperCase();
  const where: any = {
    vendorId: vendorId,
    isActive: true,
    status: PlanStatus.ACTIVE,
  };

  if (validNetworks.includes(networkUpper)) {
    where.network = networkUpper as NetworkProvider;
  }

  return await prisma.dataPlan.count({ where });
}

// ============================================================
// MAIN FUNCTION: GET AVAILABLE PLANS FOR NETWORK
// ============================================================

async function getAvailablePlansForNetwork(network: string, phoneNumber?: string): Promise<string> {
  try {
    const cacheKey = network.toUpperCase();
    
    if (networkPlanCacheTime.get(cacheKey) && 
        Date.now() - (networkPlanCacheTime.get(cacheKey) || 0) < CACHE_TTL && 
        cachedNetworkMessages.has(cacheKey)) {
      console.log(`[Data Plans] Returning cached WhatsApp plans for ${network}`);
      return cachedNetworkMessages.get(cacheKey)!;
    }
    
    console.log(`[Data Plans] Fetching WhatsApp plans for ${network} from database...`);

    const vendorService = await getActiveDataVendor();
    if (!vendorService) {
      console.log('[Data Plans] No active vendor found for DATA');
      return getFallbackPlansForNetwork(network);
    }

    console.log(`[Data Plans] Active vendor: ${vendorService.vendor.name} (${vendorService.vendor.code})`);

    const where = buildWhatsAppPlanWhereClause(vendorService.vendorId, network);
    console.log(`[Data Plans] Where clause (WhatsApp only):`, JSON.stringify(where));

    const dbPlans = await prisma.dataPlan.findMany({
      where,
      orderBy: [
        { whatsappPriority: 'asc' },
        { amountMB: 'asc' },
      ],
      take: 30,
    });

    console.log(`[Data Plans] Database returned ${dbPlans.length} WhatsApp-active plans`);

    if (dbPlans.length === 0) {
      const totalPlans = await countActivePlansForNetwork(vendorService.vendorId, network);
      console.log(`[Data Plans] Found ${totalPlans} total active plans, 0 are WhatsApp-enabled`);
      return getFallbackPlansForNetwork(network);
    }

    if (dbPlans.length > 0) {
      console.log(`[Data Plans] First WhatsApp plan:`, JSON.stringify({
        id: dbPlans[0].id,
        name: dbPlans[0].name,
        ourPrice: dbPlans[0].ourPrice?.toString(),
        amountMB: dbPlans[0].amountMB,
        validity: dbPlans[0].validity,
        validityUnit: dbPlans[0].validityUnit,
        vendorPlanId: dbPlans[0].vendorPlanId,
        isActiveForWhatsApp: dbPlans[0].isActiveForWhatsApp,
      }));
    }

    const { planMap, message, count } = processPlansForWhatsApp(dbPlans, network);
    console.log(`[Data Plans] Added ${count} WhatsApp plans to message using ourPrice`);

    if (count === 0) {
      console.log('[Data Plans] No valid WhatsApp plans with ourPrice > 0, using fallback');
      return getFallbackPlansForNetwork(network);
    }

    cachedNetworkPlans.set(cacheKey, planMap);
    cachedNetworkMessages.set(cacheKey, message);
    networkPlanCacheTime.set(cacheKey, Date.now());
    
    console.log(`[Data Plans] Cached ${planMap.size} WhatsApp plans for ${network}`);
    console.log(`[Data Plans] Message preview:`, message.substring(0, 100) + '...');
    
    return message;
    
  } catch (error) {
    console.error('[Data Plans] Error fetching plans:', error);
    return getFallbackPlansForNetwork(network);
  }
}

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
      { data: "5GB", price: 900, validity: "30 days" },
    ],
    'AIRTEL': [
      { data: "1GB", price: 300, validity: "30 days" },
      { data: "2GB", price: 500, validity: "30 days" },
      { data: "5GB", price: 1100, validity: "30 days" },
    ],
    '9MOBILE': [
      { data: "1GB", price: 280, validity: "30 days" },
      { data: "2GB", price: 480, validity: "30 days" },
      { data: "5GB", price: 1000, validity: "30 days" },
    ],
  };

  const plans = fallbackPlans[network.toUpperCase()] || fallbackPlans['MTN'];
  const cacheKey = network.toUpperCase();
  const planMap = new Map<number, { planData: any, provider: string, network: string, planId: string }>();
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
      planId: plan.data,
    });
    message += `  ${idx}. ${plan.data} - NGN ${plan.price} (${plan.validity})\n`;
  });
  cachedNetworkPlans.set(cacheKey, planMap);
  cachedNetworkMessages.set(cacheKey, message + `\n\nTo buy: DATA [index]\nExample: DATA 1`);
  networkPlanCacheTime.set(cacheKey, Date.now());
  return cachedNetworkMessages.get(cacheKey)!;
}

// ============================================================
// GET PLAN BY INDEX FOR NETWORK - WITH PLAN ID
// ============================================================

async function getPlanByIndexForNetwork(network: string, indexNumber: number): Promise<{ 
  planData: any, 
  provider: string, 
  network: string, 
  planId: string 
} | null> {
  const cacheKey = network.toUpperCase();
  
  if (!cachedNetworkPlans.has(cacheKey) || 
      Date.now() - (networkPlanCacheTime.get(cacheKey) || 0) >= CACHE_TTL) {
    console.log(`[Data Plans] Cache empty for ${network}, refreshing...`);
    await getAvailablePlansForNetwork(network);
  }
  
  const planMap = cachedNetworkPlans.get(cacheKey);
  if (!planMap) {
    console.log(`[Data Plans] No plan map for ${network}`);
    return null;
  }
  
  const plan = planMap.get(indexNumber);
  if (plan) {
    console.log(`[Data Plans] Found plan at index ${indexNumber}: ${plan.planData.data} - ₦${plan.planData.price} (Plan ID: ${plan.planId})`);
  } else {
    console.log(`[Data Plans] No plan at index ${indexNumber}, map size: ${planMap.size}`);
  }
  return plan || null;
}

// ============================================================
// HELPER: Check user balance
// ============================================================

async function checkUserBalance(userId: string, amount: number): Promise<{ 
  success: boolean; 
  balance: number; 
  message?: string 
}> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: userId },
  });

  if (!wallet) {
    return { 
      success: false, 
      balance: 0, 
      message: `❌ Wallet not found. Please contact support.` 
    };
  }

  const currentBalance = Number(wallet.walletBalance);
  if (currentBalance < amount) {
    return { 
      success: false, 
      balance: currentBalance, 
      message: `❌ Insufficient Balance

Your balance: NGN ${currentBalance.toFixed(2)}
Amount needed: NGN ${amount.toFixed(2)}
Shortfall: NGN ${(amount - currentBalance).toFixed(2)}

Please fund your wallet and try again.` 
    };
  }

  return { success: true, balance: currentBalance };
}

// ============================================================
// PROCESS DATA PURCHASE WITH QUEUE (NO PIN - uses job)
// ============================================================

async function processDataPurchaseWithQueue(
  user: any,
  phoneNumber: string,
  planQuery: string,
  detectedNetwork: string,
  isOwnNumber: boolean
): Promise<string> {
  const isIndex = /^\d+$/.test(planQuery);
  
  if (!isIndex) {
    const plans = await getAvailablePlansForNetwork(detectedNetwork, phoneNumber);
    return `Invalid input. Please use a plan index number.\nExample: 1\n\n${plans}`;
  }
  
  const indexNum = parseInt(planQuery);
  const planInfo = await getPlanByIndexForNetwork(detectedNetwork, indexNum);
  
  if (!planInfo) {
    const plans = await getAvailablePlansForNetwork(detectedNetwork, phoneNumber);
    return `Invalid plan index ${indexNum} for ${detectedNetwork}.\n\n${plans}`;
  }

  const planData = planInfo.planData;
  const provider = planInfo.provider;
  const amount = Number(planData.price);
  const normalizedTarget = normalizePhoneNumber(phoneNumber);
  const planId = planInfo.planId;

  // ✅ CHECK BALANCE FIRST
  const balanceCheck = await checkUserBalance(user.id, amount);
  if (!balanceCheck.success) {
    return balanceCheck.message!;
  }

  console.log(`[Data Purchase] Balance check passed: ${balanceCheck.balance} >= ${amount}`);

  const transaction = await prisma.vtuTransaction.create({
    data: {
      userId: user.id,
      transactionType: VtuType.DATA,
      product: `${detectedNetwork} - ${planData.data}`,
      amount: amount,
      totalDebited: 0,
      phoneNumber: normalizedTarget,
      network: mapNetwork(detectedNetwork),
      networkPlan: planData.planCode || planData.data,
      status: TransactionStatus.PROCESSING,
      channel: ChannelType.WHATSAPP,
      metadata: {
        source: "WhatsApp",
        service: "DATA",
        timestamp: new Date().toISOString(),
        network: detectedNetwork,
        planData: planData,
        provider: provider,
        isOwnNumber: isOwnNumber,
        queued: true,
        requiresPin: false,
        planId: planId,
        balanceAtPurchase: balanceCheck.balance,
      },
    },
  });

  await createJob(
    JobType.VTU_TRANSACTION,
    {
      transactionId: transaction.id,
      userId: user.id,
      phoneNumber: normalizedTarget,
      planData: planData,
      provider: provider,
      detectedNetwork: detectedNetwork,
      serviceType: "DATA",
      isOwnNumber: isOwnNumber,
      planId: planId,
    },
    5,
    3,
    new Date()
  );

  const dataDisplay = planData.data || `${planData.amountMB || 0}MB`;

  return `Processing your data purchase...!

Phone: ${normalizedTarget}
Plan: ${dataDisplay} (${provider})
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
Reference: ${transaction.id.substring(0, 10)}

You'll receive a confirmation shortly.`;
}

// ============================================================
// PROCESS DATA PURCHASE WITH PIN (PIN required - no job)
// ============================================================

async function processDataPurchaseWithPin(
  user: any,
  phoneNumber: string,
  planQuery: string,
  detectedNetwork: string
): Promise<string> {
  const isIndex = /^\d+$/.test(planQuery);
  
  if (!isIndex) {
    const plans = await getAvailablePlansForNetwork(detectedNetwork, phoneNumber);
    return `Invalid input. Please use a plan index number.\nExample: 1\n\n${plans}`;
  }
  
  const indexNum = parseInt(planQuery);
  const planInfo = await getPlanByIndexForNetwork(detectedNetwork, indexNum);
  
  if (!planInfo) {
    const plans = await getAvailablePlansForNetwork(detectedNetwork, phoneNumber);
    return `Invalid plan index ${indexNum} for ${detectedNetwork}.\n\n${plans}`;
  }

  const planData = planInfo.planData;
  const provider = planInfo.provider;
  const amount = Number(planData.price);
  const normalizedTarget = normalizePhoneNumber(phoneNumber);
  const planId = planInfo.planId;

  // ✅ CHECK BALANCE FIRST
  const balanceCheck = await checkUserBalance(user.id, amount);
  if (!balanceCheck.success) {
    return balanceCheck.message!;
  }

  console.log(`[Data Purchase PIN] Balance check passed: ${balanceCheck.balance} >= ${amount}`);

  const transaction = await prisma.vtuTransaction.create({
    data: {
      userId: user.id,
      transactionType: VtuType.DATA,
      product: `${detectedNetwork} - ${planData.data}`,
      amount: amount,
      totalDebited: 0,
      phoneNumber: normalizedTarget,
      network: mapNetwork(detectedNetwork),
      networkPlan: planData.planCode || planData.data,
      status: TransactionStatus.PENDING,
      channel: ChannelType.WHATSAPP,
      metadata: {
        source: "WhatsApp",
        service: "DATA",
        timestamp: new Date().toISOString(),
        network: detectedNetwork,
        planData: planData,
        provider: provider,
        isOwnNumber: false,
        queued: false,
        requiresPin: true,
        planId: planId,
        balanceAtPurchase: balanceCheck.balance,
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
        validationExpiry: validationExpiry,
      },
    },
  });

  const appUrl = getAppUrl();
  const purchaseLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

  const dataDisplay = planData.data || `${planData.amountMB || 0}MB`;

  return `📱 Data Purchase Initiated!

Phone: ${normalizedTarget}
Plan: ${dataDisplay} (${provider})
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
Reference: ${transaction.id.substring(0, 10)}

🔹 **Complete Purchase:** ${purchaseLink}
🔹 **PIN Required:** Enter your transaction PIN

This link expires in 5 minutes.

You'll receive a confirmation via WhatsApp after completion.`;
}

// ============================================================
// GET AVAILABLE DISCOS, PACKAGES, EDUCATION
// ============================================================

async function getAvailableDiscosForWhatsApp(): Promise<string> {
  return getValidDiscosList();
}

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

async function getAvailableEducationProducts(): Promise<string> {
  return `   WAEC - WAEC Registration
   WAEC-RESULT - WAEC Result Checker
   JAMB - JAMB PIN
   NECO - NECO Registration`;
}

// ============================================================
// ADD METER WITH VERIFICATION AND QR CODE
// ============================================================

async function addMeterWithVerificationAndQR(userId: string, meterNumber: string, discoInput: string, name: string): Promise<string> {
  try {
    const discoInfo = normalizeDisco(discoInput);
    if (!discoInfo) {
      const discosList = getValidDiscosList();
      return `Invalid DisCo: "${discoInput}"

Available DisCos (use full name or acronym):
${discosList}

Examples:
- ADDMETER 1234567890 ABUJA HOME
- ADDMETER 1234567890 AEDC HOME
- ADDMETER 1234567890 EKEDC HOME
- ADDMETER 1234567890 IKEDC HOME`;
    }

    const discoCode = discoInfo.code;
    const serviceID = discoInfo.serviceID;

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
          disco: discoCode, 
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
      
      const qrLink = await generateMeterQRCode(userId, meterNumber, discoCode);
      
      return `Meter updated successfully!${verificationMessage}

Meter Details:
Meter: ${meterNumber}
DisCo: ${discoCode} (${discoInfo.fullName})
Name: ${name || existing.name}
${customerName ? `Customer: ${customerName}` : ''}
${customerAddress ? `Address: ${customerAddress}` : ''}
${customerPhone ? `Phone: ${customerPhone}` : ''}
${customerEmail ? `Email: ${customerEmail}` : ''}

Quick Buy QR Code:
${qrLink}


🔹 Print this QR code and paste it on your meter
🔹 Scan to quickly buy electricity anytime

Type POWER to see all your meters and buy power!`;
    }

    await prisma.savedMeter.create({
      data: {
        userId: userId,
        meterNumber: meterNumber,
        disco: discoCode,
        name: name || `${discoCode} Meter`,
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

    const qrLink = await generateMeterQRCode(userId, meterNumber, discoCode);

    return `Meter added successfully!${verificationMessage}

Meter Details:
Meter: ${meterNumber}
DisCo: ${discoCode} (${discoInfo.fullName})
Name: ${name || `${discoCode} Meter`}
${customerName ? `Customer: ${customerName}` : ''}
${customerAddress ? `Address: ${customerAddress}` : ''}
${customerPhone ? `Phone: ${customerPhone}` : ''}
${customerEmail ? `Email: ${customerEmail}` : ''}

Quick Buy QR Code:
${qrLink}

🔹 Print this QR code and paste it on your meter
🔹 Scan to quickly buy electricity anytime

Type POWER to see all your meters and buy power!`;
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

Decoder Details:
Decoder: ${decoderNumber}
Provider: ${providerUpper}
Name: ${name || existing.name}
${customerName ? `Customer: ${customerName}` : ''}
${customerAddress ? `Address: ${customerAddress}` : ''}

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

Decoder Details:
Decoder: ${decoderNumber}
Provider: ${providerUpper}
Name: ${name || `${providerUpper} Decoder`}
${customerName ? `Customer: ${customerName}` : ''}
${customerAddress ? `Address: ${customerAddress}` : ''}

Type CABLE to see all your decoders and subscribe!`;
  } catch (error) {
    console.error("Add decoder error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// LIST METERS
// ============================================================

// ============================================================
// LIST METERS - WITH QR DISPLAY LINK
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

  let message = "📋 *Your Saved Meters*\n\n";
  
  for (const meter of meters) {
    const defaultTag = meter.isDefault ? " 🔹 (Default)" : "";
    message += `*${meter.name || meter.meterNumber}*${defaultTag}\n`;
    message += `   🏢 ${meter.disco}\n`;
    message += `   📟 ${meter.meterNumber}\n`;
    
    if (meter.customerName) {
      message += `   👤 ${meter.customerName}\n`;
    }
    if (meter.customerAddress) {
      message += `   📍 ${meter.customerAddress}\n`;
    }
    
    // ✅ Generate QR display link for each meter
    try {
      const qrLink = await generateMeterQRCode(userId, meter.meterNumber, meter.disco);
      if (qrLink) {
        message += `   📱 QR: ${qrLink}\n`;
      }
    } catch (error) {
      console.error(`Failed to generate QR for meter ${meter.meterNumber}:`, error);
      // Continue without QR link
    }
    
    message += `\n`;
  }

  message += `\n--- Commands ---
🔹 POWER [amount] - Buy for default meter (no PIN)
🔹 POWER [index] [amount] - Buy for saved meter (no PIN)
🔹 ELECTRIC [meter] [disco] [amount] - Buy for any meter (PIN required)
🔹 QR [meter_number] - Get QR code for a specific meter
🔹 METERS - Show this list again`;

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
// PROCESS EDUCATION PURCHASE
// ============================================================

async function processEducationPurchaseWhatsApp(user: any, product: string, quantity: number): Promise<string> {
  const serviceMap: Record<string, { serviceId: string; variationCode: string; name: string; price: number }> = {
    'WAEC': { serviceId: 'waec-registration', variationCode: 'waec-registration', name: 'WAEC Registration PIN', price: 14450 },
    'WAEC-RESULT': { serviceId: 'waec', variationCode: 'waecdirect', name: 'WAEC Result Checker PIN', price: 900 },
    'JAMB': { serviceId: 'jamb', variationCode: 'utme-no-mock', name: 'JAMB UTME PIN', price: 6200 },
    'NECO': { serviceId: 'neco', variationCode: 'neco-registration', name: 'NECO Registration PIN', price: 11000 },
  };

  const productInfo = serviceMap[product];
  if (!productInfo) {
    return `Invalid product: ${product}\n\nAvailable: WAEC, JAMB, NECO, WAEC-RESULT`;
  }

  const amount = productInfo.price * quantity;

  // ✅ CHECK BALANCE FIRST
  const balanceCheck = await checkUserBalance(user.id, amount);
  if (!balanceCheck.success) {
    return balanceCheck.message!;
  }

  const transaction = await prisma.vtuTransaction.create({
    data: {
      userId: user.id,
      transactionType: VtuType.EDUCATION,
      product: productInfo.serviceId,
      amount: amount,
      totalDebited: 0,
      phoneNumber: user.phone,
      networkPlan: productInfo.variationCode,
      status: TransactionStatus.PENDING,
      channel: ChannelType.WHATSAPP,
      isBulkPurchase: quantity > 1,
      bulkQuantity: quantity > 1 ? quantity : undefined,
      metadata: {
        source: "WhatsApp",
        service: "EDUCATION",
        timestamp: new Date().toISOString(),
        productType: product,
        productName: productInfo.name,
        quantity: quantity,
        queued: false,
        requiresPin: true,
        balanceAtPurchase: balanceCheck.balance,
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
        validationExpiry: validationExpiry,
      },
    },
  });

  const appUrl = getAppUrl();
  const purchaseLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

  return `🎓 Education Purchase Initiated!

Product: ${productInfo.name}
Quantity: ${quantity}
Amount: NGN ${amount.toFixed(2)}
Reference: ${transaction.id.substring(0, 10)}

🔹 **Complete Purchase:** ${purchaseLink}
🔹 **PIN Required:** Enter your transaction PIN

This link expires in 5 minutes.

You'll receive a confirmation via WhatsApp after completion.`;
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
    return `No Transactions\n\nStart using Bilscore today! Type HELP to see available commands.`;
  }

  let message = "Recent Transactions:\n\n";
  transactions.forEach((tx, i) => {
    const status = tx.status === "SUCCESS" ? "[OK]" : tx.status === "PENDING" ? "[PENDING]" : "[FAILED]";
    const type = tx.transactionType.replace("_", " ");
    message += `${i + 1}. ${status} ${type}\n`;
    message += `   Amount: NGN ${Number(tx.amount).toFixed(2)}\n`;
    message += `   ${new Date(tx.createdAt).toLocaleDateString()}\n\n`;
  });

  const total = await prisma.vtuTransaction.count({ where: { userId } });
  message += `Total: ${total} transactions`;
  return message;
}

// ============================================================
// PIN HANDLER
// ============================================================

async function handlePinCommand(user: any, parts: string[]): Promise<string> {
  if (parts.length < 2) {
    return `Set Transaction PIN\n\nTo set up your transaction PIN, reply with:\nPIN [4-6 digit PIN]\n\nExample: PIN 1234\n\nYour PIN will be encrypted and used for transaction verification.`;
  }

  const pin = parts[1];
  if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return `Invalid PIN Format\n\nPlease use 4-6 digits only.\nExample: PIN 1234`;
  }

  if (user.pinHash) {
    return `PIN Already Set\n\nYou already have a transaction PIN set.\nTo change your PIN, please use the Bilscore mobile app or website.\n\n${getAppUrl()}/profile`;
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

  return `PIN Set Successfully!\n\nYour PIN has been encrypted and saved.\nYou'll need this PIN for all transactions.\n\nPIN: **** (hidden for security)\n\nKeep your PIN safe and never share it with anyone.\n\nYou can change your PIN anytime in the Bilscore app.`;
}

// ============================================================
// HELP MESSAGE
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

QR [meter_number] - Get QR code for a specific meter
QR [index] - Get QR code by meter index

Referral:
REFERRAL - Get referral link

Need help? Visit: ${getAppUrl()}/support`;
}

// ============================================================
// MAIN WEBHOOK HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  try {
    console.log(`[Twilio Webhook] Request received`);
    
    let body = "";
    let from = "";
    let to = "";
    let messageSid = "";
    let accountSid = "";
    let numMedia = "0";
    
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params.entries()) {
        if (key === "Body") body = value;
        if (key === "From") from = value;
        if (key === "To") to = value;
        if (key === "MessageSid") messageSid = value;
        if (key === "AccountSid") accountSid = value;
        if (key === "NumMedia") numMedia = value;
      }
    } else if (contentType.includes('application/json')) {
      const jsonBody = await request.json();
      body = jsonBody.Body || jsonBody.body || "";
      from = jsonBody.From || jsonBody.from || "";
      to = jsonBody.To || jsonBody.to || "";
      messageSid = jsonBody.MessageSid || jsonBody.messageSid || "";
      accountSid = jsonBody.AccountSid || jsonBody.accountSid || "";
      numMedia = jsonBody.NumMedia || jsonBody.numMedia || "0";
    } else {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
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

    console.log(`[Twilio] From: ${whatsappFrom}, Body: "${body}"`);

    if (parseInt(numMedia) > 0) {
      return new NextResponse(buildTwilioResponse("We only support text messages. Type HELP to see commands."), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (!body || body.trim() === "") {
      return new NextResponse(buildTwilioResponse(`Welcome to Bilscore! Visit ${getAppUrl()} to get started.`), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    let user = await prisma.user.findFirst({
      where: { phone: whatsappFrom },
      include: { wallet: true },
    });

    if (!user) {
      const upperBody = body.toUpperCase().trim();
      if (upperBody.startsWith("REG") || upperBody === "REGISTER" || upperBody === "SIGNUP" || upperBody === "JOIN") {
        const responseMessage = await handleUserRegistration(whatsappFrom, body);
        return new NextResponse(buildTwilioResponse(responseMessage), {
          headers: { "Content-Type": "text/xml" },
        });
      }
      return new NextResponse(buildTwilioResponse(`Welcome! To register, reply with: REG [Full Name] [Email] [Username]`), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    try {
      await prisma.channel.upsert({
        where: { channelIdentifier: whatsappFrom },
        update: { userId: user.id, lastSeen: new Date(), isVerified: true },
        create: {
          userId: user.id,
          channelType: ChannelType.WHATSAPP,
          channelIdentifier: whatsappFrom,
          channelUsername: whatsappFrom,
          isVerified: true,
          linkedAt: new Date(),
          lastSeen: new Date(),
        },
      });
    } catch (error) {
      console.error("Channel upsert error:", error);
    }

    const responseMessage = await processWhatsAppCommand(user, body, whatsappFrom);

    return new NextResponse(buildTwilioResponse(responseMessage), {
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("[Twilio Webhook] Error:", error);
    return new NextResponse(buildTwilioResponse("An error occurred. Please try again later."), {
      headers: { "Content-Type": "text/xml" },
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
      return `You are already registered with Bilscore. Type HELP to see available commands.`;
    }

    const parts = body.split(" ").filter(p => p.length > 0);
    const command = parts[0].toUpperCase();
    
    if (command === "REG" || command === "REGISTER" || command === "SIGNUP") {
      if (parts.length < 4) {
        return `Welcome to Bilscore!\n\nTo register, please provide your details:\nREG [Full Name] [Email] [Username]\n\nExample: REG John Doe john@email.com johndoe\n\nOr visit: ${getAppUrl()}/auth`;
      }

      let fullName = "";
      let email = "";
      let username = "";
      
      if (parts.length >= 4) {
        let emailIndex = -1;
        for (let i = 1; i < parts.length; i++) {
          if (parts[i].includes('@')) {
            emailIndex = i;
            break;
          }
        }
        
        if (emailIndex > 0) {
          const nameParts = parts.slice(1, emailIndex);
          fullName = nameParts.join(' ');
          email = parts[emailIndex];
          username = parts[emailIndex + 1] || parts[emailIndex].split('@')[0];
        } else {
          fullName = parts[1] || 'User';
          email = parts[2] || `${phone}@bilscore.com`;
          username = parts[3] || `user_${phone.substring(phone.length - 4)}`;
        }
      } else {
        fullName = parts[1] || 'User';
        email = parts[2] || `${phone}@bilscore.com`;
        username = parts[3] || `user_${phone.substring(phone.length - 4)}`;
      }

      const existingEmail = await prisma.user.findUnique({
        where: { email: email },
      });

      if (existingEmail) {
        return `Email ${email} is already registered. Please use a different email or try logging in.`;
      }

      const existingUsername = await prisma.user.findUnique({
        where: { username: username },
      });

      if (existingUsername) {
        username = `${username}_${Math.floor(100 + Math.random() * 900)}`;
      }

      const user = await prisma.user.create({
        data: {
          fullName: fullName,
          email: email,
          username: username,
          phone: phone,
          passwordHash: await hash(Math.random().toString(36).slice(-8), 10),
          referralCode: `BIL${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          role: "USER",
          status: "ACTIVE",
          emailVerified: false,
          phoneVerified: true,
          isActive: true,
        },
      });

      let wallet = null;
      try {
        wallet = await prisma.wallet.create({
          data: {
            userId: user.id,
            walletBalance: 0,
            accountName: fullName,
            accountNumber: `BIL${String(Math.floor(100000 + Math.random() * 900000)).padStart(6, '0')}`,
            currency: "NGN",
            isActive: true,
          },
        });
      } catch (walletError) {
        console.error("Wallet creation error:", walletError);
        return `Registration partially completed but wallet creation failed. Please try again.`;
      }

      try {
        await prisma.customer.create({
          data: {
            userId: user.id,
            phone: phone,
            fullName: fullName,
            email: email,
            customerType: "INDIVIDUAL",
            isActive: true,
          },
        });
      } catch (customerError) {
        console.error("Customer creation error:", customerError);
      }

      try {
        const refCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await prisma.referral.create({
          data: {
            referrerId: user.id,
            referralCode: refCode,
            status: "ACTIVE",
          },
        });
      } catch (referralError) {
        console.error("Referral creation error:", referralError);
      }

      return `Welcome ${fullName}! Registration successful.

Wallet Number: ${wallet?.accountNumber || 'N/A'}
Username: ${username}
Email: ${email}

Type HELP to see available commands.`;
    }

    return `Welcome to Bilscore!\n\nTo register, please provide your details:\nREG [Full Name] [Email] [Username]\n\nExample: REG John Doe john@email.com johndoe`;
  } catch (error: any) {
    console.error("[WhatsApp] Registration error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// MAIN COMMAND PROCESSOR
// ============================================================

async function processWhatsAppCommand(user: any, body: string, phone: string): Promise<string> {
  const command = body.toUpperCase().trim();
  const parts = body.split(" ").filter(p => p.length > 0);

  // ============================================================
  // SPECIAL CASE: Just an index number (e.g., "1", "2", "3")
  // ============================================================
  if (/^\d+$/.test(command) && !command.startsWith("0")) {
    const session = userSessions.get(user.id);
    
    if (session && session.command === 'DATA' && (Date.now() - session.timestamp) < SESSION_TIMEOUT) {
      const targetPhone = session.phoneNumber;
      const isOwnNumber = session.isOwnNumber;
      const network = session.network;
      const indexNum = parseInt(command);
      
      const planInfo = await getPlanByIndexForNetwork(network, indexNum);
      
      if (!planInfo) {
        const plans = await getAvailablePlansForNetwork(network, targetPhone);
        return `Invalid Plan Index\n\nNo plan found with index ${indexNum} for ${network}.\n\n${plans}`;
      }
      
      const planData = planInfo.planData;
      const provider = planInfo.provider;
      const planId = planInfo.planId;
      const normalizedTarget = normalizePhoneNumber(targetPhone);
      const amount = Number(planData.price);
      
      userSessions.delete(user.id);
      
      // ✅ CHECK BALANCE FIRST
      const balanceCheck = await checkUserBalance(user.id, amount);
      if (!balanceCheck.success) {
        return balanceCheck.message!;
      }
      
      // ✅ If it's the user's own number, no PIN needed (use job)
      if (isOwnNumber) {
        const transaction = await prisma.vtuTransaction.create({
          data: {
            userId: user.id,
            transactionType: VtuType.DATA,
            product: `${network} - ${planData.data}`,
            amount: amount,
            totalDebited: 0,
            phoneNumber: normalizedTarget,
            network: mapNetwork(network),
            networkPlan: planData.planCode || planData.data,
            status: TransactionStatus.PROCESSING,
            channel: ChannelType.WHATSAPP,
            metadata: {
              source: "WhatsApp",
              service: "DATA",
              timestamp: new Date().toISOString(),
              network: network,
              planData: planData,
              provider: provider,
              isOwnNumber: true,
              queued: true,
              requiresPin: false,
              planId: planId,
              balanceAtPurchase: balanceCheck.balance,
            },
          },
        });

        await createJob(
          JobType.VTU_TRANSACTION,
          {
            transactionId: transaction.id,
            userId: user.id,
            phoneNumber: normalizedTarget,
            planData: planData,
            provider: provider,
            detectedNetwork: network,
            serviceType: "DATA",
            isOwnNumber: true,
            planId: planId,
          },
          5,
          3,
          new Date()
        );

        const dataDisplay = planData.data || `${planData.amountMB || 0}MB`;

        return `Processing your data purchase...!

Phone: ${normalizedTarget}
Plan: ${dataDisplay} (${provider})
Amount: NGN ${amount.toFixed(2)}
Network: ${network}
Reference: ${transaction.id.substring(0, 10)}

You'll receive a confirmation shortly.`;
      }
      
      // ✅ PIN REQUIRED - no job
      const transaction = await prisma.vtuTransaction.create({
        data: {
          userId: user.id,
          transactionType: VtuType.DATA,
          product: `${network} - ${planData.data}`,
          amount: amount,
          totalDebited: 0,
          phoneNumber: normalizedTarget,
          network: mapNetwork(network),
          networkPlan: planData.planCode || planData.data,
          status: TransactionStatus.PENDING,
          channel: ChannelType.WHATSAPP,
          metadata: {
            source: "WhatsApp",
            service: "DATA",
            timestamp: new Date().toISOString(),
            network: network,
            planData: planData,
            provider: provider,
            isOwnNumber: false,
            queued: false,
            requiresPin: true,
            planId: planId,
            balanceAtPurchase: balanceCheck.balance,
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
            validationExpiry: validationExpiry,
          },
        },
      });

      const appUrl = getAppUrl();
      const purchaseLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

      const dataDisplay = planData.data || `${planData.amountMB || 0}MB`;

      return `📱 Data Purchase Initiated!

Phone: ${normalizedTarget}
Plan: ${dataDisplay} (${provider})
Amount: NGN ${amount.toFixed(2)}
Network: ${network}
Reference: ${transaction.id.substring(0, 10)}

🔹 **Complete Purchase:** ${purchaseLink}
🔹 **PIN Required:** Enter your transaction PIN

This link expires in 5 minutes.

You'll receive a confirmation via WhatsApp after completion.`;
    }
    
    // No session, show help for DATA command
    const normalizedUserPhone = normalizePhoneNumber(user.phone);
    const detectedNetwork = detectNetworkFromPhone(normalizedUserPhone);
    
    if (!detectedNetwork) {
      return `Could Not Detect Your Network\n\nPlease type DATA to see available plans for your number.`;
    }
    
    userSessions.set(user.id, {
      command: 'DATA',
      phoneNumber: user.phone,
      network: detectedNetwork,
      isOwnNumber: true,
      timestamp: Date.now()
    });
    
    const plans = await getAvailablePlansForNetwork(detectedNetwork, user.phone);
    return `📱 Buy Data

DATA [index] - Buy data for YOUR number (no PIN)
DATA [phone] - Show plans for another number
DATA [phone] [index] - Buy data for another number (PIN required)

${plans}`;
  }

  // ============================================================
  // HELP
  // ============================================================
  if (command === "HELP" || command === "?") {
    userSessions.delete(user.id);
    return getHelpMessage(user);
  }

  // ============================================================
  // REGISTER
  // ============================================================
  if (command.startsWith("REG") || command === "REGISTER" || command === "SIGNUP" || command === "JOIN") {
    userSessions.delete(user.id);
    return `You are already registered with Bilscore! Type HELP to see available commands.`;
  }

  // ============================================================
  // BALANCE
  // ============================================================
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

    return `Balance: NGN ${Number(balance).toFixed(2)}
Name: ${wallet?.accountName || user.fullName}
Number: ${wallet?.accountNumber || 'N/A'}

Quick Stats:
Total Transactions: ${totalTxns}
Referrals: ${referrals}
Wallet Status: ${wallet?.isActive ? "Active" : "Inactive"}

Type HELP for available commands.`;
  }

  // ============================================================
  // DATA ALL
  // ============================================================
  if (command === "DATA ALL") {
    userSessions.delete(user.id);
    const pricingUrl = "https://bilscore.com/pricing";
    return `All Data Plans & Pricing\n\nView our complete data pricing list at:\n${pricingUrl}\n\nType DATA to see available plans for your network.`;
  }

  // ============================================================
  // DATA COMMAND - WITH BOTH FLOWS
  // ============================================================
  if (command.startsWith("DATA") || command.startsWith("DATA ")) {
    let targetPhone: string;
    let planQuery: string;
    let isOwnNumber = false;
    
    // CASE 1: Just "DATA" - Show available plans
    if (parts.length === 1 && command === "DATA") {
      const normalizedUserPhone = normalizePhoneNumber(user.phone);
      const detectedNetwork = detectNetworkFromPhone(normalizedUserPhone);
      
      if (!detectedNetwork) {
        return `Could Not Detect Your Network\n\nPlease ensure your phone number is correct.`;
      }
      
      userSessions.set(user.id, {
        command: 'DATA',
        phoneNumber: user.phone,
        network: detectedNetwork,
        isOwnNumber: true,
        timestamp: Date.now()
      });
      
      const plans = await getAvailablePlansForNetwork(detectedNetwork, user.phone);
      return `📱 Buy Data for YOUR number (${normalizedUserPhone})

DATA [index] - Buy data (no PIN)
DATA [phone] - Show plans for another number
DATA [phone] [index] - Buy data for another number (PIN required)

${plans}`;
    }
    
    // CASE 2: "DATA [something]" - 2 parts
    if (parts.length === 2) {
      const firstParam = parts[1];
      const isPhoneNumber = /^[\d+]{10,15}$/.test(firstParam.replace(/\s/g, ''));
      
      if (isPhoneNumber) {
        // It's a phone number - show plans for that number
        targetPhone = firstParam;
        const normalizedTarget = normalizePhoneNumber(targetPhone);
        const detectedNetwork = detectNetworkFromPhone(normalizedTarget);
        
        if (!detectedNetwork) {
          return `Could Not Detect Network\n\nWe couldn't detect the network for ${targetPhone}.`;
        }
        
        const normalizedUser = normalizePhoneNumber(user.phone);
        isOwnNumber = normalizedTarget === normalizedUser;
        
        userSessions.set(user.id, {
          command: 'DATA',
          phoneNumber: targetPhone,
          network: detectedNetwork,
          isOwnNumber: isOwnNumber,
          timestamp: Date.now()
        });
        
        const plans = await getAvailablePlansForNetwork(detectedNetwork, targetPhone);
        return `📱 Buy Data for ${targetPhone}

Just type the index number to buy (${isOwnNumber ? 'no PIN' : 'PIN required'})

${plans}`;
      }
      
      // It's a plan index - buy for user's own number (NO PIN)
      targetPhone = user.phone;
      planQuery = firstParam;
      isOwnNumber = true;
      
      const normalizedTarget = normalizePhoneNumber(targetPhone);
      const detectedNetwork = detectNetworkFromPhone(normalizedTarget);
      
      if (!detectedNetwork) {
        return `Could Not Detect Your Network\n\nPlease ensure your phone number is correct.`;
      }
      
      // ✅ NO PIN - uses job (balance check inside)
      return await processDataPurchaseWithQueue(user, targetPhone, planQuery, detectedNetwork, isOwnNumber);
    }
    
    // CASE 3: "DATA [phone] [index]" - 3 parts
    if (parts.length >= 3) {
      targetPhone = parts[1];
      planQuery = parts.slice(2).join(' ');
      const normalizedTarget = normalizePhoneNumber(targetPhone);
      const normalizedUser = normalizePhoneNumber(user.phone);
      isOwnNumber = normalizedTarget === normalizedUser;
      const detectedNetwork = detectNetworkFromPhone(normalizedTarget);
      
      if (!detectedNetwork) {
        return `Could Not Detect Network\n\nWe couldn't detect the network for ${targetPhone}.`;
      }
      
      // ✅ If it's the user's own number, no PIN needed
      if (isOwnNumber) {
        return await processDataPurchaseWithQueue(user, targetPhone, planQuery, detectedNetwork, true);
      }
      
      // ✅ PIN REQUIRED - no job (balance check inside)
      return await processDataPurchaseWithPin(user, targetPhone, planQuery, detectedNetwork);
    }
    
    // Default: Show help
    const normalizedUserPhone = normalizePhoneNumber(user.phone);
    const detectedNetwork = detectNetworkFromPhone(normalizedUserPhone);
    const plans = await getAvailablePlansForNetwork(detectedNetwork || 'MTN', user.phone);
    
    return `📱 Buy Data

DATA - Show available plans for YOUR number
DATA [index] - Buy data for YOUR number (no PIN)
DATA [phone] - Show plans for another number
DATA [phone] [index] - Buy data for another number (PIN required)

${plans}`;
  }



  // In processWhatsAppCommand function, add this after the METERS command:

// ============================================================
// QR COMMAND - Get QR code for a specific meter
// ============================================================
if (command === "QR" || command.startsWith("QR ")) {
  userSessions.delete(user.id);
  
  const qrParts = body.split(" ").filter(p => p.length > 0);
  
  // If just "QR", show instructions
  if (qrParts.length === 1) {
    const meters = await prisma.savedMeter.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      take: 5,
    });
    
    if (meters.length === 0) {
      return `No saved meters found.\n\nAdd a meter first with:\nADDMETER [meter_number] [disco_code] [name]`;
    }
    
    let msg = "📱 *Get QR Code*\n\nReply with:\nQR [meter_number] or QR [index]\n\nExample: QR 1234567890\n\nYour saved meters:\n";
    meters.forEach((meter, index) => {
      msg += `   ${index + 1}. ${meter.meterNumber} - ${meter.name || meter.disco}\n`;
    });
    if (meters.length > 5) {
      msg += `\n... and ${meters.length - 5} more. Use METERS to see all.`;
    }
    return msg;
  }
  
  // Get the meter number or index
  const query = qrParts[1];
  let meterNumber = query;
  let foundMeter = null;
  
  // Check if it's an index
  if (/^\d+$/.test(query)) {
    const index = parseInt(query) - 1;
    const meters = await prisma.savedMeter.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    
    if (index >= 0 && index < meters.length) {
      foundMeter = meters[index];
      meterNumber = foundMeter.meterNumber;
    } else {
      return `Invalid meter index: ${query}\n\nUse METERS to see your saved meters.`;
    }
  } else {
    // Find by meter number
    foundMeter = await prisma.savedMeter.findFirst({
      where: { 
        userId: user.id, 
        meterNumber: meterNumber 
      },
    });
  }
  
  if (!foundMeter) {
    return `Meter ${meterNumber} not found.\n\nUse METERS to see your saved meters.`;
  }
  
  // Generate QR code
  const qrLink = await generateMeterQRCode(userId, foundMeter.meterNumber, foundMeter.disco);
  
  if (!qrLink) {
    return `Failed to generate QR code for meter ${foundMeter.meterNumber}. Please try again.`;
  }
  
  let response = `📱 *QR Code for ${foundMeter.name || 'Meter'}*\n\n`;
  response += `🏢 ${foundMeter.disco}\n`;
  response += `📟 ${foundMeter.meterNumber}\n`;
  if (foundMeter.customerName) {
    response += `👤 ${foundMeter.customerName}\n`;
  }
  response += `\n🔗 *QR Link:*\n${qrLink}\n\n`;
  response += `📌 Print this QR code and paste it on your meter for quick payments.\n\n`;
  response += `To buy electricity: POWER ${foundMeter.meterNumber} [amount]`;
  
  return response;
}

  // ============================================================
  // METER MANAGEMENT
  // ============================================================
  
  if (command.startsWith("ADDMETER") || command.startsWith("ADD METER")) {
    userSessions.delete(user.id);
    const addParts = body.split(" ").filter(p => p.length > 0);
    if (addParts.length < 4) {
      const discosList = await getAvailableDiscosForWhatsApp();
      return `Add Meter\n\nTo add a meter, reply with:\nADDMETER [meter_number] [disco_code] [name]\n\nAvailable DisCos:\n${discosList}\n\nExample: ADDMETER 1234567890 ABUJA HOME`;
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
      return `Missing Meter Number\n\nPlease specify the meter number to delete.\nExample: DELETEMETER 1234567890`;
    }
    const meterNumber = deleteParts[1];
    return await deleteMeter(user.id, meterNumber);
  }

  if (command.startsWith("SETDEFAULTMETER") || command.startsWith("SET DEFAULT METER")) {
    userSessions.delete(user.id);
    const defaultParts = body.split(" ").filter(p => p.length > 0);
    if (defaultParts.length < 2) {
      return `Missing Selection\n\nPlease specify the meter number or index.\nExample: SETDEFAULTMETER 1\nOr: SETDEFAULTMETER 1234567890`;
    }
    const meterId = defaultParts[1];
    return await setDefaultMeter(user.id, meterId);
  }

  // ============================================================
  // DECODER MANAGEMENT
  // ============================================================

  if (command.startsWith("ADDDECODER") || command.startsWith("ADD DECODER")) {
    userSessions.delete(user.id);
    const addParts = body.split(" ").filter(p => p.length > 0);
    if (addParts.length < 4) {
      return `Add Decoder

To add a decoder, reply with:
ADDDECODER [decoder_number] [provider] [name]

Example: ADDDECODER 1234567890 DSTV LIVING_ROOM

Available providers: DSTV, GOTV, STARTIMES`;
    }

    const [, decoderNumber, provider, ...nameParts] = addParts;
    const name = nameParts.join(" ");
    const result = await addDecoderWithVerification(user.id, decoderNumber, provider, name);
    return result;
  }

  if (command === "DECODERS" || command === "LIST DECODERS") {
    userSessions.delete(user.id);
    return await listDecoders(user.id);
  }

  if (command.startsWith("DELETEDECODER") || command.startsWith("DELETE DECODER")) {
    userSessions.delete(user.id);
    const deleteParts = body.split(" ").filter(p => p.length > 0);
    if (deleteParts.length < 2) {
      return `Missing Decoder Number\n\nPlease specify the decoder number to delete.\nExample: DELETEDECODER 1234567890`;
    }
    const decoderNumber = deleteParts[1];
    return await deleteDecoder(user.id, decoderNumber);
  }

  if (command.startsWith("SETDEFAULTDECODER") || command.startsWith("SET DEFAULT DECODER")) {
    userSessions.delete(user.id);
    const defaultParts = body.split(" ").filter(p => p.length > 0);
    if (defaultParts.length < 2) {
      return `Missing Selection\n\nPlease specify the decoder number or index.\nExample: SETDEFAULTDECODER 1\nOr: SETDEFAULTDECODER 1234567890`;
    }
    const decoderId = defaultParts[1];
    return await setDefaultDecoder(user.id, decoderId);
  }

  // ============================================================
  // DISCOS
  // ============================================================
  if (command === "DISCOS" || command === "DISCO" || command === "DISCOS?") {
    userSessions.delete(user.id);
    const discosList = getValidDiscosList();
    return `Available DisCos (use full name or acronym):\n\n${discosList}\n\nExamples:\n- ADDMETER 1234567890 ABUJA HOME\n- ADDMETER 1234567890 AEDC HOME\n- ADDMETER 1234567890 IKEDC HOME\n\nTo buy electricity:\nELECTRIC [meter_number] [disco] [amount]\nExample: ELECTRIC 1234567890 ABUJA 5000`;
  }

  // ============================================================
  // PACKAGES
  // ============================================================
  if (command.startsWith("PACKAGES") || command === "PACKAGE") {
    userSessions.delete(user.id);
    const packageParts = body.split(" ").filter(p => p.length > 0);
    const provider = packageParts.length > 1 ? packageParts[1] : "DSTV";
    const packagesList = await getAvailablePackagesForWhatsApp(provider);
    return packagesList;
  }

  // ============================================================
  // SUBSCRIPTIONS
  // ============================================================
  if (command.startsWith("SCHEDULE") || command.startsWith("SUBSCRIBE")) {
    userSessions.delete(user.id);
    const scheduleParts = body.split(" ").filter(p => p.length > 0);
    
    if (scheduleParts.length < 4) {
      return `Schedule Electricity Token Delivery\n\nSCHEDULE [meter_index] [amount] [days]\n\nExample: SCHEDULE 1 5000 7\n\nThis schedules a token for delivery in 7 days.\n\nAvailable meters:\n${await getSavedMetersList(user.id)}`;
    }

    const [, indexStr, amountStr, daysStr] = scheduleParts;
    const index = parseInt(indexStr) - 1;
    const amount = parseFloat(amountStr);
    const days = parseInt(daysStr);

    if (isNaN(index) || index < 0) {
      return `Invalid Meter Selection\n\nPlease choose a number from the list.`;
    }

    if (isNaN(amount) || amount < 100) {
      return `Invalid Amount\n\nMinimum is NGN 100.`;
    }

    if (isNaN(days) || days < 3) {
      return `Invalid Days\n\nMinimum is 3 days.`;
    }

    const meters = await prisma.savedMeter.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    if (index >= meters.length) {
      return `Invalid Meter Selection\n\nPlease choose a number from the list.`;
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
      return `Missing Subscription ID\n\nTo cancel a subscription:\nCANCEL [subscription_id]\n\nTo see your active subscriptions: SUBSCRIPTIONS`;
    }
    const subscriptionId = cancelParts[1];
    return await cancelSubscription(user.id, subscriptionId);
  }

  // ============================================================
  // EDUCATION
  // ============================================================
  if (command.startsWith("EDU") || command === "EDUCATION" || 
      command.startsWith("WAEC") || command.startsWith("JAMB") || 
      command.startsWith("NECO") || command === "WAEC-RESULT") {
    userSessions.delete(user.id);
    
    const eduParts = body.split(" ").filter(p => p.length > 0);
    const cmd = eduParts[0].toUpperCase();
    
    if (cmd === "EDU" || cmd === "EDUCATION") {
      const productsList = await getAvailableEducationProducts();
      return `Education Services:\n\n${productsList}\n\nTo purchase:\nEDU [product] [quantity]\n\nExamples:\nEDU WAEC 2\nEDU JAMB 1\nEDU NECO 3\n\nAvailable products: WAEC, JAMB, NECO, WAEC-RESULT`;
    }

    if (eduParts.length >= 3 && (cmd === "EDU" || cmd === "EDUCATION")) {
      const product = eduParts[1].toUpperCase();
      const quantity = parseInt(eduParts[2]);
      if (isNaN(quantity) || quantity < 1) {
        return `Invalid Quantity\n\nPlease enter a number greater than 0.\nExample: EDU WAEC 2`;
      }
      return await processEducationPurchaseWhatsApp(user, product, quantity);
    }

    if (eduParts.length >= 2 && ["WAEC", "JAMB", "NECO", "WAEC-RESULT"].includes(cmd)) {
      const quantity = parseInt(eduParts[1]);
      if (isNaN(quantity) || quantity < 1) {
        return `Invalid Quantity\n\nPlease enter a number greater than 0.\nExample: WAEC 2`;
      }
      return await processEducationPurchaseWhatsApp(user, cmd, quantity);
    }

    const productsList = await getAvailableEducationProducts();
    return `Education Services:\n\n${productsList}\n\nTo purchase:\nEDU [product] [quantity]\n\nExamples:\nEDU WAEC 2\nEDU JAMB 1\nEDU NECO 3\nWAEC 2\nJAMB 1\n\nAvailable products: WAEC, JAMB, NECO, WAEC-RESULT`;
  }

  // ============================================================
  // TRANSACTIONS
  // ============================================================
  if (command === "TRANSACTIONS" || command === "TXNS" || command === "HISTORY") {
    userSessions.delete(user.id);
    return await getTransactionHistory(user.id);
  }

  // ============================================================
  // REFERRAL
  // ============================================================
  if (command === "REFERRAL" || command === "REF") {
    userSessions.delete(user.id);
    const referralCode = user.referralCode || "N/A";
    const link = `${getAppUrl()}/auth?ref=${referralCode}`;
    const count = await prisma.referral.count({
      where: { referrerId: user.id },
    });
    
    return `Your Referral Program\n\nReferral Code: ${referralCode}\nTotal Referrals: ${count}\nReferral Bonus: NGN 50 per signup\n\nShare your link:\n${link}\n\nCopy this link and share with friends to earn rewards!`;
  }

  // ============================================================
  // PIN
  // ============================================================
  if (command === "PIN" || command.startsWith("PIN ")) {
    userSessions.delete(user.id);
    return await handlePinCommand(user, parts);
  }

  // ============================================================
  // AIRTIME COMMAND - WITH BOTH FLOWS AND BALANCE CHECK
  // ============================================================
  if (command.startsWith("AIRTIME") || command.startsWith("AIRTIME ")) {
    userSessions.delete(user.id);
    
    if (parts.length === 2) {
      const amountStr = parts[1];
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount < 50) {
        return `Invalid Amount. Minimum is NGN 50. Example: AIRTIME 500`;
      }
      
      // ✅ CHECK BALANCE FIRST
      const balanceCheck = await checkUserBalance(user.id, amount);
      if (!balanceCheck.success) {
        return balanceCheck.message!;
      }
      
      const normalizedUserPhone = normalizePhoneNumber(user.phone);
      const detectedNetwork = detectNetworkFromPhone(normalizedUserPhone);
      if (!detectedNetwork) {
        return `Could not detect your network. Please ensure your phone number is correct.`;
      }

      // ✅ NO PIN - for your own number
      const transaction = await prisma.vtuTransaction.create({
        data: {
          userId: user.id,
          transactionType: VtuType.AIRTIME,
          product: detectedNetwork,
          amount: amount,
          totalDebited: 0,
          phoneNumber: normalizedUserPhone,
          network: mapNetwork(detectedNetwork),
          status: TransactionStatus.PROCESSING,
          channel: ChannelType.WHATSAPP,
          metadata: {
            source: "WhatsApp",
            service: "AIRTIME",
            timestamp: new Date().toISOString(),
            network: detectedNetwork,
            queued: true,
            requiresPin: false,
            balanceAtPurchase: balanceCheck.balance,
          },
        },
      });

      await createJob(
        JobType.VTU_TRANSACTION,
        {
          transactionId: transaction.id,
          userId: user.id,
          phoneNumber: normalizedUserPhone,
          amount: amount,
          detectedNetwork: detectedNetwork,
          serviceType: "AIRTIME",
        },
        5,
        3,
        new Date()
      );

      return `Processing your airtime purchase...

Phone: ${normalizedUserPhone}
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
Reference: ${transaction.id.substring(0, 10)}

You'll receive a confirmation shortly.`;
    }
    
    if (parts.length >= 3) {
      const phoneInput = parts[1];
      const amountStr = parts[2];
      const amount = parseFloat(amountStr);
      
      if (isNaN(amount) || amount < 50) {
        return `Invalid Amount. Minimum is NGN 50. Example: AIRTIME 08012345678 500`;
      }
      
      // ✅ CHECK BALANCE FIRST
      const balanceCheck = await checkUserBalance(user.id, amount);
      if (!balanceCheck.success) {
        return balanceCheck.message!;
      }
      
      const normalizedPhone = normalizePhoneNumber(phoneInput);
      const detectedNetwork = detectNetworkFromPhone(normalizedPhone);
      if (!detectedNetwork) {
        return `Could not detect network for ${phoneInput}. Please ensure the phone number is correct.`;
      }
      
      const normalizedUserPhone = normalizePhoneNumber(user.phone);
      const isOwnNumber = normalizedPhone === normalizedUserPhone;

      // ✅ If it's the user's own number, no PIN needed
      if (isOwnNumber) {
        const transaction = await prisma.vtuTransaction.create({
          data: {
            userId: user.id,
            transactionType: VtuType.AIRTIME,
            product: detectedNetwork,
            amount: amount,
            totalDebited: 0,
            phoneNumber: normalizedPhone,
            network: mapNetwork(detectedNetwork),
            status: TransactionStatus.PROCESSING,
            channel: ChannelType.WHATSAPP,
            metadata: {
              source: "WhatsApp",
              service: "AIRTIME",
              timestamp: new Date().toISOString(),
              network: detectedNetwork,
              isOwnNumber: true,
              queued: true,
              requiresPin: false,
              balanceAtPurchase: balanceCheck.balance,
            },
          },
        });

        await createJob(
          JobType.VTU_TRANSACTION,
          {
            transactionId: transaction.id,
            userId: user.id,
            phoneNumber: normalizedPhone,
            amount: amount,
            detectedNetwork: detectedNetwork,
            serviceType: "AIRTIME",
            isOwnNumber: true,
          },
          5,
          3,
          new Date()
        );

        return `Processing your airtime purchase...

Phone: ${normalizedPhone}
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
Reference: ${transaction.id.substring(0, 10)}

You'll receive a confirmation shortly.`;
      }

      // ✅ PIN REQUIRED - for another number
      const transaction = await prisma.vtuTransaction.create({
        data: {
          userId: user.id,
          transactionType: VtuType.AIRTIME,
          product: detectedNetwork,
          amount: amount,
          totalDebited: 0,
          phoneNumber: normalizedPhone,
          network: mapNetwork(detectedNetwork),
          status: TransactionStatus.PENDING,
          channel: ChannelType.WHATSAPP,
          metadata: {
            source: "WhatsApp",
            service: "AIRTIME",
            timestamp: new Date().toISOString(),
            network: detectedNetwork,
            isOwnNumber: false,
            queued: false,
            requiresPin: true,
            balanceAtPurchase: balanceCheck.balance,
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
            validationExpiry: validationExpiry,
          },
        },
      });

      const appUrl = getAppUrl();
      const purchaseLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

      return `📱 Airtime Purchase Initiated!

Phone: ${normalizedPhone}
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
Reference: ${transaction.id.substring(0, 10)}

🔹 **Complete Purchase:** ${purchaseLink}
🔹 **PIN Required:** Enter your transaction PIN

This link expires in 5 minutes.

You'll receive a confirmation via WhatsApp after completion.`;
    }
    
    return `Buy Airtime\n\nAIRTIME [amount] - For YOUR number (no PIN)\nAIRTIME [phone] [amount] - For another number (PIN required)\n\nMinimum amount: NGN 50`;
  }

  // ============================================================
  // CABLE COMMAND - WITH PIN (always requires PIN)
  // ============================================================
  if (command.startsWith("CABLE") || command.startsWith("TV")) {
    userSessions.delete(user.id);
    
    if (command === "CABLE" || command === "TV") {
      const decoders = await prisma.savedDecoder.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });

      if (decoders.length === 0) {
        return `No saved decoders.\n\nAdd one with:\nADDDECODER [decoder_number] [provider] [name]\n\nAvailable providers: DSTV, GOTV, STARTIMES\n\nAfter adding, you can buy cable by just typing CABLE!`;
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

    const cableParts = body.split(" ").filter(p => p.length > 0);
    
    if (cableParts.length >= 3) {
      const [, indexStr, packageQuery] = cableParts;
      const index = parseInt(indexStr) - 1;
      
      if (isNaN(index) || index < 0) {
        return `Invalid Selection\n\nPlease choose a number from the list.\nExample: CABLE 1 PREMIUM`;
      }
      
      const decoders = await prisma.savedDecoder.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      
      if (index >= decoders.length) {
        return `Invalid Selection\n\nPlease choose a number from the list.`;
      }
      
      const selectedDecoder = decoders[index];

      await getAvailablePackagesForWhatsApp(selectedDecoder.provider);
      
      // ✅ PIN REQUIRED for Cable TV - check balance first
      // Get package price
      const packages = await getAvailablePackagesForWhatsApp(selectedDecoder.provider);
      // Parse price from package list (simplified - you may want to fetch actual price)
      // For now, we'll use a default or you can fetch from your package API
      
      // ✅ CHECK BALANCE (assuming amount is 0 for now, but you should fetch the actual package price)
      // For now, we'll use a placeholder - you should fetch the actual package price
      const amount = 0; // TODO: Fetch actual package price
      if (amount > 0) {
        const balanceCheck = await checkUserBalance(user.id, amount);
        if (!balanceCheck.success) {
          return balanceCheck.message!;
        }
      }
      
      const transaction = await prisma.vtuTransaction.create({
        data: {
          userId: user.id,
          transactionType: VtuType.CABLE_TV,
          product: selectedDecoder.provider,
          amount: amount,
          totalDebited: 0,
          phoneNumber: user.phone,
          networkPlan: packageQuery,
          status: TransactionStatus.PENDING,
          channel: ChannelType.WHATSAPP,
          metadata: {
            source: "WhatsApp",
            service: "CABLE_TV",
            timestamp: new Date().toISOString(),
            provider: selectedDecoder.provider,
            packageQuery: packageQuery,
            decoderNumber: selectedDecoder.decoderNumber,
            smartCardNumber: selectedDecoder.decoderNumber,
            queued: false,
            requiresPin: true,
            balanceAtPurchase: 0,
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
            validationExpiry: validationExpiry,
          },
        },
      });

      const appUrl = getAppUrl();
      const purchaseLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

      return `📺 Cable Subscription Initiated!

Decoder: ${selectedDecoder.decoderNumber}
Provider: ${selectedDecoder.provider}
Package: ${packageQuery}
Reference: ${transaction.id.substring(0, 10)}

🔹 **Complete Purchase:** ${purchaseLink}
🔹 **PIN Required:** Enter your transaction PIN

This link expires in 5 minutes.

You'll receive a confirmation via WhatsApp after completion.`;
    }
    
    if (cableParts.length === 2) {
      return `Missing Package\n\nPlease specify the package as well.\nExample: CABLE ${cableParts[1]} PREMIUM\n\nTo see available packages: PACKAGES [provider]\nExample: PACKAGES DSTV`;
    }
  }

  // ============================================================
  // ELECTRICITY COMMAND - WITH BOTH FLOWS AND BALANCE CHECK
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
        return `No saved meters.\n\nAdd one with:\nADDMETER [meter_number] [disco] [name]\n\nAvailable DisCos:\n${discosList}`;
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

      message += `To buy for saved meter: ELECTRIC [index] [amount] (no PIN)\n`;
      message += `Example: ELECTRIC 1 5000\n\n`;
      message += `To buy for any meter: ELECTRIC [meter_number] [disco] [amount] (PIN required)\n`;
      message += `Example: ELECTRIC 1234567890 ABUJA 5000\n\n`;
      message += `To add more meters: ADDMETER [meter] [disco] [name]`;

      return message;
    }

    // CASE 1: ELECTRIC [amount] - Buy using default/saved meter (NO PIN)
    if (parts.length === 2) {
      const amountStr = parts[1];
      const amount = parseFloat(amountStr);
      
      if (isNaN(amount) || amount < 100) {
        return `Invalid Amount\n\nMinimum is NGN 100.\nExample: ELECTRIC 5000`;
      }
      
      // ✅ CHECK BALANCE FIRST
      const balanceCheck = await checkUserBalance(user.id, amount);
      if (!balanceCheck.success) {
        return balanceCheck.message!;
      }
      
      const meters = await prisma.savedMeter.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      
      if (meters.length === 0) {
        return `No Saved Meters\n\nYou don't have any saved meters.\n\nTo buy for any meter:\nELECTRIC [meter_number] [disco] [amount]\n\nExample: ELECTRIC 1234567890 ABUJA 5000\n\nTo add a meter: ADDMETER [meter_number] [disco] [name]`;
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

      // ✅ NO PIN - saved meter, use job
      const transaction = await prisma.vtuTransaction.create({
        data: {
          userId: user.id,
          transactionType: VtuType.ELECTRICITY_INSTANT,
          product: selectedMeter.disco,
          amount: amount,
          totalDebited: 0,
          meterNumber: selectedMeter.meterNumber,
          meterType: selectedMeter.meterType?.toLowerCase() === 'prepaid' ? MeterType.HOME : MeterType.OFFICE,
          status: TransactionStatus.PROCESSING,
          channel: ChannelType.WHATSAPP,
          metadata: {
            source: "WhatsApp",
            service: "ELECTRICITY",
            timestamp: new Date().toISOString(),
            discoCode: selectedMeter.disco,
            meterType: selectedMeter.meterType || "Prepaid",
            customerName: selectedMeter.customerName,
            customerAddress: selectedMeter.customerAddress,
            customerPhone: selectedMeter.customerPhone,
            customerEmail: selectedMeter.customerEmail,
            meterStatus: selectedMeter.meterStatus,
            queued: true,
            skipVerification: true,
            requiresPin: false,
            balanceAtPurchase: balanceCheck.balance,
          },
        },
      });

      await createJob(
        JobType.VTU_TRANSACTION,
        {
          transactionId: transaction.id,
          userId: user.id,
          meterNumber: selectedMeter.meterNumber,
          amount: amount,
          discoCode: selectedMeter.disco,
          meterType: selectedMeter.meterType || "Prepaid",
          phone: user.phone,
          customerName: selectedMeter.customerName,
          customerAddress: selectedMeter.customerAddress,
          customerPhone: selectedMeter.customerPhone,
          customerEmail: selectedMeter.customerEmail,
          meterStatus: selectedMeter.meterStatus,
          serviceType: "ELECTRICITY",
          skipVerification: true,
        },
        5,
        3,
        new Date()
      );

      return `Processing your electricity purchase...

Meter: ${selectedMeter.meterNumber}
DisCo: ${selectedMeter.disco}
Amount: NGN ${amount.toFixed(2)}
${selectedMeter.customerName ? `Customer: ${selectedMeter.customerName}` : ''}
Reference: ${transaction.id.substring(0, 10)}

You'll receive a confirmation shortly.`;
    }

    // CASE 2: ELECTRIC [index] [amount] - Buy using saved meter by index (NO PIN)
    if (parts.length === 3) {
      const [, indexStr, amountStr] = parts;
      const index = parseInt(indexStr) - 1;
      const amount = parseFloat(amountStr);
      
      if (isNaN(index) || index < 0) {
        return `Invalid Selection\n\nPlease choose a number from the list.\nExample: ELECTRIC 1 5000`;
      }
      
      if (isNaN(amount) || amount < 100) {
        return `Invalid Amount\n\nMinimum is NGN 100.\nExample: ELECTRIC 1 5000`;
      }
      
      // ✅ CHECK BALANCE FIRST
      const balanceCheck = await checkUserBalance(user.id, amount);
      if (!balanceCheck.success) {
        return balanceCheck.message!;
      }
      
      const meters = await prisma.savedMeter.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      
      if (index >= meters.length) {
        return `Invalid Selection\n\nPlease choose a number from the list.`;
      }
      
      const selectedMeter = meters[index];

      // ✅ NO PIN - saved meter, use job
      const transaction = await prisma.vtuTransaction.create({
        data: {
          userId: user.id,
          transactionType: VtuType.ELECTRICITY_INSTANT,
          product: selectedMeter.disco,
          amount: amount,
          totalDebited: 0,
          meterNumber: selectedMeter.meterNumber,
          meterType: selectedMeter.meterType?.toLowerCase() === 'prepaid' ? MeterType.HOME : MeterType.OFFICE,
          status: TransactionStatus.PROCESSING,
          channel: ChannelType.WHATSAPP,
          metadata: {
            source: "WhatsApp",
            service: "ELECTRICITY",
            timestamp: new Date().toISOString(),
            discoCode: selectedMeter.disco,
            meterType: selectedMeter.meterType || "Prepaid",
            customerName: selectedMeter.customerName,
            customerAddress: selectedMeter.customerAddress,
            customerPhone: selectedMeter.customerPhone,
            customerEmail: selectedMeter.customerEmail,
            meterStatus: selectedMeter.meterStatus,
            queued: true,
            skipVerification: true,
            requiresPin: false,
            balanceAtPurchase: balanceCheck.balance,
          },
        },
      });

      await createJob(
        JobType.VTU_TRANSACTION,
        {
          transactionId: transaction.id,
          userId: user.id,
          meterNumber: selectedMeter.meterNumber,
          amount: amount,
          discoCode: selectedMeter.disco,
          meterType: selectedMeter.meterType || "Prepaid",
          phone: user.phone,
          customerName: selectedMeter.customerName,
          customerAddress: selectedMeter.customerAddress,
          customerPhone: selectedMeter.customerPhone,
          customerEmail: selectedMeter.customerEmail,
          meterStatus: selectedMeter.meterStatus,
          serviceType: "ELECTRICITY",
          skipVerification: true,
        },
        5,
        3,
        new Date()
      );

      return `Processing your electricity purchase...

Meter: ${selectedMeter.meterNumber}
DisCo: ${selectedMeter.disco}
Amount: NGN ${amount.toFixed(2)}
${selectedMeter.customerName ? `Customer: ${selectedMeter.customerName}` : ''}
Reference: ${transaction.id.substring(0, 10)}

You'll receive a confirmation shortly.`;
    }

    // CASE 3: ELECTRIC [meter_number] [disco] [amount] - NEW meter (PIN REQUIRED)
    if (parts.length >= 4) {
      const [, meterNumber, discoInput, amountStr] = parts;
      const amount = parseFloat(amountStr);
      
      if (isNaN(amount) || amount < 100) {
        return `Invalid Amount\n\nMinimum is NGN 100.\nExample: ELECTRIC 1234567890 ABUJA 5000`;
      }
      
      // ✅ CHECK BALANCE FIRST
      const balanceCheck = await checkUserBalance(user.id, amount);
      if (!balanceCheck.success) {
        return balanceCheck.message!;
      }
      
      // Check if meter is already saved
      const existingMeter = await prisma.savedMeter.findFirst({
        where: { 
          userId: user.id, 
          meterNumber: meterNumber 
        },
      });
      
      // If meter is already saved, use saved data (NO PIN)
      if (existingMeter) {
        const transaction = await prisma.vtuTransaction.create({
          data: {
            userId: user.id,
            transactionType: VtuType.ELECTRICITY_INSTANT,
            product: existingMeter.disco,
            amount: amount,
            totalDebited: 0,
            meterNumber: existingMeter.meterNumber,
            meterType: existingMeter.meterType?.toLowerCase() === 'prepaid' ? MeterType.HOME : MeterType.OFFICE,
            status: TransactionStatus.PROCESSING,
            channel: ChannelType.WHATSAPP,
            metadata: {
              source: "WhatsApp",
              service: "ELECTRICITY",
              timestamp: new Date().toISOString(),
              discoCode: existingMeter.disco,
              meterType: existingMeter.meterType || "Prepaid",
              customerName: existingMeter.customerName,
              customerAddress: existingMeter.customerAddress,
              customerPhone: existingMeter.customerPhone,
              customerEmail: existingMeter.customerEmail,
              meterStatus: existingMeter.meterStatus,
              queued: true,
              skipVerification: true,
              requiresPin: false,
              balanceAtPurchase: balanceCheck.balance,
            },
          },
        });

        await createJob(
          JobType.VTU_TRANSACTION,
          {
            transactionId: transaction.id,
            userId: user.id,
            meterNumber: existingMeter.meterNumber,
            amount: amount,
            discoCode: existingMeter.disco,
            meterType: existingMeter.meterType || "Prepaid",
            phone: user.phone,
            customerName: existingMeter.customerName,
            customerAddress: existingMeter.customerAddress,
            customerPhone: existingMeter.customerPhone,
            customerEmail: existingMeter.customerEmail,
            meterStatus: existingMeter.meterStatus,
            serviceType: "ELECTRICITY",
            skipVerification: true,
          },
          5,
          3,
          new Date()
        );

        return `Processing your electricity purchase...

Meter: ${existingMeter.meterNumber}
DisCo: ${existingMeter.disco}
Amount: NGN ${amount.toFixed(2)}
${existingMeter.customerName ? `Customer: ${existingMeter.customerName}` : ''}
Reference: ${transaction.id.substring(0, 10)}

You'll receive a confirmation shortly.`;
      }
      
      // New meter - need verification (PIN REQUIRED)
      const discoInfo = normalizeDisco(discoInput);
      if (!discoInfo) {
        const discosList = getValidDiscosList();
        return `Invalid DisCo: "${discoInput}"\n\nAvailable DisCos (use full name or acronym):\n${discosList}\n\nExamples:\nELECTRIC 1234567890 ABUJA 5000\nELECTRIC 1234567890 AEDC 5000\nELECTRIC 1234567890 IKEDC 5000`;
      }
      
      const discoUpper = discoInfo.code;
      const serviceID = discoInfo.serviceID;
      
      // Verify new meter
      const verificationResult = await verifyMeterWithVTpass(
        serviceID,
        meterNumber,
        "prepaid"
      );
      
      let customerName = "Unknown";
      if (verificationResult.success) {
        customerName = verificationResult.data?.customerName || "Unknown";
      } else {
        return `Could Not Verify Meter\n\n${verificationResult.error || "Unknown error"}\n\nYou can still proceed with the purchase.\n\nTo continue: ELECTRIC ${meterNumber} ${discoInput} ${amount}\nTo cancel: Type HELP for other options.`;
      }
      
      // ✅ PIN REQUIRED - new meter, no job
      const transaction = await prisma.vtuTransaction.create({
        data: {
          userId: user.id,
          transactionType: VtuType.ELECTRICITY_INSTANT,
          product: discoUpper,
          amount: amount,
          totalDebited: 0,
          meterNumber: meterNumber,
          meterType: MeterType.HOME,
          status: TransactionStatus.PENDING,
          channel: ChannelType.WHATSAPP,
          metadata: {
            source: "WhatsApp",
            service: "ELECTRICITY",
            timestamp: new Date().toISOString(),
            discoCode: discoUpper,
            meterType: "Prepaid",
            customerName: customerName,
            queued: false,
            skipVerification: false,
            requiresPin: true,
            balanceAtPurchase: balanceCheck.balance,
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
            validationExpiry: validationExpiry,
          },
        },
      });

      const appUrl = getAppUrl();
      const purchaseLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

      return `⚡ Electricity Purchase Initiated!

Meter: ${meterNumber}
DisCo: ${discoUpper} (${discoInfo.fullName})
Amount: NGN ${amount.toFixed(2)}
Customer: ${customerName}
Reference: ${transaction.id.substring(0, 10)}

🔹 **Complete Purchase:** ${purchaseLink}
🔹 **PIN Required:** Enter your transaction PIN

This link expires in 5 minutes.

You'll receive a confirmation via WhatsApp after completion.`;
    }
    
    // Default: Show available meters
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
      message += `To buy: ELECTRIC [index] [amount] (no PIN)\n`;
      message += `Example: ELECTRIC 1 5000\n\n`;
    }
    
    message += `To buy for any meter: ELECTRIC [meter_number] [disco] [amount] (PIN required)\n`;
    message += `Examples:\n`;
    message += `- ELECTRIC 1234567890 ABUJA 5000\n`;
    message += `- ELECTRIC 1234567890 AEDC 5000\n`;
    message += `- ELECTRIC 1234567890 IKEDC 5000\n\n`;
    message += `To add meter: ADDMETER [meter] [disco] [name]\n`;
    message += `To see DisCos: DISCOS`;

    return message;
  }

  // ============================================================
  // SUBSCRIPTION PROCESSOR
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
      // ✅ CHECK BALANCE FIRST
      const balanceCheck = await checkUserBalance(user.id, amount);
      if (!balanceCheck.success) {
        return balanceCheck.message!;
      }
      
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + days);

      const preOrder = await prisma.preOrder.create({
        data: {
          userId: user.id,
          meterNumber: meterNumber,
          disco: discoCode,
          meterType: meterType,
          amount: amount,
          deliveryDate: deliveryDate,
          status: "PENDING",
          isRecurring: false,
          channel: ChannelType.WHATSAPP,
        },
      });

      await createJob(
        JobType.PREORDER_DELIVERY,
        {
          preOrderId: preOrder.id,
          userId: user.id,
          meterNumber: meterNumber,
          discoCode: discoCode,
          amount: amount,
          meterType: meterType,
        },
        5,
        3,
        deliveryDate
      );

      return `✅ Electricity Subscription Scheduled!

Meter: ${meterNumber}
DisCo: ${discoCode}
Amount: NGN ${amount.toFixed(2)}
Delivery Date: ${deliveryDate.toLocaleDateString()}
Subscription ID: ${preOrder.id.substring(0, 10)}

You will receive your token on the delivery date.

To manage subscriptions: SUBSCRIPTIONS
To cancel: CANCEL ${preOrder.id}`;

    } catch (error) {
      console.error("Subscription error:", error);
      return formatErrorMessage(error);
    }
  }

  // ============================================================
  // UNKNOWN COMMAND
  // ============================================================
  return `Unknown Command

I didn't understand that command.

Type HELP to see all available commands.

Or try:
BALANCE - Check your wallet
AIRTIME [amount] - Buy airtime for YOUR number (no PIN)
AIRTIME [phone] [amount] - Buy airtime for others (PIN required)
DATA - Show available plans
DATA [index] - Buy data for YOUR number (no PIN)
ELECTRIC - See saved meters
ELECTRIC [amount] - Buy electricity for saved meter (no PIN)
TRANSACTIONS - View your history
REFERRAL - Get your referral link
PIN - Set up transaction PIN`;
}