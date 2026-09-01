// src/app/api/mobile/vendors/data/plans/route.ts - CORRECTED CATEGORIES

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { verify } from "jsonwebtoken";
import { NetworkProvider, PlanStatus, VtuType } from "@prisma/client";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

// ✅ Extract category based on validity ONLY - ignore Gifting/SME/Corporate for categories
function extractCategoryFromPlan(plan: any): string {
  // 1. Check if it's an SME plan - return "SME" category
  const isSME = plan.planType?.toUpperCase() === 'SME' || 
                plan.name?.toUpperCase().includes('SME');
  if (isSME) {
    return 'SME';
  }

  // 2. Check if it's a Corporate plan - return "Corporate" category
  const isCorporate = plan.planType?.toUpperCase() === 'CORPORATE' || 
                      plan.planType?.toUpperCase() === 'COOPERATE' ||
                      plan.name?.toUpperCase().includes('COOPERATE') ||
                      plan.name?.toUpperCase().includes('CORPORATE');
  if (isCorporate) {
    return 'Corporate';
  }

  // 3. For all other plans (including GIFTING), categorize by validity
  const validityDays = plan.validityDays || plan.validity || 0;
  const validityUnit = plan.validityUnit?.toUpperCase() || 'DAYS';
  
  if (validityUnit === 'HOURS' || validityUnit === 'MINUTES') {
    return 'Hourly';
  }
  
  if (validityUnit === 'DAYS') {
    if (validityDays <= 1) return 'Daily';
    if (validityDays <= 7) return 'Weekly';
    if (validityDays <= 30) return 'Monthly';
    if (validityDays <= 60) return '2 Monthly';
    if (validityDays <= 365) return 'Yearly';
    return 'Monthly';
  }
  
  if (validityUnit === 'MONTHS') {
    if (validityDays <= 1) return 'Monthly';
    if (validityDays <= 2) return '2 Monthly';
    if (validityDays <= 12) return 'Yearly';
    return 'Monthly';
  }
  
  if (validityUnit === 'YEARS') {
    return 'Yearly';
  }

  return 'Monthly'; // Default
}

// ✅ Sort categories in specific order
function sortCategories(categories: any[]) {
  const order: Record<string, number> = {
    'SME': 0,
    'Corporate': 1,
    'Daily': 2,
    'Weekly': 3,
    'Monthly': 4,
    '2 Monthly': 5,
    'Yearly': 6,
    'Hourly': 7,
  };

  return categories.sort((a, b) => {
    const aOrder = order[a.name] ?? 99;
    const bOrder = order[b.name] ?? 99;
    return aOrder - bOrder;
  });
}

async function authenticateMobile(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    console.error("❌ [MOBILE DATA PLANS] Token verification failed:", error);
    return null;
  }
}

