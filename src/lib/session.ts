// lib/session.ts
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { prisma } from "./db";

export interface UserSession {
  id: string;
  email: string;
  name?: string | null;
  phone: string | null;
  partyId: number;
  partyType: string;
  slug: string;
  role: string;
  individualId?: number | null;
}

export const getCurrentUser = async (): Promise<UserSession | null> => {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    phone: session.user.phone,
    partyId: session.user.partyId,
    partyType: session.user.partyType,
    slug: session.user.slug,
    role: session.user.role,
    individualId: session.user.individualId,
  };
};

export const redirectIfAuthenticated = async (
  redirectTo: string = "/dashboard"
): Promise<void> => {
  const user = await getCurrentUser();
  
  if (user) {
    // User is logged in, determine where to redirect
    if (user.partyStatus === "PENDING_PROFILE") {
      redirect(`/${user.slug}/profile/complete`);
    } else if (user.isSuperAdmin) {
      redirect("/admin");
    } else {
      redirect(`/${user.slug}`);
    }
  }
};
/**
 * Get current user or redirect to login
 * @param redirectTo - Where to redirect if not authenticated
 * @param requiredRoles - Optional roles that are allowed
 */
export const requireAuth = async (
  redirectTo: string = "/",
  requiredRoles?: string | string[]
): Promise<UserSession> => {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectTo);
  }

  if (requiredRoles) {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    if (!user.role || !roles.includes(user.role)) {
      redirect("/unauthorized");
    }
  }

  return user;
};

/**
 * Check if user has specific permission
 */
export const hasRole = (user: UserSession | null, allowedRoles: string[]): boolean => {
  if (!user) return false;
  return allowedRoles.includes(user.role);
};

/**
 * Get party type specific data
 */
export const getPartyDetails = async (partyId: number) => {
  const party = await prisma.parties.findUnique({
    where: { id: partyId },
    include: {
      individual: true,
      organization: true,
      community: true,
      contacts: true,
      addresses: true,
    },
  });
  return party;
};