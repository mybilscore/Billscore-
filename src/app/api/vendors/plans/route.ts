// app/api/vendors/plans/route.ts - Complete fixed version with proper VTpass parsing

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { NetworkProvider, PlanStatus, VtuType } from "@prisma/client";

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

// ✅ Check if a value is a valid NetworkProvider enum
function isValidNetworkProvider(value: string): boolean {
  const validNetworks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE', 'NINEMOBILE'];
  return validNetworks.includes(value.toUpperCase());
}

// ✅ Map network to VTpass service ID
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

// ✅ Fetch VTpass plans directly with fetch - FIXED PARSING
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
    let networkConfigs = await prisma.networkConfig.findMany({
      where: { isActive: true },
    });
    
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
        console.log(`📊 [VTPass] Response sample: ${responseText.substring(0, 300)}`);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.warn(`⚠️ [VTPass] Could not parse JSON for ${serviceId}`);
          continue;
        }

        // ✅ Check for successful response
        if (data.response_description === "000" && data.content) {
          // ✅ Extract variations - handle both "variations" and "varations" (VTpass typo)
          const variations = data.content?.variations || data.content?.varations || [];
          console.log(`📊 [VTPass] Found ${variations.length} variations for ${serviceId}`);
          
          // ✅ Log first variation to debug
          if (variations.length > 0) {
            console.log(`📊 [VTPass] First variation:`, JSON.stringify(variations[0], null, 2));
          }
          
          const mappedPlans = variations.map((v: any) => {
            // ✅ CORRECT: Use variation_amount for price
            const price = parseFloat(v.variation_amount) || 0;
            
            // ✅ Get data amount from variation name
            const name = v.name || '';
            let dataAmount = '0MB';
            let amountMB = 0;
            
            // Try to extract data from name
            const mbMatch = name.match(/(\d+(?:\.\d+)?)\s*(MB|GB|gb|mb)/i);
            if (mbMatch) {
              const num = parseFloat(mbMatch[1]);
              const unit = mbMatch[2].toUpperCase();
              amountMB = unit === 'GB' ? num * 1024 : num;
              dataAmount = `${num}${unit}`;
            } else {
              // Fallback: use price to estimate
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

            // Determine category from name
            let categoryName = 'Monthly';
            const lowerName = name.toLowerCase();
            
            if (lowerName.includes('sme')) {
              categoryName = 'SME';
            } else if (lowerName.includes('daily') || lowerName.includes('1 day') || lowerName.includes('1day')) {
              categoryName = 'Daily';
            } else if (lowerName.includes('weekly') || lowerName.includes('7 day')) {
              categoryName = 'Weekly';
            } else if (lowerName.includes('monthly') || lowerName.includes('30 day')) {
              categoryName = 'Monthly';
            } else if (lowerName.includes('yearly') || lowerName.includes('365 day')) {
              categoryName = 'Yearly';
            } else if (lowerName.includes('2 month')) {
              categoryName = '2 Monthly';
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

            // Get network from service ID
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

// ✅ Format plans into grouped structure
function formatPlans(plans: any[], networkConfigs: any[]) {
  const groupedByNetwork: Record<string, any> = {};

  for (const plan of plans) {
    let networkKey = 'mtn';
    let networkName = 'MTN';
    let networkCode = 'MTN';
    let networkColor = '#000000';
    let networkIcon = '/networks/mtn.jpg';

    // Determine network info
    if (plan.network) {
      const upperNetwork = plan.network.toUpperCase();
      networkKey = upperNetwork.toLowerCase();
      networkName = upperNetwork;
      networkCode = upperNetwork;
      
      const config = networkConfigs.find(n => 
        n.network === upperNetwork || 
        n.code === upperNetwork ||
        n.displayName === upperNetwork
      );
      
      if (config) {
        networkName = config.displayName || upperNetwork;
        networkCode = config.code || upperNetwork;
        networkColor = config.color || '#000000';
        networkIcon = config.logo || `/networks/${networkKey}.jpg`;
      }
    }

    if (!groupedByNetwork[networkKey]) {
      groupedByNetwork[networkKey] = {
        id: networkKey,
        name: networkName,
        code: networkCode,
        color: networkColor,
        iconPath: networkIcon,
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

    // Add plan to category - sort by price
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const network = searchParams.get("network") as string | null;
    const serviceType = searchParams.get("serviceType") || "DATA";
    const isWhatsApp = searchParams.get("whatsapp") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    console.log(`📊 [VENDOR PLANS API] Fetching plans for ${serviceType}${network ? ` (${network})` : ''}`);
    console.log(`📱 WhatsApp mode: ${isWhatsApp}`);

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

    let plans: any[] = [];
    let vendorInfo = {
      id: vendorService.vendor.id,
      name: vendorService.vendor.name,
      code: vendorCode,
    };

    // ✅ If VTpass is active, fetch from VTpass API (skip database)
    if (vendorCode === 'VTPASS' || vendorCode === 'VT_PASS') {
      console.log('📊 [VENDOR PLANS API] VTpass active - fetching from VTpass API (skipping database)');
      
      // ✅ Fetch VTpass plans directly from API
      plans = await fetchVTPassPlans(network);
      
      console.log(`📊 [VENDOR PLANS API] VTpass returned ${plans.length} plans`);
    } 
    // ✅ For BilalSada and other vendors, fetch from database
    else {
      console.log(`📊 [VENDOR PLANS API] ${vendorCode} active - fetching from database`);
      
      // ✅ Build where clause for database
      const where: any = {
        vendorId: vendorService.vendorId,
        isActive: true,
        status: PlanStatus.ACTIVE,
      };

      if (isWhatsApp) {
        where.isActiveForWhatsApp = true;
      }

      // ✅ Only add network filter if it's a valid NetworkProvider enum value
      if (network && isValidNetworkProvider(network)) {
        where.network = network as NetworkProvider;
      } else if (network) {
        console.log(`⚠️ [VENDOR PLANS API] Invalid network filter for database: ${network}, ignoring`);
      }

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
    }

    // ✅ Format plans
    const formattedPlans = formatPlans(plans, networkConfigs);

    // ✅ Get networks
    const networks = networkConfigs.map(n => ({
      id: n.id,
      name: n.displayName,
      code: n.code,
      color: n.color,
      logo: n.logo,
      network: n.network,
      hasWhatsAppPlans: isWhatsApp ? true : undefined,
    }));

    console.log(`📊 [VENDOR PLANS API] Formatted ${formattedPlans.length} providers`);

    const response = NextResponse.json({
      success: true,
      data: {
        vendor: vendorInfo,
        networks: networks,
        plans: formattedPlans,
        totalPlans: plans.length,
        serviceType,
        isWhatsApp,
        whatsappMode: isWhatsApp,
        meta: {
          lastUpdated: new Date().toISOString(),
          responseTime: Date.now(),
          format: 'vtpass_compatible',
          totalNetworks: networks.length,
        },
      },
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
    },
  });
}