// ui/components/sidebar/sidebar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  Clock,
  Repeat,
  Package,
  Wallet,
  Gift,
  Users,
  Settings,
  LogOut,
  User,
  BarChart3,
  MessageSquare,
  Shield,
  X,
  ChevronDown,
  ChevronRight,
  CreditCard,
  TrendingUp,
  CheckCircle,
  Book,
  Filter,
  List,
  PieChart,
  Phone,
  Database,
  Share2,
  Copy,
  Check,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
  userData: {
    id: string;
    username?: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    hasWallet: boolean;
    walletBalance: number;
    referralCode?: string;
  };
  stats: {
    totalTransactions: number;
    walletBalance: number;
  };
  referralStats?: {
    totalReferrals: number;
    totalEarned: number;
  };
}

interface NavItem {
  title: string;
  href: string;
  icon: any;
  badge?: number | string;
  badgeColor?: string;
  requiredRole?: string[];
  subItems?: NavItem[];
  isExpanded?: boolean;
}

export default function Sidebar({ 
  isOpen, 
  onClose, 
  isMobile, 
  userData, 
  stats,
  referralStats = { totalReferrals: 0, totalEarned: 0 }
}: SidebarProps) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    transactions: true,
    referral: false,
  });
  const [copied, setCopied] = useState(false);

  const role = userData.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const isAgent = role === "AGENT" || role === "RETAILER";
  const isDeveloper = role === "DEVELOPER";

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  // ✅ Get user initials for avatar
  const getUserInitials = () => {
    const name = userData.fullName || userData.username || userData.email || "User";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // ✅ Get display name - prioritizes username
  const getDisplayName = () => {
    // First try username
    if (userData.username && userData.username.trim().length > 0) {
      return userData.username;
    }
    // Then try full name
    if (userData.fullName && userData.fullName.trim().length > 0) {
      const parts = userData.fullName.trim().split(" ");
      return parts[0];
    }
    // Then try email
    if (userData.email) {
      return userData.email.split("@")[0];
    }
    // Then try phone
    if (userData.phone) {
      return userData.phone;
    }
    return "User";
  };

  // ✅ Get full name for greeting
  const getFullName = () => {
    return userData.fullName || userData.username || userData.email?.split("@")[0] || userData.phone || "User";
  };

  // Copy referral link
  const copyReferralLink = async () => {
    if (!userData.referralCode) return;
    
    try {
      const link = `${window.location.origin}?ref=${userData.referralCode}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error("Copy error:", error);
    }
  };

  // Share referral link
  // const shareReferralLink = async () => {
  //   if (!userData.referralCode) return;
    
  //   try {
  //     const link = `${window.location.origin}?ref=${userData.referralCode}`;
  //     const text = `🎉 Join me on Bilscore! Use my referral code ${userData.referralCode} to get started and earn rewards. Sign up here: ${link}`;

  //     if (navigator.share) {
  //       await navigator.share({
  //         title: "Join Bilscore - Get Rewards",
  //         text: text,
  //         url: link,
  //       });
  //     } else {
  //       await navigator.clipboard.writeText(text);
  //       setCopied(true);
  //       setTimeout(() => setCopied(false), 3000);
  //     }
  //   } catch (error) {
  //     console.error("Share error:", error);
  //   }
  // };

  // Transactions sub-menu items
  const transactionsSubItems: NavItem[] = [
    { 
      title: "All Transactions", 
      href: "/dashboard/transactions", 
      icon: List 
    },
    { 
      title: "Wallet", 
      href: "/dashboard/wallet", 
      icon: Wallet 
    },
    { 
      title: "Airtime", 
      href: "/dashboard/summary/airtime", 
      icon: Phone 
    },
    { 
      title: "Data", 
      href: "/dashboard/summary/data", 
      icon: Wifi 
    },
    { 
      title: "Electricity", 
      href: "/dashboard/summary/electricity", 
      icon: Zap 
    },
    { 
      title: "Cable TV", 
      href: "/dashboard/summary/cable", 
      icon: Tv 
    },
    { 
      title: "E Schedule", 
      href: "/dashboard/summary/e-schedule", 
      icon: Repeat 
    },
    { 
      title: "Bulk Purchases", 
      href: "", 
      icon: Package 
    },
    { 
      title: "API Purchases", 
      href: "", 
      icon: Database 
    },
  ];

  const baseNavItems: NavItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: Home },
    { title: "Buy Airtime", href: "/dashboard/airtime", icon: Smartphone },
    { title: "Buy Data", href: "/dashboard/data", icon: Wifi },
    { title: "Buy Electricity", href: "/dashboard/electricity", icon: Zap },
    { title: "Cable TV", href: "/dashboard/cable", icon: Tv },
    { title: "Education", href: "/dashboard/education", icon: Book },
    { title: "E-Schedule", href: "/dashboard/e-schedule", icon: Repeat },
    { 
      title: "Transactions", 
      href: "/dashboard/transactions", 
      icon: Package,
      subItems: transactionsSubItems,
      isExpanded: expandedMenus.transactions,
    },
  ];

  const agentNavItems: NavItem[] = [
    { 
      title: "Wallet", 
      href: "/dashboard/wallet", 
      icon: Wallet, 
      badge: `₦${stats.walletBalance.toLocaleString()}`, 
      badgeColor: "bg-green-100 text-green-600" 
    },
    { title: "Bulk Purchase", href: "/dashboard/bulk", icon: Package },
    { title: "Retailer Starter Credit", href: "/dashboard/loans", icon: Gift },
    { title: "Team", href: "/dashboard/team", icon: Users },
  ];

  const adminNavItems: NavItem[] = [
    { title: "Admin Panel", href: "/dashboard/admin", icon: Settings },
    { title: "Vendor Health", href: "/dashboard/admin/vendors", icon: Shield },
    { title: "Loan Approvals", href: "/dashboard/admin/loans", icon: Gift },
    { title: "Analytics", href: "/dashboard/admin/analytics", icon: BarChart3 },
  ];

  const developerNavItems: NavItem[] = [
    { title: "API Keys", href: "/dashboard/developer/keys", icon: Settings },
    { title: "API Usage", href: "/dashboard/developer/usage", icon: BarChart3 },
    { title: "Webhooks", href: "/dashboard/developer/webhooks", icon: MessageSquare },
  ];

  let navItems = [...baseNavItems];
  if (isAgent) navItems = [...navItems, ...agentNavItems];
  if (isAdmin) navItems = [...navItems, ...adminNavItems];
  if (isDeveloper) navItems = [...navItems, ...developerNavItems];

  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = item.isExpanded !== undefined ? item.isExpanded : true;

    const activeStyles = "bg-[#f5f5f5] text-[#1e293b] shadow-sm";
    const inactiveStyles = "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800";

    if (hasSubItems) {
      return (
        <li key={item.title} className="space-y-1">
          <button
            onClick={() => {
              toggleMenu(item.title.toLowerCase());
              if (isMobile) {
                // Don't close on mobile when expanding submenu
              }
            }}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              active
                ? activeStyles
                : inactiveStyles
            }`}
          >
            <div className="flex items-center">
              <Icon className={`mr-3 h-5 w-5 ${active ? "text-[#1e293b]" : "text-gray-500"}`} />
              <span>{item.title}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.badge && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.badgeColor || "bg-gray-100 text-gray-600"}`}>
                  {item.badge}
                </span>
              )}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </button>
          {isExpanded && item.subItems && (
            <ul className="ml-4 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-700">
              {item.subItems.map((subItem) => renderNavItem(subItem, depth + 1))}
            </ul>
          )}
        </li>
      );
    }

    const paddingLeft = depth > 0 ? "pl-6" : "";

    return (
      <li key={item.title}>
        <Link
          href={item.href}
          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${paddingLeft} ${
            active
              ? activeStyles
              : inactiveStyles
          }`}
          onClick={isMobile ? onClose : undefined}
        >
          <div className="flex items-center">
            {depth > 0 && <span className="mr-2 text-gray-400">•</span>}
            <Icon className={`mr-3 h-4 w-4 ${active ? "text-[#1e293b]" : "text-gray-500"}`} />
            <span className={active ? "font-semibold" : ""}>{item.title}</span>
          </div>
          {item.badge && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.badgeColor || "bg-gray-100 text-gray-600"}`}>
              {item.badge}
            </span>
          )}
        </Link>
      </li>
    );
  };

  const sidebarContent = (
    <>
      {/* ✅ User Profile Card - Shows username and initials */}
      <div className="mb-4 flex items-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-white text-sm font-bold">
          {getUserInitials()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {getDisplayName()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {userData.email || "Member"}
          </p>
        </div>
        {/* {userData.referralCode && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Gift className="h-3 w-3" />
              {referralStats.totalReferrals || 0}
            </span>
          </div>
        )} */}
      </div>

      {/* Referral Quick Share - Only if user has referral code */}
      {/* {userData.referralCode && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/30 dark:bg-amber-900/20">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Gift className="h-3 w-3" />
                Referral Code
              </p>
              <code className="text-xs font-mono text-amber-800 dark:text-amber-300 truncate block">
                {userData.referralCode}
              </code>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                Earned: ₦{referralStats.totalEarned || 0}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={copyReferralLink}
                className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-200 dark:text-amber-400 dark:hover:bg-amber-800/30 transition-colors"
                title="Copy referral link"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                onClick={shareReferralLink}
                className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-200 dark:text-amber-400 dark:hover:bg-amber-800/30 transition-colors"
                title="Share referral link"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          {copied && (
            <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
              <Check className="h-3 w-3" /> Link copied!
            </p>
          )}
        </div>
      )} */}

      <nav className="mb-6">
        <ul className="space-y-1">{navItems.map((item) => renderNavItem(item))}</ul>
      </nav>

      {isAgent && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Wallet Balance</span>
            <span className="text-sm font-bold text-[#1e293b]">₦{stats.walletBalance.toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="mt-auto border-t border-gray-200 pt-4 dark:border-gray-700">
        <Link
          href="/dashboard/settings"
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Settings className="mr-3 h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={async () => {
            await fetch("/api/auth/signout", { method: "POST" });
            window.location.href = "/auth/sign-in";
          }}
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-800"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  // Mobile sidebar
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden" onClick={onClose} />
        )}
        <aside
          className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 ease-in-out dark:border-gray-700 dark:bg-gray-900 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-20 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
            <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
              <div className="h-8 w-8 rounded-md bg-[#1e293b] flex items-center justify-center overflow-hidden">
                <img
                  src="/uploads/log-icon.jpeg"
                  alt="Bilscore Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-xl font-bold text-[#1e293b] dark:text-white">bilscore</span>
            </Link>
            <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="h-[calc(100vh-5rem)] overflow-y-auto px-3 py-4">{sidebarContent}</div>
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className="fixed left-0 top-0 z-30 h-screen w-64 border-r border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-20 items-center border-b border-gray-200 px-4 dark:border-gray-700">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-[#1e293b] flex items-center justify-center overflow-hidden">
            <img
              src="/uploads/log-icon.jpeg"
              alt="Bilscore Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-xl font-bold text-[#1e293b] dark:text-white">bilscore</span>
        </Link>
      </div>
      <div className="h-[calc(100vh-5rem)] overflow-y-auto px-3 py-4">{sidebarContent}</div>
    </aside>
  );
}