// app/dashboard/settings/page.tsx

import { requireAuth } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { SettingsClient } from "./page.client";

export default async function SettingsPage() {
  const user = await requireAuth("/auth/sign-in");

  // Fetch user with wallet and developer data
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      wallet: true,
      developer: {
        include: {
          apiKeys: {
            where: { isActive: true },
          },
          webhookSubscriptions: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  const hasWallet = userData?.wallet ? true : userData?.hasWallet || false;
  const walletBalance = userData?.wallet?.walletBalance 
    ? Number(userData.wallet.walletBalance) 
    : Number(userData?.walletBalance || 0);

  const isDeveloper = userData?.isDeveloper || false;
  const developerData = userData?.developer || null;

  // Get user's API keys
  const apiKeys = developerData?.apiKeys || [];

  // Get webhook subscriptions
  const webhooks = developerData?.webhookSubscriptions || [];

  // Get user's channels
  const channels = await prisma.channel.findMany({
    where: { userId: user.id },
  });

  // Get user's subscriptions count
  const subscriptionCount = await prisma.subscription.count({
    where: { userId: user.id, isActive: true },
  });

  return (
    <SettingsClient
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email || "",
        phone: user.phone,
        role: user.role,
        hasWallet,
        walletBalance,
        isDeveloper,
        referralCode: user.referralCode || "",
      }}
      developerData={{
        accountType: developerData?.accountType || "BASIC",
        status: developerData?.status || "PENDING",
        monthlyVolume: developerData?.monthlyVolume ? Number(developerData.monthlyVolume) : 0,
        customPricing: developerData?.customPricing || null,
        apiKeys: apiKeys.map((key: any) => ({
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          isActive: key.isActive,
          isSandbox: key.isSandbox,
          rateLimitPerMin: key.rateLimitPerMin,
          rateLimitPerHour: key.rateLimitPerHour,
          lastUsedAt: key.lastUsedAt?.toISOString() || null,
          expiresAt: key.expiresAt?.toISOString() || null,
          createdAt: key.createdAt.toISOString(),
        })),
        webhooks: webhooks.map((wh: any) => ({
          id: wh.id,
          url: wh.url,
          events: wh.events,
          isActive: wh.isActive,
          retryCount: wh.retryCount,
          lastTriggeredAt: wh.lastTriggeredAt?.toISOString() || null,
          createdAt: wh.createdAt.toISOString(),
        })),
      }}
      channels={channels.map((c) => ({
        id: c.id,
        type: c.channelType,
        identifier: c.channelIdentifier,
        isVerified: c.isVerified,
        linkedAt: c.linkedAt.toISOString(),
      }))}
      subscriptionCount={subscriptionCount}
    />
  );
}