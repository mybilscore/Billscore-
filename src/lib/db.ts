// lib/db.ts

import { PrismaClient } from "@prisma/client";

// ✅ Singleton pattern for Prisma Client
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
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