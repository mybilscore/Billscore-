// src/lib/services/palmpay-wallet.service.ts

import { prisma } from '~/lib/db';
import { getPalmPayService } from './palmpay.service';
import { CreateVirtualAccountRequest, CreateVirtualAccountResponse } from './types';

export interface CreateVirtualAccountForUserParams {
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

/**
 * Create a PalmPay virtual account for a user and link it to their wallet
 */
export async function createPalmPayVirtualAccountForUser(
  userId: string,
  userData: CreateVirtualAccountForUserParams
): Promise<{
  wallet: any;
  virtualAccount: CreateVirtualAccountResponse;
}> {
  const palmPay = getPalmPayService();

  try {
    // Determine identity type based on what's available
    const identityType = userData.phone.match(/^[0-9]{10,15}$/) 
      ? 'personal'
      : 'personal_nin';

    // Clean virtual account name (remove special characters, max 50 chars)
    const cleanName = userData.fullName
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .substring(0, 50)
      .replace(/ /g, '_');

    // Build request according to PalmPay docs
    const request: CreateVirtualAccountRequest = {
      virtualAccountName: `Bilscore_${cleanName}`,
      identityType: identityType as 'personal' | 'personal_nin' | 'company',
      licenseNumber: `BVN${userData.phone.substring(0, 11)}`,
      email: userData.email,
      customerName: userData.fullName,
      accountReference: `BILSCORE_${userId}_${Date.now()}`,
    };

    console.log('📝 Creating PalmPay virtual account:', {
      userId,
      virtualAccountName: request.virtualAccountName,
      identityType: request.identityType,
      email: request.email,
      customerName: request.customerName,
      // Don't log licenseNumber for privacy
    });

    // ✅ Create virtual account via PalmPay API
    const response = await palmPay.createVirtualAccount(request);

    if (!response.status || !response.data) {
      console.error('❌ PalmPay virtual account creation failed:', response.respMsg);
      throw new Error(`PalmPay failed: ${response.respMsg}`);
    }

    const virtualAccount = response.data;

    console.log(`✅ PalmPay virtual account created: ${virtualAccount.virtualAccountNo}`);

    // ✅ Create wallet in database with PalmPay account number
    const wallet = await prisma.$transaction(async (tx) => {
      // Create wallet with PalmPay account number
      const newWallet = await tx.wallet.create({
        data: {
          userId: userId,
          accountNumber: virtualAccount.virtualAccountNo,
          bankName: 'PALMPAY',
          accountName: virtualAccount.virtualAccountName || userData.fullName,
          walletBalance: 0,
          ledgerBalance: 0,
          currency: 'NGN',
          isActive: true,
          kycLevel: 1,
          metadata: {
            palmpay: {
              virtualAccountNo: virtualAccount.virtualAccountNo,
              virtualAccountName: virtualAccount.virtualAccountName,
              identityType: virtualAccount.identityType,
              licenseNumber: virtualAccount.licenseNumber,
              accountReference: virtualAccount.accountReference,
              status: virtualAccount.status,
              appId: (virtualAccount as any).appId,
            },
            createdVia: 'palmpay',
            createdAt: new Date().toISOString(),
          },
        },
      });

      // Update user
      await tx.user.update({
        where: { id: userId },
        data: { 
          hasWallet: true,
        },
      });

      // ✅ Create wallet transaction for virtual account creation (SYSTEM type)
      await tx.walletTransaction.create({
        data: {
          walletId: newWallet.id,
          userId: userId,
          type: 'SYSTEM', // ✅ Valid WalletTransactionType
          amount: 0,
          balanceBefore: 0,
          balanceAfter: 0,
          reference: `VA_${virtualAccount.virtualAccountNo}`,
          description: `PalmPay virtual account created: ${virtualAccount.virtualAccountNo}`,
          status: 'SUCCESS',
          category: 'SYSTEM',
          metadata: {
            palmpay: {
              virtualAccountName: virtualAccount.virtualAccountName,
              virtualAccountNo: virtualAccount.virtualAccountNo,
              identityType: virtualAccount.identityType,
              email: virtualAccount.email,
              licenseNumber: virtualAccount.licenseNumber,
              customerName: virtualAccount.customerName,
              status: virtualAccount.status,
              accountReference: virtualAccount.accountReference,
              appId: (virtualAccount as any).appId,
            },
            action: 'VIRTUAL_ACCOUNT_CREATED',
          },
        },
      });

      return newWallet;
    });

    console.log(`✅ Wallet created: ${wallet.id} with account: ${wallet.accountNumber}`);
    console.log(`💰 Default balance: ₦${wallet.walletBalance}`);

    return {
      wallet,
      virtualAccount,
    };

  } catch (error: any) {
    console.error('❌ Error creating PalmPay virtual account:', error);
    throw error;
  }
}

/**
 * Check if PalmPay is in simulation mode
 */
export function isPalmPaySimulationMode(): boolean {
  const palmPay = getPalmPayService();
  return palmPay.isSimulationMode();
}

/**
 * Get PalmPay virtual account for a user
 */
export async function getPalmPayVirtualAccountForUser(userId: string): Promise<string | null> {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { accountNumber: true, metadata: true },
    });

    if (!wallet) return null;

    // Check if this is a PalmPay virtual account
    const isPalmpay = wallet.metadata?.palmpay || 
                     (wallet.bankName === 'PALMPAY' && wallet.accountNumber.startsWith('6'));

    if (!isPalmpay) return null;

    return wallet.accountNumber;
  } catch (error) {
    console.error('❌ Error fetching PalmPay virtual account:', error);
    return null;
  }
}

/**
 * Get PalmPay virtual account details for a user
 */
export async function getPalmPayVirtualAccountDetails(userId: string): Promise<{
  virtualAccountNo: string;
  virtualAccountName: string;
  status: string;
  balance: number;
} | null> {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: {
        accountNumber: true,
        accountName: true,
        walletBalance: true,
        metadata: true,
      },
    });

    if (!wallet) return null;

    const isPalmpay = wallet.metadata?.palmpay || 
                     (wallet.bankName === 'PALMPAY' && wallet.accountNumber.startsWith('6'));

    if (!isPalmpay) return null;

    return {
      virtualAccountNo: wallet.accountNumber,
      virtualAccountName: wallet.accountName,
      status: wallet.metadata?.palmpay?.status || 'Active',
      balance: Number(wallet.walletBalance),
    };
  } catch (error) {
    console.error('❌ Error fetching PalmPay virtual account details:', error);
    return null;
  }
}