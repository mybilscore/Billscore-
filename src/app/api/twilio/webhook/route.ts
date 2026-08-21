// app/api/twilio/webhook/route.ts
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
} from "@prisma/client";
import { 
  createPalmPayVirtualAccountForUser, 
  isPalmPaySimulationMode 
} from "~/lib/palmpay/palmpay-wallet.service";

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
// MAIN WEBHOOK HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = formData.get("Body")?.toString() || "";
    const from = formData.get("From")?.toString() || "";
    const to = formData.get("To")?.toString() || "";
    const messageSid = formData.get("MessageSid")?.toString() || "";
    const whatsappFrom = from.replace("whatsapp:", "");
    const whatsappTo = to.replace("whatsapp:", "");

    console.log(`📨 [Twilio Webhook] Received message:`);
    console.log(`  From: ${whatsappFrom}`);
    console.log(`  To: ${whatsappTo}`);
    console.log(`  Body: ${body}`);

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

    // Update or create channel with upsert
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
// USER REGISTRATION HANDLER - WITH PALMPAY WALLET INFO
// ============================================================

async function handleUserRegistration(phone: string, body: string): Promise<string> {
  try {
    console.log(`📝 [WhatsApp] Starting registration for: ${phone}`);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { phone: phone },
    });

    if (existingUser) {
      return `You are already registered with Bilscore.
Registered name: ${existingUser.fullName}
Wallet Balance: NGN ${Number(existingUser.walletBalance || 0).toFixed(2)}

Type HELP to see available commands.`;
    }

    // Parse registration command: REG [fullname] [email] [username]
    const parts = body.split(" ").filter(p => p.length > 0);
    const command = parts[0].toUpperCase();
    
    if (command === "REG" || command === "REGISTER" || command === "SIGNUP") {
      // If just REG without details, ask for more info
      if (parts.length < 2) {
        return `Welcome to Bilscore!

To register, please provide your details:
REG [Full Name] [Email] [Username]

Example: REG John Doe john@email.com johndoe

If you don't have an email, you can skip it:
REG John Doe - johndoe

Or visit: ${getAppUrl()}/auth`;
      }

      // Extract registration details
      let fullName = "";
      let email = "";
      let username = "";
      
      if (parts.length >= 2) {
        const nameParts: string[] = [];
        let emailIndex = -1;
        let usernameIndex = -1;
        
        // Find email or username indicators
        for (let i = 1; i < parts.length; i++) {
          if (parts[i].includes('@')) {
            emailIndex = i;
            break;
          }
        }
        
        // Find username (last part typically)
        if (parts.length > 1) {
          usernameIndex = parts.length - 1;
          if (parts[usernameIndex] === '-') {
            usernameIndex = parts.length - 2;
          }
          if (emailIndex === parts.length - 1) {
            usernameIndex = parts.length - 2;
          }
        }
        
        // Extract name (everything before email or username)
        const nameEnd = emailIndex > 0 ? emailIndex : (usernameIndex > 0 ? usernameIndex : parts.length);
        for (let i = 1; i < nameEnd; i++) {
          if (parts[i] !== '-') {
            nameParts.push(parts[i]);
          }
        }
        fullName = nameParts.join(' ');
        
        // Extract email
        if (emailIndex > 0 && parts[emailIndex] && parts[emailIndex].includes('@')) {
          email = parts[emailIndex];
        }
        
        // Extract username
        if (usernameIndex > 0 && usernameIndex < parts.length) {
          const candidate = parts[usernameIndex];
          if (candidate !== '-' && !candidate.includes('@')) {
            username = candidate;
          }
        }
      }

      // Validate required fields
      if (!fullName || fullName.trim().length < 2) {
        return `Please provide your full name.
Format: REG [Full Name] [Email] [Username]

Example: REG John Doe john@email.com johndoe
Example: REG John Doe - johndoe (skip email)`;
      }

      // Generate username if not provided
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

      // Clean username
      username = username.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '');

      // Generate email if not provided
      if (!email) {
        email = `${username}@whatsapp.bilscore.com`;
      }

      // Generate default credentials
      const defaultPassword = `BIL${Math.random().toString(36).substring(2, 10).toUpperCase()}!`;
      const defaultPin = "1234";
      
      // Generate validation token for changing credentials
      const changeToken = generateValidationToken();
      const changeTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const hashedPassword = await hash(defaultPassword, 10);
      const hashedPin = await hash(defaultPin, 10);
      const referralCode = `BIL${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // ============================================================
      // STEP 1: CREATE USER - NO METADATA FIELD
      // ============================================================
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

      // ============================================================
      // STEP 2: STORE TOKEN IN AUDITLOG
      // ============================================================
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

      // ============================================================
      // STEP 3: CREATE PALMPAY WALLET
      // ============================================================
      let wallet: any = null;
      let virtualAccountNo: string | null = null;
      let isSimulation = false;
      let palmpayError: string | null = null;
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

        console.log(`✅ PalmPay virtual account created: ${virtualAccountNo}`);
        console.log(`💰 Wallet created: ${wallet.id}, Balance: ${wallet.walletBalance}`);
        console.log(`🏦 Account Name: ${palmpayAccountName}`);
        
      } catch (error: any) {
        console.error('❌ PalmPay virtual account creation failed:', error);
        palmpayError = error.message;
        
        // If PalmPay fails, create a fallback wallet
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
            metadata: {
              createdVia: "whatsapp_fallback",
              palmpayError: palmpayError,
              timestamp: new Date().toISOString(),
            },
          },
        });

        // Update user
        await prisma.user.update({
          where: { id: user.id },
          data: { hasWallet: true },
        });

        console.log(`⚠️ Fallback wallet created: ${wallet.accountNumber}`);
      }

      // ============================================================
      // STEP 4: CREDIT WELCOME BONUS
      // ============================================================
      const WELCOME_BONUS = parseInt(process.env.WELCOME_BONUS_AMOUNT || '20000');

      if (wallet) {
        const existingBonus = await prisma.walletTransaction.findFirst({
          where: {
            walletId: wallet.id,
            reference: { startsWith: 'WELCOME_BONUS_' },
          },
        });

        if (!existingBonus) {
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
                metadata: {
                  isWelcomeBonus: true,
                  amount: WELCOME_BONUS,
                  timestamp: new Date().toISOString(),
                },
              },
            }),
          ]);

          await prisma.user.update({
            where: { id: user.id },
            data: { 
              walletBalance: currentBalance + WELCOME_BONUS,
            },
          });

          console.log(`🎉 Welcome bonus of NGN ${WELCOME_BONUS.toLocaleString()} credited`);
        }
      }

      // ============================================================
      // STEP 5: CREATE/UPDATE CHANNEL - USE UPSERT
      // ============================================================
      try {
        await prisma.channel.upsert({
          where: {
            channelIdentifier: phone,
          },
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
        console.log(`✅ Channel created/updated for: ${phone}`);
      } catch (channelError) {
        console.error("Channel upsert error:", channelError);
        // Don't fail registration if channel fails
      }

      // ============================================================
      // STEP 6: GENERATE CHANGE LINK
      // ============================================================
      const appUrl = getAppUrl();
      const changeLink = `${appUrl}/auth/update-credentials?token=${changeToken}`;

      // Get final wallet balance
      const finalBalance = wallet ? Number(wallet.walletBalance) + WELCOME_BONUS : 0;

      // Determine bank name
      const bankName = wallet?.bankName || 'BILSCORE';
      const isPalmPay = bankName === 'PALMPAY';

      // Build wallet info string
      let walletInfo = `Wallet Information:
