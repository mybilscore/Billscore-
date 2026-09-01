// app/dashboard/buy/education/page.tsx - Updated to get actual variation codes from VTpass

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { EducationClient } from "./page.client";

// Helper function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

// ✅ Fetch Education Products dynamically from VTpass API with correct variation codes
async function fetchEducationProductsFromVTpass(): Promise<any[]> {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction 
      ? "https://vtpass.com/api"
      : "https://sandbox.vtpass.com/api";
    
    const apiKey = process.env.VTPASS_SANDBOX_API_KEY || process.env.VTPASS_LIVE_API_KEY;
    const secretKey = process.env.VTPASS_SANDBOX_SECRET_KEY || process.env.VTPASS_LIVE_SECRET_KEY;
    const publicKey = process.env.VTPASS_SANDBOX_PUBLIC_KEY || process.env.VTPASS_LIVE_PUBLIC_KEY;
    
    // ✅ Fetch service categories
    const categoriesUrl = `${baseUrl}/service-categories`;
    console.log(`📡 [EDUCATION] Fetching service categories from: ${categoriesUrl}`);
    
    const categoriesResponse = await fetch(categoriesUrl, {
      headers: {
        "api-key": apiKey || '',
        "secret-key": secretKey || '',
        "public-key": publicKey || '',
        "Content-Type": "application/json",
      },
    });

    if (!categoriesResponse.ok) {
      console.warn(`Failed to fetch service categories: ${categoriesResponse.status}`);
      return getFallbackEducationProducts();
    }

    const categoriesData = await categoriesResponse.json();
    
    if (categoriesData.response_description === "000" && categoriesData.content) {
      // Find education category
      const educationCategory = categoriesData.content.find(
        (cat: any) => cat.identifier === "education" || cat.name?.toLowerCase().includes("education")
      );
      
      if (!educationCategory) {
        console.warn("Education category not found in VTpass response");
        return getFallbackEducationProducts();
      }

      // ✅ Fetch services in education category
      const servicesUrl = `${baseUrl}/services?identifier=education`;
      console.log(`📡 [EDUCATION] Fetching education services from: ${servicesUrl}`);
      
      const servicesResponse = await fetch(servicesUrl, {
        headers: {
          "api-key": apiKey || '',
          "secret-key": secretKey || '',
          "public-key": publicKey || '',
          "Content-Type": "application/json",
        },
      });

      if (!servicesResponse.ok) {
        console.warn(`Failed to fetch education services: ${servicesResponse.status}`);
        return getFallbackEducationProducts();
      }

      const servicesData = await servicesResponse.json();
      
      if (servicesData.response_description === "000" && servicesData.content) {
        const products = [];
        
        // ✅ Fetch variations for each education product
        for (const service of servicesData.content) {
          // ✅ Skip if service is not a valid education product
          if (!service.serviceID || service.serviceID === 'bulk' || service.serviceID === 'test') {
            continue;
          }
          
          const variationUrl = `${baseUrl}/service-variations?serviceID=${service.serviceID}`;
          console.log(`📡 [EDUCATION] Fetching variations for ${service.serviceID} from: ${variationUrl}`);
          
          const variationResponse = await fetch(variationUrl, {
            headers: {
              "api-key": apiKey || '',
              "secret-key": secretKey || '',
              "public-key": publicKey || '',
              "Content-Type": "application/json",
            },
          });

          if (variationResponse.ok) {
            const variationData = await variationResponse.json();
            if (variationData.response_description === "000" && variationData.content?.variations) {
              const variations = variationData.content.variations.map((v: any) => ({
                id: v.variation_code,
                name: v.name || v.variation_code,
                price: parseFloat(v.variation_amount) || 0,
                packageCode: v.variation_code,
                serviceID: service.serviceID,
                serviceName: service.name,
                fixedPrice: v.fixedPrice === "Yes",
              }));
              
              // Filter out zero-price items
              const validVariations = variations.filter((v: any) => v.price > 0);
              
              if (validVariations.length > 0) {
                products.push({
                  id: service.serviceID,
                  name: formatProductName(service.name || service.serviceID),
                  serviceId: service.serviceID,
                  variations: validVariations,
                  requiresProfileVerification: service.serviceID === 'jamb',
                });
                console.log(`✅ [EDUCATION] Added ${service.serviceID} with ${validVariations.length} variations`);
              }
            }
          }
        }

        if (products.length > 0) {
          console.log(`✅ [EDUCATION] Fetched ${products.length} education products from API`);
          return products;
        }
      }
    }

    console.warn("Failed to parse VTpass response, using fallback education products");
    return getFallbackEducationProducts();
  } catch (error) {
    console.error("❌ Error fetching education products from VTpass:", error);
    return getFallbackEducationProducts();
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
  
  // Map common names
  const nameMap: Record<string, string> = {
    'WAEC': 'WAEC Registration',
    'WAEC Result Checker': 'WAEC Result Checker',
    'JAMB': 'JAMB PIN',
    'NECO': 'NECO Registration',
  };
  
  return nameMap[cleanName] || cleanName;
}

// ✅ Fallback Education Products with correct VTpass variation codes
function getFallbackEducationProducts() {
  return [
    {
      id: "waec",
      name: "WAEC Result Checker",
      serviceId: "waec",
      variations: [
        { 
          id: "waec", 
          name: "WAEC Result Checker PIN", 
          price: 900, 
          packageCode: "waec" 
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
          id: "jamb", 
          name: "JAMB UTME PIN (without mock)", 
          price: 6200, 
          packageCode: "jamb" 
        },
        { 
          id: "jamb-mock", 
          name: "JAMB UTME PIN (with mock)", 
          price: 7700, 
          packageCode: "jamb-mock" 
        },
      ],
      requiresProfileVerification: true,
    },
  ];
}

export default async function EducationPage() {
  console.log("📚 [EDUCATION] Starting education page load...");
  
  const sessionUser = await requireAuth("/auth/sign-in");
  console.log(`👤 [EDUCATION] User authenticated: ${sessionUser.id}`);

  // Fetch user with wallet
  let user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      wallet: true,
    },
  });

  if (!user) {
    console.error("❌ [EDUCATION] User not found!");
    return null;
  }

  // Safely get wallet data with Decimal conversion
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

  console.log(`📊 [EDUCATION] Final wallet state: hasWallet=${hasWallet}, balance=${walletBalance}`);

  // ✅ Fetch Education Products dynamically from VTpass
  console.log("📡 [EDUCATION] Fetching education products from VTpass API...");
  const products = await fetchEducationProductsFromVTpass();
  console.log(`✅ [EDUCATION] Loaded ${products.length} education products`);

  // Prepare user data for the client
  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email || "",
    phone: user.phone,
    role: user.role,
    hasWallet: hasWallet,
    walletBalance: walletBalance,
  };

  console.log(`📤 [EDUCATION] Sending data to client: hasWallet=${userData.hasWallet}, balance=${userData.walletBalance}`);
  console.log("✅ [EDUCATION] Education page load complete!");

  return (
    <EducationClient
      user={userData}
      products={products}
    />
  );
}