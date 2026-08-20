// app/dashboard/buy/cable/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { CableClient } from "./page.client";

// Helper function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

export default async function CablePage() {
  console.log("📺 [CABLE] Starting cable page load...");
  
  // Get authenticated user from session
  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [CABLE] User authenticated: ${sessionUser.id} (${sessionUser.email})`);

  // Fetch fresh user data from database (including wallet)
  console.log("🔍 [CABLE] Fetching user data with wallet...");
  let user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      wallet: true,
    },
  });

  if (!user) {
    console.error("❌ [CABLE] User not found in database!");
    return null;
  }

  console.log(`✅ [CABLE] User found: ${user.id}`);
  console.log(`📋 [CABLE] User hasWallet flag: ${user.hasWallet}`);
  console.log(`📋 [CABLE] User wallet relation: ${user.wallet ? 'EXISTS' : 'NULL'}`);

  if (user.wallet) {
    console.log(`💰 [CABLE] Wallet found - ID: ${user.wallet.id}, Balance: ${user.wallet.walletBalance}`);
  }

  // Safely get wallet data with Decimal conversion
  let walletBalance = 0;
  let hasWallet = false;
  let accountNumber = "";
  let bankName = "PALMPAY";
  let accountName = "";

  if (user.wallet) {
    console.log("✅ [CABLE] Using existing wallet from relation");
    hasWallet = true;
    walletBalance = Number(user.wallet.walletBalance) || 0;
    accountNumber = user.wallet.accountNumber || "";
    bankName = user.wallet.bankName || "PALMPAY";
    accountName = user.wallet.accountName || user.fullName;
    console.log(`💰 [CABLE] Wallet balance (converted): ${walletBalance}`);
  } else if (user.hasWallet) {
    console.log(`⚠️ [CABLE] hasWallet is TRUE but wallet relation is NULL. Creating wallet...`);
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
      
      console.log(`✅ [CABLE] Wallet created successfully: ${newWallet.id}`);
      console.log(`💰 [CABLE] New wallet account: ${newWallet.accountNumber}`);
      
      hasWallet = true;
      walletBalance = 0;
      accountNumber = newWallet.accountNumber;
      bankName = newWallet.bankName;
      accountName = newWallet.accountName;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });
      console.log(`✅ [CABLE] User hasWallet updated to true`);
      
      console.log("🔄 [CABLE] Re-fetching user with wallet...");
      user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: {
          wallet: true,
        },
      }) || user;
      console.log(`✅ [CABLE] Re-fetch complete. Wallet exists: ${user?.wallet ? 'YES' : 'NO'}`);
    } catch (error) {
      console.error("❌ [CABLE] Failed to create wallet:", error);
      hasWallet = false;
      walletBalance = 0;
    }
  } else {
    console.log(`⚠️ [CABLE] User has NO wallet. Creating one...`);
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
      
      console.log(`✅ [CABLE] Wallet created successfully: ${newWallet.id}`);
      console.log(`💰 [CABLE] New wallet account: ${newWallet.accountNumber}`);
      
      hasWallet = true;
      walletBalance = 0;
      accountNumber = newWallet.accountNumber;
      bankName = newWallet.bankName;
      accountName = newWallet.accountName;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });
      console.log(`✅ [CABLE] User hasWallet updated to true`);
    } catch (error) {
      console.error("❌ [CABLE] Failed to create wallet:", error);
      hasWallet = false;
      walletBalance = 0;
    }
  }

  console.log(`📊 [CABLE] Final wallet state: hasWallet=${hasWallet}, balance=${walletBalance}`);

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

  console.log(`📤 [CABLE] Sending data to client: hasWallet=${userData.hasWallet}, balance=${userData.walletBalance}`);
  console.log("✅ [CABLE] Cable page load complete!");

  return (
    <CableClient
      user={userData}
    />
  );
}