// src/lib/services/vtu.service.ts

import { prisma } from "~/lib/db";
import { getVendorService } from "../vendors/vendor.service";
import { VtuType, TransactionStatus } from "@prisma/client";
import { z } from "zod";

export const vtuTransactionSchema = z.object({
  userId: z.string().uuid(),
  serviceType: z.enum(["AIRTIME", "DATA", "ELECTRICITY_INSTANT", "CABLE_TV"]),
  amount: z.number().positive(),
  phoneNumber: z.string().optional(),
  meterNumber: z.string().optional(),
  network: z.enum(["MTN", "GLO", "AIRTEL", "9MOBILE"]).optional(),
  discoCode: z.string().optional(),
  planCode: z.string().optional(),
  decoderNumber: z.string().optional(),
  cableProvider: z.string().optional(),
  packageCode: z.string().optional(),
});

export type VTUTransactionInput = z.infer<typeof vtuTransactionSchema>;

export class VTUService {
  async purchaseAirtime(data: {
    userId: string;
    phoneNumber: string;
    amount: number;
    network: string;
  }) {
    const vendorService = getVendorService();
    
    // 1. Check user balance
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new Error("User or wallet not found");
    }

    const totalCost = data.amount;
    if (user.wallet.walletBalance < totalCost) {
      throw new Error(`Insufficient balance. Available: ₦${user.wallet.walletBalance}, Required: ₦${totalCost}`);
    }