Account Name: ${palmpayAccountName || wallet?.accountName || user.fullName}
Account Number: ${wallet?.accountNumber || 'N/A'}
Wallet Balance: NGN ${finalBalance.toFixed(2)}
Bank: ${bankName}`;

      // Add PalmPay specific info
      if (isPalmPay && virtualAccountNo) {
        walletInfo += `
Virtual Account: ${virtualAccountNo}
(Simulation Mode: ${isSimulation ? 'Yes' : 'No'})`;
      }

      // ============================================================
      // STEP 7: RETURN SUCCESS MESSAGE
      // ============================================================
      return `Registration Successful, ${user.fullName}!

Account Details:
Username: ${username}
Phone: ${phone}

${walletInfo}

Referral Code: ${referralCode}

Default Password: ${defaultPassword}
Default PIN: ${defaultPin}

To change your password and PIN:
${changeLink}

This link is valid for 7 days.

Available Commands:
HELP - Show all commands
BALANCE - Check wallet
AIRTIME [phone] [amount] - Buy airtime
DATA [phone] [plan] - Buy data
ELECTRICITY - View saved meters
CABLE - View saved decoders
ADDMETER [meter] [disco] [name] - Add meter
ADDDECODER [decoder] [provider] [name] - Add decoder
TRANSACTIONS - View history
REFERRAL - Get referral link

