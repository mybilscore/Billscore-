import * as crypto from 'crypto';
import { createHash } from 'crypto';

/**
 * Sorts params alphabetically, removes null/undefined values,
 * excludes the `sign` field, and returns them as a query string.
 */
function sortParams(body: Record<string, any>): string {
  return Object.keys(body)
    .sort()
    .filter(
      (key) =>
        key !== 'sign' &&
        key !== 'signature' &&
        body[key] !== undefined &&
        body[key] !== null &&
        body[key] !== ''
    )
    .map((key) => `${key}=${body[key]}`)
    .join('&');
}

/**
 * Builds the message digest (MD5 hash in uppercase).
 * This is what PalmPay expects for signature generation.
 */
function buildDigest(body: Record<string, any>): string {
  const sortedParameters = sortParams(body);
  console.log('🔐 [Signature] Sorted params:', sortedParameters);
  const md5Hash = createHash('md5').update(sortedParameters).digest('hex').toUpperCase();
  console.log('🔐 [Signature] MD5 Digest:', md5Hash);
  return md5Hash;
}

/**
 * Generate RSA-SHA1 signature for PalmPay API requests
 * According to PalmPay docs: 
 * 1. Sort params alphabetically
 * 2. Build query string (key=value&key2=value2)
 * 3. Create MD5 hash of the query string (UPPERCASE)
 * 4. Sign the MD5 hash using RSA-SHA1 with Private Key
 * 5. Return Base64 encoded signature
 */
export function generateSignature(
  data: Record<string, any>,
  privateKeyPEM: string,
  nonceStr?: string,
  requestTime?: number,
  version?: string
): string {
  if (!privateKeyPEM) throw new Error('Private key is required');

  // Create a copy of the data
  const requestBody = { ...data };

  // Add nonce and timestamp if provided
  if (nonceStr) requestBody.nonceStr = nonceStr;
  if (requestTime) requestBody.requestTime = requestTime;
  if (version) requestBody.version = version;

  // Build digest (MD5 hash of sorted params)
  const digest = buildDigest(requestBody);

  // Sign with RSA-SHA1
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(digest);
  signer.end();

  const signature = signer.sign(privateKeyPEM, 'base64');
  console.log('🔐 [Signature] Generated:', signature.substring(0, 50) + '...');
  
  return signature;
}

/**
 * Verify RSA-SHA1 signature for webhooks
 * PalmPay webhooks come with a 'sign' field that needs verification
 */
export function verifyWebhookSignature(
  payload: Record<string, any>,
  signature: string,
  publicKeyPEM: string
): boolean {
  if (!publicKeyPEM) throw new Error('Public key is required');
  if (!signature) throw new Error('Signature is required');

  try {
    // Remove the 'sign' field from payload
    const payloadWithoutSign = { ...payload };
    delete payloadWithoutSign.sign;

    // Build digest (MD5 hash of sorted params)
    const digest = buildDigest(payloadWithoutSign);

    // URL decode the signature (PalmPay URL encodes the signature)
    const decodedSignature = decodeURIComponent(signature);

    // Verify with RSA-SHA1
    const verifier = crypto.createVerify('RSA-SHA1');
    verifier.update(digest);
    verifier.end();

    const isValid = verifier.verify(publicKeyPEM, decodedSignature, 'base64');
    console.log('🔐 [Webhook] Signature verification:', isValid ? '✅ Valid' : '❌ Invalid');
    
    if (!isValid) {
      console.log('🔐 [Webhook] Received signature:', signature);
      console.log('🔐 [Webhook] Decoded signature:', decodedSignature);
    }

    return isValid;
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    return false;
  }
}

/**
 * Generate random nonce string
 */
export function generateNonce(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}