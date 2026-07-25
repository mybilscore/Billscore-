// lib/audit-log.ts
import { prisma } from "~/lib/db";
import { headers } from "next/headers";

export interface AuditLogEntry {
  userId?: string;
  action: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  private static instance: AuditLogger;

  static getInstance(): AuditLogger {
    if (!this.instance) {
      this.instance = new AuditLogger();
    }
    return this.instance;
  }

  /**
   * Log an action with full context
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Get request context if available
      const headersList = headers();
      const ip = entry.ipAddress || headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
      const userAgent = entry.userAgent || headersList.get('user-agent') || 'unknown';

      await prisma.auditLog.create({
        data: {
          userId: entry.userId || null,
          action: entry.action,
          ipAddress: ip as string,
          userAgent: userAgent as string,
          metadata: entry.metadata || {},
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('❌ Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Log multiple actions in batch
   */
  async logBatch(entries: AuditLogEntry[]): Promise<void> {
    try {
      const headersList = headers();
      const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
      const userAgent = headersList.get('user-agent') || 'unknown';

      await prisma.$transaction(
        entries.map((entry) =>
          prisma.auditLog.create({
            data: {
              userId: entry.userId || null,
              action: entry.action,
              ipAddress: entry.ipAddress || (ip as string),
              userAgent: entry.userAgent || (userAgent as string),
              metadata: entry.metadata || {},
              timestamp: new Date(),
            },
          })
        )
      );
    } catch (error) {
      console.error('❌ Failed to create audit log batch:', error);
    }
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filters: {
    userId?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    return prisma.auditLog.findMany({
      where: {
        userId: filters.userId,
        action: filters.action,
        timestamp: {
          gte: filters.fromDate,
          lte: filters.toDate,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: filters.limit || 50,
      skip: filters.offset || 0,
      include: {
        user: {
          select: {
            email: true,
            fullName: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Get summary statistics for audit logs
   */
  async getStatistics(fromDate?: Date, toDate?: Date) {
    const startDate = fromDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const endDate = toDate || new Date();

    const [total, byAction, byUser] = await Promise.all([
      prisma.auditLog.count({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: true,
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      total,
      byAction: byAction.map(a => ({ action: a.action, count: a._count })),
      byUser: byUser.map(u => ({ userId: u.userId, count: u._count })),
      timeRange: {
        from: startDate,
        to: endDate,
      },
    };
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Pre-defined audit actions
export const AuditActions = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  USER_LOGGED_OUT: 'USER_LOGGED_OUT',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  WALLET_CREATED: 'WALLET_CREATED',
  WALLET_CREDITED: 'WALLET_CREDITED',
  WALLET_DEBITED: 'WALLET_DEBITED',
  TRANSACTION_INITIATED: 'TRANSACTION_INITIATED',
  TRANSACTION_COMPLETED: 'TRANSACTION_COMPLETED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  TOKEN_PURCHASED: 'TOKEN_PURCHASED',
  TOKEN_DELIVERED: 'TOKEN_DELIVERED',
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  REFERRAL_USED: 'REFERRAL_USED',
  REFERRAL_BONUS: 'REFERRAL_BONUS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  BRUTE_FORCE_ATTEMPT: 'BRUTE_FORCE_ATTEMPT',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];