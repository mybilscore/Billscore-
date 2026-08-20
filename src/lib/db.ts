// lib/db.ts

import { PrismaClient } from "@prisma/client";

// ✅ Determine log levels based on environment and debug flag
const getLogLevels = () => {
  // In production, only log errors
  if (process.env.NODE_ENV === 'production') {
    return ['error'];
  }
  
  // In development, only log queries when DEBUG=true
  if (process.env.DEBUG === 'true') {
    return ['query', 'error', 'warn'];
  }
  
  // Default development: only errors and warnings (no query logs)
  return ['warn', 'error'];
};

// ✅ Singleton pattern for Prisma Client
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: getLogLevels(),
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ✅ Connection test helper
export async function testDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// ✅ Graceful shutdown
const disconnect = async () => {
  await prisma.$disconnect();
  console.log("🔌 Database disconnected");
};

process.on('beforeExit', disconnect);
process.on('SIGTERM', disconnect);
process.on('SIGINT', disconnect);