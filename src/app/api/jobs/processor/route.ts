// app/api/jobs/processor/route.ts - COMPLETE WITH WHATSAPP REMINDER

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { JobStatus, TransactionStatus } from "@prisma/client";
import { getVendorService } from "~/lib/vendors/vendor.service";
import { sendWhatsAppMessage } from "~/lib/twilio";

// ============================================================
// MAP VENDOR TO ENUM
// ============================================================

function mapVendorToEnum(vendorCode: string | undefined): any {
  if (!vendorCode) return null;
  const normalized = vendorCode.toUpperCase();
  const vendorMap: Record<string, any> = {
    'VTPASS': 'VTPASS',
    'GIDIGITAL': 'GIDIGITAL',
    'MONIEPOINT': 'MONIEPOINT',
    'FLUTTERWAVE_VTU': 'FLUTTERWAVE_VTU',
    'QUICKTELLER': 'QUICKTELLER',
    'BILAL_SADA': 'BILAL_SADA',
    'LEGITDATAWAY': 'VTPASS',
    'BILALSADA': 'BILAL_SADA',
  };
  return vendorMap[normalized] || null;
}

// ============================================================
// JOB PROCESSOR - MAIN ENTRY POINT
// ============================================================

export async function POST(request: NextRequest) {
  try {
    console.log(`[Job Processor] Starting job processing...`);

    // Get pending jobs
    const jobs = await prisma.job.findMany({
      where: {
        status: JobStatus.PENDING,
        scheduledFor: { lte: new Date() },
        attempts: { lt: 3 },
      },
      orderBy: { priority: "desc" },
      take: 10,
    });

    console.log(`[Job Processor] Found ${jobs.length} pending jobs`);

    let processed = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        // ✅ Check if it's a reminder job (no transactionId needed)
        const payload = job.payload;
        
        if (job.type === "WHATSAPP_REMINDER") {
          await processWhatsAppReminder(job);
          processed++;
          console.log(`[Job Processor] Reminder job ${job.id} processed successfully`);
          continue;
        }

        // ✅ VTU transactions need transactionId
        if (!payload.transactionId) {
          console.error(`[Job Processor] Job ${job.id} missing transactionId`);
          await prisma.job.update({
            where: { id: job.id },
            data: {
              status: JobStatus.FAILED,
              errorMessage: "Missing transactionId in payload",
              completedAt: new Date(),
            },
          });
          failed++;
          continue;
        }

        await processVtuJob(job);
        processed++;
        console.log(`[Job Processor] Job ${job.id} processed successfully`);
      } catch (error: any) {
        console.error(`[Job Processor] Job ${job.id} failed:`, error);
        
        // ✅ Truncate error message to prevent column overflow
        const errorMessage = (error.message || "Unknown error").substring(0, 500);
        const newAttempts = job.attempts + 1;
        const isFinalAttempt = newAttempts >= job.maxAttempts;

        await prisma.job.update({
          where: { id: job.id },
          data: {
            attempts: newAttempts,
            status: isFinalAttempt ? JobStatus.FAILED : JobStatus.PENDING,
            errorMessage: errorMessage,
            updatedAt: new Date(),
            ...(isFinalAttempt ? { completedAt: new Date() } : {}),
            ...(!isFinalAttempt ? { 
              scheduledFor: new Date(Date.now() + Math.min(60000 * Math.pow(2, job.attempts), 3600000))
            } : {}),
          },
        });

        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: jobs.length,
    });

  } catch (error: any) {
    console.error("[Job Processor] Error:", error);
    const errorMessage = (error.message || "Unknown error").substring(0, 500);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// ============================================================
// PROCESS VTU JOB
// ============================================================

async function processVtuJob(job: any) {
  const payload = job.payload;
  const { transactionId, userId, serviceType } = payload;

  console.log(`[Job] Processing ${serviceType} for transaction ${transactionId}...`);

  // ✅ Check if transaction exists
  const existingTransaction = await prisma.vtuTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!existingTransaction) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  // ✅ If already successful, skip
  if (existingTransaction.status === TransactionStatus.SUCCESS) {
    console.log(`[Job] Transaction ${transactionId} already completed. Skipping.`);
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
    return;
  }

  // ✅ Process based on service type
  switch (serviceType) {
    case "AIRTIME":
      await processAirtimePurchase(job);
      break;
    case "DATA":
      await processDataPurchase(job);
      break;
    case "ELECTRICITY":
      await processElectricityPurchase(job);
      break;
    case "CABLE_TV":
      await processCablePurchase(job);
      break;
    case "EDUCATION":
      await processEducationPurchase(job);
      break;
    default:
      throw new Error(`Unknown service type: ${serviceType}`);
  }
}

