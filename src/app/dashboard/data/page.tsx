// app/dashboard/buy/data/page.tsx - Complete fixed

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { DataClient } from "./page.client";
import { VtuType, PlanStatus } from "@prisma/client";

// Helper function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

// ✅ Map plan to category based on validity
function getPlanCategory(plan: any): string {
  if (plan.category) return plan.category;

  if (plan.planType?.toUpperCase() === 'SME') return 'SME';

  const validity = plan.validity || 0;
  const unit = plan.validityUnit?.toUpperCase() || 'DAYS';

  if (unit === 'HOURS' || unit === 'MINUTES') return 'Hourly';
  
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
  
  if (unit === 'YEARS') return 'Yearly';

  return 'Monthly';
}

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

// ✅ Fetch VTpass plans directly
async function fetchVTPassPlans(networkParam: string | null) {
  try {
    console.log('📊 [VTPass] Fetching VTpass plans...');
    
    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = isProduction 
      ? 'https://vtpass.com/api'
      : 'https://sandbox.vtpass.com/api';
    
    const apiKey = process.env.VTPASS_SANDBOX_API_KEY || process.env.VTPASS_LIVE_API_KEY;
    const secretKey = process.env.VTPASS_SANDBOX_SECRET_KEY || process.env.VTPASS_LIVE_SECRET_KEY;
    const publicKey = process.env.VTPASS_SANDBOX_PUBLIC_KEY || process.env.VTPASS_LIVE_PUBLIC_KEY;

    // ✅ Determine which service IDs to fetch
    let serviceIds: string[] = [];
    
    if (networkParam) {
      const serviceIdMap: Record<string, string> = {
        'MTN': 'mtn-data',
        'GLO': 'glo-data',
        'AIRTEL': 'airtel-data',
        '9MOBILE': 'etisalat-data',
        'NINEMOBILE': 'etisalat-data',
      };
      const upperNetwork = networkParam.toUpperCase();
      const serviceId = serviceIdMap[upperNetwork];
      if (serviceId) {
        serviceIds = [serviceId];
      } else {
        serviceIds = ['mtn-data', 'glo-data', 'airtel-data', 'etisalat-data'];
      }
    } else {
      serviceIds = ['mtn-data', 'glo-data', 'airtel-data', 'etisalat-data'];
    }

    let allPlans: any[] = [];
    
    for (const serviceId of serviceIds) {
      try {
        const url = `${baseUrl}/service-variations?serviceID=${serviceId}`;
        console.log(`📊 [VTPass] Fetching: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'api-key': apiKey || '',
            'secret-key': secretKey || '',
            'public-key': publicKey || '',
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(30000),
        });

        console.log(`📊 [VTPass] Response status: ${response.status}`);
        
        const responseText = await response.text();
        console.log(`📊 [VTPass] Response sample: ${responseText.substring(0, 500)}`);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.warn(`⚠️ [VTPass] Could not parse JSON for ${serviceId}`);
          continue;
        }

        // ✅ Check for successful response
        if (data.response_description === "000" && data.content) {
          // ✅ Extract variations - handle both "variations" and "varations"
          const variations = data.content?.variations || data.content?.varations || [];
          console.log(`📊 [VTPass] Found ${variations.length} variations for ${serviceId}`);
          
          // ✅ Log first variation to debug
          if (variations.length > 0) {
            console.log(`📊 [VTPass] First variation:`, JSON.stringify(variations[0], null, 2));
          }
          
          const mappedPlans = variations.map((v: any, index: number) => {
            // ✅ CORRECT: Use variation_amount for price
            const price = parseFloat(v.variation_amount) || 0;
            
            // Get network from service ID
            let networkName = 'MTN';
            if (serviceId.includes('glo')) networkName = 'GLO';
            else if (serviceId.includes('airtel')) networkName = 'AIRTEL';
            else if (serviceId.includes('etisalat')) networkName = '9MOBILE';
            
            // ✅ Extract data amount from variation name
            const name = v.name || '';
            let dataAmount = '0MB';
            let amountMB = 0;
            
            // Try to extract MB/GB from name
            const dataMatch = name.match(/(\d+(?:\.\d+)?)\s*(MB|GB|gb|mb)/i);
            if (dataMatch) {
              const num = parseFloat(dataMatch[1]);
              const unit = dataMatch[2].toUpperCase();
              amountMB = unit === 'GB' ? num * 1024 : num;
              dataAmount = `${num}${unit}`;
            } else {
              // Fallback: use price to estimate
              const p = price;
              if (p <= 50) { amountMB = 25; dataAmount = '25MB'; }
              else if (p <= 100) { amountMB = 50; dataAmount = '50MB'; }
              else if (p <= 200) { amountMB = 100; dataAmount = '100MB'; }
              else if (p <= 300) { amountMB = 200; dataAmount = '200MB'; }
              else if (p <= 500) { amountMB = 350; dataAmount = '350MB'; }
              else if (p <= 1000) { amountMB = 750; dataAmount = '750MB'; }
              else if (p <= 1500) { amountMB = 1024; dataAmount = '1GB'; }
              else if (p <= 2000) { amountMB = 2048; dataAmount = '2GB'; }
              else if (p <= 3000) { amountMB = 3072; dataAmount = '3GB'; }
              else if (p <= 5000) { amountMB = 5120; dataAmount = '5GB'; }
              else if (p <= 10000) { amountMB = 10240; dataAmount = '10GB'; }
              else { amountMB = Math.floor(p / 2); dataAmount = `${amountMB}MB`; }
            }

            // Extract validity from name
            let validityDays = 30;
            const dayMatch = name.match(/(\d+)\s*(day|days|hr|hrs|month|months|year|years)/i);
            if (dayMatch) {
              const num = parseInt(dayMatch[1]);
              const unit = dayMatch[2].toLowerCase();
              if (unit.includes('day')) {
                validityDays = num;
              } else if (unit.includes('month')) {
                validityDays = num * 30;
              } else if (unit.includes('year')) {
                validityDays = num * 365;
              } else if (unit.includes('hr')) {
                validityDays = 1;
              }
            }

            // Determine category
            let categoryName = 'Monthly';
            const lowerName = name.toLowerCase();
            
            if (lowerName.includes('sme')) {
              categoryName = 'SME';
            } else if (validityDays <= 1) {
              categoryName = 'Daily';
            } else if (validityDays <= 7) {
              categoryName = 'Weekly';
            } else if (validityDays <= 30) {
              categoryName = 'Monthly';
            } else if (validityDays <= 60) {
              categoryName = '2 Monthly';
            } else if (validityDays > 60) {
              categoryName = 'Yearly';
            }

            // ✅ Generate unique ID using variation_code + network + index
            const uniqueId = `${serviceId}-${v.variation_code || v.id || index}-${networkName}`;

            return {
              id: uniqueId,
              name: name || `${dataAmount} Data`,
              data: dataAmount,
              price: price,
              validity: `${validityDays} days`,
              planCode: v.variation_code || v.id || uniqueId,
              vendorPrice: price,
              description: name || '',
              amountMB: amountMB,
              planType: categoryName,
              network: networkName,
              service_type: serviceId,
              variation_code: v.variation_code || '',
              variation_name: name || '',
              validity_days: validityDays,
            };
          });
          
          // ✅ Filter out plans with price 0
          const filteredPlans = mappedPlans.filter(p => p.price > 0);
          console.log(`📊 [VTPass] Mapped ${filteredPlans.length} plans with price > 0 for ${serviceId}`);
          allPlans = [...allPlans, ...filteredPlans];
        } else {
          console.warn(`⚠️ [VTPass] Failed to fetch ${serviceId}:`, data.response_description || data.code || 'Unknown error');
        }
      } catch (e) {
        console.warn(`Failed to fetch ${serviceId} plans:`, e);
      }
    }

    console.log(`📊 [VTPass] Total plans fetched: ${allPlans.length}`);
    return allPlans;
  } catch (error) {
    console.error('Error fetching VTpass plans:', error);
    return [];
  }
}

// ✅ Get active vendor
async function getActiveVendor() {
  const vendorService = await prisma.vendorService.findFirst({
    where: {
      serviceType: VtuType.DATA,
      isActive: true,
    },
    include: {
      vendor: true,
    },
    orderBy: {
      priority: 'asc',
    },
  });

  return vendorService;
}

// ✅ Format plans into grouped structure
function formatPlans(plans: any[], networkConfigs: any[]) {
  const groupedByNetwork: Record<string, any> = {};

  for (const plan of plans) {
    let networkKey = plan.network?.toLowerCase() || 'mtn';
    let networkName = plan.network || 'MTN';
    
    // Try to find network config
    const config = networkConfigs.find(n => 
      n.network === networkName || 
      n.code === networkName ||
      n.displayName === networkName
    );
    
    if (config) {
      networkName = config.displayName || networkName;
    }

    if (!groupedByNetwork[networkKey]) {
      groupedByNetwork[networkKey] = {
        id: networkKey,
        name: networkName,
        code: networkName,
        color: config?.color || '#000000',
        iconPath: config?.logo || `/networks/${networkKey}.jpg`,
        categories: {},
        network: plan.network,
        service_type: plan.service_type || 'data',
      };
    }

    // Determine category
    let categoryName = plan.planType || 'Monthly';

    if (!groupedByNetwork[networkKey].categories[categoryName]) {
      groupedByNetwork[networkKey].categories[categoryName] = {
        id: categoryName.toLowerCase().replace(/\s+/g, '_'),
        name: categoryName,
        plans: [],
      };
    }

    // Add plan to category
    groupedByNetwork[networkKey].categories[categoryName].plans.push({
      id: plan.id || plan.planCode || `${networkKey}-${categoryName}-${plan.price}`,
      name: plan.name || plan.variation_name || plan.data,
      data: plan.data || `${plan.amountMB || 0}MB`,
      price: typeof plan.price === 'number' ? plan.price : parseFloat(plan.price) || 0,
      validity: typeof plan.validity === 'string' ? plan.validity : `${plan.validity_days || 30} days`,
      planCode: plan.planCode || plan.variation_code || plan.id,
      vendorPrice: typeof plan.vendorPrice === 'number' ? plan.vendorPrice : parseFloat(plan.vendorPrice) || 0,
      description: plan.description || '',
      amountMB: plan.amountMB || 0,
      planType: plan.planType || categoryName,
      variation_code: plan.variation_code || plan.planCode,
      variation_name: plan.variation_name || plan.name,
      service_id: plan.service_type || 'data',
      network: plan.network,
    });
  }

  // Convert to array and sort categories
  return Object.keys(groupedByNetwork).map((key) => ({
    ...groupedByNetwork[key],
    categories: sortCategories(
      Object.keys(groupedByNetwork[key].categories).map((catKey) => ({
        id: groupedByNetwork[key].categories[catKey].id,
        name: catKey,
        plans: groupedByNetwork[key].categories[catKey].plans,
      }))
    ),
  }));
}

// ✅ Get network configs
async function getNetworkConfigs() {
  try {
    return await prisma.networkConfig.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching network configs:', error);
    return [];
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

  // ✅ Get active vendor
  const vendorService = await getActiveVendor();
  let vendorInfo = null;
  let providers: any[] = [];
  let networks: any[] = [];

  if (vendorService) {
    vendorInfo = {
      id: vendorService.vendor.id,
      name: vendorService.vendor.name,
      code: vendorService.vendor.code,
    };

    console.log(`📊 [DATA] Active vendor: ${vendorInfo.name} (${vendorInfo.code})`);

    // ✅ Get network configs
    const networkConfigs = await getNetworkConfigs();

    // ✅ Fetch plans based on vendor
    let plans: any[] = [];

    if (vendorInfo.code === 'VTPASS' || vendorInfo.code === 'VT_PASS') {
      console.log('📊 [DATA] Fetching VTpass plans...');
      plans = await fetchVTPassPlans(null);
    } else {
      console.log(`📊 [DATA] Fetching ${vendorInfo.code} plans from database...`);
      const dbPlans = await prisma.dataPlan.findMany({
        where: {
          vendorId: vendorService.vendorId,
          isActive: true,
          status: PlanStatus.ACTIVE,
        },
        orderBy: [
          { network: 'asc' },
          { amountMB: 'asc' },
        ],
        include: {
          networkConfig: true,
        },
      });
      plans = dbPlans;
    }

    // ✅ Format plans
    providers = formatPlans(plans, networkConfigs);
    networks = networkConfigs.map(n => ({
      id: n.id,
      name: n.displayName,
      code: n.code,
      color: n.color,
      logo: n.logo,
      network: n.network,
    }));

    console.log(`📊 [DATA] Providers loaded: ${providers.length}`);
    console.log(`📊 [DATA] Networks loaded: ${networks.length}`);
  }

  const defaultProvider = providers.length > 0 ? providers[0].id : "mtn";

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