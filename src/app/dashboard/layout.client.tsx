"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
// import Header from "@/ui/components/header";
// import Sidebar from "@/ui/components/sidebar/sidebar";
import Sidebar from "~/ui/components/sidebar/sidebar";
import Header from "~/ui/components/header";

interface LayoutClientProps {
  children: React.ReactNode;
  userData: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    hasWallet: boolean;
    walletBalance: number;
  };
  stats: {
    totalTransactions: number;
    walletBalance: number;
  };
}

export default function DashboardLayoutClient({
  children,
  userData,
  stats,
}: LayoutClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#040724] border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header
        userData={{
          name: userData.fullName,
          email: userData.email,
          role: userData.role,
        }}
        notifications={[]}
        isNotificationOpen={isNotificationOpen}
        setIsNotificationOpen={setIsNotificationOpen}
        isProfileOpen={isProfileOpen}
        setIsProfileOpen={setIsProfileOpen}
        toggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isMobile={isMobile}
        userData={userData}
        stats={stats}
      />
      <main className={`transition-all duration-300 ${!isMobile ? "lg:ml-64" : ""}`}>
        <div className="p-4 md:p-6 pt-20 lg:pt-24 pb-24 md:pb-6">{children}</div>
      </main>
    </div>
  );
}