// src/lib/services/palmpay-wallet.service.ts

import { prisma } from '~/lib/db';
import { getPalmPayService } from './palmpay.service';
import {
  CreateVirtualAccountRequest,
  CreateVirtualAccountResponse,
} from './types';

// ============================================================
// TYPES
// ============================================================

export interface CreateVirtualAccountForUserParams {
  /** Company / business name — must match the CAC record */
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * CAC validation.
 * PalmPay requires: starts with "RC" or "BN", followed by 4–10 digits.
 */
function isValidCAC(value: string): boolean {
  return /^(RC|BN)\d{4,10}$/i.test(value);
}

/**
 * Read the CAC number from environment.
 * Throws if missing or invalid — we fail fast rather than send bad data to PalmPay.
 */
function getEnvCAC(): string {
  const raw = (process.env.PALMPAY_CAC_NUMBER || '').replace(/\s+/g, '').toUpperCase();

  if (!raw) {
    throw new Error(
      'PALMPAY_CAC_NUMBER is not configured. Set it in .env (e.g., PALMPAY_CAC_NUMBER=RC1234567).'
    );
  }

  if (!isValidCAC(raw)) {
    throw new Error(
      `PALMPAY_CAC_NUMBER is invalid: "${raw}". Must start with "RC" or "BN" followed by 4–10 digits.`
    );
  }

  return raw;
}

/**
 * Sanitize a name for `virtualAccountName`.
 * Strips special characters, trims to 50 chars, replaces spaces with underscores.
 */
function cleanAccountName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .substring(0, 50)
    .trim()
    .replace(/\s+/g, '_');
}

// ============================================================
// CREATE VIRTUAL ACCOUNT FOR USER
// ============================================================

/**
 * Create a PalmPay **company** virtual account for a user and link it to their wallet.
 * Uses `identityType: 'company'` and the CAC number from `PALMPAY_CAC_NUMBER` env var.
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
    // ---------- 1. Read and validate CAC from env ----------
    const cacNumber = getEnvCAC();
    const cacMasked = cacNumber.substring(0, 4) + '***';

    console.log('📝 Creating PalmPay company virtual account:', {
      userId,
      identityType: 'company',
      cacMasked,
      customerName: userData.fullName,
      email: userData.email,
    });

    // ---------- 2. Build request ----------
    const cleanName = cleanAccountName(userData.fullName);

    const request: CreateVirtualAccountRequest = {
      virtualAccountName: `Bilscore_${cleanName}`,
      identityType: 'company',
      licenseNumber: cacNumber,
      email: userData.email,
      customerName: userData.fullName,
      accountReference: `BILSCORE_${userId}_${Date.now()}`,
    };

    // ---------- 3. Call PalmPay ----------
    const response = await palmPay.createVirtualAccount(request);

    if (!response.status || !response.data) {
      console.error('❌ PalmPay virtual account creation failed:', response.respMsg);
      throw new Error(`PalmPay failed: ${response.respMsg}`);
    }

    const virtualAccount = response.data;

    console.log(`✅ PalmPay virtual account created: ${virtualAccount.virtualAccountNo}`);

    // ---------- 4. Persist wallet ----------
    const wallet = await prisma.$transaction(async (tx) => {
      const newWallet = await tx.wallet.create({
        data: {
          userId,
          accountNumber: virtualAccount.virtualAccountNo,
          bankName: 'PALMPAY',
          accountName: virtualAccount.virtualAccountName || userData.fullName,
          walletBalance: 0,
          ledgerBalance: 0,
          currency: 'NGN',
          isActive: true,
          kycLevel: 2, // company accounts are Tier 2
          metadata: {
            palmpay: {
              virtualAccountNo: virtualAccount.virtualAccountNo,
              virtualAccountName: virtualAccount.virtualAccountName,
              identityType: 'company',
              cacMasked, // never store raw CAC
              accountReference: virtualAccount.accountReference,
              status: virtualAccount.status,
              appId: (virtualAccount as any).appId,
            },
            createdVia: 'palmpay',
            createdAt: new Date().toISOString(),
          },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { hasWallet: true },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: newWallet.id,
          userId,
          type: 'SYSTEM',
          amount: 0,
          balanceBefore: 0,
          balanceAfter: 0,
          reference: `VA_${virtualAccount.virtualAccountNo}`,
          description: `PalmPay company virtual account created: ${virtualAccount.virtualAccountNo}`,
          status: 'SUCCESS',
          category: 'SYSTEM',
          metadata: {
            palmpay: {
              virtualAccountName: virtualAccount.virtualAccountName,
              virtualAccountNo: virtualAccount.virtualAccountNo,
              identityType: 'company',
              email: virtualAccount.email,
              cacMasked,
              status: virtualAccount.status,
              accountReference: virtualAccount.accountReference,
            },
            action: 'VIRTUAL_ACCOUNT_CREATED',
          },
        },
      });

      return newWallet;
    });

    console.log(`✅ Wallet created: ${wallet.id} with account: ${wallet.accountNumber}`);
    console.log(`💰 Default balance: ₦${wallet.walletBalance}`);

    return { wallet, virtualAccount };
  } catch (error: any) {
    console.error('❌ Error creating PalmPay virtual account:', error.message);
    throw error;
  }
}

// ============================================================
// HELPERS (unchanged)
// ============================================================

export function isPalmPaySimulationMode(): boolean {
  const palmPay = getPalmPayService();
  return palmPay.isSimulationMode();
}

export async function getPalmPayVirtualAccountForUser(
  userId: string
): Promise<string | null> {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { accountNumber: true, metadata: true, bankName: true },
    });

    if (!wallet) return null;

    const isPalmpay =
      (wallet.metadata as any)?.palmpay ||
      (wallet.bankName === 'PALMPAY' && wallet.accountNumber.startsWith('6'));

    if (!isPalmpay) return null;
    return wallet.accountNumber;
  } catch (error) {
    console.error('❌ Error fetching PalmPay virtual account:', error);
    return null;
  }
}

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
        bankName: true,
      },
    });

    if (!wallet) return null;

    const meta: any = wallet.metadata || {};
    const isPalmpay =
      meta.palmpay ||
      (wallet.bankName === 'PALMPAY' && wallet.accountNumber.startsWith('6'));

    if (!isPalmpay) return null;

    return {
      virtualAccountNo: wallet.accountNumber,
      virtualAccountName: wallet.accountName,
      status: meta.palmpay?.status || 'Active',
      balance: Number(wallet.walletBalance),
    };
  } catch (error) {
    console.error('❌ Error fetching PalmPay virtual account details:', error);
    return null;
  }
}