// src/app/api/seed/bilalsada-plans/route.ts - CLEANED (MTN, AIRTEL, GLO, 9MOBILE ONLY)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { NetworkProvider, PlanType, PlanCategory, ValidityUnit, PlanStatus } from "@prisma/client";

// ✅ BILAL SADA PLANS - MTN, AIRTEL, GLO, 9MOBILE ONLY
const BILAL_SADA_PLANS = [
  // ============================================
  // MTN SME Plans (6 plans)
  // ============================================
  "1 MTN SME 500MB ₦270.00 30days",
  "2 MTN SME 1GB ₦394.90 7days",
  "3 MTN SME 2GB ₦899.00 Monthly",
  "4 MTN SME 3GB ₦1,350.00 30days",
  "5 MTN SME 5GB ₦1,805.00 30days",
  "263 MTN SME 1GB ₦530.00 30days",
  
  // ============================================
  // MTN GIFTING Plans (35 plans)
  // ============================================
  "20 MTN GIFTING 1GB ₦250.00 30days",
  "66 MTN GIFTING 2GB ₦470.00 30days",
  "109 MTN GIFTING 3GB ₦700.00 30days",
  "194 MTN GIFTING 75MB ₦73.50 1day",
  "195 MTN GIFTING 5GB ₦1,400.00 30days",
  "197 MTN GIFTING 500MB ₦343.00 1day",
  "198 MTN GIFTING 1GB ₦490.00 1days",
  "199 MTN GIFTING 1.5GB ₦588.00 2days",
  "200 MTN GIFTING 2GB ₦735.00 2days",
  "201 MTN GIFTING 2.5GB ₦882.00 2days",
  "202 MTN GIFTING 3.2GB ₦980.00 2days",
  "203 MTN GIFTING 2GB ₦1,470.00 30days",
  "204 MTN GIFTING 2.7GB ₦1,960.00 30days",
  "205 MTN GIFTING 3.5GB ₦2,450.00 30days",
  "206 MTN GIFTING 3.5GB ₦1,470.00 7days",
  "207 MTN GIFTING 1.8GB ₦1,470.00 3days",
  "208 MTN GIFTING 7GB ₦3,430.00 30days",
  "209 MTN GIFTING 7GB ₦1,764.00 2days",
  "210 MTN GIFTING 5.5GB ₦2,940.00 30days",
  "211 MTN GIFTING 10GB ₦4,410.00 30days",
  "212 MTN GIFTING 11GB ₦3,430.00 7days",
  "213 MTN GIFTING 12.5GB ₦5,390.00 30days",
  "214 MTN GIFTING 14.5GB ₦4,900.00 30days",
  "215 MTN GIFTING 16.5GB ₦6,370.00 30days",
  "216 MTN GIFTING 20GB ₦7,350.00 30days",
  "217 MTN GIFTING 25GB ₦6,860.00 30days",
  "218 MTN GIFTING 25GB ₦8,820.00 30days",
  "219 MTN GIFTING 34GB ₦9,800.00 30days",
  "220 MTN GIFTING 36GB ₦10,780.00 30days",
  "221 MTN GIFTING 40GB ₦8,820.00 60days postpaid only",
  "222 MTN GIFTING 65GB ₦15,680.00 30days",
  "223 MTN GIFTING 75GB ₦17,640.00 30days",
  "224 MTN GIFTING 90GB ₦24,500.00 60days",
  "225 MTN GIFTING 165GB ₦34,300.00 30days",
  "226 MTN GIFTING 250GB ₦53,900.00 30days",
  "227 MTN GIFTING 800GB ₦122,500.00 365days",

  // ============================================
  // AIRTEL SME Plans (10 plans)
  // ============================================
  "7 AIRTEL SME 500MB ₦493.00 7days",
  "8 AIRTEL SME 1GB ₦784.00 7days",
  "9 AIRTEL SME 2GB ₦1,500.00 30days",
  "10 AIRTEL SME 4GB ₦2,525.00 30days",
  "26 AIRTEL SME 10GB ₦4,000.00 30days",
  "44 AIRTEL SME 300MB ₦300.00 30days",
  "45 AIRTEL SME 100MB ₦100.00 30days",
  "74 AIRTEL SME 25GB ₦8,000.00 30days",
  "75 AIRTEL SME 18GB ₦6,000.00 7days",
  "126 AIRTEL SME 1TB ₦196,000.00 1year",

  // ============================================
  // AIRTEL GIFTING Plans (37 plans)
  // ============================================
  "145 AIRTEL GIFTING 35GB ₦10,000.00 30days",
  "146 AIRTEL GIFTING 60GB ₦15,000.00 30days",
  "147 AIRTEL GIFTING 100GB ₦20,000.00 30days",
  "148 AIRTEL GIFTING 160GB ₦30,000.00 30days",
  "165 AIRTEL GIFTING 1GB ₦779.00 7days",
  "166 AIRTEL GIFTING 1GB ₦290.00 3days",
  "167 AIRTEL GIFTING 2GB ₦1,425.00 30days",
  "168 AIRTEL GIFTING 500MB ₦490.00 7days",
  "169 AIRTEL GIFTING 3GB ₦1,960.00 30days",
  "170 AIRTEL GIFTING 3GB ₦760.00 2days",
  "171 AIRTEL GIFTING 1.5GB ₦490.00 7days",
  "172 AIRTEL GIFTING 1.5GB ₦980.00 7days",
  "173 AIRTEL GIFTING 1.5GB ₦505.00 1day",
  "174 AIRTEL GIFTING 1.5GB ₦405.00 1day",
  "175 AIRTEL GIFTING 75MB ₦74.00 1day",
  "176 AIRTEL GIFTING 110MB ₦98.00 1day",
  "177 AIRTEL GIFTING 250MB ₦50.00 1day",
  "178 AIRTEL GIFTING 2GB ₦570.00 7days",
  "179 AIRTEL GIFTING 600MB ₦205.00 2days",
  "180 AIRTEL GIFTING 3GB ₦1,960.00 30days",
  "181 AIRTEL GIFTING 4GB ₦2,450.00 30days",
  "183 AIRTEL GIFTING 8GB ₦2,970.00 30days",
  "184 AIRTEL GIFTING 10GB ₦3,920.00 30days",
  "185 AIRTEL GIFTING 13GB ₦4,900.00 30days",
  "186 AIRTEL GIFTING 25GB ₦7,840.00 30days",
  "187 AIRTEL GIFTING 35GB ₦9,800.00 30days",
  "188 AIRTEL GIFTING 60GB ₦14,700.00 30days",
  "189 AIRTEL GIFTING 100GB ₦19,600.00 30days",
  "190 AIRTEL GIFTING 300GB ₦49,000.00 90days",
  "191 AIRTEL GIFTING 350GB ₦58,800.00 120days",
  "192 AIRTEL GIFTING 685GB ₦98,000.00 1year",
  "261 AIRTEL GIFTING 8GB ₦1,960.00 30days ebonylife",
  "262 AIRTEL GIFTING 60GB ₦9,800.00 Yearly ebony life",
  "370 AIRTEL GIFTING 1.2GB ₦200.00 7days",
  "371 AIRTEL GIFTING 2GB ₦300.00 7days",
  "372 AIRTEL GIFTING 3.2GB ₦500.00 7days",
  "373 AIRTEL GIFTING 3.2GB ₦500.00 30days",
  "374 AIRTEL GIFTING 6.5GB ₦1,000.00 14days",
  "375 AIRTEL GIFTING 20GB ₦3,000.00 30days",
  "58 AIRTEL GIFTING 11GB ₦4,000.00 30days",

  // ============================================
  // AIRTEL COOPERATE GIFTING Plans (5 plans)
  // ============================================
  "53 AIRTEL COOPERATE GIFTING 500MB ₦460.00 30days",
  "54 AIRTEL COOPERATE GIFTING 1GB ₦920.00 30days",
  "55 AIRTEL COOPERATE GIFTING 2GB ₦1,840.00 30days",
  "56 AIRTEL COOPERATE GIFTING 5GB ₦4,600.00 30days",
  "57 AIRTEL COOPERATE GIFTING 10GB ₦9,200.00 30days",

  // ============================================
  // GLO GIFTING Plans (64 plans)
  // ============================================
  "11 GLO GIFTING 1.5GB ₦460.00 30days",
  "12 GLO GIFTING 2.9GB ₦940.00 30days",
  "13 GLO GIFTING 4.1GB ₦1,290.00 30days",
  "14 GLO GIFTING 5.8GB ₦1,850.00 30days",
  "15 GLO GIFTING 10GB ₦3,030.00 30days",
  "228 GLO GIFTING 45MB ₦49.00 1day",
  "229 GLO GIFTING 100MB ₦98.00 1day",
  "230 GLO GIFTING 200MB ₦196.00 2day",
  "231 GLO GIFTING 1.5GB ₦294.00 1day",
  "232 GLO GIFTING 2.5GB ₦490.00 2days",
  "233 GLO GIFTING 1.5GB ₦490.00 7days",
  "234 GLO GIFTING 2.6GB ₦980.00 30days",
  "235 GLO GIFTING 5GB ₦1,470.00 30days",
  "236 GLO GIFTING 6.15GB ₦1,960.00 30days",
  "237 GLO GIFTING 7.25GB ₦2,450.00 30days",
  "238 GLO GIFTING 10GB ₦2,940.00 30days",
  "239 GLO GIFTING 12.5GB ₦3,920.00 30days",
  "240 GLO GIFTING 16GB ₦4,900.00 30days",
  "241 GLO GIFTING 20.5GB ₦5,880.00 30days",
  "242 GLO GIFTING 28GB ₦7,840.00 30days",
  "243 GLO GIFTING 38GB ₦9,800.00 30days",
  "244 GLO GIFTING 64GB ₦14,700.00 30days",
  "245 GLO GIFTING 107GB ₦19,600.00 30days",
  "246 GLO GIFTING 135GB ₦24,500.00 30days",
  "247 GLO GIFTING 165GB ₦29,400.00 30days",
  "248 GLO GIFTING 220GB ₦39,200.00 30days",
  "249 GLO GIFTING 310GB ₦49,000.00 60days",
  "250 GLO GIFTING 355GB ₦58,000.00 90days",
  "251 GLO GIFTING 475GB ₦73,500.00 90days",
  "252 GLO GIFTING 1000GB ₦147,000.00 1year",
  "253 GLO GIFTING 1000GB ₦147,000.00 1year",
  "254 GLO GIFTING 350MB ₦58.80 1day",
  "255 GLO GIFTING 750MB ₦117.60 1day",
  "256 GLO GIFTING 750MB ₦117.60 1day",
  "257 GLO GIFTING 135MB ₦49.00 3days",
  "271 GLO GIFTING 750MB ₦197.88 1Day Special",
  "272 GLO GIFTING 1.5GB ₦296.82 1Day Special",
  "273 GLO GIFTING 10GB ₦1,978.80 7Days Special",
  "274 GLO GIFTING 1.5GB ₦489.60 7Days",
  "275 GLO GIFTING 5GB ₦1,484.10 30Days",
  "276 GLO GIFTING 6.15GB ₦1,989.00 30Days",
  "277 GLO GIFTING 7.25GB ₦2,499.00 30Days",
  "278 GLO GIFTING 10GB ₦2,958.00 7Days",
  "279 GLO GIFTING 12.5GB ₦3,978.00 30Days",
  "280 GLO GIFTING 16GB ₦4,998.00 30Days",
  "281 GLO GIFTING 20.5GB ₦6,018.00 30Days",
  "282 GLO GIFTING 28GB ₦8,058.00 30Days",
  "283 GLO GIFTING 38GB ₦10,098.00 30Days",
  "284 GLO GIFTING 64GB ₦15,096.00 30Days",
  "285 GLO GIFTING 107GB ₦20,196.00 30Days",
  "286 GLO GIFTING 135GB ₦24,735.00 30Days",
  "287 GLO GIFTING 165GB ₦29,682.00 30Days",
  "288 GLO GIFTING 220GB ₦39,576.00 30Days",
  "289 GLO GIFTING 310GB ₦49,470.00 60Days",
  "290 GLO GIFTING 355GB ₦59,364.00 90Days",
  "291 GLO GIFTING 475GB ₦74,205.00 90Days",
  "292 GLO GIFTING 1TB ₦148,410.00 365Days",
  "293 GLO GIFTING 750MB ₦197.88 1day",
  "294 GLO GIFTING 1.5GB ₦296.82 1day",
  "295 GLO GIFTING 45GB ₦6,925.80 30Days",
  "296 GLO GIFTING 30GB ₦4,947.00 30Days",
  "297 GLO GIFTING 6.1GB ₦1,978.80 15Days",
  "298 GLO GIFTING 32GB ₦4,947.00 30Days incl 3GB Night",
  "299 GLO GIFTING 3.55GB ₦593.64 2Days incl 2GB Night",
  "300 GLO GIFTING 750MB ₦118.32 1Night",
  "301 GLO GIFTING 1TB ₦148,410.00 365Days",
  "302 GLO GIFTING 310GB ₦49,470.00 60Days",
  "303 GLO GIFTING 355GB ₦59,364.00 90Days",
  "304 GLO GIFTING 475GB ₦74,205.00 90Days",
  "310 GLO GIFTING 450MB ₦494.70 7Days + 10 mins Voice",
  "311 GLO GIFTING 1.25GB ₦989.40 7Days + 20 mins Voice",
  "312 GLO GIFTING 1.85GB ₦1,484.10 14Days + 30 mins Voice",
  "313 GLO GIFTING 3GB ₦1,978.80 30Days + 40 mins Voice",
  "314 GLO GIFTING 4GB ₦2,473.50 30Days + 50 mins Voice",
  "315 GLO GIFTING 7.5GB ₦2,968.20 30Days + 60 mins Voice",
  "316 GLO GIFTING 12.5GB ₦4,947.00 30Days + 100 mins Voice",
  "317 GLO GIFTING 500MB ₦197.88 1Hour",
  "318 GLO GIFTING 1GB ₦296.82 2Hours",
  "322 GLO GIFTING 750MB ₦190.00 1day",
  "323 GLO GIFTING 15GB ₦294.00 1day",
  "324 GLO GIFTING 25GB ₦490.00 2days",
  "325 GLO GIFTING 10GB ₦1,960.00 7days",

  // ============================================
  // GLO SME Plans (11 plans)
  // ============================================
  "150 GLO SME 500MB ₦190.00 14days Night plan",
  "151 GLO SME 1GB ₦360.00 14days Night plan",
  "152 GLO SME 1GB ₦340.00 3days",
  "153 GLO SME 1GB ₦356.00 7days",
  "154 GLO SME 3GB ₦1,020.00 3days",
  "155 GLO SME 3GB ₦1,080.00 7days",
  "156 GLO SME 3GB ₦1,080.00 14days night plan",
  "157 GLO SME 5GB ₦1,700.00 3days",
  "158 GLO SME 5GB ₦1,785.00 7days",
  "159 GLO SME 5GB ₦1,785.00 14days Night plan",
  "160 GLO SME 10GB ₦3,570.00 14days night plan",

  // ============================================
  // GLO COOPERATE GIFTING Plans (7 plans)
  // ============================================
  "29 GLO COOPERATE GIFTING 200MB ₦110.00 30days",
  "30 GLO COOPERATE GIFTING 500MB ₦199.00 30days",
  "31 GLO COOPERATE GIFTING 1GB ₦399.00 30days",
  "32 GLO COOPERATE GIFTING 2GB ₦798.00 30days",
  "33 GLO COOPERATE GIFTING 3GB ₦1,199.00 30days",
  "34 GLO COOPERATE GIFTING 5GB ₦1,999.00 30days",
  "35 GLO COOPERATE GIFTING 10GB ₦3,990.00 30days after redeeming",

  // ============================================
  // 9MOBILE Plans (3 plans)
  // ============================================
  "25 9MOBILE SME 1.1GB ₦400.00 30days",
  "27 9MOBILE GIFTING 1.5GB ₦880.00 30days",
  "28 9MOBILE GIFTING 500MB ₦450.00 30days",
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractAmountMB(amountStr: string): number {
  if (!amountStr) return 0;
  
  const cleaned = amountStr.toUpperCase().trim();
  
  if (cleaned.includes('TB')) {
    const num = parseFloat(cleaned.replace('TB', '').trim());
    return isNaN(num) ? 0 : num * 1024 * 1024;
  }
  
  if (cleaned.includes('GB')) {
    const num = parseFloat(cleaned.replace('GB', '').trim());
    return isNaN(num) ? 0 : num * 1024;
  }
  
  if (cleaned.includes('MB')) {
    const num = parseFloat(cleaned.replace('MB', '').trim());
    return isNaN(num) ? 0 : num;
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[₦,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseValidity(validityStr: string): { days: number; unit: string } {
  const lower = validityStr.toLowerCase();
  let days = 30;
  let unit = 'DAYS';
  
  if (lower.includes('hour') || lower.includes('hr')) {
    unit = 'HOURS';
    const match = lower.match(/(\d+)/);
    days = match ? parseInt(match[1]) || 1 : 1;
  } else if (lower.includes('day') || lower.includes('daily')) {
    unit = 'DAYS';
    const match = lower.match(/(\d+)/);
    days = match ? parseInt(match[1]) || 30 : 30;
  } else if (lower.includes('week')) {
    unit = 'DAYS';
    const match = lower.match(/(\d+)/);
    days = match ? parseInt(match[1]) * 7 : 7;
  } else if (lower.includes('month') || lower.includes('monthly')) {
    unit = 'DAYS';
    const match = lower.match(/(\d+)/);
    days = match ? parseInt(match[1]) * 30 : 30;
  } else if (lower.includes('year') || lower.includes('yearly') || lower.includes('annually')) {
    unit = 'DAYS';
    const match = lower.match(/(\d+)/);
    days = match ? parseInt(match[1]) * 365 : 365;
  }
  
  return { days, unit };
}

function parsePlanString(planString: string) {
  const parts = planString.split(' ');
  
  const code = parts[0];
  
  // Find network
  let networkIndex = 1;
  let network = '';
  const networkKeywords = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
  
  for (let i = 1; i < Math.min(parts.length, 4); i++) {
    const part = parts[i].toUpperCase();
    if (networkKeywords.some(keyword => part.includes(keyword) || keyword.includes(part))) {
      network = parts[i];
      networkIndex = i;
      break;
    }
  }
  
  // Get plan type
  let planType = 'GIFTING';
  let typeIndex = networkIndex + 1;
  
  const typeCheck = parts.slice(networkIndex + 1, networkIndex + 4).join(' ').toUpperCase();
  if (typeCheck.includes('SME')) {
    planType = 'SME';
    typeIndex = networkIndex + 1;
  } else if (typeCheck.includes('COOPERATE GIFTING') || typeCheck.includes('COOPERATE')) {
    planType = 'COOPERATE GIFTING';
    typeIndex = networkIndex + 1;
  } else if (typeCheck.includes('GIFTING') || typeCheck.includes('GIFT')) {
    planType = 'GIFTING';
    typeIndex = networkIndex + 1;
  }
  
  // Get amount
  let amountStr = '';
  let amountIndex = typeIndex;
  
  for (let i = typeIndex; i < parts.length; i++) {
    const part = parts[i];
    if (part.includes('MB') || part.includes('GB') || part.includes('TB')) {
      amountStr = part;
      amountIndex = i;
      break;
    }
    if (i + 1 < parts.length && (parts[i+1].includes('MB') || parts[i+1].includes('GB') || parts[i+1].includes('TB'))) {
      amountStr = parts[i] + parts[i+1];
      amountIndex = i + 1;
      break;
    }
  }
  
  if (!amountStr) {
    for (let i = typeIndex; i < parts.length; i++) {
      const part = parts[i];
      if (part.match(/\d+\.?\d*/) && i + 1 < parts.length) {
        const nextPart = parts[i + 1];
        if (nextPart.includes('MB') || nextPart.includes('GB') || nextPart.includes('TB')) {
          amountStr = part + nextPart;
          amountIndex = i + 1;
          break;
        }
      }
    }
  }
  
  // Get price
  let priceStr = '';
  let priceIndex = amountIndex + 1;
  
  for (let i = amountIndex + 1; i < parts.length; i++) {
    if (parts[i].includes('₦')) {
      priceStr = parts[i];
      priceIndex = i;
      break;
    }
    if (i + 1 < parts.length && parts[i+1].includes('₦')) {
      priceStr = parts[i] + parts[i+1];
      priceIndex = i + 1;
      break;
    }
  }
  
  if (!priceStr) {
    for (let i = amountIndex + 1; i < parts.length; i++) {
      const part = parts[i];
      const num = parseFloat(part.replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) {
        priceStr = part;
        priceIndex = i;
        break;
      }
    }
  }
  
  // Get validity
  let validityStr = '30days';
  for (let i = priceIndex + 1; i < parts.length; i++) {
    const part = parts[i].toLowerCase();
    if (part.includes('day') || part.includes('month') || part.includes('year') || part.includes('hour')) {
      validityStr = parts[i];
      break;
    }
    if (i + 1 < parts.length && 
        (parts[i+1].toLowerCase().includes('day') || 
         parts[i+1].toLowerCase().includes('month') || 
         parts[i+1].toLowerCase().includes('year') ||
         parts[i+1].toLowerCase().includes('hour'))) {
      validityStr = parts[i] + ' ' + parts[i+1];
      break;
    }
  }
  
  validityStr = validityStr.replace(/[^a-zA-Z0-9]/g, ' ').trim();
  
  const price = parsePrice(priceStr);
  const amountMB = extractAmountMB(amountStr);
  const validity = parseValidity(validityStr);
  
  // Map network to NetworkProvider enum
  let networkProvider = 'MTN' as NetworkProvider;
  const networkUpper = network.toUpperCase();
  if (networkUpper.includes('GLO')) {
    networkProvider = 'GLO' as NetworkProvider;
  } else if (networkUpper.includes('AIRTEL')) {
    networkProvider = 'AIRTEL' as NetworkProvider;
  } else if (networkUpper.includes('9MOBILE') || networkUpper.includes('NINE')) {
    networkProvider = 'NINEMOBILE' as NetworkProvider;
  }
  
  // Map plan type
  let planTypeEnum = 'GIFTING' as PlanType;
  if (planType === 'SME') {
    planTypeEnum = 'SME' as PlanType;
  } else if (planType === 'COOPERATE GIFTING') {
    planTypeEnum = 'COOPERATE_GIFTING' as PlanType;
  }
  
  let planName = `${network} ${planType} ${amountStr} ${validityStr}`;
  planName = planName.replace(/\b(SME|GIFTING|COOPERATE GIFTING)\s+\1\b/gi, '$1');
  
  return {
    code,
    network: networkProvider,
    planType: planTypeEnum,
    name: planName,
    amountMB,
    price,
    validityDays: validity.days,
    validityUnit: validity.unit,
    vendorPlanId: code,
    vendorNetworkCode: network,
    vendorPlanType: planType,
    description: `${network} ${planType} ${amountStr} - ${validityStr}`,
    importBatch: new Date().toISOString().slice(0, 10),
  };
}

// ============================================
// API ROUTES
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const vendorCode = body.vendorCode || 'BILAL_SADA';

    console.log(`🌱 [Seed] Importing BilalSada plans for ${vendorCode}...`);
    console.log(`📊 [Seed] Total plans to import: ${BILAL_SADA_PLANS.length}`);

    const vendor = await prisma.vendor.findUnique({
      where: { code: vendorCode },
    });

    if (!vendor) {
      return NextResponse.json({
        success: false,
        error: `Vendor ${vendorCode} not found.`,
        suggestion: 'Run POST /api/seed/bilalsada first to create the vendor',
      }, { status: 404 });
    }

    console.log(`✅ [Seed] Found vendor: ${vendor.name} (${vendor.id})`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const planString of BILAL_SADA_PLANS) {
      try {
        const parsed = parsePlanString(planString);
        
        if (parsed.amountMB === 0) {
          console.log(`⚠️ [Seed] Skipping plan with 0MB: ${planString}`);
          skipped++;
          continue;
        }
        
        if (parsed.price === 0) {
          console.log(`⚠️ [Seed] Skipping plan with 0 price: ${planString}`);
          skipped++;
          continue;
        }

        const existing = await prisma.dataPlan.findFirst({
          where: {
            vendorId: vendor.id,
            vendorPlanId: parsed.vendorPlanId,
          },
        });

        const price = parsed.price;
        
        const planData = {
          network: parsed.network,
          planType: parsed.planType,
          planCategory: 'DATA' as PlanCategory,
          name: parsed.name,
          amountMB: parsed.amountMB,
          vendorPrice: price,
          ourPrice: price,
          agentPrice: price,
          validity: parsed.validityDays,
          validityUnit: parsed.validityUnit as ValidityUnit,
          description: parsed.description,
          vendorId: vendor.id,
          vendorPlanId: parsed.vendorPlanId,
          vendorNetworkCode: parsed.vendorNetworkCode,
          vendorPlanType: parsed.vendorPlanType,
          importBatch: parsed.importBatch,
          lastSyncedAt: new Date(),
          isActive: true,
          status: 'ACTIVE' as PlanStatus,
        };

        if (existing) {
          await prisma.dataPlan.update({
            where: { id: existing.id },
            data: planData,
          });
          updated++;
        } else {
          await prisma.dataPlan.create({
            data: planData,
          });
          created++;
        }
        
      } catch (error: any) {
        errors.push({
          plan: planString,
          error: error.message,
        });
        console.error(`❌ [Seed] Error importing plan: ${planString}`, error.message);
      }
    }

    console.log(`✅ [Seed] Import complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);

    const [totalPlans, networkStats, priceStats] = await Promise.all([
      prisma.dataPlan.count({
        where: { isActive: true, vendorId: vendor.id },
      }),
      prisma.dataPlan.groupBy({
        by: ['network'],
        where: { isActive: true, vendorId: vendor.id },
        _count: true,
      }),
      prisma.dataPlan.aggregate({
        where: { isActive: true, vendorId: vendor.id },
        _avg: { ourPrice: true },
        _min: { ourPrice: true },
        _max: { ourPrice: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `BilalSada plans imported successfully (${created} created, ${updated} updated, ${skipped} skipped)`,
      data: {
        vendor: {
          id: vendor.id,
          code: vendor.code,
          name: vendor.name,
        },
        import: {
          created,
          updated,
          skipped,
          errors: errors.slice(0, 10),
          totalErrors: errors.length,
          hasErrors: errors.length > 0,
        },
        summary: {
          totalActive: totalPlans,
          networkStats: networkStats.map(n => ({
            network: n.network,
            count: n._count,
          })),
          priceStats: {
            average: priceStats._avg.ourPrice || 0,
            min: priceStats._min.ourPrice || 0,
            max: priceStats._max.ourPrice || 0,
          },
        },
      },
    });

  } catch (error: any) {
    console.error('❌ [Seed] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to import plans',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const vendorCode = searchParams.get('vendorCode') || 'BILAL_SADA';
    const network = searchParams.get('network') as any;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const vendor = await prisma.vendor.findUnique({
      where: { code: vendorCode },
      select: { id: true },
    });

    if (!vendor) {
      return NextResponse.json({
        success: false,
        error: 'Vendor not found',
      }, { status: 404 });
    }

    const where: any = {
      vendorId: vendor.id,
      isActive: true,
    };
    
    if (network) {
      where.network = network;
    }

    const [plans, total] = await Promise.all([
      prisma.dataPlan.findMany({
        where,
        orderBy: [
          { network: 'asc' },
          { planType: 'asc' },
          { amountMB: 'asc' },
        ],
        select: {
          id: true,
          network: true,
          planType: true,
          name: true,
          amountMB: true,
          ourPrice: true,
          vendorPrice: true,
          agentPrice: true,
          validity: true,
          validityUnit: true,
          description: true,
          vendorPlanId: true,
          vendorNetworkCode: true,
          isActive: true,
          status: true,
        },
        take: limit,
        skip: offset,
      }),
      prisma.dataPlan.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total,
        limit,
        offset,
        plans,
        pricingSummary: {
          totalPlans: plans.length,
          averageVendorPrice: plans.reduce((sum, p) => sum + Number(p.vendorPrice), 0) / (plans.length || 1),
          averageOurPrice: plans.reduce((sum, p) => sum + Number(p.ourPrice), 0) / (plans.length || 1),
          averageAgentPrice: plans.reduce((sum, p) => sum + Number(p.agentPrice), 0) / (plans.length || 1),
        },
      },
    });

  } catch (error: any) {
    console.error('❌ [Seed] GET error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch plans',
    }, { status: 500 });
  }
}