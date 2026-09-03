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

// ✅ Map plan to category - SME separate, others by validity
function getPlanCategory(plan: any): string {
  // 1. Check if it's an SME plan
  const isSME = plan.planType?.toUpperCase() === 'SME' || 
                plan.planType?.toUpperCase() === 'SME_DATA' ||
                plan.name?.toUpperCase().includes('SME') ||
                (plan.planType?.toUpperCase() === 'SME' && plan.amountMB >= 5000);

  // 2. If SME, return 'SME' immediately
  if (isSME) {
    return 'SME';
  }

  // 3. Get validity from schema fields
  let validityValue = plan.validity || 0;
  const validityUnit = plan.validityUnit?.toUpperCase() || 'DAYS';

  // If validity is 0, derive from amountMB
  if (validityValue === 0 && plan.amountMB) {
    const mb = plan.amountMB || 0;
    if (mb <= 50) validityValue = 1;
    else if (mb <= 100) validityValue = 1;
    else if (mb <= 200) validityValue = 7;
    else if (mb <= 350) validityValue = 7;
    else if (mb <= 750) validityValue = 30;
    else if (mb <= 1500) validityValue = 30;
    else if (mb <= 2500) validityValue = 60;
    else if (mb <= 5120) validityValue = 365;
    else validityValue = 30;
  }

  if (validityValue === 0) validityValue = 30;

  // 4. Determine category based on validity ONLY
  if (validityUnit === 'HOURS' || validityUnit === 'MINUTES') {
    return 'Hourly';
  }
  
  if (validityUnit === 'DAYS') {
    if (validityValue <= 3) return 'Daily';
    if (validityValue <= 14) return 'Weekly';
    if (validityValue <= 30) return 'Monthly';
    if (validityValue <= 60) return '2 Monthly';
    if (validityValue <= 90) return '2 Monthly';
    return 'Yearly';
  }
  
  if (validityUnit === 'MONTHS') {
    if (validityValue <= 1) return 'Monthly';
    if (validityValue <= 3) return '2 Monthly';
    if (validityValue <= 12) return 'Yearly';
    return 'Yearly';
  }
  
  if (validityUnit === 'YEARS') {
    return 'Yearly';
  }

  return 'Monthly';
}

