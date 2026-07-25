// src/lib/vendors/vtpass.utils.ts

/**
 * Utility to verify VTpass headers are correct
 */
export function verifyVTPassHeaders(headers: Record<string, string>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const requiredHeaders = ['api-key', 'secret-key', 'signature', 'timestamp'];

  for (const header of requiredHeaders) {
    if (!headers[header]) {
      errors.push(`Missing required header: ${header}`);
    }
  }

  // Verify timestamp format
  if (headers.timestamp) {
    const date = new Date(headers.timestamp);
    if (isNaN(date.getTime())) {
      errors.push('Invalid timestamp format. Must be ISO 8601');
    }
  }

  // Verify signature format (should be 128 hex characters for SHA512)
  if (headers.signature) {
    const hexRegex = /^[0-9a-f]{128}$/i;
    if (!hexRegex.test(headers.signature)) {
      errors.push('Invalid signature format. Expected SHA512 hex string');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}