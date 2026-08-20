// lib/session.ts - UPDATED

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { prisma } from "./db";

// ✅ Session user interface - matches the auth user type
export interface UserSession {
  id: string;
  email: string;
  fullName?: string | null;
  phone: string;
  role: string;
  hasWallet: boolean;
  walletBalance?: number;
}

/**
 * Get current user from session
 */
export const getCurrentUser = async (): Promise<UserSession | null> => {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    fullName: session.user.fullName,
    phone: session.user.phone,
    role: session.user.role,
    hasWallet: session.user.hasWallet,
  };
};

/**
 * Get current user with wallet balance
 */
export const getCurrentUserWithBalance = async (): Promise<(UserSession & { walletBalance: number }) | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  // Fetch wallet balance from database
  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
    select: { walletBalance: true },
  });

  return {
    ...user,
    walletBalance: Number(wallet?.walletBalance || 0),
  };
};

/**
 * Require authentication - redirect to login if not authenticated
 */
export const requireAuth = async (
  redirectTo: string = "/auth/sign-in",
  requiredRoles?: string | string[]
): Promise<UserSession> => {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectTo);
  }

  if (requiredRoles) {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    if (!user.role || !roles.includes(user.role)) {
      redirect("/auth/unauthorized");
    }
  }

  return user;
};

/**
 * Redirect to dashboard if already authenticated
 */
export const redirectIfAuthenticated = async (
  redirectTo: string = "/dashboard"
): Promise<void> => {
  const user = await getCurrentUser();
  
  if (user) {
    redirect(redirectTo);
  }
};

/**
 * Check if user has specific role
 */
export const hasRole = (user: UserSession | null, allowedRoles: string[]): boolean => {
  if (!user) return false;
  return allowedRoles.includes(user.role);
};

/**
 * Check if user is admin
 */
export const isAdmin = (user: UserSession | null): boolean => {
  if (!user) return false;
  return user.role === "ADMIN" || user.role === "SUPER_ADMIN";
};

/**
 * Check if user is agent or retailer
 */
export const isAgent = (user: UserSession | null): boolean => {
  if (!user) return false;
  return user.role === "AGENT" || user.role === "RETAILER";
};

/**
 * Check if user is developer
 */
export const isDeveloper = (user: UserSession | null): boolean => {
  if (!user) return false;
  return user.role === "DEVELOPER";
};

/**
 * Get user's full display name
 */
export const getUserDisplayName = (user: UserSession | null): string => {
  if (!user) return "User";
  return user.fullName || user.email || user.phone || "User";
};

/**
 * Get user's initials
 */
export const getUserInitials = (user: UserSession | null): string => {
  if (!user) return "U";
  const name = user.fullName || user.email || user.phone || "User";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};