// ✅ Sort categories - SME first, then by validity
function sortCategories(categories: any[]) {
  const order: Record<string, number> = {
    'SME': 0,
    'Daily': 1,
    'Weekly': 2,
    'Monthly': 3,
    '2 Monthly': 4,
    'Yearly': 5,
    'Hourly': 6,
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

        if (!response.ok) {
          console.warn(`⚠️ [VTPass] HTTP ${response.status} for ${serviceId}`);
          continue;
        }
        
        const data = await response.json();

        if (data.response_description === "000" && data.content) {
          const variations = data.content?.variations || data.content?.varations || [];
          console.log(`📊 [VTPass] Found ${variations.length} variations for ${serviceId}`);
          
          const mappedPlans = variations.map((v: any) => {
            const price = parseFloat(v.variation_amount) || 0;
            const name = v.name || '';
            let dataAmount = '0MB';
            let amountMB = 0;
            
            const mbMatch = name.match(/(\d+(?:\.\d+)?)\s*(MB|GB|gb|mb)/i);
            if (mbMatch) {
              const num = parseFloat(mbMatch[1]);
              const unit = mbMatch[2].toUpperCase();
              amountMB = unit === 'GB' ? num * 1024 : num;
              dataAmount = `${num}${unit}`;
            } else {
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

            let validityDays = 30;
            const dayMatch = name.match(/(\d+)\s*(day|days|hr|hrs|month|months|year|years)/i);
            if (dayMatch) {
              const num = parseInt(dayMatch[1]);
              const unit = dayMatch[2].toLowerCase();
              if (unit.includes('day')) validityDays = num;
              else if (unit.includes('month')) validityDays = num * 30;
              else if (unit.includes('year')) validityDays = num * 365;
              else if (unit.includes('hr')) validityDays = 1;
            }

            // Check if it's SME
            let planType = 'Monthly';
            const lowerName = name.toLowerCase();
            if (lowerName.includes('sme') || lowerName.includes('sme_data')) {
              planType = 'SME';
            } else if (validityDays <= 1) {
              planType = 'Daily';
            } else if (validityDays <= 7) {
              planType = 'Weekly';
            } else if (validityDays <= 30) {
              planType = 'Monthly';
            } else if (validityDays <= 60) {
              planType = '2 Monthly';
            } else if (validityDays > 60) {
              planType = 'Yearly';
            }

            let networkName = 'MTN';
            if (serviceId.includes('glo')) networkName = 'GLO';
            else if (serviceId.includes('airtel')) networkName = 'AIRTEL';
            else if (serviceId.includes('etisalat')) networkName = '9MOBILE';

            return {
              id: v.variation_code || `${serviceId}-${v.name || 'plan'}`,
              name: name || `${dataAmount} Data`,
              data: dataAmount,
              price: price,
              validity: validityDays,
              validityUnit: 'DAYS',
              vendorPrice: price,
              description: name || '',
              amountMB: amountMB,
              planType: planType,
              network: networkName,
              service_type: serviceId,
              variation_code: v.variation_code || '',
              variation_name: name || '',
              ourPrice: price,
            };
          });
          
          const filteredPlans = mappedPlans.filter(p => p.price > 0);
          console.log(`📊 [VTPass] Mapped ${filteredPlans.length} plans for ${serviceId}`);
          allPlans = [...allPlans, ...filteredPlans];
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

  console.log(`📊 [formatPlans] Processing ${plans.length} plans`);

  // Initialize networks from configs
  for (const config of networkConfigs) {
    const networkKey = config.network.toLowerCase();
    groupedByNetwork[networkKey] = {
      id: networkKey,
      name: config.displayName || config.network,
      code: config.code || config.network,
      color: config.color || '#000000',
      iconPath: config.logo || `/networks/${networkKey}.jpg`,
      categories: {},
      hasPlans: false,
      network: config.network,
    };
  }

  for (const plan of plans) {
    let networkKey = plan.network?.toLowerCase() || 'mtn';
    let networkName = plan.network || 'MTN';
    
    if (!groupedByNetwork[networkKey]) {
      const config = networkConfigs.find(n => 
        n.network === networkName || 
        n.code === networkName ||
        n.displayName === networkName
      );
      
      groupedByNetwork[networkKey] = {
        id: networkKey,
        name: config?.displayName || networkName || 'Unknown',
        code: config?.code || networkName || 'UNKNOWN',
        color: config?.color || '#000000',
        iconPath: config?.logo || `/networks/${networkKey}.jpg`,
        categories: {},
        hasPlans: false,
        network: plan.network,
      };
    }

    // ✅ Use the fixed getPlanCategory function
    const categoryName = getPlanCategory(plan);

    if (!groupedByNetwork[networkKey].categories[categoryName]) {
      groupedByNetwork[networkKey].categories[categoryName] = {
        id: categoryName.toLowerCase().replace(/\s+/g, '_'),
        name: categoryName,
        plans: [],
      };
    }

    // ✅ USE ourPrice ONLY for display
    let displayPrice = Number(plan.ourPrice) || 0;
    
    // ✅ Skip plans with no ourPrice
    if (displayPrice <= 0) {
      console.log(`⚠️ [formatPlans] Skipping plan with no ourPrice: ${plan.name} (ourPrice: ${plan.ourPrice})`);
      continue;
    }

    groupedByNetwork[networkKey].hasPlans = true;

    // Get validity display
    let validityDisplay = '30 days';
    if (plan.validity && plan.validity > 0) {
      const unit = plan.validityUnit?.toLowerCase() || 'days';
      if (unit === 'days' || unit === 'day') {
        if (plan.validity === 1) validityDisplay = '1 day';
        else if (plan.validity < 7) validityDisplay = `${plan.validity} days`;
        else if (plan.validity === 7) validityDisplay = '7 days';
        else if (plan.validity < 30) validityDisplay = `${plan.validity} days`;
        else if (plan.validity === 30) validityDisplay = '30 days';
        else if (plan.validity === 60) validityDisplay = '60 days';
        else if (plan.validity === 365) validityDisplay = '1 year';
        else validityDisplay = `${plan.validity} days`;
      } else if (unit === 'months' || unit === 'month') {
        if (plan.validity === 1) validityDisplay = '1 month';
        else if (plan.validity < 12) validityDisplay = `${plan.validity} months`;
        else if (plan.validity === 12) validityDisplay = '1 year';
        else validityDisplay = `${plan.validity} months`;
      } else if (unit === 'years' || unit === 'year') {
        if (plan.validity === 1) validityDisplay = '1 year';
        else validityDisplay = `${plan.validity} years`;
      } else if (unit === 'hours' || unit === 'hour') {
        validityDisplay = `${plan.validity} hours`;
      } else if (unit === 'minutes' || unit === 'minute') {
        validityDisplay = `${plan.validity} minutes`;
      }
    }

    // Get data display
    let dataDisplay = plan.data || `${plan.amountMB || 0}MB`;
    if (!dataDisplay || dataDisplay === '0MB') {
      const mb = plan.amountMB || 0;
      if (mb >= 1024) {
        dataDisplay = `${(mb / 1024).toFixed(1)}GB`;
      } else {
        dataDisplay = `${mb}MB`;
      }
    }

    groupedByNetwork[networkKey].categories[categoryName].plans.push({
      id: plan.id || `${networkKey}-${categoryName}-${displayPrice}`,
      name: plan.name || plan.variation_name || dataDisplay,
      data: dataDisplay,
      price: displayPrice, // ✅ ourPrice
      validity: validityDisplay,
      planCode: plan.id || `${networkKey}-${categoryName}-${displayPrice}`,
      vendorPrice: typeof plan.vendorPrice === 'number' ? plan.vendorPrice : parseFloat(plan.vendorPrice) || 0,
      description: plan.description || '',
      amountMB: plan.amountMB || 0,
      planType: categoryName,
      variation_code: plan.variation_code || '',
      variation_name: plan.variation_name || plan.name || '',
      service_id: plan.service_type || 'data',
      network: plan.network,
      validityDays: plan.validity || 30,
      validityUnit: plan.validityUnit || 'DAYS',
    });
  }

  // Convert to array and sort categories
  const result = Object.keys(groupedByNetwork).map((key) => ({
    ...groupedByNetwork[key],
    categories: sortCategories(
      Object.keys(groupedByNetwork[key].categories).map((catKey) => ({
        id: groupedByNetwork[key].categories[catKey].id,
        name: catKey,
        plans: groupedByNetwork[key].categories[catKey].plans,
      }))
    ),
  }));

  // Log category distribution
  result.forEach(provider => {
    if (provider.hasPlans) {
      console.log(`📊 [formatPlans] ${provider.name} categories:`, 
        provider.categories.map(c => `${c.name}(${c.plans.length})`).join(', ')
      );
    }
  });

  return result.filter(p => p.hasPlans);
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

  // Get active vendor
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

    // Get network configs
    const networkConfigs = await getNetworkConfigs();
    console.log(`📊 [DATA] Found ${networkConfigs.length} network configs`);

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
        select: {
          id: true,
          name: true,
          planType: true,
          amountMB: true,
          ourPrice: true,
          vendorPrice: true,
          validity: true,
          validityUnit: true,
          network: true,
          description: true,
          isActiveForWhatsApp: true,
          whatsappPriority: true,
          vendorPlanId: true,
          vendorNetworkCode: true,
          vendorPlanType: true,
          vendorMetadata: true,
        },
        orderBy: [
          { network: 'asc' },
          { amountMB: 'asc' },
        ],
      });
      
      plans = dbPlans;
      console.log(`📊 [DATA] Database returned ${plans.length} plans`);
      
      // Log networks found
      const networksFound = [...new Set(plans.map(p => p.network))];
      console.log(`📊 [DATA] Networks in database:`, networksFound);
      
      // Log sample plan
      if (plans.length > 0) {
        console.log(`📊 [DATA] Sample plan:`, {
          id: plans[0].id,
          name: plans[0].name,
          network: plans[0].network,
          planType: plans[0].planType,
          ourPrice: plans[0].ourPrice,
          validity: plans[0].validity,
          validityUnit: plans[0].validityUnit,
        });
      }
    }

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