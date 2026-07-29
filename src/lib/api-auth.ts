// bilscore-app/lib/api-auth.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export interface ApiAuthUser {
  id: string;
  email: string;
  username?: string | null;
  fullName?: string | null;
  phone: string;
  role: string;
  hasWallet: boolean;
  walletBalance: number;
}

/**
 * Authenticate API request and return user or throw 401
 */
export async function authenticateApiRequest(
  request: NextRequest,
  requiredRoles?: string[]
): Promise<ApiAuthUser> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized - Please sign in" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const user = session.user as ApiAuthUser;

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRole = requiredRoles.some(role => user.role === role);
    if (!hasRole) {
      throw new Response(
        JSON.stringify({ 
          error: `Forbidden - Required roles: ${requiredRoles.join(", ")}`,
          userRole: user.role,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return user;
}

/**
 * Authenticate admin API request (ADMIN or SUPER_ADMIN)
 */
export async function authenticateAdminRequest(request: NextRequest): Promise<ApiAuthUser> {
  return authenticateApiRequest(request, ["ADMIN", "SUPER_ADMIN"]);
}

/**
 * Authenticate super admin API request (SUPER_ADMIN only)
 */
export async function authenticateSuperAdminRequest(request: NextRequest): Promise<ApiAuthUser> {
  return authenticateApiRequest(request, ["SUPER_ADMIN"]);
}