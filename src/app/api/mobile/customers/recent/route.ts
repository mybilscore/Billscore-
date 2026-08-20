// src/app/api/mobile/customers/recent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/db";

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
    console.error("❌ [MOBILE CUSTOMERS] Token verification failed:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate mobile user
    const decoded = await authenticateMobile(request);
    if (!decoded) {
      console.log("❌ [MOBILE CUSTOMERS] Authentication failed");
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
        message: "Please login to view recent customers",
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`👤 [MOBILE CUSTOMERS] User authenticated: ${userId}`);

    // 2. Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || ""; // 'airtime', 'data', 'electricity', 'cable', 'all'

    console.log(`📊 [MOBILE CUSTOMERS] Fetching recent customers: limit=${limit}, search="${search}", type="${type}"`);

    // 3. Get user's recent transactions
    const transactions = await prisma.vtuTransaction.findMany({
      where: {
        userId: userId,
        status: "SUCCESS",
        ...(type !== "all" && type !== "" ? {
          transactionType: type.toUpperCase(),
        } : {}),
      },
      select: {
        phoneNumber: true,
        network: true,
        meterNumber: true,
        smartCardNumber: true,
        transactionType: true,
        amount: true,
        totalDebited: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      distinct: ["phoneNumber", "meterNumber", "smartCardNumber"],
      take: limit * 2, // Get more to filter and deduplicate
    });

    // 4. Extract unique customers from transactions
    const customerMap = new Map();

    transactions.forEach((tx) => {
      // Determine the identifier (phone number, meter number, or smart card number)
      let identifier = tx.phoneNumber || tx.meterNumber || tx.smartCardNumber;
      if (!identifier) return;

      // For electricity, use meter number
      if (tx.transactionType === "ELECTRICITY_INSTANT" || tx.transactionType === "ELECTRICITY_PREORDER") {
        identifier = tx.meterNumber || identifier;
      }
      // For cable, use smart card number
      if (tx.transactionType === "CABLE_TV") {
        identifier = tx.smartCardNumber || identifier;
      }

      if (!customerMap.has(identifier)) {
        customerMap.set(identifier, {
          id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          phoneNumber: tx.phoneNumber || null,
          meterNumber: tx.meterNumber || null,
          smartCardNumber: tx.smartCardNumber || null,
          network: tx.network || null,
          transactionType: tx.transactionType || null,
          amount: tx.amount || 0,
          totalSpent: tx.totalDebited || tx.amount || 0,
          transactionCount: 1,
          lastTransactionAt: tx.createdAt,
          firstTransactionAt: tx.createdAt,
        });
      } else {
        const existing = customerMap.get(identifier);
        existing.totalSpent += (tx.totalDebited || tx.amount || 0);
        existing.transactionCount += 1;
        if (new Date(tx.createdAt) > new Date(existing.lastTransactionAt)) {
          existing.lastTransactionAt = tx.createdAt;
        }
        if (new Date(tx.createdAt) < new Date(existing.firstTransactionAt)) {
          existing.firstTransactionAt = tx.createdAt;
        }
      }
    });

    // 5. Get customer names from saved contacts or customers table
    const customers = await Promise.all(
      Array.from(customerMap.values()).map(async (customer) => {
        // Try to find customer in Customer table
        let fullName = null;
        let customerType = "REGULAR";
        let isFavorite = false;

        // Search for customer by phone number
        if (customer.phoneNumber) {
          const customerRecord = await prisma.customer.findFirst({
            where: {
              phone: customer.phoneNumber,
            },
            select: {
              fullName: true,
              customerType: true,
              tags: true,
            },
          });

          if (customerRecord) {
            fullName = customerRecord.fullName;
            customerType = customerRecord.customerType || "REGULAR";
            isFavorite = customerRecord.tags?.includes("FAVORITE") || false;
          }
        }

        // If still no name, check saved decoders or meters
        if (!fullName) {
          if (customer.smartCardNumber) {
            const decoder = await prisma.savedDecoder.findFirst({
              where: {
                userId: userId,
                decoderNumber: customer.smartCardNumber,
              },
              select: {
                name: true,
                provider: true,
              },
            });
            if (decoder) {
              fullName = decoder.name || decoder.provider || null;
            }
          }

          if (!fullName && customer.meterNumber) {
            const meter = await prisma.savedMeter.findFirst({
              where: {
                userId: userId,
                meterNumber: customer.meterNumber,
              },
              select: {
                name: true,
                disco: true,
              },
            });
            if (meter) {
              fullName = meter.name || meter.disco || null;
            }
          }
        }

        return {
          id: customer.id,
          phone: customer.phoneNumber || customer.meterNumber || customer.smartCardNumber || "Unknown",
          fullName: fullName,
          totalTransactions: customer.transactionCount,
          totalSpent: customer.totalSpent,
          lastTransactionAt: customer.lastTransactionAt,
          firstTransactionAt: customer.firstTransactionAt,
          customerType: customerType,
          isFavorite: isFavorite,
          network: customer.network,
          transactionType: customer.transactionType,
          identifier: customer.phoneNumber || customer.meterNumber || customer.smartCardNumber,
        };
      })
    );

    // 6. Filter by search term if provided
    let filteredCustomers = customers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCustomers = customers.filter(c => 
        c.phone.includes(searchLower) || 
        (c.fullName && c.fullName.toLowerCase().includes(searchLower))
      );
    }

    // 7. Sort by last transaction date (most recent first)
    filteredCustomers.sort((a, b) => {
      return new Date(b.lastTransactionAt).getTime() - new Date(a.lastTransactionAt).getTime();
    });

    // 8. Limit results
    const limitedCustomers = filteredCustomers.slice(0, limit);

    console.log(`✅ [MOBILE CUSTOMERS] Found ${limitedCustomers.length} recent customers`);

    return NextResponse.json({
      success: true,
      data: {
        customers: limitedCustomers,
        total: limitedCustomers.length,
        limit: limit,
        search: search || "",
        type: type || "all",
      },
      message: "Recent customers fetched successfully",
    });

  } catch (error: any) {
    console.error("❌ [MOBILE CUSTOMERS] Error:", error);
    
    if (error.message?.includes("fetch") || error.message?.includes("network")) {
      return NextResponse.json({
        success: false,
        error: "Network error. Please check your internet connection and try again.",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch recent customers. Please try again.",
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