// lib/cache/cache.service.ts

import { safeRedisGet, safeRedisSet, getRedisClient } from "~/lib/redis";
import { prisma } from "~/lib/db";

const CACHE_TTL = {
  USER: 300, // 5 minutes
  WALLET: 60, // 1 minute
  BALANCE: 30, // 30 seconds
  VENDOR: 600, // 10 minutes
  CUSTOMER: 300, // 5 minutes
  TRANSACTION: 3600, // 1 hour
  SUBSCRIPTION: 300, // 5 minutes
  SAVED_METERS: 600, // 10 minutes
  SAVED_DECODERS: 600, // 10 minutes
};

// ✅ Performance monitoring
function measurePerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().then(result => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`⚠️ [PERF] ${name} took ${duration}ms (slow)`);
    } else {
      console.log(`✅ [PERF] ${name} took ${duration}ms`);
    }
    return result;
  });
}

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class CacheService {
  // ============================================================
  // USER CACHING
  // ============================================================

  static async getUser(userId: string) {
    const cacheKey = `user:${userId}`;
    
    try {
      const cached = await safeRedisGet(cacheKey);
      if (cached) {
        console.log(`✅ [Cache] User ${userId} found in cache`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] User cache miss for ${userId}`);
    }

    return await measurePerformance(`User fetch ${userId}`, async () => {
      console.log(`📡 [Cache] Fetching user ${userId} from database`);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (user) {
        await safeRedisSet(cacheKey, JSON.stringify(user), { EX: CACHE_TTL.USER });
        console.log(`✅ [Cache] User ${userId} cached for ${CACHE_TTL.USER}s`);
      }

      return user;
    });
  }

  static async invalidateUser(userId: string) {
    const cacheKey = `user:${userId}`;
    try {
      const client = await getRedisClient();
      await client.del(cacheKey);
      await client.del(`wallet:${userId}`);
      await client.del(`balance:${userId}`);
      console.log(`🗑️ [Cache] User ${userId} cache invalidated`);
    } catch (error) {
      console.error(`❌ [Cache] Failed to invalidate user ${userId}:`, error);
    }
  }

  // ============================================================
  // WALLET & BALANCE CACHING
  // ============================================================

  static async getWallet(userId: string) {
    const cacheKey = `wallet:${userId}`;
    
    try {
      const cached = await safeRedisGet(cacheKey);
      if (cached) {
        console.log(`✅ [Cache] Wallet for ${userId} found in cache`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Wallet cache miss for ${userId}`);
    }

    return await measurePerformance(`Wallet fetch ${userId}`, async () => {
      console.log(`📡 [Cache] Fetching wallet ${userId} from database`);
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
      });

      if (wallet) {
        await safeRedisSet(cacheKey, JSON.stringify(wallet), { EX: CACHE_TTL.WALLET });
        console.log(`✅ [Cache] Wallet ${userId} cached for ${CACHE_TTL.WALLET}s`);
      }

      return wallet;
    });
  }

  static async getBalance(userId: string) {
    const cacheKey = `balance:${userId}`;
    
    try {
      const cached = await safeRedisGet(cacheKey);
      if (cached) {
        console.log(`✅ [Cache] Balance for ${userId} found in cache`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Balance cache miss for ${userId}`);
    }

    return await measurePerformance(`Balance fetch ${userId}`, async () => {
      console.log(`📡 [Cache] Fetching balance ${userId} from database`);
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
        select: {
          walletBalance: true,
        },
      });

      if (wallet) {
        const balance = {
          balance: Number(wallet.walletBalance || 0),
        };
        await safeRedisSet(cacheKey, JSON.stringify(balance), { EX: CACHE_TTL.BALANCE });
        console.log(`✅ [Cache] Balance ${userId} cached for ${CACHE_TTL.BALANCE}s`);
        return balance;
      }

      return null;
    });
  }

  static async invalidateWallet(userId: string) {
    const keys = [
      `wallet:${userId}`,
      `balance:${userId}`,
    ];
    try {
      const client = await getRedisClient();
      for (const key of keys) {
        await client.del(key);
      }
      console.log(`🗑️ [Cache] Wallet for ${userId} invalidated`);
    } catch (error) {
      console.error(`❌ [Cache] Failed to invalidate wallet ${userId}:`, error);
    }
  }

  // ============================================================
  // VENDOR CACHING
  // ============================================================

  static async getVendors() {
    const cacheKey = 'vendors:all';
    
    try {
      const cached = await safeRedisGet(cacheKey);
      if (cached) {
        console.log(`✅ [Cache] Vendors found in cache`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('⚠️ [Cache] Vendors cache miss');
    }

    return await measurePerformance('Vendors fetch', async () => {
      console.log('📡 [Cache] Fetching vendors from database');
      const vendors = await prisma.vendor.findMany({
        where: { status: 'ACTIVE' },
        include: { services: true },
        orderBy: { priority: 'asc' },
      });

      if (vendors && vendors.length > 0) {
        await safeRedisSet(cacheKey, JSON.stringify(vendors), { EX: CACHE_TTL.VENDOR });
        console.log(`✅ [Cache] ${vendors.length} vendors cached for ${CACHE_TTL.VENDOR}s`);
      }

      return vendors;
    });
  }

  static async getVendorByCode(code: string) {
    const cacheKey = `vendor:${code}`;
    
    try {
      const cached = await safeRedisGet(cacheKey);
      if (cached) {
        console.log(`✅ [Cache] Vendor ${code} found in cache`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Vendor ${code} cache miss`);
    }

    return await measurePerformance(`Vendor fetch ${code}`, async () => {
      console.log(`📡 [Cache] Fetching vendor ${code} from database`);
      const vendor = await prisma.vendor.findUnique({
        where: { code },
        include: { services: true },
      });

      if (vendor) {
        await safeRedisSet(cacheKey, JSON.stringify(vendor), { EX: CACHE_TTL.VENDOR });
        console.log(`✅ [Cache] Vendor ${code} cached for ${CACHE_TTL.VENDOR}s`);
      }

      return vendor;
    });
  }

  static async invalidateVendors() {
    try {
      const client = await getRedisClient();
      await client.del('vendors:all');
      
      const vendors = await prisma.vendor.findMany({ select: { code: true } });
      for (const vendor of vendors) {
        await client.del(`vendor:${vendor.code}`);
      }
      console.log('🗑️ [Cache] All vendors invalidated');
    } catch (error) {
      console.error('❌ [Cache] Failed to invalidate vendors:', error);
    }
  }

  // ============================================================
  // CUSTOMER CACHING
  // ============================================================

  static async getCustomer(userId: string, phone: string) {
    const cacheKey = `customer:${userId}:${phone}`;
    
    try {
      const cached = await safeRedisGet(cacheKey);
      if (cached) {
        console.log(`✅ [Cache] Customer ${phone} found in cache`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Customer ${phone} cache miss`);
    }

    return await measurePerformance(`Customer fetch ${phone}`, async () => {
      console.log(`📡 [Cache] Fetching customer ${phone} from database`);
      const customer = await prisma.customer.findUnique({
        where: {
          userId_phone: {
            userId,
            phone,
          },
        },
      });

      if (customer) {
        await safeRedisSet(cacheKey, JSON.stringify(customer), { EX: CACHE_TTL.CUSTOMER });
        console.log(`✅ [Cache] Customer ${phone} cached for ${CACHE_TTL.CUSTOMER}s`);
      }

      return customer;
    });
  }

  static async createCustomer(data: any) {
    const customer = await prisma.customer.create({ data });
    const cacheKey = `customer:${data.userId}:${data.phone}`;
    await safeRedisSet(cacheKey, JSON.stringify(customer), { EX: CACHE_TTL.CUSTOMER });
    console.log(`✅ [Cache] New customer ${data.phone} cached`);
    return customer;
  }

  static async invalidateCustomer(userId: string, phone: string) {
    const cacheKey = `customer:${userId}:${phone}`;
    try {
      const client = await getRedisClient();
      await client.del(cacheKey);
      console.log(`🗑️ [Cache] Customer ${phone} invalidated`);
    } catch (error) {
      console.error(`❌ [Cache] Failed to invalidate customer ${phone}:`, error);
    }
  }

  // ============================================================
  // SAVED METERS CACHING
  // ============================================================

  static async getSavedMeters(userId: string) {
    const cacheKey = `saved_meters:${userId}`;
    
    try {
      const cached = await safeRedisGet(cacheKey);
      if (cached) {
        console.log(`✅ [Cache] Saved meters for ${userId} found in cache`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Saved meters cache miss for ${userId}`);
    }

    return await measurePerformance(`Saved meters fetch ${userId}`, async () => {
      console.log(`📡 [Cache] Fetching saved meters ${userId} from database`);
      const meters = await prisma.savedMeter.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (meters) {
        await safeRedisSet(cacheKey, JSON.stringify(meters), { EX: CACHE_TTL.SAVED_METERS });
        console.log(`✅ [Cache] ${meters.length} saved meters cached for ${CACHE_TTL.SAVED_METERS}s`);
      }

      return meters || [];
    });
  }

  static async invalidateSavedMeters(userId: string) {
    const cacheKey = `saved_meters:${userId}`;
    try {
      const client = await getRedisClient();
      await client.del(cacheKey);
      console.log(`🗑️ [Cache] Saved meters for ${userId} invalidated`);
    } catch (error) {
      console.error(`❌ [Cache] Failed to invalidate saved meters:`, error);
    }
  }

  // ============================================================
  // SAVED DECODERS CACHING
  // ============================================================

  static async getSavedDecoders(userId: string) {
    const cacheKey = `saved_decoders:${userId}`;
    
    try {
      const cached = await safeRedisGet(cacheKey);
      if (cached) {
        console.log(`✅ [Cache] Saved decoders for ${userId} found in cache`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Saved decoders cache miss for ${userId}`);
    }

    return await measurePerformance(`Saved decoders fetch ${userId}`, async () => {
      console.log(`📡 [Cache] Fetching saved decoders ${userId} from database`);
      const decoders = await prisma.savedDecoder.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (decoders) {
        await safeRedisSet(cacheKey, JSON.stringify(decoders), { EX: CACHE_TTL.SAVED_DECODERS });
        console.log(`✅ [Cache] ${decoders.length} saved decoders cached for ${CACHE_TTL.SAVED_DECODERS}s`);
      }

      return decoders || [];
    });
  }

  static async invalidateSavedDecoders(userId: string) {
    const cacheKey = `saved_decoders:${userId}`;
    try {
      const client = await getRedisClient();
      await client.del(cacheKey);
      console.log(`🗑️ [Cache] Saved decoders for ${userId} invalidated`);
    } catch (error) {
      console.error(`❌ [Cache] Failed to invalidate saved decoders:`, error);
    }
  }

  // ============================================================
  // BULK INVALIDATION
  // ============================================================

  static async invalidateAllUserData(userId: string) {
    try {
      const client = await getRedisClient();
      const patterns = [
        `user:${userId}`,
        `wallet:${userId}`,
        `balance:${userId}`,
        `customer:*${userId}*`,
        `saved_meters:${userId}`,
        `saved_decoders:${userId}`,
      ];
      
      for (const pattern of patterns) {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(keys);
        }
      }
      console.log(`🗑️ [Cache] All user data for ${userId} invalidated`);
    } catch (error) {
      console.error(`❌ [Cache] Failed to invalidate all user data:`, error);
    }
  }

  // ============================================================
  // PRE-WARM CACHE
  // ============================================================

  static async preWarmUserCache(userId: string) {
    console.log(`🔥 [Cache] Pre-warming cache for user ${userId}`);
    await Promise.all([
      this.getUser(userId),
      // biome-ignore lint/complexity/noThisInStatic: <explanation>
      this.getBalance(userId),
      // biome-ignore lint/complexity/noThisInStatic: <explanation>
      this.getWallet(userId),
    ]);
    console.log(`✅ [Cache] Pre-warm complete for user ${userId}`);
  }
}