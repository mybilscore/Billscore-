import { prisma } from "../db";
import { verifyWalletFunding } from "./wallet-transaction.service";
import crypto from "crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export interface PaystackWebhookPayload {
  event: string;
  data: any;
}

/**
 * Verify Paystack webhook signature
 */
export function verifyPaystackWebhook(signature: string, payload: string): boolean {
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY!)
    .update(payload)
    .digest("hex");

  return hash === signature;
}

/**
 * Handle Paystack webhook
 */
export async function handlePaystackWebhook(payload: PaystackWebhookPayload) {
  const { event, data } = payload;

  // Store webhook for audit
  await prisma.wallet_webhooks.create({
    data: {
      webhook_id: data.id?.toString() || `webhook_${Date.now()}`,
      provider: "PAYSTACK",
      event_type: event,
      payload: payload,
      status: "RECEIVED",
      created_at: new Date(),
    },
  });

  switch (event) {
    case "charge.success":
      return handleChargeSuccess(data);
    
    case "transfer.success":
      return handleTransferSuccess(data);
    
    case "transfer.failed":
      return handleTransferFailed(data);
    
    case "transfer.reversed":
      return handleTransferReversed(data);
    
    default:
      console.log(`Unhandled Paystack event: ${event}`);
      return { received: true, event };
  }
}

/**
 * Handle successful charge (funding)
 */
async function handleChargeSuccess(data: any) {
  const reference = data.reference;

  try {
    const result = await verifyWalletFunding(reference);
    
    // Update webhook record
    await prisma.wallet_webhooks.updateMany({
      where: { webhook_id: data.id?.toString() },
      data: {
        status: "PROCESSED",
        processed_at: new Date(),
        transaction_id: result.transaction.id,
      },
    });

    return result;
  } catch (error) {
    console.error("Error processing charge.success webhook:", error);
    
    // Mark as failed
    await prisma.wallet_webhooks.updateMany({
      where: { webhook_id: data.id?.toString() },
      data: {
        status: "FAILED",
        processed_at: new Date(),
        error_message: error.message,
      },
    });

    throw error;
  }
}

/**
 * Handle successful transfer
 */
async function handleTransferSuccess(data: any) {
  const reference = data.reference;

  return await prisma.$transaction(async (tx) => {
    // Find transaction
    const transaction = await tx.wallet_transactions.findFirst({
      where: { provider_reference: reference },
    });

    if (!transaction) {
      throw new Error(`Transaction not found for reference: ${reference}`);
    }

    // Update transaction status
    await tx.wallet_transactions.update({
      where: { id: transaction.id },
      data: {
        status: "SUCCESS",
        updated_at: new Date(),
      },
    });

    // Update webhook record
    await tx.wallet_webhooks.updateMany({
      where: { webhook_id: data.id?.toString() },
      data: {
        status: "PROCESSED",
        processed_at: new Date(),
        transaction_id: transaction.id,
      },
    });

    return { success: true, transaction_id: transaction.id };
  });
}

/**
 * Handle failed transfer
 */
async function handleTransferFailed(data: any) {
  const reference = data.reference;
  const reason = data.reason;

  return await prisma.$transaction(async (tx) => {
    // Find transaction
    const transaction = await tx.wallet_transactions.findFirst({
      where: { provider_reference: reference },
      include: {
        wallet: true,
      },
    });

    if (!transaction) {
      throw new Error(`Transaction not found for reference: ${reference}`);
    }

    // Reverse the transaction (credit back the amount)
    const newBalance = transaction.wallet.balance + transaction.amount;

    // Update transaction status
    await tx.wallet_transactions.update({
      where: { id: transaction.id },
      data: {
        status: "FAILED",
        failure_reason: reason,
        updated_at: new Date(),
      },
    });

    // Reverse the debit
    await tx.wallets.update({
      where: { id: transaction.wallet_id },
      data: {
        balance: newBalance,
        ledger_balance: newBalance,
        available_balance: newBalance,
        updated_at: new Date(),
      },
    });

    // Create reversal transaction
    const reversal = await tx.wallet_transactions.create({
      data: {
        transaction_id: `REV_${transaction.transaction_id}`,
        wallet_id: transaction.wallet_id,
        transaction_type: "REVERSAL",
        amount: transaction.amount,
        fee: 0,
        net_amount: transaction.amount,
        balance_before: transaction.balance_after,
        balance_after: newBalance,
        reference_type: "REVERSAL",
        reference_id: transaction.id.toString(),
        reference_number: transaction.reference_number,
        description: `Reversal of failed transfer: ${reason}`,
        status: "SUCCESS",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Update webhook record
    await tx.wallet_webhooks.updateMany({
      where: { webhook_id: data.id?.toString() },
      data: {
        status: "PROCESSED",
        processed_at: new Date(),
        transaction_id: transaction.id,
      },
    });

    return { success: false, reason, reversal };
  });
}

/**
 * Handle reversed transfer
 */
async function handleTransferReversed(data: any) {
  const reference = data.reference;
  const reason = data.reason;

  return await prisma.$transaction(async (tx) => {
    // Find transaction
    const transaction = await tx.wallet_transactions.findFirst({
      where: { provider_reference: reference },
    });

    if (!transaction) {
      throw new Error(`Transaction not found for reference: ${reference}`);
    }

    // Update transaction status
    await tx.wallet_transactions.update({
      where: { id: transaction.id },
      data: {
        status: "REVERSED",
        failure_reason: reason,
        updated_at: new Date(),
      },
    });

    // Update webhook record
    await tx.wallet_webhooks.updateMany({
      where: { webhook_id: data.id?.toString() },
      data: {
        status: "PROCESSED",
        processed_at: new Date(),
        transaction_id: transaction.id,
      },
    });

    return { success: false, reason };
  });
}