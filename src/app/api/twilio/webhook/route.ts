// app/api/twilio/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
 import twilio from "twilio";

import { prisma } from "~/lib/db";
import { compare } from "bcrypt";
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

const VoiceResponse = twilio.twiml.VoiceResponse;

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
  'ninemobile': NetworkProvider.NINEMOBILE,
};

function mapNetwork(networkInput: string): NetworkProvider {
  const normalized = networkInput?.trim() || '';
  const mapped = networkMap[normalized];
  if (!mapped) {
    console.warn(`⚠️ Unknown network: "${networkInput}", defaulting to MTN`);
    return NetworkProvider.MTN;
  }
  return mapped;
}

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.substring(3);
  }
  if (cleaned.length < 10) {
    cleaned = cleaned.padStart(10, '0');
  }
  if (cleaned.length > 11) {
    cleaned = cleaned.substring(0, 11);
  }
  return cleaned;
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

    // Find user by phone number
    let user = await prisma.user.findFirst({
      where: { phone: whatsappFrom },
      include: { wallet: true },
    });

    let responseMessage = "";

    // If user not found, prompt to register or handle registration
    if (!user) {
      const upperBody = body.toUpperCase().trim();
      
      if (upperBody === "REGISTER" || upperBody === "SIGNUP") {
        responseMessage = await handleRegistration(whatsappFrom);
      } else {
        responseMessage = `👋 Welcome to Bilscore! 

To get started, please register using the link below:
${process.env.NEXTAUTH_URL}/auth?ref=WA${Math.random().toString(36).substring(2, 7).toUpperCase()}

Or reply with "REGISTER" to create an account.
Reply with "HELP" for more information.

Available commands:
• BALANCE - Check wallet balance
• AIRTIME [phone] [amount] - Buy airtime
• DATA [phone] [plan] - Buy data
• ELECTRICITY [meter] [amount] - Buy electricity
• CABLE [decoder] [package] - Buy cable TV
• TRANSACTIONS - View history
• REFERRAL - Get referral link`;
      }

      // Store incoming message for analytics
      await prisma.channel.upsert({
        where: {
          channelIdentifier: whatsappFrom,
        },
        update: {
          lastSeen: new Date(),
          metadata: {
            lastMessage: body,
            lastMessageSid: messageSid,
            status: "UNREGISTERED",
          },
        },
        create: {
          userId: "pending",
          channelType: ChannelType.WHATSAPP,
          channelIdentifier: whatsappFrom,
          channelUsername: whatsappFrom,
          isVerified: false,
          linkedAt: new Date(),
          lastSeen: new Date(),
          metadata: {
            messageSid,
            body,
            from: whatsappFrom,
            to: whatsappTo,
            status: "UNREGISTERED",
          },
        },
      });

      return sendTwilioResponse(responseMessage);
    }

    // User exists - update channel
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

    // Process commands
    responseMessage = await processWhatsAppCommand(user, body, whatsappFrom);

    return sendTwilioResponse(responseMessage);

  } catch (error) {
    console.error("❌ [Twilio Webhook] Error:", error);
    return sendTwilioResponse("Sorry, an error occurred. Please try again later.");
  }
}

// ============================================================
// REGISTRATION HANDLER
// ============================================================