// ============================================================
// WHATSAPP REMINDER PROCESSOR (NEW)
// ============================================================

async function processWhatsAppReminder(job: any) {
  const payload = job.payload;
  const { userId, phoneNumber, fullName, balance, lastActivity } = payload;
  
  console.log(`[Job] Processing WhatsApp reminder for user ${userId}`);

  try {
    // ✅ Build personalized reminder message
    const lastActivityText = lastActivity 
      ? new Date(lastActivity).toLocaleDateString() 
      : 'Never';

    const message = `💡 *Bilscore Reminder*

Hi ${fullName || 'there'}! 👋

It's been 3 days since your last activity on Bilscore.

💰 *Wallet Balance:* NGN ${Number(balance).toFixed(2)}
📅 *Last Activity:* ${lastActivityText}

🚀 *Quick Actions:*
• Buy airtime: AIRTIME 500
• Check data plans: DATA
• Pay electricity: POWER 2000

Need help? Reply HELP anytime.

*Stay connected with Bilscore!* 💚`;

    // ✅ Send WhatsApp message
    const sent = await sendWhatsAppMessage(phoneNumber, message);

    if (!sent) {
      throw new Error("Failed to send WhatsApp message");
    }

    // ✅ Update last reminder timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { lastWhatsAppReminder: new Date() },
    });

    // ✅ Mark job as completed
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    console.log(`[Job] Successfully sent reminder to user ${userId}`);

    return {
      success: true,
      userId,
      phoneNumber,
      message: "Reminder sent successfully",
    };

  } catch (error: any) {
    console.error(`[Job] Failed to send reminder to user ${userId}:`, error);
    
    // ✅ Update user with failed attempt to prevent endless retries
    await prisma.user.update({
      where: { id: userId },
      data: { lastWhatsAppReminder: new Date() },
    });

    // ✅ Mark job as failed
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.FAILED,
        errorMessage: error.message || "Unknown error",
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

// ============================================================
// ELECTRICITY PURCHASE PROCESSOR
// ============================================================

async function processElectricityPurchase(job: any) {
  const payload = job.payload;
  const { 
    transactionId, 
    userId, 
    meterNumber, 
    amount, 
    discoCode, 
    meterType,
    customerName,
    customerAddress,
    customerPhone,
    customerEmail,
    meterStatus,
  } = payload;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });

  if (!user) throw new Error("User not found");

  const wallet = user.wallet;
  const walletBalance = Number(wallet?.walletBalance || 0);

  const vendorService = getVendorService();
  const result = await vendorService.buyElectricity(
    {
      meterNumber,
      amount,
      discoCode,
      meterType: meterType || 'Prepaid',
      phone: user.phone,
    },
    userId
  );

  if (result.success) {
    const token = result.data?.token || result.data?.purchased_code || null;
    const vendorReference = result.vendorReference || null;

    const customer = await prisma.customer.findUnique({
      where: { userId_phone: { userId: user.id, phone: user.phone } },
    });

    await prisma.$transaction(async (tx) => {
      const currentTx = await tx.vtuTransaction.findUnique({
        where: { id: transactionId },
      });

      if (currentTx?.status === TransactionStatus.SUCCESS) {
        console.log(`[Job] Transaction ${transactionId} already completed. Skipping.`);
        return;
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { walletBalance: { decrement: amount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: userId,
          type: "DEBIT",
          amount: amount,
          balanceBefore: walletBalance,
          balanceAfter: walletBalance - amount,
          reference: `VTU_${transactionId}`,
          description: `Electricity purchase for meter ${meterNumber} (${discoCode})`,
          status: "SUCCESS",
          category: "ELECTRICITY",
        },
      });

      await tx.vtuTransaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.SUCCESS,
          totalDebited: amount,
          token: token,
          vendorReference: vendorReference,
          vendor: mapVendorToEnum(result.vendor),
          deliveredAt: new Date(),
          metadata: {
            ...currentTx?.metadata,
            processed: true,
            completedAt: new Date().toISOString(),
          },
        },
      });

      if (customer) {
        await tx.customerTransaction.create({
          data: {
            customerId: customer.id,
            userId: userId,
            vtuTransactionId: transactionId,
            transactionType: "ELECTRICITY_INSTANT",
            amount: amount,
            totalAmount: amount,
            product: discoCode,
            meterNumber: meterNumber,
            status: "SUCCESS",
            metadata: {
              vendorName: result.vendor || 'unknown',
              vendorReference: vendorReference || '',
              token: token,
              meterType: meterType,
              completedAt: new Date().toISOString(),
              customerName: customerName,
              customerAddress: customerAddress,
              customerPhone: customerPhone,
              customerEmail: customerEmail,
              meterStatus: meterStatus,
            },
          },
        });

        await tx.customer.update({
          where: { id: customer.id },
          data: {
            totalTransactions: { increment: 1 },
            totalSpent: { increment: amount },
            lastTransactionAt: new Date(),
          },
        });
      }
    });

    // ✅ Mark job as completed
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await sendWhatsAppMessage(
      user.phone,
      `⚡ Electricity Purchase Successful!

Amount: NGN ${amount.toFixed(2)}
${customerName ? `Customer: ${customerName}` : ''}
Token: ${token}
Reference: ${transactionId.substring(0, 10)}

Thank you for using Bilscore!`
    );
  } else {
    throw new Error(result.error || "Vendor transaction failed");
  }
}

