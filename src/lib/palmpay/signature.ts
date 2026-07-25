// src/lib/palmpay/signature.ts

import * as crypto from 'crypto';

/**
 * Generate HMAC-SHA256 signature for PalmPay API requests
 */
export function generateSignature(
  data: Record<string, any>,
  privateKey: string,
  nonceStr: string,
  requestTime: number,
  version: string = 'V2.0'
): string {
  // Sort keys alphabetically
  const sortedKeys = Object.keys(data).filter(key => data[key] !== undefined && data[key] !== null).sort();
  
  // Build the string to sign
  const signStr = sortedKeys
    .map(key => `${key}=${data[key]}`)
    .join('&');
  
  // Add nonce and timestamp
  const fullSignStr = `${signStr}&nonceStr=${nonceStr}&requestTime=${requestTime}&version=${version}`;
  
  // Generate HMAC-SHA256 signature
  const hmac = crypto.createHmac('sha256', privateKey);
  hmac.update(fullSignStr);
  return hmac.digest('base64');
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: Record<string, any>,
  signature: string,
  publicKey: string
): boolean {
  // Implementation depends on PalmPay's webhook signature verification method
  // Usually it's RSA or HMAC verification with the public key
  try {
    // For HMAC verification
    const sortedKeys = Object.keys(payload)
      .filter(key => key !== 'sign' && payload[key] !== undefined && payload[key] !== null)
      .sort();
    
    const signStr = sortedKeys
      .map(key => `${key}=${payload[key]}`)
      .join('&');
    
    const expectedSignature = crypto
      .createHmac('sha256', publicKey)
      .update(signStr)
      .digest('base64');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

/**
 * Generate nonce string
 */
export function generateNonce(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}