async function handleRegistration(phone: string): Promise<string> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { phone: phone },
    });

    if (existingUser) {
      return `✅ You're already registered with Bilscore!

Your registered name: ${existingUser.fullName}
Wallet Balance: ₦${Number(existingUser.walletBalance || 0).toFixed(2)}

Type "HELP" to see available commands.`;
    }

    // Generate a temporary username and create user
    const username = `user_${Math.random().toString(36).substring(2, 8)}`;
    const referralCode = `BIL${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Create user with a random password (they'll need to set one later)
    const newUser = await prisma.user.create({
      data: {
        phone: phone,
        username: username,
        fullName: `WhatsApp User ${phone.slice(-4)}`,
        role: "END_USER",
        referralCode: referralCode,
        hasWallet: false,
        walletBalance: 0,
        isVerified: true,
        isWalletFrozen: false,
        preferredLanguage: "EN",
        pinAttempts: 0,
        kycStatus: "PENDING",
        // Create a channel immediately
        channels: {
          create: {
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
        },
      },
    });

    // Create wallet for the user
    const wallet = await prisma.wallet.create({
      data: {
        userId: newUser.id,
        accountNumber: `BIL${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        bankName: "BILSCORE",
        accountName: newUser.fullName,
        walletBalance: 0,
        ledgerBalance: 0,
        currency: "NGN",
        isActive: true,
        kycLevel: 1,
      },
    });

    // Update user with wallet
    await prisma.user.update({
      where: { id: newUser.id },
      data: { hasWallet: true },
    });

    console.log(`✅ [WhatsApp] New user registered via WhatsApp: ${newUser.id}`);

    return `🎉 Welcome to Bilscore, ${newUser.fullName}!

Your account has been created successfully via WhatsApp.

📱 Phone: ${phone}
💰 Wallet: ${wallet.accountNumber}
🔑 Referral Code: ${referralCode}

To get started, reply with:
• "HELP" - See all available commands
• "BALANCE" - Check your wallet balance
• "AIRTIME [phone] [amount]" - Buy airtime
• "DATA [phone] [plan]" - Buy data

You can also set up a transaction PIN for security by visiting our website:
${process.env.NEXTAUTH_URL}/profile

Thank you for choosing Bilscore! 🚀`;

  } catch (error) {
    console.error("❌ [WhatsApp] Registration error:", error);
    return `❌ Sorry, we couldn't create your account at this time. Please try again later or visit our website: ${process.env.NEXTAUTH_URL}`;
  }
}

// ============================================================
// COMMAND PROCESSING
// ============================================================

