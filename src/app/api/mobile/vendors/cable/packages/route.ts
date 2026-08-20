// src/app/api/mobile/vendors/cable/packages/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

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
    console.error("❌ [MOBILE CABLE PACKAGES] Token verification failed:", error);
    return null;
  }
}

// ✅ Provider configurations
const PROVIDER_CONFIGS = [
  { id: "dstv", name: "DSTV", logo: "📺", color: "#E50914", serviceId: "dstv" },
  { id: "gotv", name: "GOTV", logo: "📡", color: "#FF6B00", serviceId: "gotv" },
  { id: "startimes", name: "Startimes", logo: "⭐", color: "#FFD700", serviceId: "startimes" },
];

// ✅ Service ID mapping for verification
const SERVICE_ID_MAP: Record<string, string> = {
  'DSTV': 'dstv',
  'GOTV': 'gotv',
  'Startimes': 'startimes',
  'startimes': 'startimes',
};

// ✅ Fallback packages if API fails
const FALLBACK_PACKAGES: Record<string, any[]> = {
  dstv: [
    { id: "dstv-premium", name: "Premium", price: 37000, channels: "250+", validity: "30 Days", packageCode: "dstv-premium" },
    { id: "dstv-compact-plus", name: "Compact+", price: 25000, channels: "200+", validity: "30 Days", packageCode: "dstv-compact-plus" },
    { id: "dstv-compact", name: "Compact", price: 15000, channels: "150+", validity: "30 Days", packageCode: "dstv-compact" },
    { id: "dstv-confam", name: "Confam", price: 9500, channels: "120+", validity: "30 Days", packageCode: "dstv-confam" },
    { id: "dstv-yanga", name: "Yanga", price: 6000, channels: "80+", validity: "30 Days", packageCode: "dstv-yanga" },
    { id: "dstv-padi", name: "Padi", price: 3000, channels: "50+", validity: "30 Days", packageCode: "dstv-padi" },
  ],
  gotv: [
    { id: "gotv-max", name: "Max", price: 18000, channels: "100+", validity: "30 Days", packageCode: "gotv-max" },
    { id: "gotv-plus", name: "Plus", price: 12000, channels: "70+", validity: "30 Days", packageCode: "gotv-plus" },
    { id: "gotv-value", name: "Value", price: 7500, channels: "50+", validity: "30 Days", packageCode: "gotv-value" },
    { id: "gotv-smallie", name: "Smallie", price: 3500, channels: "30+", validity: "30 Days", packageCode: "gotv-smallie" },
  ],
  startimes: [
    { id: "startimes-premium", name: "Premium", price: 14500, channels: "90+", validity: "30 Days", packageCode: "startimes-premium" },
    { id: "startimes-standard", name: "Standard", price: 8500, channels: "60+", validity: "30 Days", packageCode: "startimes-standard" },
    { id: "startimes-basic", name: "Basic", price: 4500, channels: "35+", validity: "30 Days", packageCode: "startimes-basic" },
    { id: "startimes-nova", name: "Nova", price: 2500, channels: "20+", validity: "30 Days", packageCode: "startimes-nova" },
  ],
};

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate mobile user
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      console.log("❌ [MOBILE CABLE PACKAGES] Authentication failed");
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
        message: "Please login to access cable packages",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`👤 [MOBILE CABLE PACKAGES] User authenticated: ${userId}`);

    // 2. Get query parameters
    const searchParams = new URL(request.url).searchParams;
    const provider = searchParams.get("provider");
    const format = searchParams.get("format") || "mobile";

    console.log(`📡 [MOBILE CABLE PACKAGES] Fetching packages${provider ? ` for ${provider}` : ' for all providers'}`);

    // 3. Determine environment
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction 
      ? "https://vtpass.com/api/service-variations"
      : "https://sandbox.vtpass.com/api/service-variations";

    // 4. Get API keys from environment
    const apiKey = isProduction 
      ? process.env.VTPASS_LIVE_API_KEY 
      : process.env.VTPASS_SANDBOX_API_KEY;
    
    const secretKey = isProduction
      ? process.env.VTPASS_LIVE_SECRET_KEY
      : process.env.VTPASS_SANDBOX_SECRET_KEY;

    console.log(`🔑 [MOBILE CABLE PACKAGES] Using ${isProduction ? 'LIVE' : 'SANDBOX'} environment`);

    // 5. Determine which providers to fetch
    let providersToFetch = PROVIDER_CONFIGS;
    if (provider) {
      const filtered = PROVIDER_CONFIGS.filter(p => 
        p.id.toLowerCase() === provider.toLowerCase() ||
        p.name.toLowerCase() === provider.toLowerCase()
      );
      if (filtered.length > 0) {
        providersToFetch = filtered;
      }
    }

    // 6. Fetch packages for each provider
    const allProviders: any[] = [];
    const errors: string[] = [];

    for (const config of providersToFetch) {
      try {
        console.log(`📡 [MOBILE CABLE PACKAGES] Fetching ${config.name} packages...`);
        
        const url = `${baseUrl}?serviceID=${config.serviceId}`;
        console.log(`📡 [MOBILE CABLE PACKAGES] URL: ${url}`);
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "api-key": apiKey || "",
            "secret-key": secretKey || "",
          },
        });

        if (!response.ok) {
          console.warn(`⚠️ [MOBILE CABLE PACKAGES] Failed to fetch ${config.name}: ${response.status}`);
          // Use fallback packages
          const fallbackPackages = FALLBACK_PACKAGES[config.id] || [];
          allProviders.push({
            ...config,
            packages: fallbackPackages,
            isFallback: true,
          });
          errors.push(`${config.name}: Using fallback packages (API error ${response.status})`);
          continue;
        }

        const data = await response.json();
        console.log(`📊 [MOBILE CABLE PACKAGES] ${config.name} response:`, data);

        if (data.response_description === "000" && data.content?.variations) {
          // Extract packages from VTpass response
          const packages: any[] = data.content.variations.map((v: any) => {
            const price = parseFloat(v.variation_amount) || 0;
            const name = v.name || "";
            
            // Determine if popular
            const isPopular = name.toLowerCase().includes("premium") || 
                             name.toLowerCase().includes("compact plus") ||
                             name.toLowerCase().includes("max") ||
                             name.toLowerCase().includes("supa");
            
            // Determine if best value
            const isBestValue = price > 2000 && price < 8000 && 
                               !name.toLowerCase().includes("premium") &&
                               !name.toLowerCase().includes("lite");
            
            return {
              id: v.variation_code,
              name: name,
              price: price,
              channels: v.channels || "100+",
              validity: v.validity || "30 Days",
              packageCode: v.variation_code,
              variationCode: v.variation_code,
              isPopular: isPopular,
              isBestValue: isBestValue,
              description: v.description || "",
            };
          });

          // Filter valid packages and sort by price
          const validPackages = packages
            .filter(p => p.price > 0)
            .sort((a, b) => a.price - b.price);

          allProviders.push({
            ...config,
            packages: validPackages,
            isFallback: false,
          });
          
          console.log(`✅ [MOBILE CABLE PACKAGES] ${config.name}: ${validPackages.length} packages loaded`);
        } else {
          console.warn(`⚠️ [MOBILE CABLE PACKAGES] Invalid response for ${config.name}`);
          // Use fallback packages
          const fallbackPackages = FALLBACK_PACKAGES[config.id] || [];
          allProviders.push({
            ...config,
            packages: fallbackPackages,
            isFallback: true,
          });
          errors.push(`${config.name}: Using fallback packages (Invalid response)`);
        }
      } catch (error) {
        console.error(`❌ [MOBILE CABLE PACKAGES] Error fetching ${config.name}:`, error);
        // Use fallback packages on error
        const fallbackPackages = FALLBACK_PACKAGES[config.id] || [];
        allProviders.push({
          ...config,
          packages: fallbackPackages,
          isFallback: true,
        });
        errors.push(`${config.name}: Using fallback packages (${error.message || 'Unknown error'})`);
      }
    }

    // 7. Format response for mobile
    let responseData;

    if (format === "mobile") {
      // Mobile-optimized format
      responseData = {
        providers: allProviders.map(provider => ({
          id: provider.id,
          name: provider.name,
          logo: provider.logo,
          color: provider.color,
          serviceId: provider.serviceId,
          isFallback: provider.isFallback || false,
          packages: provider.packages.map((pkg: any) => ({
            id: pkg.id,
            name: pkg.name,
            price: pkg.price,
            channels: pkg.channels,
            validity: pkg.validity,
            packageCode: pkg.packageCode,
            variationCode: pkg.variationCode,
            isPopular: pkg.isPopular || false,
            isBestValue: pkg.isBestValue || false,
            description: pkg.description || "",
          })),
        })),
        totalProviders: allProviders.length,
        totalPackages: allProviders.reduce((sum, p) => sum + p.packages.length, 0),
        source: allProviders.some(p => p.isFallback) ? "fallback" : "vtpass",
        serviceIdMap: SERVICE_ID_MAP,
        errors: errors.length > 0 ? errors : undefined,
      };
    } else {
      // Web format
      responseData = {
        providers: allProviders,
        totalProviders: allProviders.length,
        totalPackages: allProviders.reduce((sum, p) => sum + p.packages.length, 0),
        source: allProviders.some(p => p.isFallback) ? "fallback" : "vtpass",
      };
    }

    console.log(`✅ [MOBILE CABLE PACKAGES] Returning ${allProviders.length} providers with ${responseData.totalPackages} packages`);

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error: any) {
    console.error("❌ [MOBILE CABLE PACKAGES] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch cable packages",
      data: {
        providers: PROVIDER_CONFIGS.map(config => ({
          ...config,
          packages: FALLBACK_PACKAGES[config.id] || [],
          isFallback: true,
        })),
        totalProviders: PROVIDER_CONFIGS.length,
        totalPackages: Object.values(FALLBACK_PACKAGES).reduce((sum, p) => sum + p.length, 0),
        source: "fallback",
        error: error.message,
      },
    }, { status: 500 });
  }
}

// ✅ Handle OPTIONS for CORS preflight
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