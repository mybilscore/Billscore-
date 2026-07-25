// src/lib/services/palmpay-wallet.service.ts

import { prisma } from "~/lib/db";
import { getPalmPayService } from "~/lib/palmpay/palmpay.service";
import { CreateVirtualAccountRequest } from "~/lib/palmpay/types";

/**
 * Create a PalmPay virtual account and link it to an existing user's wallet
 * @param userId - The user ID
 * @param userData - User information
 * @param defaultBalance - Optional default balance to credit to the wallet (e.g., welcome bonus)
 */
export async function createPalmPayVirtualAccountForUser(
  userId: string,
  userData: {
    fullName: string;
    email: string;
    phone: string;
    role: string;
  },
  defaultBalance: number = 0 // ✅ NEW: Default balance parameter
) {
  const palmPay = getPalmPayService();

  // Get user with wallet
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });

  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  // If wallet already has a PalmPay virtual account linked
  if (user.wallet?.metadata?.palmpay?.virtualAccountNo) {
    console.log(`✅ Wallet already linked to PalmPay: ${user.wallet.metadata.palmpay.virtualAccountNo}`);
    return {
      wallet: user.wallet,
      virtualAccount: user.wallet.metadata.palmpay,
    };
  }

  // Determine identity type based on user role
  const identityType = user.role === 'AGENCY' || user.role === 'SUPER_AGENCY' ? 'company' : 'personal';
  
  // Generate a unique account reference
  const accountReference = `BILSCORE_${userId.substring(0, 8)}_${Date.now()}`;

  const request: CreateVirtualAccountRequest = {
    virtualAccountName: `Bilscore_${userData.fullName.substring(0, 10)}`,
    identityType: identityType as any,
    licenseNumber: identityType === 'company' 
      ? `RC${Math.floor(1000000 + Math.random() * 9000000)}` 
      : `BVN${Math.floor(10000000000 + Math.random() * 90000000000)}`,
    email: userData.email,
    customerName: userData.fullName,
    accountReference,
  };

  console.log(`📝 Creating PalmPay virtual account for user ${userId}:`, {
    ...request,
    licenseNumber: '***REDACTED***',
  });

  try {
    // Create virtual account with PalmPay
    const response = await palmPay.createVirtualAccount(request);

    if (!response.status || response.respCode !== '00000000') {
      console.error('❌ Failed to create PalmPay virtual account:', response.respMsg);
      throw new Error(response.respMsg || 'Failed to create PalmPay virtual account');
    }

    const virtualAccount = response.data!;

    console.log(`✅ PalmPay virtual account created: ${virtualAccount.virtualAccountNo}`);
    console.log(`💰 Default balance: ₦${defaultBalance.toLocaleString()}`);

    // Check if user has a wallet
    let wallet = user.wallet;

    if (wallet) {
      // Update existing wallet with PalmPay info and default balance
      const updatedWallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          accountNumber: virtualAccount.virtualAccountNo,
          bankName: 'PALMPAY',
          accountName: virtualAccount.customerName,
          walletBalance: {
            increment: defaultBalance, // ✅ Add default balance
          },
          ledgerBalance: {
            increment: defaultBalance, // ✅ Add default balance
          },
          metadata: {
            ...(wallet.metadata || {}),
            palmpay: {
              virtualAccountName: virtualAccount.virtualAccountName,
              virtualAccountNo: virtualAccount.virtualAccountNo,
              identityType: virtualAccount.identityType,
              licenseNumber: virtualAccount.licenseNumber,
              accountReference: virtualAccount.accountReference,
              status: virtualAccount.status,
              createdAt: new Date().toISOString(),
              palmpayResponse: response,
              welcomeBonus: defaultBalance, // ✅ Store welcome bonus amount
            },
          },
        },
      });

      // ✅ Create wallet transaction for the default balance (welcome bonus)
      if (defaultBalance > 0) {
        await prisma.walletTransaction.create({
          data: {
            walletId: updatedWallet.id,
            userId: userId,
            type: 'CREDIT',
            amount: defaultBalance,
            balanceBefore: Number(wallet.walletBalance),
            balanceAfter: Number(wallet.walletBalance) + defaultBalance,
            reference: `WELCOME_BONUS_${userId}`,
            description: `🎉 Welcome bonus of ₦${defaultBalance.toLocaleString()} for joining Bilscore!`,
            status: 'SUCCESS',
            category: 'SYSTEM',
            metadata: {
              isWelcomeBonus: true,
              amount: defaultBalance,
              timestamp: new Date().toISOString(),
            },
          },
        });

        console.log(`🎉 Welcome bonus of ₦${defaultBalance.toLocaleString()} credited to wallet`);
      }

      // Create wallet transaction for the virtual account creation
      await prisma.walletTransaction.create({
        data: {
          walletId: updatedWallet.id,
          userId: userId,
          type: 'ADJUSTMENT',
          amount: 0,
          balanceBefore: Number(wallet.walletBalance) + defaultBalance,
          balanceAfter: Number(wallet.walletBalance) + defaultBalance,
          reference: `VA_${virtualAccount.virtualAccountNo}`,
          description: `PalmPay virtual account created: ${virtualAccount.virtualAccountNo}`,
          status: 'SUCCESS',
          category: 'SYSTEM',
          metadata: {
            palmpay: virtualAccount,
            action: 'VIRTUAL_ACCOUNT_CREATED',
          },
        },
      });

      // ✅ Update user's wallet balance
      await prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: Number(wallet.walletBalance) + defaultBalance,
          hasWallet: true,
        },
      });

      return {
        wallet: updatedWallet,
        virtualAccount,
        welcomeBonus: defaultBalance, // ✅ Return welcome bonus amount
      };
    }

    // ✅ If no wallet exists, create one with the PalmPay virtual account and default balance
    const newWallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        accountNumber: virtualAccount.virtualAccountNo,
        bankName: 'PALMPAY',
        accountName: virtualAccount.customerName,
        walletBalance: defaultBalance, // ✅ Set default balance
        ledgerBalance: defaultBalance, // ✅ Set default balance
        currency: 'NGN',
        isActive: true,
        kycLevel: 1,
        metadata: {
          palmpay: {
            virtualAccountName: virtualAccount.virtualAccountName,
            virtualAccountNo: virtualAccount.virtualAccountNo,
            identityType: virtualAccount.identityType,
            licenseNumber: virtualAccount.licenseNumber,
            accountReference: virtualAccount.accountReference,
            status: virtualAccount.status,
            createdAt: new Date().toISOString(),
            palmpayResponse: response,
            welcomeBonus: defaultBalance, // ✅ Store welcome bonus amount
          },
        },
      },
    });

    // ✅ Update user with wallet flag and balance
    await prisma.user.update({
      where: { id: userId },
      data: { 
        hasWallet: true,
        walletBalance: defaultBalance,
      },
    });

    // ✅ Create wallet transaction for the default balance (welcome bonus)
    if (defaultBalance > 0) {
      await prisma.walletTransaction.create({
        data: {
          walletId: newWallet.id,
          userId: userId,
          type: 'CREDIT',
          amount: defaultBalance,
          balanceBefore: 0,
          balanceAfter: defaultBalance,
          reference: `WELCOME_BONUS_${userId}`,
          description: `🎉 Welcome bonus of ₦${defaultBalance.toLocaleString()} for joining Bilscore!`,
          status: 'SUCCESS',
          category: 'SYSTEM',
          metadata: {
            isWelcomeBonus: true,
            amount: defaultBalance,
            timestamp: new Date().toISOString(),
          },
        },
      });

      console.log(`🎉 Welcome bonus of ₦${defaultBalance.toLocaleString()} credited to new wallet`);
    }

    // Create wallet transaction for the virtual account creation
    await prisma.walletTransaction.create({
      data: {
        walletId: newWallet.id,
        userId: userId,
        type: 'ADJUSTMENT',
        amount: 0,
        balanceBefore: defaultBalance,
        balanceAfter: defaultBalance,
        reference: `VA_${virtualAccount.virtualAccountNo}`,
        description: `PalmPay virtual account created: ${virtualAccount.virtualAccountNo}`,
        status: 'SUCCESS',
        category: 'SYSTEM',
        metadata: {
          palmpay: virtualAccount,
          action: 'VIRTUAL_ACCOUNT_CREATED',
        },
      },
    });

    return {
      wallet: newWallet,
      virtualAccount,
      welcomeBonus: defaultBalance, // ✅ Return welcome bonus amount
    };
  } catch (error: any) {
    console.error('❌ PalmPay virtual account creation failed:', error);
    throw error;
  }
}

