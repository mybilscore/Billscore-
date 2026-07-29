// lib/redis.ts

import { createClient } from "redis";

// ✅ Singleton pattern - persistent connection
let redisClient: ReturnType<typeof createClient> | null = null;
let isConnected = false;
let isConnecting = false;
let connectionPromise: Promise<any> | null = null;
let connectionAttempt = 0;
let initialized = false;

// ✅ Create Redis client only once
function getRedisClientInstance() {
  if (!redisClient) {
    console.log("🔧 [Redis] Creating Redis client instance...");
    
    redisClient = createClient({
      url: `redis://default:${process.env.REDIS_PASSWORD}@redis-15000.c99.us-east-1-4.ec2.redns.redis-cloud.com:15000`,
      socket: {
        connectTimeout: 30000,
        timeout: 45000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.log("🔴 [Redis] Max reconnection attempts reached");
            return new Error("Max retries exceeded");
          }
          const baseDelay = Math.min(1000 * Math.pow(2, retries), 30000);
          const jitter = Math.random() * 1000;
          return baseDelay + jitter;
        },
      },
    });

    // ✅ Event listeners
    redisClient.on("error", (err) => {
      console.error("❌ [Redis] Client Error:", err);
      if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
        isConnected = false;
        isConnecting = false;
        connectionPromise = null;
        console.log("🌐 [Redis] Network-related error - may be due to slow internet");
      }
    });

    redisClient.on("connect", () => {
      console.log("🔌 [Redis] Connecting...");
      connectionAttempt++;
    });

    redisClient.on("ready", () => {
      console.log("✅✅✅ [Redis] Connected and ready! ✅✅✅");
      isConnected = true;
      isConnecting = false;
      connectionPromise = null;
      connectionAttempt = 0;
      initialized = true;
    });

    redisClient.on("end", () => {
      console.log("🔌 [Redis] Connection closed");
      isConnected = false;
      isConnecting = false;
      connectionPromise = null;
    });

    redisClient.on("reconnecting", () => {
      console.log("🔄 [Redis] Reconnecting...");
    });
  }
  return redisClient;
}

// ✅ Get Redis client (with connection management)
export async function getRedisClient() {
  const client = getRedisClientInstance();

  // If already connected, return immediately
  if (isConnected && client.isReady) {
    return client;
  }

  // If connection is in progress, wait for it
  if (isConnecting && connectionPromise) {
    console.log("⏳ [Redis] Connection already in progress, waiting...");
    await connectionPromise;
    if (isConnected) {
      return client;
    }
  }

  // Start connection if not connected
  if (!isConnected && !isConnecting) {
    isConnecting = true;
    
    connectionPromise = (async () => {
      try {
        console.log(`📡 [Redis] Attempting connection (attempt ${connectionAttempt + 1})...`);
        
        if (!client.isOpen) {
          await client.connect();
        } else {
          console.log("🔍 [Redis] Socket already open, checking connection...");
          await client.ping();
        }
        
        isConnected = true;
        console.log("✅ [Redis] Successfully connected to Redis Cloud");
        return client;
      } catch (error: any) {
        console.error("❌ [Redis] Failed to connect:", error.message);
        isConnected = false;
        isConnecting = false;
        connectionPromise = null;
        
        if (error.code === "ENOTFOUND") {
          console.log("💡 [Redis] Tip: DNS issue - check internet connection");
        }
        if (error.code === "CONNECTION_TIMEOUT") {
          console.log("💡 [Redis] Tip: Increase timeout values for slow connections");
        }
        
        throw error;
      }
    })();

    try {
      await connectionPromise;
    } finally {
      isConnecting = false;
    }
  }

  return client;
}

// ✅ Close Redis connection
export async function closeRedis() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    isConnected = false;
    isConnecting = false;
    connectionPromise = null;
    redisClient = null;
    initialized = false;
    console.log("🔌 [Redis] Connection closed");
  }
}

// ✅ Health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    console.error("❌ [Redis] Health check failed:", error);
    return false;
  }
}

// ✅ Safe Redis operations with fallbacks
export async function safeRedisGet(key: string, fallback: any = null) {
  try {
    const client = await getRedisClient();
    const value = await client.get(key);
    return value ?? fallback;
  } catch (error) {
    console.error(`❌ [Redis] Get failed for key ${key}:`, error);
    return fallback;
  }
}

export async function safeRedisSet(
  key: string,
  value: string,
  options: { EX?: number } = {},
) {
  try {
    const client = await getRedisClient();
    if (options.EX) {
      await client.set(key, value, { EX: options.EX });
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error) {
    console.error(`❌ [Redis] Set failed for key ${key}:`, error);
    return false;
  }
}

export async function safeRedisDel(key: string) {
  try {
    const client = await getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`❌ [Redis] Delete failed for key ${key}:`, error);
    return false;
  }
}

export async function safeRedisKeys(pattern: string): Promise<string[]> {
  try {
    const client = await getRedisClient();
    return await client.keys(pattern);
  } catch (error) {
    console.error(`❌ [Redis] Keys failed for pattern ${pattern}:`, error);
    return [];
  }
}

// ✅ Initialize Redis on server start
export async function initRedis() {
  if (!initialized && typeof window === 'undefined') {
    try {
      await getRedisClient();
      initialized = true;
      console.log("✅ [Redis] Initialization complete");
    } catch (error) {
      console.error("❌ [Redis] Initialization failed:", error);
    }
  }
}

// ✅ Auto-initialize in server environment
if (typeof window === 'undefined') {
  // Wait a bit for the server to stabilize
  setTimeout(() => {
    initRedis().catch(console.error);
  }, 1000);
}

// ✅ Get connection status
export function getRedisStatus() {
  return {
    isConnected,
    isConnecting,
    initialized,
    hasClient: !!redisClient,
    isReady: redisClient?.isReady || false,
  };
}