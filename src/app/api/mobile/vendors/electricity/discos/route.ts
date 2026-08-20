// src/app/api/mobile/vendors/electricity/discos/route.ts

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
    console.error("❌ [MOBILE DISCOS] Token verification failed:", error);
    return null;
  }
}

// ✅ Fallback DisCos
function getFallbackDiscos() {
  return [
    {
      id: "ikeja",
      name: "Ikeja Electric",
      code: "IKEJA",
      region: "Lagos",
      logo: "⚡",
      color: "#FF6B00",
      meterTypes: ["Prepaid", "Postpaid"],
      serviceID: "ikeja-electric",
    },
    {
      id: "eko",
      name: "Eko Electric",
      code: "EKO",
      region: "Lagos",
      logo: "🔌",
      color: "#00A3E0",
      meterTypes: ["Prepaid", "Postpaid"],
      serviceID: "eko-electric",
    },
    {
      id: "abuja",
      name: "Abuja Electric",
      code: "ABUJA",
      region: "FCT",
      logo: "💡",
      color: "#8B0000",
      meterTypes: ["Prepaid", "Postpaid"],
      serviceID: "abuja-electric",
    },
    {
      id: "kano",
      name: "Kano Electric",
      code: "KANO",
      region: "Kano",
      logo: "🔋",
      color: "#008000",
      meterTypes: ["Prepaid"],
      serviceID: "kano-electric",
    },
    {
      id: "portharcourt",
      name: "Port Harcourt Electric",
      code: "PORTHARCOURT",
      region: "Rivers",
      logo: "💡",
      color: "#FFD700",
      meterTypes: ["Prepaid", "Postpaid"],
      serviceID: "portharcourt-electric",
    },
    {
      id: "jos",
      name: "Jos Electric",
      code: "JOS",
      region: "Plateau",
      logo: "⚡",
      color: "#8B4513",
      meterTypes: ["Prepaid"],
      serviceID: "jos-electric",
    },
    {
      id: "ibadan",
      name: "Ibadan Electric",
      code: "IBADAN",
      region: "Oyo",
      logo: "💡",
      color: "#FF4500",
      meterTypes: ["Prepaid"],
      serviceID: "ibadan-electric",
    },
    {
      id: "kaduna",
      name: "Kaduna Electric",
      code: "KADUNA",
      region: "Kaduna",
      logo: "🔌",
      color: "#4B0082",
      meterTypes: ["Prepaid"],
      serviceID: "kaduna-electric",
    },
    {
      id: "benin",
      name: "Benin Electric",
      code: "BENIN",
      region: "Edo",
      logo: "🔌",
      color: "#4B0082",
      meterTypes: ["Prepaid", "Postpaid"],
      serviceID: "benin-electric",
    },
    {
      id: "enugu",
      name: "Enugu Electric",
      code: "ENUGU",
      region: "Enugu",
      logo: "💡",
      color: "#8B4513",
      meterTypes: ["Prepaid", "Postpaid"],
      serviceID: "enugu-electric",
    },
  ];
}

