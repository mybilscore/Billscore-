import { prisma } from "../db";
import { 
  processTransaction, 
  internalTransfer,
  CreateTransactionInput,
  InternalTransferInput 
} from "./wallet.service";
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  initiatePaystackTransfer,
  createPaystackRecipient,
} from "./paystack.service";

export interface FundWalletParams {
  wallet_id: number;
  amount: number; // in kobo
  email: string;
  metadata?: Record<string, any>;
  callback_url?: string;
  created_by: number;
}

export interface WithdrawToBankParams {
  wallet_id: number;
  amount: number; // in kobo
  account_number: string;
  bank_code: string;
  account_name: string;
  reason?: string;
  created_by: number;
}

export interface PayInvoiceParams {
  invoice_id: number;
  wallet_id: number;
  amount: number;
  reference_number: string;
  created_by: number;
}

/**
 * Fund wallet via Paystack
 */
export async function fundWalletViaPaystack(params: FundWalletParams) {
  // Get wallet details
  const wallet = await prisma.wallets.findUnique({
    where: { id: params.wallet_id },
    include: {
      party: {
        include: {
          individual: true,
          organization: true,
        },
      },
    },
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  // Generate unique reference
  const reference = `FUND_${Date.now()}_${wallet.account_number}`;

  // Initialize Paystack transaction
  const paystackData = await initializePaystackTransaction({
    email: params.email,
    amount: params.amount,
    reference,
    metadata: {
      wallet_id: params.wallet_id,
      party_id: wallet.party_id,
      ...params.metadata,
    },
    callback_url: params.callback_url,
  });

  // Create pending transaction record
  const transaction = await prisma.wallet_transactions.create({
    data: {
      transaction_id: reference,
      wallet_id: params.wallet_id,
      transaction_type: "CREDIT",
      amount: BigInt(params.amount),
      fee: 0,
      net_amount: BigInt(params.amount),
      balance_before: wallet.balance,
      balance_after: wallet.balance, // Will be updated after confirmation
      reference_type: "FUNDING",
      reference_id: params.wallet_id.toString(),
      reference_number: reference,
      description: `Wallet funding via Paystack`,
      narration: `Fund wallet with ${params.amount / 100} ${wallet.currency}`,
      payment_method: "CARD",
      payment_provider: "PAYSTACK",
      provider_reference: paystackData.reference,
      status: "PENDING",
      requires_approval: false,
      metadata: {
        paystack_data: paystackData,
        ...params.metadata,
      },
      created_at: new Date(),
      updated_at: new Date(),
      created_by: params.created_by,
    },
  });

  return {
    authorization_url: paystackData.authorization_url,
    reference: paystackData.reference,
    transaction: {
      ...transaction,
      amount: Number(transaction.amount),
    },
  };
}

/**
 * Verify and complete wallet funding
 */
export async function verifyWalletFunding(reference: string) {
  // Verify with Paystack
  const paystackData = await verifyPaystackTransaction(reference);

  if (paystackData.status !== "success") {
    throw new Error(`Payment not successful: ${paystackData.gateway_response}`);
  }

  // Get the transaction
  const transaction = await prisma.wallet_transactions.findUnique({
    where: { transaction_id: reference },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (transaction.status === "SUCCESS") {
    return { message: "Transaction already completed", transaction };
  }

  // Complete the transaction
  return await prisma.$transaction(async (tx) => {
    // Update transaction status
    const updatedTransaction = await tx.wallet_transactions.update({
      where: { id: transaction.id },
      data: {
        status: "SUCCESS",
        provider_reference: paystackData.reference,
        updated_at: new Date(),
      },
    });

    // Update wallet balance
    const wallet = await tx.wallets.findUnique({
      where: { id: transaction.wallet_id },
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const newBalance = wallet.balance + transaction.amount;

    await tx.wallets.update({
      where: { id: transaction.wallet_id },
      data: {
        balance: newBalance,
        ledger_balance: newBalance,
        available_balance: newBalance,
        updated_at: new Date(),
      },
    });

    // Create ledger entry
    await tx.wallet_ledger_entries.create({
      data: {
        entry_id: `LEDGER_${transaction.transaction_id}`,
        transaction_id: transaction.id,
        wallet_id: transaction.wallet_id,
        entry_type: "CREDIT",
        amount: transaction.amount,
        account_type: "ASSET",
        account_code: "1001",
        running_balance: newBalance,
        description: transaction.description,
        created_at: new Date(),
      },
    });

    return {
      ...updatedTransaction,
      amount: Number(updatedTransaction.amount),
      new_balance: Number(newBalance),
    };
  });
}

/**
 * Withdraw from wallet to bank account
 */
export async function withdrawToBank(params: WithdrawToBankParams) {
  return await prisma.$transaction(async (tx) => {
    // Get wallet
    const wallet = await tx.wallets.findUnique({
      where: { id: params.wallet_id },
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (wallet.balance < BigInt(params.amount)) {
      throw new Error("Insufficient balance");
    }

    // Create or get recipient code
    let recipientCode: string;
    
    // Check if we already have a recipient for this account
    const existingRecipient = await tx.wallet_settings.findFirst({
      where: {
        wallet_id: params.wallet_id,
        settings: {
          path: ["paystack_recipient_code"],
          equals: null,
        },
      },
    });

    if (existingRecipient?.settings && (existingRecipient.settings as any).paystack_recipient_code) {
      recipientCode = (existingRecipient.settings as any).paystack_recipient_code;
    } else {
      // Create new recipient
      const recipient = await createPaystackRecipient({
        type: "nuban",
        name: params.account_name,
        account_number: params.account_number,
        bank_code: params.bank_code,
      });
      recipientCode = recipient.recipient_code;

      // Save for future use
      await tx.wallet_settings.upsert({
        where: { wallet_id: params.wallet_id },
        update: {
          settings: {
            ...(existingRecipient?.settings || {}),
            paystack_recipient_code: recipientCode,
          },
        },
        create: {
          wallet_id: params.wallet_id,
          settings: {
            paystack_recipient_code: recipientCode,
          },
        },
      });
    }

    // Generate reference
    const reference = `WITHDRAW_${Date.now()}_${wallet.account_number}`;

    // Initiate Paystack transfer
    const transfer = await initiatePaystackTransfer({
      source: "balance",
      amount: params.amount,
      recipient: recipientCode,
      reason: params.reason || "Wallet withdrawal",
      reference,
    });

    // Create transaction record
    const newBalance = wallet.balance - BigInt(params.amount);

    const transaction = await tx.wallet_transactions.create({
      data: {
        transaction_id: reference,
        wallet_id: params.wallet_id,
        transaction_type: "DEBIT",
        amount: BigInt(params.amount),
        fee: 0,
        net_amount: BigInt(params.amount),
        balance_before: wallet.balance,
        balance_after: newBalance,
        reference_type: "WITHDRAWAL",
        reference_id: params.wallet_id.toString(),
        reference_number: reference,
        description: params.reason || "Withdrawal to bank",
        narration: `Withdraw ${params.amount / 100} ${wallet.currency} to bank`,
        payment_method: "BANK_TRANSFER",
        payment_provider: "PAYSTACK",
        provider_reference: transfer.reference,
        status: transfer.status === "success" ? "SUCCESS" : "PENDING",
        metadata: {
          transfer_data: transfer,
          account_number: params.account_number,
          bank_code: params.bank_code,
          account_name: params.account_name,
        },
        created_at: new Date(),
        updated_at: new Date(),
        created_by: params.created_by,
      },
    });

    // Update wallet balance
    await tx.wallets.update({
      where: { id: params.wallet_id },
      data: {
        balance: newBalance,
        ledger_balance: newBalance,
        available_balance: newBalance,
        updated_at: new Date(),
      },
    });

    // Create ledger entry
    await tx.wallet_ledger_entries.create({
      data: {
        entry_id: `LEDGER_${reference}`,
        transaction_id: transaction.id,
        wallet_id: params.wallet_id,
        entry_type: "DEBIT",
        amount: BigInt(params.amount),
        account_type: "ASSET",
        account_code: "1001",
        running_balance: newBalance,
        description: params.reason,
        created_at: new Date(),
      },
    });

    return {
      transaction: {
        ...transaction,
        amount: Number(transaction.amount),
      },
      transfer,
    };
  });
}

/**
 * Pay an invoice using wallet
 */
export async function payInvoice(params: PayInvoiceParams) {
  return await prisma.$transaction(async (tx) => {
    // Get invoice
    const invoice = await tx.emmp_invoices.findUnique({
      where: { id: params.invoice_id },
      include: {
        buyer: {
          include: {
            party: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.payment_status === "PAID") {
      throw new Error("Invoice already paid");
    }

    // Process payment
    const transaction = await processTransaction({
      wallet_id: params.wallet_id,
      transaction_type: "DEBIT",
      amount: params.amount,
      fee: 0,
      reference_type: "SALES_INVOICE",
      reference_id: params.invoice_id.toString(),
      reference_number: params.reference_number,
      description: `Payment for invoice ${invoice.invoice_number}`,
      narration: `Invoice payment`,
      payment_method: "WALLET",
      payment_provider: "INTERNAL",
      created_by: params.created_by,
    });

    // Update invoice status
    await tx.emmp_invoices.update({
      where: { id: params.invoice_id },
      data: {
        payment_status: "PAID",
        amount_paid: invoice.amount_paid + params.amount,
        amount_outstanding: invoice.total_amount - (invoice.amount_paid + params.amount),
        last_payment_date: new Date(),
        wallet_transaction_id: transaction.id,
      },
    });

    return transaction;
  });
}

/**
 * Process cluster payment via wallet
 */
export async function processClusterPayment(params: {
  cluster_payment_id: number;
  from_wallet_id: number;
  created_by: number;
}) {
  return await prisma.$transaction(async (tx) => {
    // Get cluster payment
    const payment = await tx.cluster_payments.findUnique({
      where: { id: params.cluster_payment_id },
    });

    if (!payment) {
      throw new Error("Cluster payment not found");
    }

    if (payment.status === "COMPLETED") {
      throw new Error("Payment already completed");
    }

    // Process the payment (debit from payer, credit to payee)
    const transfer = await internalTransfer({
      from_wallet_id: params.from_wallet_id,
      to_wallet_id: payment.to_party_id, // Note: This assumes payee has a wallet
      amount: payment.amount,
      description: `Payment for cluster: ${payment.payment_type}`,
      reference_number: payment.uid,
      created_by: params.created_by,
    });

    // Update payment status
    await tx.cluster_payments.update({
      where: { id: params.cluster_payment_id },
      data: {
        status: "COMPLETED",
        wallet_transaction_id: transfer.debitTransaction.id,
        processed_at: new Date(),
        processed_by: params.created_by,
      },
    });

    return transfer;
  });
}