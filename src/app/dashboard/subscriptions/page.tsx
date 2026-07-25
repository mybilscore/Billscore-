// app/dashboard/subscriptions/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { SubscriptionClient } from "./page.client";

// Helper function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

// Helper function to get DisCos
const getDiscos = () => {
  return [
    { id: "ikeja", name: "Ikeja Electric", code: "IKEJA", discoId: 1 },
    { id: "eko", name: "Eko Electric", code: "EKO", discoId: 2 },
    { id: "abuja", name: "Abuja Electric", code: "ABUJA", discoId: 8 },
    { id: "kano", name: "Kano Electric", code: "KANO", discoId: 3 },
    { id: "phcn", name: "PHCN", code: "PHCN", discoId: 4 },
    { id: "ibadan", name: "Ibadan Electric", code: "IBADAN", discoId: 6 },
    { id: "benin", name: "Benin Electric", code: "BENIN", discoId: 7 },
    { id: "enugu", name: "Enugu Electric", code: "ENUGU", discoId: 9 },
    { id: "jos", name: "Jos Electric", code: "JOS", discoId: 5 },
  ];
};

// Helper function to get Cable Providers
const getCableProviders = () => {
  return [
    { id: "dstv", name: "DSTV", code: "DSTV" },
    { id: "gotv", name: "GOTV", code: "GOTV" },
    { id: "startimes", name: "Startimes", code: "STARTIMES" },
  ];
};

export default async function SubscriptionPage() {
  console.log("🔄 [SUBSCRIPTION] Starting subscriptions page load...");
  
  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [SUBSCRIPTION] User authenticated: ${sessionUser.id}`);

  let user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      wallet: true,
      preOrders: {
        where: {
          status: { in: ["PENDING", "PROCESSING", "PURCHASED"] },
        },
        orderBy: { deliveryDate: "asc" },
      },
      subscriptions: {
        where: { isActive: true },
        orderBy: { nextRenewalDate: "asc" },
      },
    },
  });

  if (!user) {
    console.error("❌ [SUBSCRIPTION] User not found!");
    return null;
  }

  // Wallet handling
  let walletBalance = 0;
  let hasWallet = false;
  let accountNumber = "";
  let bankName = "PALMPAY";
  let accountName = "";

  if (user.wallet) {
    hasWallet = true;
    walletBalance = Number(user.wallet.walletBalance) || 0;
    accountNumber = user.wallet.accountNumber || "";
    bankName = user.wallet.bankName || "PALMPAY";
    accountName = user.wallet.accountName || user.fullName;
  } else if (user.hasWallet) {
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
      
      hasWallet = true;
      walletBalance = 0;
      accountNumber = newWallet.accountNumber;
      bankName = newWallet.bankName;
      accountName = newWallet.accountName;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });
      
      user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: {
          wallet: true,
          preOrders: {
            where: {
              status: { in: ["PENDING", "PROCESSING", "PURCHASED"] },
            },
            orderBy: { deliveryDate: "asc" },
          },
          subscriptions: {
            where: { isActive: true },
            orderBy: { nextRenewalDate: "asc" },
          },
        },
      }) || user;
    } catch (error) {
      console.error("❌ Failed to create wallet:", error);
      hasWallet = false;
      walletBalance = 0;
    }
  } else {
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
      
      hasWallet = true;
      walletBalance = 0;
      accountNumber = newWallet.accountNumber;
      bankName = newWallet.bankName;
      accountName = newWallet.accountName;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });
    } catch (error) {
      console.error("❌ Failed to create wallet:", error);
      hasWallet = false;
      walletBalance = 0;
    }
  }

  // Saved meters from database (in production, these would be stored in a SavedMeter table)
  const savedMeters = [
    { id: "m1", meterNumber: "12345678901", disco: "IKEJA", name: "Home Meter", type: "Prepaid" },
    { id: "m2", meterNumber: "98765432109", disco: "EKO", name: "Office Meter", type: "Postpaid" },
  ];

  const savedDecoders = [
    { id: "d1", decoderNumber: "1234567890", provider: "DSTV", name: "Home Decoder", package: "Premium" },
    { id: "d2", decoderNumber: "0987654321", provider: "GOTV", name: "Office Decoder", package: "Plus" },
  ];

  const discos = getDiscos();
  const cableProviders = getCableProviders();
  const recommendedAmounts = [
    { label: "₦1,000", value: 1000 },
    { label: "₦2,000", value: 2000 },
    { label: "₦5,000", value: 5000 },
    { label: "₦10,000", value: 10000 },
    { label: "₦20,000", value: 20000 },
    { label: "₦50,000", value: 50000 },
  ];

  const preOrders = (user.preOrders || []).map((order) => ({
    id: order.id,
    meterNumber: order.meterNumber,
    disco: order.disco,
    amount: Number(order.amount),
    deliveryDate: order.deliveryDate.toISOString(),
    status: order.status,
    type: "ELECTRICITY" as const,
  }));

  const subscriptions = (user.subscriptions || []).map((sub) => ({
    id: sub.id,
    meterNumber: sub.meterNumber || "",
    decoderNumber: sub.decoderNumber || "",
    disco: sub.disCo || "",
    provider: sub.decoderType || "",
    amount: Number(sub.amount),
    renewalDay: sub.renewalDay,
    nextRenewalDate: sub.nextRenewalDate.toISOString(),
    type: sub.type as "ELECTRICITY" | "CABLE_TV",
  }));

  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email || "",
    phone: user.phone,
    role: user.role,
    hasWallet: hasWallet,
    walletBalance: walletBalance,
  };

  console.log(`📤 [SUBSCRIPTION] Sending data to client: hasWallet=${userData.hasWallet}, balance=${userData.walletBalance}`);
  console.log("✅ [SUBSCRIPTION] Subscriptions page load complete!");

  return (
    <SubscriptionClient
      user={userData}
      savedMeters={savedMeters}
      savedDecoders={savedDecoders}
      discos={discos}
      cableProviders={cableProviders}
      recommendedAmounts={recommendedAmounts}
      initialPreOrders={preOrders}
      initialSubscriptions={subscriptions}
    />
  );
}