// app/dashboard/buy/education/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { EducationClient } from "./page.client";

// Helper function to generate virtual account number
function generateVirtualAccountNumber(): string {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

// ✅ Fetch Education Products dynamically from VTpass API
async function fetchEducationProductsFromVTpass(): Promise<any[]> {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction 
      ? "https://vtpass.com/api/service-categories"
      : "https://sandbox.vtpass.com/api/service-categories";
    
    const response = await fetch(baseUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch service categories: ${response.status}`);
      return getFallbackEducationProducts();
    }

    const data = await response.json();
    
    if (data.response_description === "000" && data.content) {
      // Find education category
      const educationCategory = data.content.find(
        (cat: any) => cat.identifier === "education"
      );
      
      if (!educationCategory) {
        console.warn("Education category not found in VTpass response");
        return getFallbackEducationProducts();
      }

      const isProductionServices = process.env.NODE_ENV === "production";
      const servicesUrl = isProductionServices
        ? "https://vtpass.com/api/services?identifier=education"
        : "https://sandbox.vtpass.com/api/services?identifier=education";
      
      const servicesResponse = await fetch(servicesUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!servicesResponse.ok) {
        console.warn(`Failed to fetch education services: ${servicesResponse.status}`);
        return getFallbackEducationProducts();
      }

      const servicesData = await servicesResponse.json();
      
      if (servicesData.response_description === "000" && servicesData.content) {
        // Fetch variations for each education product
        const products = [];
        
        for (const service of servicesData.content) {
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
                products.push({
                  id: service.serviceID,
                  name: this.formatProductName(service.name || service.serviceID),
                  serviceId: service.serviceID,
                  variations: validVariations,
                  // ✅ For JAMB, mark that it requires profile verification
                  requiresProfileVerification: service.serviceID === 'jamb',
                });
              }
            }
          }
        }

        console.log(`✅ [VTpass] Fetched ${products.length} education products from API`);
        return products;
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
          packageCode: "waec-registration" 
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
          packageCode: "waecdirect" 
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
          packageCode: "utme-mock" 
        },
        { 
          id: "utme-no-mock", 
          name: "UTME PIN (without mock)", 
          price: 6200, 
          packageCode: "utme-no-mock" 
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

  console.log(`✅ [EDUCATION] User found: ${user.id}`);
  console.log(`📋 [EDUCATION] User hasWallet flag: ${user.hasWallet}`);

  if (user.wallet) {
    console.log(`💰 [EDUCATION] Wallet found - Balance: ${user.wallet.walletBalance}`);
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
  } else if (user.hasWallet) {
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