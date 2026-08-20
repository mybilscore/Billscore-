// app/dashboard/buy/data/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { DataClient } from "./page.client";

// Helper function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

// ✅ Fetch plans from active vendor - FIXED API URL
async function fetchActiveVendorPlans() {
  try {
    // ✅ Remove /api from the URL since it's already in NEXT_PUBLIC_API_URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const url = `${apiUrl}/vendors/plans`;  // 
    console.log(`📊 [DATA] Fetching plans from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Failed to fetch plans: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`📊 [DATA] API Response success: ${data.success}, plans: ${data.data?.plans?.length || 0}`);
    
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching plans:', error);
    return null;
  }
}

export default async function DataPage() {
  console.log("📱 [DATA] Starting data page load...");
  
  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [DATA] User authenticated: ${sessionUser.id}`);

  let user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: { wallet: true },
  });

  if (!user) {
    console.error("❌ [DATA] User not found!");
    return null;
  }

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

  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email || "",
    phone: user.phone,
    role: user.role,
    hasWallet: hasWallet,
    walletBalance: walletBalance,
  };

  // ✅ Fetch plans from database
  const plansData = await fetchActiveVendorPlans();
  
  // ✅ Extract providers from the response
  let providers = plansData?.plans || [];
  let networks = plansData?.networks || [];
  let vendorInfo = plansData?.vendor || null;

  // ✅ If no providers from API, use the admin endpoint as fallback
  if (providers.length === 0) {
    console.log('⚠️ [DATA] No providers from /vendors/plans, trying admin endpoint...');
    
    try {
      // Try the admin endpoint which we know works
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const vendorService = await prisma.vendorService.findFirst({
        where: {
          serviceType: "DATA",
          isActive: true,
        },
        include: {
          vendor: true,
        },
        orderBy: {
          priority: 'asc',
        },
      });

      if (vendorService) {
        const plans = await prisma.dataPlan.findMany({
          where: {
            vendorId: vendorService.vendorId,
            isActive: true,
            status: "ACTIVE",
          },
          orderBy: [
            { network: 'asc' },
            { planType: 'asc' },
            { amountMB: 'asc' },
          ],
          include: {
            networkConfig: true,
          },
        });

        if (plans.length > 0) {
          // Group plans manually
          const groupedPlans: Record<string, any> = {};
          
          for (const plan of plans) {
            const networkKey = plan.network;
            if (!groupedPlans[networkKey]) {
              groupedPlans[networkKey] = {
                id: networkKey.toLowerCase(),
                name: plan.networkConfig?.displayName || networkKey,
                code: plan.networkConfig?.code || networkKey,
                color: plan.networkConfig?.color || '#000000',
                iconPath: plan.networkConfig?.logo || `/networks/${networkKey.toLowerCase()}.jpg`,
                categories: {},
              };
            }

            const planTypeKey = plan.planType;
            if (!groupedPlans[networkKey].categories[planTypeKey]) {
              groupedPlans[networkKey].categories[planTypeKey] = {
                id: planTypeKey.toLowerCase(),
                name: planTypeKey,
                plans: [],
              };
            }

            groupedPlans[networkKey].categories[planTypeKey].plans.push({
              id: plan.id,
              name: plan.name,
              data: plan.amountMB >= 1024 
                ? `${(plan.amountMB / 1024).toFixed(1)}GB` 
                : `${plan.amountMB}MB`,
              price: Number(plan.ourPrice),
              validity: `${plan.validity} ${plan.validityUnit}`.toLowerCase(),
              planCode: plan.vendorPlanId,
              vendorPrice: Number(plan.vendorPrice),
              description: plan.description,
              amountMB: plan.amountMB,
            });
          }

          // Convert to array format
          providers = Object.keys(groupedPlans).map((key) => ({
            ...groupedPlans[key],
            categories: Object.keys(groupedPlans[key].categories).map((catKey) => ({
              id: catKey.toLowerCase(),
              name: catKey,
              plans: groupedPlans[key].categories[catKey].plans,
            })),
          }));

          // Get networks
          const networkConfigs = await prisma.networkConfig.findMany({
            where: { isActive: true },
            orderBy: { priority: 'asc' },
          });
          networks = networkConfigs.map(n => ({
            id: n.id,
            name: n.displayName,
            code: n.code,
            color: n.color,
            logo: n.logo,
            network: n.network,
          }));

          vendorInfo = {
            id: vendorService.vendor.id,
            name: vendorService.vendor.name,
            code: vendorService.vendor.code,
          };

          console.log(`✅ [DATA] Fallback: Found ${providers.length} providers with ${plans.length} plans`);
        }
      }
    } catch (error) {
      console.error('❌ [DATA] Fallback error:', error);
    }
  }

  const defaultProvider = providers.length > 0 ? providers[0].id : "mtn";

  console.log(`📤 [DATA] Providers loaded: ${providers.length}`);
  console.log(`📤 [DATA] Networks loaded: ${networks.length}`);
  console.log(`📤 [DATA] Vendor: ${vendorInfo?.name || 'None'}`);
  console.log("✅ [DATA] Data page load complete!");

  return (
    <DataClient
      user={userData}
      providers={providers}
      defaultProvider={defaultProvider}
      vendorInfo={vendorInfo}
      networks={networks}
    />
  );
}