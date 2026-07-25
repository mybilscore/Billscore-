// src/lib/db-helper.ts
import { prisma } from "./db";

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Check if it's a connection pool timeout or deadlock
      if (error.code === 'P2024' || 
          error.code === 'P2034' ||
          error.message?.includes('connection pool') ||
          error.message?.includes('timeout')) {
        console.log(`⚠️ Database connection issue, retrying... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  
  throw lastError;
}