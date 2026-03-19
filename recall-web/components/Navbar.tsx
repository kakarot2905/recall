"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  user?: any;
  onRefresh: () => void;
  onMenuClick: () => void;
}

export default function Navbar({ user, onRefresh, onMenuClick }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("recallDashboardToken");
    window.location.href = "/";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-6 shadow-sm">
      {/* Left side - Logo and menu toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-slate-100 rounded-md transition-colors text-lg"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <h1 className="font-bold text-lg hidden sm:inline text-slate-900">Recall</h1>
        </div>
      </div>

      {/* Right side - Refresh and user menu */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-slate-100 rounded-md transition-colors text-lg"
          title="Refresh data"
        >
          ↻
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <span className="text-sm font-medium hidden sm:inline text-slate-900">
              {user?.name || "User"}
            </span>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 transition-colors text-slate-900"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 transition-colors"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
