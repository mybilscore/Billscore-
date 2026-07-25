import { prisma } from "../db";
import { z } from "zod";

// Schema for creating a wallet
export const createWalletSchema = z.object({
  party_id: z.number(),
  account_name: z.string().min(1, "Account name is required"),
  account_type: z.string().default("STANDARD"),
  currency: z.string().default("NGN"),
  kyc_level: z.number().int().min(1).max(3).default(1),
  daily_limit: z.number().optional().nullable(),
  monthly_limit: z.number().optional().nullable(),
  withdrawal_limit: z.number().optional().nullable(),
  metadata: z.any().optional(),
  created_by: z.number(),
});

export type CreateWalletInput = z.infer<typeof createWalletSchema>;

// Schema for wallet transaction
export const createTransactionSchema = z.object({
  wallet_id: z.number(),
  transaction_type: z.enum(["CREDIT", "DEBIT", "TRANSFER", "REVERSAL", "FEE", "ADJUSTMENT"]),
  amount: z.number().positive(),
  fee: z.number().min(0).default(0),
  reference_type: z.string().optional(),
  reference_id: z.string().optional(),
  reference_number: z.string().optional(),
  description: z.string().optional(),
  narration: z.string().optional(),
  payment_method: z.string().optional(),
  payment_provider: z.string().optional(),
  provider_reference: z.string().optional(),
  requires_approval: z.boolean().default(false),
  metadata: z.any().optional(),
  created_by: z.number(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// Schema for internal transfer
export const internalTransferSchema = z.object({
  from_wallet_id: z.number(),
  to_wallet_id: z.number(),
  amount: z.number().positive(),
  description: z.string().optional(),
  narration: z.string().optional(),
  reference_number: z.string().optional(),
  created_by: z.number(),
});

export type InternalTransferInput = z.infer<typeof internalTransferSchema>;

// Wallet interfaces
export interface WalletWithDetails {
  id: number;
  uid: string;
  account_number: string;
  account_name: string;
  account_type: string;
  balance: number;
  ledger_balance: number;
  available_balance: number;
  currency: string;
  is_active: boolean;
  is_locked: boolean;
  kyc_level: number;
  daily_limit: number | null;
  monthly_limit: number | null;
  withdrawal_limit: number | null;
  party: {
    id: number;
    name: string;
    type: string;
  };
}

export interface TransactionWithDetails {
  id: number;
  uid: string;
  transaction_id: string;
  transaction_type: string;
  amount: number;
  fee: number;
  net_amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  description: string | null;
  narration: string | null;
  payment_method: string | null;
  payment_provider: string | null;
  provider_reference: string | null;
  created_at: Date;
  wallet: {
    id: number;
    account_number: string;
    account_name: string;
  };
  counterparty_wallet?: {
    id: number;
    account_number: string;
    account_name: string;
  } | null;
}

/**
 * Generate a unique account number
 */
function generateAccountNumber(): string {
  const prefix = "10"; // Bank code or identifier
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${timestamp}${random}`;
}

/**
 * Generate a unique transaction ID
 */
function generateTransactionId(): string {
  return `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert BigInt to number for API responses
 */
function bigIntToNumber(value: bigint | null): number {
  return value ? Number(value) : 0;
}

/**
 * Create a new wallet for a party
 */
export async function createWallet(data: CreateWalletInput) {
  return await prisma.$transaction(async (tx) => {
    // Check if party already has a wallet
    const existingWallet = await tx.wallets.findUnique({
      where: { party_id: data.party_id },
    });

    if (existingWallet) {
      throw new Error(`Party already has a wallet: ${existingWallet.account_number}`);
    }

    // Verify party exists
    const party = await tx.parties.findUnique({
      where: { id: data.party_id },
    });

    if (!party) {
      throw new Error(`Party with ID ${data.party_id} not found`);
    }

    // Generate unique account number
    let accountNumber = generateAccountNumber();
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      const existing = await tx.wallets.findUnique({
        where: { account_number: accountNumber },
      });
      if (!existing) {
        isUnique = true;
      } else {
        accountNumber = generateAccountNumber();
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error("Failed to generate unique account number");
    }

    // Create wallet
    const wallet = await tx.wallets.create({
      data: {
        party_id: data.party_id,
        account_number: accountNumber,
        account_name: data.account_name,
        account_type: data.account_type,
        currency: data.currency,
        balance: 0,
        ledger_balance: 0,
        available_balance: 0,
        kyc_level: data.kyc_level,
        daily_limit: data.daily_limit ? BigInt(data.daily_limit) : null,
        monthly_limit: data.monthly_limit ? BigInt(data.monthly_limit) : null,
        withdrawal_limit: data.withdrawal_limit ? BigInt(data.withdrawal_limit) : null,
        metadata: data.metadata,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: data.created_by,
      },
    });

    // Create audit log
    await tx.party_audit_logs.create({
      data: {
        party_id: data.party_id,
        action: "WALLET_CREATED",
        action_category: "WALLET",
        entity_type: "WALLET",
        entity_id: wallet.id.toString(),
        platform: "EMAP",
        success: true,
        notes: `Wallet created with account number ${wallet.account_number}`,
      },
    });

    return {
      ...wallet,
      balance: bigIntToNumber(wallet.balance),
      ledger_balance: bigIntToNumber(wallet.ledger_balance),
      available_balance: bigIntToNumber(wallet.available_balance),
    };
  });
}

/**
 * Get wallet by ID
 */
export async function getWalletById(walletId: number) {
  const wallet = await prisma.wallets.findUnique({
    where: { id: walletId },
    include: {
      party: {
        select: {
          id: true,
          type: true,
          individual: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
          organization: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!wallet) return null;

  return {
    id: wallet.id,
    uid: wallet.uid,
    account_number: wallet.account_number,
    account_name: wallet.account_name,
    account_type: wallet.account_type,
    balance: bigIntToNumber(wallet.balance),
    ledger_balance: bigIntToNumber(wallet.ledger_balance),
    available_balance: bigIntToNumber(wallet.available_balance),
    currency: wallet.currency,
    is_active: wallet.is_active,
    is_locked: wallet.is_locked,
    kyc_level: wallet.kyc_level,
    daily_limit: wallet.daily_limit ? bigIntToNumber(wallet.daily_limit) : null,
    monthly_limit: wallet.monthly_limit ? bigIntToNumber(wallet.monthly_limit) : null,
    withdrawal_limit: wallet.withdrawal_limit ? bigIntToNumber(wallet.withdrawal_limit) : null,
    party: {
      id: wallet.party.id,
      name: wallet.party.individual 
        ? `${wallet.party.individual.first_name} ${wallet.party.individual.last_name}`
        : wallet.party.organization?.name || 'Unknown',
      type: wallet.party.type,
    },
    created_at: wallet.created_at,
  };
}

/**
 * Get wallet by party ID
 */
export async function getWalletByPartyId(partyId: number) {
  const wallet = await prisma.wallets.findUnique({
    where: { party_id: partyId },
    include: {
      party: {
        select: {
          id: true,
          type: true,
          individual: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
          organization: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!wallet) return null;

  return {
    id: wallet.id,
    uid: wallet.uid,
    account_number: wallet.account_number,
    account_name: wallet.account_name,
    account_type: wallet.account_type,
    balance: bigIntToNumber(wallet.balance),
    ledger_balance: bigIntToNumber(wallet.ledger_balance),
    available_balance: bigIntToNumber(wallet.available_balance),
    currency: wallet.currency,
    is_active: wallet.is_active,
    is_locked: wallet.is_locked,
    kyc_level: wallet.kyc_level,
    daily_limit: wallet.daily_limit ? bigIntToNumber(wallet.daily_limit) : null,
    monthly_limit: wallet.monthly_limit ? bigIntToNumber(wallet.monthly_limit) : null,
    withdrawal_limit: wallet.withdrawal_limit ? bigIntToNumber(wallet.withdrawal_limit) : null,
    party: {
      id: wallet.party.id,
      name: wallet.party.individual 
        ? `${wallet.party.individual.first_name} ${wallet.party.individual.last_name}`
        : wallet.party.organization?.name || 'Unknown',
      type: wallet.party.type,
    },
    created_at: wallet.created_at,
  };
}

/**
 * Get wallet by account number
 */
export async function getWalletByAccountNumber(accountNumber: string) {
  const wallet = await prisma.wallets.findUnique({
    where: { account_number: accountNumber },
    include: {
      party: {
        select: {
          id: true,
          type: true,
          individual: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
          organization: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!wallet) return null;

  return {
    id: wallet.id,
    uid: wallet.uid,
    account_number: wallet.account_number,
    account_name: wallet.account_name,
    account_type: wallet.account_type,
    balance: bigIntToNumber(wallet.balance),
    ledger_balance: bigIntToNumber(wallet.ledger_balance),
    available_balance: bigIntToNumber(wallet.available_balance),
    currency: wallet.currency,
    is_active: wallet.is_active,
    is_locked: wallet.is_locked,
    kyc_level: wallet.kyc_level,
    daily_limit: wallet.daily_limit ? bigIntToNumber(wallet.daily_limit) : null,
    monthly_limit: wallet.monthly_limit ? bigIntToNumber(wallet.monthly_limit) : null,
    withdrawal_limit: wallet.withdrawal_limit ? bigIntToNumber(wallet.withdrawal_limit) : null,
    party: {
      id: wallet.party.id,
      name: wallet.party.individual 
        ? `${wallet.party.individual.first_name} ${wallet.party.individual.last_name}`
        : wallet.party.organization?.name || 'Unknown',
      type: wallet.party.type,
    },
    created_at: wallet.created_at,
  };
}

/**
 * Process a transaction (credit/debit)
 */
export async function processTransaction(data: CreateTransactionInput) {
  return await prisma.$transaction(async (tx) => {
    // Get wallet with lock for update
    const wallet = await tx.wallets.findUnique({
      where: { id: data.wallet_id },
    });

    if (!wallet) {
      throw new Error(`Wallet with ID ${data.wallet_id} not found`);
    }

    if (!wallet.is_active) {
      throw new Error("Wallet is inactive");
    }

    if (wallet.is_locked) {
      throw new Error("Wallet is locked");
    }

    const amount = BigInt(data.amount);
    const fee = BigInt(data.fee);
    const netAmount = amount - fee;

    // Calculate new balances
    const beforeBalance = wallet.balance;
    let afterBalance: bigint;

    if (data.transaction_type === "CREDIT") {
      afterBalance = beforeBalance + netAmount;
    } else if (data.transaction_type === "DEBIT") {
      if (beforeBalance < amount) {
        throw new Error("Insufficient balance");
      }
      afterBalance = beforeBalance - amount;
    } else {
      throw new Error(`Unsupported transaction type: ${data.transaction_type}`);
    }

    // Generate transaction ID
    const transactionId = generateTransactionId();

    // Create transaction record
    const transaction = await tx.wallet_transactions.create({
      data: {
        transaction_id: transactionId,
        wallet_id: data.wallet_id,
        transaction_type: data.transaction_type,
        amount: amount,
        fee: fee,
        net_amount: netAmount,
        balance_before: beforeBalance,
        balance_after: afterBalance,
        reference_type: data.reference_type,
        reference_id: data.reference_id,
        reference_number: data.reference_number,
        description: data.description,
        narration: data.narration,
        payment_method: data.payment_method,
        payment_provider: data.payment_provider,
        provider_reference: data.provider_reference,
        requires_approval: data.requires_approval,
        status: data.requires_approval ? "PENDING" : "SUCCESS",
        metadata: data.metadata,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: data.created_by,
      },
    });

    // Update wallet balance
    await tx.wallets.update({
      where: { id: data.wallet_id },
      data: {
        balance: afterBalance,
        ledger_balance: afterBalance,
        available_balance: afterBalance,
        updated_at: new Date(),
      },
    });

    // Create ledger entry
    await tx.wallet_ledger_entries.create({
      data: {
        entry_id: `LEDGER_${transactionId}`,
        transaction_id: transaction.id,
        wallet_id: data.wallet_id,
        entry_type: data.transaction_type === "CREDIT" ? "CREDIT" : "DEBIT",
        amount: amount,
        account_type: "ASSET",
        account_code: "1001", // Cash account
        running_balance: afterBalance,
        description: data.description,
        created_at: new Date(),
      },
    });

    // If this is a credit transaction and there's a reference to another entity, link it
    if (data.reference_type && data.reference_id) {
      await linkTransactionToEntity(transaction.id, data.reference_type, data.reference_id, tx);
    }

    return {
      ...transaction,
      amount: bigIntToNumber(transaction.amount),
      fee: bigIntToNumber(transaction.fee),
      net_amount: bigIntToNumber(transaction.net_amount),
      balance_before: bigIntToNumber(transaction.balance_before),
      balance_after: bigIntToNumber(transaction.balance_after),
    };
  });
}

/**
 * Process internal transfer between wallets
 */
export async function internalTransfer(data: InternalTransferInput) {
  return await prisma.$transaction(async (tx) => {
    // Get both wallets with lock
    const fromWallet = await tx.wallets.findUnique({
      where: { id: data.from_wallet_id },
    });
    const toWallet = await tx.wallets.findUnique({
      where: { id: data.to_wallet_id },
    });

    if (!fromWallet) {
      throw new Error(`Source wallet with ID ${data.from_wallet_id} not found`);
    }

    if (!toWallet) {
      throw new Error(`Destination wallet with ID ${data.to_wallet_id} not found`);
    }

    if (!fromWallet.is_active) {
      throw new Error("Source wallet is inactive");
    }

    if (fromWallet.is_locked) {
      throw new Error("Source wallet is locked");
    }

    if (!toWallet.is_active) {
      throw new Error("Destination wallet is inactive");
    }

    const amount = BigInt(data.amount);

    if (fromWallet.balance < amount) {
      throw new Error("Insufficient balance");
    }

    // Generate transaction IDs
    const debitTransactionId = generateTransactionId();
    const creditTransactionId = generateTransactionId();

    // Calculate new balances
    const fromBeforeBalance = fromWallet.balance;
    const fromAfterBalance = fromBeforeBalance - amount;
    const toBeforeBalance = toWallet.balance;
    const toAfterBalance = toBeforeBalance + amount;

    // Create debit transaction (from wallet)
    const debitTransaction = await tx.wallet_transactions.create({
      data: {
        transaction_id: debitTransactionId,
        wallet_id: data.from_wallet_id,
        counterparty_wallet_id: data.to_wallet_id,
        transaction_type: "TRANSFER",
        amount: amount,
        fee: 0,
        net_amount: amount,
        balance_before: fromBeforeBalance,
        balance_after: fromAfterBalance,
        description: data.description,
        narration: data.narration,
        reference_number: data.reference_number,
        status: "SUCCESS",
        created_at: new Date(),
        updated_at: new Date(),
        created_by: data.created_by,
      },
    });

    // Create credit transaction (to wallet)
    const creditTransaction = await tx.wallet_transactions.create({
      data: {
        transaction_id: creditTransactionId,
        wallet_id: data.to_wallet_id,
        counterparty_wallet_id: data.from_wallet_id,
        transaction_type: "TRANSFER",
        amount: amount,
        fee: 0,
        net_amount: amount,
        balance_before: toBeforeBalance,
        balance_after: toAfterBalance,
        description: data.description,
        narration: data.narration,
        reference_number: data.reference_number,
        status: "SUCCESS",
        created_at: new Date(),
        updated_at: new Date(),
        created_by: data.created_by,
      },
    });

    // Update from wallet balance
    await tx.wallets.update({
      where: { id: data.from_wallet_id },
      data: {
        balance: fromAfterBalance,
        ledger_balance: fromAfterBalance,
        available_balance: fromAfterBalance,
        updated_at: new Date(),
      },
    });

    // Update to wallet balance
    await tx.wallets.update({
      where: { id: data.to_wallet_id },
      data: {
        balance: toAfterBalance,
        ledger_balance: toAfterBalance,
        available_balance: toAfterBalance,
        updated_at: new Date(),
      },
    });

    // Create ledger entries
    await tx.wallet_ledger_entries.createMany({
      data: [
        {
          entry_id: `LEDGER_${debitTransactionId}`,
          transaction_id: debitTransaction.id,
          wallet_id: data.from_wallet_id,
          entry_type: "DEBIT",
          amount: amount,
          account_type: "ASSET",
          account_code: "1001",
          running_balance: fromAfterBalance,
          description: data.description,
          created_at: new Date(),
        },
        {
          entry_id: `LEDGER_${creditTransactionId}`,
          transaction_id: creditTransaction.id,
          wallet_id: data.to_wallet_id,
          entry_type: "CREDIT",
          amount: amount,
          account_type: "ASSET",
          account_code: "1001",
          running_balance: toAfterBalance,
          description: data.description,
          created_at: new Date(),
        },
      ],
    });

    return {
      debitTransaction: {
        ...debitTransaction,
        amount: bigIntToNumber(debitTransaction.amount),
        balance_before: bigIntToNumber(debitTransaction.balance_before),
        balance_after: bigIntToNumber(debitTransaction.balance_after),
      },
      creditTransaction: {
        ...creditTransaction,
        amount: bigIntToNumber(creditTransaction.amount),
        balance_before: bigIntToNumber(creditTransaction.balance_before),
        balance_after: bigIntToNumber(creditTransaction.balance_after),
      },
    };
  });
}

/**
 * Link transaction to external entity (cluster payment, invoice, etc.)
 */
async function linkTransactionToEntity(
  transactionId: number,
  referenceType: string,
  referenceId: string,
  tx: any
) {
  const refId = parseInt(referenceId);

  switch (referenceType) {
    case "CLUSTER_PAYMENT":
      await tx.cluster_payments.update({
        where: { id: refId },
        data: { wallet_transaction_id: transactionId },
      });
      break;
    case "SALES_INVOICE":
      await tx.emmp_invoices.update({
        where: { id: refId },
        data: { wallet_transaction_id: transactionId },
      });
      break;
    case "PAYMENT":
      await tx.emmp_payments.update({
        where: { id: refId },
        data: { wallet_transaction_id: transactionId },
      });
      break;
  }
}

/**
 * Get transaction history for a wallet
 */
export async function getWalletTransactions(params: {
  walletId?: number;
  partyId?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const {
    walletId,
    partyId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = params;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (walletId) {
    where.wallet_id = walletId;
  } else if (partyId) {
    where.wallet = { party_id: partyId };
  }

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = startDate;
    if (endDate) where.created_at.lte = endDate;
  }

  // Get total count
  const total = await prisma.wallet_transactions.count({ where });

  // Get transactions
  const transactions = await prisma.wallet_transactions.findMany({
    where,
    include: {
      wallet: {
        select: {
          id: true,
          account_number: true,
          account_name: true,
        },
      },
      counterparty_wallet: {
        select: {
          id: true,
          account_number: true,
          account_name: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    skip,
    take: limit,
  });

  // Transform for response
  const transformedTransactions: TransactionWithDetails[] = transactions.map(t => ({
    id: t.id,
    uid: t.uid,
    transaction_id: t.transaction_id,
    transaction_type: t.transaction_type,
    amount: bigIntToNumber(t.amount),
    fee: bigIntToNumber(t.fee),
    net_amount: bigIntToNumber(t.net_amount),
    balance_before: bigIntToNumber(t.balance_before),
    balance_after: bigIntToNumber(t.balance_after),
    status: t.status,
    reference_type: t.reference_type,
    reference_id: t.reference_id,
    reference_number: t.reference_number,
    description: t.description,
    narration: t.narration,
    payment_method: t.payment_method,
    payment_provider: t.payment_provider,
    provider_reference: t.provider_reference,
    created_at: t.created_at,
    wallet: t.wallet,
    counterparty_wallet: t.counterparty_wallet || undefined,
  }));

  return {
    transactions: transformedTransactions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get wallet statistics
 */
export async function getWalletStats(walletId: number) {
  const wallet = await prisma.wallets.findUnique({
    where: { id: walletId },
    include: {
      transactions: {
        orderBy: {
          created_at: 'desc',
        },
        take: 1,
      },
      _count: {
        select: {
          transactions: true,
        },
      },
    },
  });

  if (!wallet) return null;

  // Get today's transactions
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTransactions = await prisma.wallet_transactions.count({
    where: {
      wallet_id: walletId,
      created_at: { gte: today },
    },
  });

  // Get pending approvals
  const pendingApprovals = await prisma.wallet_transactions.count({
    where: {
      wallet_id: walletId,
      status: "PENDING",
      requires_approval: true,
    },
  });

  return {
    balance: bigIntToNumber(wallet.balance),
    ledger_balance: bigIntToNumber(wallet.ledger_balance),
    available_balance: bigIntToNumber(wallet.available_balance),
    total_transactions: wallet._count.transactions,
    today_transactions: todayTransactions,
    pending_approvals: pendingApprovals,
    last_transaction: wallet.transactions[0] 
      ? {
          amount: bigIntToNumber(wallet.transactions[0].amount),
          type: wallet.transactions[0].transaction_type,
          date: wallet.transactions[0].created_at,
        }
      : null,
  };
}