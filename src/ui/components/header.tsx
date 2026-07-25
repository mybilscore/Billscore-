"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  User,
  Sun,
  Moon,
  RefreshCw,
} from "lucide-react";

interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
}

interface HeaderProps {
  userData: {
    name: string;
    email: string;
    role?: string;
  } | null;
  notifications: Notification[];
  isNotificationOpen: boolean;
  setIsNotificationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isProfileOpen: boolean;
  setIsProfileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMenu: () => void;
}

export default function Header({
  userData,
  notifications,
  isNotificationOpen,
  setIsNotificationOpen,
  isProfileOpen,
  setIsProfileOpen,
  toggleMenu,
}: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="fixed top-0 right-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm transition-all duration-300 dark:border-gray-700 dark:bg-gray-900 left-0 lg:left-64">
      <div className="flex items-center space-x-2">
        <button
          className="p-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-200 lg:hidden dark:text-gray-300 dark:hover:bg-gray-800"
          onClick={toggleMenu}
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link className="flex items-center space-x-2 lg:hidden" href="/dashboard">
          <div className="h-8 w-8 rounded-md bg-[#1e293b] flex items-center justify-center overflow-hidden">
            <img
              src="/uploads/log-icon.jpeg"
              alt="Bilscore Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-lg font-bold text-[#1e293b] dark:text-white">bilscore</span>
        </Link>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={toggleDarkMode}
          className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 transition-all duration-200 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          onClick={() => window.location.reload()}
          className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 transition-all duration-200 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <div className="relative">
          <button
            className="relative p-2 text-gray-500 rounded-lg hover:bg-gray-100 transition-all duration-200 dark:text-gray-400 dark:hover:bg-gray-800"
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1e293b] text-xs text-white shadow-[0_0_10px_rgba(30,41,59,0.3)]">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 top-12 w-80 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 z-50">
              <div className="border-b border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && <span className="text-xs text-[#1e293b] font-semibold">{unreadCount} new</span>}
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`border-b border-gray-100 p-3 transition-colors dark:border-gray-700 ${
                        !n.read ? "bg-gray-50 dark:bg-gray-900" : ""
                      }`}
                    >
                      <p className="text-sm text-gray-800 dark:text-gray-200">{n.text}</p>
                      <span className="text-xs text-gray-400">{n.time}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 transition-all duration-200 dark:hover:bg-gray-800"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1e293b] text-white shadow-[0_0_15px_rgba(30,41,59,0.3)]">
              <User className="h-5 w-5" />
            </div>
            <div className="hidden md:block text-left">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {userData?.name || "User"}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {userData?.role || "User"}
              </p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-gray-400 md:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 z-50">
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1e293b] text-white shadow-[0_0_15px_rgba(30,41,59,0.3)]">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {userData?.name || "User"}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {userData?.email}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <Link
                  href="/dashboard/profile"
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </div>
              <div className="border-t border-gray-200 p-2 dark:border-gray-700">
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/sign-in" })}
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}