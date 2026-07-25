// lib/jobs/process-subscription-delivery.ts

import { prisma } from "~/lib/db";
import { TransactionStatus, WalletTransactionType, TokenStatus, PreOrderStatus, JobStatus } from "@prisma/client";

export async function processSubscriptionDelivery(job: any) {
  const { 
    subscriptionId, 
    userId, 
    serviceType, 
    amount, 
    deliveryDate, 
    walletId,
    reserveTransactionId,
    tokenVaultId,
    vtuTransactionId,
    token,
    tokenPurchased,
  } = job.payload;

  console.log(`📦 [DELIVERY] Processing subscription ${subscriptionId} for ${serviceType}`);

  try {
    // ✅ Get the wallet
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const currentBalance = Number(wallet.walletBalance);
    console.log(`💰 [DELIVERY] Current wallet balance: ${currentBalance}`);

    // ✅ Check if balance is sufficient
    if (currentBalance < amount) {
      console.log(`⚠️ [DELIVERY] Insufficient balance for ${subscriptionId}`);
      
      // Mark reservation as FAILED
      await prisma.walletTransaction.update({
        where: { id: reserveTransactionId },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...(await getReserveMetadata(reserveTransactionId)),
            failedReason: "Insufficient balance",
            failedAt: new Date().toISOString(),
            balanceAtAttempt: currentBalance,
            requiredAmount: amount,
          },
        },
      });

      // Mark subscription as paused
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          isPaused: true,
          pausedAt: new Date(),
        },
      });

      // Mark job as failed
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: `Insufficient balance: ${currentBalance} < ${amount}`,
          completedAt: new Date(),
        },
      });

      // TODO: Send notification to user
      // await sendInsufficientBalanceNotification(userId, { subscriptionId, amount, balance: currentBalance });

      throw new Error(`Insufficient balance: ${currentBalance} < ${amount}`);
    }

    // ✅ Process the delivery in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. ✅ DEDUCT from wallet (actual deduction happens here!)
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          walletBalance: {
            decrement: amount,
          },
        },
      });

      // 2. ✅ Create DEBIT transaction
      const debitTx = await tx.walletTransaction.create({
        data: {
          walletId: walletId,
          userId: userId,
          type: WalletTransactionType.DEBIT,
          amount: amount,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance - amount,
          reference: `DELIVERY_${subscriptionId}`,
          description: `📦 ${serviceType} subscription delivered on ${new Date().toLocaleDateString()}`,
          status: TransactionStatus.SUCCESS,
          category: serviceType === "electricity" ? WalletCategory.ELECTRICITY : WalletCategory.CABLE_TV,
          channel: ChannelType.MOBILE_APP,
          metadata: {
            subscriptionId: subscriptionId,
            reserveTransactionId: reserveTransactionId,
            deliveryDate: deliveryDate,
            isDelivery: true,
            serviceType: serviceType,
          },
        },
      });

      console.log(`💳 [DELIVERY] Debit transaction created: ${debitTx.reference}`);

      // 3. ✅ Update reservation to COMPLETED
      await tx.walletTransaction.update({
        where: { id: reserveTransactionId },
        data: {
          status: TransactionStatus.SUCCESS,
          metadata: {
            ...(await getReserveMetadata(reserveTransactionId)),
            status: "COMPLETED",
            completedAt: new Date().toISOString(),
            delivered: true,
            debitTransactionId: debitTx.id,
          },
        },
      });

      // 4. ✅ Update subscription
      await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          lastRenewalDate: new Date(),
          isActive: true,
          nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // 5. ✅ Deliver token (if purchased)
      if (tokenPurchased && tokenVaultId) {
        // Update TokenVault to DELIVERED
        await tx.tokenVault.update({
          where: { id: tokenVaultId },
          data: {
            status: TokenStatus.DELIVERED,
            deliveredAt: new Date(),
            deliveryChannel: DeliveryChannel.MOBILE_PUSH,
            metadata: {
              ...(await getTokenVaultMetadata(tokenVaultId)),
              delivered: true,
              deliveredAt: new Date().toISOString(),
              debitTransactionId: debitTx.id,
            },
          },
        });

        // Update VtuTransaction to SUCCESS
        if (vtuTransactionId) {
          await tx.vtuTransaction.update({
            where: { id: vtuTransactionId },
            data: {
              status: TransactionStatus.SUCCESS,
              deliveredAt: new Date(),
              metadata: {
                ...(await getVtuMetadata(vtuTransactionId)),
                delivered: true,
                deliveryDate: new Date().toISOString(),
                debitTransactionId: debitTx.id,
                paymentCompleted: true,
              },
            },
          });
        }

        // Update PreOrder to DELIVERED
        await tx.preOrder.updateMany({
          where: {
            metadata: {
              path: ['subscriptionId'],
              equals: subscriptionId,
            },
          },
          data: {
            status: PreOrderStatus.DELIVERED,
            metadata: {
              ...(await getPreOrderMetadata(subscriptionId)),
              delivered: true,
              deliveredAt: new Date().toISOString(),
              debitTransactionId: debitTx.id,
              paymentCompleted: true,
            },
          },
        });

        // TODO: Send notification with token
        // await sendDeliveryNotification(userId, {
        //   subscriptionId,
        //   serviceType,
        //   token,
        //   deliveryDate,
        //   amount,
        //   balanceAfter: currentBalance - amount,
        // });

        console.log(`✅ [DELIVERY] Token delivered for subscription ${subscriptionId}`);
      } else {
        // For cable TV or no token
        console.log(`✅ [DELIVERY] Subscription ${subscriptionId} activated`);
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

    return { success: true };

  } catch (error) {
    console.error(`❌ [DELIVERY] Failed for ${subscriptionId}:`, error);
    
    // Mark job for retry
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        attempts: { increment: 1 },
      },
    });
    
    throw error;
  }
}

// Helper functions
async function getReserveMetadata(reserveTransactionId: string) {
  const tx = await prisma.walletTransaction.findUnique({
    where: { id: reserveTransactionId },
    select: { metadata: true },
  });
  return tx?.metadata || {};
}

async function getTokenVaultMetadata(tokenVaultId: string) {
  const vault = await prisma.tokenVault.findUnique({
    where: { id: tokenVaultId },
    select: { metadata: true },
  });
  return vault?.metadata || {};
}

async function getVtuMetadata(vtuTransactionId: string) {
  const tx = await prisma.vtuTransaction.findUnique({
    where: { id: vtuTransactionId },
    select: { metadata: true },
  });
  return tx?.metadata || {};
}

async function getPreOrderMetadata(subscriptionId: string) {
  const preOrder = await prisma.preOrder.findFirst({
    where: {
      metadata: {
        path: ['subscriptionId'],
        equals: subscriptionId,
      },
    },
    select: { metadata: true },
  });
  return preOrder?.metadata || {};
}