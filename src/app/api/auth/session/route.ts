// app/api/auth/session/route.ts (or wherever you handle login)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/lib/auth";
import { CacheService } from "~/lib/cache/cache.service";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ user: null });
  }

  // ✅ Pre-warm cache for the user
  try {
    await CacheService.preWarmUserCache(session.user.id);
    console.log(`🔥 [Session] Pre-warmed cache for user ${session.user.id}`);
  } catch (error) {
    console.error(`❌ [Session] Failed to pre-warm cache:`, error);
  }

  return NextResponse.json({ user: session.user });
}