async function getActiveVendor(serviceType: string) {
  const vendorService = await prisma.vendorService.findFirst({
    where: {
      serviceType: serviceType as VtuType,
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

function isValidNetworkProvider(value: string): boolean {
  const validNetworks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE', 'NINEMOBILE'];
  return validNetworks.includes(value.toUpperCase());
}

function getNetworkDisplayName(providerName: string): string {
  if (!providerName) return '';
  const name = providerName.toUpperCase().trim();
  if (name.includes('MTN')) return 'MTN';
  if (name.includes('GLO')) return 'GLO';
  if (name.includes('AIRTEL')) return 'AIRTEL';
  if (name.includes('9MOBILE') || name.includes('NINE') || name.includes('ETISALAT')) return '9mobile';
  return providerName;
}

// ✅ FORMAT PLANS - FIXED with correct categories
function formatPlans(plans: any[], networkConfigs: any[]) {
  console.log(`📊 [formatPlans] Starting with ${plans.length} plans`);
  
  if (plans.length > 0) {
    console.log(`📊 [formatPlans] Sample plan:`, JSON.stringify({
      id: plans[0].id,
      name: plans[0].name,
      network: plans[0].network,
      ourPrice: plans[0].ourPrice,
      planType: plans[0].planType,
      validityDays: plans[0].validityDays,
      validityUnit: plans[0].validityUnit,
    }, null, 2));
  }
  
  const groupedByNetwork: Record<string, any> = {};

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
    };
  }

  // Group plans by network
  let plansAdded = 0;
  for (const plan of plans) {
    let networkKey = plan.network?.toLowerCase() || 'unknown';
    let networkName = plan.network || 'Unknown';
    
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
      };
    }

    // ✅ Use ourPrice as the displayed price
    let displayPrice = 0;
    if (plan.ourPrice !== undefined && plan.ourPrice !== null && plan.ourPrice > 0) {
      displayPrice = typeof plan.ourPrice === 'number' ? plan.ourPrice : parseFloat(plan.ourPrice) || 0;
    } else if (plan.price !== undefined && plan.price !== null && plan.price > 0) {
      displayPrice = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price) || 0;
    }
    
    if (displayPrice <= 0) {
      console.log(`⚠️ [Data Plans] Skipping plan with invalid price: ${plan.name} (ourPrice: ${plan.ourPrice})`);
      continue;
    }

    groupedByNetwork[networkKey].hasPlans = true;

    // ✅ CRITICAL FIX: Use our category extraction based on validity
    const categoryName = extractCategoryFromPlan(plan);
    
    console.log(`📊 [Data Plans] Adding: ${plan.name} -> ${networkKey}/${categoryName} (₦${displayPrice})`);

    if (!groupedByNetwork[networkKey].categories[categoryName]) {
      groupedByNetwork[networkKey].categories[categoryName] = {
        id: categoryName.toLowerCase().replace(/\s+/g, '_'),
        name: categoryName,
        plans: [],
      };
    }

    // ✅ Get data display
    let dataDisplay = plan.data || plan.dataDisplay || `${plan.amountMB || 0}MB`;
    if (!dataDisplay || dataDisplay === '0MB') {
      const mb = plan.amountMB || 0;
      if (mb >= 1024) {
        dataDisplay = `${(mb / 1024).toFixed(1)}GB`;
      } else {
        dataDisplay = `${mb}MB`;
      }
    }

    // ✅ Get validity display
    let validityDisplay = '30 days';
    if (plan.validity) {
      validityDisplay = typeof plan.validity === 'string' ? plan.validity : `${plan.validity} days`;
    } else if (plan.validityDays) {
      const days = typeof plan.validityDays === 'number' ? plan.validityDays : parseInt(plan.validityDays) || 30;
      if (days === 1) validityDisplay = '1 day';
      else if (days < 7) validityDisplay = `${days} days`;
      else if (days === 7) validityDisplay = '7 days';
      else if (days < 30) validityDisplay = `${days} days`;
      else if (days === 30) validityDisplay = '30 days';
      else if (days === 60) validityDisplay = '60 days';
      else if (days === 365) validityDisplay = '1 year';
      else validityDisplay = `${days} days`;
    }

    // ✅ Build plan object
    const planObject = {
      id: plan.id || plan.planCode || `${networkKey}-${categoryName}-${displayPrice}`,
      name: plan.name || plan.variation_name || dataDisplay,
      data: dataDisplay,
      price: displayPrice,
      validity: validityDisplay,
      planCode: plan.planCode || plan.variation_code || plan.id || '',
      vendorPrice: plan.vendorPrice || 0,
      description: plan.description || '',
      amountMB: plan.amountMB || 0,
      planType: categoryName,
      variation_code: plan.variation_code || plan.planCode || '',
      variation_name: plan.variation_name || plan.name || '',
      service_id: plan.service_type || 'data',
      network: networkName,
      isPopular: plan.isPopular || (plan.amountMB >= 1000 && plan.amountMB <= 5000),
      isBestValue: plan.isBestValue || (plan.amountMB / (displayPrice || 1)) > 0.5,
      validityDays: plan.validityDays || 30,
      networkDisplayName: getNetworkDisplayName(networkName),
      networkColor: groupedByNetwork[networkKey].color || '#000000',
      networkLogo: groupedByNetwork[networkKey].iconPath || '',
      dataDisplay: dataDisplay,
    };

    // Add plan to category
    groupedByNetwork[networkKey].categories[categoryName].plans.push(planObject);
    plansAdded++;
  }

  console.log(`📊 [formatPlans] Added ${plansAdded} plans to categories`);

  // Convert to array and sort categories
  const result = Object.keys(groupedByNetwork).map((key) => {
    const provider = groupedByNetwork[key];
    const categories = sortCategories(
      Object.keys(provider.categories).map((catKey) => ({
        id: provider.categories[catKey].id,
        name: catKey,
        plans: provider.categories[catKey].plans,
      }))
    );
    
    if (categories.length > 0) {
      console.log(`📊 [formatPlans] ${provider.name}: ${categories.map(c => `${c.name}(${c.plans.length})`).join(', ')}`);
    }
    
    return {
      ...provider,
      categories,
    };
  });

  const totalFormatted = result.reduce((sum, p) => 
    sum + p.categories.reduce((s, c) => s + c.plans.length, 0), 0
  );
  console.log(`📊 [formatPlans] Total plans formatted: ${totalFormatted}`);

  return result;
}