// ============================================================
// AIRTIME PURCHASE PROCESSOR
// ============================================================

async function processAirtimePurchase(job: any) {
  const payload = job.payload;
  const { transactionId, userId, phoneNumber, amount, detectedNetwork } = payload;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });

  if (!user) throw new Error("User not found");

  const wallet = user.wallet;
  const walletBalance = Number(wallet?.walletBalance || 0);

  const vendorService = getVendorService();
  const result = await vendorService.buyAirtime(
    { phoneNumber, amount, network: detectedNetwork },
    userId
  );

  if (result.success) {
    const token = result.data?.token || result.data?.purchased_code || null;
    const vendorReference = result.vendorReference || null;

    await prisma.$transaction(async (tx) => {
      const currentTx = await tx.vtuTransaction.findUnique({
        where: { id: transactionId },
      });

      if (currentTx?.status === TransactionStatus.SUCCESS) {
        console.log(`[Job] Transaction ${transactionId} already completed. Skipping.`);
        return;
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { walletBalance: { decrement: amount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: userId,
          type: "DEBIT",
          amount: amount,
          balanceBefore: walletBalance,
          balanceAfter: walletBalance - amount,
          reference: `VTU_${transactionId}`,
          description: `Airtime purchase for ${phoneNumber}`,
          status: "SUCCESS",
          category: "AIRTIME",
        },
      });

      await tx.vtuTransaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.SUCCESS,
          totalDebited: amount,
          token: token,
          vendorReference: vendorReference,
          vendor: mapVendorToEnum(result.vendor),
          deliveredAt: new Date(),
          metadata: {
            ...currentTx?.metadata,
            processed: true,
            completedAt: new Date().toISOString(),
          },
        },
      });
    });

    // ✅ Mark job as completed
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await sendWhatsAppMessage(
      user.phone,
      `📱 Airtime Purchase Successful!

Phone: ${phoneNumber}
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
${token ? `Token: ${token}` : ''}
Reference: ${transactionId.substring(0, 10)}

Thank you for using Bilscore!`
    );
  } else {
    throw new Error(result.error || "Vendor transaction failed");
  }
}

