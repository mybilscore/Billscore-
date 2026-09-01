// app/dashboard/buy/electricity/page.tsx - Complete updated with all DisCos

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { ElectricityClient } from "./page.client";
import { VtuType, VendorStatus } from "@prisma/client";

// Helper function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

// ✅ Complete BilalSada Native Discos - With correct discoId values (1-11)
// Based on BilalSada's API documentation
const BILAL_SADA_DISCOS = [
  {
    id: "ikeja",
    name: "Ikeja Electric",
    code: "IKEJA",
    displayName: "Ikeja Electric (IE)",
    region: "Lagos",
    logo: "⚡",
    color: "#FF6B00",
    meterTypes: ["Prepaid", "Postpaid"],
    serviceID: "ikeja-electric",
    discoId: 1,
  },
  {
    id: "eko",
    name: "Eko Electric",
    code: "EKO",
    displayName: "Eko Electric (EKEDC)",
    region: "Lagos",
    logo: "🔌",
    color: "#00A3E0",
    meterTypes: ["Prepaid", "Postpaid"],
    serviceID: "eko-electric",
    discoId: 2,
  },
  {
    id: "abuja",
    name: "Abuja Electricity",
    code: "ABUJA",
    displayName: "Abuja Electricity (AEDC)",
    region: "FCT",
    logo: "💡",
    color: "#8B0000",
    meterTypes: ["Prepaid", "Postpaid"],
    serviceID: "abuja-electric",
    discoId: 8,
  },
  {
    id: "portharcourt",
    name: "Port Harcourt Electric",
    code: "PORTHARCOURT",
    displayName: "Port Harcourt Electric (PHED)",
    region: "Rivers",
    logo: "💡",
    color: "#FFD700",
    meterTypes: ["Prepaid", "Postpaid"],
    serviceID: "portharcourt-electric",
    discoId: 4,
  },
  {
    id: "jos",
    name: "Jos Electric",
    code: "JOS",
    displayName: "Jos Electric (JED)",
    region: "Plateau",
    logo: "⚡",
    color: "#8B4513",
    meterTypes: ["Prepaid"],
    serviceID: "jos-electric",
    discoId: 5,
  },
  {
    id: "kano",
    name: "Kano Electric",
    code: "KANO",
    displayName: "Kano Electric (KEDCO)",
    region: "Kano",
    logo: "🔋",
    color: "#008000",
    meterTypes: ["Prepaid"],
    serviceID: "kano-electric",
    discoId: 3,
  },
  {
    id: "ibadan",
    name: "Ibadan Electric",
    code: "IBADAN",
    displayName: "Ibadan Electric (IBEDC)",
    region: "Oyo",
    logo: "💡",
    color: "#FF4500",
    meterTypes: ["Prepaid"],
    serviceID: "ibadan-electric",
    discoId: 6,
  },
  {
    id: "kaduna",
    name: "Kaduna Electric",
    code: "KADUNA",
    displayName: "Kaduna Electric (KAEDCO)",
    region: "Kaduna",
    logo: "🔌",
    color: "#4B0082",
    meterTypes: ["Prepaid"],
    serviceID: "kaduna-electric",
    discoId: 7,
  },
  {
    id: "benin",
    name: "Benin Electric",
    code: "BENIN",
    displayName: "Benin Electric (BEDC)",
    region: "Edo",
    logo: "⚡",
    color: "#FF6B00",
    meterTypes: ["Prepaid", "Postpaid"],
    serviceID: "benin-electric",
    discoId: 9,
  },
  {
    id: "enugu",
    name: "Enugu Electric",
    code: "ENUGU",
    displayName: "Enugu Electric (EEDC)",
    region: "Enugu",
    logo: "💡",
    color: "#2E7D32",
    meterTypes: ["Prepaid", "Postpaid"],
    serviceID: "enugu-electric",
    discoId: 10,
  },
  {
    id: "yola",
    name: "Yola Electric",
    code: "YOLA",
    displayName: "Yola Electric (YEDC)",
    region: "Adamawa",
    logo: "🔌",
    color: "#4A148C",
    meterTypes: ["Prepaid"],
    serviceID: "yola-electric",
    discoId: 11,
  },
];

