// hooks/useAuth.ts
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
// import { UserSession } from "@/lib/session";
import type { UserSession } from "../session";

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as UserSession | undefined;

  const login = async (email: string, password: string) => {
    const result = await signIn("credentials", {
      email,
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
    router.push("/auth/sign-in");
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