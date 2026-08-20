// app/dashboard/subscriptions/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { SubscriptionClient } from "./page.client";

// Helper function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

// ✅ Fetch DisCos dynamically from VTpass API
async function fetchDiscosFromVTpass(): Promise<any[]> {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction 
      ? "https://vtpass.com/api/service-categories"
      : "https://sandbox.vtpass.com/api/service-categories";
    
    const response = await fetch(baseUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch service categories: ${response.status}`);
      return getFallbackDiscos();
    }

    const data = await response.json();
    
    if (data.response_description === "000" && data.content) {
      const electricityCategory = data.content.find(
        (cat: any) => cat.identifier === "electricity-bill"
      );
      
      if (!electricityCategory) {
        console.warn("Electricity category not found in VTpass response");
        return getFallbackDiscos();
      }

      const isProductionServices = process.env.NODE_ENV === "production";
      const servicesUrl = isProductionServices
        ? "https://vtpass.com/api/services?identifier=electricity-bill"
        : "https://sandbox.vtpass.com/api/services?identifier=electricity-bill";
      
      const servicesResponse = await fetch(servicesUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!servicesResponse.ok) {
        console.warn(`Failed to fetch electricity services: ${servicesResponse.status}`);
        return getFallbackDiscos();
      }

      const servicesData = await servicesResponse.json();
      
      if (servicesData.response_description === "000" && servicesData.content) {
        const discos = servicesData.content.map((service: any) => {
          let code = service.serviceID || "";
          let name = service.name || "";
          code = code.replace("-electric", "").toUpperCase();
          const displayName = name.replace(" Payment", "").replace(" Distribution Company", "").replace("Electricity", "").trim();
          
          let region = "Nigeria";
          if (name.includes("Abuja")) region = "FCT";
          else if (name.includes("Ikeja") || name.includes("Lagos") || name.includes("Eko")) region = "Lagos";
          else if (name.includes("Kano")) region = "Kano";
          else if (name.includes("Port Harcourt")) region = "Rivers";
          else if (name.includes("Jos")) region = "Plateau";
          else if (name.includes("Ibadan")) region = "Oyo";
          else if (name.includes("Kaduna")) region = "Kaduna";
          else if (name.includes("Benin")) region = "Edo";
          else if (name.includes("Enugu")) region = "Enugu";
          
          const logoMap: Record<string, string> = {
            "IKEJA": "⚡",
            "EKO": "🔌",
            "ABUJA": "💡",
            "KANO": "🔋",
            "PHCN": "⚡",
            "IBADAN": "💡",
            "BENIN": "🔌",
            "ENUGU": "💡",
            "JOS": "⚡",
            "PORT_HARCOURT": "💡",
            "KADUNA": "🔌",
            "DEFAULT": "⚡",
          };
          
          const colorMap: Record<string, string> = {
            "IKEJA": "#FF6B00",
            "EKO": "#00A3E0",
            "ABUJA": "#8B0000",
            "KANO": "#008000",
            "PHCN": "#FFD700",
            "IBADAN": "#FF4500",
            "BENIN": "#4B0082",
            "ENUGU": "#8B4513",
            "JOS": "#8B4513",
            "PORT_HARCOURT": "#FFD700",
            "KADUNA": "#4B0082",
            "DEFAULT": "#1e293b",
          };

          const meterTypes = ["Prepaid", "Postpaid"];
          
          return {
            id: code.toLowerCase(),
            name: displayName || code,
            code: code,
            region: region,
            logo: logoMap[code] || logoMap["DEFAULT"],
            color: colorMap[code] || colorMap["DEFAULT"],
            meterTypes: meterTypes,
            serviceID: service.serviceID,
            discoId: Math.floor(Math.random() * 100) + 1,
            isFromVTpass: true,
          };
        });

        const validDiscos = discos
          .filter((d: any) => d.code && d.code.length > 1)
          .sort((a: any, b: any) => a.name.localeCompare(b.name));

        console.log(`✅ [VTpass] Fetched ${validDiscos.length} DisCos from API`);
        return validDiscos;
      }
    }

    console.warn("Failed to parse VTpass response, using fallback discos");
    return getFallbackDiscos();
  } catch (error) {
    console.error("❌ Error fetching DisCos from VTpass:", error);
    return getFallbackDiscos();
  }
}

// ✅ Fallback DisCos
function getFallbackDiscos() {
  return [
    {
      id: "ikeja",
      name: "Ikeja Electric",
      code: "IKEJA",
      region: "Lagos",
      logo: "⚡",
      color: "#FF6B00",
      meterTypes: ["Prepaid", "Postpaid"],
      discoId: 1,
      isFromVTpass: false,
      serviceID: "ikeja-electric",
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
      isFromVTpass: false,
      serviceID: "eko-electric",
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
      isFromVTpass: false,
      serviceID: "abuja-electric",
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
      isFromVTpass: false,
      serviceID: "kano-electric",
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
      isFromVTpass: false,
      serviceID: "portharcourt-electric",
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
      isFromVTpass: false,
      serviceID: "jos-electric",
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
      isFromVTpass: false,
      serviceID: "ibadan-electric",
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
      isFromVTpass: false,
      serviceID: "kaduna-electric",
    },
  ];
}

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

  // ✅ Fetch DisCos dynamically from VTpass
  console.log("📡 [SUBSCRIPTION] Fetching DisCos from VTpass API...");
  const discos = await fetchDiscosFromVTpass();
  console.log(`✅ [SUBSCRIPTION] Loaded ${discos.length} DisCos`);

  // Saved meters from database
  const savedMeters = [
    { id: "m1", meterNumber: "12345678901", disco: "IKEJA", name: "Home Meter", meterType: "Prepaid", isDefault: false },
    { id: "m2", meterNumber: "98765432109", disco: "EKO", name: "Office Meter", meterType: "Postpaid", isDefault: false },
  ];

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
      discos={discos}
      recommendedAmounts={recommendedAmounts}
      initialPreOrders={preOrders}
    />
  );
}