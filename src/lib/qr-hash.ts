// lib/qr-hash.ts - Web version

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
  return simpleHash(payload);
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
  const payload = `${identifier}|${type}|${provider}|${timestamp}`;
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
 * Parse QR URL and extract data
 */
export function parseQRUrl(url: string): {
  identifier: string;
  type: string;
  provider: string;
  hash: string;
  expiresAt: string;
} | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    const identifier = params.get('id');
    const type = params.get('t');
    const provider = params.get('p');
    const hash = params.get('h');
    const expiresAt = params.get('e');
    
    if (!identifier || !type || !provider || !hash || !expiresAt) {
      return null;
    }
    
    return { identifier, type, provider, hash, expiresAt };
  } catch {
    return null;
  }
}