async function processWhatsAppCommand(user: any, body: string, phone: string): Promise<string> {
  const command = body.toUpperCase().trim();
  const parts = body.split(" ").filter(p => p.length > 0);

  // ========== HELP ==========
  if (command === "HELP" || command === "?") {
    return getHelpMessage(user);
  }

  // ========== REGISTER ==========
  if (command === "REGISTER" || command === "SIGNUP") {
    return await handleRegistration(phone);
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

    return `💰 Your Bilscore Balance: ₦${Number(balance).toFixed(2)}

📊 Quick Stats:
• Total Transactions: ${totalTxns}
• Referrals: ${referrals}
• Wallet Status: ${wallet?.isActive ? "✅ Active" : "❌ Inactive"}

Reply with "HELP" for available commands.`;
  }

  // ========== AIRTIME ==========
  if (command.startsWith("AIRTIME") || command.startsWith("AIRTIME ")) {
    const [, phoneNumber, amount] = parts;
    if (!phoneNumber || !amount) {
      return `📱 To buy airtime, reply with:
AIRTIME [phone number] [amount]

Example: AIRTIME 08012345678 500

Available networks: MTN, GLO, AIRTEL, 9MOBILE
Minimum: ₦50 | Maximum: ₦50,000`;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 50 || amountNum > 50000) {
      return `❌ Invalid amount. Please enter between ₦50 and ₦50,000.
Example: AIRTIME 08012345678 500`;
    }

    return await processAirtimePurchase(user, phoneNumber, amountNum);
  }

  // ========== DATA ==========
  if (command.startsWith("DATA")) {
    const [, phoneNumber, plan] = parts;
    if (!phoneNumber || !plan) {
      return `📶 To buy data, reply with:
DATA [phone number] [plan]

Available plans:
• MTN: 1GB, 2GB, 5GB, 10GB
• GLO: 1GB, 3GB, 5GB
• AIRTEL: 1GB, 3GB, 8GB
• 9MOBILE: 1GB, 2GB, 5GB

Example: DATA 08012345678 1GB`;
    }

    return await processDataPurchase(user, phoneNumber, plan);
  }

  // ========== ELECTRICITY ==========
  if (command.startsWith("ELECTRICITY") || command.startsWith("ELEC")) {
    const [, meterNumber, amount] = parts;
    if (!meterNumber || !amount) {
      return `⚡ To buy electricity, reply with:
ELECTRICITY [meter number] [amount]

Supported DISCOs:
• Ikeja Electric
• Eko Electric
• Abuja Electric
• Kano Electric
• PHCN
• Ibadan Electric
• Benin Electric
• Enugu Electric
• Jos Electric
• Port Harcourt Electric

Example: ELECTRICITY 1234567890 5000`;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 100) {
      return `❌ Invalid amount. Minimum electricity purchase is ₦100.
Example: ELECTRICITY 1234567890 5000`;
    }

    return await processElectricityPurchase(user, meterNumber, amountNum);
  }

  // ========== CABLE TV ==========
  if (command.startsWith("CABLE")) {
    const [, decoderNumber, packageCode] = parts;
    if (!decoderNumber || !packageCode) {
      return `📺 To buy cable TV, reply with:
CABLE [decoder number] [package]

Available packages:
• DSTV: Premium, Compact, Family
• GOTV: Max, Plus, Lite
• Startimes: Basic, Premium

Example: CABLE 1234567890 Premium`;
    }

    return await processCablePurchase(user, decoderNumber, packageCode);
  }

  // ========== TRANSACTIONS ==========
  if (command === "TRANSACTIONS" || command === "TXNS" || command === "HISTORY") {
    return await getTransactionHistory(user.id);
  }

  // ========== REFERRAL ==========
  if (command === "REFERRAL" || command === "REF") {
    const referralCode = user.referralCode || "N/A";
    const link = `${process.env.NEXTAUTH_URL}/auth?ref=${referralCode}`;
    const count = await prisma.referral.count({
      where: { referrerId: user.id },
    });
    
    return `🎯 Your Referral Program

🔗 Your Referral Code: ${referralCode}
👥 Total Referrals: ${count}
💰 Referral Bonus: ₦50 per signup

Share your link:
${link}

Copy this link and share with friends to earn rewards!`;
  }

  // ========== PIN ==========
  if (command === "PIN" || command.startsWith("PIN ")) {
    return await handlePinCommand(user, parts);
  }

  // ========== UNKNOWN COMMAND ==========
  return `❌ I didn't understand that command.

Type "HELP" to see all available commands.

Or try:
• "BALANCE" - Check your wallet
• "AIRTIME [phone] [amount]" - Buy airtime
• "DATA [phone] [plan]" - Buy data
• "ELECTRICITY [meter] [amount]" - Buy electricity
• "CABLE [decoder] [package]" - Buy cable TV
• "TRANSACTIONS" - View your history
• "REFERRAL" - Get your referral link
• "PIN" - Set up transaction PIN`;
}

// ============================================================
// PURCHASE HANDLERS
// ============================================================