/**
 * Sync PalmPay wallet balance with local wallet
 */
export async function syncPalmPayWalletBalance(userId: string): Promise<{
  synced: boolean;
  previousBalance: number;
  newBalance: number;
  difference: number;
  ordersProcessed: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });

  if (!user || !user.wallet) {
    throw new Error(`User or wallet not found for user ${userId}`);
  }

  const palmPay = getPalmPayService();
  const virtualAccountNo = user.wallet.metadata?.palmpay?.virtualAccountNo;

  if (!virtualAccountNo) {
    throw new Error(`No PalmPay virtual account found for user ${userId}`);
  }

  try {
    // Query recent orders for this virtual account
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    const response = await palmPay.queryOrders({
      accountNo: virtualAccountNo,
      startTime: thirtyDaysAgo,
      endTime: now,
      pageIndex: 1,
      pageSize: 100,
    });

    if (!response.status || response.respCode !== '00000000') {
      console.error('Failed to sync PalmPay balance:', response.respMsg);
      return {
        synced: false,
        previousBalance: Number(user.wallet.walletBalance),
        newBalance: Number(user.wallet.walletBalance),
        difference: 0,
        ordersProcessed: 0,
      };
    }

    const orders = response.data?.list || [];
    
    // Get the last synced timestamp
    const lastSyncedAt = user.wallet.metadata?.palmpay?.lastSyncedAt 
      ? new Date(user.wallet.metadata.palmpay.lastSyncedAt)
      : new Date(thirtyDaysAgo);

    // Filter orders since last sync
    const newOrders = orders.filter(order => 
      order.orderStatus === 1 && // SUCCESS status
      order.createdTime > lastSyncedAt.getTime()
    );

    if (newOrders.length === 0) {
      return {
        synced: true,
        previousBalance: Number(user.wallet.walletBalance),
        newBalance: Number(user.wallet.walletBalance),
        difference: 0,
        ordersProcessed: 0,
      };
    }

    // Calculate total deposits
    const totalNewDeposits = newOrders.reduce((sum, order) => sum + (order.orderAmount / 100), 0);
    const currentBalance = Number(user.wallet.walletBalance);
    const newBalance = currentBalance + totalNewDeposits;

    // Update wallet balance
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: user.wallet!.id },
        data: {
          walletBalance: newBalance,
          ledgerBalance: newBalance,
          metadata: {
            ...(user.wallet!.metadata || {}),
            palmpay: {
              ...(user.wallet!.metadata?.palmpay || {}),
              lastSyncedAt: new Date().toISOString(),
              lastSyncOrders: newOrders.length,
              lastSyncAmount: totalNewDeposits,
            },
          },
        },
      }),
      // Create a single transaction for the total deposit
      prisma.walletTransaction.create({
        data: {
          walletId: user.wallet!.id,
          userId: userId,
          type: 'CREDIT',
          amount: totalNewDeposits,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          reference: `SYNC_${Date.now()}`,
          description: `PalmPay balance sync - ${newOrders.length} new deposits processed`,
          status: 'SUCCESS',
          category: 'DEPOSIT',
          metadata: {
            palmpay: {
              ordersProcessed: newOrders.length,
              orderIds: newOrders.map(o => o.orderNo),
              totalAmount: totalNewDeposits,
              syncType: 'AUTO_SYNC',
            },
          },
        },
      }),
    ]);

    // ✅ Update user's wallet balance
    await prisma.user.update({
      where: { id: userId },
      data: {
        walletBalance: newBalance,
      },
    });

    return {
      synced: true,
      previousBalance: currentBalance,
      newBalance: newBalance,
      difference: totalNewDeposits,
      ordersProcessed: newOrders.length,
    };
  } catch (error: any) {
    console.error('Failed to sync PalmPay balance:', error);
    return {
      synced: false,
      previousBalance: Number(user.wallet.walletBalance),
      newBalance: Number(user.wallet.walletBalance),
      difference: 0,
      ordersProcessed: 0,
    };
  }
}