Thank you for choosing Bilscore!`;

    } else {
      return `Welcome to Bilscore!

To register, please provide your details:
REG [Full Name] [Email] [Username]

Example: REG John Doe john@email.com johndoe

If you don't have an email, you can skip it:
REG John Doe - johndoe

Or visit our website:
${getAppUrl()}/auth`;
    }

  } catch (error) {
    console.error("❌ [WhatsApp] Registration error:", error);
    return `Registration failed. Please try again later.

If the problem persists, visit:
${getAppUrl()}/auth

Or reply with HELP for assistance.`;
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

    return `Your Bilscore Balance: NGN ${Number(balance).toFixed(2)}

Quick Stats:
Total Transactions: ${totalTxns}
Referrals: ${referrals}
Wallet Status: ${wallet?.isActive ? "Active" : "Inactive"}

Reply with HELP for available commands.`;
  }

  // ========== METER MANAGEMENT ==========
  
  if (command.startsWith("ADDMETER") || command.startsWith("ADD METER")) {
    const parts = body.split(" ").filter(p => p.length > 0);
    if (parts.length < 4) {
      return `To add a meter, reply with:
ADDMETER [meter_number] [disco] [name]

Example: ADDMETER 1234567890 ABUJA HOME

Available DISCOs:
IKEJA, EKO, ABUJA, KANO, PHCN, IBADAN, 
BENIN, ENUGU, JOS, PORT_HARCOURT

Name can be: HOME, OFFICE, SHOP, etc.`;
    }

    const [, meterNumber, disco, ...nameParts] = parts;
    const name = nameParts.join(" ");
    
    return await addMeter(user.id, meterNumber, disco, name);
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
    
    return await addDecoder(user.id, decoderNumber, provider, name);
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

  // ========== ELECTRICITY PURCHASE WITH PIN VALIDATION ==========
  
  if (command === "ELECTRICITY" || command === "ELEC" || command === "POWER") {
    const meters = await prisma.savedMeter.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    if (meters.length === 0) {
      return `You don't have any saved meters.

To add your first meter:
ADDMETER [meter_number] [disco] [name]

Example: ADDMETER 1234567890 ABUJA HOME

Available DISCOs:
IKEJA, EKO, ABUJA, KANO, PHCN, IBADAN, 
BENIN, ENUGU, JOS, PORT_HARCOURT

After adding, you can buy electricity by just typing ELECTRICITY!`;
    }

    let message = "Your Saved Meters:\n\n";
    meters.forEach((meter: any, index: number) => {
      const defaultTag = meter.isDefault ? " (Default)" : "";
      message += `${index + 1}. ${meter.name || meter.meterNumber}${defaultTag}\n`;
      message += `   ${meter.disco}\n`;
      message += `   ${meter.meterNumber}\n\n`;
    });

    message += `Reply with: ELECTRICITY [number] [amount]\n`;
    message += `Example: ELECTRICITY 1 5000\n\n`;
    message += `To add more meters: ADDMETER [meter] [disco] [name]`;
    
    return message;
  }

  if (command.startsWith("ELECTRICITY") || command.startsWith("ELEC") || command.startsWith("POWER")) {
    const parts = body.split(" ").filter(p => p.length > 0);
    
    if (parts.length >= 3) {
      const [, indexStr, amountStr] = parts;
      const index = parseInt(indexStr) - 1;
      const amount = parseFloat(amountStr);
      
      if (isNaN(index) || index < 0) {
        return `Invalid selection. Please choose a number from the list.
Example: ELECTRICITY 1 5000`;
      }
      
      if (isNaN(amount) || amount < 100) {
        return `Invalid amount. Minimum is NGN 100.
Example: ELECTRICITY 1 5000`;
      }
      
      const meters = await prisma.savedMeter.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      
      if (index >= meters.length) {
        return `Invalid selection. Please choose a number from the list.`;
      }
      
      const selectedMeter = meters[index];
      return await processElectricityPurchaseWithPinValidation(user, selectedMeter.meterNumber, amount, selectedMeter.disco);
    }
    
    if (parts.length === 2) {
      return `Please specify the amount as well.
