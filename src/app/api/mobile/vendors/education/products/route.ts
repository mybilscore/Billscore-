// src/app/api/mobile/vendors/education/products/route.ts

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
    console.error("❌ [MOBILE EDUCATION PRODUCTS] Token verification failed:", error);
    return null;
  }
}

// ✅ Helper to format product name
function formatProductName(name: string): string {
  const cleanName = name
    .replace(" Payment", "")
    .replace(" PIN", "")
    .replace(" Registration", "")
    .replace(" Result Checker", "")
    .trim();
  
  const nameMap: Record<string, string> = {
    'WAEC': 'WAEC Registration',
    'WAEC Result Checker': 'WAEC Result Checker',
    'JAMB': 'JAMB PIN',
    'NECO': 'NECO Registration',
  };
  
  return nameMap[cleanName] || cleanName;
}

// ✅ Fallback Education Products
function getFallbackEducationProducts() {
  return [
    {
      id: "waec-registration",
      name: "WAEC Registration",
      serviceId: "waec-registration",
      variations: [
        { 
          id: "waec-registration", 
          name: "WASSCE Registration PIN", 
          price: 14450, 
          packageCode: "waec-registration",
          fixedPrice: true,
        },
      ],
      requiresProfileVerification: false,
    },
    {
      id: "waec",
      name: "WAEC Result Checker",
      serviceId: "waec",
      variations: [
        { 
          id: "waecdirect", 
          name: "WAEC Result Checker PIN", 
          price: 900, 
          packageCode: "waecdirect",
          fixedPrice: true,
        },
      ],
      requiresProfileVerification: false,
    },
    {
      id: "neco",
      name: "NECO Registration",
      serviceId: "neco",
      variations: [
        { 
          id: "neco-registration", 
          name: "NECO Registration PIN", 
          price: 2120, 
          packageCode: "neco-registration",
          fixedPrice: true,
        },
      ],
      requiresProfileVerification: false,
    },
    {
      id: "nabteb",
      name: "NABTEB Registration",
      serviceId: "nabteb",
      variations: [
        { 
          id: "nabteb-registration", 
          name: "NABTEB Registration PIN", 
          price: 860, 
          packageCode: "nabteb-registration",
          fixedPrice: true,
        },
      ],
      requiresProfileVerification: false,
    },
    {
      id: "jamb",
      name: "JAMB PIN",
      serviceId: "jamb",
      variations: [
        { 
          id: "utme-mock", 
          name: "UTME PIN (with mock)", 
          price: 7700, 
          packageCode: "utme-mock",
          fixedPrice: true,
        },
        { 
          id: "utme-no-mock", 
          name: "UTME PIN (without mock)", 
          price: 6200, 
          packageCode: "utme-no-mock",
          fixedPrice: true,
        },
      ],
      requiresProfileVerification: true,
    },
  ];
}

