// lib/brute-force.ts
import { prisma } from "~/lib/db";
import { auditLogger, AuditActions } from "./audit-log";

export interface BruteForceConfig {
  maxAttempts: number;       // Maximum failed attempts
  windowMs: number;          // Time window for counting attempts
  blockDurationMs: number;   // How long to block
  blockDurationMultiplier?: number; // Increase block duration after multiple blocks
}

export class BruteForceProtection {
  private config: BruteForceConfig;

  constructor(config: BruteForceConfig) {
    this.config = config;
  }

  /**
   * Record a failed attempt
   */
  async recordFailedAttempt(identifier: string, ipAddress?: string, metadata?: Record<string, any>): Promise<{
    blocked: boolean;
    attempts: number;
    remainingAttempts: number;
    blockExpiresAt?: Date;
  }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.windowMs);

    // Get or create registration attempt record
    let record = await prisma.registrationAttempt.findUnique({
      where: {
        email_ipAddress: {
          email: identifier,
          ipAddress: ipAddress || 'unknown',
        },
      },
    });

    if (!record) {
      record = await prisma.registrationAttempt.create({
        data: {
          email: identifier,
          ipAddress: ipAddress || 'unknown',
          attempts: 1,
          firstAttempt: now,
          lastAttempt: now,
        },
      });
    } else {
      // Check if blocked and if block has expired
      if (record.blockedUntil && record.blockedUntil > now) {
        // Still blocked
        return {
          blocked: true,
          attempts: record.attempts,
          remainingAttempts: 0,
          blockExpiresAt: record.blockedUntil,
        };
      }

      // If block expired, reset attempts
      if (record.blockedUntil && record.blockedUntil <= now) {
        record = await prisma.registrationAttempt.update({
          where: { id: record.id },
          data: {
            attempts: 1,
            blockedUntil: null,
            firstAttempt: now,
            lastAttempt: now,
          },
        });
      } else {
        // Increment attempts
        record = await prisma.registrationAttempt.update({
          where: { id: record.id },
          data: {
            attempts: { increment: 1 },
            lastAttempt: now,
          },
        });
      }
    }

    // Check if attempts exceed threshold
    const attempts = record.attempts;
    const maxAttempts = this.config.maxAttempts;
    const remainingAttempts = Math.max(0, maxAttempts - attempts);

    // If exceeded, block
    if (attempts > maxAttempts) {
      // Calculate block duration (with multiplier for repeated offenses)
      const blockDuration = this.config.blockDurationMs * 
        (this.config.blockDurationMultiplier || 1) * 
        Math.ceil(attempts / maxAttempts);

      const blockedUntil = new Date(now.getTime() + blockDuration);

      await prisma.registrationAttempt.update({
        where: { id: record.id },
        data: {
          blockedUntil,
        },
      });

      // Log brute force attempt
      await auditLogger.log({
        action: AuditActions.BRUTE_FORCE_ATTEMPT,
        metadata: {
          identifier,
          attempts,
          ipAddress,
          blockedUntil,
          ...metadata,
        },
        ipAddress,
      });

      return {
        blocked: true,
        attempts,
        remainingAttempts: 0,
        blockExpiresAt: blockedUntil,
      };
    }

    return {
      blocked: false,
      attempts,
      remainingAttempts,
    };
  }

  /**
   * Record a successful attempt (reset counter)
   */
  async recordSuccessfulAttempt(identifier: string, ipAddress?: string): Promise<void> {
    await prisma.registrationAttempt.delete({
      where: {
        email_ipAddress: {
          email: identifier,
          ipAddress: ipAddress || 'unknown',
        },
      },
    }).catch(() => {});
  }

  /**
   * Check if an identifier is currently blocked
   */
  async isBlocked(identifier: string, ipAddress?: string): Promise<{
    blocked: boolean;
    blockExpiresAt?: Date;
    attempts?: number;
  }> {
    const record = await prisma.registrationAttempt.findUnique({
      where: {
        email_ipAddress: {
          email: identifier,
          ipAddress: ipAddress || 'unknown',
        },
      },
    });

    if (!record) {
      return { blocked: false };
    }

    if (record.blockedUntil && record.blockedUntil > new Date()) {
      return {
        blocked: true,
        blockExpiresAt: record.blockedUntil,
        attempts: record.attempts,
      };
    }

    return { blocked: false, attempts: record.attempts };
  }

  /**
   * Get attempt statistics for an identifier
   */
  async getStatistics(identifier: string): Promise<{
    totalAttempts: number;
    blockedCount: number;
    lastAttempt?: Date;
    currentBlocked?: boolean;
  }> {
    const records = await prisma.registrationAttempt.findMany({
      where: { email: identifier },
    });

    const totalAttempts = records.reduce((sum, r) => sum + r.attempts, 0);
    const blockedCount = records.filter(r => r.blockedUntil && r.blockedUntil > new Date()).length;
    const lastAttempt = records.length > 0 ? records[records.length - 1].lastAttempt : undefined;
    const currentBlocked = records.some(r => r.blockedUntil && r.blockedUntil > new Date());

    return {
      totalAttempts,
      blockedCount,
      lastAttempt,
      currentBlocked,
    };
  }

  /**
   * Clear all attempts for an identifier (admin function)
   */
  async clearAttempts(identifier: string, ipAddress?: string): Promise<void> {
    await prisma.registrationAttempt.deleteMany({
      where: {
        email: identifier,
        ipAddress: ipAddress || undefined,
      },
    });

    await auditLogger.log({
      action: 'BRUTE_FORCE_CLEARED',
      metadata: {
        identifier,
        ipAddress,
        clearedBy: 'admin',
      },
    });
  }
}

// Pre-configured brute force protectors
export const registrationBruteForce = new BruteForceProtection({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours
  blockDurationMultiplier: 2,
});

export const loginBruteForce = new BruteForceProtection({
  maxAttempts: 5,
  windowMs: 5 * 60 * 1000, // 5 minutes
  blockDurationMs: 30 * 60 * 1000, // 30 minutes
  blockDurationMultiplier: 2,
});

export const pinBruteForce = new BruteForceProtection({
  maxAttempts: 3,
  windowMs: 10 * 60 * 1000, // 10 minutes
  blockDurationMs: 60 * 60 * 1000, // 1 hour
  blockDurationMultiplier: 4,
});