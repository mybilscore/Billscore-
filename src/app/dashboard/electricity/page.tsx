// app/dashboard/buy/electricity/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { ElectricityClient } from "./page.client";

// Helper function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

// Helper function to get DisCo data
const getDiscos = () => {
  return [
    {
      id: "ikeja",
      name: "Ikeja Electric",
      code: "IKEJA",
      region: "Lagos",
      logo: "⚡",
      color: "#FF6B00",
      meterTypes: ["Prepaid", "Postpaid"],
      discoId: 1, // LegitDataway ID
    },
    {
      id: "eko",
      name: "Eko Electric",
      code: "EKO",
      region: "Lagos",
      logo: "🔌",
      color: "#00A3E0",
      meterTypes: ["Prepaid", "Postpaid"],
      discoId: 2,
    },
    {
      id: "kano",
      name: "Kano Electric",
      code: "KANO",
      region: "Kano",
      logo: "🔋",
      color: "#008000",
      meterTypes: ["Prepaid"],
      discoId: 3,
    },
    {
      id: "portharcourt",
      name: "Port Harcourt Electric",
      code: "PORTHARCOURT",
      region: "Rivers",
      logo: "💡",
      color: "#FFD700",
      meterTypes: ["Prepaid", "Postpaid"],
      discoId: 4,
    },
    {
      id: "jos",
      name: "Jos Electric",
      code: "JOS",
      region: "Plateau",
      logo: "⚡",
      color: "#8B4513",
      meterTypes: ["Prepaid"],
      discoId: 5,
    },
    {
      id: "ibadan",
      name: "Ibadan Electric",
      code: "IBADAN",
      region: "Oyo",
      logo: "💡",
      color: "#FF4500",
      meterTypes: ["Prepaid"],
      discoId: 6,
    },
    {
      id: "kaduna",
      name: "Kaduna Electric",
      code: "KADUNA",
      region: "Kaduna",
      logo: "🔌",
      color: "#4B0082",
      meterTypes: ["Prepaid"],
      discoId: 7,
    },
    {
      id: "abuja",
      name: "Abuja Electric",
      code: "ABUJA",
      region: "FCT",
      logo: "💡",
      color: "#8B0000",
      meterTypes: ["Prepaid", "Postpaid"],
      discoId: 8,
    },
  ];
};

export default async function ElectricityPage() {
  console.log("⚡ [ELECTRICITY] Starting electricity page load...");
  
  // Get authenticated user from session
  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [ELECTRICITY] User authenticated: ${sessionUser.id} (${sessionUser.email})`);

  // Fetch fresh user data from database (including wallet)
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

  // Safely get wallet data with Decimal conversion
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

  // Get discos and recommended amounts
  const discos = getDiscos();
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