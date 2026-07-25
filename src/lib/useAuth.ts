// hooks/useAuth.ts
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { BilscoreUser } from "./auth";

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as BilscoreUser | undefined;

  const login = async (emailOrPhone: string, password: string) => {
    const result = await signIn("credentials", {
      email: emailOrPhone, // The authorize function handles both email and phone
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    router.refresh();
    return result;
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  const hasRole = (allowedRoles: string[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole,
  };
}