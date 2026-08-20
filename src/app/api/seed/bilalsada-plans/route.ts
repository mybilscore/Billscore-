// src/app/api/seed/bilalsada-plans/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { PlanImportService } from "~/lib/services/plan-import.service";

// All BilalSada plans from your data
const BILAL_SADA_PLANS = [
  "1 MTN SME 500MB ₦270.00 30days",
  "10 AIRTEL SME 4GB ₦2,525.00 30days",
  "11 GLO GIFTING 1.5GB ₦460.00 30days",
  "12 GLO GIFTING 2.9GB ₦940.00 30days",
  "126 AIRTEL SME 1TB ₦196,000.00 1 year",
  "13 GLO GIFTING 4.1GB ₦1,290.00 30days",
  "14 GLO GIFTING 5.8GB ₦1,850.00 30days",
  "145 AIRTEL GIFTING 35GB ₦10,000.00 30days",
  "146 AIRTEL GIFTING 60GB ₦15,000.00 30days",
  "147 AIRTEL GIFTING 100GB ₦20,000.00 30days",
  "148 AIRTEL GIFTING 160GB ₦30,000.00 30days",
  "15 GLO GIFTING 10GB ₦3,030.00 30days",
  "150 GLO SME 500MB ₦190.00 14 days ,Night plan",
  "151 GLO SME 1GB ₦360.00 14 days ,Night plan",
  "152 GLO SME 1GB ₦340.00 3 days",
  "153 GLO SME 1GB ₦356.00 7 days",
  "154 GLO SME 3GB ₦1,020.00 3 days",
  "155 GLO SME 3GB ₦1,080.00 7days",
  "156 GLO SME 3GB ₦1,080.00 14 days night plan",
  "157 GLO SME 5GB ₦1,700.00 3days",
  "158 GLO SME 5GB ₦1,785.00 7 days",
  "159 GLO SME 5GB ₦1,785.00 14 days Night plan",
  "160 GLO SME 10GB ₦3,570.00 14 days night plan",
  "165 AIRTEL GIFTING 1GB ₦779.00 7 days",
  "166 AIRTEL GIFTING 1GB ₦290.00 3 days",
  "167 AIRTEL GIFTING 2GB ₦1,425.00 30 days",
  "168 AIRTEL GIFTING 500MB ₦490.00 7 days",
  "169 AIRTEL GIFTING 3GB ₦1,960.00 30 days",
  "170 AIRTEL GIFTING 3GB ₦760.00 2 days",
  "171 AIRTEL GIFTING 1.5GB ₦490.00 7 days",
  "172 AIRTEL GIFTING 1.5GB ₦980.00 7 days",
  "173 AIRTEL GIFTING 1.5GB ₦505.00 1 day",
  "174 AIRTEL GIFTING 1.5GB ₦405.00 1 day",
  "175 AIRTEL GIFTING 75MB ₦74.00 1 day",
  "176 AIRTEL GIFTING 110MB ₦98.00 1 day",
  "177 AIRTEL GIFTING 250MB ₦50.00 1 day",
  "178 AIRTEL GIFTING 2GB ₦570.00 7 days",
  "179 AIRTEL GIFTING 600MB ₦205.00 2 days",
  "180 AIRTEL GIFTING 3GB ₦1,960.00 30 days",
  "181 AIRTEL GIFTING 4GB ₦2,450.00 30 days",
  "183 AIRTEL GIFTING 8GB ₦2,970.00 30 days",
  "184 AIRTEL GIFTING 10GB ₦3,920.00 30 days",
  "185 AIRTEL GIFTING 13GB ₦4,900.00 30 days",
  "186 AIRTEL GIFTING 25GB ₦7,840.00 30 days",
  "187 AIRTEL GIFTING 35GB ₦9,800.00 30 days",
  "188 AIRTEL GIFTING 60GB ₦14,700.00 30 days",
  "189 AIRTEL GIFTING 100GB ₦19,600.00 30 days",
  "190 AIRTEL GIFTING 300GB ₦49,000.00 90 days",
  "191 AIRTEL GIFTING 350GB ₦58,800.00 120 days",
  "192 AIRTEL GIFTING 685GB ₦98,000.00 1 year",
  "194 MTN GIFTING 75MB ₦73.50 1 day",
  "197 MTN GIFTING 500MB ₦343.00 1 day",
  "198 MTN GIFTING 1GB ₦490.00 1 days",
  "199 MTN GIFTING 1.5GB ₦588.00 2 days",
  "2 MTN SME 1GB ₦394.90 7 days",
  "200 MTN GIFTING 2GB ₦735.00 2 days",
  "201 MTN GIFTING 2.5GB ₦882.00 2 days",
  "202 MTN GIFTING 3.2GB ₦980.00 2 days",
  "203 MTN GIFTING 2GB ₦1,470.00 30 days",
  "204 MTN GIFTING 2.7GB ₦1,960.00 30 days",
  "205 MTN GIFTING 3.5GB ₦2,450.00 30 days",
  "206 MTN GIFTING 3.5GB ₦1,470.00 7 days",
  "207 MTN GIFTING 1.8GB ₦1,470.00 3 days",
  "208 MTN GIFTING 7GB ₦3,430.00 30 days",
  "209 MTN GIFTING 7GB ₦1,764.00 2 days",
  "210 MTN GIFTING 5.5GB ₦2,940.00 30 days",
  "211 MTN GIFTING 10GB ₦4,410.00 30 days",
  "212 MTN GIFTING 11GB ₦3,430.00 7 days",
  "213 MTN GIFTING 12.5GB ₦5,390.00 30days",
  "214 MTN GIFTING 14.5GB ₦4,900.00 30 days",
  "215 MTN GIFTING 16.5GB ₦6,370.00 30 days",
  "216 MTN GIFTING 20GB ₦7,350.00 30 days",
  "217 MTN GIFTING 25GB ₦6,860.00 30 days",
  "218 MTN GIFTING 25GB ₦8,820.00 30days",
  "219 MTN GIFTING 34GB ₦9,800.00 30days",
  "220 MTN GIFTING 36GB ₦10,780.00 30 days",
  "221 MTN GIFTING 40GB ₦8,820.00 60days",
  "222 MTN GIFTING 65GB ₦15,680.00 30 days",
  "223 MTN GIFTING 75GB ₦17,640.00 30 days",
  "224 MTN GIFTING 90GB ₦24,500.00 60 days",
  "225 MTN GIFTING 165GB ₦34,300.00 30days",
  "226 MTN GIFTING 250GB ₦53,900.00 30 days",
  "227 MTN GIFTING 800GB ₦122,500.00 365 days",
  "228 GLO GIFTING 45MB ₦49.00 1 day",
  "229 GLO GIFTING 100MB ₦98.00 1 day",
  "230 GLO GIFTING 200MB ₦196.00 2 day",
  "231 GLO GIFTING 1.5GB ₦294.00 1 day",
  "232 GLO GIFTING 2.5GB ₦490.00 2 days",
  "233 GLO GIFTING 1.5GB ₦490.00 7 days",
  "234 GLO GIFTING 2.6GB ₦980.00 30 days",
  "235 GLO GIFTING 5GB ₦1,470.00 30 days",
  "236 GLO GIFTING 6.15GB ₦1,960.00 30 days",
  "237 GLO GIFTING 7.25GB ₦2,450.00 30 days",
  "238 GLO GIFTING 10GB ₦2,940.00 30 days",
  "239 GLO GIFTING 12.5GB ₦3,920.00 30 days",
  "240 GLO GIFTING 16GB ₦4,900.00 30 days",
  "241 GLO GIFTING 20.5GB ₦5,880.00 30 days",
  "242 GLO GIFTING 28GB ₦7,840.00 30 days",
  "243 GLO GIFTING 38GB ₦9,800.00 30days",
  "244 GLO GIFTING 64GB ₦14,700.00 30days",
  "245 GLO GIFTING 107GB ₦19,600.00 30 days",
  "246 GLO GIFTING 135GB ₦24,500.00 30days",
  "247 GLO GIFTING 165GB ₦29,400.00 30 days",
  "248 GLO GIFTING 220GB ₦39,200.00 30 days",
  "249 GLO GIFTING 310GB ₦49,000.00 60 days",
  "250 GLO GIFTING 355GB ₦58,000.00 90days",
  "251 GLO GIFTING 475GB ₦73,500.00 90 days",
  "252 GLO GIFTING 1000GB ₦147,000.00 1 year",
  "253 GLO GIFTING 1000GB ₦147,000.00 1 year",
  "254 GLO GIFTING 350MB ₦58.80 1 day",
  "255 GLO GIFTING 750MB ₦117.60 1 day",
  "256 GLO GIFTING 750MB ₦117.60 1 day",
  "257 GLO GIFTING 135MB ₦49.00 3 days",
  "26 AIRTEL SME 10GB ₦4,000.00 30days",
  "261 AIRTEL GIFTING 8GB ₦1,960.00 30days ebonylife",
  "262 AIRTEL GIFTING 60GB ₦9,800.00 Yearly ebony life",
  "263 MTN SME 1GB ₦530.00 30 days",
  "27 9MOBILE GIFTING 1.5GB ₦880.00 30days",
  "271 GLO GIFTING 750MB ₦197.88 1 Day Special",
  "272 GLO GIFTING 1.5GB ₦296.82 1 Day Special",
  "273 GLO GIFTING 10GB ₦1,978.80 7 Days Special",
  "274 GLO GIFTING 1.5GB ₦489.60 7 Days",
  "275 GLO GIFTING 5GB ₦1,484.10 30 Days",
  "276 GLO GIFTING 6.15GB ₦1,989.00 30 Days",
  "277 GLO GIFTING 7.25GB ₦2,499.00 30 Days",
  "278 GLO GIFTING 10GB ₦2,958.00 7 Days",
  "279 GLO GIFTING 12.5GB ₦3,978.00 30 Days",
  "28 9MOBILE GIFTING 500MB ₦450.00 30 days",
  "280 GLO GIFTING 16GB ₦4,998.00 30 Days",
  "281 GLO GIFTING 20.5GB ₦6,018.00 30 Days",
  "282 GLO GIFTING 28GB ₦8,058.00 30 Days",
  "283 GLO GIFTING 38GB ₦10,098.00 30 Days",
  "284 GLO GIFTING 64GB ₦15,096.00 30 Days",
  "285 GLO GIFTING 107GB ₦20,196.00 30 Days",
  "286 GLO GIFTING 135GB ₦24,735.00 30 Days",
  "287 GLO GIFTING 165GB ₦29,682.00 30 Days",
  "288 GLO GIFTING 220GB ₦39,576.00 30 Days",
  "289 GLO GIFTING 310GB ₦49,470.00 60 Days",
  "29 GLO COOPERATE GIFTING 200MB ₦110.00 30days",
  "290 GLO GIFTING 355GB ₦59,364.00 90 Days",
  "291 GLO GIFTING 475GB ₦74,205.00 90 Days",
  "292 GLO GIFTING 1TB ₦148,410.00 365 Days",
  "293 GLO GIFTING 750MB ₦197.88 1 day",
  "294 GLO GIFTING 1.5GB ₦296.82 1 day",
  "295 GLO GIFTING 45GB ₦6,925.80 30 Days",
  "296 GLO GIFTING 30GB ₦4,947.00 30 Days",
  "297 GLO GIFTING 6.1GB ₦1,978.80 15 Days",
  "298 GLO GIFTING 32GB ₦4,947.00 30 Days incl 3GB Night",
  "299 GLO GIFTING 3.55GB ₦593.64 2 Days incl 2GB Night",
  "3 MTN SME 2GB ₦899.00 Monthly",
  "30 GLO COOPERATE GIFTING 500MB ₦199.00 30 days",
  "300 GLO GIFTING 750MB ₦118.32 1 Night",
  "301 GLO GIFTING 1TB ₦148,410.00 365 Days",
  "302 GLO GIFTING 310GB ₦49,470.00 60 Days",
  "303 GLO GIFTING 355GB ₦59,364.00 90 Days",
  "304 GLO GIFTING 475GB ₦74,205.00 90 Days",
  "31 GLO COOPERATE GIFTING 1GB ₦399.00 30 days",
  "310 GLO GIFTING 450MB ₦494.70 7 Days + 10 mins Voice",
  "311 GLO GIFTING 1.25GB ₦989.40 7 Days + 20 mins Voice",
  "312 GLO GIFTING 1.85GB ₦1,484.10 14 Days + 30 mins Voice",
  "313 GLO GIFTING 3GB ₦1,978.80 30 Days + 40 mins Voice",
  "314 GLO GIFTING 4GB ₦2,473.50 30 Days + 50 mins Voice",
  "315 GLO GIFTING 7.5GB ₦2,968.20 30 Days + 60 mins Voice",
  "316 GLO GIFTING 12.5GB ₦4,947.00 30 Days + 100 mins Voice",
  "317 GLO GIFTING 500MB ₦197.88 1 Hour",
  "318 GLO GIFTING 1GB ₦296.82 2 Hours",
  "32 GLO COOPERATE GIFTING 2GB ₦798.00 30days",
  "322 GLO GIFTING 750MB ₦190.00 1 day",
  "323 GLO GIFTING 15GB ₦294.00 1 day",
  "324 GLO GIFTING 25GB ₦490.00 2 days",
  "325 GLO GIFTING 10GB ₦1,960.00 7 days",
  "33 GLO COOPERATE GIFTING 3GB ₦1,199.00 30days",
  "34 GLO COOPERATE GIFTING 5GB ₦1,999.00 30days",
  "35 GLO COOPERATE GIFTING 10GB ₦3,990.00 30days after redeeming",
  "4 MTN SME 3GB ₦1,350.00 30days",
  "44 AIRTEL SME 300MB ₦300.00 30days",
  "45 AIRTEL SME 100MB ₦100.00 30days",
  "5 MTN SME 5GB ₦1,805.00 30days",
  "7 AIRTEL SME 500MB ₦493.00 7days",
  "74 AIRTEL SME 25GB ₦8,000.00 30days",
  "75 AIRTEL SME 18GB ₦6,000.00 7 days",
  "8 AIRTEL SME 1GB ₦784.00 7days",
  "9 AIRTEL SME 2GB ₦1,500.00 30days",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const vendorCode = body.vendorCode || 'BILAL_SADA';
    const importedBy = body.importedBy || 'system';

    console.log(`🌱 [Seed] Importing BilalSada plans for ${vendorCode}...`);
    console.log(`📊 [Seed] Total plans to import: ${BILAL_SADA_PLANS.length}`);

    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { code: vendorCode },
    });

    if (!vendor) {
      return NextResponse.json({
        success: false,
        error: `Vendor ${vendorCode} not found. Please seed vendor first.`,
        suggestion: 'Run: POST /api/seed/bilalsada with { mode: "simulation" }',
        steps: [
          '1. POST /api/seed/bilalsada - to create the vendor',
          '2. POST /api/seed/bilalsada-plans - to import plans'
        ]
      }, { status: 404 });
    }

    console.log(`✅ [Seed] Found vendor: ${vendor.name} (${vendor.id})`);

    const importService = new PlanImportService();
    const result = await importService.importPlans(
      BILAL_SADA_PLANS,
      vendorCode,
      importedBy
    );

    console.log(`✅ [Seed] Import complete: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors`);

    // Get summary
    const [totalPlans, networkStats, priceStats] = await Promise.all([
      prisma.dataPlan.count({
        where: { isActive: true },
      }),
      prisma.dataPlan.groupBy({
        by: ['network'],
        where: { isActive: true },
        _count: true,
      }),
      prisma.dataPlan.aggregate({
        where: { isActive: true },
        _avg: { ourPrice: true },
        _min: { ourPrice: true },
        _max: { ourPrice: true },
        _sum: { ourPrice: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `BilalSada plans imported successfully (${result.created} created, ${result.updated} updated)`,
      data: {
        vendor: {
          id: vendor.id,
          code: vendor.code,
          name: vendor.name,
        },
        import: {
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors.slice(0, 10), // Return first 10 errors
          totalErrors: result.errors.length,
          hasErrors: result.errors.length > 0,
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
            total: priceStats._sum.ourPrice || 0,
          },
        },
        nextSteps: {
          viewPlans: `/api/plans?vendorId=${vendor.id}`,
          viewByNetwork: '/api/plans/network/MTN',
          updatePrice: '/api/plans/:id/price',
          viewImports: '/api/plans/imports',
        },
      },
    });

  } catch (error: any) {
    console.error('❌ [Seed] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to import plans',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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

    // Build where clause
    const where: any = { isActive: true };
    
    if (vendorCode) {
      const vendor = await prisma.vendor.findUnique({
        where: { code: vendorCode },
        select: { id: true },
      });
      if (vendor) {
        where.vendorId = vendor.id;
      }
    }

    if (network) {
      where.network = network;
    }

    const [plans, total, networkStats] = await Promise.all([
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
          validity: true,
          validityUnit: true,
          description: true,
          vendorPlanId: true,
          vendorNetworkCode: true,
          isActive: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          vendor: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          networkConfig: {
            select: {
              id: true,
              displayName: true,
              code: true,
            },
          },
        },
        take: limit,
        skip: offset,
      }),
      prisma.dataPlan.count({ where }),
      prisma.dataPlan.groupBy({
        by: ['network'],
        where,
        _count: true,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total,
        limit,
        offset,
        networkStats,
        plans,
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