Example: ELECTRICITY ${parts[1]} 5000`;
    }
  }

  // ========== CABLE PURCHASE WITH PIN VALIDATION ==========
  
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

    const packages = getAvailablePackages();

    let message = "Your Saved Decoders:\n\n";
    decoders.forEach((decoder: any, index: number) => {
      const defaultTag = decoder.isDefault ? " (Default)" : "";
      message += `${index + 1}. ${decoder.name || decoder.decoderNumber}${defaultTag}\n`;
      message += `   ${decoder.provider}\n`;
      message += `   ${decoder.decoderNumber}\n\n`;
    });

    message += `Then choose a package:\n`;
    packages.forEach((pkg: any, index: number) => {
      message += `   ${index + 1}. ${pkg.name} - NGN ${pkg.price.toFixed(2)}\n`;
    });

    message += `\nReply with: CABLE [decoder_index] [package_index]\n`;
    message += `Example: CABLE 1 2\n\n`;
    message += `To add more decoders: ADDDECODER [decoder] [provider] [name]`;
    
    return message;
  }

  if (command.startsWith("CABLE") || command.startsWith("TV")) {
    const parts = body.split(" ").filter(p => p.length > 0);
    
    if (parts.length >= 3) {
      const [, decoderIndexStr, packageIndexStr] = parts;
      const decoderIndex = parseInt(decoderIndexStr) - 1;
      const packageIndex = parseInt(packageIndexStr) - 1;
      
      if (isNaN(decoderIndex) || decoderIndex < 0) {
        return `Invalid decoder selection. Please choose a number from the list.`;
      }
      
      const decoders = await prisma.savedDecoder.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      
      if (decoderIndex >= decoders.length) {
        return `Invalid decoder selection. Please choose a number from the list.`;
      }
      
      const packages = getAvailablePackages();
      if (packageIndex < 0 || packageIndex >= packages.length) {
        let pkgList = "Available packages:\n";
        packages.forEach((pkg: any, index: number) => {
          pkgList += `   ${index + 1}. ${pkg.name} - NGN ${pkg.price.toFixed(2)}\n`;
        });
        return `Invalid package selection.\n\n${pkgList}`;
      }
      
      const selectedDecoder = decoders[decoderIndex];
      const selectedPackage = packages[packageIndex];
      
      return await processCablePurchaseWithPinValidation(user, selectedDecoder.decoderNumber, selectedPackage.code);
    }
    
    if (parts.length === 2) {
      return `Please specify the package as well.
Example: CABLE ${parts[1]} 2`;
    }
  }

  // ========== AIRTIME ==========
  if (command.startsWith("AIRTIME") || command.startsWith("AIRTIME ")) {
    const [, phoneNumber, amount] = parts;
    if (!phoneNumber || !amount) {
      return `To buy airtime, reply with:
AIRTIME [phone number] [amount]

Example: AIRTIME 08012345678 500

Available networks: MTN, GLO, AIRTEL, 9MOBILE
Minimum: NGN 50 | Maximum: NGN 50,000`;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 50 || amountNum > 50000) {
      return `Invalid amount. Please enter between NGN 50 and NGN 50,000.
Example: AIRTIME 08012345678 500`;
    }

    return await processAirtimePurchaseWithPinValidation(user, phoneNumber, amountNum);
  }

  // ========== DATA ==========
  if (command.startsWith("DATA")) {
    const [, phoneNumber, plan] = parts;
    if (!phoneNumber || !plan) {
      return `To buy data, reply with:
DATA [phone number] [plan]

Available plans:
MTN: 1GB, 2GB, 5GB, 10GB
GLO: 1GB, 3GB, 5GB
AIRTEL: 1GB, 3GB, 8GB
9MOBILE: 1GB, 2GB, 5GB

Example: DATA 08012345678 1GB`;
    }

    return await processDataPurchaseWithPinValidation(user, phoneNumber, plan);
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
AIRTIME [phone] [amount] - Buy airtime
DATA [phone] [plan] - Buy data
ELECTRICITY - See saved meters
CABLE - See saved decoders
ADDMETER [meter] [disco] [name] - Save a meter
ADDDECODER [decoder] [provider] [name] - Save a decoder
METERS - List your saved meters
DECODERS - List your saved decoders
TRANSACTIONS - View your history
REFERRAL - Get your referral link
PIN - Set up transaction PIN`;
}

