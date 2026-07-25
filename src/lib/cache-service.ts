// lib/cache-service.ts
import { getRedisClient } from "./redis";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

export class RedisCacheService {
  private defaultTTL = 5 * 60; // 5 minutes

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient();
      const data = await client.get(key);

      if (!data) return null;

      return JSON.parse(data) as T;
    } catch (error) {
      console.error("Redis get error:", error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const ttl = options.ttl || this.defaultTTL;
      const serializedValue = JSON.stringify(value);

      await client.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error("Redis set error:", error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const result = await client.del(key);
      return result > 0;
    } catch (error) {
      console.error("Redis delete error:", error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(pattern);

      if (keys.length > 0) {
        const result = await client.del(keys);
        console.log(`🗑️ Deleted ${result} keys matching: ${pattern}`);
        return result;
      }
      return 0;
    } catch (error) {
      console.error("Redis delete pattern error:", error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error("Redis exists error:", error);
      return false;
    }
  }
}

export const redisCache = new RedisCacheService();