// ============================================================
// DATA PURCHASE PROCESSOR
// ============================================================

async function processDataPurchase(job: any) {
  const payload = job.payload;
  const { transactionId, userId, phoneNumber, planData, provider, detectedNetwork } = payload;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });

  if (!user) throw new Error("User not found");

  const amount = Number(planData.price);
  const wallet = user.wallet;
  const walletBalance = Number(wallet?.walletBalance || 0);

  const vendorService = getVendorService();
  const result = await vendorService.buyData(
    {
      phoneNumber,
      planCode: planData.planCode || planData.data,
      network: detectedNetwork,
      amount: amount,
    },
    userId
  );

  if (result.success) {
    const token = result.data?.token || result.data?.purchased_code || null;
    const vendorReference = result.vendorReference || null;

    await prisma.$transaction(async (tx) => {
      const currentTx = await tx.vtuTransaction.findUnique({
        where: { id: transactionId },
      });

      if (currentTx?.status === TransactionStatus.SUCCESS) {
        console.log(`[Job] Transaction ${transactionId} already completed. Skipping.`);
        return;
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { walletBalance: { decrement: amount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: userId,
          type: "DEBIT",
          amount: amount,
          balanceBefore: walletBalance,
          balanceAfter: walletBalance - amount,
          reference: `VTU_${transactionId}`,
          description: `Data purchase for ${phoneNumber}`,
          status: "SUCCESS",
          category: "DATA",
        },
      });

      await tx.vtuTransaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.SUCCESS,
          totalDebited: amount,
          token: token,
          vendorReference: vendorReference,
          vendor: mapVendorToEnum(result.vendor),
          deliveredAt: new Date(),
          metadata: {
            ...currentTx?.metadata,
            processed: true,
            completedAt: new Date().toISOString(),
          },
        },
      });
    });

    const dataDisplay = planData.data || `${planData.amountMB || 0}MB`;

    // ✅ Mark job as completed
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await sendWhatsAppMessage(
      user.phone,
      `📊 Data Purchase Successful!

Phone: ${phoneNumber}
Plan: ${dataDisplay} (${provider})
Amount: NGN ${amount.toFixed(2)}
Network: ${detectedNetwork}
${token ? `Token: ${token}` : ''}
Reference: ${transactionId.substring(0, 10)}

Thank you for using Bilscore!`
    );
  } else {
    throw new Error(result.error || "Vendor transaction failed");
  }
}

// ============================================================
// CABLE PURCHASE PROCESSOR
// ============================================================

async function processCablePurchase(job: any) {
  const payload = job.payload;
  const { transactionId, userId, decoderNumber, provider, packageCode, packageName, packagePrice } = payload;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });

  if (!user) throw new Error("User not found");

  const amount = Number(packagePrice || job.amount);
  const wallet = user.wallet;
  const walletBalance = Number(wallet?.walletBalance || 0);

  const vendorService = getVendorService();
  const result = await vendorService.buyCableTV(
    {
      decoderNumber,
      packageCode: packageCode,
      provider: provider,
      amount: amount,
      phone: user.phone,
    },
    userId
  );

  if (result.success) {
    const token = result.data?.token || result.data?.purchased_code || null;
    const vendorReference = result.vendorReference || null;

    await prisma.$transaction(async (tx) => {
      const currentTx = await tx.vtuTransaction.findUnique({
        where: { id: transactionId },
      });

      if (currentTx?.status === TransactionStatus.SUCCESS) {
        console.log(`[Job] Transaction ${transactionId} already completed. Skipping.`);
        return;
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { walletBalance: { decrement: amount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: userId,
          type: "DEBIT",
          amount: amount,
          balanceBefore: walletBalance,
          balanceAfter: walletBalance - amount,
          reference: `VTU_${transactionId}`,
          description: `Cable subscription for ${decoderNumber}`,
          status: "SUCCESS",
          category: "CABLE_TV",
        },
      });

      await tx.vtuTransaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.SUCCESS,
          totalDebited: amount,
          token: token,
          vendorReference: vendorReference,
          vendor: mapVendorToEnum(result.vendor),
          deliveredAt: new Date(),
          metadata: {
            ...currentTx?.metadata,
            processed: true,
            completedAt: new Date().toISOString(),
          },
        },
      });
    });

    // ✅ Mark job as completed
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await sendWhatsAppMessage(
      user.phone,
      `📺 Cable Subscription Successful!

Decoder: ${decoderNumber}
Provider: ${provider}
Package: ${packageName || packageCode}
Amount: NGN ${amount.toFixed(2)}
${token ? `Token: ${token}` : ''}
Reference: ${transactionId.substring(0, 10)}

Thank you for using Bilscore!`
    );
  } else {
    throw new Error(result.error || "Vendor transaction failed");
  }
}

