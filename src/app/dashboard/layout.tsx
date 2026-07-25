import { requireAuth } from "~/lib/auth";
import DashboardLayoutClient from "./layout.client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth("/auth/sign-in");

  const userData = {
    id: user.id,
    fullName: user.fullName || "User",
    email: user.email,
    phone: user.phone,
    role: user.role,
    hasWallet: user.hasWallet,
    walletBalance: user.walletBalance || 0,
  };

  // Simple stats for sidebar
  const stats = {
    totalTransactions: 0,
    walletBalance: userData.walletBalance,
  };

  return (
    <DashboardLayoutClient userData={userData} stats={stats}>
      {children}
    </DashboardLayoutClient>
  );
}