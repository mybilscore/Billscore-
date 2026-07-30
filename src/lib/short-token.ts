import { randomBytes } from 'node:crypto';

export function generateShortToken(): string {
  const buffer = randomBytes(16);
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}