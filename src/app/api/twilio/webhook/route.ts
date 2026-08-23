// app/api/twilio/webhook/route.ts - COMPLETE UPDATED WITH PIN FOR EXTERNAL PURCHASES

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
// FIXED: NETWORK DETECTION WITH COUNTRY CODE SUPPORT
// ============================================================

function detectNetworkFromPhone(phoneNumber: string): string | null {
  // Remove all non-digit characters (+, -, spaces, etc.)
  let cleanNumber = phoneNumber.replace(/\D/g, "");
  
  // If it starts with 234 (Nigeria country code), remove it
  if (cleanNumber.startsWith("234")) {
    cleanNumber = cleanNumber.substring(3);
  }
  
  // If it starts with 0, remove it (we want the 10-digit number without 0)
  if (cleanNumber.startsWith("0")) {
    cleanNumber = cleanNumber.substring(1);
  }
  
  // Ensure we have at least 10 digits for Nigerian numbers
  if (cleanNumber.length < 10) {
    console.warn(`Phone number too short after cleaning: ${cleanNumber} (original: ${phoneNumber})`);
    return null;
  }
  
  // Take the last 10 digits (in case of extra digits)
  if (cleanNumber.length > 10) {
    cleanNumber = cleanNumber.slice(-10);
  }
  
  console.log(`🔍 [Network Detection] Cleaned number: ${cleanNumber}`);
  
  // MTN: 080, 081, 070, 090, 091
  if (cleanNumber.startsWith("80") || cleanNumber.startsWith("81") || 
      cleanNumber.startsWith("70") || cleanNumber.startsWith("90") || 
      cleanNumber.startsWith("91")) {
    return "MTN";
  }
  
  // AIRTEL: 0802, 0808, 0812, 0901, 0902, 0907, 0701, 0708
  if (cleanNumber.startsWith("802") || cleanNumber.startsWith("808") || 
      cleanNumber.startsWith("812") || cleanNumber.startsWith("901") || 
      cleanNumber.startsWith("902") || cleanNumber.startsWith("907") || 
      cleanNumber.startsWith("701") || cleanNumber.startsWith("708")) {
    return "AIRTEL";
  }
  
  // GLO: 0805, 0807, 0811, 0815, 0905, 0909
  if (cleanNumber.startsWith("805") || cleanNumber.startsWith("807") || 
      cleanNumber.startsWith("811") || cleanNumber.startsWith("815") || 
      cleanNumber.startsWith("905") || cleanNumber.startsWith("909")) {
    return "GLO";
  }
  
  // 9MOBILE: 0809, 0817, 0818, 0908, 0903, 0904
  if (cleanNumber.startsWith("809") || cleanNumber.startsWith("817") || 
      cleanNumber.startsWith("818") || cleanNumber.startsWith("908") || 
      cleanNumber.startsWith("903") || cleanNumber.startsWith("904")) {
    return "9MOBILE";
  }
  
  console.warn(`Unknown network for phone: ${phoneNumber} (cleaned: ${cleanNumber})`);
  return null;
}

// ============================================================
// FIXED: NORMALIZE PHONE NUMBER (Handle all formats)
// ============================================================

function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let clean = phoneNumber.replace(/\D/g, '');
  
  console.log(`🔍 [Normalize] Original: ${phoneNumber}, Cleaned: ${clean}`);
  
  // If it starts with 234 (Nigeria country code), convert to 0 format
  if (clean.startsWith('234')) {
    clean = '0' + clean.substring(3);
  }
  
  // If it starts with 0, keep it as is
  if (clean.startsWith('0') && clean.length === 11) {
    return clean;
  }
  
  // If it doesn't start with 0 and is 10 digits, add 0
  if (!clean.startsWith('0') && clean.length === 10) {
    clean = '0' + clean;
  }
  
  // If it's less than 11 digits but more than 10, pad with 0
  if (clean.length < 11 && clean.length >= 10) {
    clean = '0' + clean;
  }
  
  // Ensure we have exactly 11 digits (0 + 10 digits)
  if (clean.length < 11) {
    clean = clean.padStart(11, '0');
  }
  
  // Take only 11 digits (first 11)
  if (clean.length > 11) {
    clean = clean.substring(0, 11);
  }
  
  console.log(`✅ [Normalize] Result: ${clean}`);
  return clean;
}