// ============================================================
// EDUCATION PURCHASE PROCESSOR
// ============================================================

async function processEducationPurchase(job: any) {
  const payload = job.payload;
  const { transactionId, userId, product, quantity } = payload;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });

  if (!user) throw new Error("User not found");

  const serviceMap: Record<string, { serviceId: string; variationCode: string; name: string; price: number }> = {
    'WAEC': { serviceId: 'waec-registration', variationCode: 'waec-registration', name: 'WAEC Registration PIN', price: 14450 },
    'WAEC-RESULT': { serviceId: 'waec', variationCode: 'waecdirect', name: 'WAEC Result Checker PIN', price: 900 },
    'JAMB': { serviceId: 'jamb', variationCode: 'utme-no-mock', name: 'JAMB UTME PIN', price: 6200 },
    'NECO': { serviceId: 'neco', variationCode: 'neco-registration', name: 'NECO Registration PIN', price: 11000 },
  };

  const productInfo = serviceMap[product];
  if (!productInfo) throw new Error("Invalid product type");

  const amount = productInfo.price * quantity;
  const wallet = user.wallet;
  const walletBalance = Number(wallet?.walletBalance || 0);

  const vendorService = getVendorService();
  const result = await vendorService.buyEducation(
    {
      serviceId: productInfo.serviceId,
      variationCode: productInfo.variationCode,
      quantity: quantity,
      phone: user.phone,
    },
    userId
  );

  if (result.success) {
    const token = result.data?.token || result.data?.purchased_code || null;
    const vendorReference = result.vendorReference || null;

    await prisma.$transaction(async (tx) => {
      const currentTx = await tx.vtuTransaction.findUnique({
        where: { id: transactionId },
      });

      if (currentTx?.status === TransactionStatus.SUCCESS) {
        console.log(`[Job] Transaction ${transactionId} already completed. Skipping.`);
        return;
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { walletBalance: { decrement: amount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: userId,
          type: "DEBIT",
          amount: amount,
          balanceBefore: walletBalance,
          balanceAfter: walletBalance - amount,
          reference: `VTU_${transactionId}`,
          description: `Education purchase - ${productInfo.name}`,
          status: "SUCCESS",
          category: "EDUCATION",
        },
      });

      await tx.vtuTransaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.SUCCESS,
          totalDebited: amount,
          token: token,
          vendorReference: vendorReference,
          vendor: mapVendorToEnum(result.vendor),
          deliveredAt: new Date(),
          metadata: {
            ...currentTx?.metadata,
            processed: true,
            completedAt: new Date().toISOString(),
          },
        },
      });
    });

    // ✅ Mark job as completed
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await sendWhatsAppMessage(
      user.phone,
      `🎓 Education Purchase Successful!

Product: ${productInfo.name}
Quantity: ${quantity}
Amount: NGN ${amount.toFixed(2)}
${token ? `Token: ${token}` : ''}
Reference: ${transactionId.substring(0, 10)}

Thank you for using Bilscore!`
    );
  } else {
    throw new Error(result.error || "Vendor transaction failed");
  }
}