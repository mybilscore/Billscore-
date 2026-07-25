// lib/rate-limit.ts
import { prisma } from "~/lib/db";

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  blockDurationMs?: number; // Optional block duration
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if a request is allowed
   */
  async check(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.windowMs);

    // Clean up old rate limit entries
    await this.cleanup(windowStart);

    // Find or create rate limit record
    const record = await prisma.rateLimit.upsert({
      where: { key },
      update: {
        requests: { increment: 1 },
        windowEnd: now.getTime() + this.config.windowMs > new Date(now.getTime() + this.config.windowMs) 
          ? new Date(now.getTime() + this.config.windowMs) 
          : new Date(now.getTime() + this.config.windowMs),
      },
      create: {
        key,
        requests: 1,
        windowStart: now,
        windowEnd: new Date(now.getTime() + this.config.windowMs),
      },
    });

    const remaining = Math.max(0, this.config.maxRequests - record.requests);
    const allowed = record.requests <= this.config.maxRequests;

    // If blocked, check if block should be lifted
    if (!allowed) {
      const blockDuration = this.config.blockDurationMs || this.config.windowMs;
      const blockEnd = new Date(record.windowStart.getTime() + blockDuration);
      
      if (now > blockEnd) {
        // Reset the record
        await prisma.rateLimit.update({
          where: { key },
          data: {
            requests: 1,
            windowStart: now,
            windowEnd: new Date(now.getTime() + this.config.windowMs),
          },
        });
        return { allowed: true, remaining: this.config.maxRequests - 1, resetAt: new Date(now.getTime() + this.config.windowMs) };
      }
      
      return { 
        allowed: false, 
        remaining: 0, 
        resetAt: blockEnd 
      };
    }

    return { 
      allowed, 
      remaining, 
      resetAt: record.windowEnd 
    };
  }

  /**
   * Clean up expired rate limit records
   */
  private async cleanup(beforeDate: Date): Promise<void> {
    await prisma.rateLimit.deleteMany({
      where: {
        windowEnd: {
          lt: beforeDate,
        },
      },
    });
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    await prisma.rateLimit.delete({
      where: { key },
    }).catch(() => {});
  }
}

/**
 * Middleware for rate limiting API routes
 */
export function withRateLimit(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);

  return async function rateLimitMiddleware(
    request: Request,
    key: string
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    return limiter.check(key);
  };
}

// Pre-configured rate limiters
export const registrationRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,           // 5 attempts
  blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours block
});

export const loginRateLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  maxRequests: 10,          // 10 attempts
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 100,         // 100 requests
});