export async function GET(request: NextRequest) {
  console.log("📊 [MOBILE DATA PLANS] Plans fetch requested");
  const startTime = Date.now();

  try {
    // 1. Authenticate mobile user
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
        message: "Please login to access data plans",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`👤 [MOBILE DATA PLANS] User authenticated: ${userId}`);

    // 2. Get query parameters
    const searchParams = new URL(request.url).searchParams;
    const network = searchParams.get("network") as string | null;
    const serviceType = searchParams.get("serviceType") || "DATA";
    const limit = parseInt(searchParams.get("limit") || "1000");

    console.log(`📊 [MOBILE DATA PLANS] Fetching plans for ${serviceType}${network ? ` (${network})` : ''}`);

    // 3. Get the active vendor for this service
    const vendorService = await getActiveVendor(serviceType);

    if (!vendorService) {
      return NextResponse.json({
        success: false,
        error: "No active vendor found for data services",
        data: {
          plans: [],
          networks: [],
          vendor: null,
          providers: [],
        },
      }, { status: 200 });
    }

    const vendorCode = vendorService.vendor.code;
    console.log(`✅ [MOBILE DATA PLANS] Active vendor: ${vendorService.vendor.name} (${vendorCode})`);

    // 4. Get network configs
    const networkConfigs = await prisma.networkConfig.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    console.log(`📊 [MOBILE DATA PLANS] Found ${networkConfigs.length} network configs`);

    // 5. Build where clause
    const where: any = {
      vendorId: vendorService.vendorId,
      isActive: true,
      status: PlanStatus.ACTIVE,
    };

    if (network && isValidNetworkProvider(network)) {
      where.network = network as NetworkProvider;
    }

    console.log(`📊 [MOBILE DATA PLANS] Where clause:`, JSON.stringify(where, null, 2));

    // 6. Fetch plans from database
    const dbPlans = await prisma.dataPlan.findMany({
      where,
      orderBy: [
        { network: 'asc' },
        { planType: 'asc' },
        { amountMB: 'asc' },
      ],
      include: {
        networkConfig: true,
      },
    });

    console.log(`📊 [MOBILE DATA PLANS] Database returned ${dbPlans.length} plans`);
    
    if (dbPlans.length > 0) {
      // Log category distribution
      const categories = dbPlans.map(p => extractCategoryFromPlan(p));
      const categoryCounts: Record<string, number> = {};
      categories.forEach(c => {
        categoryCounts[c] = (categoryCounts[c] || 0) + 1;
      });
      console.log(`📊 [MOBILE DATA PLANS] Category distribution:`, categoryCounts);
      
      // Log a sample plan with its category
      const sample = dbPlans[0];
      console.log(`📊 [MOBILE DATA PLANS] Sample: ${sample.name} -> ${extractCategoryFromPlan(sample)}`);
    } else {
      console.log(`❌ [MOBILE DATA PLANS] No plans found in database!`);
      
      const totalPlans = await prisma.dataPlan.count();
      console.log(`📊 [MOBILE DATA PLANS] Total plans in database: ${totalPlans}`);
      
      const activePlans = await prisma.dataPlan.count({
        where: { isActive: true, status: PlanStatus.ACTIVE }
      });
      console.log(`📊 [MOBILE DATA PLANS] Active plans: ${activePlans}`);
      
      const vendorPlans = await prisma.dataPlan.count({
        where: { vendorId: vendorService.vendorId }
      });
      console.log(`📊 [MOBILE DATA PLANS] Plans for vendor ${vendorService.vendorId}: ${vendorPlans}`);
    }

    // 7. Format plans
    const formattedProviders = formatPlans(dbPlans, networkConfigs);

    // 8. Sort: MTN first, then by name
    formattedProviders.sort((a, b) => {
      const aIsMtn = a.name.toUpperCase().includes('MTN');
      const bIsMtn = b.name.toUpperCase().includes('MTN');
      
      if (aIsMtn && !bIsMtn) return -1;
      if (!aIsMtn && bIsMtn) return 1;
      
      if (a.hasPlans && !b.hasPlans) return -1;
      if (!a.hasPlans && b.hasPlans) return 1;
      
      return a.name.localeCompare(b.name);
    });

    console.log(`📊 [MOBILE DATA PLANS] Formatted ${formattedProviders.length} providers`);
    console.log(`📊 [MOBILE DATA PLANS] Providers with plans:`, 
      formattedProviders.filter(p => p.hasPlans).map(p => `${p.name}(${p.categories.reduce((s, c) => s + c.plans.length, 0)})`)
    );

    // 9. Build response
    const responseData = {
      vendor: {
        id: vendorService.vendor.id,
        name: vendorService.vendor.name,
        code: vendorCode,
      },
      networks: networkConfigs.map(n => ({
        id: n.id,
        name: n.displayName,
        code: n.code,
        color: n.color,
        logo: n.logo,
        network: n.network,
      })),
      providers: formattedProviders,
      totalPlans: dbPlans.length,
      serviceType,
      meta: {
        lastUpdated: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        format: 'mobile',
        totalNetworks: networkConfigs.length,
        totalProvidersWithPlans: formattedProviders.filter(p => p.hasPlans).length,
        vendor: vendorCode,
      },
    };

    const responseTime = Date.now() - startTime;
    console.log(`✅ [MOBILE DATA PLANS] Response prepared in ${responseTime}ms`);

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error: any) {
    console.error("💥 [MOBILE DATA PLANS] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch data plans",
      data: {
        plans: [],
        networks: [],
        vendor: null,
        providers: [],
      },
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}