// ✅ Complete VTpass Discos - With all available DisCos
// Based on VTpass documentation
const VTPASS_DISCOS = [
  {
    id: "abuja",
    name: "Abuja Electricity",
    code: "ABUJA",
    displayName: "Abuja Electricity (AEDC)",
    region: "FCT",
    logo: "💡",
    color: "#8B0000",
    meterTypes: ["Prepaid", "Postpaid"],
    serviceID: "abuja-electric",
    discoId: "abuja-electric",
  },
  {
    id: "eko",
    name: "Eko Electric",
    code: "EKO",
    displayName: "Eko Electric (EKEDC)",
    region: "Lagos",
    logo: "🔌",
    color: "#00A3E0",
    meterTypes: ["Prepaid", "Postpaid"],
    serviceID: "eko-electric",
    discoId: "eko-electric",
  },
  {
    id: "ikeja",
    name: "Ikeja Electric",
    code: "IKEJA",
    displayName: "Ikeja Electric (IE)",
    region: "Lagos",
    logo: "⚡",
    color: "#FF6B00",
    meterTypes: ["Prepaid", "Postpaid"],
    serviceID: "ikeja-electric",
    discoId: "ikeja-electric",
  },
  {
    id: "ibadan",
    name: "Ibadan Electric",
    code: "IBADAN",
    displayName: "Ibadan Electric (IBEDC)",
    region: "Oyo",
    logo: "💡",
    color: "#FF4500",
    meterTypes: ["Prepaid"],
    serviceID: "ibadan-electric",
    discoId: "ibadan-electric",
  },
  {
    id: "kaduna",
    name: "Kaduna Electric",
    code: "KADUNA",
    displayName: "Kaduna Electric (KAEDCO)",
    region: "Kaduna",
    logo: "🔌",
    color: "#4B0082",
    meterTypes: ["Prepaid"],
    serviceID: "kaduna-electric",
    discoId: "kaduna-electric",
  },
  {
    id: "kano",
    name: "Kano Electric",
    code: "KANO",
    displayName: "Kano Electric (KEDCO)",
    region: "Kano",
    logo: "🔋",
    color: "#008000",
    meterTypes: ["Prepaid"],
    serviceID: "kano-electric",
    discoId: "kano-electric",
  },
  {
    id: "portharcourt",
    name: "Port Harcourt Electric",
    code: "PORTHARCOURT",
    displayName: "Port Harcourt Electric (PHED)",
    region: "Rivers",
    logo: "💡",
    color: "#FFD700",
    meterTypes: ["Prepaid", "Postpaid"],
    serviceID: "portharcourt-electric",
    discoId: "portharcourt-electric",
  },
  {
    id: "jos",
    name: "Jos Electric",
    code: "JOS",
    displayName: "Jos Electric (JED)",
    region: "Plateau",
    logo: "⚡",
    color: "#8B4513",
    meterTypes: ["Prepaid"],
    serviceID: "jos-electric",
    discoId: "jos-electric",
  },
  {
    id: "benin",
    name: "Benin Electric",
    code: "BENIN",
    displayName: "Benin Electric (BEDC)",
    region: "Edo",
    logo: "⚡",
    color: "#FF6B00",
    meterTypes: ["Prepaid", "Postpaid"],
    serviceID: "benin-electric",
    discoId: "benin-electric",
  },
  {
    id: "enugu",
    name: "Enugu Electric",
    code: "ENUGU",
    displayName: "Enugu Electric (EEDC)",
    region: "Enugu",
    logo: "💡",
    color: "#2E7D32",
    meterTypes: ["Prepaid", "Postpaid"],
    serviceID: "enugu-electric",
    discoId: "enugu-electric",
  },
  {
    id: "yola",
    name: "Yola Electric",
    code: "YOLA",
    displayName: "Yola Electric (YEDC)",
    region: "Adamawa",
    logo: "🔌",
    color: "#4A148C",
    meterTypes: ["Prepaid"],
    serviceID: "yola-electric",
    discoId: "yola-electric",
  },
];

// ✅ Get the active vendor for electricity
async function getActiveVendor() {
  const vendor = await prisma.vendor.findFirst({
    where: {
      status: VendorStatus.ACTIVE,
      services: {
        some: {
          serviceType: VtuType.ELECTRICITY_INSTANT,
          isActive: true,
        },
      },
    },
    orderBy: { priority: 'asc' },
  });
  return vendor;
}

// ✅ Get Discos based on active vendor
async function getDiscosForElectricity() {
  try {
    const activeVendor = await getActiveVendor();
    
    console.log(`🔍 [Electricity] Active vendor for electricity: ${activeVendor?.code || 'None'}`);

    // ✅ If BilalSada is active, return BilalSada Discos
    if (activeVendor?.code === 'BILAL_SADA') {
      console.log(`✅ [Electricity] Using BilalSada Discos (${BILAL_SADA_DISCOS.length})`);
      return BILAL_SADA_DISCOS;
    }

    // ✅ If VTpass is active, return VTpass Discos
    if (activeVendor?.code === 'VTPASS') {
      console.log(`✅ [Electricity] Using VTpass Discos (${VTPASS_DISCOS.length})`);
      return VTPASS_DISCOS;
    }

    // ✅ Fallback to BilalSada Discos
    console.log(`⚠️ [Electricity] No active vendor, using BilalSada Discos as fallback`);
    return BILAL_SADA_DISCOS;
    
  } catch (error) {
    console.error('❌ [Electricity] Error getting discos:', error);
    return BILAL_SADA_DISCOS;
  }
}