    // 2. Create transaction record
    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: data.userId,
        transactionType: VtuType.AIRTIME,
        product: data.network,
        amount: data.amount,
        totalDebited: totalCost,
        phoneNumber: data.phoneNumber,
        network: data.network as any,
        status: TransactionStatus.PENDING,
        channel: "MOBILE_APP",
        metadata: {
          source: "VTUService",
          service: "AIRTIME",
          timestamp: new Date().toISOString(),
        },
      },
    });

    try {
      // 3. Execute vendor purchase with fallback
      const result = await vendorService.buyAirtime(
        {
          phoneNumber: data.phoneNumber,
          amount: data.amount,
          network: data.network,
        },
        data.userId
      );

      if (result.success) {
        // 4. Deduct from wallet and complete transaction
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: user.wallet!.id },
            data: {
              walletBalance: {
                decrement: totalCost,
              },
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: user.wallet!.id,
              userId: data.userId,
              type: "DEBIT",
              amount: totalCost,
              balanceBefore: user.wallet!.walletBalance,
              balanceAfter: user.wallet!.walletBalance - totalCost,
              reference: `VTU_${transaction.id}`,
              description: `Airtime purchase for ${data.phoneNumber} (${data.network})`,
              status: TransactionStatus.SUCCESS,
              category: "AIRTIME",
            },
          }),
          prisma.vtuTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.SUCCESS,
              vendorReference: result.vendorReference,
              vendorId: result.vendor,
              token: result.data?.token,
              metadata: {
                ...transaction.metadata,
                vendorResponse: result.data,
                vendorName: result.vendor,
              },
            },
          }),
        ]);

        return {
          success: true,
          data: result.data,
          transactionId: transaction.id,
          reference: transaction.id,
        };
      } else {
        // 5. Mark transaction as failed
        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            metadata: {
              ...transaction.metadata,
              error: result.error,
              vendor: result.vendor,
              vendorError: result.metadata,
            },
          },
        });

        throw new Error(result.error || "Vendor transaction failed");
      }
    } catch (error) {
      // 6. Handle any errors
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...transaction.metadata,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          },
        },
      });

      throw error;
    }
  }

  async purchaseData(data: {
    userId: string;
    phoneNumber: string;
    planCode: string;
    network: string;
    amount: number;
  }) {
    const vendorService = getVendorService();
    
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new Error("User or wallet not found");
    }

    if (user.wallet.walletBalance < data.amount) {
      throw new Error(`Insufficient balance. Available: ₦${user.wallet.walletBalance}`);
    }

    const transaction = await prisma.vtuTransaction.create({
      data: {
        userId: data.userId,
        transactionType: VtuType.DATA,
        product: `${data.network} - ${data.planCode}`,
        amount: data.amount,
        totalDebited: data.amount,
        phoneNumber: data.phoneNumber,
        network: data.network as any,
        networkPlan: data.planCode,
        status: TransactionStatus.PENDING,
        channel: "MOBILE_APP",
        metadata: {
          source: "VTUService",
          service: "DATA",
          planCode: data.planCode,
          timestamp: new Date().toISOString(),
        },
      },
    });

    try {
      const result = await vendorService.buyData(
        {
          phoneNumber: data.phoneNumber,
          planCode: data.planCode,
          network: data.network,
          amount: data.amount,
        },
        data.userId
      );

      if (result.success) {
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: user.wallet!.id },
            data: {
              walletBalance: {
                decrement: data.amount,
              },
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: user.wallet!.id,
              userId: data.userId,
              type: "DEBIT",
              amount: data.amount,
              balanceBefore: user.wallet!.walletBalance,
              balanceAfter: user.wallet!.walletBalance - data.amount,
              reference: `VTU_${transaction.id}`,
              description: `Data purchase for ${data.phoneNumber} (${data.network} - ${data.planCode})`,
              status: TransactionStatus.SUCCESS,
              category: "DATA",
            },
          }),
          prisma.vtuTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.SUCCESS,
              vendorReference: result.vendorReference,
              vendorId: result.vendor,
              metadata: {
                ...transaction.metadata,
                vendorResponse: result.data,
                vendorName: result.vendor,
              },
            },
          }),
        ]);

        return {
          success: true,
          data: result.data,
          transactionId: transaction.id,
        };
      } else {
        await prisma.vtuTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            metadata: {
              ...transaction.metadata,
              error: result.error,
              vendor: result.vendor,
            },
          },
        });

        throw new Error(result.error || "Vendor transaction failed");
      }
    } catch (error) {
      await prisma.vtuTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...transaction.metadata,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        },
      });
      throw error;
    }
  }

  async checkTransactionStatus(transactionId: string) {
    const transaction = await prisma.vtuTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const vendorService = getVendorService();
    
    if (transaction.vendorReference) {
      try {
        const result = await vendorService.checkTransactionStatus(
          transaction.vendorReference,
          transaction.userId
        );
        
        // Update transaction status if vendor reports a different status
        if (result.success && result.data?.status) {
          const statusMap: Record<string, TransactionStatus> = {
            'SUCCESS': TransactionStatus.SUCCESS,
            'FAILED': TransactionStatus.FAILED,
            'PENDING': TransactionStatus.PENDING,
            'PROCESSING': TransactionStatus.PROCESSING,
          };
          
          const newStatus = statusMap[result.data.status] || transaction.status;
          
          if (newStatus !== transaction.status) {
            await prisma.vtuTransaction.update({
              where: { id: transaction.id },
              data: {
                status: newStatus,
                metadata: {
                  ...transaction.metadata,
                  statusCheck: {
                    previousStatus: transaction.status,
                    newStatus: newStatus,
                    checkedAt: new Date().toISOString(),
                    vendorResponse: result.data,
                  },
                },
              },
            });
          }
        }
        
        return {
          success: true,
          data: {
            status: transaction.status,
            reference: transaction.id,
            vendorStatus: result.data?.status,
            vendorReference: transaction.vendorReference,
            amount: transaction.amount,
            product: transaction.product,
            createdAt: transaction.createdAt,
          },
        };
      } catch (error) {
        // If vendor check fails, return local status
        return {
          success: true,
          data: {
            status: transaction.status,
            reference: transaction.id,
            amount: transaction.amount,
            product: transaction.product,
            createdAt: transaction.createdAt,
            note: "Vendor status check failed, showing local status",
          },
        };
      }
    }

    return {
      success: true,
      data: {
        status: transaction.status,
        reference: transaction.id,
        amount: transaction.amount,
        product: transaction.product,
        createdAt: transaction.createdAt,
      },
    };
  }

  async getUserTransactions(userId: string, limit: number = 20, offset: number = 0) {
    const [transactions, total] = await Promise.all([
      prisma.vtuTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.vtuTransaction.count({
        where: { userId },
      }),
    ]);

    return {
      transactions,
      total,
      limit,
      offset,
    };
  }

  async getTransactionById(transactionId: string) {
    return prisma.vtuTransaction.findUnique({
      where: { id: transactionId },
    });
  }
}

// Singleton
let vtuServiceInstance: VTUService | null = null;

export function getVTUService(): VTUService {
  if (!vtuServiceInstance) {
    vtuServiceInstance = new VTUService();
  }
  return vtuServiceInstance;
}