// ✅ Fetch Education Products dynamically from VTpass API
async function fetchEducationProductsFromVTpass(): Promise<any[]> {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction 
      ? "https://vtpass.com/api/service-categories"
      : "https://sandbox.vtpass.com/api/service-categories";
    
    console.log(`📡 [MOBILE EDUCATION PRODUCTS] Fetching service categories...`);
    
    const response = await fetch(baseUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ [MOBILE EDUCATION PRODUCTS] Failed to fetch service categories: ${response.status}`);
      return getFallbackEducationProducts();
    }

    const data = await response.json();
    
    if (data.response_description === "000" && data.content) {
      // Find education category
      const educationCategory = data.content.find(
        (cat: any) => cat.identifier === "education"
      );
      
      if (!educationCategory) {
        console.warn("⚠️ [MOBILE EDUCATION PRODUCTS] Education category not found");
        return getFallbackEducationProducts();
      }

      const isProductionServices = process.env.NODE_ENV === "production";
      const servicesUrl = isProductionServices
        ? "https://vtpass.com/api/services?identifier=education"
        : "https://sandbox.vtpass.com/api/services?identifier=education";
      
      console.log(`📡 [MOBILE EDUCATION PRODUCTS] Fetching education services...`);
      
      const servicesResponse = await fetch(servicesUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!servicesResponse.ok) {
        console.warn(`⚠️ [MOBILE EDUCATION PRODUCTS] Failed to fetch education services: ${servicesResponse.status}`);
        return getFallbackEducationProducts();
      }

      const servicesData = await servicesResponse.json();
      
      if (servicesData.response_description === "000" && servicesData.content) {
        // Fetch variations for each education product
        const products = [];
        
        for (const service of servicesData.content) {
          try {
            const variationResponse = await fetch(
              `${isProductionServices ? "https://vtpass.com" : "https://sandbox.vtpass.com"}/api/service-variations?serviceID=${service.serviceID}`,
              {
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );

            if (variationResponse.ok) {
              const variationData = await variationResponse.json();
              if (variationData.response_description === "000" && variationData.content?.variations) {
                const variations = variationData.content.variations.map((v: any) => ({
                  id: v.variation_code,
                  name: v.name,
                  price: parseFloat(v.variation_amount) || 0,
                  packageCode: v.variation_code,
                  serviceID: service.serviceID,
                  serviceName: service.name,
                  fixedPrice: v.fixedPrice === "Yes",
                }));
                
                // Filter out zero-price items
                const validVariations = variations.filter((v: any) => v.price > 0);
                
                if (validVariations.length > 0) {
                  // Get the service name from the service object
                  const serviceName = service.name || service.serviceID;
                  
                  // Map WAEC Result Checker to correct ID
                  let productId = service.serviceID;
                  if (serviceName.toLowerCase().includes('waec') && serviceName.toLowerCase().includes('result')) {
                    productId = 'waec';
                  } else if (serviceName.toLowerCase().includes('jamb')) {
                    productId = 'jamb';
                  } else if (serviceName.toLowerCase().includes('neco')) {
                    productId = 'neco';
                  } else if (serviceName.toLowerCase().includes('nabteb')) {
                    productId = 'nabteb';
                  }
                  
                  products.push({
                    id: productId,
                    name: formatProductName(serviceName),
                    serviceId: service.serviceID,
                    variations: validVariations,
                    requiresProfileVerification: service.serviceID === 'jamb',
                  });
                }
              }
            }
          } catch (error) {
            console.error(`❌ [MOBILE EDUCATION PRODUCTS] Error fetching variations for ${service.serviceID}:`, error);
          }
        }

        console.log(`✅ [MOBILE EDUCATION PRODUCTS] Fetched ${products.length} education products from API`);
        return products;
      }
    }

    console.warn("⚠️ [MOBILE EDUCATION PRODUCTS] Failed to parse VTpass response, using fallback");
    return getFallbackEducationProducts();
  } catch (error) {
    console.error("❌ [MOBILE EDUCATION PRODUCTS] Error:", error);
    return getFallbackEducationProducts();
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate mobile user
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      console.log("❌ [MOBILE EDUCATION PRODUCTS] Authentication failed");
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
        message: "Please login to access education products",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`👤 [MOBILE EDUCATION PRODUCTS] User authenticated: ${userId}`);

    // 2. Get query parameters
    const searchParams = new URL(request.url).searchParams;
    const format = searchParams.get("format") || "mobile";
    const refresh = searchParams.get("refresh") === "true";

    // 3. Fetch education products from VTpass (or use cache if available)
    console.log(`📡 [MOBILE EDUCATION PRODUCTS] Fetching education products${refresh ? ' (force refresh)' : ''}...`);
    const products = await fetchEducationProductsFromVTpass();

    // 4. Format response for mobile
    let responseData;

    if (format === "mobile") {
      // Mobile-optimized format
      responseData = {
        products: products.map((product: any) => ({
          id: product.id,
          name: product.name,
          serviceId: product.serviceId,
          requiresProfileVerification: product.requiresProfileVerification || false,
          variations: product.variations.map((v: any) => ({
            id: v.id,
            name: v.name,
            price: v.price,
            packageCode: v.packageCode,
            fixedPrice: v.fixedPrice || false,
          })),
        })),
        total: products.length,
        source: products.some((p: any) => p.isFromVTpass) ? "vtpass" : "fallback",
        lastUpdated: new Date().toISOString(),
      };
    } else {
      // Web format
      responseData = {
        products: products,
        total: products.length,
        source: products.some((p: any) => p.isFromVTpass) ? "vtpass" : "fallback",
      };
    }

    console.log(`✅ [MOBILE EDUCATION PRODUCTS] Returning ${products.length} education products`);

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error: any) {
    console.error("❌ [MOBILE EDUCATION PRODUCTS] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch education products",
      data: {
        products: getFallbackEducationProducts(),
        total: 0,
        source: "fallback",
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