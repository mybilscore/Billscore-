/**
 * Paystack Integration Service
 * Handles external payment processing with Paystack
 */

// Paystack API configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

export interface PaystackInitializeParams {
  email: string;
  amount: number; // in kobo (multiply by 100 for NGN)
  reference?: string;
  currency?: string;
  metadata?: Record<string, any>;
  callback_url?: string;
}

export interface PaystackTransferParams {
  source: string; // balance or wallet ID
  amount: number; // in kobo
  recipient: string; // recipient code
  reason?: string;
  reference?: string;
}

export interface PaystackRecipientParams {
  type: string; // nuban, mobile_money, etc.
  name: string;
  account_number: string;
  bank_code: string;
  currency?: string;
}

/**
 * Initialize a transaction with Paystack
 */
export async function initializePaystackTransaction(params: PaystackInitializeParams) {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amount,
        reference: params.reference,
        currency: params.currency || "NGN",
        metadata: params.metadata,
        callback_url: params.callback_url,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to initialize Paystack transaction");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Paystack initialization error:", error);
    throw error;
  }
}

/**
 * Verify a Paystack transaction
 */
export async function verifyPaystackTransaction(reference: string) {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to verify Paystack transaction");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Paystack verification error:", error);
    throw error;
  }
}

/**
 * Create a transfer recipient
 */
export async function createPaystackRecipient(params: PaystackRecipientParams) {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/transferrecipient`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: params.type,
        name: params.name,
        account_number: params.account_number,
        bank_code: params.bank_code,
        currency: params.currency || "NGN",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create Paystack recipient");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Paystack recipient creation error:", error);
    throw error;
  }
}

/**
 * Initiate a transfer
 */
export async function initiatePaystackTransfer(params: PaystackTransferParams) {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/transfer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: params.source,
        amount: params.amount,
        recipient: params.recipient,
        reason: params.reason,
        reference: params.reference,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to initiate Paystack transfer");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Paystack transfer initiation error:", error);
    throw error;
  }
}

/**
 * Get bank list
 */
export async function getPaystackBanks() {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/bank`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch banks");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Paystack bank list error:", error);
    throw error;
  }
}

/**
 * Validate bank account
 */
export async function validateBankAccount(accountNumber: string, bankCode: string) {
  try {
    const response = await fetch(
      `${PAYSTACK_API_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to validate account");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Paystack account validation error:", error);
    throw error;
  }
}