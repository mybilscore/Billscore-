// app/dashboard/buy/data/page.tsx
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { DataClient } from "./page.client";

// Helper function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

// ✅ Map plan to category based on validity (same as API route)
function getPlanCategory(plan: any): string {
  // If plan has explicit category, use it
  if (plan.category) {
    return plan.category;
  }

  // If planType is SME, keep as SME
  if (plan.planType?.toUpperCase() === 'SME') {
    return 'SME';
  }

  // For GIFTING or other types, determine by validity
  const validity = plan.validity || 0;
  const unit = plan.validityUnit?.toUpperCase() || 'DAYS';

  // Map based on validity duration
  if (unit === 'HOURS' || unit === 'MINUTES') {
    return 'Hourly';
  }
  
  if (unit === 'DAYS') {
    if (validity <= 1) return 'Daily';
    if (validity <= 7) return 'Weekly';
    if (validity <= 30) return 'Monthly';
    if (validity <= 60) return '2 Monthly';
    if (validity <= 365) return 'Yearly';
    return 'Monthly';
  }
  
  if (unit === 'MONTHS') {
    if (validity <= 1) return 'Monthly';
    if (validity <= 2) return '2 Monthly';
    if (validity <= 12) return 'Yearly';
    return 'Monthly';
  }
  
  if (unit === 'YEARS') {
    if (validity <= 1) return 'Yearly';
    return 'Yearly';
  }

  return 'Monthly';
}

// ✅ Sort categories in specific order
function sortCategories(categories: any[]) {
  const order: Record<string, number> = {
    'SME': 0,
    'Daily': 1,
    'Weekly': 2,
    'Monthly': 3,
    '2 Monthly': 4,
    'Yearly': 5,
    'Gifting': 6,
    'Hourly': 7,
  };

  return categories.sort((a, b) => {
    const aOrder = order[a.name] ?? 99;
    const bOrder = order[b.name] ?? 99;
    return aOrder - bOrder;
  });
}

// ✅ Fetch plans from active vendor
async function fetchActiveVendorPlans() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const url = `${apiUrl}/vendors/plans`;
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

  // ✅ Fetch plans from API
  const plansData = await fetchActiveVendorPlans();
  
  // ✅ Extract providers from the response
  let providers = plansData?.plans || [];
  let networks = plansData?.networks || [];
  let vendorInfo = plansData?.vendor || null;

  // ✅ Fallback: If no providers from API, query database directly
  if (providers.length === 0) {
    console.log('⚠️ [DATA] No providers from /vendors/plans, trying direct database...');
    
    try {
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
            { amountMB: 'asc' },
          ],
          include: {
            networkConfig: true,
          },
        });

        if (plans.length > 0) {
          const groupedByNetwork: Record<string, any> = {};
          
          for (const plan of plans) {
            const networkKey = plan.network;
            if (!groupedByNetwork[networkKey]) {
              groupedByNetwork[networkKey] = {
                id: networkKey.toLowerCase(),
                name: plan.networkConfig?.displayName || networkKey,
                code: plan.networkConfig?.code || networkKey,
                color: plan.networkConfig?.color || '#000000',
                iconPath: plan.networkConfig?.logo || `/networks/${networkKey.toLowerCase()}.jpg`,
                categories: {},
              };
            }

            // ✅ Determine category based on plan attributes
            const categoryName = getPlanCategory(plan);
            
            if (!groupedByNetwork[networkKey].categories[categoryName]) {
              groupedByNetwork[networkKey].categories[categoryName] = {
                id: categoryName.toLowerCase().replace(/\s+/g, '_'),
                name: categoryName,
                plans: [],
              };
            }

            // Get validity display
            let validityDisplay = '';
            if (plan.validity && plan.validityUnit) {
              const unit = plan.validityUnit.toLowerCase();
              const val = plan.validity;
              if (val === 1) {
                validityDisplay = `1 ${unit.slice(0, -1)}`;
              } else {
                validityDisplay = `${val} ${unit}`;
              }
            }

            groupedByNetwork[networkKey].categories[categoryName].plans.push({
              id: plan.id,
              name: plan.name,
              data: plan.amountMB >= 1024 
                ? `${(plan.amountMB / 1024).toFixed(1)}GB` 
                : `${plan.amountMB}MB`,
              price: Number(plan.ourPrice),
              validity: validityDisplay || `${plan.validity} ${plan.validityUnit}`.toLowerCase(),
              planCode: plan.vendorPlanId,
              vendorPrice: Number(plan.vendorPrice),
              description: plan.description,
              amountMB: plan.amountMB,
              planType: plan.planType,
            });
          }

          // Sort plans within each category by amountMB
          for (const networkKey in groupedByNetwork) {
            for (const categoryKey in groupedByNetwork[networkKey].categories) {
              groupedByNetwork[networkKey].categories[categoryKey].plans.sort((a: any, b: any) => {
                return (a.amountMB || 0) - (b.amountMB || 0);
              });
            }
          }

          providers = Object.keys(groupedByNetwork).map((key) => ({
            ...groupedByNetwork[key],
            categories: sortCategories(
              Object.keys(groupedByNetwork[key].categories).map((catKey) => ({
                id: groupedByNetwork[key].categories[catKey].id,
                name: catKey,
                plans: groupedByNetwork[key].categories[catKey].plans,
              }))
            ),
          }));

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

  // ✅ If still no providers, use empty array
  if (providers.length === 0) {
    console.warn('⚠️ [DATA] No providers found, using empty array');
    providers = [];
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