// lib/cache/balance.invalidator.ts

import { CacheService } from "./cache.service";
import { prisma } from "~/lib/db";

export async function invalidateBalanceCache(userId: string) {
  await CacheService.invalidateWallet(userId);
  
  // Also update the cached balance
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: {
      walletBalance: true,
      reservedBalance: true,
    },
  });

  if (wallet) {
    const balance = {
      balance: wallet.walletBalance,
      reserved: wallet.reservedBalance,
      available: wallet.walletBalance - wallet.reservedBalance,
    };
    // Re-cache the new balance
    const client = await (await import("~/lib/redis")).getRedisClient();
    await client.set(`balance:${userId}`, JSON.stringify(balance), { EX: 30 });
  }
}