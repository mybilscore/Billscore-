// src/app/admin/components/admin-header.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  Search, 
  Menu, 
  X, 
  Calendar, 
  RefreshCw, 
  User, 
  Settings, 
  ChevronDown, 
  LogOut,
  Leaf,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

interface AdminHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  userData: {
    name: string;
    role: string;
    email: string;
  };
  stats: {
    pendingApprovals: number;
    notifications: number;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "approval" | "alert" | "info" | "success";
}

export default function AdminHeader({ 
  sidebarOpen, 
  setSidebarOpen, 
  userData,
  stats 
}: AdminHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();

  // Mock notifications
  const notifications: Notification[] = [
    {
      id: "1",
      title: "New Party Registration",
      message: "A new organization has registered and requires approval.",
      time: "5 min ago",
      read: false,
      type: "approval"
    },
    {
      id: "2",
      title: "System Alert",
      message: "Database backup completed successfully.",
      time: "1 hour ago",
      read: false,
      type: "success"
    },
    {
      id: "3",
      title: "High Resource Usage",
      message: "Server CPU usage is above 80% for the last 15 minutes.",
      time: "2 hours ago",
      read: true,
      type: "alert"
    },
    {
      id: "4",
      title: "New Cluster Created",
      message: "A new cluster was created in Kano state.",
      time: "3 hours ago",
      read: true,
      type: "info"
    },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast.info(`Searching admin: ${searchQuery}`);
      router.push(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case "approval":
        return <User className="h-4 w-4 text-yellow-500" />;
      case "alert":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-[#39b54a]" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleRefresh = () => {
    toast.success("Dashboard refreshed");
    router.refresh();
  };

  // HEADER - Changed z-index from 40 to 30
  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-[#efe1d1] shadow-sm dark:bg-[#0c2730] dark:border-[#0c2730]/50">
      <div className="px-4 py-2 lg:px-6">
        <div className="flex items-center justify-between">
          {/* Left side: Menu button and logo */}
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 mr-3 text-[#0c2730] rounded-lg hover:bg-[#efe1d1] transition-all duration-200 lg:hidden dark:text-[#efe1d1] dark:hover:bg-[#0c2730]/80"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/admin" className="flex items-center space-x-3 group">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[#39b54a] to-[#8cc63f] transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="hidden md:block">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-[#0c2730] dark:text-white">Admin Panel</h1>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#39b54a]/10 text-[#39b54a] rounded-full border border-[#39b54a]/20">
                    SUPER
                  </span>
                </div>
                <p className="text-xs text-[#0c2730]/60 dark:text-[#efe1d1]/60">System Administration</p>
              </div>
            </Link>
          </div>

          {/* Center: Search bar */}
          <div className="hidden lg:block flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#0c2730]/40 group-focus-within:text-[#39b54a] transition-colors duration-200" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2 bg-[#efe1d1]/30 border border-[#efe1d1] rounded-lg focus:ring-2 focus:ring-[#39b54a]/20 focus:border-[#39b54a] transition-all duration-200 placeholder:text-[#0c2730]/40 dark:bg-[#0c2730]/80 dark:border-[#0c2730] dark:text-white dark:placeholder:text-[#efe1d1]/40"
                  placeholder="Search parties, clusters, users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#0c2730]/40 hover:text-[#39b54a] transition-colors duration-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right side: User actions */}
          <div className="flex items-center space-x-2">
            {/* Global indicator */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#efe1d1]/30 border border-[#efe1d1] transition-all duration-200 hover:bg-[#efe1d1] dark:bg-[#0c2730]/80 dark:border-[#0c2730] dark:hover:bg-[#0c2730]">
              <Globe className="w-4 h-4 text-[#39b54a]" />
              <span className="text-sm font-medium text-[#0c2730] dark:text-[#efe1d1]">All Platforms</span>
            </div>

            {/* Date display */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#efe1d1]/30 border border-[#efe1d1] transition-all duration-200 hover:bg-[#efe1d1] dark:bg-[#0c2730]/80 dark:border-[#0c2730] dark:hover:bg-[#0c2730]">
              <Calendar className="w-4 h-4 text-[#39b54a]" />
              <span className="text-sm font-medium text-[#0c2730] dark:text-[#efe1d1]">
                {new Date().toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            </div>

            {/* Refresh button */}
            <button 
              onClick={handleRefresh}
              className="p-2 text-[#0c2730] rounded-lg hover:bg-[#efe1d1] transition-all duration-200 dark:text-[#efe1d1] dark:hover:bg-[#0c2730]/80 group"
            >
              <RefreshCw className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2 text-[#0c2730] rounded-lg hover:bg-[#efe1d1] transition-all duration-200 dark:text-[#efe1d1] dark:hover:bg-[#0c2730]/80"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-[#39b54a] to-[#8cc63f] text-[10px] font-medium text-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-[#efe1d1] transition-all duration-200 dark:bg-[#0c2730] dark:border-[#0c2730] z-50">
                  <div className="p-3 border-b border-[#efe1d1] dark:border-[#0c2730]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-[#0c2730] dark:text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-xs text-[#39b54a]">{unreadCount} new</span>
                      )}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b border-[#efe1d1] hover:bg-[#efe1d1]/30 transition-colors duration-200 cursor-pointer dark:border-[#0c2730] dark:hover:bg-[#0c2730]/80 ${
                          !notification.read ? 'bg-[#39b54a]/5' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            notification.type === 'approval' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                            notification.type === 'alert' ? 'bg-red-100 dark:bg-red-900/30' :
                            notification.type === 'success' ? 'bg-[#39b54a]/10 dark:bg-[#39b54a]/20' :
                            'bg-[#efe1d1] dark:bg-[#0c2730]'
                          }`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#0c2730] dark:text-white">
                              {notification.title}
                            </p>
                            <p className="text-xs text-[#0c2730]/60 dark:text-[#efe1d1]/60 mt-0.5">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3 text-[#0c2730]/40" />
                              <span className="text-[10px] text-[#0c2730]/40">
                                {notification.time}
                              </span>
                            </div>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-[#39b54a]"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-[#efe1d1] dark:border-[#0c2730]">
                    <button className="w-full text-center text-xs text-[#39b54a] hover:text-[#8cc63f] py-1 transition-colors duration-200">
                      Mark all as read
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-1 rounded-lg hover:bg-[#efe1d1] transition-all duration-200 dark:hover:bg-[#0c2730]/80 group"
              >
                <div className="relative">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-[#39b54a] to-[#8cc63f] group-hover:scale-105 transition-transform duration-200">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#39b54a] border-2 border-white dark:border-[#0c2730]"></span>
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-[#0c2730] dark:text-white">
                    {userData.name}
                  </p>
                  <p className="text-xs text-[#0c2730]/60 dark:text-[#efe1d1]/60">
                    {userData.role}
                  </p>
                </div>
                <ChevronDown className="hidden lg:block w-4 h-4 text-[#0c2730]/60 dark:text-[#efe1d1]/60 transition-transform duration-200 group-hover:translate-y-0.5" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-[#efe1d1] transition-all duration-200 dark:bg-[#0c2730] dark:border-[#0c2730] z-50">
                  <div className="p-4 border-b border-[#efe1d1] dark:border-[#0c2730]">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#39b54a] to-[#8cc63f]">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-[#0c2730] dark:text-white">{userData.name}</p>
                        <p className="text-xs text-[#0c2730]/60 dark:text-[#efe1d1]/60 truncate">
                          {userData.email}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="text-center p-1.5 rounded bg-[#efe1d1]/30 dark:bg-[#0c2730]/80">
                        <p className="text-[10px] text-[#0c2730]/60 dark:text-[#efe1d1]/60">Role</p>
                        <p className="text-xs font-medium text-[#39b54a]">Super Admin</p>
                      </div>
                      <div className="text-center p-1.5 rounded bg-[#efe1d1]/30 dark:bg-[#0c2730]/80">
                        <p className="text-[10px] text-[#0c2730]/60 dark:text-[#efe1d1]/60">Pending</p>
                        <p className="text-xs font-medium text-yellow-600">{stats.pendingApprovals}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/admin/profile"
                      className="flex items-center px-4 py-2.5 text-sm text-[#0c2730] hover:bg-[#efe1d1] transition-colors duration-200 dark:text-[#efe1d1] dark:hover:bg-[#0c2730]/80 group"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <div className="w-7 flex justify-center">
                        <User className="w-4 h-4 text-[#39b54a] group-hover:scale-110 transition-transform duration-200" />
                      </div>
                      <span>My Profile</span>
                    </Link>
                    <div className="border-t border-[#efe1d1] dark:border-[#0c2730] my-2"></div>
                    <button
                      onClick={() =>
                        signOut({
                          redirect: true,
                          callbackUrl: `${window.location.origin}/auth/sign-in`,
                        })
                      }
                      className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-[#efe1d1] transition-colors duration-200 dark:text-red-400 dark:hover:bg-[#0c2730]/80 group"
                    >
                      <div className="w-7 flex justify-center">
                        <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                      </div>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="mt-3 lg:hidden">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#0c2730]/40 group-focus-within:text-[#39b54a] transition-colors duration-200" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2 bg-[#efe1d1]/30 border border-[#efe1d1] rounded-lg focus:ring-2 focus:ring-[#39b54a]/20 focus:border-[#39b54a] transition-all duration-200 placeholder:text-[#0c2730]/40 dark:bg-[#0c2730]/80 dark:border-[#0c2730] dark:text-white dark:placeholder:text-[#efe1d1]/40"
                placeholder="Search admin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#0c2730]/40 hover:text-[#39b54a] transition-colors duration-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Quick Stats Bar - Mobile */}
        <div className="mt-3 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#39b54a]/10">
              <Shield className="h-3 w-3 text-[#39b54a]" />
              <span className="text-xs font-medium text-[#39b54a]">Super Admin</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <AlertCircle className="h-3 w-3 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-600">{stats.pendingApprovals} Pending</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[#39b54a]"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-[#8cc63f]"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-[#efe1d1]"></div>
          </div>
        </div>
      </div>
    </nav>
  );
}