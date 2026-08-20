// lib/cache.service.ts - COMPLETE CACHE SERVICE

import { getRedisClient, getRedisStatus } from "./redis";
import { prisma } from "./db";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

// ============================================================
// CACHE SERVICE - Manages all caching logic
// ============================================================

export class CacheService {
  private static instance: CacheService;
  private redisCache: RedisCacheService;
  private memoryCache = new Map<string, { data: any; expires: number }>();
  private useRedis = false;
  private redisReady = false;

  private constructor() {
    this.redisCache = new RedisCacheService();
    this.checkRedisConnection();
  }

  static getInstance() {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private async checkRedisConnection() {
    try {
      const status = this.redisCache.getStatus();
      this.redisReady = status.isConnected && status.isReady;
      this.useRedis = this.redisReady;
      if (this.useRedis) {
        console.log('✅ [Cache] Redis is available');
      } else {
        console.log('⚠️ [Cache] Redis not available, using memory cache only');
      }
    } catch {
      this.useRedis = false;
      console.log('⚠️ [Cache] Redis disabled, using memory cache');
    }
  }

  // ============================================================
  // CACHE HELPERS
  // ============================================================

  private async getFromCache(key: string): Promise<any> {
    // 1. Check memory cache first (fastest - <1ms)
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && memoryItem.expires > Date.now()) {
      return memoryItem.data;
    }
    this.memoryCache.delete(key);

    // 2. Check Redis if available
    if (this.useRedis) {
      try {
        const data = await this.redisCache.get<any>(key);
        if (data) {
          // Store in memory cache for faster access next time
          this.memoryCache.set(key, { 
            data, 
            expires: Date.now() + 60000 // 1 minute
          });
          return data;
        }
      } catch (error) {
        // Redis failed, fallback to memory only
        console.warn('⚠️ [Cache] Redis get failed, falling back to memory');
        this.useRedis = false;
      }
    }
    return null;
  }

  private async setInCache(key: string, data: any, ttl: number = 300) {
    // Store in memory cache
    this.memoryCache.set(key, { 
      data, 
      expires: Date.now() + (ttl * 1000) 
    });

    // Store in Redis if available
    if (this.useRedis) {
      try {
        await this.redisCache.set(key, data, { ttl });
      } catch (error) {
        console.warn(`⚠️ [Cache] Failed to set ${key} in Redis`);
      }
    }
  }

  private async deleteFromCache(key: string) {
    this.memoryCache.delete(key);
    if (this.useRedis) {
      try {
        await this.redisCache.delete(key);
      } catch (error) {
        // Ignore
      }
    }
  }

  // ============================================================
  // PUBLIC METHODS - Used by routes
  // ============================================================

  /**
   * Get user with wallet data - uses cache first
   */
  async getUser(userId: string) {
    const cacheKey = `user:${userId}`;
    
    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pinHash: true,
        pinAttempts: true,
        pinLockedUntil: true,
        hasWallet: true,
        wallet: {
          select: {
            id: true,
            walletBalance: true,
          },
        },
      },
    });

    if (user) {
      // Cache for 5 minutes
      await this.setInCache(cacheKey, user, 300);
    }

    return user;
  }

  /**
   * Get customer by user ID and phone - uses cache first
   */
  async getCustomer(userId: string, phone: string) {
    const cacheKey = `customer:${userId}:${phone}`;
    
    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const customer = await prisma.customer.findUnique({
      where: {
        userId_phone: {
          userId: userId,
          phone: phone,
        },
      },
    });

    if (customer) {
      // Cache for 5 minutes
      await this.setInCache(cacheKey, customer, 300);
    }

    return customer;
  }

  /**
   * Get wallet balance - uses cache first
   */
  async getBalance(userId: string) {
    const cacheKey = `balance:${userId}`;
    
    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const wallet = await prisma.wallet.findUnique({
      where: { userId: userId },
      select: {
        walletBalance: true,
      },
    });

    const balance = { 
      balance: wallet ? Number(wallet.walletBalance) : 0 
    };
    
    // Cache for 30 seconds (balance changes frequently)
    await this.setInCache(cacheKey, balance, 30);

    return balance;
  }

  /**
   * Create a new customer and cache it
   */
  async createCustomer(data: {
    userId: string;
    phone: string;
    fullName: string | null;
    email: string | null;
    customerType: any;
    totalTransactions: number;
    totalSpent: number;
    totalCommissionEarned: number;
    firstTransactionAt: Date;
    tags: any;
  }) {
    const customer = await prisma.customer.create({ data });
    
    // Cache the new customer
    await this.setInCache(`customer:${customer.userId}:${customer.phone}`, customer, 300);
    
    return customer;
  }

  /**
   * Set user in cache (for updates)
   */
  async setUser(userId: string, data: any) {
    await this.setInCache(`user:${userId}`, data, 300);
  }

  /**
   * Set customer in cache (for updates)
   */
  async setCustomer(userId: string, phone: string, data: any) {
    await this.setInCache(`customer:${userId}:${phone}`, data, 300);
  }

  /**
   * Invalidate wallet balance cache
   */
  async invalidateWallet(userId: string) {
    await this.deleteFromCache(`balance:${userId}`);
    // Also invalidate user cache since it contains wallet balance
    await this.deleteFromCache(`user:${userId}`);
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string) {
    await this.deleteFromCache(`user:${userId}`);
  }

  /**
   * Invalidate customer cache
   */
  async invalidateCustomer(userId: string, phone: string) {
    await this.deleteFromCache(`customer:${userId}:${phone}`);
  }

  /**
   * Clear all cache (for testing)
   */
  async clearAll() {
    this.memoryCache.clear();
    if (this.useRedis) {
      try {
        await this.redisCache.deletePattern('*');
      } catch (error) {
        // Ignore
      }
    }
    console.log('🗑️ [Cache] All cache cleared');
  }

  /**
   * Get cache status
   */
  getStatus() {
    return {
      useRedis: this.useRedis,
      redisReady: this.redisReady,
      memoryCacheSize: this.memoryCache.size,
    };
  }
}

// ============================================================
// REDIS CACHE SERVICE - Low-level Redis operations
// ============================================================

export class RedisCacheService {
  private defaultTTL = 5 * 60; // 5 minutes
  private isReady = false;

  constructor() {
    this.checkConnection();
  }

  private async checkConnection() {
    try {
      const status = getRedisStatus();
      this.isReady = status.isConnected && status.isReady;
    } catch {
      this.isReady = false;
    }
  }

  private async ensureConnection() {
    if (!this.isReady) {
      try {
        const client = await getRedisClient();
        this.isReady = client?.isReady || false;
      } catch {
        this.isReady = false;
      }
    }
    return this.isReady;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!(await this.ensureConnection())) {
        return null;
      }
      const client = await getRedisClient();
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      if (!(await this.ensureConnection())) {
        return false;
      }
      const client = await getRedisClient();
      const ttl = options.ttl || this.defaultTTL;
      await client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      if (!(await this.ensureConnection())) {
        return false;
      }
      const client = await getRedisClient();
      const result = await client.del(key);
      return result > 0;
    } catch (error) {
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      if (!(await this.ensureConnection())) {
        return 0;
      }
      const client = await getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        const result = await client.del(keys);
        return result;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!(await this.ensureConnection())) {
        return false;
      }
      const client = await getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  getStatus() {
    return getRedisStatus();
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();