// src/app/admin/components/admin-sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  Users,
  FileText,
  Package,
  HelpCircle,
  Wallet,
  Sprout,
  Settings,
  LogOut,
  User,
  AlertCircle,
  CheckCircle,
  X,
  Tractor,
  Bell,
  Clock,
  TreePine,
  BarChart3,
  ShoppingCart,
  Shield,
  Activity,
  Globe,
} from "lucide-react";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
  userData?: {
    partyId: number;
    name: string;
    role: string;
    email: string;
  };
  stats?: {
    activeFarms?: number;
    activeFields?: number;
    lowStockItems?: number;
    pendingApprovals?: number;
    notifications?: number;
  };
}

interface NavItem {
  title: string;
  href: string;
  icon: any;
  badge?: number | string;
  badgeColor?: string;
}

export default function AdminSidebar({ 
  isOpen, 
  onClose, 
  isMobile, 
  userData = { 
    partyId: 0, 
    name: "Super Admin", 
    role: "Administrator",
    email: "admin@elmeena.com"
  },
  stats = {
    activeFarms: 0,
    activeFields: 0,
    lowStockItems: 0,
    pendingApprovals: 0,
    notifications: 0,
  }
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/notifications?limit=2`);
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const navItems: NavItem[] = [
    { title: "Dashboard", href: "/admin", icon: Home },
      { title: "Activities", href: "/admin/activities", icon: Building2 },
    { title: "Parties", href: "/admin/parties", icon: Users, badge: stats.pendingApprovals > 0 ? stats.pendingApprovals : undefined, badgeColor: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" },
    { title: "Clusters", href: "/admin/clusters", icon: Building2 },
    { title: "Farms", href: "/admin/farms", icon: TreePine, badge: stats.activeFarms > 0 ? stats.activeFarms : undefined, badgeColor: "bg-[#39b54a]/10 text-[#39b54a] dark:bg-[#39b54a]/20 dark:text-[#39b54a]" },
    { title: "Users", href: "/admin/users", icon: User },
    { title: "Inventory", href: "/admin/inventory", icon: Package, badge: stats.lowStockItems > 0 ? stats.lowStockItems : undefined, badgeColor: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
    { title: "Marketplace", href: "/admin/marketplace", icon: ShoppingCart },
    // { title: "Wallets", href: "/admin/wallets", icon: Wallet },
    { title: "Reports", href: "/admin/reports", icon: FileText },
    { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  ];

  const systemItems: NavItem[] = [
    // { title: "System Health", href: "/admin/health", icon: Activity },
    // { title: "Audit Logs", href: "/admin/audit", icon: Shield },
    { title: "Settings", href: "/admin/settings", icon: Settings },
    { title: "Help & Support", href: "/admin/help", icon: HelpCircle },
  ];

  const isActive = (href: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      window.location.href = "/auth/sign-in";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white dark:bg-[#0c2730]">
      {/* Logo */}
      <div className="flex h-20 items-center justify-center border-b border-[#efe1d1] px-4 dark:border-[#efe1d1]/10">
        <Link href="/admin" className="w-full group" onClick={() => isMobile && onClose()}>
          <div className="relative h-16 w-full overflow-hidden rounded-lg bg-white p-2 shadow-md group-hover:shadow-lg transition-all duration-300 dark:bg-gray-800">
            {!logoError ? (
              <img 
                src="/uploads/logos/elmeena.svg" 
                alt="Elmeena Logo"
                className="h-full w-full object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#39b54a] to-[#8cc63f] rounded-lg">
                <span className="text-2xl font-bold text-white">E</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-[#efe1d1] dark:border-[#efe1d1]/10">
        <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-[#efe1d1]/30 to-white p-3 dark:from-[#0c2730]/50 dark:to-[#0c2730]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#39b54a]/20">
            <User className="h-5 w-5 text-[#39b54a]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0c2730] dark:text-white truncate">
              {userData.name}
            </p>
            <p className="text-xs text-[#0c2730]/60 dark:text-[#efe1d1]/60 truncate">
              {userData.role}
            </p>
            <p className="text-xs text-[#0c2730]/40 dark:text-[#efe1d1]/40 truncate">
              {userData.email}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-6">
          <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[#0c2730]/60 dark:text-[#efe1d1]/60">
            Main Navigation
          </h2>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isItemActive = isActive(item.href);
              return (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isItemActive
                        ? "bg-gradient-to-r from-[#39b54a]/10 to-[#8cc63f]/10 text-[#39b54a] dark:from-[#39b54a]/20 dark:to-[#8cc63f]/20 dark:text-[#8cc63f]"
                        : "text-[#0c2730]/80 hover:bg-[#efe1d1] dark:text-[#efe1d1]/80 dark:hover:bg-[#0c2730]/80"
                    }`}
                    onMouseEnter={() => setHoveredItem(item.title)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => isMobile && onClose()}
                  >
                    <div className="flex items-center">
                      <div className={`mr-3 rounded-md p-1 transition-all duration-200 ${
                        isItemActive
                          ? "bg-[#39b54a]/20 text-[#39b54a] dark:bg-[#39b54a]/30"
                          : "bg-transparent"
                      }`}>
                        <Icon className={`h-5 w-5 transition-colors duration-200 ${
                          isItemActive 
                            ? "text-[#39b54a]" 
                            : "text-[#0c2730]/60 dark:text-[#efe1d1]/60"
                        }`} />
                      </div>
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.badgeColor || 'bg-[#39b54a]/10 text-[#39b54a]'}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mb-6">
          <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[#0c2730]/60 dark:text-[#efe1d1]/60">
            System
          </h2>
          <ul className="space-y-1">
            {systemItems.map((item) => {
              const Icon = item.icon;
              const isItemActive = isActive(item.href);
              return (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isItemActive
                        ? "bg-gradient-to-r from-[#39b54a]/10 to-[#8cc63f]/10 text-[#39b54a] dark:from-[#39b54a]/20 dark:to-[#8cc63f]/20 dark:text-[#8cc63f]"
                        : "text-[#0c2730]/80 hover:bg-[#efe1d1] dark:text-[#efe1d1]/80 dark:hover:bg-[#0c2730]/80"
                    }`}
                    onClick={() => isMobile && onClose()}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${
                      isItemActive 
                        ? "text-[#39b54a]" 
                        : "text-[#0c2730]/60 dark:text-[#efe1d1]/60"
                    }`} />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* System Status */}
        <div className="mb-6 rounded-lg border border-[#efe1d1] bg-gradient-to-br from-[#efe1d1]/30 to-white p-3 dark:border-[#0c2730] dark:from-[#0c2730]/50 dark:to-[#0c2730]">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-[#39b54a]/20 flex items-center justify-center">
                <Activity className="h-4 w-4 text-[#39b54a]" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#39b54a] animate-pulse"></span>
            </div>
            <div>
              <p className="text-xs font-medium text-[#0c2730] dark:text-white">System Status</p>
              <p className="text-[10px] text-[#0c2730]/60 dark:text-[#efe1d1]/60">All systems operational</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded bg-white/50 p-1.5 text-center dark:bg-[#0c2730]/50">
              <p className="text-[10px] text-[#0c2730]/60 dark:text-[#efe1d1]/60">Active Farms</p>
              <p className="text-sm font-bold text-[#39b54a]">{stats.activeFarms || 0}</p>
            </div>
            <div className="rounded bg-white/50 p-1.5 text-center dark:bg-[#0c2730]/50">
              <p className="text-[10px] text-[#0c2730]/60 dark:text-[#efe1d1]/60">Pending</p>
              <p className="text-sm font-bold text-yellow-600">{stats.pendingApprovals || 0}</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between px-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0c2730]/60 dark:text-[#efe1d1]/60">
              Notifications
            </h2>
            {stats.notifications && stats.notifications > 0 && (
              <span className="rounded-full bg-[#39b54a]/10 px-2 py-0.5 text-[10px] font-medium text-[#39b54a]">
                {stats.notifications} new
              </span>
            )}
          </div>
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#39b54a] border-t-transparent"></div>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div key={notification.id} className="flex items-start gap-2 rounded-lg bg-[#efe1d1]/50 p-2 dark:bg-[#0c2730]/50">
                  <div className="rounded-full bg-[#39b54a]/20 p-1">
                    <Bell className="h-3 w-3 text-[#39b54a]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[#0c2730] dark:text-white">{notification.title}</p>
                    <p className="text-[10px] text-[#0c2730]/60 dark:text-[#efe1d1]/60">{notification.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-center text-xs text-[#0c2730]/60 dark:text-[#efe1d1]/60">
                No new notifications
              </div>
            )}
          </div>
        </div>

        {/* Sign Out */}
        <div className="border-t border-[#efe1d1] pt-4 dark:border-[#0c2730]">
          <button
            onClick={() => {
              handleSignOut();
              if (isMobile) onClose();
            }}
            className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-[#efe1d1] transition-colors duration-200 dark:text-red-400 dark:hover:bg-[#0c2730]/80"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-600/50 dark:text-red-400/50" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={onClose}
          />
        )}
        <aside
          className={`fixed left-0 top-0 z-50 h-screen w-64 transform bg-white shadow-xl transition-transform duration-300 dark:bg-[#0c2730] ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-20 items-center justify-between border-b border-[#efe1d1] px-4 dark:border-[#efe1d1]/10">
            <Link href="/admin" className="flex-1" onClick={onClose}>
              <div className="relative h-16 w-full overflow-hidden rounded-lg bg-white p-2 shadow-md dark:bg-gray-800">
                {!logoError ? (
                  <img 
                    src="/uploads/logos/elmeena.svg" 
                    alt="Elmeena Logo"
                    className="h-full w-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#39b54a] to-[#8cc63f] rounded-lg">
                    <span className="text-2xl font-bold text-white">E</span>
                  </div>
                )}
              </div>
            </Link>
            <button 
              onClick={onClose} 
              className="ml-2 rounded-lg p-2 text-[#0c2730] hover:bg-[#efe1d1] transition-colors dark:text-[#efe1d1] dark:hover:bg-[#0c2730]/80"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="h-[calc(100vh-5rem)] overflow-y-auto">
            {sidebarContent}
          </div>
        </aside>
      </>
    );
  }

  // DESKTOP SIDEBAR - Changed z-index from 30 to 50
  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-[#efe1d1] bg-white shadow-lg dark:border-[#0c2730]/20 dark:bg-[#0c2730]">
      {sidebarContent}
    </aside>
  );
}