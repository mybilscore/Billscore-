// app/dashboard/buy/airtime/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { AirtimeClient } from "./page.client";

// Helper function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

// Helper function to get network data
const getNetworks = () => {
  return [
    {
      id: "mtn",
      name: "MTN",
      code: "MTN",
      color: "#FFC000",
      logo: "MTN",
      iconPath: "/networks/mtn.jpg",
    },
    {
      id: "glo",
      name: "GLO",
      code: "GLO",
      color: "#00843D",
      logo: "GLO",
      iconPath: "/networks/glo.jpg",
    },
    {
      id: "airtel",
      name: "AIRTEL",
      code: "AIRTEL",
      color: "#ED1B24",
      logo: "AIRTEL",
      iconPath: "/networks/airtel.png",
    },
    {
      id: "9mobile",
      name: "9MOBILE",
      code: "9MOBILE",
      color: "#6C2C7A",
      logo: "9MOBILE",
      iconPath: "/networks/9mobile.jpg",
    },
  ];
};

export default async function AirtimePage() {
  console.log("📱 [AIRTIME] Starting airtime page load...");
  
  // Get authenticated user from session
  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [AIRTIME] User authenticated: ${sessionUser.id} (${sessionUser.email})`);

  // Fetch fresh user data from database (including wallet)
  console.log("🔍 [AIRTIME] Fetching user data with wallet...");
  let user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      wallet: true,
    },
  });

  if (!user) {
    console.error("❌ [AIRTIME] User not found in database!");
    return null;
  }

  console.log(`✅ [AIRTIME] User found: ${user.id}`);
  console.log(`📋 [AIRTIME] User hasWallet flag: ${user.hasWallet}`);
  console.log(`📋 [AIRTIME] User wallet relation: ${user.wallet ? 'EXISTS' : 'NULL'}`);

  if (user.wallet) {
    console.log(`💰 [AIRTIME] Wallet found - ID: ${user.wallet.id}, Balance: ${user.wallet.walletBalance}`);
  }

  // Safely get wallet data with Decimal conversion
  let walletBalance = 0;
  let hasWallet = false;
  let accountNumber = "";
  let bankName = "PALMPAY";
  let accountName = "";

  if (user.wallet) {
    console.log("✅ [AIRTIME] Using existing wallet from relation");
    hasWallet = true;
    walletBalance = Number(user.wallet.walletBalance) || 0;
    accountNumber = user.wallet.accountNumber || "";
    bankName = user.wallet.bankName || "PALMPAY";
    accountName = user.wallet.accountName || user.fullName;
    console.log(`💰 [AIRTIME] Wallet balance (converted): ${walletBalance}`);
  } else if (user.hasWallet) {
    console.log(`⚠️ [AIRTIME] hasWallet is TRUE but wallet relation is NULL. Creating wallet...`);
    // If hasWallet is true but wallet is missing, create it
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
      
      console.log(`✅ [AIRTIME] Wallet created successfully: ${newWallet.id}`);
      console.log(`💰 [AIRTIME] New wallet account: ${newWallet.accountNumber}`);
      
      hasWallet = true;
      walletBalance = 0;
      accountNumber = newWallet.accountNumber;
      bankName = newWallet.bankName;
      accountName = newWallet.accountName;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });
      console.log(`✅ [AIRTIME] User hasWallet updated to true`);
      
      // Re-fetch user with wallet
      console.log("🔄 [AIRTIME] Re-fetching user with wallet...");
      user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: {
          wallet: true,
        },
      }) || user;
      console.log(`✅ [AIRTIME] Re-fetch complete. Wallet exists: ${user?.wallet ? 'YES' : 'NO'}`);
    } catch (error) {
      console.error("❌ [AIRTIME] Failed to create wallet:", error);
      hasWallet = false;
      walletBalance = 0;
    }
  } else {
    console.log(`⚠️ [AIRTIME] User has NO wallet. Creating one...`);
    // User has no wallet at all - create one
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
      
      console.log(`✅ [AIRTIME] Wallet created successfully: ${newWallet.id}`);
      console.log(`💰 [AIRTIME] New wallet account: ${newWallet.accountNumber}`);
      
      hasWallet = true;
      walletBalance = 0;
      accountNumber = newWallet.accountNumber;
      bankName = newWallet.bankName;
      accountName = newWallet.accountName;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });
      console.log(`✅ [AIRTIME] User hasWallet updated to true`);
    } catch (error) {
      console.error("❌ [AIRTIME] Failed to create wallet:", error);
      hasWallet = false;
      walletBalance = 0;
    }
  }

  console.log(`📊 [AIRTIME] Final wallet state: hasWallet=${hasWallet}, balance=${walletBalance}`);

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

  // Get networks and other data
  const networks = getNetworks();
  const recommendedAmounts = [50, 100, 200, 500, 1000, 2000];
  const defaultNetwork = "mtn";

  console.log(`📤 [AIRTIME] Sending data to client: hasWallet=${userData.hasWallet}, balance=${userData.walletBalance}`);
  console.log("✅ [AIRTIME] Airtime page load complete!");

  return (
    <AirtimeClient
      user={userData}
      networks={networks}
      recommendedAmounts={recommendedAmounts}
      defaultNetwork={defaultNetwork}
    />
  );
}