async function processAirtimePurchase(user: any, phoneNumber: string, amount: number): Promise<string> {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      return `❌ No wallet found. Please contact support.`;
    }

    if (Number(wallet.walletBalance) < amount) {
      return `❌ Insufficient balance. You have ₦${Number(wallet.walletBalance).toFixed(2)}.
Need ₦${amount.toFixed(2)}.

Please fund your wallet and try again.`;
    }

    const network = detectNetwork(phoneNumber);

    // Create transaction
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
        status: TransactionStatus.SUCCESS,
        vendor: VtuVendor.VTPASS,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "whatsapp",
          phoneNumber,
          network,
          vendor: "VTPASS",
        },
      },
    });

    // Deduct from wallet
    await prisma.wallet.update({
      where: { userId: user.id },
      data: {
        walletBalance: Number(wallet.walletBalance) - amount,
      },
    });

    // Create wallet transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: WalletTransactionType.DEBIT,
        amount: amount,
        balanceBefore: Number(wallet.walletBalance),
        balanceAfter: Number(wallet.walletBalance) - amount,
        reference: `WA-${Date.now()}`,
        description: `Airtime purchase for ${phoneNumber}`,
        status: TransactionStatus.SUCCESS,
        category: WalletCategory.AIRTIME,
        channel: ChannelType.WHATSAPP,
        vtuTransactionId: transaction.id,
      },
    });

    // Create/Update customer
    await prisma.customer.upsert({
      where: {
        userId_phone: {
          userId: user.id,
          phone: phoneNumber,
        },
      },
      update: {
        totalTransactions: { increment: 1 },
        totalSpent: { increment: amount },
        lastTransactionAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        phone: phoneNumber,
        customerType: CustomerType.REGULAR,
        totalTransactions: 1,
        totalSpent: amount,
        totalCommissionEarned: 0,
        firstTransactionAt: new Date(),
        lastTransactionAt: new Date(),
        tags: [],
      },
    });

    // Get updated balance
    const updatedWallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    return `✅ Airtime Purchase Successful!

📱 Phone: ${phoneNumber}
💰 Amount: ₦${amount.toFixed(2)}
📡 Network: ${network}
🆔 Transaction ID: ${transaction.id.substring(0, 10)}

New Balance: ₦${Number(updatedWallet?.walletBalance || 0).toFixed(2)}

Thank you for using Bilscore! 🎉`;

  } catch (error) {
    console.error("Airtime purchase error:", error);
    return `❌ Failed to process airtime purchase. Please try again.`;
  }
}

async function processDataPurchase(user: any, phoneNumber: string, plan: string): Promise<string> {
  try {
    // Find plan pricing (simplified - in production, fetch from product catalog)
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
      return `❌ Invalid plan. Available plans: 1GB, 2GB, 3GB, 5GB, 8GB, 10GB
Example: DATA 08012345678 1GB`;
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.walletBalance) < price) {
      return `❌ Insufficient balance. You have ₦${Number(wallet?.walletBalance || 0).toFixed(2)}.
Need ₦${price.toFixed(2)}.

Please fund your wallet and try again.`;
    }

    const network = detectNetwork(phoneNumber);

    // Create transaction
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
        status: TransactionStatus.SUCCESS,
        vendor: VtuVendor.VTPASS,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "whatsapp",
          phoneNumber,
          plan,
          network,
        },
      },
    });

    await prisma.wallet.update({
      where: { userId: user.id },
      data: {
        walletBalance: Number(wallet.walletBalance) - price,
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: WalletTransactionType.DEBIT,
        amount: price,
        balanceBefore: Number(wallet.walletBalance),
        balanceAfter: Number(wallet.walletBalance) - price,
        reference: `WD-${Date.now()}`,
        description: `Data purchase for ${phoneNumber}`,
        status: TransactionStatus.SUCCESS,
        category: WalletCategory.DATA,
        channel: ChannelType.WHATSAPP,
        vtuTransactionId: transaction.id,
      },
    });

    const updatedWallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    return `✅ Data Purchase Successful!

📱 Phone: ${phoneNumber}
📶 Plan: ${plan}
💰 Amount: ₦${price.toFixed(2)}
📡 Network: ${network}

New Balance: ₦${Number(updatedWallet?.walletBalance || 0).toFixed(2)}

Thank you for using Bilscore! 🎉`;

  } catch (error) {
    console.error("Data purchase error:", error);
    return `❌ Failed to process data purchase. Please try again.`;
  }
}