// ============================================================
// DEVICE MANAGEMENT HELPERS
// ============================================================

async function addMeter(userId: string, meterNumber: string, disco: string, name: string): Promise<string> {
  try {
    const validDiscos = ["IKEJA", "EKO", "ABUJA", "KANO", "PHCN", "IBADAN", "BENIN", "ENUGU", "JOS", "PORT_HARCOURT"];
    const discoUpper = disco.toUpperCase();
    if (!validDiscos.includes(discoUpper)) {
      return `Invalid DisCo. Available: ${validDiscos.join(", ")}`;
    }

    const existing = await prisma.savedMeter.findFirst({
      where: {
        userId: userId,
        meterNumber: meterNumber,
      },
    });

    if (existing) {
      await prisma.savedMeter.update({
        where: { id: existing.id },
        data: {
          disco: discoUpper,
          name: name || existing.name,
          updatedAt: new Date(),
        },
      });
      return `Meter updated successfully!

Meter: ${meterNumber}
DisCo: ${discoUpper}
Name: ${name || existing.name}

Type METERS to see all your saved meters.`;
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

    return `Meter added successfully!

Meter: ${meterNumber}
DisCo: ${discoUpper}
Name: ${name || `${discoUpper} Meter`}

Type ELECTRICITY to see all your meters and buy power!`;

  } catch (error) {
    console.error("Add meter error:", error);
    return `Failed to add meter. Please try again.`;
  }
}

async function addDecoder(userId: string, decoderNumber: string, provider: string, name: string): Promise<string> {
  try {
    const validProviders = ["DSTV", "GOTV", "STARTIMES"];
    const providerUpper = provider.toUpperCase();
    if (!validProviders.includes(providerUpper)) {
      return `Invalid provider. Available: ${validProviders.join(", ")}`;
    }

    const existing = await prisma.savedDecoder.findFirst({
      where: {
        userId: userId,
        decoderNumber: decoderNumber,
      },
    });

    if (existing) {
      await prisma.savedDecoder.update({
        where: { id: existing.id },
        data: {
          provider: providerUpper,
          name: name || existing.name,
          updatedAt: new Date(),
        },
      });
      return `Decoder updated successfully!

Decoder: ${decoderNumber}
Provider: ${providerUpper}
Name: ${name || existing.name}

Type DECODERS to see all your saved decoders.`;
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

    return `Decoder added successfully!

Decoder: ${decoderNumber}
Provider: ${providerUpper}
Name: ${name || `${providerUpper} Decoder`}

Type CABLE to see all your decoders and buy subscriptions!`;

  } catch (error) {
    console.error("Add decoder error:", error);
    return `Failed to add decoder. Please try again.`;
  }
}

async function listMeters(userId: string): Promise<string> {
  const meters = await prisma.savedMeter.findMany({
    where: { userId: userId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  if (meters.length === 0) {
    return `You have no saved meters.

To add a meter:
ADDMETER [meter_number] [disco] [name]

Example: ADDMETER 1234567890 ABUJA HOME

Available DISCOs:
IKEJA, EKO, ABUJA, KANO, PHCN, IBADAN, 
BENIN, ENUGU, JOS, PORT_HARCOURT`;
  }

  let message = "Your Saved Meters:\n\n";
  meters.forEach((meter: any, index: number) => {
    const defaultTag = meter.isDefault ? " (Default)" : "";
    message += `${index + 1}. ${meter.name || meter.meterNumber}${defaultTag}\n`;
    message += `   ${meter.disco}\n`;
    message += `   ${meter.meterNumber}\n\n`;
  });

  message += `To buy electricity: ELECTRICITY [number] [amount]
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

  message += `To buy cable: CABLE [decoder_index] [package_index]
To delete: DELETEDECODER [decoder_number]
To set default: SETDEFAULTDECODER [decoder_number]`;

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

function getAvailablePackages(): Array<{ name: string; code: string; price: number }> {
  return [
    { name: "DSTV Premium", code: "PREMIUM", price: 15000 },
    { name: "DSTV Compact", code: "COMPACT", price: 10000 },
    { name: "DSTV Family", code: "FAMILY", price: 5000 },
    { name: "GOTV Max", code: "MAX", price: 8000 },
    { name: "GOTV Plus", code: "PLUS", price: 5000 },
    { name: "GOTV Lite", code: "LITE", price: 3000 },
    { name: "Startimes Basic", code: "BASIC", price: 2500 },
  ];
}

// ============================================================
// PURCHASE HANDLERS WITH PIN VALIDATION LINK
// ============================================================

async function processElectricityPurchaseWithPinValidation(user: any, meterNumber: string, amount: number, disco: string): Promise<string> {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.walletBalance) < amount) {
      return `Insufficient balance. You have NGN ${Number(wallet?.walletBalance || 0).toFixed(2)}.
Need NGN ${amount.toFixed(2)}.

Please fund your wallet and try again.`;
    }

    if (!user.pinHash) {
      return `You need to set a transaction PIN first.

To set your PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

Your PIN is required for all transactions.`;
    }

    const validationToken = generateValidationToken();

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.ELECTRICITY_INSTANT,
        product: disco,
        amount: amount,
        serviceFee: 0,
        totalDebited: amount,
        meterNumber: meterNumber,
        status: "PENDING",
        vendor: VtuVendor.VTPASS,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "whatsapp",
          meterNumber,
          disco,
          pendingPin: true,
          validationToken: validationToken,
          validationExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: "SYSTEM",
        amount: amount,
        balanceBefore: Number(wallet.walletBalance),
        balanceAfter: Number(wallet.walletBalance),
        reference: `PENDING_${transaction.id}`,
        description: `Pending electricity purchase - await PIN validation`,
        status: "PENDING",
        category: "ELECTRICITY",
        metadata: {
          validationToken: validationToken,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
      },
    });

    const appUrl = getAppUrl();
    const validationLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

    console.log(`🔗 [WhatsApp] Validation link: ${validationLink}`);
    console.log(`📝 [WhatsApp] Validation token: ${validationToken}`);

    return `Electricity Purchase Initiated!

Meter: ${meterNumber}
DisCo: ${disco}
Amount: NGN ${amount.toFixed(2)}
Reference: ${transaction.id.substring(0, 10)}

To complete this purchase, please confirm your PIN:

${validationLink}

This link expires in 5 minutes.
Your PIN is secure and will not be shared via WhatsApp.

After confirming, your electricity token will be sent here.`;
  } catch (error) {
    console.error("Electricity purchase error:", error);
    return `Failed to initiate electricity purchase. Please try again.`;
  }
}

async function processCablePurchaseWithPinValidation(user: any, decoderNumber: string, packageCode: string): Promise<string> {
  try {
    const packages: Record<string, { name: string; price: number }> = {
      'PREMIUM': { name: 'Premium', price: 15000 },
      'COMPACT': { name: 'Compact', price: 10000 },
      'FAMILY': { name: 'Family', price: 5000 },
      'MAX': { name: 'Max', price: 8000 },
      'PLUS': { name: 'Plus', price: 5000 },
      'LITE': { name: 'Lite', price: 3000 },
      'BASIC': { name: 'Basic', price: 2500 },
    };

    const pkg = packages[packageCode.toUpperCase()];
    if (!pkg) {
      return `Invalid package. Available packages:
DSTV: PREMIUM, COMPACT, FAMILY
GOTV: MAX, PLUS, LITE
Startimes: BASIC`;
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.walletBalance) < pkg.price) {
      return `Insufficient balance. You have NGN ${Number(wallet?.walletBalance || 0).toFixed(2)}.
Need NGN ${pkg.price.toFixed(2)}.

Please fund your wallet and try again.`;
    }

    if (!user.pinHash) {
      return `You need to set a transaction PIN first.

To set your PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

Your PIN is required for all transactions.`;
    }

    const validationToken = generateValidationToken();

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.CABLE_TV,
        product: `${pkg.name} Package`,
        amount: pkg.price,
        serviceFee: 0,
        totalDebited: pkg.price,
        phoneNumber: user.phone,
        networkPlan: packageCode,
        status: "PENDING",
        vendor: VtuVendor.VTPASS,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "whatsapp",
          decoderNumber,
          packageCode,
          pendingPin: true,
          validationToken: validationToken,
          validationExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: "SYSTEM",
        amount: pkg.price,
        balanceBefore: Number(wallet.walletBalance),
        balanceAfter: Number(wallet.walletBalance),
        reference: `PENDING_${transaction.id}`,
        description: `Pending cable subscription - await PIN validation`,
        status: "PENDING",
        category: "CABLE_TV",
        metadata: {
          validationToken: validationToken,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
      },
    });

    const appUrl = getAppUrl();
    const validationLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

    console.log(`🔗 [WhatsApp] Validation link: ${validationLink}`);

    return `Cable Subscription Initiated!

Decoder: ${decoderNumber}
Package: ${pkg.name}
Amount: NGN ${pkg.price.toFixed(2)}
Reference: ${transaction.id.substring(0, 10)}

To complete this purchase, please confirm your PIN:

${validationLink}

This link expires in 5 minutes.
Your PIN is secure and will not be shared via WhatsApp.

After confirming, your subscription will be activated.`;
  } catch (error) {
    console.error("Cable purchase error:", error);
    return `Failed to initiate cable subscription. Please try again.`;
  }
}

async function processAirtimePurchaseWithPinValidation(user: any, phoneNumber: string, amount: number): Promise<string> {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.walletBalance) < amount) {
      return `Insufficient balance. You have NGN ${Number(wallet?.walletBalance || 0).toFixed(2)}.
Need NGN ${amount.toFixed(2)}.

Please fund your wallet and try again.`;
    }

    if (!user.pinHash) {
      return `You need to set a transaction PIN first.

To set your PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

Your PIN is required for all transactions.`;
    }

    const network = detectNetwork(phoneNumber);
    const validationToken = generateValidationToken();

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.AIRTIME,
        product: network,
        amount: amount,
        serviceFee: 0,
        totalDebited: amount,
        phoneNumber: phoneNumber,
        network: mapNetwork(network),
        status: "PENDING",
        vendor: VtuVendor.VTPASS,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "whatsapp",
          phoneNumber,
          network,
          pendingPin: true,
          validationToken: validationToken,
          validationExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: "SYSTEM",
        amount: amount,
        balanceBefore: Number(wallet.walletBalance),
        balanceAfter: Number(wallet.walletBalance),
        reference: `PENDING_${transaction.id}`,
        description: `Pending airtime purchase - await PIN validation`,
        status: "PENDING",
        category: "AIRTIME",
        metadata: {
          validationToken: validationToken,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
      },
    });

    const appUrl = getAppUrl();
    const validationLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

    return `Airtime Purchase Initiated!

Phone: ${phoneNumber}
Amount: NGN ${amount.toFixed(2)}
Network: ${network}
Reference: ${transaction.id.substring(0, 10)}

To complete this purchase, please confirm your PIN:

${validationLink}

This link expires in 5 minutes.
Your PIN is secure and will not be shared via WhatsApp.

After confirming, your airtime will be sent.`;
  } catch (error) {
    console.error("Airtime purchase error:", error);
    return `Failed to initiate airtime purchase. Please try again.`;
  }
}

async function processDataPurchaseWithPinValidation(user: any, phoneNumber: string, plan: string): Promise<string> {
  try {
    const planPrices: Record<string, number> = {
      "1GB": 1000,
      "2GB": 2000,
      "3GB": 3000,
      "5GB": 5000,
      "8GB": 8000,
      "10GB": 10000,
    };

    const price = planPrices[plan.toUpperCase()];
    if (!price) {
      return `Invalid plan. Available plans: 1GB, 2GB, 3GB, 5GB, 8GB, 10GB
Example: DATA 08012345678 1GB`;
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.walletBalance) < price) {
      return `Insufficient balance. You have NGN ${Number(wallet?.walletBalance || 0).toFixed(2)}.
Need NGN ${price.toFixed(2)}.

Please fund your wallet and try again.`;
    }

    if (!user.pinHash) {
      return `You need to set a transaction PIN first.

To set your PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

Your PIN is required for all transactions.`;
    }

    const network = detectNetwork(phoneNumber);
    const validationToken = generateValidationToken();

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.DATA,
        product: `${plan} Data Bundle`,
        amount: price,
        serviceFee: 0,
        totalDebited: price,
        phoneNumber: phoneNumber,
        network: mapNetwork(network),
        networkPlan: plan,
        status: "PENDING",
        vendor: VtuVendor.VTPASS,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "whatsapp",
          phoneNumber,
          plan,
          network,
          pendingPin: true,
          validationToken: validationToken,
          validationExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: "SYSTEM",
        amount: price,
        balanceBefore: Number(wallet.walletBalance),
        balanceAfter: Number(wallet.walletBalance),
        reference: `PENDING_${transaction.id}`,
        description: `Pending data purchase - await PIN validation`,
        status: "PENDING",
        category: "DATA",
        metadata: {
          validationToken: validationToken,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
      },
    });

    const appUrl = getAppUrl();
    const validationLink = `${appUrl}/auth/validate-purchase?token=${validationToken}`;

    return `Data Purchase Initiated!

Phone: ${phoneNumber}
Plan: ${plan}
Amount: NGN ${price.toFixed(2)}
Network: ${network}
Reference: ${transaction.id.substring(0, 10)}

To complete this purchase, please confirm your PIN:

${validationLink}

This link expires in 5 minutes.
Your PIN is secure and will not be shared via WhatsApp.

After confirming, your data bundle will be activated.`;
  } catch (error) {
    console.error("Data purchase error:", error);
    return `Failed to initiate data purchase. Please try again.`;
  }
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

// ============================================================
// HELP FUNCTION
// ============================================================

function getHelpMessage(user: any): string {
  return `Bilscore WhatsApp Commands

Financial:
BALANCE - Check wallet balance
TRANSACTIONS - View transaction history
PIN [code] - Set transaction PIN

Electricity (Saved Meters):
ELECTRICITY - Show your saved meters
ELECTRICITY [index] [amount] - Buy from saved meter
Example: ELECTRICITY 1 5000
ADDMETER [meter] [disco] [name] - Add a meter
METERS - List all saved meters
DELETEMETER [meter] - Remove a meter
SETDEFAULTMETER [meter] - Set default meter

Cable TV (Saved Decoders):
CABLE - Show your saved decoders
CABLE [decoder_index] [package_index] - Buy cable
Example: CABLE 1 2
ADDDECODER [decoder] [provider] [name] - Add a decoder
DECODERS - List all saved decoders
DELETEDECODER [decoder] - Remove a decoder
SETDEFAULTDECODER [decoder] - Set default decoder

Airtime:
AIRTIME [phone] [amount] - Buy airtime
Example: AIRTIME 08012345678 500

Data:
DATA [phone] [plan] - Buy data
Example: DATA 08012345678 1GB

Referral:
REFERRAL - Get your referral link

Help:
HELP or ? - Show this message

All purchases require PIN validation via secure link.

Need more help? Visit: ${getAppUrl()}/support`;
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
    const status = tx.status === "SUCCESS" ? "OK" : tx.status === "PENDING" ? "PENDING" : "FAILED";
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
// HELPER FUNCTIONS
// ============================================================

function detectNetwork(phoneNumber: string): string {
  const cleanNumber = phoneNumber.replace(/\D/g, "");
  
  if (cleanNumber.startsWith("080") || cleanNumber.startsWith("081") || cleanNumber.startsWith("070")) {
    return "MTN";
  } else if (cleanNumber.startsWith("090") || cleanNumber.startsWith("091")) {
    return "AIRTEL";
  } else if (cleanNumber.startsWith("0805") || cleanNumber.startsWith("0807") || cleanNumber.startsWith("0811")) {
    return "GLO";
  } else if (cleanNumber.startsWith("0809") || cleanNumber.startsWith("0818") || cleanNumber.startsWith("0909")) {
    return "9MOBILE";
  }
  return "MTN";
}

function mapNetwork(networkInput: string): NetworkProvider {
  const networkMap: Record<string, NetworkProvider> = {
    'MTN': NetworkProvider.MTN,
    'GLO': NetworkProvider.GLO,
    'AIRTEL': NetworkProvider.AIRTEL,
    '9MOBILE': NetworkProvider.NINEMOBILE,
  };
  const normalized = networkInput?.trim() || '';
  const mapped = networkMap[normalized];
  if (!mapped) {
    console.warn(`⚠️ Unknown network: "${networkInput}", defaulting to MTN`);
    return NetworkProvider.MTN;
  }
  return mapped;
}