export default async function ElectricityPage() {
  console.log("⚡ [ELECTRICITY] Starting electricity page load...");
  
  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [ELECTRICITY] User authenticated: ${sessionUser.id}`);

  console.log("🔍 [ELECTRICITY] Fetching user data with wallet...");
  let user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      wallet: true,
    },
  });

  if (!user) {
    console.error("❌ [ELECTRICITY] User not found in database!");
    return null;
  }

  console.log(`✅ [ELECTRICITY] User found: ${user.id}`);
  console.log(`📋 [ELECTRICITY] User hasWallet flag: ${user.hasWallet}`);
  console.log(`📋 [ELECTRICITY] User wallet relation: ${user.wallet ? 'EXISTS' : 'NULL'}`);

  if (user.wallet) {
    console.log(`💰 [ELECTRICITY] Wallet found - ID: ${user.wallet.id}, Balance: ${user.wallet.walletBalance}`);
  }

  let walletBalance = 0;
  let hasWallet = false;
  let accountNumber = "";
  let bankName = "PALMPAY";
  let accountName = "";

  if (user.wallet) {
    console.log("✅ [ELECTRICITY] Using existing wallet from relation");
    hasWallet = true;
    walletBalance = Number(user.wallet.walletBalance) || 0;
    accountNumber = user.wallet.accountNumber || "";
    bankName = user.wallet.bankName || "PALMPAY";
    accountName = user.wallet.accountName || user.fullName;
    console.log(`💰 [ELECTRICITY] Wallet balance (converted): ${walletBalance}`);
  } else if (user.hasWallet) {
    console.log(`⚠️ [ELECTRICITY] hasWallet is TRUE but wallet relation is NULL. Creating wallet...`);
    try {
      const newWallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          accountNumber: generateVirtualAccountNumber(),
          bankName: "PALMPAY",
          accountName: user.fullName,
          walletBalance: 0,
          ledgerBalance: 0,
          currency: "NGN",
          isActive: true,
          kycLevel: 1,
        },
      });
      
      console.log(`✅ [ELECTRICITY] Wallet created successfully: ${newWallet.id}`);
      console.log(`💰 [ELECTRICITY] New wallet account: ${newWallet.accountNumber}`);
      
      hasWallet = true;
      walletBalance = 0;
      accountNumber = newWallet.accountNumber;
      bankName = newWallet.bankName;
      accountName = newWallet.accountName;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });
      console.log(`✅ [ELECTRICITY] User hasWallet updated to true`);
      
      console.log("🔄 [ELECTRICITY] Re-fetching user with wallet...");
      user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: {
          wallet: true,
        },
      }) || user;
      console.log(`✅ [ELECTRICITY] Re-fetch complete. Wallet exists: ${user?.wallet ? 'YES' : 'NO'}`);
    } catch (error) {
      console.error("❌ [ELECTRICITY] Failed to create wallet:", error);
      hasWallet = false;
      walletBalance = 0;
    }
  } else {
    console.log(`⚠️ [ELECTRICITY] User has NO wallet. Creating one...`);
    try {
      const newWallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          accountNumber: generateVirtualAccountNumber(),
          bankName: "PALMPAY",
          accountName: user.fullName,
          walletBalance: 0,
          ledgerBalance: 0,
          currency: "NGN",
          isActive: true,
          kycLevel: 1,
        },
      });
      
      console.log(`✅ [ELECTRICITY] Wallet created successfully: ${newWallet.id}`);
      console.log(`💰 [ELECTRICITY] New wallet account: ${newWallet.accountNumber}`);
      
      hasWallet = true;
      walletBalance = 0;
      accountNumber = newWallet.accountNumber;
      bankName = newWallet.bankName;
      accountName = newWallet.accountName;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });
      console.log(`✅ [ELECTRICITY] User hasWallet updated to true`);
    } catch (error) {
      console.error("❌ [ELECTRICITY] Failed to create wallet:", error);
      hasWallet = false;
      walletBalance = 0;
    }
  }

  console.log(`📊 [ELECTRICITY] Final wallet state: hasWallet=${hasWallet}, balance=${walletBalance}`);

  // ✅ Get Discos based on active vendor
  console.log("📡 [ELECTRICITY] Getting Discos based on active vendor...");
  let discos = await getDiscosForElectricity();
  
  // ✅ Log the disco IDs for debugging
  console.log(`📋 [ELECTRICITY] Loaded ${discos.length} DisCos`);
  console.log(`📋 [ELECTRICITY] Disco IDs:`, discos.map(d => ({
    name: d.name,
    displayName: d.displayName,
    code: d.code,
    discoId: d.discoId,
  })));

  // Prepare user data for the client
  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email || "",
    phone: user.phone,
    role: user.role,
    hasWallet: hasWallet,
    walletBalance: walletBalance,
  };

  const recommendedAmounts = [
    { label: "₦1,000", value: 1000 },
    { label: "₦2,000", value: 2000 },
    { label: "₦5,000", value: 5000 },
    { label: "₦10,000", value: 10000 },
    { label: "₦20,000", value: 20000 },
    { label: "₦50,000", value: 50000 },
  ];

  console.log(`📤 [ELECTRICITY] Sending data to client: hasWallet=${userData.hasWallet}, balance=${userData.walletBalance}`);
  console.log("✅ [ELECTRICITY] Electricity page load complete!");

  return (
    <ElectricityClient
      user={userData}
      discos={discos}
      recommendedAmounts={recommendedAmounts}
    />
  );
}