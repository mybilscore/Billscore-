// lib/qr-hash.ts

import { createHmac } from "crypto";

const SECRET_KEY = process.env.QR_SECRET_KEY || "your-super-secret-qr-key-change-this";
const HASH_ALGORITHM = "sha256";
const HASH_LENGTH = 16;

/**
 * Generate a secure hash for QR data
 */
export function generateQRHash(data: {
  identifier: string;
  type: string;
  provider: string;
  expiresAt?: string;
}): string {
  const timestamp = data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const payload = `${data.identifier}|${data.type}|${data.provider}|${timestamp}`;
  
  const hmac = createHmac(HASH_ALGORITHM, SECRET_KEY);
  hmac.update(payload);
  const fullHash = hmac.digest("hex");
  
  return fullHash.substring(0, HASH_LENGTH);
}

/**
 * Generate QR URL with hash
 */
export function generateQRUrl(
  baseUrl: string,
  data: {
    identifier: string;
    type: string;
    provider: string;
  }
): string {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const hash = generateQRHash({ ...data, expiresAt });
  
  const params = new URLSearchParams({
    id: data.identifier,
    t: data.type,
    p: data.provider,
    h: hash,
    e: expiresAt,
  });
  
  return `${baseUrl}/buy-now?${params.toString()}`;
}

/**
 * Verify QR hash
 */
export function verifyQRHash(params: {
  identifier: string;
  type: string;
  provider: string;
  hash: string;
  expiresAt?: string;
}): boolean {
  const { identifier, type, provider, hash, expiresAt } = params;
  
  if (expiresAt) {
    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime()) || expiryDate < new Date()) {
      return false;
    }
  }
  
  const timestamp = expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const expectedHash = generateQRHash({
    identifier,
    type,
    provider,
    expiresAt: timestamp,
  });
  
  return hash.length === expectedHash.length && hash === expectedHash;
}

/**
 * Generate QR secret key
 */
export function generateQRSecret(): string {
  return require("crypto").randomBytes(32).toString("hex");
}