async function processElectricityPurchase(user: any, meterNumber: string, amount: number): Promise<string> {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.walletBalance) < amount) {
      return `❌ Insufficient balance. You have ₦${Number(wallet?.walletBalance || 0).toFixed(2)}.
Need ₦${amount.toFixed(2)}.

Please fund your wallet and try again.`;
    }

    // Create transaction
    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: user.id,
        transactionType: VtuType.ELECTRICITY_INSTANT,
        product: "Electricity Token",
        amount: amount,
        serviceFee: 0,
        totalDebited: amount,
        meterNumber: meterNumber,
        status: TransactionStatus.SUCCESS,
        vendor: VtuVendor.VTPASS,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "whatsapp",
          meterNumber,
        },
      },
    });

    await prisma.wallet.update({
      where: { userId: user.id },
      data: {
        walletBalance: Number(wallet.walletBalance) - amount,
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: WalletTransactionType.DEBIT,
        amount: amount,
        balanceBefore: Number(wallet.walletBalance),
        balanceAfter: Number(wallet.walletBalance) - amount,
        reference: `WE-${Date.now()}`,
        description: `Electricity purchase for ${meterNumber}`,
        status: TransactionStatus.SUCCESS,
        category: WalletCategory.ELECTRICITY,
        channel: ChannelType.WHATSAPP,
        vtuTransactionId: transaction.id,
      },
    });

    // Generate a mock token (in production, this comes from the vendor)
    const token = Math.random().toString(36).substring(2, 15).toUpperCase();

    const updatedWallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    return `✅ Electricity Purchase Successful!

⚡ Meter: ${meterNumber}
💰 Amount: ₦${amount.toFixed(2)}
🔑 Token: ${token}
🆔 Transaction ID: ${transaction.id.substring(0, 10)}

New Balance: ₦${Number(updatedWallet?.walletBalance || 0).toFixed(2)}

Please use the token above to recharge your meter.

Thank you for using Bilscore! 🎉`;

  } catch (error) {
    console.error("Electricity purchase error:", error);
    return `❌ Failed to process electricity purchase. Please try again.`;
  }
}

async function processCablePurchase(user: any, decoderNumber: string, packageCode: string): Promise<string> {
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
      return `❌ Invalid package. Available packages:
• DSTV: PREMIUM, COMPACT, FAMILY
• GOTV: MAX, PLUS, LITE
• Startimes: BASIC

Example: CABLE 1234567890 PREMIUM`;
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.walletBalance) < pkg.price) {
      return `❌ Insufficient balance. You have ₦${Number(wallet?.walletBalance || 0).toFixed(2)}.
Need ₦${pkg.price.toFixed(2)}.

Please fund your wallet and try again.`;
    }

    // Create transaction
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
        status: TransactionStatus.SUCCESS,
        vendor: VtuVendor.VTPASS,
        channel: ChannelType.WHATSAPP,
        metadata: {
          source: "whatsapp",
          decoderNumber,
          packageCode,
        },
      },
    });

    await prisma.wallet.update({
      where: { userId: user.id },
      data: {
        walletBalance: Number(wallet.walletBalance) - pkg.price,
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: WalletTransactionType.DEBIT,
        amount: pkg.price,
        balanceBefore: Number(wallet.walletBalance),
        balanceAfter: Number(wallet.walletBalance) - pkg.price,
        reference: `WC-${Date.now()}`,
        description: `Cable TV subscription for ${decoderNumber}`,
        status: TransactionStatus.SUCCESS,
        category: WalletCategory.CABLE_TV,
        channel: ChannelType.WHATSAPP,
        vtuTransactionId: transaction.id,
      },
    });

    // Save decoder
    await prisma.savedDecoder.upsert({
      where: {
        userId_decoderNumber: {
          userId: user.id,
          decoderNumber: decoderNumber,
        },
      },
      update: {
        provider: "DSTV",
        name: `${pkg.name} Decoder`,
        package: packageCode,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        decoderNumber: decoderNumber,
        provider: "DSTV",
        name: `${pkg.name} Decoder`,
        package: packageCode,
        isDefault: false,
      },
    });

    const updatedWallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    return `✅ Cable TV Subscription Successful!

📺 Decoder: ${decoderNumber}
📦 Package: ${pkg.name}
💰 Amount: ₦${pkg.price.toFixed(2)}
🆔 Transaction ID: ${transaction.id.substring(0, 10)}

New Balance: ₦${Number(updatedWallet?.walletBalance || 0).toFixed(2)}

Your subscription has been activated. Enjoy! 🎉`;

  } catch (error) {
    console.error("Cable purchase error:", error);
    return `❌ Failed to process cable subscription. Please try again.`;
  }
}

