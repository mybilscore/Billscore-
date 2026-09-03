// lib/qr-hash.ts - Web version (NO EXPIRY)

const SECRET_KEY = process.env.QR_SECRET_KEY || "your-super-secret-qr-key-change-this";
const HASH_LENGTH = 16;

/**
 * Simple hash function for QR codes (matches mobile version)
 */
function simpleHash(payload: string): string {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  const padded = hexHash + '00000000'.substring(0, 8);
  return padded.substring(0, HASH_LENGTH);
}

/**
 * Generate a secure hash for QR data (NO EXPIRY)
 * Includes userId for verification
 */
export function generateQRHash(data: {
  identifier: string;
  type: string;
  provider: string;
  userId: string;
}): string {
  const payload = `${data.identifier}|${data.type}|${data.provider}|${data.userId}|${SECRET_KEY}`;
  return simpleHash(payload);
}

/**
 * Generate QR URL with hash (NO EXPIRY)
 * Includes userId in URL for identification
 */
export function generateQRUrl(
  baseUrl: string,
  data: {
    identifier: string;
    type: string;
    provider: string;
    userId: string;
  }
): string {
  const hash = generateQRHash(data);
  
  const params = new URLSearchParams({
    id: data.identifier,
    t: data.type,
    p: data.provider,
    h: hash,
    u: data.userId, // Include userId in URL
  });
  
  return `${baseUrl}/buy-now?${params.toString()}`;
}

/**
 * Verify QR hash (NO EXPIRY CHECK)
 * Verifies that the userId matches the hash
 */
export function verifyQRHash(params: {
  identifier: string;
  type: string;
  provider: string;
  userId: string;
  hash: string;
}): boolean {
  const { identifier, type, provider, userId, hash } = params;
  
  const payload = `${identifier}|${type}|${provider}|${userId}|${SECRET_KEY}`;
  const expectedHash = simpleHash(payload);
  
  // Constant time comparison
  if (hash.length !== expectedHash.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < hash.length; i++) {
    result |= hash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate QR secret key
 */
export function generateQRSecret(): string {
  const array = new Uint8Array(32);
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Parse QR URL and extract data (NO EXPIRY)
 */
export function parseQRUrl(url: string): {
  identifier: string;
  type: string;
  provider: string;
  userId: string;
  hash: string;
} | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    const identifier = params.get('id');
    const type = params.get('t');
    const provider = params.get('p');
    const userId = params.get('u');
    const hash = params.get('h');
    
    if (!identifier || !type || !provider || !userId || !hash) {
      return null;
    }
    
    return { identifier, type, provider, userId, hash };
  } catch {
    return null;
  }
}

/**
 * Generate QR Display Link (NO EXPIRY)
 * Includes userId for identification
 */
export function generateQRDisplayLink(
  baseUrl: string,
  identifier: string,
  type: string,
  provider: string,
  userId: string
): string {
  const buyNowLink = generateQRUrl(baseUrl, {
    identifier: identifier,
    type: type,
    provider: provider,
    userId: userId,
  });

  const url = new URL(buyNowLink);
  const hash = url.searchParams.get('h');

  let displayPath = `/qr/display/${identifier}`;
  const queryParams = new URLSearchParams();

  if (hash) {
    queryParams.set('h', hash);
  }

  queryParams.set('t', type);
  queryParams.set('p', encodeURIComponent(provider));
  queryParams.set('u', userId);

  const queryString = queryParams.toString();
  if (queryString) {
    displayPath += `?${queryString}`;
  }

  return `${baseUrl}${displayPath}`;
}