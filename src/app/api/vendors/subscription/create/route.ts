// app/api/vendors/subscription/create/route.ts
// COMPLETE UPDATED WITH YOLA SUPPORT

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { 
  MeterType, 
  TokenStatus, 
  TransactionStatus, 
  PreOrderStatus, 
  WalletTransactionType, 
  VtuType,
  ChannelType,       
  WalletCategory,    
  TokenType,         
  DeliveryChannel,   
  JobType,           
  JobStatus,
  DisCo,
  VtuVendor,
  CustomerType,
  RefundStatus,
} from "@prisma/client";
import { compare } from "bcrypt";
import { CacheService } from "~/lib/cache/cache.service";

// ============================================================
// MINIMAL LOGGING
// ============================================================

const isDev = process.env.NODE_ENV === 'development';
const isDebug = process.env.DEBUG === 'true';

function log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  if (level === 'error') {
    console.error(`❌ ${message}`, data || '');
    return;
  }
  if (level === 'warn') {
    console.warn(`⚠️ ${message}`, data || '');
    return;
  }
  if (!isDev && !isDebug) return;
  console.log(`✅ ${message}`, data || '');
}

// ============================================================
// DISCO MAPPING - COMPLETE WITH YOLA
// ============================================================

function mapDiscoCode(discoCode: string | null | undefined): DisCo | null {
  if (!discoCode) return null;
  
  // Normalize: trim, uppercase, remove special characters
  const normalized = discoCode.toString().toUpperCase().trim();
  
  // ============================================================
  // DIRECT MAPPING - Exact matches
  // ============================================================
  const exactMap: Record<string, DisCo> = {
    'ABUJA': DisCo.ABUJA,
    'IKEJA': DisCo.IKEJA,
    'EKO': DisCo.EKO,
    'BENIN': DisCo.BENIN,
    'ENUGU': DisCo.ENUGU,
    'IBADAN': DisCo.IBADAN,
    'JOS': DisCo.JOS,
    'KANO': DisCo.KANO,
    'PORT_HARCOURT': DisCo.PORT_HARCOURT,
    'PORTHARCOURT': DisCo.PORT_HARCOURT,
    'KADUNA': DisCo.KADUNA,
    'YOLA': DisCo.YOLA, // ✅ Added YOLA
  };
  
  if (exactMap[normalized]) {
    return exactMap[normalized];
  }
  
  // ============================================================
  // ACRONYM MAPPING - Common abbreviations
  // ============================================================
  const acronymMap: Record<string, DisCo> = {
    'AEDC': DisCo.ABUJA,
    'IKEDC': DisCo.IKEJA,
    'EKEDC': DisCo.EKO,
    'BEDC': DisCo.BENIN,
    'EEDC': DisCo.ENUGU,
    'IBEDC': DisCo.IBADAN,
    'JED': DisCo.JOS,
    'JEDC': DisCo.JOS,
    'KEDCO': DisCo.KANO,
    'PHED': DisCo.PORT_HARCOURT,
    'PHEDC': DisCo.PORT_HARCOURT,
    'KAEDCO': DisCo.KADUNA,
    'KEDC': DisCo.KANO,
    'YEDC': DisCo.YOLA, // ✅ Added YEDC acronym
  };
  
  if (acronymMap[normalized]) {
    return acronymMap[normalized];
  }
  
  // ============================================================
  // PARTIAL MATCH - Contains keyword
  // ============================================================
  const partialMap: Record<string, DisCo> = {
    'ABUJA': DisCo.ABUJA,
    'IKEJA': DisCo.IKEJA,
    'EKO': DisCo.EKO,
    'BENIN': DisCo.BENIN,
    'ENUGU': DisCo.ENUGU,
    'IBADAN': DisCo.IBADAN,
    'JOS': DisCo.JOS,
    'KANO': DisCo.KANO,
    'PORT': DisCo.PORT_HARCOURT,
    'HARCOURT': DisCo.PORT_HARCOURT,
    'RIVERS': DisCo.PORT_HARCOURT,
    'KADUNA': DisCo.KADUNA,
    'SOKOTO': DisCo.KADUNA,
    'KEBBI': DisCo.KADUNA,
    'ZAMFARA': DisCo.KADUNA,
    'YOLA': DisCo.YOLA, // ✅ Added YOLA partial match
    'ADAMAWA': DisCo.YOLA, // ✅ Added Adamawa state mapping
  };
  
  for (const [key, value] of Object.entries(partialMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // ============================================================
  // REGION MAPPING - Map cities/states to DisCos
  // ============================================================
  const regionMap: Record<string, DisCo> = {
    // Eko (Lagos Island)
    'LAGOS': DisCo.EKO,
    'VI': DisCo.EKO,
    'IKOYI': DisCo.EKO,
    'SURULERE': DisCo.EKO,
    'BADAGRY': DisCo.EKO,
    'APAPA': DisCo.EKO,
    'MARINA': DisCo.EKO,
    
    // Ikeja (Lagos Mainland)
    'MAINLAND': DisCo.IKEJA,
    'YABA': DisCo.IKEJA,
    'MARYLAND': DisCo.IKEJA,
    'IKEJA': DisCo.IKEJA,
    'OGBA': DisCo.IKEJA,
    'AGEGE': DisCo.IKEJA,
    
    // Abuja
    'ABUJA': DisCo.ABUJA,
    'NIGER': DisCo.ABUJA,
    'NASARAWA': DisCo.ABUJA,
    'KOGI': DisCo.ABUJA,
    'GWAGWALADA': DisCo.ABUJA,
    'KUBWA': DisCo.ABUJA,
    'BWARI': DisCo.ABUJA,
    
    // Ibadan
    'IBADAN': DisCo.IBADAN,
    'OGUN': DisCo.IBADAN,
    'OYO': DisCo.IBADAN,
    'OSUN': DisCo.IBADAN,
    'KWARA': DisCo.IBADAN,
    
    // Benin
    'BENIN': DisCo.BENIN,
    'ONDO': DisCo.BENIN,
    'EKITI': DisCo.BENIN,
    'DELTA': DisCo.BENIN,
    'EDO': DisCo.BENIN,
    'ASABA': DisCo.BENIN,
    'WARRI': DisCo.BENIN,
    
    // Enugu
    'ENUGU': DisCo.ENUGU,
    'ANAMBRA': DisCo.ENUGU,
    'IMO': DisCo.ENUGU,
    'ABIA': DisCo.ENUGU,
    'EBONYI': DisCo.ENUGU,
    'AWKA': DisCo.ENUGU,
    'UMUAHIA': DisCo.ENUGU,
    'OWERRI': DisCo.ENUGU,
    
    // Jos & Yola
    'JOS': DisCo.JOS,
    'PLATEAU': DisCo.JOS,
    'BAUCHI': DisCo.JOS,
    'GOMBE': DisCo.JOS,
    'TARABA': DisCo.JOS,
    'ADAMAWA': DisCo.YOLA, // ✅ Adamawa now maps to YOLA
    'YOLA': DisCo.YOLA, // ✅ YOLA city
    'JALINGO': DisCo.JOS,
    
    // Kano
    'KANO': DisCo.KANO,
    'KATSINA': DisCo.KANO,
    'JIGAWA': DisCo.KANO,
    
    // Port Harcourt
    'PORT': DisCo.PORT_HARCOURT,
    'HARCOURT': DisCo.PORT_HARCOURT,
    'RIVERS': DisCo.PORT_HARCOURT,
    'BAYELSA': DisCo.PORT_HARCOURT,
    'CROSS RIVER': DisCo.PORT_HARCOURT,
    'AKWA IBOM': DisCo.PORT_HARCOURT,
    'CALABAR': DisCo.PORT_HARCOURT,
    'UYO': DisCo.PORT_HARCOURT,
    'YENAGOA': DisCo.PORT_HARCOURT,
    
    // Kaduna
    'KADUNA': DisCo.KADUNA,
    'SOKOTO': DisCo.KADUNA,
    'KEBBI': DisCo.KADUNA,
    'ZAMFARA': DisCo.KADUNA,
    'ZARIA': DisCo.KADUNA,
  };
  
  for (const [key, value] of Object.entries(regionMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // ============================================================
  // LOGGING for debugging
  // ============================================================
  log('warn', `⚠️ [DisCo Mapping] Could not map "${discoCode}" (normalized: "${normalized}")`);
  
  return null;
}

function mapVendorToEnum(vendorCode: string | undefined): VtuVendor | null {
  if (!vendorCode) return null;
  const normalized = vendorCode.toUpperCase();
  const vendorMap: Record<string, VtuVendor> = {
    'VTPASS': VtuVendor.VTPASS,
    'GIDIGITAL': VtuVendor.GIDIGITAL,
    'MONIEPOINT': VtuVendor.MONIEPOINT,
    'FLUTTERWAVE_VTU': VtuVendor.FLUTTERWAVE_VTU,
    'QUICKTELLER': VtuVendor.QUICKTELLER,
    'BILAL_SADA': VtuVendor.BILAL_SADA,
    'LEGITDATAWAY': VtuVendor.VTPASS,
    'BILALSADA': VtuVendor.BILAL_SADA,
  };
  return vendorMap[normalized] || null;
}

// ============================================================
// SAVE METER HELPER
// ============================================================

async function saveMeterAsync(
  userId: string, 
  meterNumber: string, 
  disco: string, 
  meterType: string,
  customerName?: string,
  customerAddress?: string,
  customerPhone?: string,
  customerEmail?: string,
  meterStatus?: string,
  lastVerified?: Date
) {
  try {
    const existing = await prisma.savedMeter.findFirst({
      where: { userId, meterNumber },
    });

    const data = {
      userId,
      meterNumber,
      disco: disco.toUpperCase(),
      meterType: meterType || "Prepaid",
      customerName: customerName || null,
      customerAddress: customerAddress || null,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      meterStatus: meterStatus || null,
      lastVerified: lastVerified || new Date(),
      isDefault: existing?.isDefault || false,
    };

    if (existing) {
      await prisma.savedMeter.update({
        where: { id: existing.id },
        data: {
          disco: disco.toUpperCase(),
          meterType: meterType || "Prepaid",
          customerName: customerName || existing.customerName,
          customerAddress: customerAddress || existing.customerAddress,
          customerPhone: customerPhone || existing.customerPhone,
          customerEmail: customerEmail || existing.customerEmail,
          meterStatus: meterStatus || existing.meterStatus,
          lastVerified: lastVerified || new Date(),
        },
      });
      log('info', `✅ Meter updated with customer info: ${meterNumber} - ${customerName || 'No name'}`);
    } else {
      await prisma.savedMeter.create({ data });
      log('info', `✅ Meter saved with customer info: ${meterNumber} - ${customerName || 'No name'}`);
    }

    await CacheService.invalidateSavedMeters(userId).catch(() => {});
  } catch (error) {
    log('error', '❌ Failed to save meter:', error);
  }
}

// ============================================================
// MAIN API ROUTE
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const sessionUser = await requireAuth("/auth/sign-in");
    const body = await request.json();
    const { 
      meterNumber, 
      discoCode, 
      amount, 
      deliveryDate, 
      pin,
      customerName,
      customerAddress,
      customerPhone,
      customerEmail,
      meterStatus,
    } = body;

    // ============================================================
    // STATIC CHANNEL
    // ============================================================
    const CHANNEL_DISPLAY = "WEB_APP";

    // ============================================================
    // VALIDATION
    // ============================================================

    if (!amount || amount < 100) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid amount (minimum ₦100)",
      }, { status: 400 });
    }

    if (!deliveryDate) {
      return NextResponse.json({
        success: false,
        error: "Please select a delivery date",
      }, { status: 400 });
    }

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    const selectedDate = new Date(deliveryDate);
    
    if (selectedDate < minDate) {
      return NextResponse.json({
        success: false,
        error: "Delivery date must be at least 3 days from today",
      }, { status: 400 });
    }

    if (!meterNumber) {
      return NextResponse.json({
        success: false,
        error: "Meter number is required",
      }, { status: 400 });
    }

    if (!discoCode) {
      return NextResponse.json({
        success: false,
        error: "DisCo is required",
      }, { status: 400 });
    }

    if (!pin || pin.length < 4) {
      return NextResponse.json({
        success: false,
        error: "Please enter your 4-6 digit transaction PIN",
      }, { status: 400 });
    }

    // ============================================================
    // MAP DISCO - WITH YOLA SUPPORT
    // ============================================================
    
    log('info', `🔍 Mapping disco code: "${discoCode}"`);
    const discoEnum = mapDiscoCode(discoCode);
    
    if (!discoEnum) {
      log('error', `❌ Invalid disco code: "${discoCode}"`);
      
      const validDiscos = [
        'ABUJA (AEDC) - Abuja, Niger, Kogi, Nasarawa',
        'IKEJA (IKEDC) - Ikeja, Lagos Mainland',
        'EKO (EKEDC) - Lagos Island, Badagry',
        'BENIN (BEDC) - Edo, Delta, Ondo, Ekiti',
        'ENUGU (EEDC) - Enugu, Anambra, Ebonyi, Imo, Abia',
        'IBADAN (IBEDC) - Oyo, Ogun, Osun, Kwara, Ondo',
        'JOS (JED) - Plateau, Bauchi, Gombe, Taraba',
        'KANO (KEDCO) - Kano, Katsina, Jigawa',
        'PORT HARCOURT (PHED) - Rivers, Bayelsa, Cross River, Akwa Ibom',
        'KADUNA (KAEDCO) - Kaduna, Sokoto, Kebbi, Zamfara',
        'YOLA (YEDC) - Adamawa, Yola', // ✅ Added YOLA
      ];
      
      return NextResponse.json({
        success: false,
        error: `Invalid DisCo: "${discoCode}". Please select a valid DisCo.`,
        validDiscos: validDiscos,
        suggestion: "For Yola (Adamawa), please use 'YOLA' or 'YEDC'",
      }, { status: 400 });
    }
    
    log('info', `✅ Disco mapped: "${discoCode}" -> ${discoEnum}`);

    // ============================================================
    // PARALLEL FETCH: user + customer + balance
    // ============================================================
    const userId = sessionUser.id;

    const [cachedUser, cachedCustomer, cachedBalance] = await Promise.all([
      CacheService.getUser(userId).catch(() => null),
      CacheService.getCustomer(userId, sessionUser.phone).catch(() => null),
      CacheService.getBalance(userId).catch(() => null),
    ]);

    let user = cachedUser;
    let customer = cachedCustomer;
    let walletBalance = cachedBalance?.balance;

    if (!user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          pinHash: true,
          pinAttempts: true,
          pinLockedUntil: true,
          hasWallet: true,
          fullName: true,
          email: true,
          phone: true,
          wallet: {
            select: {
              id: true,
              walletBalance: true,
            },
          },
        },
      });

      if (!dbUser) {
        return NextResponse.json({
          success: false,
          error: "User not found",
        }, { status: 404 });
      }

      user = {
        id: dbUser.id,
        pinHash: dbUser.pinHash,
        pinAttempts: dbUser.pinAttempts,
        pinLockedUntil: dbUser.pinLockedUntil,
        hasWallet: dbUser.hasWallet,
        fullName: dbUser.fullName,
        email: dbUser.email,
        phone: dbUser.phone,
        wallet: dbUser.wallet || null,
      };

      CacheService.setUser(userId, user).catch(() => {});
    }

    if (!customer) {
      customer = await prisma.customer.findUnique({
        where: {
          userId_phone: {
            userId: user.id,
            phone: user.phone,
          },
        },
      });

      if (!customer) {
        customer = await CacheService.createCustomer({
          userId: user.id,
          phone: user.phone,
          fullName: user.fullName || null,
          email: user.email || null,
          customerType: CustomerType.REGULAR,
          totalTransactions: 0,
          totalSpent: 0,
          totalCommissionEarned: 0,
          firstTransactionAt: new Date(),
          tags: [],
        });
      } else {
        CacheService.setCustomer(user.id, user.phone, customer).catch(() => {});
      }
    }

    if (walletBalance === undefined || walletBalance === null) {
      const wallet = user.wallet;
      walletBalance = wallet ? Number(wallet.walletBalance) : 0;
    }

    if (!user.wallet) {
      return NextResponse.json({
        success: false,
        error: "Wallet not found",
      }, { status: 404 });
    }

    const walletId = user.wallet.id;

    // ============================================================
    // PIN VERIFICATION
    // ============================================================

    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json({
        success: false,
        error: `Account locked. Please try again in ${remainingMinutes} minute(s).`,
      }, { status: 403 });
    }

    if (!user.pinHash) {
      return NextResponse.json({
        success: false,
        error: "You don't have a transaction PIN set. Please set one in your profile.",
      }, { status: 400 });
    }

    const isValidPin = await compare(pin, user.pinHash);
    if (!isValidPin) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          pinAttempts: {
            increment: 1,
          },
        },
        select: { pinAttempts: true },
      });

      const attemptsLeft = 5 - (updatedUser.pinAttempts || 0);
      
      let errorMessage = `Invalid PIN. ${attemptsLeft} attempt(s) remaining.`;
      let statusCode = 401;
      
      if (attemptsLeft <= 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            pinLockedUntil: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
        errorMessage = "Too many failed PIN attempts. Account locked for 15 minutes.";
        statusCode = 403;
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        attemptsLeft,
      }, { status: statusCode });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    });

    // ============================================================
    // Check balance
    // ============================================================

    if (walletBalance < amount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}`,
      }, { status: 400 });
    }

    // ============================================================
    // CREATE PREORDER
    // ============================================================

    const preOrder = await prisma.preOrder.create({
      data: {
        userId: user.id,
        disCo: discoEnum,
        meterNumber: meterNumber,
        meterType: MeterType.HOME,
        meterName: `${discoCode} Meter`,
        amount: amount,
        serviceFee: 0,
        totalDebited: 0,
        deliveryDate: selectedDate,
        status: PreOrderStatus.PENDING,
        isCancelled: false,
        channel: ChannelType.WEB_APP,
        metadata: {
          serviceType: "electricity",
          isSubscription: true,
          isReserved: true,
          reservedAmount: amount,
          scheduledDate: deliveryDate,
          tokenPurchased: false,
          walletId: walletId,
          paymentPending: true,
          source: "SubscriptionAPI",
          wasDebited: false,
          channel: "WEB_APP",
          channelDisplay: CHANNEL_DISPLAY,
          discoCode: discoCode,
          discoEnum: discoEnum,
          customerData: {
            name: customerName || null,
            address: customerAddress || null,
            phone: customerPhone || null,
            email: customerEmail || null,
            status: meterStatus || null,
          },
        },
      },
    });

    // ============================================================
    // RESERVE AMOUNT
    // ============================================================

    const reserveTransaction = await prisma.walletTransaction.create({
      data: {
        walletId: user.wallet.id,
        userId: user.id,
        type: WalletTransactionType.SYSTEM,
        amount: amount,
        balanceBefore: walletBalance,
        balanceAfter: walletBalance,
        reference: `RESERVE_${preOrder.id}`,
        description: `Reserved for electricity delivery on ${new Date(deliveryDate).toLocaleDateString()}`,
        status: TransactionStatus.PENDING,
        category: WalletCategory.ELECTRICITY,
        channel: ChannelType.WEB_APP,
        metadata: {
          preOrderId: preOrder.id,
          deliveryDate: deliveryDate,
          serviceType: "electricity",
          isReserved: true,
          amountReserved: amount,
          status: "RESERVED",
          scheduledDate: deliveryDate,
          walletId: walletId,
          paymentPending: true,
          source: "SubscriptionAPI",
          wasDebited: false,
          channel: "WEB_APP",
          channelDisplay: CHANNEL_DISPLAY,
          discoCode: discoCode,
          discoEnum: discoEnum,
          customerData: {
            name: customerName || null,
            address: customerAddress || null,
            phone: customerPhone || null,
            email: customerEmail || null,
            status: meterStatus || null,
          },
        },
      },
    });

    // ============================================================
    // SCHEDULE DELIVERY JOB
    // ============================================================

    await prisma.job.create({
      data: {
        type: JobType.PREORDER_DELIVERY,
        status: JobStatus.PENDING,
        payload: {
          preOrderId: preOrder.id,
          userId: user.id,
          serviceType: "electricity",
          amount: amount,
          deliveryDate: deliveryDate,
          walletId: walletId,
          reserveTransactionId: reserveTransaction.id,
          meterNumber: meterNumber,
          discoCode: discoCode,
          discoEnum: discoEnum,
          customerName: customerName || null,
          customerAddress: customerAddress || null,
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
          meterStatus: meterStatus || null,
          source: "SubscriptionAPI",
          channel: "WEB_APP",
          channelDisplay: CHANNEL_DISPLAY,
        },
        priority: 5,
        maxAttempts: 3,
        scheduledFor: selectedDate,
      },
    });

    // ============================================================
    // SAVE METER WITH CUSTOMER DATA
    // ============================================================

    saveMeterAsync(
      user.id, 
      meterNumber, 
      discoCode, 
      'Prepaid',
      customerName || null,
      customerAddress || null,
      customerPhone || null,
      customerEmail || null,
      meterStatus || null,
      new Date()
    ).catch(() => {});

    // ============================================================
    // INVALIDATE CACHE
    // ============================================================

    await Promise.all([
      CacheService.invalidateWallet(user.id),
      CacheService.invalidateUser(user.id),
      CacheService.invalidateCustomer(user.id, user.phone),
      CacheService.invalidateSavedMeters(user.id),
    ]);

    const totalTime = Date.now() - startTime;
    log('info', `✅ Subscription created in ${totalTime}ms for disco: ${discoEnum}`);

    return NextResponse.json({
      success: true,
      data: {
        id: preOrder.id,
        type: "electricity",
        amount: Number(preOrder.amount),
        scheduledDate: deliveryDate,
        deliveryStatus: "SCHEDULED",
        tokenPurchased: false,
        amountReserved: amount,
        walletBalance: walletBalance,
        reservedAmount: amount,
        walletId: walletId,
        wasDebited: false,
        channel: CHANNEL_DISPLAY,
        disco: discoEnum,
        message: "Subscription created! Token will be purchased on delivery date.",
        customerInfo: {
          name: customerName,
          address: customerAddress,
          phone: customerPhone,
          email: customerEmail,
          status: meterStatus,
        },
      },
    }, { status: 201 });

  } catch (error: any) {
    log('error', '❌ Subscription creation failed', error.message);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to create subscription",
    }, { status: 500 });
  }
}