// ============================================================
// MAIN WEBHOOK HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  try {
    console.log(`📨 [Twilio Webhook] Request received`);
    console.log(`  Method: ${request.method}`);
    console.log(`  URL: ${request.url}`);
    console.log(`  Content-Type: ${request.headers.get('content-type')}`);
    
    const formData = await request.formData();
    
    let body = "";
    let from = "";
    let to = "";
    let messageSid = "";
    
    for (const [key, value] of formData.entries()) {
      console.log(`    ${key}: ${value}`);
      if (key === "Body") body = value.toString();
      if (key === "From") from = value.toString();
      if (key === "To") to = value.toString();
      if (key === "MessageSid") messageSid = value.toString();
    }
    
    if (!body && request.body) {
      try {
        const jsonBody = await request.json();
        console.log(`  JSON Body:`, jsonBody);
        body = jsonBody.Body || jsonBody.body || "";
        from = jsonBody.From || jsonBody.from || "";
        to = jsonBody.To || jsonBody.to || "";
        messageSid = jsonBody.MessageSid || jsonBody.messageSid || "";
      } catch (e) {}
    }

    const whatsappFrom = from ? from.replace("whatsapp:", "") : "";
    const whatsappTo = to ? to.replace("whatsapp:", "") : "";

    console.log(`📨 [Twilio Webhook] Parsed message:`);
    console.log(`  From: ${whatsappFrom}`);
    console.log(`  To: ${whatsappTo}`);
    console.log(`  Body: "${body}"`);
    console.log(`  MessageSid: ${messageSid}`);

    if (!body || body.trim() === "") {
      console.log(`⚠️ [Twilio Webhook] Empty message body - returning help response`);
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

    console.log(`📤 [Twilio Webhook] Sending response:`, responseMessage.substring(0, 100) + "...");

    return new NextResponse(buildTwilioResponse(responseMessage), {
      headers: {
        "Content-Type": "text/xml",
      },
    });

  } catch (error) {
    console.error("❌ [Twilio Webhook] Error:", error);
    const errorMessage = "Sorry, an error occurred. Please try again later.";
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
    console.log(`📝 [WhatsApp] Starting registration for: ${phone}`);

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

      console.log(`✅ [WhatsApp] User created: ${user.id}`);

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
        console.log(`📤 Creating PalmPay virtual account for user ${user.id}...`);
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
        console.error('❌ PalmPay creation failed:', error);
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
    console.error("❌ [WhatsApp] Registration error:", error);
    return `Registration failed. Please try again later.

If the problem persists, visit:
${getAppUrl()}/auth

Or reply with HELP for assistance.`;
  }
}