/**
 * Get PalmPay virtual account details for a user
 */
export async function getPalmPayVirtualAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });

  if (!user || !user.wallet) {
    return null;
  }

  const palmpayData = user.wallet.metadata?.palmpay;

  if (!palmpayData || !palmpayData.virtualAccountNo) {
    return null;
  }

  // Query PalmPay for latest status
  const palmPay = getPalmPayService();
  
  try {
    const response = await palmPay.queryVirtualAccount(palmpayData.virtualAccountNo);
    
    if (response.status && response.respCode === '00000000') {
      return {
        ...palmpayData,
        status: response.data?.status || palmpayData.status,
        wallet: {
          id: user.wallet.id,
          accountNumber: user.wallet.accountNumber,
          balance: Number(user.wallet.walletBalance),
          availableBalance: Number(user.wallet.walletBalance),
        },
        welcomeBonus: palmpayData.welcomeBonus || 0, // ✅ Include welcome bonus
      };
    }
  } catch (error) {
    console.error('Failed to query PalmPay virtual account:', error);
  }

  return {
    ...palmpayData,
    wallet: {
      id: user.wallet.id,
      accountNumber: user.wallet.accountNumber,
      balance: Number(user.wallet.walletBalance),
      availableBalance: Number(user.wallet.walletBalance),
    },
    welcomeBonus: palmpayData.welcomeBonus || 0, // ✅ Include welcome bonus
  };
}

/**
 * Check if PalmPay service is in simulation mode
 */
export function isPalmPaySimulationMode(): boolean {
  const palmPay = getPalmPayService();
  return palmPay.isSimulationMode();
}

/**
 * Get PalmPay service status
 */
export function getPalmPayStatus(): {
  mode: 'simulation' | 'production';
  isConfigured: boolean;
} {
  const palmPay = getPalmPayService();
  return {
    mode: palmPay.isSimulationMode() ? 'simulation' : 'production',
    isConfigured: !!process.env.PALMPAY_AUTHORIZATION,
  };
}