// ============================================================
// PIN HANDLER
// ============================================================

async function handlePinCommand(user: any, parts: string[]): Promise<string> {
  if (parts.length < 2) {
    return `🔐 To set up your transaction PIN, reply with:
PIN [4-6 digit PIN]

Example: PIN 1234

⚠️ Your PIN will be encrypted and used for transaction verification.`;
  }

  const pin = parts[1];
  if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return `❌ Invalid PIN format. Please use 4-6 digits.
Example: PIN 1234`;
  }

  // Check if user already has a PIN
  if (user.pinHash) {
    return `🔐 You already have a transaction PIN set.
To change your PIN, please use the Bilscore mobile app or website.

${process.env.NEXTAUTH_URL}/profile`;
  }

  // Hash the PIN
  const { hash } = await import('bcrypt');
  const hashedPin = await hash(pin, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pinHash: hashedPin,
      pinAttempts: 0,
      pinLockedUntil: null,
    },
  });

  return `✅ Transaction PIN set successfully!

Your PIN has been encrypted and saved.
You'll need this PIN for all transactions.

🔐 PIN: **** (hidden for security)

Keep your PIN safe and never share it with anyone.

You can change your PIN anytime in the Bilscore app.`;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getHelpMessage(user: any): string {
  return `📖 Bilscore WhatsApp Commands

💰 Financial:
• BALANCE - Check wallet balance
• TRANSACTIONS - View transaction history
• PIN [code] - Set transaction PIN

📱 Airtime:
• AIRTIME [phone] [amount] - Buy airtime
  Example: AIRTIME 08012345678 500

📶 Data:
• DATA [phone] [plan] - Buy data
  Example: DATA 08012345678 1GB

⚡ Electricity:
• ELECTRICITY [meter] [amount] - Buy power
  Example: ELECTRICITY 1234567890 5000

📺 Cable TV:
• CABLE [decoder] [package] - Buy cable
  Example: CABLE 1234567890 PREMIUM

🎯 Referral:
• REFERRAL - Get your referral link
• REF - Short for REFERRAL

❓ Help:
• HELP or ? - Show this message

Need more help? Visit: ${process.env.NEXTAUTH_URL}/support`;
}

async function getTransactionHistory(userId: string): Promise<string> {
  const transactions = await prisma.vtuTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (transactions.length === 0) {
    return `📭 No transactions found.

Start using Bilscore today!
Type "HELP" to see available commands.`;
  }

  let message = `📊 Recent Transactions:\n\n`;
  transactions.forEach((tx, i) => {
    const status = tx.status === "SUCCESS" ? "✅" : "❌";
    const type = tx.transactionType.replace("_", " ");
    message += `${i + 1}. ${status} ${type}\n`;
    message += `   Amount: ₦${Number(tx.amount).toFixed(2)}\n`;
    message += `   ${new Date(tx.createdAt).toLocaleDateString()}\n\n`;
  });

  const total = await prisma.vtuTransaction.count({
    where: { userId },
  });

  message += `📊 Total: ${total} transactions`;
  return message;
}

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

// ============================================================
// TWILIO RESPONSE HELPER
// ============================================================

function sendTwilioResponse(message: string): NextResponse {
  const twiml = new VoiceResponse();
  twiml.message(message);
  
  return new NextResponse(twiml.toString(), {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}