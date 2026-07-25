"use client";

import { useState } from "react";
import { LayoutDashboard, Bell, Menu } from "lucide-react";
import Sidebar from "./sidebar/sidebar";

export function MobileHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <header className="flex items-center justify-between border-b bg-white p-4 md:hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">reta</span>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-1">
            <Bell className="h-5 w-5" />
          </button>
          <button className="p-1" onClick={toggleMobileMenu}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        toggleMobileMenu={toggleMobileMenu}
      />
    </>
  );
}