// ============================================================
// NETWORK MAPPING & DETECTION
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
    
    console.log(`📡 [WhatsApp] Fetching plans from: ${url}`);
    
    const response = await fetch(url, {
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Bilscore-WhatsApp/1.0',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`⚠️ [WhatsApp] Failed to fetch plans: ${response.status}`);
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

    console.warn(`⚠️ [WhatsApp] No plans data from API, using fallback`);
    return getFallbackPlans();

  } catch (error) {
    console.error('❌ [WhatsApp] Error fetching plans:', error);
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
    
    console.log(`📡 [WhatsApp] Finding plan from: ${url}`);
    
    const response = await fetch(url, {
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Bilscore-WhatsApp/1.0',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`⚠️ [WhatsApp] Failed to fetch plans: ${response.status}`);
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
    console.error('❌ [WhatsApp] Error finding data plan:', error);
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
// METER & DECODER VERIFICATION
// ============================================================

async function verifyMeterWithVTpass(serviceID: string, meterNumber: string, meterType: string = "prepaid") {
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
        billersCode: meterNumber,
        type: meterType,
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
          meterNumber: data.content.Meter_Number || data.content.meterNumber || meterNumber,
          meterType: data.content.Meter_Type || data.content.meterType || meterType,
          status: data.content.Status || data.content.status || "ACTIVE",
        },
      };
    }
    return { success: false, error: data.response_description || "Meter verification failed" };
  } catch (error: any) {
    return { success: false, error: error.message || "Network error" };
  }
}

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
    if (verificationResult.success) {
      verificationMessage = `
✅ Meter Verified!
Customer: ${verificationResult.data?.customerName || "Unknown"}
Meter: ${verificationResult.data?.meterNumber || meterNumber}
Status: ${verificationResult.data?.status || "ACTIVE"}`;
    } else {
      verificationMessage = `
⚠️ Could not verify meter: ${verificationResult.error || "Unknown error"}`;
    }

    const existing = await prisma.savedMeter.findFirst({
      where: { userId: userId, meterNumber: meterNumber },
    });

    if (existing) {
      await prisma.savedMeter.update({
        where: { id: existing.id },
        data: { disco: discoUpper, name: name || existing.name, updatedAt: new Date() },
      });
      
      const qrLink = await generateMeterQRCode(userId, meterNumber, discoUpper);
      
      return `Meter updated successfully!${verificationMessage}

Meter: ${meterNumber}
DisCo: ${discoUpper}
Name: ${name || existing.name}

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
      },
    });

    const qrLink = await generateMeterQRCode(userId, meterNumber, discoUpper);

    return `Meter added successfully!${verificationMessage}

Meter: ${meterNumber}
DisCo: ${discoUpper}
Name: ${name || `${discoUpper} Meter`}

📱 Quick Buy QR Code:
${qrLink}

Scan this QR code to quickly buy electricity for this meter.
You can also find this QR code in your saved meters.

Type ELECTRIC to see all your meters and buy power!`;
  } catch (error) {
    console.error("Add meter error:", error);
    return `Failed to add meter. Please try again.`;
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
    if (verificationResult.success) {
      verificationMessage = `
✅ Decoder Verified!
Customer: ${verificationResult.data?.customerName || "Unknown"}
Decoder: ${verificationResult.data?.smartCardNumber || decoderNumber}
Status: ${verificationResult.data?.status || "ACTIVE"}`;
    } else {
      verificationMessage = `
⚠️ Could not verify decoder: ${verificationResult.error || "Unknown error"}`;
    }

    const existing = await prisma.savedDecoder.findFirst({
      where: { userId: userId, decoderNumber: decoderNumber },
    });

    if (existing) {
      await prisma.savedDecoder.update({
        where: { id: existing.id },
        data: { provider: providerUpper, name: name || existing.name, updatedAt: new Date() },
      });
      return `Decoder updated successfully!${verificationMessage}

Decoder: ${decoderNumber}
Provider: ${providerUpper}
Name: ${name || existing.name}

Type CABLE to see all your decoders and subscribe!`;
    }

    await prisma.savedDecoder.create({
      data: {
        userId: userId,
        decoderNumber: decoderNumber,
        provider: providerUpper,
        name: name || `${providerUpper} Decoder`,
        isDefault: false,
      },
    });

    return `Decoder added successfully!${verificationMessage}

Decoder: ${decoderNumber}
Provider: ${providerUpper}
Name: ${name || `${providerUpper} Decoder`}

Type CABLE to see all your decoders and subscribe!`;
  } catch (error) {
    console.error("Add decoder error:", error);
    return `Failed to add decoder. Please try again.`;
  }
}

// ============================================================
// LIST METERS & DECODERS
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
    message += `   ${meter.meterNumber}\n\n`;
  });

  message += `To buy electricity: ELECTRIC [number] [amount]
To delete: DELETEMETER [meter_number]
To set default: SETDEFAULTMETER [meter_number]`;

  return message;
}

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
    message += `   ${decoder.decoderNumber}\n\n`;
  });

  message += `To buy cable: CABLE [decoder_index] [package]
To delete: DELETEDECODER [decoder_number]
To set default: SETDEFAULTDECODER [decoder_number]
To see packages: PACKAGES [provider]`;

  return message;
}

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
    return `Failed to delete meter. Please try again.`;
  }
}

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
    return `Failed to delete decoder. Please try again.`;
  }
}

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
    return `Failed to set default meter. Please try again.`;
  }
}

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
    return `Failed to set default decoder. Please try again.`;
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
      const statusIcon = order.status === "PURCHASED" ? "✅" : 
                         order.status === "PROCESSING" ? "⏳" : "📅";
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
    return `Failed to fetch subscriptions. Please try again.`;
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

    return `✅ Subscription cancelled successfully!

Meter: ${preOrder.meterNumber}
DisCo: ${preOrder.disco}
Amount: NGN ${Number(preOrder.amount).toFixed(2)}
Delivery: ${deliveryDate.toLocaleDateString()}

Your funds have been released back to your wallet.

To create a new subscription: SCHEDULE [meter_index] [amount] [days]`;
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return `Failed to cancel subscription. Please try again.

If the problem persists, type HELP for support.`;
  }
}

// ============================================================
// ERROR HANDLING HELPER - Converts errors to user-friendly messages
// ============================================================

function formatErrorMessage(error: any): string {
  const errorMessage = error?.message || error?.error || String(error);
  
  console.log(`🔍 [Error Format] Original: ${errorMessage}`);
  
  // Network/Connection errors
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND') || 
      errorMessage.includes('ETIMEDOUT') || errorMessage.includes('network')) {
    return `⏰ Network connection issue. Please check your internet and try again.`;
  }
  
  // Vendor API errors
  if (errorMessage.includes('vendor') || errorMessage.includes('provider')) {
    if (errorMessage.includes('timeout')) {
      return `⏰ The service provider is taking too long to respond. Please try again in a few minutes.`;
    }
    if (errorMessage.includes('balance') || errorMessage.includes('insufficient')) {
      return `⚠️ Insufficient balance on the vendor side. Please try again or contact support.`;
    }
    if (errorMessage.includes('invalid') || errorMessage.includes('incorrect')) {
      return `❌ Invalid request. Please check the details and try again.`;
    }
    return `⚠️ Service provider is currently unavailable. Please try again later.`;
  }
  
  // Wallet/Balance errors
  if (errorMessage.includes('balance') || errorMessage.includes('insufficient')) {
    return `⚠️ Insufficient balance. Please fund your wallet and try again.`;
  }
  
  // Database errors
  if (errorMessage.includes('database') || errorMessage.includes('prisma')) {
    return `⚠️ System is busy. Please try again in a moment.`;
  }
  
  // Phone number errors
  if (errorMessage.includes('phone') || errorMessage.includes('number')) {
    return `❌ Invalid phone number format. Please use: 08012345678 or +2348012345678`;
  }
  
  // Meter errors
  if (errorMessage.includes('meter')) {
    if (errorMessage.includes('invalid')) {
      return `❌ Invalid meter number. Please check and try again.`;
    }
    if (errorMessage.includes('not found')) {
      return `❌ Meter not found. Please verify the meter number.`;
    }
    return `⚠️ Meter verification failed. Please try again.`;
  }
  
  // Decoder errors
  if (errorMessage.includes('decoder') || errorMessage.includes('smart card')) {
    if (errorMessage.includes('invalid')) {
      return `❌ Invalid decoder number. Please check and try again.`;
    }
    if (errorMessage.includes('not found')) {
      return `❌ Decoder not found. Please verify the decoder number.`;
    }
    return `⚠️ Decoder verification failed. Please try again.`;
  }
  
  // Data plan errors
  if (errorMessage.includes('plan') || errorMessage.includes('data')) {
    return `❌ Invalid data plan. Please check available plans with: PLANS`;
  }
  
  // Airtime errors
  if (errorMessage.includes('airtime')) {
    return `❌ Airtime purchase failed. Please check the phone number and try again.`;
  }
  
  // Cable TV errors
  if (errorMessage.includes('cable') || errorMessage.includes('subscription')) {
    return `❌ Cable subscription failed. Please check the decoder and try again.`;
  }
  
  // Education errors
  if (errorMessage.includes('education') || errorMessage.includes('pin')) {
    return `❌ Education PIN purchase failed. Please try again.`;
  }
  
  // Generic fallback
  return `❌ Purchase failed. Please try again or contact support if the issue persists.`;
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
    if (!wallet) return `Wallet not found. Please contact support.`;

    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `⚠️ Insufficient balance. You have NGN ${walletBalance.toFixed(2)}.
Need NGN ${amount.toFixed(2)}.

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
        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            metadata: {
              ...transaction.metadata,
              failureReason: result?.error || "Vendor purchase failed",
              failedAt: new Date().toISOString(),
            },
          },
        });
        return formatErrorMessage(result?.error || "Vendor purchase failed");
      }

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
            token: result.data?.token || null,
            vendorReference: result.vendorReference || null,
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

      return `✅ Airtime Purchase Successful!

Phone: ${phoneNumber}
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
Reference: ${transaction.id.substring(0, 10)}

Thank you for using Bilscore!`;
    } catch (vendorError: any) {
      console.error("Vendor error:", vendorError);
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...transaction.metadata,
            failureReason: vendorError?.message || "Vendor error",
            failedAt: new Date().toISOString(),
          },
        },
      });
      return formatErrorMessage(vendorError);
    }
  } catch (error: any) {
    console.error("Direct airtime purchase error:", error);
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
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) return `Wallet not found. Please contact support.`;

    const walletBalance = Number(wallet.walletBalance);
    if (walletBalance < amount) {
      return `⚠️ Insufficient balance. You have NGN ${walletBalance.toFixed(2)}.
Need NGN ${amount.toFixed(2)}.

Please fund your wallet and try again.`;
    }

    // Check if user has PIN set
    if (!user.pinHash) {
      return `🔐 You need to set a transaction PIN first to buy airtime for other numbers.

To set your PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

For your own number, just use: AIRTIME 500 (no PIN needed)`;
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

💡 For your own number, use: AIRTIME 500 (no PIN needed)`;
  } catch (error) {
    console.error("Airtime purchase with PIN error:", error);
    return formatErrorMessage(error);
  }
}

// ============================================================
// MAIN COMMAND PROCESSOR - FIXED VERSION (PIN FOR EXTERNAL, NO PIN FOR OWN)
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

    return `Your Bilscore Balance: NGN ${Number(balance).toFixed(2)}

Quick Stats:
Total Transactions: ${totalTxns}
Referrals: ${referrals}
Wallet Status: ${wallet?.isActive ? "Active" : "Inactive"}

Reply with HELP for available commands.`;
  }

  // ============================================================
  // ✅ AIRTIME - NO PIN FOR OWN NUMBER, PIN REQUIRED FOR EXTERNAL
  // ============================================================
  if (command === "AIRTIME" || command.startsWith("AIRTIME ")) {
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
        return `Please specify the amount.
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
      return `To buy airtime:
AIRTIME [amount] - For YOUR number (no PIN required)
AIRTIME [phone] [amount] - For another number (PIN required)

Example: AIRTIME 500
Example: AIRTIME 08012345678 500
Example: AIRTIME +2348012345678 500

Available networks: MTN, GLO, AIRTEL, 9MOBILE
Minimum: NGN 50 | Maximum: NGN 50,000`;
    }
    
    if (isNaN(amountNum) || amountNum < 50 || amountNum > 50000) {
      return `Invalid amount. Please enter between NGN 50 and NGN 50,000.
Example: AIRTIME 500`;
    }
    
    if (!targetPhone || targetPhone.length < 10) {
      targetPhone = user.phone;
      isOwnNumber = true;
    }
    
    const normalizedTarget = normalizePhoneNumber(targetPhone);
    const detectedNetwork = detectNetworkFromPhone(normalizedTarget);
    if (!detectedNetwork) {
      return `Could not detect network for ${normalizedTarget}.
Please ensure the phone number is correct.

Supported formats:
- 08012345678
- +2348012345678
- 2348012345678

Available networks: MTN, GLO, AIRTEL, 9MOBILE`;
    }

    // ✅ NO PIN for own number, PIN required for external
    if (isOwnNumber) {
      return await processAirtimePurchaseDirect(user, normalizedTarget, amountNum, detectedNetwork);
    } else {
      return await processAirtimePurchaseWithPin(user, normalizedTarget, amountNum, detectedNetwork);
    }
  }

  // ============================================================
  // ✅ DATA - NO PIN FOR OWN NUMBER, PIN REQUIRED FOR EXTERNAL
  // ============================================================
  if (command === "DATA" || command.startsWith("DATA ")) {
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
      return `To buy data:
DATA [plan] - For YOUR number (no PIN required)
DATA [phone] [plan] - For another number (PIN required)

Example: DATA 1GB
Example: DATA 08012345678 1GB
Example: DATA +2348012345678 1GB

${availablePlans}`;
    }
    
    if (!planQuery) {
      const availablePlans = await getAvailablePlansForWhatsApp();
      return `Please specify a data plan.
Example: DATA 1GB

${availablePlans}`;
    }
    
    if (!targetPhone || targetPhone.length < 10) {
      targetPhone = user.phone;
      isOwnNumber = true;
    }
    
    const normalizedTarget = normalizePhoneNumber(targetPhone);
    const detectedNetwork = detectNetworkFromPhone(normalizedTarget);
    if (!detectedNetwork) {
      return `Could not detect network for ${normalizedTarget}.
Please ensure the phone number is correct.

Supported formats:
- 08012345678
- +2348012345678
- 2348012345678

${await getAvailablePlansForWhatsApp()}`;
    }

    // ✅ NO PIN for own number, PIN required for external
    if (isOwnNumber) {
      return await processDataPurchaseDirect(user, normalizedTarget, planQuery, detectedNetwork);
    } else {
      return await processDataPurchaseWithPin(user, normalizedTarget, planQuery, detectedNetwork);
    }
  }

  // ============================================================
  // ✅ METER MANAGEMENT - WITH QR CODE
  // ============================================================
  
  if (command.startsWith("ADDMETER") || command.startsWith("ADD METER")) {
    const parts = body.split(" ").filter(p => p.length > 0);
    if (parts.length < 4) {
      const discosList = await getAvailableDiscosForWhatsApp();
      return `To add a meter, reply with:
ADDMETER [meter_number] [disco_code] [name]

Available DisCos:
${discosList}

Example: ADDMETER 1234567890 ABUJA HOME

Name can be: HOME, OFFICE, SHOP, etc.`;
    }

    const [, meterNumber, disco, ...nameParts] = parts;
    const name = nameParts.join(" ");
    return await addMeterWithVerificationAndQR(user.id, meterNumber, disco, name);
  }

  if (command === "METERS" || command === "LIST METERS") {
    return await listMeters(user.id);
  }

  if (command.startsWith("DELETEMETER") || command.startsWith("DELETE METER")) {
    const parts = body.split(" ").filter(p => p.length > 0);
    if (parts.length < 2) {
      return `Please specify the meter number to delete.
Example: DELETEMETER 1234567890`;
    }
    const meterNumber = parts[1];
    return await deleteMeter(user.id, meterNumber);
  }

  if (command.startsWith("SETDEFAULTMETER") || command.startsWith("SET DEFAULT METER")) {
    const parts = body.split(" ").filter(p => p.length > 0);
    if (parts.length < 2) {
      return `Please specify the meter number or index.
Example: SETDEFAULTMETER 1
Or: SETDEFAULTMETER 1234567890`;
    }
    const meterId = parts[1];
    return await setDefaultMeter(user.id, meterId);
  }

  // ========== DECODER MANAGEMENT ==========
  
  if (command.startsWith("ADDDECODER") || command.startsWith("ADD DECODER")) {
    const parts = body.split(" ").filter(p => p.length > 0);
    if (parts.length < 4) {
      return `To add a decoder, reply with:
ADDDECODER [decoder_number] [provider] [name]

Example: ADDDECODER 1234567890 DSTV LIVING_ROOM

Available providers: DSTV, GOTV, STARTIMES
Name can be: LIVING_ROOM, BEDROOM, OFFICE, etc.`;
    }

    const [, decoderNumber, provider, ...nameParts] = parts;
    const name = nameParts.join(" ");
    return await addDecoderWithVerification(user.id, decoderNumber, provider, name);
  }

  if (command === "DECODERS" || command === "LIST DECODERS") {
    return await listDecoders(user.id);
  }

  if (command.startsWith("DELETEDECODER") || command.startsWith("DELETE DECODER")) {
    const parts = body.split(" ").filter(p => p.length > 0);
    if (parts.length < 2) {
      return `Please specify the decoder number to delete.
Example: DELETEDECODER 1234567890`;
    }
    const decoderNumber = parts[1];
    return await deleteDecoder(user.id, decoderNumber);
  }

  if (command.startsWith("SETDEFAULTDECODER") || command.startsWith("SET DEFAULT DECODER")) {
    const parts = body.split(" ").filter(p => p.length > 0);
    if (parts.length < 2) {
      return `Please specify the decoder number or index.
Example: SETDEFAULTDECODER 1
Or: SETDEFAULTDECODER 1234567890`;
    }
    const decoderId = parts[1];
    return await setDefaultDecoder(user.id, decoderId);
  }

  // ============================================================
  // ✅ ELECTRICITY - NO PIN FOR OWN METERS, PIN FOR EXTERNAL
  // ============================================================
  if (command === "ELECTRIC" || command === "ELEC" || command === "POWER" || command === "ELECTRICITY") {
    const meters = await prisma.savedMeter.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    if (meters.length === 0) {
      const discosList = await getAvailableDiscosForWhatsApp();
      return `You don't have any saved meters.

To add your first meter:
ADDMETER [meter_number] [disco_code] [name]

Available DisCos:
${discosList}

Example: ADDMETER 1234567890 ABUJA HOME

After adding, you can buy electricity by just typing ELECTRIC!`;
    }

    if (meters.length === 1) {
      const meter = meters[0];
      return `Buy Electricity:

Meter: ${meter.meterNumber}
DisCo: ${meter.disco}
Name: ${meter.name || 'Meter'}

Reply with: ELECTRIC [amount]

Example: ELECTRIC 5000

Or type ELECTRIC to see all saved meters.`;
    }

    let message = "Your Saved Meters:\n\n";
    meters.forEach((meter: any, index: number) => {
      const defaultTag = meter.isDefault ? " (Default)" : "";
      message += `${index + 1}. ${meter.name || meter.meterNumber}${defaultTag}\n`;
      message += `   ${meter.disco}\n`;
      message += `   ${meter.meterNumber}\n\n`;
    });

    message += `Reply with: ELECTRIC [index] [amount]\n`;
    message += `Example: ELECTRIC 1 5000\n\n`;
    message += `To add more meters: ADDMETER [meter] [disco] [name]\n`;
    message += `To get available DisCos: DISCOS`;

    return message;
  }

  // ✅ ELECTRICITY PURCHASE - NO PIN FOR OWN METERS
  if (command.startsWith("ELECTRIC") || command.startsWith("ELEC") || command.startsWith("POWER") || command.startsWith("ELECTRICITY")) {
    const parts = body.split(" ").filter(p => p.length > 0);
    
    const meters = await prisma.savedMeter.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    if (meters.length === 0) {
      return `You don't have any saved meters.

To add your first meter:
ADDMETER [meter_number] [disco_code] [name]

Example: ADDMETER 1234567890 ABUJA HOME`;
    }

    // Case 1: Only amount provided
    if (parts.length === 2) {
      const amountStr = parts[1];
      const amount = parseFloat(amountStr);
      
      if (isNaN(amount) || amount < 100) {
        return `Invalid amount. Minimum is NGN 100.
Example: ELECTRIC 5000`;
      }

      let selectedMeter = meters.find(m => m.isDefault) || meters[0];
      
      if (meters.length > 1 && !meters.find(m => m.isDefault)) {
        let message = "Multiple meters found. Please select one:\n\n";
        meters.forEach((meter: any, index: number) => {
          message += `${index + 1}. ${meter.name || meter.meterNumber}\n`;
          message += `   ${meter.disco}\n\n`;
        });
        message += `Reply with: ELECTRIC [index] [amount]\n`;
        message += `Example: ELECTRIC 1 5000`;
        return message;
      }
      
      // ✅ NO PIN REQUIRED - Own meters
      return await processElectricityPurchaseDirect(
        user, 
        selectedMeter.meterNumber, 
        amount, 
        selectedMeter.disco,
        selectedMeter.meterType || "Prepaid"
      );
    }

    // Case 2: Index and amount provided
    if (parts.length >= 3) {
      const [, indexStr, amountStr] = parts;
      const index = parseInt(indexStr) - 1;
      const amount = parseFloat(amountStr);
      
      if (isNaN(index) || index < 0) {
        return `Invalid selection. Please choose a number from the list.
Example: ELECTRIC 1 5000`;
      }
      
      if (isNaN(amount) || amount < 100) {
        return `Invalid amount. Minimum is NGN 100.
Example: ELECTRIC 1 5000`;
      }
      
      if (index >= meters.length) {
        return `Invalid selection. Please choose a number from the list.`;
      }
      
      const selectedMeter = meters[index];
      
      // ✅ NO PIN REQUIRED - Own meters
      return await processElectricityPurchaseDirect(
        user, 
        selectedMeter.meterNumber, 
        amount, 
        selectedMeter.disco,
        selectedMeter.meterType || "Prepaid"
      );
    }

    // Show help
    let message = "Your Saved Meters:\n\n";
    meters.forEach((meter: any, index: number) => {
      const defaultTag = meter.isDefault ? " (Default)" : "";
      message += `${index + 1}. ${meter.name || meter.meterNumber}${defaultTag}\n`;
      message += `   ${meter.disco}\n`;
      message += `   ${meter.meterNumber}\n\n`;
    });

    message += `Reply with: ELECTRIC [index] [amount]\n`;
    message += `Example: ELECTRIC 1 5000\n\n`;
    message += `Or if you have only one meter: ELECTRIC [amount]\n`;
    message += `Example: ELECTRIC 5000`;

    return message;
  }

  // ========== DISCOS ==========
  if (command === "DISCOS" || command === "DISCO" || command === "DISCOS?") {
    const discosList = await getAvailableDiscosForWhatsApp();
    return `Available DisCos:

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
      return `You don't have any saved decoders.

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

  // ✅ CABLE PURCHASE - NO PIN FOR OWN DECODERS
  if (command.startsWith("CABLE") || command.startsWith("TV")) {
    const parts = body.split(" ").filter(p => p.length > 0);
    
    if (parts.length >= 3) {
      const [, indexStr, packageQuery] = parts;
      const index = parseInt(indexStr) - 1;
      
      if (isNaN(index) || index < 0) {
        return `Invalid selection. Please choose a number from the list.
Example: CABLE 1 PREMIUM`;
      }
      
      const decoders = await prisma.savedDecoder.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      
      if (index >= decoders.length) {
        return `Invalid selection. Please choose a number from the list.`;
      }
      
      const selectedDecoder = decoders[index];
      
      // ✅ NO PIN REQUIRED - Own decoders
      return await processCablePurchaseDirect(
        user, 
        selectedDecoder.decoderNumber, 
        packageQuery,
        selectedDecoder.provider
      );
    }
    
    if (parts.length === 2) {
      return `Please specify the package as well.
Example: CABLE ${parts[1]} PREMIUM

To see available packages: PACKAGES [provider]
Example: PACKAGES DSTV`;
    }
  }

  // ========== PACKAGES ==========
  if (command.startsWith("PACKAGES") || command === "PACKAGE") {
    const parts = body.split(" ").filter(p => p.length > 0);
    const provider = parts.length > 1 ? parts[1] : "DSTV";
    const packagesList = await getAvailablePackagesForWhatsApp(provider);
    return packagesList;
  }

  // ========== SUBSCRIPTIONS ==========
  if (command.startsWith("SCHEDULE") || command.startsWith("SUBSCRIBE")) {
    const parts = body.split(" ").filter(p => p.length > 0);
    
    if (parts.length < 4) {
      return `To schedule electricity token delivery:
SCHEDULE [meter_index] [amount] [days]

Example: SCHEDULE 1 5000 7

This schedules a token for delivery in 7 days.

Available meters:
${await getSavedMetersList(user.id)}`;
    }

    const [, indexStr, amountStr, daysStr] = parts;
    const index = parseInt(indexStr) - 1;
    const amount = parseFloat(amountStr);
    const days = parseInt(daysStr);

    if (isNaN(index) || index < 0) {
      return `Invalid meter selection. Please choose a number from the list.
Example: SCHEDULE 1 5000 7`;
    }

    if (isNaN(amount) || amount < 100) {
      return `Invalid amount. Minimum is NGN 100.
Example: SCHEDULE 1 5000 7`;
    }

    if (isNaN(days) || days < 3) {
      return `Invalid days. Minimum is 3 days.
Example: SCHEDULE 1 5000 7`;
    }

    const meters = await prisma.savedMeter.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    if (index >= meters.length) {
      return `Invalid meter selection. Please choose a number from the list.`;
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
    const parts = body.split(" ").filter(p => p.length > 0);
    if (parts.length < 2) {
      return `To cancel a subscription:
CANCEL [subscription_id]

Example: CANCEL SUB-123456

To see your active subscriptions: SUBSCRIPTIONS`;
    }
    const subscriptionId = parts[1];
    return await cancelSubscription(user.id, subscriptionId);
  }

  // ========== EDUCATION ==========
  if (command.startsWith("EDU") || command === "EDUCATION" || 
      command.startsWith("WAEC") || command.startsWith("JAMB") || 
      command.startsWith("NECO") || command === "WAEC-RESULT") {
    
    const cmd = parts[0].toUpperCase();
    
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

    if (parts.length >= 3 && (cmd === "EDU" || cmd === "EDUCATION")) {
      const product = parts[1].toUpperCase();
      const quantity = parseInt(parts[2]);
      if (isNaN(quantity) || quantity < 1) {
        return `Invalid quantity. Please enter a number greater than 0.
Example: EDU WAEC 2`;
      }
      return await processEducationPurchaseWhatsApp(user, product, quantity);
    }

    if (parts.length >= 2 && ["WAEC", "JAMB", "NECO", "WAEC-RESULT"].includes(cmd)) {
      const quantity = parseInt(parts[1]);
      if (isNaN(quantity) || quantity < 1) {
        return `Invalid quantity. Please enter a number greater than 0.
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
    return await getTransactionHistory(user.id);
  }

  // ========== REFERRAL ==========
  if (command === "REFERRAL" || command === "REF") {
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
    return await handlePinCommand(user, parts);
  }

  // ========== UNKNOWN COMMAND ==========
  return `I didn't understand that command.

Type HELP to see all available commands.

Or try:
BALANCE - Check your wallet
AIRTIME [amount] - Buy airtime for YOUR number (no PIN)
AIRTIME [phone] [amount] - Buy airtime for others (PIN required)
DATA [plan] - Buy data for YOUR number (no PIN)
DATA [phone] [plan] - Buy data for others (PIN required)
ELECTRIC - See saved meters
ELECTRIC [amount] - Buy electricity (your meters - no PIN)
ELECTRIC [index] [amount] - Buy electricity with meter selection
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

💰 Financial:
BALANCE - Check wallet balance
TRANSACTIONS - View transaction history
PIN [code] - Set transaction PIN

📱 Airtime & Data:
AIRTIME [amount] - Buy for YOUR number ✨ (no PIN)
AIRTIME [phone] [amount] - Buy for others 🔐 (PIN required)
DATA [plan] - Buy for YOUR number ✨ (no PIN)
DATA [phone] [plan] - Buy for others 🔐 (PIN required)

⚡ Electricity (Your meters - no PIN ✨):
ELECTRIC - Show saved meters
ELECTRIC [amount] - Buy electricity
ELECTRIC [index] [amount] - Buy electricity with meter selection
ADDMETER [meter] [disco] [name] - Add meter
METERS - List saved meters
DISCOS - Show available DisCos
SCHEDULE [index] [amount] [days] - Schedule electricity
SUBSCRIPTIONS - View active schedules
CANCEL [id] - Cancel subscription

📺 Cable TV (Your decoders - no PIN ✨):
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

🔗 Referral:
REFERRAL - Get referral link

❓ Help:
HELP - Show this message

✨ = No PIN required (your own number/meters)
🔐 = PIN required (for other people's numbers/meters)

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
    return `No transactions found.

Start using Bilscore today!
Type HELP to see available commands.`;
  }

  let message = "Recent Transactions:\n\n";
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
    return `To set up your transaction PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

Your PIN will be encrypted and used for transaction verification.`;
  }

  const pin = parts[1];
  if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return `Invalid PIN format. Please use 4-6 digits.
Example: PIN 1234`;
  }

  if (user.pinHash) {
    return `You already have a transaction PIN set.
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

  return `Transaction PIN set successfully!

Your PIN has been encrypted and saved.
You'll need this PIN for all transactions.

PIN: **** (hidden for security)

Keep your PIN safe and never share it with anyone.

You can change your PIN anytime in the Bilscore app.`;
}