// ✅ Fetch DisCos dynamically from VTpass API
async function fetchDiscosFromVTpass(): Promise<any[]> {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction 
      ? "https://vtpass.com/api/service-categories"
      : "https://sandbox.vtpass.com/api/service-categories";
    
    console.log(`📡 [MOBILE DISCOS] Fetching service categories from VTpass...`);
    
    const response = await fetch(baseUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ [MOBILE DISCOS] Failed to fetch service categories: ${response.status}`);
      return getFallbackDiscos();
    }

    const data = await response.json();
    
    if (data.response_description === "000" && data.content) {
      // Find electricity category
      const electricityCategory = data.content.find(
        (cat: any) => cat.identifier === "electricity-bill"
      );
      
      if (!electricityCategory) {
        console.warn("⚠️ [MOBILE DISCOS] Electricity category not found in VTpass response");
        return getFallbackDiscos();
      }

      // Fetch electricity services
      const isProductionServices = process.env.NODE_ENV === "production";
      const servicesUrl = isProductionServices
        ? "https://vtpass.com/api/services?identifier=electricity-bill"
        : "https://sandbox.vtpass.com/api/services?identifier=electricity-bill";
      
      console.log(`📡 [MOBILE DISCOS] Fetching electricity services...`);
      
      const servicesResponse = await fetch(servicesUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!servicesResponse.ok) {
        console.warn(`⚠️ [MOBILE DISCOS] Failed to fetch electricity services: ${servicesResponse.status}`);
        return getFallbackDiscos();
      }

      const servicesData = await servicesResponse.json();
      
      if (servicesData.response_description === "000" && servicesData.content) {
        const discos = servicesData.content.map((service: any) => {
          let code = service.serviceID || "";
          let name = service.name || "";
          code = code.replace("-electric", "").toUpperCase();
          const displayName = name.replace(" Payment", "").replace(" Distribution Company", "").replace("Electricity", "").trim();
          
          // Determine region
          let region = "Nigeria";
          if (name.includes("Abuja")) region = "FCT";
          else if (name.includes("Ikeja") || name.includes("Lagos") || name.includes("Eko")) region = "Lagos";
          else if (name.includes("Kano")) region = "Kano";
          else if (name.includes("Port Harcourt")) region = "Rivers";
          else if (name.includes("Jos")) region = "Plateau";
          else if (name.includes("Ibadan")) region = "Oyo";
          else if (name.includes("Kaduna")) region = "Kaduna";
          else if (name.includes("Benin")) region = "Edo";
          else if (name.includes("Enugu")) region = "Enugu";
          
          const logoMap: Record<string, string> = {
            "IKEJA": "⚡",
            "EKO": "🔌",
            "ABUJA": "💡",
            "KANO": "🔋",
            "PHCN": "⚡",
            "IBADAN": "💡",
            "BENIN": "🔌",
            "ENUGU": "💡",
            "JOS": "⚡",
            "PORT_HARCOURT": "💡",
            "KADUNA": "🔌",
            "DEFAULT": "⚡",
          };
          
          const colorMap: Record<string, string> = {
            "IKEJA": "#FF6B00",
            "EKO": "#00A3E0",
            "ABUJA": "#8B0000",
            "KANO": "#008000",
            "PHCN": "#FFD700",
            "IBADAN": "#FF4500",
            "BENIN": "#4B0082",
            "ENUGU": "#8B4513",
            "JOS": "#8B4513",
            "PORT_HARCOURT": "#FFD700",
            "KADUNA": "#4B0082",
            "DEFAULT": "#1e293b",
          };

          const meterTypes = ["Prepaid", "Postpaid"];
          
          return {
            id: code.toLowerCase(),
            name: displayName || code,
            code: code,
            region: region,
            logo: logoMap[code] || logoMap["DEFAULT"],
            color: colorMap[code] || colorMap["DEFAULT"],
            meterTypes: meterTypes,
            serviceID: service.serviceID,
            isFromVTpass: true,
          };
        });

        const validDiscos = discos
          .filter((d: any) => d.code && d.code.length > 1)
          .sort((a: any, b: any) => a.name.localeCompare(b.name));

        console.log(`✅ [MOBILE DISCOS] Fetched ${validDiscos.length} DisCos from VTpass API`);
        return validDiscos;
      }
    }

    console.warn("⚠️ [MOBILE DISCOS] Failed to parse VTpass response, using fallback discos");
    return getFallbackDiscos();
  } catch (error) {
    console.error("❌ [MOBILE DISCOS] Error fetching DisCos from VTpass:", error);
    return getFallbackDiscos();
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate mobile user
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      console.log("❌ [MOBILE DISCOS] Authentication failed");
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
        message: "Please login to access DisCos",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`👤 [MOBILE DISCOS] User authenticated: ${userId}`);

    // 2. Get query parameters
    const searchParams = new URL(request.url).searchParams;
    const format = searchParams.get("format") || "mobile";
    const refresh = searchParams.get("refresh") === "true";

    // 3. Fetch DisCos from VTpass (or use cache if available)
    console.log(`📡 [MOBILE DISCOS] Fetching DisCos${refresh ? ' (force refresh)' : ''}...`);
    const discos = await fetchDiscosFromVTpass();

    // 4. Format response for mobile
    let responseData;

    if (format === "mobile") {
      // Mobile-optimized format
      responseData = {
        discos: discos.map((disco: any) => ({
          id: disco.id,
          name: disco.name,
          code: disco.code,
          region: disco.region,
          logo: disco.logo,
          color: disco.color,
          meterTypes: disco.meterTypes,
          serviceID: disco.serviceID,
          isFromVTpass: disco.isFromVTpass || false,
        })),
        total: discos.length,
        source: discos.some((d: any) => d.isFromVTpass) ? "vtpass" : "fallback",
        lastUpdated: new Date().toISOString(),
      };
    } else {
      // Web format
      responseData = {
        discos: discos,
        total: discos.length,
        source: discos.some((d: any) => d.isFromVTpass) ? "vtpass" : "fallback",
      };
    }

    console.log(`✅ [MOBILE DISCOS] Returning ${discos.length} DisCos`);

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error: any) {
    console.error("❌ [MOBILE DISCOS] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch DisCos",
      data: {
        discos: getFallbackDiscos(),
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