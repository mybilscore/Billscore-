// app/api/vendors/plans/route.ts - COMPLETE FIXED VERSION

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { NetworkProvider, PlanStatus, VtuType } from "@prisma/client";

// ✅ Extract category based on validity
function extractCategoryFromPlan(plan: any): string {
  // 1. Check if it's an SME plan
  const isSME = plan.planType?.toUpperCase() === 'SME' || 
                plan.name?.toUpperCase().includes('SME');
  if (isSME) {
    return 'SME';
  }

  // 2. Check if it's a Corporate plan
  const isCorporate = plan.planType?.toUpperCase() === 'CORPORATE' || 
                      plan.planType?.toUpperCase() === 'COOPERATE' ||
                      plan.name?.toUpperCase().includes('COOPERATE') ||
                      plan.name?.toUpperCase().includes('CORPORATE');
  if (isCorporate) {
    return 'Corporate';
  }

  // 3. For all other plans, categorize by validity
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

  return 'Monthly';
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

// ✅ Map network to VTpass service ID (only used for VTpass)
function getVTPassServiceId(network: string | null): string | null {
  if (!network) return null;
  
  const serviceIdMap: Record<string, string> = {
    'MTN': 'mtn-data',
    'GLO': 'glo-data',
    'AIRTEL': 'airtel-data',
    '9MOBILE': 'etisalat-data',
    'NINEMOBILE': 'etisalat-data',
  };

  const upperNetwork = network.toUpperCase();
  return serviceIdMap[upperNetwork] || null;
}

// ✅ Fetch VTpass plans directly (only for VTpass vendor)
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

    if (!apiKey || !secretKey || !publicKey) {
      console.warn('⚠️ [VTPass] Missing API keys');
      return [];
    }

    let serviceIds: string[] = [];
    
    if (networkParam) {
      const serviceId = getVTPassServiceId(networkParam);
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
              const p = parseFloat(v.variation_amount) || 0;
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

            let categoryName = 'Monthly';
            const lowerName = name.toLowerCase();
            
            if (lowerName.includes('sme')) categoryName = 'SME';
            else if (lowerName.includes('daily') || lowerName.includes('1 day') || lowerName.includes('1day')) categoryName = 'Daily';
            else if (lowerName.includes('weekly') || lowerName.includes('7 day')) categoryName = 'Weekly';
            else if (lowerName.includes('monthly') || lowerName.includes('30 day')) categoryName = 'Monthly';
            else if (lowerName.includes('yearly') || lowerName.includes('365 day')) categoryName = 'Yearly';
            else if (lowerName.includes('2 month')) categoryName = '2 Monthly';

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

            let networkName = 'MTN';
            if (serviceId.includes('glo')) networkName = 'GLO';
            else if (serviceId.includes('airtel')) networkName = 'AIRTEL';
            else if (serviceId.includes('etisalat')) networkName = '9MOBILE';

            return {
              id: v.variation_code || `${serviceId}-${v.name || 'plan'}`,
              name: v.name || `${dataAmount} Data`,
              data: dataAmount,
              price: price,
              validity: `${validityDays} days`,
              planCode: v.variation_code || v.id || `${serviceId}-${price}`,
              vendorPrice: price,
              description: v.name || '',
              amountMB: amountMB,
              planType: categoryName,
              network: networkName,
              service_type: serviceId,
              variation_code: v.variation_code || v.id || '',
              variation_name: v.name || '',
              validity_days: validityDays,
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

// ✅ FORMAT PLANS - SAME AS MOBILE ROUTE
function formatPlans(plans: any[], networkConfigs: any[]) {
  console.log(`📊 [formatPlans] Starting with ${plans.length} plans`);
  
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

    let displayPrice = 0;
    if (plan.ourPrice !== undefined && plan.ourPrice !== null && Number(plan.ourPrice) > 0) {
      displayPrice = Number(plan.ourPrice);
    } else if (plan.price !== undefined && plan.price !== null && Number(plan.price) > 0) {
      displayPrice = Number(plan.price);
    }
    
    if (displayPrice <= 0) {
      console.log(`⚠️ [Data Plans] Skipping plan with invalid price: ${plan.name}`);
      continue;
    }

    groupedByNetwork[networkKey].hasPlans = true;

    const categoryName = extractCategoryFromPlan(plan);

    if (!groupedByNetwork[networkKey].categories[categoryName]) {
      groupedByNetwork[networkKey].categories[categoryName] = {
        id: categoryName.toLowerCase().replace(/\s+/g, '_'),
        name: categoryName,
        plans: [],
      };
    }

    let dataDisplay = plan.data || plan.dataDisplay || `${plan.amountMB || 0}MB`;
    if (!dataDisplay || dataDisplay === '0MB') {
      const mb = plan.amountMB || 0;
      if (mb >= 1024) {
        dataDisplay = `${(mb / 1024).toFixed(1)}GB`;
      } else {
        dataDisplay = `${mb}MB`;
      }
    }

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

    groupedByNetwork[networkKey].categories[categoryName].plans.push(planObject);
    plansAdded++;
  }

  console.log(`📊 [formatPlans] Added ${plansAdded} plans to categories`);

  const result = Object.keys(groupedByNetwork).map((key) => {
    const provider = groupedByNetwork[key];
    const categories = sortCategories(
      Object.keys(provider.categories).map((catKey) => ({
        id: provider.categories[catKey].id,
        name: catKey,
        plans: provider.categories[catKey].plans,
      }))
    );
    
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

// ✅ MAIN GET HANDLER - FIXED
export async function GET(request: NextRequest) {
  console.log("📊 [VENDOR PLANS API] Plans fetch requested");
  const startTime = Date.now();

  try {
    const searchParams = new URL(request.url).searchParams;
    const network = searchParams.get("network") as string | null;
    const serviceType = searchParams.get("serviceType") || "DATA";
    const isWhatsApp = searchParams.get("whatsapp") === "true";
    const limit = parseInt(searchParams.get("limit") || "1000");

    console.log(`📊 [VENDOR PLANS API] Fetching plans for ${serviceType}${network ? ` (${network})` : ''}`);
    console.log(`📱 WhatsApp mode: ${isWhatsApp}`);

    // ✅ Get active vendor
    const vendorService = await getActiveVendor(serviceType);

    if (!vendorService) {
      console.log(`⚠️ [VENDOR PLANS API] No active vendor found for ${serviceType}`);
      return NextResponse.json({
        success: false,
        error: `No active vendor found for ${serviceType}`,
        data: {
          plans: [],
          networks: [],
          vendor: null,
          providers: [],
        },
      }, { status: 200 });
    }

    const vendorCode = vendorService.vendor.code;
    console.log(`✅ [VENDOR PLANS API] Active vendor: ${vendorService.vendor.name} (${vendorCode})`);

    // ✅ Get network configs
    const networkConfigs = await prisma.networkConfig.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    console.log(`📊 [VENDOR PLANS API] Found ${networkConfigs.length} network configs`);

    let plans: any[] = [];
    let vendorInfo = {
      id: vendorService.vendor.id,
      name: vendorService.vendor.name,
      code: vendorCode,
    };

    // ✅ If VTpass is active, fetch from VTpass API
    if (vendorCode === 'VTPASS' || vendorCode === 'VT_PASS') {
      console.log('📊 [VENDOR PLANS API] VTpass active - fetching from VTpass API');
      plans = await fetchVTPassPlans(network);
      console.log(`📊 [VENDOR PLANS API] VTpass returned ${plans.length} plans`);
    } 
    // ✅ For BilalSada and other vendors, fetch from database
    else {
      console.log(`📊 [VENDOR PLANS API] ${vendorCode} active - fetching from database`);
      
      // ✅ Build where clause - same as mobile route
      const where: any = {
        vendorId: vendorService.vendorId,
        isActive: true,
        status: PlanStatus.ACTIVE,
      };

      // ✅ Only add WhatsApp filter if specified
      if (isWhatsApp) {
        where.isActiveForWhatsApp = true;
      }

      // ✅ Only add network filter if valid
      if (network && isValidNetworkProvider(network)) {
        where.network = network as NetworkProvider;
      } else if (network) {
        console.log(`⚠️ [VENDOR PLANS API] Invalid network filter: ${network}, ignoring`);
      }

      console.log(`📊 [VENDOR PLANS API] Where clause:`, JSON.stringify(where, null, 2));

      // ✅ Fetch plans from database
      const dbPlans = await prisma.dataPlan.findMany({
        where,
        orderBy: [
          { network: 'asc' },
          ...(isWhatsApp ? [{ whatsappPriority: 'asc' }] : []),
          { planType: 'asc' },
          { amountMB: 'asc' },
        ],
        take: limit,
        include: {
          networkConfig: true,
        },
      });

      plans = dbPlans;
      console.log(`📊 [VENDOR PLANS API] Database returned ${plans.length} plans`);
      
      if (plans.length > 0) {
        const categories = plans.map(p => extractCategoryFromPlan(p));
        const categoryCounts: Record<string, number> = {};
        categories.forEach(c => {
          categoryCounts[c] = (categoryCounts[c] || 0) + 1;
        });
        console.log(`📊 [VENDOR PLANS API] Category distribution:`, categoryCounts);
      } else {
        console.log(`❌ [VENDOR PLANS API] No plans found in database!`);
        
        const totalPlans = await prisma.dataPlan.count();
        console.log(`📊 [VENDOR PLANS API] Total plans in database: ${totalPlans}`);
        
        const vendorPlans = await prisma.dataPlan.count({
          where: { vendorId: vendorService.vendorId }
        });
        console.log(`📊 [VENDOR PLANS API] Plans for vendor ${vendorService.vendorId}: ${vendorPlans}`);
      }
    }

    // ✅ Format plans - using same formatter as mobile
    const formattedProviders = formatPlans(plans, networkConfigs);

    // ✅ Sort: MTN first, then by name
    formattedProviders.sort((a, b) => {
      const aIsMtn = a.name.toUpperCase().includes('MTN');
      const bIsMtn = b.name.toUpperCase().includes('MTN');
      
      if (aIsMtn && !bIsMtn) return -1;
      if (!aIsMtn && bIsMtn) return 1;
      
      if (a.hasPlans && !b.hasPlans) return -1;
      if (!a.hasPlans && b.hasPlans) return 1;
      
      return a.name.localeCompare(b.name);
    });

    console.log(`📊 [VENDOR PLANS API] Formatted ${formattedProviders.length} providers`);
    console.log(`📊 [VENDOR PLANS API] Providers with plans:`, 
      formattedProviders.filter(p => p.hasPlans).map(p => `${p.name}(${p.categories.reduce((s, c) => s + c.plans.length, 0)})`)
    );

    // ✅ Build response - same format as mobile
    const responseData = {
      vendor: vendorInfo,
      networks: networkConfigs.map(n => ({
        id: n.id,
        name: n.displayName,
        code: n.code,
        color: n.color,
        logo: n.logo,
        network: n.network,
      })),
      providers: formattedProviders,
      totalPlans: plans.length,
      serviceType,
      isWhatsApp,
      whatsappMode: isWhatsApp,
      meta: {
        lastUpdated: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        format: 'vtpass_compatible',
        totalNetworks: networkConfigs.length,
        totalProvidersWithPlans: formattedProviders.filter(p => p.hasPlans).length,
        vendor: vendorCode,
      },
    };

    const responseTime = Date.now() - startTime;
    console.log(`✅ [VENDOR PLANS API] Response prepared in ${responseTime}ms`);

    const response = NextResponse.json({
      success: true,
      data: responseData,
    });

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;

  } catch (error: any) {
    console.error("💥 [VENDOR PLANS API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch plans",
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
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}