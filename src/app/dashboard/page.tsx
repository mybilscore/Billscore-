// app/dashboard/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { DashboardClient } from "./page.client";

function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

export default async function DashboardPage() {
  console.log("📊 [DASHBOARD] Starting dashboard page load...");
  
  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [DASHBOARD] User authenticated: ${sessionUser.id} (${sessionUser.email})`);

  // Fetch fresh user data from database (including wallet and referral)
  console.log("🔍 [DASHBOARD] Fetching user data with wallet...");
  let user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      wallet: true,
      referredReferrals: {
        include: {
          referee: {
            select: {
              id: true,
              fullName: true,
              email: true,
              isVerified: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    console.error("❌ [DASHBOARD] User not found in database!");
    return null;
  }

  console.log(`✅ [DASHBOARD] User found: ${user.id}`);
  console.log(`📋 [DASHBOARD] User hasWallet flag: ${user.hasWallet}`);
  console.log(`📋 [DASHBOARD] User wallet relation: ${user.wallet ? 'EXISTS' : 'NULL'}`);

  if (user.wallet) {
    console.log(`💰 [DASHBOARD] Wallet found - ID: ${user.wallet.id}, Account: ${user.wallet.accountNumber}, Balance: ${user.wallet.walletBalance}`);
  }

  // Safely get wallet data with Decimal conversion
  let walletBalance = 0;
  let hasWallet = false;
  let accountNumber = "";
  let bankName = "PALMPAY";
  let accountName = "";

  if (user.wallet) {
    console.log("✅ [DASHBOARD] Using existing wallet from relation");
    hasWallet = true;
    walletBalance = Number(user.wallet.walletBalance) || 0;
    accountNumber = user.wallet.accountNumber || "";
    bankName = user.wallet.bankName || "PALMPAY";
    accountName = user.wallet.accountName || user.fullName;
    console.log(`💰 [DASHBOARD] Wallet balance (converted): ${walletBalance}`);
  } else if (user.hasWallet) {
    console.log(`⚠️ [DASHBOARD] hasWallet is TRUE but wallet relation is NULL. Creating wallet...`);
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
      
      console.log(`✅ [DASHBOARD] Wallet created successfully: ${newWallet.id}`);
      console.log(`💰 [DASHBOARD] New wallet account: ${newWallet.accountNumber}`);
      
      hasWallet = true;
      walletBalance = 0;
      accountNumber = newWallet.accountNumber;
      bankName = newWallet.bankName;
      accountName = newWallet.accountName;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });
      console.log(`✅ [DASHBOARD] User hasWallet updated to true`);
      
      // Re-fetch user with wallet
      console.log("🔄 [DASHBOARD] Re-fetching user with wallet...");
      user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: {
          wallet: true,
          referredReferrals: {
            include: {
              referee: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  isVerified: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      }) || user;
      console.log(`✅ [DASHBOARD] Re-fetch complete. Wallet exists: ${user?.wallet ? 'YES' : 'NO'}`);
    } catch (error) {
      console.error("❌ [DASHBOARD] Failed to create wallet:", error);
      hasWallet = false;
      walletBalance = 0;
    }
  } else {
    console.log(`⚠️ [DASHBOARD] User has NO wallet. Creating one...`);
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
      
      console.log(`✅ [DASHBOARD] Wallet created successfully: ${newWallet.id}`);
      console.log(`💰 [DASHBOARD] New wallet account: ${newWallet.accountNumber}`);
      
      hasWallet = true;
      walletBalance = 0;
      accountNumber = newWallet.accountNumber;
      bankName = newWallet.bankName;
      accountName = newWallet.accountName;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });
      console.log(`✅ [DASHBOARD] User hasWallet updated to true`);
    } catch (error) {
      console.error("❌ [DASHBOARD] Failed to create wallet:", error);
      hasWallet = false;
      walletBalance = 0;
    }
  }

  console.log(`📊 [DASHBOARD] Final wallet state: hasWallet=${hasWallet}, balance=${walletBalance}`);

  // Calculate referral stats
  const referralStats = {
    referralCode: user.referralCode || "",
    totalReferrals: user.referredReferrals?.length || 0,
    activeReferrals: user.referredReferrals?.filter((r) => r.status === "COMPLETED").length || 0,
    pendingReferrals: user.referredReferrals?.filter((r) => r.status === "PENDING").length || 0,
    totalEarned: user.referredReferrals?.reduce((sum, r) => sum + Number(r.rewardAmount || 0), 0) || 0,
    conversionRate: user.referredReferrals?.length > 0 
      ? Math.round((user.referredReferrals.filter((r) => r.status === "COMPLETED").length / user.referredReferrals.length) * 100)
      : 0,
    recentReferrals: user.referredReferrals?.slice(0, 5).map((r) => ({
      id: r.id,
      refereeName: r.referee.fullName || "Anonymous User",
      refereeEmail: r.referee.email,
      status: r.status,
      reward: Number(r.rewardAmount) || 0,
      joinedAt: r.referee.createdAt.toISOString(),
    })) || [],
  };

  // Fetch recent transactions with Decimal conversion
  const recentTransactionsRaw = await prisma.vtuTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      transactionType: true,
      amount: true,
      serviceFee: true,
      totalDebited: true,
      status: true,
      createdAt: true,
      product: true,
      phoneNumber: true,
      meterNumber: true,
      network: true,
      vendor: true,
    },
  });

  const recentTransactions = recentTransactionsRaw.map((tx) => ({
    ...tx,
    amount: Number(tx.amount) || 0,
    serviceFee: Number(tx.serviceFee) || 0,
    totalDebited: Number(tx.totalDebited) || 0,
    createdAt: tx.createdAt.toISOString(),
  }));

  // Fetch stats
  const totalTransactions = await prisma.vtuTransaction.count({
    where: { userId: user.id },
  });

  const totalVolume = await prisma.vtuTransaction.aggregate({
    where: { userId: user.id, status: "SUCCESS" },
    _sum: { amount: true },
  });

  const successCount = await prisma.vtuTransaction.count({
    where: { userId: user.id, status: "SUCCESS" },
  });

  const stats = {
    totalTransactions,
    totalVolume: Number(totalVolume._sum.amount) || 0,
    successRate: totalTransactions > 0 ? Math.round((successCount / totalTransactions) * 100) : 0,
  };

  // Quick actions
  const baseActions = [
    { label: "Buy Airtime", icon: "Phone", href: "/dashboard/buy/airtime", description: "Instant airtime top-up" },
    { label: "Buy Data", icon: "Wifi", href: "/dashboard/buy/data", description: "Data bundles for all networks" },
    { label: "Buy Electricity", icon: "Zap", href: "/dashboard/buy/electricity", description: "Instant electricity tokens" },
    { label: "Cable TV", icon: "Tv", href: "/dashboard/buy/cable", description: "DSTV, GOTV, Startimes" },
    { label: "Bulk SMS", icon: "Send", href: "/dashboard/buy/bulk-sms", description: "Send SMS to multiple contacts" },
    { label: "Exams", icon: "GraduationCap", href: "/dashboard/buy/exams", description: "WAEC, NECO, JAMB registration" },
    { label: "Exam Result", icon: "FileText", href: "/dashboard/buy/exam-result", description: "Check exam results" },
  ];

  const agentActions = (user.role === "AGENT" || user.role === "RETAILER")
    ? [{ label: "Bulk Purchase", icon: "Package", href: "/dashboard/bulk", description: "Buy multiple units" }]
    : [];

  const adminActions = (user.role === "ADMIN" || user.role === "SUPER_ADMIN")
    ? [
        { label: "Admin Panel", icon: "Settings", href: "/admin", description: "Manage users, vendors, transactions" },
        { label: "Vendor Health", icon: "Activity", href: "/admin/vendors", description: "Monitor vendor APIs" },
        { label: "Loan Approvals", icon: "FileCheck", href: "/admin/loans", description: "Approve retailer loans" },
      ]
    : [];

  const quickActions = [...baseActions, ...agentActions, ...adminActions];

  // All Decimal values are converted to numbers
  const initialData = {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email || "",
      phone: user.phone,
      role: user.role,
      hasWallet: hasWallet,
      walletBalance: walletBalance,
      referralCode: user.referralCode || "",
    },
    recentTransactions,
    stats,
    quickActions,
    walletFunding: hasWallet ? {
      accountNumber: accountNumber,
      bankName: bankName,
      accountName: accountName,
      charges: "1% capped at ₦50",
    } : undefined,
    referralStats,
  };

  console.log(`📤 [DASHBOARD] Sending data to client: hasWallet=${initialData.user.hasWallet}, balance=${initialData.user.walletBalance}`);
  console.log("✅ [DASHBOARD] Dashboard page load complete!");

  return <DashboardClient initialData={initialData} />;
}