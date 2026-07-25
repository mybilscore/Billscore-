// lib/redis.ts
import { createClient } from "redis";

// Track connection state more reliably
let isConnected = false;
let isConnecting = false; // Add this to prevent multiple concurrent connection attempts
let connectionAttempt = 0;
let connectionPromise: Promise<any> | null = null; // Store the connection promise
const MAX_RETRY_ATTEMPTS = 3;

const redis = createClient({
  url: `redis://default:${process.env.REDIS_PASSWORD}@redis-15000.c99.us-east-1-4.ec2.redns.redis-cloud.com:15000`,
  socket: {
    connectTimeout: 30000,
    timeout: 45000,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.log("🔴 Max reconnection attempts reached");
        return new Error("Max retries exceeded");
      }
      const baseDelay = Math.min(1000 * Math.pow(2, retries), 30000);
      const jitter = Math.random() * 1000;
      return baseDelay + jitter;
    },
  },
});

// Enhanced event listeners
redis.on("error", (err) => {
  console.error("❌ Redis Client Error:", err);
  if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
    isConnected = false;
    isConnecting = false;
    connectionPromise = null;
    console.log("🌐 Network-related Redis error - may be due to slow internet");
  }
});

redis.on("connect", () => {
  console.log("🔌 Redis: Connecting...");
  connectionAttempt++;
});

redis.on("ready", () => {
  console.log("✅✅✅ Redis: Connected and ready! ✅✅✅");
  isConnected = true;
  isConnecting = false;
  connectionPromise = null;
  connectionAttempt = 0;
});

redis.on("end", () => {
  console.log("🔌 Redis connection closed");
  isConnected = false;
  isConnecting = false;
  connectionPromise = null;
});

redis.on("reconnecting", () => {
  console.log("🔄 Redis: Reconnecting...");
});

export async function getRedisClient() {
  // If already connected, return immediately
  if (isConnected && redis.isReady) {
    return redis;
  }
  
  // If connection is in progress, wait for it
  if (isConnecting && connectionPromise) {
    console.log("⏳ Redis connection already in progress, waiting...");
    await connectionPromise;
    if (isConnected) {
      return redis;
    }
  }
  
  // If we're not connected and not trying to connect, start connection
  if (!isConnected && !isConnecting) {
    isConnecting = true;
    
    // Create a promise for the connection
    connectionPromise = (async () => {
      try {
        console.log(`📡 Attempting Redis connection (attempt ${connectionAttempt + 1})...`);
        
        // Check if already open to avoid "Socket already opened" error
        if (!redis.isOpen) {
          await redis.connect();
        } else {
          console.log("Redis socket already open, checking connection...");
          // Test if connection is actually working
          await redis.ping();
        }
        
        isConnected = true;
        console.log("✅ Successfully connected to Redis Cloud");
        return redis;
      } catch (error: any) {
        console.error("❌ Failed to connect to Redis Cloud:", error.message);
        isConnected = false;
        isConnecting = false;
        connectionPromise = null;
        
        if (error.code === "ENOTFOUND") {
          console.log("💡 Tip: This is often due to slow internet or DNS issues");
          console.log("💡 Try: Using wired connection or checking network stability");
        }
        
        if (error.code === "CONNECTION_TIMEOUT") {
          console.log("💡 Tip: Increase timeout values for slow connections");
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
  
  return redis;
}

export async function closeRedis() {
  if (isConnected && redis.isOpen) {
    await redis.quit();
    isConnected = false;
    isConnecting = false;
    connectionPromise = null;
    console.log("🔌 Redis connection closed");
  }
}

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
}

// Safe Redis operations with fallbacks
export async function safeRedisGet(key: string, fallback: any = null) {
  try {
    const client = await getRedisClient();
    const value = await client.get(key);
    return value ?? fallback;
  } catch (error) {
    console.error(`Redis get failed for key ${key}:`, error);
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
    console.error(`Redis set failed for key ${key}:`, error);
    return false;
  }
}

// Initialize Redis on server start (optional)
let initialized = false;
export async function initRedis() {
  if (!initialized && typeof window === 'undefined') {
    try {
      await getRedisClient();
      initialized = true;
      console.log("✅ Redis initialization complete");
    } catch (error) {
      console.error("❌ Redis initialization failed:", error);
    }
  }
}

// Auto-initialize in server environment
if (typeof window === 'undefined') {
  // Wait a bit for the server to stabilize
  setTimeout(() => {
    initRedis().catch(console.error);
  }, 1000);
}